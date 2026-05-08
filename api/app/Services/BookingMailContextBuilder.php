<?php

namespace App\Services;

use App\Domains\Booking\Models\Booking;
use App\Domains\Booking\Models\Flight;
use App\Models\PaymentAuth;
use Illuminate\Support\Collection;

class BookingMailContextBuilder
{
    public function buildBookingTemplateContext(Booking $booking, array $template): array
    {
        $primaryFlight = $this->resolvePrimaryFlight(collect($booking->services ?? []));
        $hotelImages = $this->collectServiceImageUrls($booking, 'hotel');
        $carImages = $this->collectServiceImageUrls($booking, 'car');
        $cruiseImages = $this->collectServiceImageUrls($booking, 'cruise');
        $clientName = $this->resolveBookingClientName($booking);
        $travelDate = $booking->travel_date
            ? \Illuminate\Support\Carbon::parse($booking->travel_date)->format('M d, Y')
            : 'Not specified';
        $serviceSummary = $this->resolveServiceSummary(collect($booking->services ?? []));
        $flightImageUrl = $this->buildStorageUrl($primaryFlight?->ticket_image);
        $latestServiceChange = $booking->details_json['latest_service_change'] ?? null;
        $latestFlightChange = $booking->details_json['latest_flight_change'] ?? null;

        $replacements = [
            '{{client_name}}' => $clientName,
            '{{booking_reference}}' => $booking->booking_reference,
            '{{currency}}' => $booking->currency ?: 'USD',
            '{{total_amount}}' => number_format((float) $booking->total_amount, 2),
            '{{status}}' => $booking->status ?: 'Pending',
            '{{travel_date}}' => $travelDate,
            '{{agent_name}}' => $booking->agent?->name ?: 'CRM Team',
            '{{service_summary}}' => $serviceSummary,
            '{{pnr}}' => $primaryFlight?->pnr ?: '',
            '{{flight_image_url}}' => $flightImageUrl,
            '{{flight_change_type}}' => $latestFlightChange['change_type'] ?? '',
            '{{flight_change_summary}}' => $latestFlightChange['change_summary'] ?? '',
            '{{flight_change_charge}}' => number_format((float) ($latestFlightChange['additional_charge'] ?? 0), 2),
            '{{hotel_image_urls}}' => implode(', ', $hotelImages),
            '{{hotel_images_html}}' => $this->buildImageGalleryHtml($hotelImages, 'Hotel Pictures', 'Hotel Image'),
            '{{car_image_urls}}' => implode(', ', $carImages),
            '{{car_images_html}}' => $this->buildImageGalleryHtml($carImages, 'Rental Car Pictures', 'Car Image'),
            '{{cruise_image_urls}}' => implode(', ', $cruiseImages),
            '{{cruise_images_html}}' => $this->buildImageGalleryHtml($cruiseImages, 'Cruise Pictures', 'Cruise Image'),
        ];

        $replacements = array_merge($replacements, [
            '{{booking_summary_html}}' => $this->buildBookingSummaryHtml([
                'booking_reference' => $booking->booking_reference,
                'travel_date' => $travelDate,
                'service_summary' => $serviceSummary,
                'currency' => $booking->currency ?: 'USD',
                'total_amount' => number_format((float) $booking->total_amount, 2),
                'status' => $booking->status,
                'pnr' => $primaryFlight?->pnr ?: null,
            ]),
            '{{flight_image_html}}' => $this->buildFlightImageHtml($flightImageUrl),
            '{{flight_change_details_html}}' => $this->buildFlightChangeDetailsHtml(
                $latestFlightChange,
                $booking->currency ?: 'USD'
            ),
            '{{support_html}}' => $this->buildSupportHtml(),
        ]);

        $body = strtr($template['body'] ?? '', $replacements);
        $subject = strtr($template['subject'] ?? 'Booking update', $replacements);

        // Final pass: ensure all manually added images are absolute
        $processedBody = $this->processContentForAbsoluteUrls($body);

        if (!str_contains($processedBody, '<')) {
            $processedBody = nl2br(e($processedBody));
        }

        return [
            'subject' => $subject,
            'body' => $body,
            'body_html' => $processedBody,
            'client_name' => $clientName,
            'booking_reference' => $booking->booking_reference,
            'status' => $booking->status,
            'travel_date' => $travelDate,
            'service_summary' => $serviceSummary,
            'currency' => $booking->currency ?: 'USD',
            'total_amount' => number_format((float) $booking->total_amount, 2),
            'pnr' => $primaryFlight?->pnr ?: null,
            'flight_image_url' => $flightImageUrl ?: null,
            'hotel_image_urls' => $hotelImages,
            'car_image_urls' => $carImages,
            'cruise_image_urls' => $cruiseImages,
            'latest_service_change' => $latestServiceChange,
            'latest_flight_change' => $latestFlightChange,
        ];
    }

