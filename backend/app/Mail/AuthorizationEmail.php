<?php

namespace App\Mail;

use App\Models\PaymentAuth;
use Illuminate\Support\Collection;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AuthorizationEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public PaymentAuth $authorization,
        public string $approvalUrl
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking payment approval request'
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
            ]
        );
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

                if ($booking->client) {
                    $travellers->push([
                        'name' => trim(($booking->client->first_name ?? '') . ' ' . ($booking->client->middle_name ?? '') . ' ' . ($booking->client->last_name ?? '')),
                        'dob' => $booking->client->date_of_birth,
                    ]);
                }

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

        return rtrim(config('app.backend_url'), '/') . '/storage/' . ltrim($path, '/');
    }
}
