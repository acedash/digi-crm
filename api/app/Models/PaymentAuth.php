<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Domains\Booking\Models\Booking;
use App\Models\User;

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
        'collected_at',
        'collected_by',
        'collection_notes',
        'collection_reference',
        'approved_email',
        'masked_card',
        'declaration_version',
        'declaration_text',
        'ip_address',
        'user_agent',
        'digital_signature',
        'metadata',
        'consent_snapshot',
        'id_proof_path',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'collected_at' => 'datetime',
        'metadata' => 'array',
        'consent_snapshot' => 'array',
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

    public function collector()
    {
        return $this->belongsTo(User::class, 'collected_by');
    }
}
