<?php

namespace App\Http\Controllers;

use App\Models\CallLog;
use Illuminate\Http\Request;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CallLogController extends Controller
{
    use ApiResponseTrait;

    protected function buildScopedQuery(Request $request)
    {
        $query = CallLog::with(['client', 'agent']);

        if ($request->filled('scope') && in_array($request->scope, ['booking', 'general'], true)) {
            $query->where('log_scope', $request->scope);
        }

        if (Auth::user()->hasRole('agent')) {
            $query->where(function ($q) {
                $q->where('agent_id', '=', Auth::id());
            });
        } elseif (Auth::user()->hasRole('supervisor')) {
            $query->where(function ($q) {
                $q->where('agent_id', Auth::id())
                  ->orWhereHas('agent', function ($aq) {
                      $aq->whereHas('supervisors', function ($sq) {
                          $sq->where('users.id', '=', Auth::id());
                      });
                  });
            });
        }

        return $query;
    }

    public function index(Request $request)
    {
        $query = $this->buildScopedQuery($request);

        return $this->successResponse($query->latest()->paginate(20));
    }

    public function export(Request $request): StreamedResponse
    {
        $scope = $request->scope;
        $query = $this->buildScopedQuery($request)->latest();
        $filename = 'call-logs';

        if (in_array($scope, ['booking', 'general'], true)) {
            $filename .= '-' . $scope;
        }

        $filename .= '-' . now()->format('Y-m-d_H-i') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return response()->stream(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Logged At',
                'Scope',
                'Agent',
                'Client / Contact',
                'Contact Email',
                'Contact Phone',
                'Lead Source',
                'Call Type',
                'Airline Inquiry',
                'Outcome',
                'Callback Required',
                'Callback Datetime',
                'Notes',
            ]);

            $query->chunk(200, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    $clientName = $log->client
                        ? trim(($log->client->first_name ?? '') . ' ' . ($log->client->last_name ?? '')) ?: ($log->client->name ?? '')
                        : null;

                    fputcsv($handle, [
                        optional($log->created_at)->format('Y-m-d H:i:s'),
                        $log->log_scope === 'general' ? 'Marketing Call' : 'Booking Call',
                        $log->agent?->name,
                        $clientName ?: $log->contact_name,
                        $log->client?->email ?: $log->contact_email,
                        $log->client?->phone ?: $log->contact_phone,
                        $log->lead_source,
                        is_array($log->call_type) ? implode(', ', $log->call_type) : $log->call_type,
                        is_array($log->airline_inquiry) 
                            ? collect($log->airline_inquiry)->map(fn($val, $key) => "$key: $val")->implode(' | ') 
                            : $log->airline_inquiry,
                        $log->customer_outcome,
                        $log->callback_required ? 'Yes' : 'No',
                        $log->callback_datetime,
                        $log->notes,
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'log_scope' => 'nullable|string|in:booking,general',
            'contact_name' => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'lead_source' => 'nullable|string|max:255',
            'call_type' => 'required', // Now an array or string
            'airline_inquiry' => 'nullable',
            'customer_outcome' => 'required|string', // Booking created, Inquiry only, Follow up required, Call dropped
            'notes' => 'nullable|string',
            'callback_required' => 'boolean',
            'callback_datetime' => 'nullable|date',
        ]);

        $validated['agent_id'] = Auth::id();
        $validated['log_scope'] = $validated['log_scope'] ?? ($validated['client_id'] ? 'booking' : 'general');

        if ($validated['log_scope'] === 'general' && empty($validated['contact_name']) && empty($validated['contact_email']) && empty($validated['contact_phone'])) {
            return response()->json([
                'success' => false,
                'message' => 'For a general marketing call, add at least a name, email, or phone number.',
            ], 422);
        }

        if ($validated['log_scope'] === 'booking') {
            $validated['contact_name'] = null;
            $validated['contact_email'] = null;
            $validated['contact_phone'] = null;
            $validated['lead_source'] = null;
        } else {
            $validated['client_id'] = null;
        }

        $callLog = CallLog::create($validated);

        return $this->successResponse($callLog, 'Call logged successfully', 201);
    }
}
