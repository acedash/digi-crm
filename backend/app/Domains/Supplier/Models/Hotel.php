<?php

namespace App\Domains\Supplier\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Hotel extends Model
{
    protected $fillable = [
        'name',
        'city',
        'country',
        'rating',
        'contact_person',
        'phone'
    ];
}
