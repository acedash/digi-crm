<?php

namespace App\Domains\User\Repositories;

use App\Models\User;
use App\Domains\Core\Repositories\BaseRepository;
use Illuminate\Database\Eloquent\Collection;

class UserRepository extends BaseRepository
{
    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    public function getAll(): Collection
    {
        return $this->model->with('roles')->get();
    }

    public function find($id): ?User
    {
        /** @var User $user */
        $user = $this->model->with('roles')->findOrFail($id);
        return $user;
    }

    public function getBySupervisor($supervisorId): Collection
    {
        return $this->model->where('supervisor_id', $supervisorId)->get();
    }

    public function getSupervisors(): Collection
    {
        return $this->model->role('supervisor')->get();
    }
}
