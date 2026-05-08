<?php

namespace App\Http\Controllers\Bookings;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use App\Domains\Booking\Services\PaymentAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentAuthController extends Controller
{
    use ApiResponseTrait;

    protected $paymentAuthService;

    public function __construct(PaymentAuthService $paymentAuthService)
    {
        $this->paymentAuthService = $paymentAuthService;
    }

    /**
     * Create a new payment authorization (send to client for approval).
     */
    public function store(Request $request)
    {
        $isCardCollection = $request->authorization_type === 'card_collection';

        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'booking_ids' => $isCardCollection ? 'nullable|array' : 'required|array|min:1',
            'booking_ids.*' => 'exists:bookings,id',
            'authorization_type' => 'nullable|string|in:initial,change_charge,card_collection',
            'card_allocations' => 'nullable|array',
            'card_allocations.*.holder_name' => 'nullable|string|max:255',
            'card_allocations.*.card_label' => 'nullable|string|max:255',
            'card_allocations.*.amount' => 'required_with:card_allocations|numeric|min:0.01',
            'card_allocations.*.remarks' => 'nullable|string|max:1000',
            'change_entries' => 'nullable|array',
        ]);

        try {
            $auth = $this->paymentAuthService->createAuthorization(
                $request->booking_ids,
                $request->client_id,
                $request->only(['authorization_type', 'card_allocations', 'change_entries'])
            );

            return $this->successResponse([
                'id' => $auth->id,
                'token' => $auth->token,
                'approval_url' => config('app.frontend_url') . '/authorize/' . $auth->token,
                'total_amount' => $auth->total_amount,
                'currency' => $auth->currency,
                'email' => $auth->client?->email,
            ], 'Authorization link created successfully', 201);
        } catch (\Exception $e) {
            Log::error('Payment authorization send failed', [
                'client_id' => $request->client_id,
                'booking_ids' => $request->booking_ids,
                'error' => $e->getMessage(),
            ]);
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Get authorization details by token (public, no auth required).
     */
    public function show(string $token)
    {
        $auth = $this->paymentAuthService->getByToken($token);

        if (!$auth) {
            return $this->errorResponse('Authorization not found', 404);
        }

        return $this->successResponse($auth, 'Authorization details retrieved');
    }

    public function proofByBooking(int $bookingId)
    {
        $auth = $this->paymentAuthService->getLatestByBookingId($bookingId);

        if (!$auth) {
            return $this->errorResponse('Consent proof not found', 404);
        }

        return $this->successResponse($auth, 'Consent proof retrieved');
    }

    public function chargeQueue()
    {
        $view = request()->get('view', 'pending');
        if (!in_array($view, ['pending', 'charged', 'all'], true)) {
            $view = 'pending';
        }

        $filters = [
            'startDate' => request()->get('startDate'),
            'endDate' => request()->get('endDate'),
        ];

        $records = $this->paymentAuthService->getChargeQueue($view, $filters);

        return $this->successResponse($records, 'Charge queue retrieved');
    }

    public function markCharged(Request $request, int $paymentAuthId)
    {
        $validated = $request->validate([
            'collection_reference' => 'nullable|string|max:255',
            'collection_notes' => 'nullable|string|max:2000',
            'charge_status' => 'required|string|in:Charged/Captured,Pending,Decline,Chargeback,Refunded',
        ]);

        try {
            $auth = $this->paymentAuthService->markCharged($paymentAuthId, $validated);

            return $this->successResponse($auth, 'Authorization marked as charged successfully');
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function approve(Request $request, string $token)
    {
        $request->validate([
            'signature' => 'nullable|string',
            'id_proof' => 'nullable|file|image|max:5120', // 5MB max
        ]);

        try {
            $auth = $this->paymentAuthService->approve($token, [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'signature' => $request->signature,
                'id_proof' => $request->file('id_proof'),
            ]);

            return $this->successResponse($auth, 'Payment authorization approved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Public submission of card details (Card Collection workflow).
     */
    public function submitCardDetails(Request $request, string $token)
    {
        $validated = $request->validate([
            'cards' => 'required|array|min:1',
            'cards.*.card_holder_name' => 'required|string|max:255',
            'cards.*.card_number' => 'required|string|min:13|max:19',
            'cards.*.expiry_month' => 'required|string|size:2',
            'cards.*.expiry_year' => 'required|string|min:2|max:4',
            'cards.*.cvv' => 'required|string|min:3|max:4',
            'cards.*.billing_address' => 'nullable|string|max:1000',
            'cards.*.currency' => 'nullable|string|size:3',
            'cards.*.amount' => 'required|numeric|min:0',
        ]);

        try {
            $auth = $this->paymentAuthService->collectCardDetails($token, [
                'cards' => $validated['cards'],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->successResponse($auth, 'Card details submitted securely and saved successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function reject(Request $request, string $token)
    {
        $request->validate([
            'signature' => 'nullable|string',
            'id_proof' => 'nullable|file|image|max:5120', // 5MB max
        ]);

        try {
            $auth = $this->paymentAuthService->reject($token, [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'signature' => $request->signature,
                'id_proof' => $request->file('id_proof'),
            ]);

            return $this->successResponse($auth, 'Payment authorization rejected successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
    public function refreshSnapshot(string $token)
    {
        try {
            $auth = $this->paymentAuthService->refreshSnapshot($token);
            return $this->successResponse($auth, 'Consent proof snapshot updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function previewEmail(int $id)
    {
        try {
            $preview = $this->paymentAuthService->previewAuthEmail($id);
            return $this->successResponse($preview, 'Authorization email preview generated');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function sendEmail(int $id)
    {
        try {
            $this->paymentAuthService->sendAuthEmail($id);
            return $this->successResponse(null, 'Authorization email sent successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
}
