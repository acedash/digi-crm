<?php

namespace App\Mail;

use App\Models\PaymentAuth;
use App\Services\BookingMailContextBuilder;
use App\Services\SystemSettingService;
use Illuminate\Support\Collection;
use Illuminate\Support\HtmlString;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Part\DataPart;

class AuthorizationEmail extends Mailable
{
    use Queueable, SerializesModels;

    protected ?array $authorizationReplacements = null;
    protected array $inlineImages = [];

    public function __construct(
        public PaymentAuth $authorization,
        public string $approvalUrl
    ) {
        $this->withSymfonyMessage(function (Email $message) {
            foreach ($this->inlineImages as $contentId => $path) {
                $part = DataPart::fromPath($path)->asInline();
                $part->setContentId($contentId);
                $message->addPart($part);
            }
        });
    }

    public function envelope(): Envelope
    {
        $template = app(SystemSettingService::class)->getMailTemplate('authorization');

        return new Envelope(
            subject: $template['subject'] ?: 'Booking payment approval request'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.authorization-email',
            with: [
                'authorizationType' => $this->getAuthorizationType(),
                'emailTitle' => $this->envelope()->subject,
                'templateBodyHtml' => $this->getTemplateBodyHtml(),
            ]
        );
    }

    protected function getTemplateBodyHtml(): HtmlString
    {
        $template = app(SystemSettingService::class)->getMailTemplate('authorization');
        $body = $template['body']
            ?? '<p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#016040;">{{authorization_type_label}}</p><h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">Review your booking and approve payment</h1><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">Dear {{client_name}},</p><p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">Please review the booking details below and approve if everything is correct.</p>{{ticket_images_html}}{{hotel_images_html}}{{car_images_html}}{{cruise_images_html}}{{travellers_html}}{{fare_breakdown_html}}{{change_entries_html}}{{card_allocations_html}}{{declaration_html}}{{terms_html}}{{approval_button_html}}{{support_html}}';

        $resolvedBody = $this->renderTemplateBody($body, $this->getAuthorizationReplacements($body));

        return new HtmlString($resolvedBody);
    }

    protected function renderTemplateBody(string $body, array $replacements): string
    {
        $normalizedBody = $this->normalizeTemplateBody($body, array_keys($replacements));

        // If the author wrote plain text plus placeholders, preserve line breaks
        // without escaping the injected HTML blocks.
        if (!$this->containsAuthorHtml($normalizedBody)) {
            $placeholderTokens = [];
            $tokenizedBody = $normalizedBody;

            foreach ($replacements as $placeholder => $replacement) {
                $token = '__TPL_' . md5($placeholder) . '__';
                $placeholderTokens[$token] = $replacement;
                $tokenizedBody = str_replace($placeholder, $token, $tokenizedBody);
            }

            $renderedBody = nl2br(e($tokenizedBody));

            foreach ($placeholderTokens as $token => $replacement) {
                $renderedBody = str_replace($token, $replacement, $renderedBody);
            }

            return $renderedBody;
        }

        return strtr($normalizedBody, $replacements);
    }

    protected function normalizeTemplateBody(string $body, array $placeholders): string
    {
        foreach ($placeholders as $placeholder) {
            $name = trim($placeholder, '{}');
            $patterns = [
                '/\{{1,}\s*' . preg_quote($name, '/') . '\s*\}{1,}/i',
                '/\{{1,}\s*' . preg_quote($name, '/') . '\s*$/im',
                '/^\s*' . preg_quote($name, '/') . '\s*\}{1,}/im',
            ];

            foreach ($patterns as $pattern) {
                $body = preg_replace($pattern, $placeholder, $body);
            }
        }

        return $body;
    }

    protected function containsAuthorHtml(string $body): bool
    {
        return (bool) preg_match('/<\s*(p|div|table|tr|td|img|h[1-6]|ul|ol|li|a|strong|em|br)\b/i', $body);
    }

    protected function getClientName(): string
    {
        return $this->authorization->client->name
            ?? trim(($this->authorization->client->first_name ?? '') . ' ' . ($this->authorization->client->last_name ?? ''))
            ?: 'Customer';
    }

