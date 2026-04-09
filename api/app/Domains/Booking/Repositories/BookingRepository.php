<?php

namespace App\Domains\Booking\Repositories;

use App\Domains\Booking\Models\Booking;
use App\Domains\Core\Repositories\BaseRepository;

class BookingRepository extends BaseRepository
{
    public function __construct(Booking $model)
    {
        parent::__construct($model);
    }

    /**
     * Get bookings by client.
     */
    public function getByClient($clientId)
    {
        return $this->model->where('client_id', $clientId)
            ->with(['agent', 'client', 'passengers', 'services.serviceable'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Get bookings by agent.
     */
    public function getByAgent($agentId)
    {
        return $this->model->where('agent_id', $agentId)
            ->with(['agent', 'client', 'passengers', 'services.serviceable'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findDetailed($id): ?Booking
    {
        return $this->model->query()
            ->select([
                'id',
                'client_id',
                'agent_id',
                'booking_reference',
                'status',
                'total_amount',
                'currency',
                'details_json',
                'created_at',
            ])
            ->with([
                'client:id,first_name,middle_name,last_name,name,email,alternate_email,phone,alternate_phone,date_of_birth,gender,address',
                'agent:id,name',
                'passengers:id,first_name,middle_name,last_name,date_of_birth,gender,type',
                'services' => function ($query) {
                    $query->select([
                        'id',
                        'booking_id',
                        'serviceable_id',
                        'serviceable_type',
                        'cost_price',
                        'sell_price',
                        'markup',
                        'details_json',
                    ]);
                },
                'services.serviceable',
            ])
            ->find($id);
    }

    /**
     * Generate a unique booking reference.
     */
    public function generateReference()
    {
        $prefix = 'BK-' . date('Ymd') . '-';
        $latest = $this->model->where('booking_reference', 'like', $prefix . '%')
            ->orderBy('booking_reference', 'desc')
            ->first();

        if ($latest) {
            $lastNum = (int) substr($latest->booking_reference, -4);
            $newNum = str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNum = '0001';
        }

        return $prefix . $newNum;
    }
}
