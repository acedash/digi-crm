<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ClientCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'card_holder_name',
        'card_number',
        'last_4',
        'expiry_month',
        'expiry_year',
        'card_type',
        'cvv',
        'billing_address',
        'currency',
        'is_primary',
    ];

    protected $casts = [
        'card_number' => 'encrypted',
        'cvv' => 'encrypted',
        'is_primary' => 'boolean',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
