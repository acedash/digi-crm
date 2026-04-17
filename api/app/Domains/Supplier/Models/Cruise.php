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
        'duration',
        'room_type',
        'deck_number',
        'room_number',
        'room_count',
        'adult_count',
        'child_count',
        'children_dob',
        'deposit_amount',
        'due_amount',
        'due_date',
        'departure_at',
        'arrival_at'
    ];
}
