<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Repositories\PaymentAuthRepository;
use App\Domains\Booking\Repositories\BookingRepository;
use App\Services\AuthorizationMailer;
use App\Services\BookingMailContextBuilder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PaymentAuthService
{
    protected $repository;
    protected $bookingRepository;
    protected $authorizationMailer;
    protected $mailContextBuilder;

    public function __construct(PaymentAuthRepository $repository, BookingRepository $bookingRepository, AuthorizationMailer $authorizationMailer, BookingMailContextBuilder $mailContextBuilder)
    {
        $this->repository = $repository;
        $this->bookingRepository = $bookingRepository;
        $this->authorizationMailer = $authorizationMailer;
        $this->mailContextBuilder = $mailContextBuilder;
    }

    /**
     * Create a new payment authorization link for a set of bookings.
     */
    public function createAuthorization(array $bookingIds, int $clientId, array $options = [])
    {
        $auth = DB::transaction(function () use ($bookingIds, $clientId, $options) {
            $bookings = \App\Domains\Booking\Models\Booking::with(['services.serviceable'])
                ->whereIn('id', $bookingIds)
                ->get();

            $authorizationType = $options['authorization_type'] ?? 'initial';
            $cardAllocations = collect($options['card_allocations'] ?? [])
                ->map(fn ($allocation) => [
                    'holder_name' => $allocation['holder_name'] ?? null,
                    'card_label' => $allocation['card_label'] ?? null,
                    'amount' => (float) ($allocation['amount'] ?? 0),
                    'remarks' => $allocation['remarks'] ?? null,
                ])
                ->filter(fn ($allocation) => $allocation['amount'] > 0)
                ->values();
            $changeEntries = collect($options['change_entries'] ?? [])->values()->all();

            $totalAmount = $authorizationType === 'change_charge'
                ? (float) $cardAllocations->sum('amount')
                : (float) $bookings->sum('total_amount');
            $currency = $bookings->first()->currency ?? 'USD';

            if ($totalAmount <= 0) {
                throw new \RuntimeException('Authorization amount must be greater than zero.');
            }

            if ($authorizationType === 'change_charge' && $cardAllocations->isEmpty()) {
                throw new \RuntimeException('Card allocation is required for a change charge authorization.');
            }

            $maskedCard = $this->resolveMaskedCard($bookings, $cardAllocations->all());
            $snapshot = $this->buildConsentSnapshot(
                $bookings,
                $currency,
                $totalAmount,
                $maskedCard,
                [
                    'authorization_type' => $authorizationType,
                    'card_allocations' => $cardAllocations->all(),
                    'change_entries' => $changeEntries,
                ]
            );

            $auth = $this->repository->create([
                'client_id' => $clientId,
                'total_amount' => $totalAmount,
                'currency' => $currency,
                'status' => 'Pending',
                'masked_card' => $maskedCard,
                'declaration_version' => $snapshot['declaration_version'],
                'declaration_text' => $snapshot['declaration_text'],
                'consent_snapshot' => $snapshot,
                'metadata' => [
                    'authorization_type' => $authorizationType,
                    'booking_count' => $bookings->count(),
                    'references' => $bookings->pluck('booking_reference')->toArray(),
                    'card_allocations' => $cardAllocations->all(),
                    'change_entries' => $changeEntries,
                ],
            ]);

            $auth->bookings()->attach($bookingIds);

            if ($authorizationType === 'initial') {
                $auth->bookings()->update([
                    'status' => 'Awaiting Approval',
                ]);
            } else {
                $auth->bookings()->update([
                    'status' => 'Awaiting Change Approval',
                ]);
                $this->recordChangeChargeStatus($auth, 'Pending');
            }

            return $this->repository->findByToken($auth->token);
        });

        $this->authorizationMailer->send($auth);

        return $auth;
    }

    /**
     * Get authorization details by token.
     */
    public function getByToken(string $token)
    {
        return $this->repository->findByToken($token);
    }

    public function getLatestByBookingId(int $bookingId)
    {
        return $this->repository->findLatestByBookingId($bookingId);
    }

    public function getChargeQueue(string $view = 'pending')
    {
        return $this->repository->getChargeQueue($view);
    }

    public function markCharged(int $paymentAuthId, array $data = [])
    {
        $auth = $this->repository->findByIdForCollection($paymentAuthId);

        if (!$auth) {
            throw new \RuntimeException('Charge record not found.');
        }

        if ($auth->status !== 'Approved') {
            throw new \RuntimeException('Only approved authorizations can be marked as charged.');
        }

        if ($auth->collected_at) {
            throw new \RuntimeException('This authorization has already been marked as charged.');
        }

        $auth->update([
            'collected_at' => now(),
            'collected_by' => auth()->id(),
            'collection_notes' => $data['collection_notes'] ?? null,
            'collection_reference' => $data['collection_reference'] ?? null,
        ]);

        foreach ($auth->bookings as $booking) {
            $details = $booking->details_json ?? [];
            $details['latest_collection'] = [
                'payment_auth_id' => $auth->id,
                'authorization_type' => $auth->consent_snapshot['authorization_type']
                    ?? $auth->metadata['authorization_type']
                    ?? 'initial',
                'collected_at' => optional($auth->fresh()->collected_at)->toIso8601String(),
                'collected_by' => auth()->user()?->name,
                'collection_reference' => $data['collection_reference'] ?? null,
                'collection_notes' => $data['collection_notes'] ?? null,
                'amount' => (float) $auth->total_amount,
                'currency' => $auth->currency,
            ];
            $booking->update([
                'details_json' => $details,
                'status' => 'Confirmed',
            ]);
        }

        return $this->repository->findByIdForCollection($paymentAuthId);
    }

    /**
     * Approve a payment authorization with consent logging.
     */
    public function approve(string $token, array $consentData)
    {
        $auth = $this->repository->findByToken($token);
        
        if (!$auth || $auth->status !== 'Pending') {
            throw new \Exception('Invalid or expired authorization link.');
        }

        DB::transaction(function () use ($auth, $consentData) {
            $auth->update([
                'status' => 'Approved',
                'approved_at' => now(),
                'approved_email' => $auth->client?->email,
                'ip_address' => $consentData['ip_address'] ?? null,
                'user_agent' => $consentData['user_agent'] ?? null,
                'digital_signature' => $consentData['signature'] ?? null,
            ]);

            if (($auth->metadata['authorization_type'] ?? 'initial') === 'initial') {
                $auth->bookings()->update([
                    'status' => 'Approved',
                ]);
            } else {
                $auth->bookings()->update([
                    'status' => 'Change Approved',
                ]);
                $this->recordChangeChargeStatus($auth, 'Approved');
            }
        });

        return $this->repository->findByToken($token);
    }

    public function reject(string $token, array $consentData)
    {
        $auth = $this->repository->findByToken($token);

        if (!$auth || $auth->status !== 'Pending') {
            throw new \Exception('Invalid or expired authorization link.');
        }

        DB::transaction(function () use ($auth, $consentData) {
            $auth->update([
                'status' => 'Rejected',
                'approved_at' => now(),
                'approved_email' => $auth->client?->email,
                'ip_address' => $consentData['ip_address'] ?? null,
                'user_agent' => $consentData['user_agent'] ?? null,
                'digital_signature' => $consentData['signature'] ?? null,
            ]);

            if (($auth->metadata['authorization_type'] ?? 'initial') === 'initial') {
                $auth->bookings()->update([
                    'status' => 'Rejected',
                ]);
            } else {
                $auth->bookings()->update([
                    'status' => 'Change Rejected',
                ]);
                $this->recordChangeChargeStatus($auth, 'Rejected');
            }
        });

        return $this->repository->findByToken($token);
    }

    protected function buildConsentSnapshot($bookings, string $currency, float $totalAmount, string $maskedCard, array $options = []): array
    {
        $authorizationType = $options['authorization_type'] ?? 'initial';
        $cardAllocations = $options['card_allocations'] ?? [];
        $changeEntries = $options['change_entries'] ?? [];
        $travellers = $bookings
            ->flatMap(function ($booking) {
                $items = collect();

                foreach ($booking->passengers ?? [] as $passenger) {
                    $items->push([
                        'name' => trim(($passenger->first_name ?? '') . ' ' . ($passenger->middle_name ?? '') . ' ' . ($passenger->last_name ?? '')),
                        'date_of_birth' => $passenger->date_of_birth,
                    ]);
                }

                return $items;
            })
            ->filter(fn ($traveller) => filled($traveller['name']))
            ->unique(fn ($traveller) => strtolower($traveller['name']) . '|' . ($traveller['date_of_birth'] ?? ''))
            ->values()
            ->map(function ($traveller) {
                return [
                    'name' => $traveller['name'],
                    'date_of_birth' => $traveller['date_of_birth'],
                    'display_date_of_birth' => $traveller['date_of_birth']
                        ? Carbon::parse($traveller['date_of_birth'])->format('d M Y')
                        : null,
                ];
            })
            ->all();

        $baseFare = $authorizationType === 'change_charge'
            ? $totalAmount
            : (float) $bookings
                ->flatMap(fn ($booking) => $booking->services ?? [])
                ->sum(fn ($service) => (float) ($service->cost_price ?? 0));

        if ($baseFare <= 0 || $baseFare > $totalAmount) {
            $baseFare = $totalAmount;
        }

        $fareBreakdown = [
            'base_fare' => $authorizationType === 'change_charge' ? 0 : $baseFare,
            'taxes_and_fee' => $authorizationType === 'change_charge' ? 0 : max($totalAmount - $baseFare, 0),
            'change_charge' => $authorizationType === 'change_charge' ? $totalAmount : 0,
            'grand_total' => $totalAmount,
        ];

        $ticketImages = $bookings
            ->flatMap(function ($booking) {
                return collect($booking->services ?? [])
                    ->filter(function ($service) {
                        return strtolower(class_basename($service->serviceable_type ?? '')) === 'flight';
                    })
                    ->flatMap(function ($service) use ($booking) {
                        $segmentImages = collect(data_get($service, 'details_json.segments', []))
                            ->filter(fn ($segment) => filled($segment['ticket_image'] ?? null))
                            ->values()
                            ->map(function ($segment, $index) use ($booking, $service) {
                                $path = $segment['ticket_image'];

                                if (is_string($path) && str_starts_with($path, 'data:image') && filled(data_get($service, 'serviceable.ticket_image'))) {
                                    $path = data_get($service, 'serviceable.ticket_image');
                                }

                                return [
                                    'booking_reference' => $booking->booking_reference,
                                    'segment_label' => 'Flight Segment ' . ($index + 1),
                                    'path' => $path,
                                    'url' => str_starts_with($path, 'data:image')
                                        ? $path
                                        : $this->mailContextBuilder->buildStorageUrl($path),
                                ];
                            });

                        if ($segmentImages->isNotEmpty()) {
                            return $segmentImages;
                        }

                        if (filled(data_get($service, 'serviceable.ticket_image'))) {
                            return [[
                                'booking_reference' => $booking->booking_reference,
                                'segment_label' => null,
                                'path' => $service->serviceable->ticket_image,
                                'url' => $this->mailContextBuilder->buildStorageUrl($service->serviceable->ticket_image),
                            ]];
                        }

                        return [];
                    });
            })
            ->values()
            ->all();

        $serviceImages = [
            'hotel_images' => $this->collectServiceImagesForSnapshot($bookings, 'hotel'),
            'car_images' => $this->collectServiceImagesForSnapshot($bookings, 'car'),
            'cruise_images' => $this->collectServiceImagesForSnapshot($bookings, 'cruise'),
        ];

        $supplierLabel = $bookings
            ->flatMap(fn ($booking) => $booking->services ?? [])
            ->map(function ($service) {
                return match (strtolower(class_basename($service->serviceable_type ?? ''))) {
                    'flight' => 'Airline',
                    'hotel' => 'Hotel',
                    'car' => 'Car Rental',
                    'cruise' => 'Cruise',
                    default => 'Travel Supplier',
                };
            })
            ->unique()
            ->implode(' / ');

        $clientName = $bookings->first()?->client?->name
            ?: trim(($bookings->first()?->client?->first_name ?? '') . ' ' . ($bookings->first()?->client?->last_name ?? ''));

        $supplierLabel = $supplierLabel ? $supplierLabel . ' / Digicircle' : 'Digicircle';

        $declarationText = $authorizationType === 'change_charge'
            ? sprintf(
                'I, %s, hereby authorise %s to charge the additional change amount of %s $%s using the card allocation listed in this request. By approving this request, I confirm that I have reviewed the updated booking information and authorised the payment as stated.',
                $clientName ?: 'Customer',
                $supplierLabel,
                $currency,
                number_format($totalAmount, 2)
            )
            : sprintf(
                'I, %s, hereby authorise %s to charge my card ending in %s with the total amount of %s $%s. By approving this request, I confirm that I have reviewed the information and authorised the payment as stated.',
                $clientName ?: 'Customer',
                $supplierLabel,
                $maskedCard,
                $currency,
                number_format($totalAmount, 2)
            );

        return [
            'captured_at' => now()->toIso8601String(),
            'declaration_version' => 'v1',
            'declaration_text' => $declarationText,
            'authorization_type' => $authorizationType,
            'masked_card' => $maskedCard,
            'client_name' => $clientName,
            'currency' => $currency,
            'total_amount' => $totalAmount,
            'booking_references' => $bookings->pluck('booking_reference')->values()->all(),
            'travellers' => $travellers,
            'fare_breakdown' => $fareBreakdown,
            'ticket_images' => $ticketImages,
            ...$serviceImages,
            'supplier_label' => $supplierLabel,
            'card_allocations' => $cardAllocations,
            'change_entries' => $changeEntries,
            'terms_version' => 'v1',
            'contact' => [
                'email' => 'cs@reservation-supports.com',
                'phone' => '+1 (325) 349 9888',
            ],
        ];
    }

    protected function resolveMaskedCard($bookings, array $cardAllocations = []): string
    {
        if (!empty($cardAllocations)) {
            $labels = collect($cardAllocations)
                ->pluck('card_label')
                ->filter()
                ->values();

            if ($labels->count() === 1) {
                return $labels->first();
            }

            if ($labels->isNotEmpty()) {
                return 'Multiple Cards (' . $labels->implode(', ') . ')';
            }
        }

        $cardNumber = collect($bookings)
            ->flatMap(function ($booking) {
                return collect(data_get($booking, 'details_json.payment_cards', []));
            })
            ->pluck('number')
            ->filter()
            ->first();

        if (!$cardNumber) {
            return 'XXXXXX0000';
        }

        $cleanNumber = preg_replace('/\D+/', '', $cardNumber);

        return 'XXXXXX' . substr($cleanNumber, -4);
    }

    protected function recordChangeChargeStatus($auth, string $status): void
    {
        foreach ($auth->bookings as $booking) {
            $details = $booking->details_json ?? [];
            $history = $details['change_charge_history'] ?? [];
            $entry = [
                'payment_auth_id' => $auth->id,
                'status' => $status,
                'total_amount' => (float) $auth->total_amount,
                'currency' => $auth->currency,
                'recorded_at' => now()->toIso8601String(),
                'card_allocations' => $auth->metadata['card_allocations'] ?? [],
                'change_entries' => $auth->metadata['change_entries'] ?? [],
            ];

            $history[] = $entry;
            $details['change_charge_history'] = $history;
            $details['latest_change_charge'] = $entry;

            $booking->update(['details_json' => $details]);
        }
    }

    protected function collectServiceImagesForSnapshot($bookings, string $serviceType): array
    {
        return collect($bookings)
            ->flatMap(function ($booking) use ($serviceType) {
                return collect($booking->services ?? [])
                    ->filter(fn ($service) => strtolower(class_basename($service->serviceable_type ?? '')) === $serviceType)
                    ->flatMap(function ($service) use ($booking) {
                        return collect(data_get($service, 'details_json.images', []))
                            ->filter()
                            ->values()
                            ->map(function ($path, $index) use ($booking) {
                                return [
                                    'booking_reference' => $booking->booking_reference,
                                    'label' => 'Image ' . ($index + 1),
                                    'path' => $path,
                                    'url' => str_starts_with($path, 'data:image')
                                        ? $path
                                        : $this->mailContextBuilder->buildStorageUrl($path),
                                ];
                            });
                    });
            })
            ->values()
            ->all();
    }
}
