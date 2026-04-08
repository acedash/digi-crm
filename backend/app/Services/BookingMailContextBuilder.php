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
        ];

        return [
            'subject' => strtr($template['subject'] ?? 'Booking update', $replacements),
            'body' => strtr($template['body'] ?? '', $replacements),
            'client_name' => $clientName,
            'booking_reference' => $booking->booking_reference,
            'status' => $booking->status,
            'travel_date' => $travelDate,
            'service_summary' => $serviceSummary,
            'currency' => $booking->currency ?: 'USD',
            'total_amount' => number_format((float) $booking->total_amount, 2),
            'pnr' => $primaryFlight?->pnr ?: null,
            'flight_image_url' => $flightImageUrl ?: null,
            'latest_service_change' => $latestServiceChange,
            'latest_flight_change' => $latestFlightChange,
        ];
    }

    public function buildAuthorizationReplacements(PaymentAuth $authorization): array
    {
        $bookings = $authorization->bookings ?? collect();
        $firstBooking = $bookings->first();
        $services = $bookings->flatMap(fn ($booking) => $booking->services ?? []);
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
        ];
    }

    public function buildStorageUrl(?string $path): string
    {
        if (!filled($path)) {
            return '';
        }

        return rtrim(config('app.backend_url'), '/') . '/storage/' . ltrim($path, '/');
    }

    protected function resolvePrimaryFlight(Collection $services): ?Flight
    {
        return $services
            ->map(fn ($service) => $service->serviceable)
            ->first(fn ($serviceable) => $serviceable instanceof Flight);
    }

    protected function resolveServiceSummary(Collection $services): string
    {
        return $services
            ->map(fn ($service) => class_basename($service->serviceable_type ?? 'Service'))
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
