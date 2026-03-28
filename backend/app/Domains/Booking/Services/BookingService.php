<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Repositories\BookingRepository;
use App\Domains\Booking\Services\BookingOrchestrator;

class BookingService
{
    protected $bookingRepo;
    protected $orchestrator;

    public function __construct(BookingRepository $bookingRepo, BookingOrchestrator $orchestrator)
    {
        $this->bookingRepo = $bookingRepo;
        $this->orchestrator = $orchestrator;
    }

    public function create(array $data)
    {
        return $this->orchestrator->createMultiServiceBooking($data);
    }


    public function getAllBookings($params = [])
    {
        $perPage = $params['per_page'] ?? 15;
        $query = \App\Domains\Booking\Models\Booking::with(['client.agent', 'agent', 'passengers', 'services.serviceable'])
            ->orderBy('created_at', 'desc');

        if (auth()->user()->hasRole('admin')) {
            return $query->paginate($perPage);
        }

        if (auth()->user()->hasRole('supervisor')) {
            $teamIds = auth()->user()->agents()->pluck('id')->toArray();
            $teamIds[] = auth()->id();
            
            return $query->whereIn('agent_id', $teamIds)->paginate($perPage);
        }

        return $query->where('agent_id', auth()->id())->paginate($perPage);
    }

    public function getById($id)
    {
        return $this->bookingRepo->find($id)?->load(['client', 'agent', 'passengers', 'services.serviceable']);
    }

    public function delete($id)
    {
        $booking = $this->bookingRepo->find($id);
        if (!$booking) {
            throw new \Exception("Booking not found.");
        }
        return $this->bookingRepo->delete($booking);
    }

    public function update($id, array $data)
    {
        return $this->orchestrator->updateMultiServiceBooking($id, $data);
    }

    public function reassign($id, $newAgentId)
    {
        $booking = $this->bookingRepo->find($id);
        if (!$booking) {
            throw new \Exception("Booking not found.");
        }
        $booking->update(['agent_id' => $newAgentId]);
        return $booking->load(['client', 'agent', 'passengers', 'services.serviceable']);
    }
}
