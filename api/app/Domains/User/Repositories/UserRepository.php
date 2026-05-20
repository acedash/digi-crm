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
        return $this->model->with(['roles', 'supervisors:id,name', 'latestActivity', 'latestLogin'])->get();
    }

    public function find($id): ?User
    {
        /** @var User $user */
        $user = $this->model->with(['roles', 'supervisors:id,name'])->findOrFail($id);
        return $user;
    }

    public function getBySupervisor($supervisorId): Collection
    {
        return $this->model
            ->whereHas('supervisors', function ($query) use ($supervisorId) {
                $query->where('user_supervisor.supervisor_id', $supervisorId);
            })
            ->get();
    }

    public function getSupervisors(): Collection
    {
        return $this->model->role('supervisor')->get();
    }
}
