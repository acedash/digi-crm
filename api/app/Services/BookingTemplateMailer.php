<?php

namespace App\Services;

use App\Domains\Booking\Models\Booking;
use App\Mail\BookingLifecycleEmail;
use Illuminate\Support\Facades\Mail;

class BookingTemplateMailer
{
    public function __construct(
        private SystemSettingService $systemSettingService,
        private BookingMailContextBuilder $mailContextBuilder
    ) {
    }

    public function preview(Booking $booking, string $templateKey): array
    {
        $template = $this->systemSettingService->getMailTemplate($templateKey);
        $context = $this->mailContextBuilder->buildBookingTemplateContext($booking, $template);

        return [
            'subject' => $context['subject'] ?? 'No Subject',
            'body' => $context['body_html'] ?? $context['body'] ?? '',
            'to' => $booking->client?->email,
        ];
    }

    public function send(Booking $booking, string $templateKey): array
    {
        $template = $this->systemSettingService->getMailTemplate($templateKey);

        if (!($template['enabled'] ?? true)) {
            throw new \RuntimeException('This email template is currently disabled in settings.');
        }

        if (!$booking->client?->email) {
            throw new \RuntimeException('Client email is required to send this update.');
        }

        if (!filter_var($booking->client->email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('Client email is invalid. Update the client email before sending.');
        }

        if (!$this->systemSettingService->hasMailSettings()) {
            throw new \RuntimeException('SMTP settings are not configured.');
        }

        $this->systemSettingService->applyMailConfig();

        $context = $this->mailContextBuilder->buildBookingTemplateContext($booking, $template);

        if ($templateKey === 'flight_change' && (
            empty($context['latest_flight_change'])
            || ($context['latest_flight_change']['service_key'] ?? 'flight') !== 'flight'
        )) {
            throw new \RuntimeException('No tracked flight change found. Edit the booking and record the flight change details before sending this email.');
        }

        Mail::to($booking->client->email)->send(
            new BookingLifecycleEmail($booking, $template, $context)
        );

        $this->recordDelivery($booking, $templateKey, $context);

        if (in_array($templateKey, ['cancellation_future_credit', 'cancellation_refund'], true)
            && $booking->status !== 'Cancelled') {
            $booking->update(['status' => 'Cancelled']);
        }

        return $context;
    }

    protected function recordDelivery(Booking $booking, string $templateKey, array $context): void
    {
        $details = $booking->details_json ?? [];
        $history = $details['email_history'] ?? [];

        $history[] = [
            'template_key' => $templateKey,
            'sent_at' => now()->toIso8601String(),
            'sent_to' => $booking->client?->email,
            'subject' => $context['subject'] ?? null,
        ];

        $details['email_history'] = $history;
        $booking->update(['details_json' => $details]);
    }
}
