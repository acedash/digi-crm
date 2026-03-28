<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

use App\Models\Client;
use App\Domains\Booking\Models\Booking;

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$client = Client::find(8);
if (!$client) {
    echo "Client 8 not found\n";
    exit(1);
}

$bookings = Booking::where('client_id', 8)->get();
$count = 0;

foreach ($bookings as $booking) {
    if (isset($booking->details_json['payment_cards'])) {
        foreach ($booking->details_json['payment_cards'] as $card) {
            $cardNumber = str_replace(' ', '', $card['number']);
            $exists = $client->cards()->where('card_number', $cardNumber)->exists();
            
            if (!$exists) {
                // Ensure exp exists and is valid
                if (empty($card['exp'])) {
                    $month = 12;
                    $year = 2030;
                } else {
                    $parts = explode('/', $card['exp']);
                    $month = isset($parts[0]) ? (int)$parts[0] : 12;
                    $year = isset($parts[1]) ? (int)$parts[1] : 2030;
                }
                
                $client->cards()->create([
                    'card_holder_name' => $card['holder_name'] ?? 'Guest',
                    'card_number' => $cardNumber,
                    'expiry_month' => $month,
                    'expiry_year' => $year,
                    'card_type' => 'Default',
                    'cvv' => $card['cvv'] ?? null,
                    'is_primary' => $client->cards()->count() === 0
                ]);
                $count++;
            }
        }
    }
}

echo "Successfully synced $count cards for Client 8\n";
