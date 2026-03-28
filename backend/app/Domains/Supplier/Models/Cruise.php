<?php

namespace App\Domains\Supplier\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cruise extends Model
{
    protected $fillable = [
        'cruise_name',
        'operator',
        'departure_port',
        'destination',
        'duration'
    ];
}
