<?php

namespace App\Http\Controllers;

use App\Models\UserActivity;
use Illuminate\Http\Request;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;

class UserActivityController extends Controller
{
    use ApiResponseTrait;

    private function getManagedUserIds($user)
    {
        if ($user->hasRole('admin')) {
            return null;
        }

        if ($user->hasRole('supervisor')) {
            $teamIds = $user->supervisedAgents()->pluck('users.id')->toArray();
            $teamIds[] = $user->id;
            return $teamIds;
        }

        return [$user->id];
    }

    public function index(Request $request)
    {
        $query = UserActivity::where('user_id', Auth::id());
        return $this->successResponse($query->latest()->limit(50)->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'activity_type' => 'required|string|in:login,logout,break_start,break_end,on_call,idle,week_off',
            'description' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        $activity = UserActivity::create([
            'user_id' => Auth::id(),
            'activity_type' => $validated['activity_type'],
            'description' => $validated['description'] ?? ucfirst(str_replace('_', ' ', $validated['activity_type'])),
            'metadata' => $validated['metadata'] ?? [],
        ]);

        // Also update user status if needed
        if (in_array($validated['activity_type'], ['break_start', 'break_end', 'login', 'logout', 'on_call', 'idle', 'week_off'])) {
            $status = 'Active';
            if ($validated['activity_type'] === 'break_start') $status = 'Break';
            if ($validated['activity_type'] === 'logout') $status = 'Offline';
            if ($validated['activity_type'] === 'on_call') $status = 'On Call';
            if ($validated['activity_type'] === 'idle') $status = 'Idle';
            if ($validated['activity_type'] === 'week_off') $status = 'Week Off';
            
            Auth::user()->update(['status' => $status]);
        }

        return $this->successResponse($activity, 'Activity logged successfully');
    }

    public function currentStatus()
    {
        $user = Auth::user();
        $lastActivity = UserActivity::where('user_id', $user->id)->latest()->first();

        $todayActivities = UserActivity::where('user_id', $user->id)
            ->whereDate('created_at', now()->format('Y-m-d'))
            ->orderBy('created_at', 'asc')
            ->get();

        $breakdown = [
            'active' => 0,
            'on_call' => 0,
            'break' => 0,
            'idle' => 0,
        ];

        $currentSegmentStart = null;
        $currentSegmentType = null;

        foreach ($todayActivities as $activity) {
            $type = $activity->activity_type;
            
            $state = 'active';
            if ($type === 'break_start') $state = 'break';
            elseif ($type === 'on_call') $state = 'on_call';
            elseif ($type === 'idle') $state = 'idle';
            elseif ($type === 'logout') $state = 'offline';

            if ($currentSegmentStart && $currentSegmentType && $currentSegmentType !== 'offline') {
                $duration = abs($activity->created_at->diffInSeconds($currentSegmentStart));
                if (isset($breakdown[$currentSegmentType])) {
                    $breakdown[$currentSegmentType] += $duration;
                }
            }

            if ($state !== 'offline') {
                $currentSegmentStart = $activity->created_at;
                $currentSegmentType = $state;
            } else {
                $currentSegmentStart = null;
                $currentSegmentType = null;
            }
        }
        
        return $this->successResponse([
            'status' => $user->status,
            'last_activity' => $lastActivity,
            'breakdown' => $breakdown
        ]);
    }

    private function calculateBreakdown($activities, $date) 
    {
        $breakdown = ['active' => 0, 'on_call' => 0, 'break' => 0, 'idle' => 0];
        $currentSegmentStart = null;
        $currentSegmentType = null;
        
        $tz = config('app.timezone');

        foreach ($activities as $activity) {
            $type = $activity->activity_type;
            $state = 'active';
            if ($type === 'break_start') $state = 'break';
            elseif ($type === 'on_call') $state = 'on_call';
            elseif ($type === 'idle') $state = 'idle';
            elseif ($type === 'logout') $state = 'offline';

            if ($currentSegmentStart && $currentSegmentType && $currentSegmentType !== 'offline') {
                $duration = abs($activity->created_at->diffInSeconds($currentSegmentStart));
                if (isset($breakdown[$currentSegmentType])) {
                    $breakdown[$currentSegmentType] += $duration;
                }
            }

            if ($state !== 'offline') {
                $currentSegmentStart = $activity->created_at;
                $currentSegmentType = $state;
            } else {
                $currentSegmentStart = null;
                $currentSegmentType = null;
            }
        }

        // Add currently running segment if the date is today
        $isToday = $date === now()->timezone($tz)->format('Y-m-d');
        if ($isToday && $currentSegmentStart && $currentSegmentType && $currentSegmentType !== 'offline') {
            $duration = abs(now()->diffInSeconds($currentSegmentStart));
            if (isset($breakdown[$currentSegmentType])) {
                $breakdown[$currentSegmentType] += $duration;
            }
        }

        return $breakdown;
    }

    public function dailySummary()
    {
        $user = Auth::user();
        $tz = config('app.timezone');
        
        $activities = UserActivity::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays(60)) // Limit to last 60 days for performance
            ->orderBy('created_at', 'asc')
            ->get()
            ->groupBy(function($act) use ($tz) {
                return \Carbon\Carbon::parse($act->created_at)->timezone($tz)->format('Y-m-d');
            });

        $summaries = [];
        
        foreach ($activities as $date => $dailyActivities) {
            $breakdown = $this->calculateBreakdown($dailyActivities, $date);
            $total = $breakdown['active'] + $breakdown['on_call'] + $breakdown['break'] + $breakdown['idle'];
            
            $summaries[] = [
                'date' => $date,
                'first_activity' => clone $dailyActivities->first()->created_at,
                'last_activity' => clone $dailyActivities->last()->created_at,
                'breakdown' => $breakdown,
                'total_seconds' => $total
            ];
        }

        usort($summaries, function ($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
        });

        return $this->successResponse($summaries);
    }

