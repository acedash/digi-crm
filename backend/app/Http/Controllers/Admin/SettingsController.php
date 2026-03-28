<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SystemSettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(private SystemSettingService $systemSettingService)
    {
    }

    public function showMailSettings(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->systemSettingService->getMailSettings(),
        ]);
    }

    public function updateMailSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'host' => 'required|string',
            'port' => 'required|integer|min:1',
            'username' => 'required|string',
            'password' => 'nullable|string',
            'encryption' => 'required|string|in:none,ssl,tls',
            'from_address' => 'required|email',
            'from_name' => 'required|string',
        ]);

        $settings = $this->systemSettingService->updateMailSettings($validated);

        return response()->json([
            'success' => true,
            'data' => $settings,
            'message' => 'SMTP settings updated successfully.',
        ]);
    }
}