    protected function getTravellers(): Collection
    {
        if (!empty($this->authorization->consent_snapshot['travellers'])) {
            return collect($this->authorization->consent_snapshot['travellers'])
                ->map(fn ($traveller) => [
                    'name' => $traveller['name'] ?? '',
                    'dob' => $traveller['date_of_birth'] ?? null,
                ]);
        }

        return $this->authorization->bookings
            ->flatMap(function ($booking) {
                $travellers = collect();

                foreach ($booking->passengers ?? [] as $passenger) {
                    $travellers->push([
                        'name' => trim(($passenger->first_name ?? '') . ' ' . ($passenger->middle_name ?? '') . ' ' . ($passenger->last_name ?? '')),
                        'dob' => $passenger->date_of_birth,
                    ]);
                }

                return $travellers;
            })
            ->filter(fn ($traveller) => filled($traveller['name']))
            ->unique(fn ($traveller) => strtolower($traveller['name']) . '|' . ($traveller['dob'] ?? ''))
            ->values();
    }

    protected function getFareBreakdown(): array
    {
        if (!empty($this->authorization->consent_snapshot['fare_breakdown'])) {
            return $this->authorization->consent_snapshot['fare_breakdown'];
        }

        $baseFare = (float) $this->authorization->bookings
            ->flatMap(fn ($booking) => $booking->services ?? [])
            ->sum(fn ($service) => (float) ($service->cost_price ?? 0));

        $grandTotal = (float) $this->authorization->total_amount;

        if ($baseFare <= 0 || $baseFare > $grandTotal) {
            $baseFare = $grandTotal;
        }

        return [
            'base_fare' => $baseFare,
            'taxes_and_fee' => max($grandTotal - $baseFare, 0),
            'grand_total' => $grandTotal,
        ];
    }

    protected function getMaskedCard(): string
    {
        if ($this->authorization->masked_card) {
            return $this->authorization->masked_card;
        }

        $cardNumber = collect($this->authorization->bookings)
            ->flatMap(function ($booking) {
                return collect(data_get($booking, 'details_json.payment_cards', []));
            })
            ->pluck('number')
            ->filter()
            ->first();

        if (!$cardNumber) {
            return 'XXXXXX0000';
        }

        $cleanNumber = preg_replace('/\D+/', '', $cardNumber);

        return 'XXXXXX' . substr($cleanNumber, -4);
    }

    protected function getSupplierLabel(): string
    {
        if (!empty($this->authorization->consent_snapshot['supplier_label'])) {
            return $this->authorization->consent_snapshot['supplier_label'];
        }

        $labels = $this->authorization->bookings
            ->flatMap(fn ($booking) => $booking->services ?? [])
            ->map(function ($service) {
                $type = strtolower(class_basename($service->serviceable_type ?? ''));

                return match ($type) {
                    'flight' => 'Airline',
                    'hotel' => 'Hotel',
                    'car' => 'Car Rental',
                    'cruise' => 'Cruise',
                    default => 'Travel Supplier',
                };
            })
            ->unique()
            ->values();

        if ($labels->isEmpty()) {
            return 'Digicircle';
        }

        return $labels->implode(' / ') . ' / Digicircle';
    }

    protected function getAuthorizationType(): string
    {
        return $this->authorization->consent_snapshot['authorization_type']
            ?? $this->authorization->metadata['authorization_type']
            ?? 'initial';
    }

    protected function getCardAllocations(): Collection
    {
        return collect($this->authorization->consent_snapshot['card_allocations'] ?? $this->authorization->metadata['card_allocations'] ?? []);
    }

    protected function getChangeEntries(): Collection
    {
        return collect($this->authorization->consent_snapshot['change_entries'] ?? $this->authorization->metadata['change_entries'] ?? []);
    }

