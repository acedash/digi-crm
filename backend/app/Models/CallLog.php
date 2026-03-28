<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallLog extends Model
{
    protected $fillable = [
        'agent_id',
        'client_id',
        'call_type',
        'airline_inquiry',
        'customer_outcome',
        'notes',
        'callback_required',
        'callback_datetime',
    ];

    public function agent()
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
