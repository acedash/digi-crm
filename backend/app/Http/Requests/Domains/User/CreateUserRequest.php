<?php

namespace App\Http\Requests\Domains\User;

use Illuminate\Foundation\Http\FormRequest;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Protected by middleware
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name',
            'supervisor_id' => 'nullable|exists:users,id',
            'phone' => 'nullable|string|max:20',
            'shift' => 'nullable|string|max:100',
            'week_off' => 'nullable|string|max:100',
        ];
    }
}
