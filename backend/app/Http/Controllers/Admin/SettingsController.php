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

    public function listMailTemplates(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->systemSettingService->getMailTemplates(),
        ]);
    }

    public function updateMailTemplates(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'templates' => 'required|array|min:1',
            'templates.*.key' => 'required|string',
            'templates.*.name' => 'required|string',
            'templates.*.description' => 'nullable|string',
            'templates.*.subject' => 'required|string',
            'templates.*.body' => 'required|string',
            'templates.*.terms_content' => 'nullable|string',
            'templates.*.enabled' => 'required|boolean',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->systemSettingService->updateMailTemplates($validated['templates']),
            'message' => 'Email templates updated successfully.',
        ]);
    }
}
