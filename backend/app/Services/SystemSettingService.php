<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;

class SystemSettingService
{
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
