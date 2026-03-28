<?php

namespace App\Http\Controllers\Bookings;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookingRequest;
use App\Domains\Booking\Services\BookingService;

use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BookingController extends Controller
{
    use ApiResponseTrait;

    protected $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    public function index(Request $request)
    {
        return $this->successResponse(
            $this->bookingService->getAllBookings($request->all()),
            'Bookings retrieved successfully'
        );
    }

    public function store(BookingRequest $request)
    {
        try {
            // $request->validated() now returns the multi-service structure
            $booking = $this->bookingService->create($request->validated());
            return $this->successResponse($booking, 'Booking created successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function show($id)
    {
        $booking = $this->bookingService->getById($id);
        return $this->successResponse($booking, 'Booking details retrieved');
    }

    public function update(BookingRequest $request, $id)
    {
        $booking = $this->bookingService->update($id, $request->validated());
        return $this->successResponse($booking, 'Booking updated successfully');
    }

    public function destroy($id)
    {
        try {
            $this->bookingService->delete($id);
            return $this->successResponse(null, 'Booking deleted successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function reassign(Request $request, $id)
    {
        $request->validate(['agent_id' => 'required|exists:users,id']);
        try {
            $booking = $this->bookingService->reassign($id, $request->agent_id);
            return $this->successResponse($booking, 'Booking reassigned successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
