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
        'price_per_day'
    ];
}
