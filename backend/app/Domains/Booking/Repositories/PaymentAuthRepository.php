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
            ->with(['client', 'bookings.passengers', 'bookings.services.serviceable', 'collector'])
            ->latest('id')
            ->first();
    }

    public function getChargeQueue(string $view = 'pending')
    {
        $query = $this->model
            ->whereHas('bookings')
            ->where('status', 'Approved')
            ->with(['client.cards', 'bookings.agent', 'collector']);

        if ($view === 'charged') {
            $query->whereNotNull('collected_at')->latest('collected_at');
        } elseif ($view === 'all') {
            $query->latest('approved_at');
        } else {
            $query->whereNull('collected_at')->latest('approved_at');
        }

        return $query->get();
    }

    public function findByIdForCollection(int $id)
    {
        return $this->model
            ->with(['client.cards', 'bookings.agent', 'collector'])
            ->find($id);
    }
}