    public function buildAuthorizationReplacements(PaymentAuth $authorization): array
    {
        $bookings = $authorization->bookings ?? collect();
        $firstBooking = $bookings->first();
        $services = $bookings->flatMap(fn($booking) => $booking->services ?? []);
        $primaryFlight = $this->resolvePrimaryFlight($services);

        return [
            '{{client_name}}' => $this->resolveAuthorizationClientName($authorization),
            '{{booking_reference}}' => $bookings->pluck('booking_reference')->filter()->join(', '),
            '{{currency}}' => $authorization->currency,
            '{{total_amount}}' => number_format((float) $authorization->total_amount, 2),
            '{{status}}' => $authorization->status ?: 'Pending',
            '{{travel_date}}' => $firstBooking?->travel_date ? (string) $firstBooking->travel_date : '',
            '{{agent_name}}' => $firstBooking?->agent?->name ?: 'CRM Team',
            '{{service_summary}}' => $this->resolveServiceSummary($services),
            '{{pnr}}' => $primaryFlight?->pnr ?: '',
            '{{flight_image_url}}' => $this->buildStorageUrl($primaryFlight?->ticket_image),
            '{{approval_url}}' => '',
        ];
    }

    public function buildStorageUrl(?string $path): string
    {
        if (!filled($path)) {
            return '';
        }

        // Handle external URLs
        if (preg_match('/^https?:\/\//', $path)) {
            // If it's already a full URL that's NOT our localhost, return as is
            if (!str_contains($path, 'localhost') && !str_contains($path, '127.0.0.1')) {
                return $path;
            }
            // If it IS a local absolute URL, we extract the path to normalize it correctly below
            if (preg_match('/^https?:\/\/[^\/]+\/(.*)$/', $path, $matches)) {
                $path = $matches[1];
            }
        }

        if (str_starts_with($path, 'data:')) {
            return $path;
        }

        // Aggressive Normalization: Focusing on the actual asset folders
        // This handles cases like "core/uploads/tickets/..." or "storage/tickets/..."
        $cleanPath = ltrim($path, '/');
        
        // Find the beginning of our known asset categories to strip everything before it
        if (preg_match('#(?:tickets|hotels|car_images|cruise_images|flights|signatures|uploads)/(.+)$#i', $cleanPath, $matches)) {
            $normalizedPath = $matches[0];
            $normalizedPath = ltrim(preg_replace('#^/?uploads/#', '', $normalizedPath), '/');
        } else {
            $normalizedPath = ltrim(preg_replace('#^/?(storage|uploads)/#', '', $cleanPath), '/');
        }
        
        $normalizedPath = preg_replace('#/+#', '/', $normalizedPath); // collapse double slashes
        
        if (empty($normalizedPath)) return '';

        $baseUrl = config('app.url') ?: 'http://localhost';
        
        // Auto-detect host for local dev if URL is localhost
        if (str_contains($baseUrl, 'localhost') || str_contains($baseUrl, '127.0.0.1')) {
            if (request()) {
                $baseUrl = request()->getSchemeAndHttpHost();
            }
        }

        // Hostinger / Subfolder deployment logic:
        // 1. If baseUrl contains /api, we use /uploads/ because we'll rewrite it in .htaccess
        // 2. If it's a production URL but doesn't have /public/, we use /uploads/ as well
        // 3. Fallback to /public/uploads/ for local dev
        $uploadPrefix = '/public/uploads/';
        
        if (str_contains($baseUrl, '/api')) {
            $uploadPrefix = '/uploads/';
        } elseif (!str_contains($baseUrl, 'localhost') && !str_contains($baseUrl, '127.0.0.1')) {
            // In production, we assume our .htaccess maps /uploads/ to core/public/uploads/
            $uploadPrefix = '/uploads/';
        }

        return rtrim($baseUrl, '/') . $uploadPrefix . $normalizedPath;
    }


