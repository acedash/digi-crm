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
    ];

    public const DEFAULT_MAIL_TEMPLATES = [
        'authorization' => [
            'key' => 'authorization',
            'name' => 'Authorization',
            'description' => 'Customer approval email for booking payment authorization.',
            'subject' => 'Booking payment approval request',
            'body' => "We hope this message finds you well. Please review the itinerary, traveller information, fare details, and authorization declaration below. Once confirmed, use the approval button at the bottom to securely record your consent.",
            'enabled' => true,
            'variables' => self::COMMON_BOOKING_TEMPLATE_VARIABLES,
        ],
        'flight_change' => [
            'key' => 'flight_change',
            'name' => 'Flight Change',
            'description' => 'Customer email for itinerary updates and schedule changes.',
            'subject' => 'Important update to your flight itinerary',
            'body' => "There has been an update to your itinerary. Please review the revised travel details below and contact us if you need any assistance.",
            'enabled' => true,
            'variables' => self::COMMON_BOOKING_TEMPLATE_VARIABLES,
        ],
        'cancellation_future_credit' => [
            'key' => 'cancellation_future_credit',
            'name' => 'Cancellation - Future Credit',
            'description' => 'Customer email confirming cancellation with future travel credit.',
            'subject' => 'Your booking has been cancelled and future credit issued',
            'body' => "Your booking has been cancelled. The supplier has issued a future travel credit. Please review the details below and contact us if you need help using the credit.",
            'enabled' => true,
            'variables' => self::COMMON_BOOKING_TEMPLATE_VARIABLES,
        ],
        'cancellation_refund' => [
            'key' => 'cancellation_refund',
            'name' => 'Cancellation - Refund',
            'description' => 'Customer email confirming cancellation with refund processing.',
            'subject' => 'Your booking cancellation and refund update',
            'body' => "Your booking has been cancelled and the refund process has started. Please review the refund details below. We will keep you informed throughout the process.",
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
        Config::set('mail.from.address', $settings['from_address']);
        Config::set('mail.from.name', $settings['from_name']);
    }
}
