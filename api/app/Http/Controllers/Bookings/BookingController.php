<?php

namespace App\Http\Controllers\Bookings;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookingRequest;
use App\Domains\Booking\Services\BookingService;
use App\Services\BookingTemplateMailer;

use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Domains\Booking\Models\Booking;

class BookingController extends Controller
{
    use ApiResponseTrait;

    protected $bookingService;
    protected $bookingTemplateMailer;

    public function __construct(BookingService $bookingService, BookingTemplateMailer $bookingTemplateMailer)
    {
        $this->bookingService = $bookingService;
        $this->bookingTemplateMailer = $bookingTemplateMailer;
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
            $booking = $this->bookingService->create($request->validated());
            return $this->successResponse($booking, 'Booking created successfully', 201);
        } catch (ValidationException $e) {
            return $this->errorResponse(
                $e->errors()['client'][0] ?? $e->getMessage(),
                422,
                $e->errors()
            );
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
        try {
            $booking = $this->bookingService->update($id, $request->validated());
            return $this->successResponse($booking, 'Booking updated successfully');
        } catch (ValidationException $e) {
            return $this->errorResponse(
                $e->errors()['client'][0] ?? $e->getMessage(),
                422,
                $e->errors()
            );
        }
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

    public function reassign(Request $request, Booking $booking)
    {
        $request->validate([
            'agent_id' => 'required|exists:users,id',
            'handoff_remark' => 'required|string|max:2000',
        ]);
        try {
            $booking = $this->bookingService->reassign($booking, $request->agent_id, $request->handoff_remark);
            return $this->successResponse($booking, 'Booking reassigned successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function sendTemplateEmail(Request $request, $id)
    {
        $validated = $request->validate([
            'template_key' => 'required|string|in:flight_change,cancellation_future_credit,cancellation_refund',
        ]);

        try {
            $booking = $this->bookingService->getById($id);
            $context = $this->bookingTemplateMailer->send($booking, $validated['template_key']);

            return $this->successResponse([
                'email' => $booking->client?->email,
                'subject' => $context['subject'] ?? null,
                'status' => $booking->fresh()->status,
            ], 'Booking update email sent successfully');
        } catch (\Exception $e) {
            Log::error('Booking template email send failed', [
                'booking_id' => $id,
                'template_key' => $validated['template_key'],
                'error' => $e->getMessage(),
            ]);

            return $this->errorResponse($e->getMessage());
        }
    }
}
