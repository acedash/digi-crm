<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Repositories\BookingRepository;
use App\Domains\Booking\Models\Booking;
use App\Domains\Booking\Models\BookingService;
use App\Domains\Booking\Models\Flight;
use App\Domains\Supplier\Models\Hotel;
use App\Domains\Supplier\Models\Car;
use App\Domains\Supplier\Models\Cruise;
use App\Models\Client;
use App\Models\Passenger;
use App\Domains\Client\Services\ClientDeduplicationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BookingOrchestrator
{
    protected $bookingRepo;
    protected ClientDeduplicationService $clientDeduplicationService;

    public function __construct(BookingRepository $bookingRepo, ClientDeduplicationService $clientDeduplicationService)
    {
        $this->bookingRepo = $bookingRepo;
        $this->clientDeduplicationService = $clientDeduplicationService;
    }

    protected function buildFlightSegmentsFromModel($serviceable, array $details): array
    {
        $segments = $details['segments'] ?? [];

        if (!empty($segments)) {
            return $segments;
        }

        return [[
            'airline' => $serviceable?->airline_code,
            'flight_number' => $serviceable?->flight_number,
            'origin' => $serviceable?->departure_city,
            'destination' => $serviceable?->arrival_city,
            'departure_at' => optional($serviceable?->departure_at)?->format('Y-m-d\TH:i'),
            'arrival_at' => optional($serviceable?->arrival_at)?->format('Y-m-d\TH:i'),
        ]];
    }

    protected function buildFlightRouteSummary(array $segments): string
    {
        return collect($segments)
            ->map(function ($segment) {
                $origin = $segment['origin'] ?? '';
                $destination = $segment['destination'] ?? '';
                $flightNumber = $segment['flight_number'] ?? '';
                $route = trim($origin . ' -> ' . $destination);

                return trim($route . ($flightNumber ? " ({$flightNumber})" : ''));
            })
            ->filter()
            ->implode(' | ');
    }

    public function createMultiServiceBooking(array $data)
    {
        return DB::transaction(function () use ($data) {
            $clientId = $this->handleClient($data);
            
            $booking = $this->bookingRepo->create([
                'client_id' => $clientId,
                'agent_id' => $data['agent_id'] ?? auth()->id(),
                'booking_reference' => $this->bookingRepo->generateReference(),
                'status' => 'Pending',
                'currency' => $data['currency'] ?? 'USD',
                'total_amount' => 0,
                'details_json' => [
                    'created_by_id' => auth()->id(),
                    'created_by_name' => auth()->user()?->name,
                    'initial_agent_id' => $data['agent_id'] ?? auth()->id(),
                    'payment_cards' => $data['payment_cards'] ?? [],
                    'flight_change_history' => [],
                ],
            ]);

            $this->syncPassengers($booking, $data);
            $this->syncServices($booking, $data['services'] ?? []);
            $this->syncPaymentCards($booking, $data);

            return $booking->load(['services.serviceable', 'passengers', 'client']);
        });
    }

    public function updateMultiServiceBooking(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $booking = Booking::findOrFail($id);
            $existingDetails = $booking->details_json ?? [];
            $serviceChangeEntries = $this->buildServiceChangeEntries($booking, $data);

            $updatePayload = [
                'status' => $data['status'] ?? $booking->status,
                'currency' => $data['currency'] ?? $booking->currency,
                'details_json' => array_merge($existingDetails, [
                    'payment_cards' => $data['payment_cards'] ?? ($existingDetails['payment_cards'] ?? []),
                ]),
            ];

            if (!empty($serviceChangeEntries)) {
                $history = $existingDetails['service_change_history'] ?? [];
                $history = array_merge($history, $serviceChangeEntries);
                $latestServiceChange = end($serviceChangeEntries);

                $updatePayload['details_json']['service_change_history'] = $history;
                $updatePayload['details_json']['latest_service_change'] = $latestServiceChange;

                $latestFlightChange = collect($serviceChangeEntries)->last(fn ($entry) => ($entry['service_type'] ?? null) === 'Flight');
                if ($latestFlightChange) {
                    $flightHistory = $existingDetails['flight_change_history'] ?? [];
                    $flightHistory[] = $latestFlightChange;
                    $updatePayload['details_json']['flight_change_history'] = $flightHistory;
                    $updatePayload['details_json']['latest_flight_change'] = $latestFlightChange;
                }
            }

            if (isset($data['agent_id'])) {
                $updatePayload['agent_id'] = $data['agent_id'];
            }

            $booking->update($updatePayload);

            if (isset($data['new_client']) && $booking->client) {
                $this->clientDeduplicationService->assertNoDuplicateClient($data['new_client'], $booking->client->id);
                $booking->client->update($data['new_client']);
            }

            $this->syncPassengers($booking, $data);
            $this->syncServices($booking, $data['services'] ?? []);
            $this->syncPaymentCards($booking, $data);

            $updatedBooking = $booking->load(['services.serviceable', 'passengers', 'client']);
            $latestCurrentServiceChange = !empty($serviceChangeEntries) ? end($serviceChangeEntries) : null;
            $recordedFlightChange = collect($serviceChangeEntries)->contains(
                fn ($entry) => ($entry['service_key'] ?? null) === 'flight'
            );
            $updatedBooking->setAttribute('change_tracking', [
                'recorded_service_change' => !empty($serviceChangeEntries),
                'recorded_change_count' => count($serviceChangeEntries),
                'recorded_flight_change' => $recordedFlightChange,
                'latest_service_key' => $latestCurrentServiceChange['service_key'] ?? null,
                'total_additional_charge' => collect($serviceChangeEntries)->sum(fn ($entry) => (float) ($entry['additional_charge'] ?? 0)),
                'current_service_changes' => $serviceChangeEntries,
            ]);

            return $updatedBooking;
        });
    }

    protected function buildServiceChangeEntries(Booking $booking, array $data): array
    {
        $existingServices = $booking->services()->with('serviceable')->get();
        $serviceDefinitions = [
            'flight' => ['label' => 'Flight', 'class' => Flight::class],
            'hotel' => ['label' => 'Hotel', 'class' => Hotel::class],
            'car' => ['label' => 'Rental Car', 'class' => Car::class],
            'cruise' => ['label' => 'Cruise', 'class' => Cruise::class],
        ];

        $entries = [];
        foreach ($serviceDefinitions as $serviceKey => $definition) {
            $newService = collect($data['services'] ?? [])->first(fn ($service) => strtolower($service['type'] ?? '') === $serviceKey);
            $existingService = $existingServices->first(fn ($service) => $service->serviceable_type === $definition['class']);

            if (!$newService && !$existingService) {
                continue;
            }

            $before = $this->snapshotServiceFromModel($serviceKey, $existingService);
            $after = $this->snapshotServiceFromPayload($serviceKey, $newService);
            $changes = $this->resolveServiceChanges($serviceKey, $before, $after);

            $details = $newService['details'] ?? [];
            $changeType = trim((string) ($details['change_type'] ?? ''));
            $changeSummary = trim((string) ($details['change_summary'] ?? ''));
            $additionalCharge = (float) ($details['additional_charge'] ?? 0);

            if (empty($changes) && $changeType === '' && $changeSummary === '' && $additionalCharge <= 0) {
                continue;
            }

            $entries[] = [
                'service_key' => $serviceKey,
                'service_type' => $definition['label'],
                'changed_at' => now()->toIso8601String(),
                'changed_by_user_id' => auth()->id(),
                'changed_by_name' => auth()->user()?->name,
                'change_type' => $changeType ?: ($definition['label'] . ' Update'),
                'change_summary' => $changeSummary,
                'additional_charge' => $additionalCharge,
                'changes' => $changes,
                'before' => $before,
                'after' => $after,
            ];
        }

        return $entries;
    }

    protected function snapshotServiceFromModel(string $serviceKey, $service): ?array
    {
        if (!$service) {
            return null;
        }

        $details = $service->details_json ?? [];
        $serviceable = $service->serviceable;

        return match ($serviceKey) {
            'flight' => [
                'trip_type' => $details['trip_type'] ?? 'one_way',
                'ticket_image' => $serviceable?->ticket_image,
                'pnr' => $serviceable?->pnr,
                'route_summary' => $this->buildFlightRouteSummary($this->buildFlightSegmentsFromModel($serviceable, $details)),
                'segment_count' => count($this->buildFlightSegmentsFromModel($serviceable, $details)),
                'sell_price' => (float) ($service->sell_price ?? 0),
                'cost_price' => (float) ($service->cost_price ?? 0),
                'taxes_and_charges' => (float) ($service->markup ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            'hotel' => [
                'name' => $serviceable?->name,
                'city' => $serviceable?->city,
                'address' => $serviceable?->address,
                'room_type' => $serviceable?->room_type,
                'image_count' => count($details['images'] ?? []),
                'checkin' => $details['checkin'] ?? '',
                'checkout' => $details['checkout'] ?? '',
                'sell_price' => (float) ($service->sell_price ?? 0),
                'cost_price' => (float) ($service->cost_price ?? 0),
                'taxes_and_charges' => (float) ($service->markup ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            'car' => [
                'company' => $serviceable?->company,
                'car_type' => $serviceable?->car_type,
                'image_count' => count($details['images'] ?? []),
                'pickup_loc' => $details['pickup_loc'] ?? '',
                'drop_loc' => $details['drop_loc'] ?? '',
                'pickup_date' => $details['pickup_date'] ?? '',
                'dropoff_date' => $details['dropoff_date'] ?? '',
                'sell_price' => (float) ($service->sell_price ?? 0),
                'cost_price' => (float) ($service->cost_price ?? 0),
                'taxes_and_charges' => (float) ($service->markup ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            'cruise' => [
                'operator' => $serviceable?->operator,
                'cruise_name' => $serviceable?->cruise_name,
                'image_count' => count($details['images'] ?? []),
                'departure_date' => $details['departure_date'] ?? '',
                'arrival_date' => $details['arrival_date'] ?? '',
                'sell_price' => (float) ($service->sell_price ?? 0),
                'cost_price' => (float) ($service->cost_price ?? 0),
                'taxes_and_charges' => (float) ($service->markup ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            default => null,
        };
    }

    protected function snapshotServiceFromPayload(string $serviceKey, ?array $service): ?array
    {
        if (!$service) {
            return null;
        }

        $serviceDetails = $service[$serviceKey . '_details'] ?? [];
        $details = $service['details'] ?? [];

        return match ($serviceKey) {
            'flight' => [
                'trip_type' => $details['trip_type'] ?? 'one_way',
                'ticket_image' => $serviceDetails['ticket_image'] ?? null,
                'pnr' => $serviceDetails['pnr'] ?? null,
                'route_summary' => $this->buildFlightRouteSummary($details['segments'] ?? []),
                'segment_count' => count($details['segments'] ?? []),
                'sell_price' => (float) ($service['sell_price'] ?? 0),
                'cost_price' => (float) ($service['cost_price'] ?? 0),
                'taxes_and_charges' => (float) ($service['markup'] ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            'hotel' => [
                'name' => $serviceDetails['name'] ?? null,
                'city' => $serviceDetails['city'] ?? null,
                'address' => $serviceDetails['address'] ?? null,
                'room_type' => $serviceDetails['room_type'] ?? null,
                'image_count' => count($details['images'] ?? []),
                'checkin' => $details['checkin'] ?? '',
                'checkout' => $details['checkout'] ?? '',
                'sell_price' => (float) ($service['sell_price'] ?? 0),
                'cost_price' => (float) ($service['cost_price'] ?? 0),
                'taxes_and_charges' => (float) ($service['markup'] ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            'car' => [
                'company' => $serviceDetails['company'] ?? null,
                'car_type' => $serviceDetails['car_type'] ?? null,
                'image_count' => count($details['images'] ?? []),
                'pickup_loc' => $details['pickup_loc'] ?? '',
                'drop_loc' => $details['drop_loc'] ?? '',
                'pickup_date' => $details['pickup_date'] ?? '',
                'dropoff_date' => $details['dropoff_date'] ?? '',
                'sell_price' => (float) ($service['sell_price'] ?? 0),
                'cost_price' => (float) ($service['cost_price'] ?? 0),
                'taxes_and_charges' => (float) ($service['markup'] ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            'cruise' => [
                'operator' => $serviceDetails['operator'] ?? null,
                'cruise_name' => $serviceDetails['cruise_name'] ?? null,
                'image_count' => count($details['images'] ?? []),
                'departure_date' => $details['departure_date'] ?? '',
                'arrival_date' => $details['arrival_date'] ?? '',
                'sell_price' => (float) ($service['sell_price'] ?? 0),
                'cost_price' => (float) ($service['cost_price'] ?? 0),
                'taxes_and_charges' => (float) ($service['markup'] ?? 0),
                'remarks' => $details['remarks'] ?? '',
            ],
            default => null,
        };
    }

    protected function resolveServiceChanges(string $serviceKey, ?array $before, ?array $after): array
    {
        $labels = match ($serviceKey) {
            'flight' => [
                'trip_type' => 'Trip Type',
                'ticket_image' => 'Ticket Image',
                'pnr' => 'PNR',
                'route_summary' => 'Route Summary',
                'segment_count' => 'Segment Count',
                'sell_price' => 'Sell Price',
                'cost_price' => 'Airline Cost',
                'taxes_and_charges' => 'Taxes & Charges',
                'remarks' => 'Remarks',
            ],
            'hotel' => [
                'name' => 'Hotel Name',
                'city' => 'City',
                'address' => 'Hotel Address',
                'room_type' => 'Room Type',
                'image_count' => 'Hotel Photos',
                'checkin' => 'Check-in Date',
                'checkout' => 'Check-out Date',
                'sell_price' => 'Sell Price',
                'cost_price' => 'Net Cost',
                'taxes_and_charges' => 'Taxes & Charges',
                'remarks' => 'Remarks',
            ],
            'car' => [
                'company' => 'Rental Company',
                'car_type' => 'Car Model',
                'image_count' => 'Car Photos',
                'pickup_loc' => 'Pickup Location',
                'drop_loc' => 'Drop Location',
                'pickup_date' => 'Pickup Date',
                'dropoff_date' => 'Dropoff Date',
                'sell_price' => 'Sell Price',
                'cost_price' => 'Net Cost',
                'taxes_and_charges' => 'Taxes & Charges',
                'remarks' => 'Remarks',
            ],
            'cruise' => [
                'operator' => 'Cruise Line',
                'cruise_name' => 'Ship Name',
                'image_count' => 'Cruise Photos',
                'departure_date' => 'Departure Date',
                'arrival_date' => 'Arrival Date',
                'sell_price' => 'Sell Price',
                'cost_price' => 'Net Cost',
                'taxes_and_charges' => 'Taxes & Charges',
                'remarks' => 'Remarks',
            ],
            default => [],
        };

        $changes = [];
        foreach ($labels as $field => $label) {
            $oldValue = $before[$field] ?? null;
            $newValue = $after[$field] ?? null;

            if ((string) $oldValue === (string) $newValue) {
                continue;
            }

            $changes[] = [
                'field' => $field,
                'label' => $label,
                'old' => $oldValue,
                'new' => $newValue,
            ];
        }

        return $changes;
    }

    protected function handleClient(array $data)
    {
        if (!empty($data['client_id'])) return $data['client_id'];
        
        if (isset($data['new_client'])) {
            $existingClient = $this->findExistingClient($data['new_client']);

            if ($existingClient) {
                return $existingClient->id;
            }

            $client = Client::create(array_merge($data['new_client'], ['agent_id' => auth()->id()]));
            return $client->id;
        }
        
        throw new \Exception("A valid client is required.");
    }

    protected function findExistingClient(array $clientData): ?Client
    {
        return $this->clientDeduplicationService->findDuplicateClient($clientData);
    }

    protected function syncPassengers(Booking $booking, array $data)
    {
        $passengerIds = $data['passengers'] ?? [];
        
        if (isset($data['new_passengers'])) {
            foreach ($data['new_passengers'] as $np) {
                if (empty($np['first_name'])) continue;
                
                $pax = null;
                if (!empty($np['id'])) $pax = Passenger::find($np['id']);
                
                if (!$pax) {
                    $pax = Passenger::firstOrCreate(
                        [
                            'client_id' => $booking->client_id,
                            'first_name' => $np['first_name'],
                            'last_name' => $np['last_name'] ?? '',
                            'date_of_birth' => $np['date_of_birth'] ?? null,
                        ],
                        ['middle_name' => $np['middle_name'] ?? null, 'gender' => $np['gender'] ?? null, 'type' => 'Adult']
                    );
                }
                if ($pax) $passengerIds[] = $pax->id;
            }
        }
        $booking->passengers()->sync(array_unique($passengerIds));
    }

    protected function syncServices(Booking $booking, array $services)
    {
        if (empty($services)) return;

        // Cleanup old
        foreach ($booking->services as $old) {
            $old->serviceable()?->delete();
            $old->delete();
        }

        $total = 0;
        foreach ($services as $sData) {
            $sData = $this->normalizeServicePayloadForPersistence($sData);
            $serviceItem = $this->createServiceItem($sData);
            $bs = $booking->services()->create([
                'serviceable_id' => $serviceItem->id,
                'serviceable_type' => get_class($serviceItem),
                'cost_price' => $sData['cost_price'] ?? 0,
                'markup' => $sData['markup'] ?? 0,
                'sell_price' => $sData['sell_price'] ?? 0,
                'details_json' => $sData['details'] ?? null,
            ]);
            $total += $bs->sell_price;
        }
        $booking->update(['total_amount' => $total]);
    }

    protected function normalizeServicePayloadForPersistence(array $serviceData): array
    {
        $type = strtolower($serviceData['type'] ?? '');
        $details = $serviceData['details'] ?? [];

        if (in_array($type, ['hotel', 'car', 'cruise'], true)) {
            $details['images'] = collect($details['images'] ?? [])
                ->map(function ($image) use ($type) {
                    if (is_string($image) && str_starts_with($image, 'data:image')) {
                        return $this->uploadImage($image, match ($type) {
                            'hotel' => 'hotels',
                            'car' => 'cars',
                            'cruise' => 'cruises',
                        });
                    }

                    return $image;
                })
                ->filter()
                ->values()
                ->all();

            $serviceData['details'] = $details;
        }

        return $serviceData;
    }

    protected function syncPaymentCards(Booking $booking, array $data)
    {
        $cardsToSync = array_merge(
            $data['cards_to_sync'] ?? [],
            $data['change_charge_cards_to_sync'] ?? []
        );
        foreach ($cardsToSync as $card) {
            $cleanNum = str_replace(' ', '', $card['number']);
            if (!$booking->client->cards()->where('card_number', $cleanNum)->exists()) {
                $booking->client->cards()->create([
                    'card_holder_name' => $card['holder_name'],
                    'card_number' => $cleanNum,
                    'expiry_month' => (int) explode('/', $card['exp'])[0],
                    'expiry_year' => (int) explode('/', $card['exp'])[1],
                    'card_type' => 'Default',
                    'cvv' => $card['cvv'] ?? null,
                    'is_primary' => $booking->client->cards()->count() === 0
                ]);
            }
        }
    }

    protected function createServiceItem(array $serviceData)
    {
        $type = strtolower($serviceData['type']);
        $details = $serviceData[$type . '_details'] ?? [];

        if ($type === 'flight' && !empty($details['ticket_image']) && str_starts_with($details['ticket_image'], 'data:image')) {
            $details['ticket_image'] = $this->uploadTicketImage($details['ticket_image']);
        }

        if ($type === 'flight') {
            $details = [
                'ticket_image' => $details['ticket_image'] ?? null,
                'pnr' => $details['pnr'] ?? null,
                'airline_code' => $details['airline_code'] ?? null,
                'flight_number' => $details['flight_number'] ?? null,
                'departure_city' => $details['departure_city'] ?? null,
                'arrival_city' => $details['arrival_city'] ?? null,
                'departure_at' => $details['departure_at'] ?? null,
                'arrival_at' => $details['arrival_at'] ?? null,
            ];
        }

        switch ($type) {
            case 'flight': return Flight::create($details);
            case 'hotel':  return Hotel::create(array_merge(['country' => 'N/A'], $details));
            case 'car':    return Car::create(array_merge(['capacity' => 5], $details));
            case 'cruise': return Cruise::create($details);
            default: throw new \InvalidArgumentException("Invalid service type: {$type}");
        }
    }

    protected function uploadTicketImage(string $base64)
    {
        return $this->uploadImage($base64, 'tickets');
    }

    protected function uploadImage(string $base64, string $directory)
    {
        try {
            $extension = explode('/', explode(':', substr($base64, 0, strpos($base64, ';')))[1])[1];
            $image = str_replace(substr($base64, 0, strpos($base64, ',') + 1), '', $base64);
            $directory = trim($directory, '/');
            $filename = 'image_' . time() . '_' . uniqid() . '.' . $extension;
            $path = $directory . '/' . $filename;
            Storage::disk('public')->put($path, base64_decode(str_replace(' ', '+', $image)));
            return $path;
        } catch (\Exception $e) {
            Log::error("Image upload failed: " . $e->getMessage());
            return null;
        }
    }
}