    protected function processContentForAbsoluteUrls(?string $html): string
    {
        if (empty($html))
            return '';

        return preg_replace_callback('/(<img[^>]+src=")([^">]+)(")/i', function ($matches) {
            $prefix = $matches[1];
            $url = $matches[2];
            $suffix = $matches[3];

            if (preg_match('/^https?:\/\//', $url) && !str_contains($url, 'localhost') && !str_contains($url, '127.0.0.1')) {
                if (!str_contains($url, '/public/uploads/')) {
                    return $matches[0];
                }
            }

            $absoluteUrl = $this->buildStorageUrl($url);
            return $prefix . e($absoluteUrl) . $suffix;
        }, $html);
    }

    protected function buildBookingSummaryHtml(array $context): string
    {
        $rows = [
            'Booking Reference' => $context['booking_reference'] ?? '',
            'Travel Date' => $context['travel_date'] ?? '',
            'Services' => $context['service_summary'] ?? '',
            'Amount' => trim(($context['currency'] ?? 'USD') . ' ' . ($context['total_amount'] ?? '0.00')),
            'Current Status' => $context['status'] ?? '',
        ];

        if (!empty($context['pnr'])) {
            $rows['PNR'] = $context['pnr'];
        }

        $html = '<div style="border:1px solid #e5e7eb;border-radius:16px;padding:18px 20px;background:#f9fafb;margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Booking Summary</h2><table role="presentation" style="width:100%;border-collapse:collapse;">';

        foreach ($rows as $label => $value) {
            $html .= '<tr><td style="padding:8px 0;color:#6b7280;">' . e($label) . '</td><td align="right" style="padding:8px 0;font-weight:700;">' . e($value) . '</td></tr>';
        }

        $html .= '</table></div>';
        return $html;
    }

    protected function buildFlightImageHtml(?string $flightImageUrl): string
    {
        if (!filled($flightImageUrl)) {
            return '';
        }
        return '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Flight Image</h2><img src="' . e($flightImageUrl) . '" alt="Flight Image" style="width:100%;border-radius:12px;border:1px solid #e5e7eb;display:block;"></div>';
    }

