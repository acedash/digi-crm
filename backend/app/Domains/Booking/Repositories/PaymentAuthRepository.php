<?php

namespace App\Domains\Booking\Repositories;

use App\Models\PaymentAuth;
use App\Repositories\BaseRepository;

class PaymentAuthRepository extends BaseRepository
{
    public function __construct(PaymentAuth $model)
    {
        parent::__construct($model);
    }

    public function findByToken(string $token)
    {
        return $this->model->where('token', $token)->with(['client', 'bookings.passengers'])->first();
    }

    public function getPendingForClient(int $clientId)
    {
        return $this->model->where('client_id', $clientId)
            ->where('status', 'Pending')
            ->get();
    }
}
