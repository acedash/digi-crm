<?php

namespace App\Mail;

use App\Models\PaymentAuth;
use App\Services\BookingMailContextBuilder;
use App\Services\SystemSettingService;
use Illuminate\Support\Collection;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AuthorizationEmail extends Mailable
{
    use Queueable, SerializesModels;

    protected ?array $authorizationReplacements = null;

    public function __construct(
        public PaymentAuth $authorization,
        public string $approvalUrl
    ) {
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
                'clientName' => $this->getClientName(),
                'travellers' => $this->getTravellers(),
                'fareBreakdown' => $this->getFareBreakdown(),
                'maskedCard' => $this->getMaskedCard(),
                'supplierLabel' => $this->getSupplierLabel(),
                'embeddedTickets' => $this->getEmbeddedTickets(),
                'authorizationType' => $this->getAuthorizationType(),
                'cardAllocations' => $this->getCardAllocations(),
                'changeEntries' => $this->getChangeEntries(),
                'templateBody' => $this->getTemplateBody(),
            ]
        );
    }

    protected function getTemplateBody(): string
    {
        $template = app(SystemSettingService::class)->getMailTemplate('authorization');
        $body = $template['body']
            ?? "We hope this message finds you well. Please review the itinerary, traveller information, fare details, and authorization declaration below. Once confirmed, use the approval button at the bottom to securely record your consent.";

        return strtr($body, $this->getAuthorizationReplacements());
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
                ->map(function ($ticket) {
                    $path = $ticket['path'] ?? null;

                    return [
                        'booking_reference' => $ticket['booking_reference'] ?? '',
                        'path' => $path,
                        'url' => $this->resolveTicketUrl($path, $ticket['url'] ?? null),
                    ];
                })
                ->filter(fn ($ticket) => filled($ticket['path']) || filled($ticket['url']))
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
                        $path = storage_path('app/public/' . $service->serviceable->ticket_image);

                        if (!is_file($path)) {
                            return null;
                        }

                        return [
                            'booking_reference' => $booking->booking_reference,
                            'path' => $service->serviceable->ticket_image,
                            'url' => $this->resolveTicketUrl($service->serviceable->ticket_image),
                        ];
                    });
            })
            ->filter()
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

    protected function getAuthorizationReplacements(): array
    {
        if ($this->authorizationReplacements !== null) {
            return $this->authorizationReplacements;
        }

        $this->authorizationReplacements = app(BookingMailContextBuilder::class)
            ->buildAuthorizationReplacements($this->authorization);

        return $this->authorizationReplacements;
    }
}
