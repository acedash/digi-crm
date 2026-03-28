<?php

namespace App\Http\Controllers\Bookings;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use App\Domains\Booking\Services\PaymentAuthService;
use Illuminate\Http\Request;

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
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'booking_ids' => 'required|array|min:1',
            'booking_ids.*' => 'exists:bookings,id',
        ]);

        try {
            $auth = $this->paymentAuthService->createAuthorization(
                $request->booking_ids,
                $request->client_id
            );

            return $this->successResponse([
                'id' => $auth->id,
                'token' => $auth->token,
                'approval_url' => config('app.frontend_url') . '/authorize/' . $auth->token,
                'total_amount' => $auth->total_amount,
                'currency' => $auth->currency,
            ], 'Authorization link created successfully', 201);
        } catch (\Exception $e) {
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

    /**
     * Client approves the payment authorization.
     */
    public function approve(Request $request, string $token)
    {
        $request->validate([
            'signature' => 'nullable|string',
        ]);

        try {
            $auth = $this->paymentAuthService->approve($token, [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'signature' => $request->signature,
            ]);

            return $this->successResponse($auth, 'Payment authorization approved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
}
