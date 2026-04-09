<?php

namespace App\Domains\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingService extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'serviceable_id',
        'serviceable_type',
        'cost_price',
        'sell_price',
        'markup',
        'status',
        'details_json',
    ];

    protected $casts = [
        'details_json' => 'array',
    ];

    /**
     * Get the owning serviceable model (Flight, Hotel, Car, Cruise).
     */
    public function serviceable()
    {
        return $this->morphTo();
    }

    /**
     * Get the booking that owns the service.
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
