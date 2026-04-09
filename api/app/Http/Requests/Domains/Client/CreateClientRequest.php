<?php

namespace App\Http\Requests\Domains\Client;

use Illuminate\Foundation\Http\FormRequest;

class CreateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'nullable|string|max:255',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'alternate_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'alternate_phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:Male,Female,Other',
            'address' => 'nullable|string',
            'type' => 'required|in:Individual,Corporate',
            'agent_id' => 'nullable|exists:users,id',
            'passengers.*.name' => 'nullable|string|max:255',
            'passengers.*.first_name' => 'required|string|max:100',
            'passengers.*.middle_name' => 'nullable|string|max:100',
            'passengers.*.last_name' => 'required|string|max:100',
            'passengers.*.date_of_birth' => 'nullable|date',
            'passengers.*.gender' => 'nullable|in:Male,Female,Other',
            'passengers.*.title' => 'nullable|string|max:10',
            'cards' => 'nullable|array',
            'cards.*.card_holder_name' => 'required|string|max:255',
            'cards.*.card_number' => 'required|string|max:255',
            'cards.*.expiry_month' => 'required|integer|min:1|max:12',
            'cards.*.expiry_year' => 'required|integer|min:2024|max:2050',
            'cards.*.card_type' => 'nullable|string|max:50',
            'cards.*.cvv' => 'nullable|string|max:10',
            'cards.*.billing_address' => 'nullable|string',
            'cards.*.is_primary' => 'boolean',
        ];
    }
}