    protected function getEmbeddedTickets(): Collection
    {
        if (!empty($this->authorization->consent_snapshot['ticket_images'])) {
            return collect($this->authorization->consent_snapshot['ticket_images'])
                ->map(function ($ticket, $index) {
                    $path = $ticket['path'] ?? null;
                    $resolvedUrl = $this->resolveTicketUrl($path, $ticket['url'] ?? null);

                    return [
                        'booking_reference' => $ticket['booking_reference'] ?? '',
                        'segment_label' => $ticket['segment_label'] ?? null,
                        'path' => $path,
                        'url' => $resolvedUrl,
                        'src' => $this->resolveImageSource($path, $resolvedUrl, 'ticket-' . $index),
                    ];
                })
                ->filter(fn ($ticket) => filled($ticket['src']))
                ->values();
        }

        return $this->authorization->bookings
            ->flatMap(function ($booking) {
                return collect($booking->services ?? [])
                    ->filter(function ($service) {
                        return strtolower(class_basename($service->serviceable_type ?? '')) === 'flight'
                            && filled(data_get($service, 'serviceable.ticket_image'));
                    })
                    ->map(function ($service) use ($booking) {
                        $resolvedUrl = $this->resolveTicketUrl($service->serviceable->ticket_image);

                        return [
                            'booking_reference' => $booking->booking_reference,
                            'path' => $service->serviceable->ticket_image,
                            'url' => $resolvedUrl,
                            'src' => $this->resolveImageSource($service->serviceable->ticket_image, $resolvedUrl, 'legacy-ticket-' . $booking->id),
                        ];
                    });
            })
            ->filter(fn ($ticket) => filled($ticket['src']))
            ->values();
    }

    protected function resolveTicketUrl(?string $path, ?string $fallbackUrl = null): ?string
    {
        if (filled($fallbackUrl) && !str_contains($fallbackUrl, 'localhost/storage')) {
            return $fallbackUrl;
        }

        if (!filled($path)) {
            return $fallbackUrl;
        }

        return app(BookingMailContextBuilder::class)->buildStorageUrl($path);
    }

    protected function getSnapshotImages(string $snapshotKey, string $cidPrefix): Collection
    {
        return collect($this->authorization->consent_snapshot[$snapshotKey] ?? [])
            ->map(function ($image, $index) use ($cidPrefix) {
                $path = $image['path'] ?? null;
                $resolvedUrl = $this->resolveTicketUrl($path, $image['url'] ?? null);

                return [
                    'booking_reference' => $image['booking_reference'] ?? '',
                    'path' => $path,
                    'url' => $resolvedUrl,
                    'src' => $this->resolveImageSource($path, $resolvedUrl, $cidPrefix . '-' . $index),
                ];
            })
            ->filter(fn ($image) => filled($image['src']))
            ->values();
    }

    protected function resolveImageSource(?string $path, ?string $resolvedUrl, string $contentId): ?string
    {
        if (filled($resolvedUrl) && $this->isPublicEmailImageUrl($resolvedUrl)) {
            return $resolvedUrl;
        }

        if (filled($path) && !str_starts_with($path, 'data:')) {
            $absolutePath = storage_path('app/public/' . ltrim(preg_replace('#^/?storage/#', '', $path), '/'));

            if (is_file($absolutePath)) {
                $normalizedContentId = str_contains($contentId, '@')
                    ? $contentId
                    : $contentId . '@travelcrm.local';
                $this->inlineImages[$normalizedContentId] = $absolutePath;

                return 'cid:' . $normalizedContentId;
            }
        }

        return $resolvedUrl;
    }

    protected function isPublicEmailImageUrl(string $url): bool
    {
        if (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
            return false;
        }

        $host = strtolower(parse_url($url, PHP_URL_HOST) ?: '');
        if ($host === '' || in_array($host, ['localhost', '127.0.0.1', '::1'], true) || str_ends_with($host, '.local')) {
            return false;
        }

        return true;
    }