    protected function buildFlightChangeDetailsHtml(?array $latestFlightChange, string $currency): string
    {
        if (empty($latestFlightChange)) {
            return '';
        }

        $html = '<div style="border:1px solid #e5e7eb;border-radius:16px;padding:18px 20px;background:#f9fafb;margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">Flight Change Details</h2><table role="presentation" style="width:100%;border-collapse:collapse;">';
        $html .= '<tr><td style="padding:8px 0;color:#6b7280;">Change Type</td><td align="right" style="padding:8px 0;font-weight:700;">' . e($latestFlightChange['change_type'] ?? 'Flight Update') . '</td></tr>';
        $html .= '<tr><td style="padding:8px 0;color:#6b7280;">Additional Charge</td><td align="right" style="padding:8px 0;font-weight:700;">' . e($currency) . ' ' . number_format((float) ($latestFlightChange['additional_charge'] ?? 0), 2) . '</td></tr>';
        $html .= '</table>';

        if (!empty($latestFlightChange['change_summary'])) {
            $html .= '<div style="margin-top:14px;padding:14px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;"><div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Change Summary</div><div style="font-size:14px;line-height:1.7;color:#374151;">' . nl2br(e($latestFlightChange['change_summary'])) . '</div></div>';
        }

        if (!empty($latestFlightChange['changes'])) {
            $html .= '<div style="margin-top:14px;"><div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Tracked Changes</div>';
            foreach ($latestFlightChange['changes'] as $change) {
                $html .= '<div style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#374151;"><strong>' . e($change['label'] ?? $change['field'] ?? 'Change') . '</strong>: ' . e(($change['old'] ?? null) !== null && ($change['old'] ?? '') !== '' ? (string) $change['old'] : 'Empty') . ' → ' . e(($change['new'] ?? null) !== null && ($change['new'] ?? '') !== '' ? (string) $change['new'] : 'Empty') . '</div>';
            }
            $html .= '</div>';
        }

        $html .= '</div>';
        return $html;
    }

    protected function buildSupportHtml(): string
    {
        return '<div style="padding-top:18px;border-top:1px solid #e5e7eb;"><p style="margin:0 0 10px;font-size:13px;line-height:1.8;color:#4b5563;">If you need help with this booking, contact our support team.</p><p style="margin:0;font-size:13px;line-height:1.8;color:#4b5563;"><strong>Contact Us:</strong><br>Email: cs@reservation-supports.com<br>Phone: +1 (325) 349 9888</p></div>';
    }

    protected function collectServiceImageUrls(Booking $booking, string $serviceType): array
    {
        return collect($booking->services ?? [])
            ->filter(fn($service) => strtolower(class_basename($service->serviceable_type ?? '')) === $serviceType)
            ->flatMap(fn($service) => collect(data_get($service, 'details_json.images', [])))
            ->filter()
            ->map(fn($path) => $this->buildStorageUrl($path))
            ->filter()
            ->values()
            ->all();
    }

    protected function buildImageGalleryHtml(array $urls, string $title, string $altPrefix): string
    {
        if (empty($urls)) {
            return '';
        }

        $html = '<div style="margin-bottom:24px;"><h2 style="margin:0 0 14px;font-size:18px;">' . e($title) . '</h2>';
        foreach (array_values($urls) as $index => $url) {
            $html .= '<div style="margin-bottom:12px;"><img src="' . e($url) . '" alt="' . e($altPrefix . ' ' . ($index + 1)) . '" style="width:100%;border-radius:12px;border:1px solid #e5e7eb;display:block;"></div>';
        }
        $html .= '</div>';
        return $html;
    }

    protected function resolvePrimaryFlight(Collection $services): ?Flight
    {
        return $services
            ->map(fn($service) => $service->serviceable)
            ->first(fn($serviceable) => $serviceable instanceof Flight);
    }

    protected function resolveServiceSummary(Collection $services): string
    {
        return $services
            ->map(fn($service) => class_basename($service->serviceable_type ?? 'Service'))
            ->filter()
            ->unique()
            ->implode(', ') ?: 'Travel services';
    }

    protected function resolveBookingClientName(Booking $booking): string
    {
        return $booking->client?->name
            ?: trim(($booking->client?->first_name ?? '') . ' ' . ($booking->client?->last_name ?? ''))
            ?: 'Customer';
    }

    protected function resolveAuthorizationClientName(PaymentAuth $authorization): string
    {
        return $authorization->client->name
            ?? trim(($authorization->client->first_name ?? '') . ' ' . ($authorization->client->last_name ?? ''))
            ?: 'Customer';
    }
}
