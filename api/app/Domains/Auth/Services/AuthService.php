<?php

namespace App\Domains\Auth\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthService
{
    public function login(array $credentials)
    {
        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('auth_token')->plainTextToken;
            
            \App\Models\UserActivity::create([
                'user_id' => $user->id,
                'activity_type' => 'login',
                'description' => 'Logged in'
            ]);
            $user->update(['status' => 'active']);

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                ],
                'token' => $token
            ];
        }
        return null;
    }

    public function logout($user)
    {
        \App\Models\UserActivity::create([
            'user_id' => $user->id,
            'activity_type' => 'logout',
            'description' => 'Logged out'
        ]);
        $user->update(['status' => 'offline']);
        $user->tokens()->delete();
    }
}