    protected function getAuthorizationReplacements(?string $templateBody = null): array
    {
        if ($this->authorizationReplacements !== null) {
            return $this->authorizationReplacements;
        }

        $body = $templateBody;
        if ($body === null) {
            $template = app(SystemSettingService::class)->getMailTemplate('authorization');
            $body = $template['body'] ?? '';
        }

        $baseReplacements = array_merge(
            app(BookingMailContextBuilder::class)->buildAuthorizationReplacements($this->authorization),
            [
                '{{approval_url}}' => $this->approvalUrl,
                '{{masked_card}}' => $this->getMaskedCard(),
                '{{supplier_label}}' => $this->getSupplierLabel(),
                '{{authorization_type_label}}' => $this->getAuthorizationType() === 'change_charge'
                    ? 'Change Charge Authorization'
                    : 'Payment Authorization',
            ]
        );

        $optionalBuilders = [
            '{{ticket_images_html}}' => fn () => $this->buildTicketImagesHtml(),
            '{{hotel_images_html}}' => fn () => $this->buildServiceImagesHtml('hotel_images', 'Hotel Pictures', 'hotel'),
            '{{car_images_html}}' => fn () => $this->buildServiceImagesHtml('car_images', 'Rental Car Pictures', 'car'),
            '{{cruise_images_html}}' => fn () => $this->buildServiceImagesHtml('cruise_images', 'Cruise Pictures', 'cruise'),
            '{{travellers_html}}' => fn () => $this->buildTravellersHtml(),
            '{{fare_breakdown_html}}' => fn () => $this->buildFareBreakdownHtml(),
            '{{change_entries_html}}' => fn () => $this->buildChangeEntriesHtml(),
            '{{card_allocations_html}}' => fn () => $this->buildCardAllocationsHtml(),
            '{{declaration_html}}' => fn () => $this->buildDeclarationHtml(),
            '{{terms_html}}' => fn () => $this->buildTermsHtml(),
            '{{approval_button_html}}' => fn () => $this->buildApprovalButtonHtml(),
            '{{support_html}}' => fn () => $this->buildSupportHtml(),
            '{{signature_html}}' => fn () => $this->buildSignatureHtml(),
        ];

        $normalizedBody = $this->normalizeTemplateBody($body, array_merge(array_keys($baseReplacements), array_keys($optionalBuilders)));
        $optionalReplacements = [];

        foreach ($optionalBuilders as $placeholder => $builder) {
            $optionalReplacements[$placeholder] = str_contains($normalizedBody, $placeholder)
                ? $builder()
                : '';
        }

        $this->authorizationReplacements = array_merge($baseReplacements, $optionalReplacements);

        return $this->authorizationReplacements;
    }

    protected function buildTicketImagesHtml(): string
    {
        $tickets = $this->getEmbeddedTickets();
        if ($tickets->isEmpty()) {
            return '';
        }

        $html = '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Ticket / PNR Content</h2>';
        foreach ($tickets as $ticket) {
            $ticketSrc = $ticket['src'] ?? null;
            if (!$ticketSrc) {
                continue;
            }

            $html .= '<div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:14px;">';
            $html .= '<div style="font-weight:700;margin-bottom:12px;">' . e($ticket['booking_reference'] ?? '') . '</div>';
            if (!empty($ticket['segment_label'])) {
                $html .= '<div style="font-size:12px;color:#6b7280;margin-bottom:12px;">' . e($ticket['segment_label']) . '</div>';
            }
            $html .= '<img src="' . e($ticketSrc) . '" alt="Ticket Image" style="width:100%;border-radius:12px;border:1px solid #e5e7eb;display:block;">';
            $html .= '</div>';
        }
        $html .= '</div>';

        return $html;
    }

    protected function buildServiceImagesHtml(string $snapshotKey, string $title, string $cidPrefix): string
    {
        $images = $this->getSnapshotImages($snapshotKey, $cidPrefix);

        if ($images->isEmpty()) {
            return '';
        }

        $html = '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">' . e($title) . '</h2>';
        foreach ($images as $image) {
            $src = $image['src'] ?? null;
            if (!$src) {
                continue;
            }

            $html .= '<div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:14px;">';
            $html .= '<div style="font-weight:700;margin-bottom:12px;">' . e($image['booking_reference'] ?? '') . '</div>';
            $html .= '<img src="' . e($src) . '" alt="' . e($title) . '" style="width:100%;border-radius:12px;border:1px solid #e5e7eb;display:block;">';
            $html .= '</div>';
        }
        $html .= '</div>';

        return $html;
    }

