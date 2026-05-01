<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'nullable|string|max:255',
            'first_name' => 'required_without:name|string|max:255',
            'last_name' => 'required_without:name|string|max:255',
            'email' => 'nullable|email',
            'alternate_email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
            'alternate_phone' => 'nullable|string|max:20',
            'type' => 'nullable|string|in:Individual,Corporate',
            'agent_id' => 'nullable|exists:users,id',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
        ];
    }
}
