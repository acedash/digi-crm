<?php

namespace App\Http\Controllers;

use App\Domains\Booking\Models\Booking;
use App\Models\Client;
use App\Models\User;
use App\Models\CallLog;
use App\Models\PaymentAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getStats(Request $request)
    {
        $user = $request->user();
        
        // Safer role check
        if ($user->hasRole('admin')) {
            return $this->getAdminStats();
        } elseif ($user->hasRole('supervisor')) {
            return $this->getSupervisorStats($user);
        } else {
            return $this->getAgentStats($user);
        }
    }

    private function getAdminStats()
    {
        $dailyRevenue = (float) PaymentAuth::whereHas('bookings')
            ->whereNotNull('collected_at')
            ->whereDate('collected_at', now()->toDateString())
            ->sum('total_amount');
        $currentMonthRevenue = (float) Booking::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('total_amount');
        $previousMonthRevenue = (float) Booking::whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->sum('total_amount');
        $revenueGrowth = $previousMonthRevenue > 0
            ? round((($currentMonthRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100, 1)
            : ($currentMonthRevenue > 0 ? 100.0 : 0.0);

        return response()->json([
            'success' => true,
            'data' => [
                'total_staff' => User::count(),
                'active_staff' => User::whereIn('status', ['Active', 'On Call', 'active', 'on call'])->count(),
                'total_clients' => Client::count(),
                'total_bookings' => Booking::count(),
                'total_calls' => CallLog::where('log_scope', 'booking')->count(),
                'daily_revenue' => $dailyRevenue,
                'monthly_revenue' => $currentMonthRevenue,
                'pending_approvals' => Booking::where('status', 'Pending')->count(),
                'ready_to_charge' => PaymentAuth::whereHas('bookings')
                    ->where('status', 'Approved')
                    ->whereNull('collected_at')
                    ->count(),
                'revenue_growth' => $revenueGrowth,
                'recent_bookings' => Booking::with(['client', 'agent'])
                    ->latest()
                    ->take(5)
                    ->get(),
                'charge_queue' => PaymentAuth::with(['client', 'bookings'])
                    ->whereHas('bookings')
                    ->where('status', 'Approved')
                    ->whereNull('collected_at')
                    ->latest('approved_at')
                    ->take(5)
                    ->get(),
            ]
        ]);
    }

    private function getSupervisorStats($user)
    {
        $agentIds = $user->supervisedAgents()->pluck('users.id')->toArray();
        $teamIds = array_merge([$user->id], $agentIds);
        $weeklyThreshold = now()->subDays(7);
        $agents = User::role('agent')
            ->whereHas('supervisors', function ($query) use ($user) {
                $query->where('users.id', $user->id);
            })
            ->withCount([
                'bookings',
                'bookings as weekly_bookings_count' => function ($query) use ($weeklyThreshold) {
                    $query->where('created_at', '>=', $weeklyThreshold);
                },
            ])
            ->get();

        $callCounts = CallLog::select('agent_id', DB::raw('COUNT(*) as total_calls'))
            ->whereIn('agent_id', $agentIds)
            ->where('log_scope', 'booking')
            ->groupBy('agent_id')
            ->pluck('total_calls', 'agent_id');

        $airlineInquiryCounts = CallLog::select('agent_id', DB::raw('COUNT(*) as airline_inquiries'))
            ->whereIn('agent_id', $agentIds)
            ->where('log_scope', 'booking')
            ->whereNotNull('airline_inquiry')
            ->where('airline_inquiry', '!=', '')
            ->groupBy('agent_id')
            ->pluck('airline_inquiries', 'agent_id');

        $recentInquiries = CallLog::with(['agent:id,name', 'client:id,name,first_name,last_name'])
            ->whereIn('agent_id', $agentIds)
            ->where('log_scope', 'booking')
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_clients' => Client::whereIn('agent_id', $teamIds)
                    ->whereHas('bookings')
                    ->count(),
                'daily_revenue' => (float) Booking::whereIn('agent_id', $teamIds)
                    ->whereDate('created_at', now()->toDateString())
                    ->sum('total_amount'),
                'weekly_bookings' => Booking::whereIn('agent_id', $teamIds)->where('created_at', '>=', $weeklyThreshold)->count(),
                'team_calls' => CallLog::whereIn('agent_id', $teamIds)->where('log_scope', 'booking')->where('created_at', '>=', $weeklyThreshold)->count(),
                'team_airline_inquiries' => CallLog::whereIn('agent_id', $teamIds)
                    ->where('log_scope', 'booking')
                    ->where('created_at', '>=', $weeklyThreshold)
                    ->whereNotNull('airline_inquiry')
                    ->where('airline_inquiry', '!=', '')
                    ->count(),
                'pending_tasks' => Booking::whereIn('agent_id', $teamIds)->where('status', 'Pending')->count(),
                'agent_performance' => $agents->map(function ($agent) use ($callCounts, $airlineInquiryCounts) {
                    return [
                        'id' => $agent->id,
                        'name' => $agent->name,
                        'email' => $agent->email,
                        'status' => $agent->status,
                        'bookings_count' => $agent->bookings_count,
                        'weekly_bookings_count' => $agent->weekly_bookings_count,
                        'calls_count' => (int) ($callCounts[$agent->id] ?? 0),
                        'airline_inquiries_count' => (int) ($airlineInquiryCounts[$agent->id] ?? 0),
                    ];
                })->values(),
                'recent_bookings' => Booking::with(['client', 'agent:id,name'])
                    ->whereIn('agent_id', $teamIds)
                    ->latest()
                    ->take(5)
                    ->get(),
                'recent_inquiries' => $recentInquiries,
            ]
        ]);
    }

    private function getAgentStats($user)
    {
        $dailyRevenue = (float) Booking::where('agent_id', $user->id)
            ->whereDate('created_at', now()->toDateString())
            ->sum('total_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'my_bookings_count' => Booking::where('agent_id', $user->id)->count(),
                'my_revenue' => (float) Booking::where('agent_id', $user->id)->sum('total_amount'),
                'daily_revenue' => $dailyRevenue,
                'my_calls' => CallLog::where('agent_id', $user->id)->where('log_scope', 'booking')->count(),
                'recent_logs' => CallLog::where('agent_id', $user->id)->where('log_scope', 'booking')->latest()->take(5)->get(),
                'daily_target' => 75
            ]
        ]);
    }

    public function getAgentMonitor(Request $request)
    {
        $user = $request->user();
        
        if ($user->hasRole('admin')) {
            $agents = User::whereHas('roles', function($q) {
                $q->whereIn('name', ['agent', 'supervisor']);
            })->get();
        } elseif ($user->hasRole('supervisor')) {
            $agents = $user->supervisedAgents()->get();
        } else {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $tz = config('app.timezone');

        $activityData = $agents->map(function($agent) use ($tz) {
            $activities = \App\Models\UserActivity::where('user_id', $agent->id)
                ->whereDate('created_at', now()->timezone($tz)->format('Y-m-d'))
                ->orderBy('created_at', 'asc')
                ->get();
            
            $loginActivity = $activities->firstWhere('activity_type', 'login');
            $loginTime = $loginActivity ? $loginActivity->created_at->timezone($tz)->format('h:i A') : '--';

            $breakSeconds = 0;
            $currentSegmentStart = null;
            $currentSegmentType = null;

            foreach ($activities as $activity) {
                $type = $activity->activity_type;
                $state = 'active';
                if ($type === 'break_start') $state = 'break';
                elseif ($type === 'on_call') $state = 'on_call';
                elseif ($type === 'idle') $state = 'idle';
                elseif ($type === 'logout') $state = 'offline';

                if ($currentSegmentStart && $currentSegmentType === 'break') {
                    $breakSeconds += abs($activity->created_at->diffInSeconds($currentSegmentStart));
                }

                if ($state !== 'offline') {
                    $currentSegmentStart = $activity->created_at;
                    $currentSegmentType = $state;
                } else {
                    $currentSegmentStart = null;
                    $currentSegmentType = null;
                }
            }

            if ($currentSegmentStart && $currentSegmentType === 'break') {
                $breakSeconds += abs(now()->diffInSeconds($currentSegmentStart));
            }

            $callsPicked = CallLog::where('agent_id', $agent->id)
                ->where('log_scope', 'booking')
                ->whereDate('created_at', now()->timezone($tz)->format('Y-m-d'))
                ->count();

            $bookingsCreated = Booking::where('agent_id', $agent->id)
                ->whereDate('created_at', now()->timezone($tz)->format('Y-m-d'))
                ->count();

            $dailyRevenue = (float) Booking::where('agent_id', $agent->id)
                ->whereDate('created_at', now()->timezone($tz)->format('Y-m-d'))
                ->sum('total_amount');

            $breakFormatted = $breakSeconds > 0 ? floor($breakSeconds / 60) . ' min' : '--';
            if ($breakSeconds >= 3600) {
                $hours = floor($breakSeconds / 3600);
                $mins = floor(($breakSeconds % 3600) / 60);
                $breakFormatted = "{$hours}h {$mins}m";
            }

            return [
                'id' => $agent->id,
                'agent_name' => $agent->name,
                'login_time' => $loginTime,
                'status' => $agent->status ?? 'Offline',
                'calls_picked' => $callsPicked,
                'bookings_created' => $bookingsCreated,
                'daily_revenue' => $dailyRevenue,
                'break_time' => $breakFormatted
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $activityData
        ]);
    }

    public function getAdminMonitor(Request $request)
    {
        $user = $request->user();
        if (!$user->hasRole('admin')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $supervisors = User::role('supervisor')->get();
        
        $data = $supervisors->map(function($sup) {
            $agents = $sup->supervisedAgents()->get();
            $totalAgents = $agents->count();
            // Count active or on call
            $active = $agents->filter(function($agent) {
                return in_array(strtolower($agent->status), ['active', 'on call']);
            })->count();
            
            $onBreak = $agents->filter(function($agent) {
                return strtolower($agent->status) === 'break';
            })->count();
            
            return [
                'id' => $sup->id,
                'supervisor_name' => $sup->name,
                'total_agents' => $totalAgents,
                'active_agents' => $active,
                'on_break' => $onBreak,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    private function getQuarterlyRevenue()
    {
        $isSqlite = config('database.default') === 'sqlite';
        $monthFormat = $isSqlite ? "strftime('%m', created_at)" : "DATE_FORMAT(created_at, '%m')";

        $results = Booking::select(
            DB::raw('SUM(total_amount) as total'),
            DB::raw("$monthFormat as month_num")
        )
        ->where('created_at', '>=', now()->subMonths(6))
        ->groupBy('month_num')
        ->orderBy('month_num')
        ->get();

        // Map month numbers to names in PHP for cross-DB simplicity
        return $results->map(function($item) {
            $monthName = date("F", mktime(0, 0, 0, (int)$item->month_num, 1));
            return [
                'total' => (float)$item->total,
                'month' => $monthName
            ];
        });
    }
}
