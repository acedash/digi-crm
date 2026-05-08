<?php

namespace App\Services;

use App\Mail\AuthorizationEmail;
use App\Models\PaymentAuth;
use Illuminate\Support\Facades\Mail;

class AuthorizationMailer
{
    public function __construct(private SystemSettingService $systemSettingService)
    {
    }

    public function render(PaymentAuth $authorization): array
    {
        $approvalUrl = rtrim(config('app.frontend_url'), '/') . '/authorize/' . $authorization->token;
        $mailable = new AuthorizationEmail($authorization, $approvalUrl, isPreview: true);
        
        return [
            'subject' => $mailable->envelope()->subject,
            'body' => $mailable->render(),
            'to' => $authorization->client?->email,
        ];
    }

    public function send(PaymentAuth $authorization): void
    {
        if (!$authorization->client?->email) {
            throw new \RuntimeException('Client email is required to send authorization.');
        }

        if (!filter_var($authorization->client->email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('Client email is invalid. Update the client email before sending approval.');
        }

        if (!$this->systemSettingService->hasMailSettings()) {
            throw new \RuntimeException('SMTP settings are not configured.');
        }

        $this->systemSettingService->applyMailConfig();

        $approvalUrl = rtrim(config('app.frontend_url'), '/') . '/authorize/' . $authorization->token;

        Mail::to($authorization->client->email)->send(
            new AuthorizationEmail($authorization, $approvalUrl)
        );
    }
}
