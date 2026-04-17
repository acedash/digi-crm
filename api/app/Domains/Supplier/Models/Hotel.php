<?php

namespace App\Domains\Supplier\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Hotel extends Model
{
    protected $fillable = [
        'name',
        'city',
        'address',
        'room_type',
        'country',
        'rating',
        'contact_person',
        'phone',
        'booking_confirmation',
        'room_count',
        'adult_count',
        'child_count',
        'children_ages',
        'check_in_at',
        'check_out_at'
    ];
}
