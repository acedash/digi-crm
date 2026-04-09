<?php

namespace App\Domains\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Client;
use App\Models\User;
use App\Models\Passenger;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Contracts\Activity;

class Booking extends Model
{
    use HasFactory, LogsActivity;

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
        // Try to find a flight departure date first
        $flightService = $this->services()
            ->where('serviceable_type', 'App\Domains\Booking\Models\Flight')
            ->first();
            
        if ($flightService) {
            /** @var \App\Domains\Booking\Models\Flight|null $flight */
            $flight = $flightService->serviceable;
            if ($flight && isset($flight->departure_at)) {
                return $flight->departure_at;
            }
        }

        return $this->created_at;
    }

    protected $fillable = [
        'client_id',
        'agent_id',
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
}
