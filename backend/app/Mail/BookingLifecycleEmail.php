<?php

namespace App\Mail;

use App\Domains\Booking\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingLifecycleEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Booking $booking,
        public array $template,
        public array $context
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->context['subject'] ?: ($this->template['subject'] ?? 'Booking update')
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking-lifecycle-email',
            with: [
                'booking' => $this->booking,
                'template' => $this->template,
                'context' => $this->context,
            ]
        );
    }
}
