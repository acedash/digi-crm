<?php

namespace App\Http\Requests\Domains\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user');
        return [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $userId,
            'password' => 'sometimes|string|min:8',
            'roles' => 'sometimes|array',
            'roles.*' => 'exists:roles,name',
            'supervisor_id' => 'nullable|exists:users,id',
            'supervisor_ids' => 'nullable|array',
            'supervisor_ids.*' => 'exists:users,id',
            'phone' => 'nullable|string|max:20',
            'shift' => 'nullable|string|max:100',
            'week_off' => 'nullable|string|max:100',
        ];
    }
}
