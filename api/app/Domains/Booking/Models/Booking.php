<?php

namespace App\Domains\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Client;
use App\Models\User;
use App\Models\Passenger;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Contracts\Activity;

class Booking extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'total_amount', 'agent_id', 'client_id', 'booking_reference'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function tapActivity(Activity $activity, string $eventName)
    {
        $activity->properties = $activity->properties->merge([
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }
    
    protected $appends = ['travel_date'];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'details_json' => 'array',
    ];

    public function getTravelDateAttribute()
    {
        // Check if services relation is loaded to avoid N+1 queries
        if ($this->relationLoaded('services')) {
            $flightService = $this->services->first(function ($service) {
                // Use class name directly or check part of the string to avoid FQCN mismatch issues
                return str_contains($service->serviceable_type, 'Flight');
            });

            if ($flightService) {
                // Check if the polymorphic manageable relation 'serviceable' is also loaded
                if ($flightService->relationLoaded('serviceable') && $flightService->serviceable) {
                    return $flightService->serviceable->departure_at ?? $this->created_at;
                }

                // Fallback to segments in details_json if serviceable is not loaded
                $segmentDeparture = data_get($flightService->details_json, 'segments.0.departure_at');
                if ($segmentDeparture) {
                    return $segmentDeparture;
                }
            }
        }

        return $this->created_at;
    }

    protected $fillable = [
        'client_id',
        'agent_id',
        'created_by',
        'booking_reference',
        'status',
        'total_amount',
        'currency',
        'details_json',
    ];

    /**
     * Get the client that owns the booking.
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the agent who made the booking.
     */
    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    /**
     * Get the user who created the booking.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The passengers that belong to the booking.
     */
    public function passengers()
    {
        return $this->belongsToMany(Passenger::class, 'booking_passenger');
    }

    /**
     * Get all services attached to this booking.
     */
    public function services()
    {
        return $this->hasMany(BookingService::class);
    }

    /**
     * Get the payment authorizations associated with this booking.
     */
    public function paymentAuthorizations()
    {
        return $this->belongsToMany(\App\Models\PaymentAuth::class, 'booking_payment_auth', 'booking_id', 'payment_auth_id');
    }
}
