<?php

namespace App\Http\Controllers;

use App\Domains\Booking\Models\Booking;
use App\Models\Client;
use App\Models\User;
use App\Models\CallLog;
use App\Models\PaymentAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
        $cacheKey = 'dashboard.admin.stats.v2';

        $data = Cache::remember($cacheKey, now()->addMinutes(15), function () {
            $today = now()->toDateString();
            
            $startOfMonth = now()->startOfMonth()->toDateTimeString();
            $endOfMonth = now()->endOfMonth()->toDateTimeString();
            $startOfPrevMonth = now()->subMonth()->startOfMonth()->toDateTimeString();
            $endOfPrevMonth = now()->subMonth()->endOfMonth()->toDateTimeString();

            $dailyRevenue = (float) PaymentAuth::query()
                ->whereExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('booking_payment_auth')
                        ->whereColumn('booking_payment_auth.payment_auth_id', 'payment_authorizations.id');
                })
                ->whereNotNull('collected_at')
                ->whereDate('collected_at', $today)
                ->sum('total_amount');

            $currentMonthRevenue = (float) Booking::query()
                ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->sum('total_amount');

            $previousMonthRevenue = (float) Booking::query()
                ->whereBetween('created_at', [$startOfPrevMonth, $endOfPrevMonth])
                ->sum('total_amount');

            $revenueGrowth = $previousMonthRevenue > 0
                ? round((($currentMonthRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100, 1)
                : ($currentMonthRevenue > 0 ? 100.0 : 0.0);

            $recentBookings = Booking::query()
                ->select(['id', 'booking_reference', 'client_id', 'agent_id', 'status', 'total_amount', 'currency', 'created_at'])
                ->with([
                    'client:id,first_name,last_name,name',
                    'agent:id,name',
                ])
                ->latest('created_at')
                ->limit(5)
                ->get();

            $chargeQueue = PaymentAuth::query()
                ->select(['id', 'client_id', 'currency', 'total_amount', 'approved_at', 'metadata', 'consent_snapshot', 'status', 'collected_at'])
                ->whereExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('booking_payment_auth')
                        ->whereColumn('booking_payment_auth.payment_auth_id', 'payment_authorizations.id');
                })
                ->where('status', 'Approved')
                ->whereNull('collected_at')
                ->with([
                    'client:id,first_name,last_name,name',
                    'bookings:id,booking_reference',
                ])
                ->latest('approved_at')
                ->limit(5)
                ->get();

            $summaryStats = DB::table('users')
                ->selectRaw("
                    (SELECT COUNT(*) FROM users) as total_staff,
                    (SELECT COUNT(*) FROM users WHERE status IN ('Active', 'On Call', 'active', 'on call')) as active_staff,
                    (SELECT COUNT(*) FROM clients) as total_clients,
                    (SELECT COUNT(*) FROM bookings) as total_bookings,
                    (SELECT COUNT(*) FROM call_logs WHERE log_scope = 'booking') as total_calls,
                    (SELECT COUNT(*) FROM bookings WHERE status = 'Pending') as pending_approvals,
                    (SELECT COUNT(*) FROM payment_authorizations pa 
                        WHERE EXISTS (SELECT 1 FROM booking_payment_auth bpa WHERE bpa.payment_auth_id = pa.id)
                        AND pa.status = 'Approved' 
                        AND pa.collected_at IS NULL
                    ) as ready_to_charge
                ")
                ->first();

            return [
                'total_staff' => (int) $summaryStats->total_staff,
                'active_staff' => (int) $summaryStats->active_staff,
                'total_clients' => (int) $summaryStats->total_clients,
                'total_bookings' => (int) $summaryStats->total_bookings,
                'total_calls' => (int) $summaryStats->total_calls,
                'daily_revenue' => $dailyRevenue,
                'monthly_revenue' => $currentMonthRevenue,
                'pending_approvals' => (int) $summaryStats->pending_approvals,
                'ready_to_charge' => (int) $summaryStats->ready_to_charge,
                'revenue_growth' => $revenueGrowth,
                'recent_bookings' => $recentBookings,
                'charge_queue' => $chargeQueue,
                'cache_timestamp' => now()->toDateTimeString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    private function getSupervisorStats($user)
    {
        $cacheKey = 'dashboard.supervisor.stats.' . $user->id;

        $data = Cache::remember($cacheKey, now()->addSeconds(45), function () use ($user) {
            $agentIds = $user->supervisedAgents()->pluck('users.id')->toArray();
            $teamIds = array_values(array_unique(array_merge([$user->id], $agentIds)));
            $startOfToday = now()->startOfDay()->toDateTimeString();
            $endOfToday = now()->endOfDay()->toDateTimeString();
            $weeklyThreshold = now()->subDays(7)->toDateTimeString();

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
                ->get(['id', 'name', 'email', 'status']);

            $callCounts = CallLog::query()
                ->select('agent_id', DB::raw('COUNT(*) as total_calls'))
                ->whereIn('agent_id', $agentIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startOfToday, $endOfToday])
                ->groupBy('agent_id')
                ->pluck('total_calls', 'agent_id');

            $airlineInquiryCounts = CallLog::query()
                ->select('agent_id', DB::raw('COUNT(*) as airline_inquiries'))
                ->whereIn('agent_id', $agentIds)
                ->where('log_scope', 'booking')
                ->where('created_at', '>=', $weeklyThreshold)
                ->whereNotNull('airline_inquiry')
                ->where('airline_inquiry', '!=', '')
                ->groupBy('agent_id')
                ->pluck('airline_inquiries', 'agent_id');

            return [
                'total_clients' => Client::whereIn('agent_id', $teamIds)
                    ->whereHas('bookings')
                    ->count(),
                'daily_revenue' => (float) Booking::whereIn('agent_id', $teamIds)
                    ->whereBetween('created_at', [$startOfToday, $endOfToday])
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
                'recent_bookings' => Booking::query()
                    ->select(['id', 'booking_reference', 'client_id', 'agent_id', 'status', 'total_amount', 'currency', 'created_at'])
                    ->with(['client:id,first_name,last_name,name', 'agent:id,name'])
                    ->whereIn('agent_id', $teamIds)
                    ->latest('created_at')
                    ->take(5)
                    ->get(),
                'recent_inquiries' => CallLog::query()
                    ->select(['id', 'agent_id', 'client_id', 'created_at', 'airline_inquiry', 'call_type', 'outcome'])
                    ->with(['agent:id,name', 'client:id,name,first_name,last_name'])
                    ->whereIn('agent_id', $agentIds)
                    ->where('log_scope', 'booking')
                    ->latest('created_at')
                    ->take(5)
                    ->get(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    private function getAgentStats($user)
    {
        $cacheKey = 'dashboard.agent.stats.' . $user->id;

        $data = Cache::remember($cacheKey, now()->addSeconds(45), function () use ($user) {
            $dailyRevenue = (float) Booking::where('agent_id', $user->id)
                ->whereDate('created_at', now()->toDateString())
                ->sum('total_amount');

            return [
                'my_bookings_count' => Booking::where('agent_id', $user->id)->count(),
                'my_revenue' => (float) Booking::where('agent_id', $user->id)->sum('total_amount'),
                'daily_revenue' => $dailyRevenue,
                'my_calls' => CallLog::where('agent_id', $user->id)->where('log_scope', 'booking')->count(),
                'recent_logs' => CallLog::query()
                    ->select(['id', 'agent_id', 'client_id', 'created_at', 'call_type', 'outcome', 'airline_inquiry', 'notes'])
                    ->where('agent_id', $user->id)
                    ->where('log_scope', 'booking')
                    ->latest('created_at')
                    ->take(5)
                    ->get(),
                'daily_target' => 75,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
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

        $cacheKey = 'dashboard.agent-monitor.' . ($user->hasRole('admin') ? 'admin' : 'supervisor.' . $user->id);

        $activityData = Cache::remember($cacheKey, now()->addSeconds(30), function () use ($agents) {
            $tz = config('app.timezone');
            $startOfToday = now()->timezone($tz)->startOfDay()->toDateTimeString();
            $endOfToday = now()->timezone($tz)->endOfDay()->toDateTimeString();
            $agentIds = $agents->pluck('id')->all();

            $activitiesByUser = \App\Models\UserActivity::query()
                ->select(['id', 'user_id', 'activity_type', 'created_at'])
                ->whereIn('user_id', $agentIds)
                ->whereBetween('created_at', [$startOfToday, $endOfToday])
                ->orderBy('created_at', 'asc')
                ->get()
                ->groupBy('user_id');

            $callCounts = CallLog::query()
                ->select('agent_id', DB::raw('COUNT(*) as total_calls'))
                ->whereIn('agent_id', $agentIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startOfToday, $endOfToday])
                ->groupBy('agent_id')
                ->pluck('total_calls', 'agent_id');

            $bookingStats = Booking::query()
                ->select('agent_id', DB::raw('COUNT(*) as bookings_created'), DB::raw('COALESCE(SUM(total_amount), 0) as daily_revenue'))
                ->whereIn('agent_id', $agentIds)
                ->whereBetween('created_at', [$startOfToday, $endOfToday])
                ->groupBy('agent_id')
                ->get()
                ->keyBy('agent_id');

            return $agents->map(function ($agent) use ($activitiesByUser, $callCounts, $bookingStats, $tz) {
                $activities = $activitiesByUser->get($agent->id, collect());
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

                $breakFormatted = $breakSeconds > 0 ? floor($breakSeconds / 60) . ' min' : '--';
                if ($breakSeconds >= 3600) {
                    $hours = floor($breakSeconds / 3600);
                    $mins = floor(($breakSeconds % 3600) / 60);
                    $breakFormatted = "{$hours}h {$mins}m";
                }

                $stats = $bookingStats->get($agent->id);

                return [
                    'id' => $agent->id,
                    'agent_name' => $agent->name,
                    'login_time' => $loginTime,
                    'status' => $agent->status ?? 'Offline',
                    'calls_picked' => (int) ($callCounts[$agent->id] ?? 0),
                    'bookings_created' => (int) ($stats->bookings_created ?? 0),
                    'daily_revenue' => (float) ($stats->daily_revenue ?? 0),
                    'break_time' => $breakFormatted,
                ];
            })->values();
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

        $data = Cache::remember('dashboard.admin-monitor', now()->addSeconds(30), function () {
            $supervisors = User::role('supervisor')->get(['id', 'name']);

            return $supervisors->map(function ($sup) {
                $agents = $sup->supervisedAgents()->get(['users.id', 'users.status']);
                $totalAgents = $agents->count();
                $active = $agents->filter(function ($agent) {
                    return in_array(strtolower((string) $agent->status), ['active', 'on call'], true);
                })->count();
                $onBreak = $agents->filter(function ($agent) {
                    return strtolower((string) $agent->status) === 'break';
                })->count();

                return [
                    'id' => $sup->id,
                    'supervisor_name' => $sup->name,
                    'total_agents' => $totalAgents,
                    'active_agents' => $active,
                    'on_break' => $onBreak,
                ];
            })->values();
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