    protected function buildTravellersHtml(): string
    {
        $travellers = $this->getTravellers();
        if ($travellers->isEmpty()) {
            return '';
        }

        $html = '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Traveller\'s Details</h2><div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">';
        foreach ($travellers as $traveller) {
            $dob = !empty($traveller['dob']) ? \Illuminate\Support\Carbon::parse($traveller['dob'])->format('d M Y') : 'DOB not provided';
            $html .= '<div style="display:flex;justify-content:space-between;gap:16px;padding:14px 16px;border-bottom:1px solid #e5e7eb;">';
            $html .= '<div style="font-weight:700;text-transform:uppercase;">' . e($traveller['name'] ?? '') . '</div>';
            $html .= '<div style="font-size:13px;color:#6b7280;">' . e($dob) . '</div>';
            $html .= '</div>';
        }
        $html .= '</div></div>';

        return $html;
    }

    protected function buildFareBreakdownHtml(): string
    {
        $fareBreakdown = $this->getFareBreakdown();
        $currency = e($this->authorization->currency);

        $html = '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Fare Breakup</h2>';
        $html .= '<table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;"><thead><tr style="background:#f9fafb;"><th align="left" style="padding:12px 16px;font-size:13px;border-bottom:1px solid #e5e7eb;">Price Details</th><th align="right" style="padding:12px 16px;font-size:13px;border-bottom:1px solid #e5e7eb;">Amount (' . $currency . ')</th></tr></thead><tbody>';

        if (($fareBreakdown['change_charge'] ?? 0) > 0) {
            $html .= '<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Additional change charge</td><td align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">$' . number_format((float) $fareBreakdown['change_charge'], 2) . '</td></tr>';
        } else {
            $html .= '<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Base fare</td><td align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">$' . number_format((float) ($fareBreakdown['base_fare'] ?? 0), 2) . '</td></tr>';
            $html .= '<tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Taxes &amp; fee</td><td align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">$' . number_format((float) ($fareBreakdown['taxes_and_fee'] ?? 0), 2) . '</td></tr>';
        }

        $html .= '<tr style="background:#f9fafb;font-weight:700;"><td style="padding:12px 16px;">Grand Total</td><td align="right" style="padding:12px 16px;">$' . number_format((float) ($fareBreakdown['grand_total'] ?? 0), 2) . '</td></tr>';
        $html .= '</tbody></table></div>';

        return $html;
    }

    protected function buildChangeEntriesHtml(): string
    {
        $entries = $this->getChangeEntries();
        if ($entries->isEmpty()) {
            return '';
        }

        $html = '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Updated Booking Changes</h2><div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">';
        foreach ($entries as $change) {
            $html .= '<div style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">';
            $html .= '<div style="font-weight:700;margin-bottom:6px;">' . e(($change['service_type'] ?? 'Service') . ' · ' . ($change['change_type'] ?? 'Update')) . '</div>';
            if (!empty($change['change_summary'])) {
                $html .= '<div style="font-size:13px;line-height:1.6;color:#4b5563;margin-bottom:6px;">' . nl2br(e($change['change_summary'])) . '</div>';
            }
            if (($change['additional_charge'] ?? 0) > 0) {
                $html .= '<div style="font-size:13px;color:#016040;font-weight:700;">Additional Charge: ' . e($this->authorization->currency) . ' ' . number_format((float) $change['additional_charge'], 2) . '</div>';
            }
            $html .= '</div>';
        }
        $html .= '</div></div>';

        return $html;
    }

