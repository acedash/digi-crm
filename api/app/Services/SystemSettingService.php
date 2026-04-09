<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;

class SystemSettingService
{
    private const COMMON_BOOKING_TEMPLATE_VARIABLES = [
        'client_name',
        'booking_reference',
        'currency',
        'total_amount',
        'status',
        'travel_date',
        'agent_name',
        'service_summary',
        'pnr',
        'flight_image_url',
        'approval_url',
        'booking_summary_html',
        'flight_image_html',
        'hotel_image_urls',
        'hotel_images_html',
        'car_image_urls',
        'car_images_html',
        'cruise_image_urls',
        'cruise_images_html',
        'flight_change_details_html',
        'support_html',
    ];

    private const AUTHORIZATION_TEMPLATE_VARIABLES = [
        'client_name',
        'booking_reference',
        'currency',
        'total_amount',
        'status',
        'travel_date',
        'agent_name',
        'service_summary',
        'pnr',
        'flight_image_url',
        'approval_url',
        'masked_card',
        'supplier_label',
        'authorization_type_label',
        'ticket_images_html',
        'hotel_images_html',
        'car_images_html',
        'cruise_images_html',
        'travellers_html',
        'fare_breakdown_html',
        'change_entries_html',
        'card_allocations_html',
        'declaration_html',
        'terms_html',
        'approval_button_html',
        'support_html',
        'signature_html',
    ];

    public const DEFAULT_MAIL_TEMPLATES = [
        'authorization' => [
            'key' => 'authorization',
            'name' => 'Authorization',
            'description' => 'Customer approval email for booking payment authorization.',
            'subject' => 'Booking payment approval request',
            'body' => "<p style=\"margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#016040;\">{{authorization_type_label}}</p>\n<h1 style=\"margin:0 0 12px;font-size:28px;line-height:1.2;\">Review your booking and approve payment</h1>\n<p style=\"margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;\">Dear {{client_name}},</p>\n<p style=\"margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;\">Please review the booking details below and approve if everything is correct.</p>\n{{ticket_images_html}}\n{{travellers_html}}\n{{fare_breakdown_html}}\n{{change_entries_html}}\n{{card_allocations_html}}\n{{declaration_html}}\n{{terms_html}}\n{{approval_button_html}}\n{{support_html}}",
            'terms_content' => "<p style=\"margin:0 0 10px;\"><strong>Booking Acknowledgment</strong><br>By confirming your booking, you agree that you have read, understood, and accepted these terms.</p><p style=\"margin:0 0 10px;\"><strong>Reconfirmation</strong><br>Cruise bookings and special requests must be reconfirmed with our agency at least 72 hours before sailing and remain subject to availability.</p><p style=\"margin:0 0 10px;\"><strong>Changes &amp; Cancellations</strong><br>Bookings are non-transferable and non-refundable unless permitted by supplier fare rules. Refunds, if applicable, remain subject to supplier penalties and agency service fees.</p><p style=\"margin:0 0 10px;\"><strong>Travel Documents</strong><br>You are responsible for valid passports, visas, and any required travel documents. We are not liable for denied boarding or entry.</p><p style=\"margin:0 0 10px;\"><strong>Refunds and Disputes</strong><br>Refunds are issued only after supplier confirmation. Please contact us directly for any dispute or refund query instead of filing a bank dispute first.</p><p style=\"margin:0 0 10px;\"><strong>Refund Processing Time</strong><br>Refunds may take up to 12-16 weeks depending on supplier processing timelines.</p><p style=\"margin:0;\"><strong>Policy Changes</strong><br>Supplier policies may change without notice. Please confirm the latest rules with our support team.</p>",
            'enabled' => true,
            'variables' => self::AUTHORIZATION_TEMPLATE_VARIABLES,
        ],
        'flight_change' => [
            'key' => 'flight_change',
            'name' => 'Flight Change',
            'description' => 'Customer email for itinerary updates and schedule changes.',
            'subject' => 'Important update to your flight itinerary',
            'body' => "<p style=\"margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;\">Dear {{client_name}},</p>\n<p style=\"margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;\">There has been an update to your itinerary. Please review the revised travel details below and contact us if you need any assistance.</p>\n{{booking_summary_html}}\n{{flight_image_html}}\n{{flight_change_details_html}}\n{{support_html}}",
            'enabled' => true,
            'variables' => self::COMMON_BOOKING_TEMPLATE_VARIABLES,
        ],
        'cancellation_future_credit' => [
            'key' => 'cancellation_future_credit',
            'name' => 'Cancellation - Future Credit',
            'description' => 'Customer email confirming cancellation with future travel credit.',
            'subject' => 'Your booking has been cancelled and future credit issued',
            'body' => "<p style=\"margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;\">Dear {{client_name}},</p>\n<p style=\"margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;\">Your booking has been cancelled. The supplier has issued a future travel credit. Please review the details below and contact us if you need help using the credit.</p>\n{{booking_summary_html}}\n{{support_html}}",
            'enabled' => true,
            'variables' => self::COMMON_BOOKING_TEMPLATE_VARIABLES,
        ],
        'cancellation_refund' => [
            'key' => 'cancellation_refund',
            'name' => 'Cancellation - Refund',
            'description' => 'Customer email confirming cancellation with refund processing.',
            'subject' => 'Your booking cancellation and refund update',
            'body' => "<p style=\"margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;\">Dear {{client_name}},</p>\n<p style=\"margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;\">Your booking has been cancelled and the refund process has started. Please review the refund details below. We will keep you informed throughout the process.</p>\n{{booking_summary_html}}\n{{support_html}}",
            'enabled' => true,
            'variables' => self::COMMON_BOOKING_TEMPLATE_VARIABLES,
        ],
    ];

