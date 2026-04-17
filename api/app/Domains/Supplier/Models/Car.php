<?php

namespace App\Domains\Supplier\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Car extends Model
{
    protected $fillable = [
        'car_type',
        'company',
        'capacity',
        'price_per_day',
        'pickup_location',
        'drop_off_location',
        'pickup_at',
        'drop_off_at',
        'driver_name',
        'driver_dob',
        'adult_count',
        'child_count',
        'infant_count',
        'pay_now_amount',
        'pay_at_pickup_amount'
    ];
}
