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

    public function getChargeQueue(string $view = 'pending', array $filters = [])
    {
        $query = $this->model
            ->whereHas('bookings')
            ->where('status', 'Approved')
            ->select([
                'id', 'client_id', 'token', 'status', 'charge_status', 'total_amount', 'currency', 
                'approved_at', 'collected_at', 'collected_by', 'masked_card',
                'metadata'
            ]) // digital_signature and consent_snapshot excluded for bandwidth; metadata is sufficient for list view logic
            ->with(['client:id,name,first_name,last_name', 'bookings:id,booking_reference,agent_id,details_json', 'bookings.agent:id,name', 'collector:id,name']);

        if ($view === 'charged') {
            $query->whereNotNull('collected_at')->latest('collected_at');
            if (!empty($filters['startDate'])) {
                $query->where('collected_at', '>=', \Illuminate\Support\Carbon::parse($filters['startDate'])->startOfDay());
            }
            if (!empty($filters['endDate'])) {
                $query->where('collected_at', '<=', \Illuminate\Support\Carbon::parse($filters['endDate'])->endOfDay());
            }
        } elseif ($view === 'all') {
            $query->latest('approved_at');
            if (!empty($filters['startDate'])) {
                $query->where('approved_at', '>=', \Illuminate\Support\Carbon::parse($filters['startDate'])->startOfDay());
            }
            if (!empty($filters['endDate'])) {
                $query->where('approved_at', '<=', \Illuminate\Support\Carbon::parse($filters['endDate'])->endOfDay());
            }
        } else {
            $query->whereNull('collected_at')->latest('approved_at');
            if (!empty($filters['startDate'])) {
                $query->where('approved_at', '>=', \Illuminate\Support\Carbon::parse($filters['startDate'])->startOfDay());
            }
            if (!empty($filters['endDate'])) {
                $query->where('approved_at', '<=', \Illuminate\Support\Carbon::parse($filters['endDate'])->endOfDay());
            }
        }

        return $query->paginate(25);
    }

    public function findByIdForCollection(int $id)
    {
        return $this->model
            ->with(['client.cards', 'bookings.agent', 'collector'])
            ->find($id);
    }
}
