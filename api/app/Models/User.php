<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles, LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'is_active', 'supervisor_id', 'user_custom_id', 'phone', 'shift', 'week_off'])
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

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function agents()
    {
        return $this->hasMany(User::class, 'supervisor_id');
    }

    public function supervisors()
    {
        return $this->belongsToMany(User::class, 'user_supervisor', 'user_id', 'supervisor_id');
    }

    public function supervisedAgents()
    {
        return $this->belongsToMany(User::class, 'user_supervisor', 'supervisor_id', 'user_id');
    }

    public function bookings()
    {
        return $this->hasMany(\App\Domains\Booking\Models\Booking::class, 'agent_id');
    }

    public function latestActivity()
    {
        return $this->hasOne(UserActivity::class)->latestOfMany();
    }

    public function latestLogin()
    {
        return $this->hasOne(UserActivity::class)
            ->where('activity_type', 'login')
            ->latestOfMany();
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'is_active',
        'supervisor_id',
        'user_custom_id',
        'phone',
        'shift',
        'week_off',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