    public function dailyDetails($date)
    {
        $user = Auth::user();
        $tz = config('app.timezone');
        $managedUserIds = $this->getManagedUserIds($user);

        if ($user->hasRole('admin') || $user->hasRole('supervisor')) {
            $targetUserId = request()->query('user_id');
            $query = UserActivity::with('user:id,name,email,status')
                ->orderBy('created_at', 'asc')
                ->when($managedUserIds !== null, function ($builder) use ($managedUserIds) {
                    $builder->whereIn('user_id', $managedUserIds);
                });

            $activities = $query
                ->get()
                ->filter(function($act) use ($tz, $date) {
                    return \Carbon\Carbon::parse($act->created_at)->timezone($tz)->format('Y-m-d') === $date;
                });

            if ($targetUserId) {
                $userActivities = $activities
                    ->where('user_id', (int) $targetUserId)
                    ->values();

                if ($userActivities->isEmpty()) {
                    return $this->successResponse([
                        'date' => $date,
                        'user' => null,
                        'timeline' => [],
                        'breakdown' => null,
                    ]);
                }

                $breakdown = $this->calculateBreakdown($userActivities, $date);
                $total = $breakdown['active'] + $breakdown['on_call'] + $breakdown['break'] + $breakdown['idle'];

                return $this->successResponse([
                    'date' => $date,
                    'user' => $userActivities->first()->user,
                    'first_activity' => clone $userActivities->first()->created_at,
                    'last_activity' => clone $userActivities->last()->created_at,
                    'total_seconds' => $total,
                    'breakdown' => $breakdown,
                    'timeline' => $userActivities,
                ]);
            }

            $activities = $activities->groupBy('user_id');

            $userSummaries = $activities->map(function ($dailyActivities) use ($date) {
                $dailyActivities = $dailyActivities->values();
                $breakdown = $this->calculateBreakdown($dailyActivities, $date);
                $total = $breakdown['active'] + $breakdown['on_call'] + $breakdown['break'] + $breakdown['idle'];

                return [
                    'user' => $dailyActivities->first()->user,
                    'first_activity' => clone $dailyActivities->first()->created_at,
                    'last_activity' => clone $dailyActivities->last()->created_at,
                    'total_seconds' => $total,
                    'breakdown' => $breakdown,
                ];
            })->sortBy(function ($summary) {
                return $summary['user']['name'] ?? '';
            })->values();

            return $this->successResponse([
                'date' => $date,
                'users' => $userSummaries,
            ]);
        }
        
        // Use whereDate logic, timezone handling could mean spanning multiple UTC days.
        // For precision, fetching all and filtering by timezone parsed date is safer.
        $activities = UserActivity::where('user_id', $user->id)
             ->orderBy('created_at', 'asc')
             ->get()
             ->filter(function($act) use ($tz, $date) {
                 return \Carbon\Carbon::parse($act->created_at)->timezone($tz)->format('Y-m-d') === $date;
             })
             ->values(); // reset integer keys

        if ($activities->isEmpty()) {
            return $this->successResponse(['date' => $date, 'timeline' => [], 'breakdown' => null]);
        }

        $breakdown = $this->calculateBreakdown($activities, $date);
        $total = $breakdown['active'] + $breakdown['on_call'] + $breakdown['break'] + $breakdown['idle'];

        return $this->successResponse([
            'date' => $date,
            'total_seconds' => $total,
            'breakdown' => $breakdown,
            'timeline' => $activities
        ]);
    }
}
