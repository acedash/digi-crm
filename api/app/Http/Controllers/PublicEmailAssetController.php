<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

class PublicEmailAssetController extends Controller
{
    public function show(string $encodedPath, string $signature)
    {
        $base64 = strtr($encodedPath, '-_', '+/');
        $padding = strlen($base64) % 4;

        if ($padding > 0) {
            $base64 .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode($base64, true);

        if (!$decoded) {
            abort(404);
        }

        $normalizedPath = ltrim($decoded, '/');

        if (str_contains($normalizedPath, '..')) {
            abort(404);
        }

        $expectedSignature = hash_hmac('sha256', $normalizedPath, (string) config('app.key'));

        if (!hash_equals($expectedSignature, $signature)) {
            abort(404);
        }

        $absolutePath = \Illuminate\Support\Facades\Storage::disk('public')->path($normalizedPath);

        if (!is_file($absolutePath)) {
            abort(404);
        }

        return response()->file($absolutePath, [
            'Cache-Control' => 'public, max-age=604800',
        ]);
    }
}
