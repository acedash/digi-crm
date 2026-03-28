<?php

namespace App\Domains\User\Services;

use App\Domains\User\Repositories\UserRepository;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;

class UserService
{
    protected UserRepository $userRepository;

    public function __construct(UserRepository $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function listUsers(): Collection
    {
        return $this->userRepository->getAll();
    }

    public function createUser(array $data): User
    {
        $data['password'] = Hash::make($data['password']);
        $user = $this->userRepository->create($data);
        
        if (isset($data['roles'])) {
            $user->assignRole($data['roles']);
            
            // Generate Custom ID based on role (Sequential per role)
            $role = $data['roles'][0];
            $prefix = match($role) {
                'admin' => 'ADM',
                'supervisor' => 'SUP',
                'agent' => 'AGT',
                default => 'USR'
            };
            
            $count = User::role($role)->count();
            $newNumber = 1000 + $count;
            
            $user->update([
                'user_custom_id' => $prefix . $newNumber
            ]);
        }

        return $user;
    }

    public function update($id, array $data): User
    {
        $user = $this->userRepository->find($id);
        
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $this->userRepository->update($user, $data);

        if (isset($data['roles'])) {
            $user->syncRoles($data['roles']);
        }

        return $user;
    }

    public function toggleStatus($id): User
    {
        $user = $this->userRepository->find($id);
        $user->update(['is_active' => !$user->is_active]);
        return $user;
    }

    public function getSupervisors(): Collection
    {
        return $this->userRepository->getSupervisors();
    }

    public function getAgentsBySupervisor($supervisorId): Collection
    {
        return $this->userRepository->getBySupervisor($supervisorId);
    }
}
