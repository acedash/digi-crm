<?php

namespace App\Domains\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Flight extends Model
{
    use HasFactory;

    protected $fillable = [
        'pnr',
        'airline_code',
        'flight_number',
        'departure_city',
        'arrival_city',
        'departure_at',
        'arrival_at',
        'ticket_image',
    ];

    protected $casts = [
        'departure_at' => 'datetime',
        'arrival_at' => 'datetime',
    ];

    /**
     * Get the service associated with the flight.
     */
    public function service()
    {
        return $this->morphOne(BookingService::class, 'serviceable');
    }
}