    public function get(string $key, $default = null)
    {
        $setting = SystemSetting::where('key', $key)->first();

        if (!$setting || $setting->value === null) {
            return $default;
        }

        if ($setting->is_encrypted) {
            try {
                return Crypt::decryptString($setting->value);
            } catch (\Throwable $e) {
                return $default;
            }
        }

        return $setting->value;
    }

    public function set(string $key, $value, bool $encrypted = false): void
    {
        $storedValue = $value;

        if ($encrypted && $value !== null && $value !== '') {
            $storedValue = Crypt::encryptString((string) $value);
        }

        if ($value === null || $value === '') {
            $storedValue = null;
        }

        SystemSetting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $storedValue,
                'is_encrypted' => $encrypted,
            ]
        );
    }

    public function getMailSettings(): array
    {
        return [
            'host' => $this->get('mail.host', ''),
            'port' => (int) $this->get('mail.port', 587),
            'username' => $this->get('mail.username', ''),
            'password' => $this->get('mail.password', ''),
            'encryption' => $this->get('mail.encryption', 'tls'),
            'from_address' => $this->get('mail.from_address', ''),
            'from_name' => $this->get('mail.from_name', config('app.name')),
        ];
    }

    public function getMailTemplates(): array
    {
        $storedTemplates = $this->get('mail.templates', []);

        if (is_string($storedTemplates)) {
            $decoded = json_decode($storedTemplates, true);
            $storedTemplates = is_array($decoded) ? $decoded : [];
        }

        $templates = [];

        foreach (self::DEFAULT_MAIL_TEMPLATES as $key => $template) {
            $templates[$key] = array_merge($template, $storedTemplates[$key] ?? []);
        }

        foreach ($storedTemplates as $key => $template) {
            if (!isset($templates[$key]) && is_array($template)) {
                $templates[$key] = array_merge([
                    'key' => $key,
                    'name' => ucfirst(str_replace('_', ' ', $key)),
                    'description' => '',
                    'subject' => '',
                    'body' => '',
                    'enabled' => true,
                    'variables' => [],
                ], $template);
            }
        }

        return array_values($templates);
    }

    public function updateMailTemplates(array $templates): array
    {
        $normalized = [];

        foreach ($templates as $template) {
            $key = $template['key'];

            $defaults = self::DEFAULT_MAIL_TEMPLATES[$key] ?? [
                'key' => $key,
                'name' => ucfirst(str_replace('_', ' ', $key)),
                'description' => '',
                'variables' => [],
            ];

            $normalized[$key] = [
                'key' => $key,
                'name' => $template['name'] ?? $defaults['name'],
                'description' => $template['description'] ?? $defaults['description'],
                'subject' => $template['subject'] ?? '',
                'body' => $template['body'] ?? '',
                'terms_content' => $template['terms_content'] ?? ($defaults['terms_content'] ?? ''),
                'enabled' => (bool) ($template['enabled'] ?? true),
                'variables' => array_values($defaults['variables'] ?? []),
            ];
        }

        $this->set('mail.templates', json_encode($normalized, JSON_UNESCAPED_UNICODE));

        return $this->getMailTemplates();
    }

    public function getMailTemplate(string $key): array
    {
        $templates = collect($this->getMailTemplates())->keyBy('key');

        return $templates->get($key, self::DEFAULT_MAIL_TEMPLATES[$key] ?? [
            'key' => $key,
            'name' => ucfirst(str_replace('_', ' ', $key)),
            'description' => '',
            'subject' => '',
            'body' => '',
            'enabled' => true,
            'variables' => [],
        ]);
    }

    public function updateMailSettings(array $data): array
    {
        $this->set('mail.host', $data['host'] ?? '');
        $this->set('mail.port', $data['port'] ?? 587);
        $this->set('mail.username', $data['username'] ?? '');

        if (array_key_exists('password', $data) && $data['password'] !== '') {
            $this->set('mail.password', $data['password'], true);
        }

        $this->set('mail.encryption', $data['encryption'] ?? 'tls');
        $this->set('mail.from_address', $data['from_address'] ?? '');
        $this->set('mail.from_name', $data['from_name'] ?? config('app.name'));

        return $this->getMailSettings();
    }

    public function hasMailSettings(): bool
    {
        $settings = $this->getMailSettings();

        return filled($settings['host'])
            && filled($settings['port'])
            && filled($settings['username'])
            && filled($settings['password'])
            && filled($settings['from_address']);
    }

    public function applyMailConfig(): void
    {
        $settings = $this->getMailSettings();
        $scheme = 'smtp';

        if (($settings['encryption'] ?? null) === 'ssl') {
            $scheme = 'smtps';
        }

        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $settings['host']);
        Config::set('mail.mailers.smtp.port', (int) $settings['port']);
        Config::set('mail.mailers.smtp.username', $settings['username']);
        Config::set('mail.mailers.smtp.password', $settings['password']);
        Config::set('mail.mailers.smtp.scheme', $scheme);
        Config::set('mail.mailers.smtp.timeout', 10);
        Config::set('mail.mailers.smtp.local_domain', parse_url((string) (config('app.url') ?: 'http://localhost'), PHP_URL_HOST) ?: 'localhost');
        Config::set('mail.from.address', $settings['from_address']);
        Config::set('mail.from.name', $settings['from_name']);
    }
}
