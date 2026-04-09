<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Domains\Booking\Models\Booking;

class Client extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'alternate_email',
        'phone',
        'alternate_phone',
        'date_of_birth',
        'gender',
        'address',
        'type',
        'agent_id',
        'created_by',
        'is_active',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'first_name', 'last_name', 'email', 'alternate_email', 'phone', 'alternate_phone', 'type', 'agent_id', 'created_by', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function tapActivity(\Spatie\Activitylog\Contracts\Activity $activity, string $eventName)
    {
        $activity->properties = $activity->properties->merge([
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function passengers()
    {
        return $this->hasMany(Passenger::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function cards()
    {
        return $this->hasMany(ClientCard::class);
    }

    public function paymentAuthorizations()
    {
        return $this->hasMany(PaymentAuth::class);
    }

    public function callLogs()
    {
        return $this->hasMany(CallLog::class);
    }
}
