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
            $authorizationType = $options['authorization_type'] ?? 'initial';
            $isCardCollection = $authorizationType === 'card_collection';

            $bookings = collect();
            if (!$isCardCollection) {
                $bookings = \App\Domains\Booking\Models\Booking::with(['services.serviceable'])
                    ->whereIn('id', $bookingIds)
                    ->get();
            }

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

            $totalAmount = 0;
            if ($authorizationType === 'change_charge') {
                $totalAmount = (float) $cardAllocations->sum('amount');
            } elseif ($authorizationType === 'initial') {
                $totalAmount = (float) $bookings->sum('total_amount');
            }

            $currency = $isCardCollection ? 'USD' : ($bookings->first()->currency ?? 'USD');

            if (!$isCardCollection && $totalAmount <= 0) {
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

            if ($authorizationType === 'card_collection') {
                return $this->repository->findByToken($auth->token);
            }

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

        if ($options['send_email'] ?? true) {
            $this->authorizationMailer->send($auth);
        }

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

    public function getChargeQueue(string $view = 'pending', array $filters = [])
    {
        return $this->repository->getChargeQueue($view, $filters);
    }

    public function collectCardDetails(string $token, array $data)
    {
        $auth = $this->repository->findByToken($token);
    
        if (!$auth || $auth->status !== 'Pending') {
            throw new \RuntimeException('This link is invalid or has already been used.');
        }
    
        $cards = $data['cards'] ?? [];
        if (empty($cards)) {
            throw new \RuntimeException('No card details provided.');
        }
    
        // Optional: Strict validation against total_amount if it's set
        if ($auth->total_amount > 0) {
            $sum = collect($cards)->sum('amount');
            if (abs($sum - $auth->total_amount) > 0.01) {
                throw new \RuntimeException(sprintf('Total card allocation (%s) must match requested amount (%s).', number_format($sum, 2), number_format($auth->total_amount, 2)));
            }
        }
    
        return DB::transaction(function () use ($auth, $data, $cards) {
            $collectedCardIds = [];
            $allocations = [];
            $maskedCards = [];
    
            foreach ($cards as $cardData) {
                // 1. Create the Client Card (Encrypted automatically by model)
                $card = \App\Models\ClientCard::create([
                    'client_id' => $auth->client_id,
                    'card_holder_name' => $cardData['card_holder_name'],
                    'card_number' => $cardData['card_number'],
                    'last_4' => substr($cardData['card_number'], -4),
                    'expiry_month' => $cardData['expiry_month'],
                    'expiry_year' => $cardData['expiry_year'],
                    'cvv' => $cardData['cvv'],
                    'billing_address' => $cardData['billing_address'] ?? null,
                    'currency' => $cardData['currency'] ?? ($auth->currency ?? 'USD'),
                    'is_primary' => false,
                ]);
    
                $collectedCardIds[] = $card->id;
                $allocations[] = [
                    'card_id' => $card->id,
                    'last_4' => $card->last_4,
                    'amount' => (float) ($cardData['amount'] ?? 0),
                    'holder_name' => $card->card_holder_name,
                ];
                $maskedCards[] = 'XXXX' . $card->last_4 . ' ($' . number_format($cardData['amount'], 2) . ')';
            }
    
            // 2. Mark authorization link as Approved/Collected
            $summary = count($cards) > 1 
                ? count($cards) . ' Cards: ' . implode(', ', $maskedCards)
                : $maskedCards[0];
    
            $auth->update([
                'status' => 'Approved',
                'approved_at' => now(),
                'ip_address' => $data['ip_address'] ?? null,
                'user_agent' => $data['user_agent'] ?? null,
                'masked_card' => substr($summary, 0, 255),
                'metadata' => array_merge($auth->metadata ?? [], [
                    'collected_card_ids' => $collectedCardIds,
                    'card_allocations' => $allocations,
                    'collection_method' => 'public_link'
                ])
            ]);
    
            // 3. Sync cards to associated bookings so they appear in existing UI
            foreach ($auth->bookings as $booking) {
                $details = $booking->details_json ?? [];
                $paymentCards = $details['payment_cards'] ?? [];
    
                foreach ($cards as $cardData) {
                    $paymentCards[] = [
                        'holder_name' => $cardData['card_holder_name'],
                        'number' => $cardData['card_number'],
                        'exp' => $cardData['expiry_month'] . '/' . $cardData['expiry_year'],
                        'cvv' => $cardData['cvv'],
                        'amount' => (float) ($cardData['amount'] ?? 0),
                        'currency' => $cardData['currency'] ?? ($booking->currency ?? 'USD'),
                        'remarks' => 'Collected via secure link',
                        'collected_at' => now()->toDateTimeString(),
                    ];
                }
    
                $details['payment_cards'] = $paymentCards;
                $booking->update(['details_json' => $details]);
            }
    
            return $auth;
        });
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
                'status' => 'Work Pending',
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
            $updateData = [
                'status' => 'Approved',
                'approved_at' => now(),
                'approved_email' => $auth->client?->email,
                'ip_address' => $consentData['ip_address'] ?? null,
                'user_agent' => $consentData['user_agent'] ?? null,
                'digital_signature' => $consentData['signature'] ?? null,
            ];

            if (isset($consentData['id_proof']) && $consentData['id_proof'] instanceof \Illuminate\Http\UploadedFile) {
                $path = $consentData['id_proof']->store('id_proofs', 'public');
                $updateData['id_proof_path'] = $path;
            }

            $auth->update($updateData);

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
            $updateData = [
                'status' => 'Rejected',
                'approved_at' => now(),
                'approved_email' => $auth->client?->email,
                'ip_address' => $consentData['ip_address'] ?? null,
                'user_agent' => $consentData['user_agent'] ?? null,
                'digital_signature' => $consentData['signature'] ?? null,
            ];

            if (isset($consentData['id_proof']) && $consentData['id_proof'] instanceof \Illuminate\Http\UploadedFile) {
                $path = $consentData['id_proof']->store('id_proofs', 'public');
                $updateData['id_proof_path'] = $path;
            }

            $auth->update($updateData);

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
                        $type = strtolower(class_basename($service->serviceable_type ?? ''));
                        return in_array($type, ['flight', 'multiflight']);
                    })
                    ->flatMap(function ($service) use ($booking) {
                        $allImages = collect();

                        // helper to push standardized paths
                        $pushImage = function($path, $label) use (&$allImages, $booking) {
                            if (filled($path)) {
                                $standardPath = ltrim($path, '/');
                                $allImages->push([
                                    'booking_reference' => $booking->booking_reference,
                                    'segment_label' => $label,
                                    'path' => $standardPath,
                                    'url' => str_starts_with($standardPath, 'data:image')
                                        ? $standardPath
                                        : $this->mailContextBuilder->buildStorageUrl($standardPath),
                                ]);
                            }
                        };

                        // 1. Collect one image per segment (ticket_image is the canonical field).
                        $segments = data_get($service, 'details_json.segments', []);
                        $hasSegmentImages = false;
                        foreach ($segments as $index => $segment) {
                            if (!empty($segment['ticket_image'])) {
                                $pushImage($segment['ticket_image'], 'Flight Segment ' . ($index + 1));
                                $hasSegmentImages = true;
                            }
                        }

                        // Only collect from top-level if segment-level images were not present, 
                        // as BookingOrchestrator duplicates segment 0 images to the top-level with a new file path.
                        if (!$hasSegmentImages) {
                            // 2. Collect top-level ticket_image
                            $pushImage(data_get($service, 'serviceable.ticket_image'), 'Main Ticket');
    
                            // 3. Collect plural ticket_images
                            $pluralImages = data_get($service, 'serviceable.ticket_images');
                            if (is_array($pluralImages)) {
                                foreach ($pluralImages as $index => $path) {
                                    $pushImage($path, count($pluralImages) > 1 ? 'Flight Image ' . ($index + 1) : 'Flight Image');
                                }
                            }
                        }

                        return $allImages;
                    });
            })
            ->unique('path')
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

    public function refreshSnapshot(string $token)
    {
        $auth = \App\Models\PaymentAuth::where('token', $token)->firstOrFail();
        
        $auth->consent_snapshot = $this->buildConsentSnapshot($auth->bookings);
        $auth->save();

        return $auth;
    }

    public function sendAuthEmail(int $id): void
    {
        $auth = $this->repository->findById($id);
        if (!$auth) {
            throw new \RuntimeException('Authorization not found.');
        }

        $this->authorizationMailer->send($auth);
    }
}
