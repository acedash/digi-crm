<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Approval</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e5e7eb;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#016040;">
                {{ $authorizationType === 'change_charge' ? 'Change Charge Authorization' : 'Payment Authorization' }}
            </p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">
                {{ $authorizationType === 'change_charge' ? 'Review your updated booking and approve the added charge' : 'Review your booking and approve payment' }}
            </h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
                Dear {{ $clientName }},
            </p>
            <div style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                {!! nl2br(e($templateBody)) !!}
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Authorization total</p>
                <p style="margin:0;font-size:30px;font-weight:800;color:#016040;">{{ $authorization->currency }} {{ number_format((float) $authorization->total_amount, 2) }}</p>
            </div>

            @if($embeddedTickets->isNotEmpty())
                <div style="margin-bottom:24px;">
                    <h2 style="margin:0 0 14px;font-size:18px;">Ticket / PNR Content</h2>
                    @foreach($embeddedTickets as $ticket)
                        @php
                            $embeddedSrc = null;
                            $ticketPath = !empty($ticket['path']) ? storage_path('app/public/' . ltrim($ticket['path'], '/')) : null;

                            if ($ticketPath && is_file($ticketPath) && isset($message)) {
                                $embeddedSrc = $message->embed($ticketPath);
                            }

                            $ticketImageSrc = $embeddedSrc ?: ($ticket['url'] ?? null);
                        @endphp
                        <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:14px;">
                            <div style="font-weight:700;margin-bottom:12px;">{{ $ticket['booking_reference'] }}</div>
                            @if($ticketImageSrc)
                                <img src="{{ $ticketImageSrc }}" alt="Ticket Image" style="width:100%;border-radius:12px;border:1px solid #e5e7eb;display:block;">
                            @else
                                <div style="padding:16px;border:1px dashed #d1d5db;border-radius:12px;color:#6b7280;font-size:13px;">
                                    Ticket image is attached in the booking record but could not be rendered in this email.
                                </div>
                            @endif
                        </div>
                    @endforeach
                </div>
            @endif

            <div style="margin-bottom:24px;">
                <h2 style="margin:0 0 14px;font-size:18px;">Traveller's Details</h2>
                <div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                    @foreach($travellers as $traveller)
                        <div style="display:flex;justify-content:space-between;gap:16px;padding:14px 16px;{{ !$loop->last ? 'border-bottom:1px solid #e5e7eb;' : '' }}">
                            <div style="font-weight:700;text-transform:uppercase;">{{ $traveller['name'] }}</div>
                            <div style="font-size:13px;color:#6b7280;">
                                {{ $traveller['dob'] ? \Illuminate\Support\Carbon::parse($traveller['dob'])->format('d M Y') : 'DOB not provided' }}
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>

            <div style="margin-bottom:24px;">
                <h2 style="margin:0 0 14px;font-size:18px;">Fare Breakup</h2>
                <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                    <thead>
                        <tr style="background:#f9fafb;">
                            <th align="left" style="padding:12px 16px;font-size:13px;border-bottom:1px solid #e5e7eb;">Price Details</th>
                            <th align="right" style="padding:12px 16px;font-size:13px;border-bottom:1px solid #e5e7eb;">Amount ({{ $authorization->currency }})</th>
                        </tr>
                    </thead>
                    <tbody>
                        @if(($fareBreakdown['change_charge'] ?? 0) > 0)
                            <tr>
                                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Additional change charge</td>
                                <td align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${{ number_format($fareBreakdown['change_charge'], 2) }}</td>
                            </tr>
                        @else
                            <tr>
                                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Base fare</td>
                                <td align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${{ number_format($fareBreakdown['base_fare'], 2) }}</td>
                            </tr>
                            <tr>
                                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Taxes &amp; fee</td>
                                <td align="right" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">${{ number_format($fareBreakdown['taxes_and_fee'], 2) }}</td>
                            </tr>
                        @endif
                        <tr style="background:#f9fafb;font-weight:700;">
                            <td style="padding:12px 16px;">Grand Total</td>
                            <td align="right" style="padding:12px 16px;">${{ number_format($fareBreakdown['grand_total'], 2) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            @if($changeEntries->isNotEmpty())
                <div style="margin-bottom:24px;">
                    <h2 style="margin:0 0 14px;font-size:18px;">Updated Booking Changes</h2>
                    <div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                        @foreach($changeEntries as $change)
                            <div style="padding:14px 16px;{{ !$loop->last ? 'border-bottom:1px solid #e5e7eb;' : '' }}">
                                <div style="font-weight:700;margin-bottom:6px;">
                                    {{ $change['service_type'] ?? 'Service' }} · {{ $change['change_type'] ?? 'Update' }}
                                </div>
                                @if(!empty($change['change_summary']))
                                    <div style="font-size:13px;line-height:1.6;color:#4b5563;margin-bottom:6px;">
                                        {{ $change['change_summary'] }}
                                    </div>
                                @endif
                                @if(($change['additional_charge'] ?? 0) > 0)
                                    <div style="font-size:13px;color:#016040;font-weight:700;">
                                        Additional Charge: {{ $authorization->currency }} {{ number_format((float) $change['additional_charge'], 2) }}
                                    </div>
                                @endif
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            @if($cardAllocations->isNotEmpty())
                <div style="margin-bottom:24px;">
                    <h2 style="margin:0 0 14px;font-size:18px;">Card Allocation</h2>
                    <div style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                        @foreach($cardAllocations as $allocation)
                            <div style="padding:14px 16px;{{ !$loop->last ? 'border-bottom:1px solid #e5e7eb;' : '' }}">
                                <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
                                    <div>
                                        <div style="font-weight:700;">{{ $allocation['holder_name'] ?? 'Card Holder' }}</div>
                                        <div style="font-size:13px;color:#6b7280;margin-top:4px;">{{ $allocation['card_label'] ?? 'Card on file' }}</div>
                                        @if(!empty($allocation['remarks']))
                                            <div style="font-size:13px;color:#4b5563;line-height:1.6;margin-top:6px;">{{ $allocation['remarks'] }}</div>
                                        @endif
                                    </div>
                                    <div style="font-weight:800;color:#016040;">
                                        {{ $authorization->currency }} {{ number_format((float) ($allocation['amount'] ?? 0), 2) }}
                                    </div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            <div style="margin-bottom:24px;padding:20px;border:1px solid #e5e7eb;border-radius:16px;background:#fcfcfd;">
                <h2 style="margin:0 0 12px;font-size:18px;">Declaration</h2>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#374151;">
                    @if($authorizationType === 'change_charge')
                        I, <strong>{{ $clientName }}</strong>, hereby authorise <strong>{{ $supplierLabel }}</strong> to charge the <strong>additional updated amount</strong> of <strong>{{ $authorization->currency }} ${{ number_format((float) $authorization->total_amount, 2) }}</strong> using the card allocation listed above.
                    @else
                        I, <strong>{{ $clientName }}</strong>, hereby authorise <strong>{{ $supplierLabel }}</strong> to charge my card ending in <strong>{{ $maskedCard }}</strong> with the total amount of <strong>{{ $authorization->currency }} ${{ number_format((float) $authorization->total_amount, 2) }}</strong>.
                    @endif
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                    By clicking the approval button below, I confirm that I have reviewed the above information and authorised the payment as stated.
                </p>
            </div>

            <div style="margin-bottom:24px;">
                <h2 style="margin:0 0 14px;font-size:18px;">Terms and Conditions</h2>
                <div style="font-size:13px;line-height:1.8;color:#4b5563;">
                    <p style="margin:0 0 10px;"><strong>Booking Acknowledgment</strong><br>By confirming your booking, you agree that you have read, understood, and accepted these terms.</p>
                    <p style="margin:0 0 10px;"><strong>Reconfirmation</strong><br>Cruise bookings and special requests must be reconfirmed with our agency at least 72 hours before sailing and remain subject to availability.</p>
                    <p style="margin:0 0 10px;"><strong>Changes &amp; Cancellations</strong><br>Bookings are non-transferable and non-refundable unless permitted by supplier fare rules. Refunds, if applicable, remain subject to supplier penalties and agency service fees.</p>
                    <p style="margin:0 0 10px;"><strong>Travel Documents</strong><br>You are responsible for valid passports, visas, and any required travel documents. We are not liable for denied boarding or entry.</p>
                    <p style="margin:0 0 10px;"><strong>Refunds and Disputes</strong><br>Refunds are issued only after supplier confirmation. Please contact us directly for any dispute or refund query instead of filing a bank dispute first.</p>
                    <p style="margin:0 0 10px;"><strong>Refund Processing Time</strong><br>Refunds may take up to 12-16 weeks depending on supplier processing timelines.</p>
                    <p style="margin:0;"><strong>Policy Changes</strong><br>Supplier policies may change without notice. Please confirm the latest rules with our support team.</p>
                </div>
            </div>

            <div style="margin-bottom:24px;padding:20px 0 4px;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#374151;">
                    After reviewing the itinerary, traveller details, fare breakup, declaration, and terms above, please use the button below to record your authorization.
                </p>
                <a href="{{ $approvalUrl }}" style="display:inline-block;padding:14px 22px;background:#016040;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">Review and Approve</a>
            </div>

            <div style="padding-top:18px;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 12px;font-size:12px;line-height:1.7;color:#6b7280;">
                    Your approval records the timestamp, IP address, and consent in the CRM for compliance.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.8;color:#4b5563;">
                    <strong>Contact Us:</strong><br>
                    Email: cs@reservation-supports.com<br>
                    Phone: +1 (325) 349 9888
                </p>
            </div>
        </div>
    </div>
</body>
</html>
