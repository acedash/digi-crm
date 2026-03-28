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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BookingOrchestrator
{
    protected $bookingRepo;

    public function __construct(BookingRepository $bookingRepo)
    {
        $this->bookingRepo = $bookingRepo;
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
                'details_json' => ['payment_cards' => $data['payment_cards'] ?? []],
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

            $updatePayload = [
                'status' => $data['status'] ?? $booking->status,
                'currency' => $data['currency'] ?? $booking->currency,
                'details_json' => ['payment_cards' => $data['payment_cards'] ?? $booking->details_json['payment_cards'] ?? []],
            ];

            if (isset($data['agent_id'])) {
                $updatePayload['agent_id'] = $data['agent_id'];
            }

            $booking->update($updatePayload);

            if (isset($data['new_client']) && $booking->client) {
                $booking->client->update($data['new_client']);
            }

            $this->syncPassengers($booking, $data);
            $this->syncServices($booking, $data['services'] ?? []);
            $this->syncPaymentCards($booking, $data);

            return $booking->load(['services.serviceable', 'passengers', 'client']);
        });
    }

    protected function handleClient(array $data)
    {
        if (!empty($data['client_id'])) return $data['client_id'];
        
        if (isset($data['new_client'])) {
            $client = Client::create(array_merge($data['new_client'], ['agent_id' => auth()->id()]));
            return $client->id;
        }
        
        throw new \Exception("A valid client is required.");
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

    protected function syncPaymentCards(Booking $booking, array $data)
    {
        $cardsToSync = $data['cards_to_sync'] ?? [];
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
        try {
            $extension = explode('/', explode(':', substr($base64, 0, strpos($base64, ';')))[1])[1];
            $image = str_replace(substr($base64, 0, strpos($base64, ',') + 1), '', $base64);
            $path = 'tickets/ticket_' . time() . '_' . uniqid() . '.' . $extension;
            Storage::disk('public')->put($path, base64_decode(str_replace(' ', '+', $image)));
            return $path;
        } catch (\Exception $e) {
            Log::error("Ticket upload failed: " . $e->getMessage());
            return null;
        }
    }
}
