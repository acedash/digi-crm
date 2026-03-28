<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Repositories\PaymentAuthRepository;
use App\Domains\Booking\Repositories\BookingRepository;
use Illuminate\Support\Facades\DB;

class PaymentAuthService
{
    protected $repository;
    protected $bookingRepository;

    public function __construct(PaymentAuthRepository $repository, BookingRepository $bookingRepository)
    {
        $this->repository = $repository;
        $this->bookingRepository = $bookingRepository;
    }

    /**
     * Create a new payment authorization link for a set of bookings.
     */
    public function createAuthorization(array $bookingIds, int $clientId)
    {
        return DB::transaction(function () use ($bookingIds, $clientId) {
            $bookings = $this->bookingRepository->query()->whereIn('id', $bookingIds)->get();
            
            $totalAmount = $bookings->sum('total_price');
            $currency = $bookings->first()->currency ?? 'USD';

            $auth = $this->repository->create([
                'client_id' => $clientId,
                'total_amount' => $totalAmount,
                'currency' => $currency,
                'status' => 'Pending',
                'metadata' => [
                    'booking_count' => $bookings->count(),
                    'references' => $bookings->pluck('booking_reference')->toArray(),
                ],
            ]);

            $auth->bookings()->attach($bookingIds);

            return $auth;
        });
    }

    /**
     * Get authorization details by token.
     */
    public function getByToken(string $token)
    {
        return $this->repository->findByToken($token);
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

        return $this->repository->update($auth->id, [
            'status' => 'Approved',
            'approved_at' => now(),
            'ip_address' => $consentData['ip_address'] ?? null,
            'user_agent' => $consentData['user_agent'] ?? null,
            'digital_signature' => $consentData['signature'] ?? null,
        ]);
    }
}