    protected function buildCardAllocationsHtml(): string
    {
        $allocations = $this->getCardAllocations();
        if ($allocations->isEmpty()) {
            return '';
        }

        $html = '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Card Allocation</h2><div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">';
        foreach ($allocations as $allocation) {
            $html .= '<div style="padding:14px 16px;border-bottom:1px solid #e5e7eb;">';
            $html .= '<div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;"><div>';
            $html .= '<div style="font-weight:700;">' . e($allocation['holder_name'] ?? 'Card Holder') . '</div>';
            $html .= '<div style="font-size:13px;color:#6b7280;margin-top:4px;">' . e($allocation['card_label'] ?? 'Card on file') . '</div>';
            if (!empty($allocation['remarks'])) {
                $html .= '<div style="font-size:13px;color:#4b5563;line-height:1.6;margin-top:6px;">' . nl2br(e($allocation['remarks'])) . '</div>';
            }
            $html .= '</div><div style="font-weight:800;color:#016040;">' . e($this->authorization->currency) . ' ' . number_format((float) ($allocation['amount'] ?? 0), 2) . '</div></div></div>';
        }
        $html .= '</div></div>';

        return $html;
    }

    protected function buildDeclarationHtml(): string
    {
        $clientName = e($this->getClientName());
        $supplierLabel = e($this->getSupplierLabel());
        $currency = e($this->authorization->currency);
        $amount = number_format((float) $this->authorization->total_amount, 2);
        $body = $this->getAuthorizationType() === 'change_charge'
            ? "I, <strong>{$clientName}</strong>, hereby authorise <strong>{$supplierLabel}</strong> to charge the <strong>additional updated amount</strong> of <strong>{$currency} \${$amount}</strong> using the card allocation listed above."
            : "I, <strong>{$clientName}</strong>, hereby authorise <strong>{$supplierLabel}</strong> to charge my card ending in <strong>" . e($this->getMaskedCard()) . "</strong> with the total amount of <strong>{$currency} \${$amount}</strong>.";

        return '<div style="margin-bottom:24px;padding:20px;border:1px solid #e5e7eb;border-radius:16px;background:#fcfcfd;"><h2 style="margin:0 0 12px;font-size:18px;">Declaration</h2><p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#374151;">' . $body . '</p><p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">By clicking the approval button below, I confirm that I have reviewed the above information and authorised the payment as stated.</p></div>';
    }

    protected function buildTermsHtml(): string
    {
        $template = app(SystemSettingService::class)->getMailTemplate('authorization');
        $termsContent = (string) ($template['terms_content'] ?? '');

        if ($termsContent === '') {
            return '';
        }

        if (!str_contains($termsContent, '<')) {
            $termsContent = nl2br(e($termsContent));
        }

        return '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Terms and Conditions</h2><div style="font-size:13px;line-height:1.8;color:#4b5563;">' . $termsContent . '</div></div>';
    }

    protected function buildApprovalButtonHtml(): string
    {
        return '<div style="margin-bottom:24px;padding:20px 0 4px;border-top:1px solid #e5e7eb;"><p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#374151;">After reviewing the itinerary, traveller details, fare breakup, declaration, and terms above, please use the button below to record your authorization.</p><a href="' . e($this->approvalUrl) . '" style="display:inline-block;padding:14px 22px;background:#016040;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">Review and Approve</a></div>';
    }

    protected function buildSupportHtml(): string
    {
        return '<div style="padding-top:18px;border-top:1px solid #e5e7eb;"><p style="margin:0 0 12px;font-size:12px;line-height:1.7;color:#6b7280;">Your approval records the timestamp, IP address, and consent in the CRM for compliance.</p><p style="margin:0;font-size:13px;line-height:1.8;color:#4b5563;"><strong>Contact Us:</strong><br>Email: cs@reservation-supports.com<br>Phone: +1 (325) 349 9888</p></div>';
    }

    protected function buildSignatureHtml(): string
    {
        if (!$this->authorization->digital_signature) {
            return '';
        }

        return '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Digital Signature</h2><img src="' . e($this->authorization->digital_signature) . '" alt="Digital Signature" style="width:100%;border-radius:16px;border:1px solid #e5e7eb;background:#ffffff;"></div>';
    }
}
