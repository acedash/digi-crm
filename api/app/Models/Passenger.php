<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Builder;
use App\Domains\Booking\Models\Booking;
use Spatie\Activitylog\LogOptions;

class Passenger extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'client_id',
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'date_of_birth',
        'gender',
        'title',
        'type',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['first_name', 'last_name', 'client_id']);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function bookings()
    {
        return $this->belongsToMany(Booking::class);
    }
}
