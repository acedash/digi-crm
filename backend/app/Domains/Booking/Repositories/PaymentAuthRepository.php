<?php

namespace App\Domains\Booking\Repositories;

use App\Models\PaymentAuth;
use App\Domains\Core\Repositories\BaseRepository;

class PaymentAuthRepository extends BaseRepository
{
    public function __construct(PaymentAuth $model)
    {
        parent::__construct($model);
    }

    public function findByToken(string $token)
    {
        return $this->model->where('token', $token)->with(['client', 'bookings.passengers', 'bookings.services.serviceable'])->first();
    }

    public function getPendingForClient(int $clientId)
    {
        return $this->model->where('client_id', $clientId)
            ->where('status', 'Pending')
            ->get();
    }

    public function findLatestByBookingId(int $bookingId)
    {
        return $this->model
            ->whereHas('bookings', fn ($query) => $query->where('bookings.id', $bookingId))
            ->with(['client', 'bookings.passengers', 'bookings.services.serviceable'])
            ->latest('id')
            ->first();
    }
}
