<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Repositories\PaymentAuthRepository;
use App\Domains\Booking\Repositories\BookingRepository;
use App\Services\AuthorizationMailer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PaymentAuthService
{
    protected $repository;
    protected $bookingRepository;
    protected $authorizationMailer;

    public function __construct(PaymentAuthRepository $repository, BookingRepository $bookingRepository, AuthorizationMailer $authorizationMailer)
    {
        $this->repository = $repository;
        $this->bookingRepository = $bookingRepository;
        $this->authorizationMailer = $authorizationMailer;
    }

    /**
     * Create a new payment authorization link for a set of bookings.
     */
    public function createAuthorization(array $bookingIds, int $clientId)
    {
        $auth = DB::transaction(function () use ($bookingIds, $clientId) {
            $bookings = \App\Domains\Booking\Models\Booking::with(['services.serviceable'])
                ->whereIn('id', $bookingIds)
                ->get();
            
            $totalAmount = $bookings->sum('total_amount');
            $currency = $bookings->first()->currency ?? 'USD';
            $maskedCard = $this->resolveMaskedCard($bookings);
            $snapshot = $this->buildConsentSnapshot($bookings, $currency, $totalAmount, $maskedCard);

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
                    'booking_count' => $bookings->count(),
                    'references' => $bookings->pluck('booking_reference')->toArray(),
                ],
            ]);

            $auth->bookings()->attach($bookingIds);
            $auth->bookings()->update([
                'status' => 'Awaiting Approval',
            ]);

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

            $auth->bookings()->update([
                'status' => 'Approved',
            ]);
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

            $auth->bookings()->update([
                'status' => 'Rejected',
            ]);
        });

        return $this->repository->findByToken($token);
    }

    protected function buildConsentSnapshot($bookings, string $currency, float $totalAmount, string $maskedCard): array
    {
        $travellers = $bookings
            ->flatMap(function ($booking) {
                $items = collect();

                if ($booking->client) {
                    $items->push([
                        'name' => trim(($booking->client->first_name ?? '') . ' ' . ($booking->client->middle_name ?? '') . ' ' . ($booking->client->last_name ?? '')),
                        'date_of_birth' => $booking->client->date_of_birth,
                    ]);
                }

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

        $baseFare = (float) $bookings
            ->flatMap(fn ($booking) => $booking->services ?? [])
            ->sum(fn ($service) => (float) ($service->cost_price ?? 0));

        if ($baseFare <= 0 || $baseFare > $totalAmount) {
            $baseFare = $totalAmount;
        }

        $fareBreakdown = [
            'base_fare' => $baseFare,
            'taxes_and_fee' => max($totalAmount - $baseFare, 0),
            'grand_total' => $totalAmount,
        ];

        $ticketImages = $bookings
            ->flatMap(function ($booking) {
                return collect($booking->services ?? [])
                    ->filter(function ($service) {
                        return strtolower(class_basename($service->serviceable_type ?? '')) === 'flight'
                            && filled(data_get($service, 'serviceable.ticket_image'));
                    })
                    ->map(function ($service) use ($booking) {
                        return [
                            'booking_reference' => $booking->booking_reference,
                            'path' => $service->serviceable->ticket_image,
                            'url' => rtrim(config('app.backend_url'), '/') . '/storage/' . ltrim($service->serviceable->ticket_image, '/'),
                        ];
                    });
            })
            ->values()
            ->all();

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

        $declarationText = sprintf(
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
            'masked_card' => $maskedCard,
            'client_name' => $clientName,
            'currency' => $currency,
            'total_amount' => $totalAmount,
            'booking_references' => $bookings->pluck('booking_reference')->values()->all(),
            'travellers' => $travellers,
            'fare_breakdown' => $fareBreakdown,
            'ticket_images' => $ticketImages,
            'supplier_label' => $supplierLabel,
            'terms_version' => 'v1',
            'contact' => [
                'email' => 'cs@reservation-supports.com',
                'phone' => '+1 (325) 349 9888',
            ],
        ];
    }

    protected function resolveMaskedCard($bookings): string
    {
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
}
