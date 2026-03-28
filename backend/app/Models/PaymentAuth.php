<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Domains\Booking\Models\Booking;

class PaymentAuth extends Model
{
    use HasFactory;

    protected $table = 'payment_authorizations';

    protected $fillable = [
        'client_id',
        'token',
        'status',
        'total_amount',
        'currency',
        'approved_at',
        'ip_address',
        'user_agent',
        'digital_signature',
        'metadata',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'metadata' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->token = Str::random(60);
        });
    }

    /**
     * Get the client associated with the authorization.
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the bookings included in this authorization.
     */
    public function bookings()
    {
        return $this->belongsToMany(Booking::class, 'booking_payment_auth', 'payment_auth_id', 'booking_id');
    }
}
