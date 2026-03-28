<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Domains\User\Services\UserService;
use App\Http\Requests\Domains\User\CreateUserRequest;
use App\Http\Requests\Domains\User\UpdateUserRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use ApiResponseTrait;

    protected UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function index(): JsonResponse
    {
        return $this->success($this->userService->listUsers(), 'Users retrieved successfully');
    }

    public function store(CreateUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser($request->validated());
        return $this->success($user, 'User created successfully', 201);
    }

    public function update(UpdateUserRequest $request, $id): JsonResponse
    {
        $user = $this->userService->update($id, $request->validated());
        return $this->success($user, 'User updated successfully');
    }

    public function toggleStatus($id): JsonResponse
    {
        $user = $this->userService->toggleStatus($id);
        return $this->success($user, 'User status toggled successfully');
    }

    public function getSupervisors(): JsonResponse
    {
        return $this->success($this->userService->getSupervisors(), 'Supervisors retrieved successfully');
    }

    public function myAgents(Request $request): JsonResponse
    {
        return $this->success($this->userService->getAgentsBySupervisor($request->user()->id), 'Agents retrieved successfully');
    }

    public function updateStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:Active,On Call,Break,Offline',
        ]);

        $user = \Illuminate\Support\Facades\Auth::user();
        $user->update(['status' => $validated['status']]);

        // Synchronize with UserActivity tracking natively
        $activityMap = [
            'Active' => 'break_end',
            'Break' => 'break_start',
            'Offline' => 'logout',
            'On Call' => 'on_call',
        ];

        \App\Models\UserActivity::create([
            'user_id' => $user->id,
            'activity_type' => $activityMap[$validated['status']] ?? 'status_change',
            'description' => 'Status changed to ' . $validated['status'],
        ]);

        return $this->success($user, 'Status updated successfully');
    }
}
