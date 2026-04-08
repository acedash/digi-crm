<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $context['subject'] }}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e5e7eb;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#016040;">
                {{ $template['name'] ?? 'Booking Update' }}
            </p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">{{ $context['subject'] }}</h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">Dear {{ $context['client_name'] }},</p>

            <div style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                {!! nl2br(e($context['body'])) !!}
            </div>

            <div style="border:1px solid #e5e7eb;border-radius:16px;padding:18px 20px;background:#f9fafb;margin-bottom:24px;">
                <h2 style="margin:0 0 14px;font-size:18px;">Booking Summary</h2>
                <table role="presentation" style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:8px 0;color:#6b7280;">Booking Reference</td>
                        <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['booking_reference'] }}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;color:#6b7280;">Travel Date</td>
                        <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['travel_date'] }}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;color:#6b7280;">Services</td>
                        <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['service_summary'] }}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;color:#6b7280;">Amount</td>
                        <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['currency'] }} {{ $context['total_amount'] }}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;color:#6b7280;">Current Status</td>
                        <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['status'] }}</td>
                    </tr>
                    @if(!empty($context['pnr']))
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;">PNR</td>
                            <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['pnr'] }}</td>
                        </tr>
                    @endif
                </table>
            </div>

            @if(!empty($context['flight_image_url']))
                <div style="margin-bottom:24px;">
                    <h2 style="margin:0 0 14px;font-size:18px;">Flight Image</h2>
                    <img src="{{ $context['flight_image_url'] }}" alt="Flight Image" style="width:100%;border-radius:12px;border:1px solid #e5e7eb;display:block;">
                </div>
            @endif

            @if(($template['key'] ?? null) === 'flight_change' && !empty($context['latest_flight_change']))
                <div style="border:1px solid #e5e7eb;border-radius:16px;padding:18px 20px;background:#f9fafb;margin-bottom:24px;">
                    <h2 style="margin:0 0 14px;font-size:18px;">Flight Change Details</h2>
                    <table role="presentation" style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;">Change Type</td>
                            <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['latest_flight_change']['change_type'] ?? 'Flight Update' }}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;">Additional Charge</td>
                            <td align="right" style="padding:8px 0;font-weight:700;">{{ $context['currency'] }} {{ number_format((float) ($context['latest_flight_change']['additional_charge'] ?? 0), 2) }}</td>
                        </tr>
                    </table>

                    @if(!empty($context['latest_flight_change']['change_summary']))
                        <div style="margin-top:14px;padding:14px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;">
                            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">
                                Change Summary
                            </div>
                            <div style="font-size:14px;line-height:1.7;color:#374151;">
                                {{ $context['latest_flight_change']['change_summary'] }}
                            </div>
                        </div>
                    @endif

                    @if(!empty($context['latest_flight_change']['changes']))
                        <div style="margin-top:14px;">
                            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">
                                Tracked Changes
                            </div>
                            @foreach($context['latest_flight_change']['changes'] as $change)
                                <div style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.6;color:#374151;">
                                    <strong>{{ $change['label'] ?? $change['field'] }}</strong>:
                                    {{ $change['old'] !== null && $change['old'] !== '' ? $change['old'] : 'Empty' }}
                                    →
                                    {{ $change['new'] !== null && $change['new'] !== '' ? $change['new'] : 'Empty' }}
                                </div>
                            @endforeach
                        </div>
                    @endif
                </div>
            @endif

            <div style="padding-top:18px;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 10px;font-size:13px;line-height:1.8;color:#4b5563;">
                    If you need help with this booking, contact our support team.
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
