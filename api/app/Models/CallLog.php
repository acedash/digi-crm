<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallLog extends Model
{
    protected $fillable = [
        'agent_id',
        'client_id',
        'log_scope',
        'contact_name',
        'contact_email',
        'contact_phone',
        'lead_source',
        'call_type',
        'airline_inquiry',
        'customer_outcome',
        'notes',
        'callback_required',
        'callback_datetime',
    ];

    protected $casts = [
        'call_type' => 'array',
        'airline_inquiry' => 'array',
        'callback_required' => 'boolean',
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
