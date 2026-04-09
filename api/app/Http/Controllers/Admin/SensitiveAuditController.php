<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class SensitiveAuditController extends Controller
{
    use ApiResponseTrait;

    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_type' => 'required|string|max:255',
            'module' => 'required|string|max:255',
            'description' => 'required|string|max:255',
            'details' => 'nullable|array',
        ]);

        activity('sensitive_access')
            ->causedBy($request->user())
            ->withProperties([
                'event_type' => $validated['event_type'],
                'module' => $validated['module'],
                'details' => $validated['details'] ?? [],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ])
            ->log($validated['description']);

        return $this->successResponse(null, 'Sensitive access event recorded');
    }
}
