<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Bookings\BookingController;
use App\Http\Controllers\Bookings\PaymentAuthController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\SensitiveAuditController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\PublicEmailAssetController;
use App\Http\Controllers\UserActivityController;
use App\Http\Controllers\CallLogController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public: Client approval page (no auth needed)
Route::get('/authorize/{token}', [PaymentAuthController::class, 'show']);
Route::post('/authorize/{token}/approve', [PaymentAuthController::class, 'approve']);
Route::post('/authorize/{token}/reject', [PaymentAuthController::class, 'reject']);
Route::post('/authorize/{token}/submit-card', [PaymentAuthController::class, 'submitCardDetails']);
Route::get('/email-assets/{encodedPath}/{signature}', [PublicEmailAssetController::class, 'show']);

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // Activity Tracker
    Route::get('/activities', [UserActivityController::class, 'index']);
    Route::post('/activities', [UserActivityController::class, 'store']);
    Route::get('/activities/status', [UserActivityController::class, 'currentStatus']);
    Route::get('/activities/daily-summary', [UserActivityController::class, 'dailySummary']);
    Route::get('/activities/daily-details/{date}', [UserActivityController::class, 'dailyDetails']);

    Route::get('/dashboard/stats', [\App\Http\Controllers\DashboardController::class, 'getStats']);
    Route::get('/dashboard/agent-monitor', [\App\Http\Controllers\DashboardController::class, 'getAgentMonitor']);
    Route::get('/dashboard/admin-monitor', [\App\Http\Controllers\DashboardController::class, 'getAdminMonitor']);
    Route::get('/dashboard/agent-report/{agentId}', [\App\Http\Controllers\DashboardController::class, 'getAgentStatsReport']);
    Route::get('/dashboard/attendance-report', [\App\Http\Controllers\DashboardController::class, 'getAttendanceReport']);

    Route::group(['prefix' => 'admin'], function () {
        Route::apiResource('clients', ClientController::class);
    });

    // Payment Authorizations
    Route::post('/payment-authorizations', [PaymentAuthController::class, 'store']);
    Route::get('/payment-authorizations/{id}/preview-email', [PaymentAuthController::class, 'previewEmail']);
    Route::post('/payment-authorizations/{id}/send-email', [PaymentAuthController::class, 'sendEmail']);
    Route::get('/bookings/{booking}/consent-proof', [PaymentAuthController::class, 'proofByBooking']);
    Route::post('/payment-authorizations/{token}/refresh', [PaymentAuthController::class, 'refreshSnapshot']);

    // Bookings
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::put('/bookings/{booking}', [BookingController::class, 'update']);
    Route::delete('/bookings/{booking}', [BookingController::class, 'destroy']);
    Route::patch('/bookings/{booking}/reassign', [BookingController::class, 'reassign']);
    Route::get('/bookings/{booking}/preview-template-email', [BookingController::class, 'previewTemplateEmail']);
    Route::post('/bookings/{booking}/send-template-email', [BookingController::class, 'sendTemplateEmail']);
    Route::post('/bookings/{booking}/restore', [BookingController::class, 'restore']);

    Route::get('/admin/settings/mail-templates', [SettingsController::class, 'listMailTemplates']);
    Route::put('/admin/settings/mail-templates', [SettingsController::class, 'updateMailTemplates']);

    // Admin Only
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/audit-logs', [\App\Http\Controllers\Admin\AuditController::class, 'index']);
        Route::post('/admin/sensitive-audit', [SensitiveAuditController::class, 'store']);
        
        Route::get('/admin/users', [\App\Http\Controllers\Admin\UserController::class, 'index']);
        Route::get('/admin/supervisors', [\App\Http\Controllers\Admin\UserController::class, 'getSupervisors']);
        Route::get('/admin/settings/mail', [SettingsController::class, 'showMailSettings']);
        Route::post('/admin/users', [\App\Http\Controllers\Admin\UserController::class, 'store']);
        Route::put('/admin/settings/mail', [SettingsController::class, 'updateMailSettings']);
        Route::put('/admin/users/{user}', [\App\Http\Controllers\Admin\UserController::class, 'update']);
        Route::patch('/admin/users/{user}/toggle-status', [\App\Http\Controllers\Admin\UserController::class, 'toggleStatus']);
        Route::get('/admin/payment-authorizations/charge-queue', [PaymentAuthController::class, 'chargeQueue']);
        Route::post('/admin/payment-authorizations/{paymentAuth}/mark-charged', [PaymentAuthController::class, 'markCharged']);
    });

    // Profile Status Updates
    Route::post('/user/status', [\App\Http\Controllers\Admin\UserController::class, 'updateStatus']);

    // Supervisor Only
    Route::middleware('role:supervisor')->group(function () {
        Route::get('/supervisor/my-agents', [\App\Http\Controllers\Admin\UserController::class, 'myAgents']);
    });

    // Call Logging
    Route::get('/call-logs', [\App\Http\Controllers\CallLogController::class, 'index']);
    Route::get('/call-logs/export', [\App\Http\Controllers\CallLogController::class, 'export']);
    Route::post('/call-logs', [\App\Http\Controllers\CallLogController::class, 'store']);

    // Secure Notepad
    Route::get('/notepad', [\App\Http\Controllers\NotepadController::class, 'getNote']);
    Route::post('/notepad', [\App\Http\Controllers\NotepadController::class, 'updateNote']);
    Route::delete('/notepad', [\App\Http\Controllers\NotepadController::class, 'clearNote']);
});
