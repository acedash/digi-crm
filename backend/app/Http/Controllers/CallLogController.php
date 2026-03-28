<?php

namespace App\Http\Controllers;

use App\Models\CallLog;
use Illuminate\Http\Request;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;

class CallLogController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $query = CallLog::with(['client', 'agent']);

        if (Auth::user()->hasRole('agent')) {
            $query->where(function($q) { $q->where('agent_id', '=', Auth::id()); });
        } elseif (Auth::user()->hasRole('supervisor')) {
            $query->whereHas('agent', function($q) {
                $q->where(function($sq) { $sq->where('supervisor_id', '=', Auth::id()); });
            });
        }

        return $this->successResponse($query->latest()->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'call_type' => 'required|string', // Flight, Hotel, Cruise, General Inquiry
            'airline_inquiry' => 'nullable|string',
            'customer_outcome' => 'required|string', // Booking created, Inquiry only, Follow up required, Call dropped
            'notes' => 'nullable|string',
            'callback_required' => 'boolean',
            'callback_datetime' => 'nullable|date',
        ]);

        $validated['agent_id'] = Auth::id();

        $callLog = CallLog::create($validated);

        return $this->successResponse($callLog, 'Call logged successfully', 201);
    }
}
