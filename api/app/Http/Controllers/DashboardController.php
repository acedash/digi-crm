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
            return $this->getAdminStats($request);
        } elseif ($user->hasRole('supervisor')) {
            return $this->getSupervisorStats($user);
        } else {
            return $this->getAgentStats($user);
        }
    }

    private function getAdminStats(Request $request)
    {
        $period = $request->get('period', 'monthly');
        $customStart = $request->get('start_date');
        $customEnd = $request->get('end_date');
        
        $cacheKey = 'dashboard.admin.stats.v4.' . $period;
        if ($period === 'custom') {
            $cacheKey .= "." . md5($customStart . $customEnd);
        }

        $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($period, $customStart, $customEnd) {
            $now = now();
            $currentStart = null;
            $currentEnd = $now->toDateTimeString();
            $prevStart = null;
            $prevEnd = null;

            switch ($period) {
                case 'daily':
                    $currentStart = $now->copy()->startOfDay()->toDateTimeString();
                    $prevStart = $now->copy()->subDay()->startOfDay()->toDateTimeString();
                    $prevEnd = $now->copy()->subDay()->endOfDay()->toDateTimeString();
                    break;
                case 'weekly':
                    $currentStart = $now->copy()->subDays(7)->toDateTimeString();
                    $prevStart = $now->copy()->subDays(14)->toDateTimeString();
                    $prevEnd = $now->copy()->subDays(7)->toDateTimeString();
                    break;
                case 'yearly':
                    $currentStart = $now->copy()->subYear()->toDateTimeString();
                    $prevStart = $now->copy()->subYears(2)->toDateTimeString();
                    $prevEnd = $now->copy()->subYear()->toDateTimeString();
                    break;
                case 'custom':
                    $start = $customStart ? now()->parse($customStart)->startOfDay() : $now->copy()->subDays(30);
                    $end = $customEnd ? now()->parse($customEnd)->endOfDay() : $now->copy();
                    $diffInDays = $start->diffInDays($end);
                    if ($diffInDays === 0) $diffInDays = 1;
                    
                    $currentStart = $start->toDateTimeString();
                    $currentEnd = $end->toDateTimeString();
                    $prevStart = $start->copy()->subDays($diffInDays)->toDateTimeString();
                    $prevEnd = $start->copy()->subSeconds(1)->toDateTimeString();
                    break;
                case 'monthly':
                default:
                    $currentStart = $now->copy()->subDays(30)->toDateTimeString();
                    $prevStart = $now->copy()->subDays(60)->toDateTimeString();
                    $prevEnd = $now->copy()->subDays(30)->toDateTimeString();
                    break;
            }

            $getTrend = function ($table, $cStart, $cEnd, $pStart, $pEnd, $valueCol = null) {
                // Single query using CASE WHEN instead of 2 separate queries
                $selectRaw = $valueCol
                    ? "SUM(CASE WHEN created_at BETWEEN ? AND ? THEN {$valueCol} ELSE 0 END) as current_val,
                       SUM(CASE WHEN created_at BETWEEN ? AND ? THEN {$valueCol} ELSE 0 END) as prev_val"
                    : "SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as current_val,
                       SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as prev_val";

                $row = DB::table($table)
                    ->selectRaw($selectRaw, [$cStart, $cEnd, $pStart, $pEnd])
                    ->first();

                $current = $valueCol ? (float) ($row->current_val ?? 0) : (int) ($row->current_val ?? 0);
                $previous = $valueCol ? (float) ($row->prev_val ?? 0) : (int) ($row->prev_val ?? 0);

                $growth = $previous > 0
                    ? round((($current - $previous) / $previous) * 100, 1)
                    : ($current > 0 ? 100.0 : 0.0);

                return ['current' => $current, 'previous' => $previous, 'growth' => $growth];
            };

            $bookingRevenueTrend = $getTrend('bookings', $currentStart, $currentEnd, $prevStart, $prevEnd, 'total_amount');
            $bookingCountTrend   = $getTrend('bookings', $currentStart, $currentEnd, $prevStart, $prevEnd, null);
            $clientTrend         = $getTrend('clients',  $currentStart, $currentEnd, $prevStart, $prevEnd, null);
            $callTrend           = $getTrend('call_logs', $currentStart, $currentEnd, $prevStart, $prevEnd, null);
            $staffTrend          = $getTrend('users',    $currentStart, $currentEnd, $prevStart, $prevEnd, null);

            $recentBookings = Booking::query()
                ->select(['id', 'booking_reference', 'client_id', 'agent_id', 'status', 'total_amount', 'currency', 'created_at'])
                ->with(['client:id,first_name,last_name,name', 'agent:id,name'])
                ->latest('created_at')
                ->limit(5)
                ->get();

            $chargeQueue = PaymentAuth::query()
                ->select(['id', 'client_id', 'currency', 'total_amount', 'approved_at', 'metadata', 'consent_snapshot', 'status', 'collected_at'])
                ->whereExists(function ($query) {
                    $query->select(DB::raw(1))->from('booking_payment_auth')->whereColumn('booking_payment_auth.payment_auth_id', 'payment_authorizations.id');
                })
                ->where('status', 'Approved')
                ->whereNull('collected_at')
                ->with(['client:id,first_name,last_name,name', 'bookings:id,booking_reference'])
                ->latest('approved_at')
                ->limit(5)
                ->get();

            // Combine the 5 global count queries into one
            $globalCounts = DB::selectOne("
                SELECT
                    (SELECT COUNT(*) FROM users) as total_staff,
                    (SELECT COUNT(*) FROM users WHERE LOWER(status) IN ('active', 'on call')) as active_staff,
                    (SELECT COUNT(*) FROM clients) as total_clients,
                    (SELECT COUNT(*) FROM bookings) as total_bookings,
                    (SELECT COUNT(*) FROM call_logs WHERE log_scope = 'booking') as total_calls,
                    (SELECT COUNT(*) FROM bookings WHERE status = 'Pending') as pending_approvals,
                    (SELECT COUNT(*) FROM payment_authorizations pa
                        WHERE pa.status = 'Approved' AND pa.collected_at IS NULL
                        AND EXISTS (SELECT 1 FROM booking_payment_auth bpa WHERE bpa.payment_auth_id = pa.id)
                    ) as ready_to_charge
            ");

            $totalStaffAll    = $globalCounts->total_staff;
            $activeStaff      = $globalCounts->active_staff;
            $totalClientsAll  = $globalCounts->total_clients;
            $totalBookingsAll = $globalCounts->total_bookings;
            $totalCallsAll    = $globalCounts->total_calls;
            $pendingApprovals = $globalCounts->pending_approvals;
            $readyToCharge    = $globalCounts->ready_to_charge;

            $isSqlite = config('database.default') === 'sqlite';
            $monthFormat = $isSqlite ? "strftime('%m', created_at)" : "DATE_FORMAT(created_at, '%m')";
            $yearFormat = $isSqlite ? "strftime('%Y', created_at)" : "DATE_FORMAT(created_at, '%Y')";
            
            $trendStart = now()->subMonths(6)->startOfMonth()->toDateTimeString();

            $revenueTrends = Booking::query()
                ->select(
                    DB::raw('SUM(total_amount) as amount'),
                    DB::raw("$monthFormat as month_num"),
                    DB::raw("$yearFormat as year_num")
                )
                ->where('created_at', '>=', $trendStart)
                ->groupBy('year_num', 'month_num')
                ->orderBy('year_num', 'asc')
                ->orderBy('month_num', 'asc')
                ->get()
                ->map(function ($item) {
                    $monthName = date("M", mktime(0, 0, 0, (int)$item->month_num, 1));
                    return ['name' => $monthName, 'revenue' => (float)$item->amount];
                });

            $bookingStatusDistribution = Booking::select('status', DB::raw('count(*) as total'))
                ->whereBetween('created_at', [$currentStart, $currentEnd])
                ->groupBy('status')
                ->get()
                ->map(function ($item) {
                    return ['name' => $item->status, 'value' => $item->total];
                });

            return [
                'staff' => [
                    'total' => $totalStaffAll,
                    'active' => $activeStaff,
                    'period_count' => $staffTrend['current'],
                    'growth' => $staffTrend['growth']
                ],
                'clients' => [
                    'total' => $totalClientsAll,
                    'period_count' => $clientTrend['current'],
                    'growth' => $clientTrend['growth']
                ],
                'bookings' => [
                    'total' => $totalBookingsAll,
                    'period_count' => (int) $bookingCountTrend['current'],
                    'count_trend' => $bookingCountTrend,
                    'growth' => $bookingCountTrend['growth']
                ],
                'calls' => [
                    'total' => $totalCallsAll,
                    'period_count' => $callTrend['current'],
                    'growth' => $callTrend['growth']
                ],
                'revenue' => [
                    'daily' => (float) PaymentAuth::whereNotNull('collected_at')->whereDate('collected_at', now()->toDateString())->sum('total_amount'),
                    'period_total' => $bookingRevenueTrend['current'],
                    'growth' => $bookingRevenueTrend['growth']
                ],
                'pending_approvals' => $pendingApprovals,
                'ready_to_charge' => $readyToCharge,
                'recent_bookings' => $recentBookings,
                'charge_queue' => $chargeQueue,
                'revenue_trends' => $revenueTrends,
                'booking_status_distribution' => $bookingStatusDistribution,
                'booking_status_trends' => $this->getStatusTrends(null, $trendStart, $monthFormat, $yearFormat),
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
        $request = request();
        $period = $request->get('period', 'monthly');
        $cacheKey = 'dashboard.supervisor.stats.v4.' . $user->id . '.' . $period;

        // Simplified range logic for Supervisor
        $now = now();
        $startDate = null;
        $endDate = $now->toDateTimeString();

        switch ($period) {
            case 'daily':
                $startDate = $now->copy()->startOfDay()->toDateTimeString();
                break;
            case 'weekly':
                $startDate = $now->copy()->subDays(7)->toDateTimeString();
                break;
            case 'yearly':
                $startDate = $now->copy()->subYear()->toDateTimeString();
                break;
            case 'custom':
                $startDate = $request->get('start_date') ? now()->parse($request->get('start_date'))->startOfDay()->toDateTimeString() : $now->copy()->subDays(30)->toDateTimeString();
                $endDate = $request->get('end_date') ? now()->parse($request->get('end_date'))->endOfDay()->toDateTimeString() : $now->toDateTimeString();
                break;
            case 'monthly':
            default:
                $startDate = $now->copy()->subDays(30)->toDateTimeString();
                break;
        }

        $cacheDuration = ($period === 'daily' || $period === 'custom') ? 45 : 300; // 5 mins for weekly/monthly/yearly

        $data = Cache::remember($cacheKey, now()->addSeconds($cacheDuration), function () use ($user, $startDate, $endDate, $period) {
            $agentIds = $user->supervisedAgents()->pluck('users.id')->toArray();
            $teamIds = array_values(array_unique(array_merge([$user->id], $agentIds)));
            
            // For trends, always look at last 6 months regardless of period
            $trendStart = now()->subMonths(6)->startOfMonth()->toDateTimeString();

            // Aggregated Team KPI (Bookings & Revenue) in 1 query
            $teamKpi = Booking::query()
                ->whereIn('agent_id', $teamIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->selectRaw('COUNT(*) as total_count, SUM(total_amount) as total_revenue')
                ->first();

            $agents = User::role('agent')
                ->whereHas('supervisors', function ($query) use ($user) {
                    $query->where('users.id', $user->id);
                })
                ->get(['id', 'name', 'email', 'status']);

            $agentPerfCounts = Booking::query()
                ->whereIn('agent_id', $teamIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->select('agent_id', DB::raw('COUNT(*) as count'))
                ->groupBy('agent_id')
                ->pluck('count', 'agent_id');

            $callCounts = CallLog::query()
                ->select('agent_id', DB::raw('COUNT(*) as total_calls'))
                ->whereIn('agent_id', $teamIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('agent_id')
                ->pluck('total_calls', 'agent_id');

            $inquiryCounts = CallLog::query()
                ->select('agent_id', DB::raw('COUNT(*) as total_inquiries'))
                ->whereIn('agent_id', $teamIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('agent_id')
                ->pluck('total_inquiries', 'agent_id');

            // Categorized inquiry tags per agent
            $agentInquiryDetails = CallLog::query()
                ->select('agent_id', 'airline_inquiry', DB::raw('COUNT(*) as count'))
                ->whereIn('agent_id', $teamIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereNotNull('airline_inquiry')
                ->where('airline_inquiry', '!=', '')
                ->groupBy('agent_id', 'airline_inquiry')
                ->get()
                ->groupBy('agent_id');

            // Per-agent revenue counts in the period
            $agentRevenueCounts = Booking::query()
                ->select('agent_id', DB::raw('SUM(total_amount) as total_revenue'))
                ->whereIn('agent_id', $teamIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('agent_id')
                ->pluck('total_revenue', 'agent_id');

            // Today's login times via UserActivity
            $tz = config('app.timezone');
            $startOfToday = now()->timezone($tz)->startOfDay()->toDateTimeString();
            $loginActivities = \App\Models\UserActivity::query()
                ->whereIn('user_id', $teamIds)
                ->where('activity_type', 'login')
                ->where('created_at', '>=', $startOfToday)
                ->orderBy('created_at', 'asc')
                ->get()
                ->groupBy('user_id');

            // Inquiry Tags Breakdown
            $inquiryTags = CallLog::query()
                ->select('airline_inquiry', DB::raw('COUNT(*) as count'))
                ->whereIn('agent_id', $teamIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereNotNull('airline_inquiry')
                ->where('airline_inquiry', '!=', '')
                ->groupBy('airline_inquiry')
                ->get()
                ->map(fn($item) => ['tag' => $item->airline_inquiry, 'count' => $item->count])
                ->values();

            // Status Breakdown
            $statusBreakdown = Booking::query()
                ->select('status', DB::raw('COUNT(*) as count'))
                ->whereIn('agent_id', $teamIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('status')
                ->get()
                ->map(fn($item) => ['status' => $item->status, 'count' => $item->count])
                ->values();

            // Revenue Trend (Last 6 Months) optimized
            $isSqlite = config('database.default') === 'sqlite';
            $monthFormat = $isSqlite ? "strftime('%m', created_at)" : "DATE_FORMAT(created_at, '%m')";
            $yearFormat = $isSqlite ? "strftime('%Y', created_at)" : "DATE_FORMAT(created_at, '%Y')";

            $revenueTrends = Booking::query()
                ->select(
                    DB::raw('SUM(total_amount) as amount'),
                    DB::raw("$monthFormat as month_num"),
                    DB::raw("$yearFormat as year_num")
                )
                ->whereIn('agent_id', $teamIds)
                ->where('created_at', '>=', $trendStart)
                ->groupBy('year_num', 'month_num')
                ->orderBy('year_num', 'asc')
                ->orderBy('month_num', 'asc')
                ->get()
                ->map(function ($item) {
                    $monthName = date("M", mktime(0, 0, 0, (int)$item->month_num, 1));
                    return ['name' => $monthName, 'revenue' => (float)$item->amount];
                });

            return [
                'total_clients' => Client::whereIn('agent_id', $teamIds)
                    ->whereHas('bookings', function($q) use ($startDate, $endDate) {
                        $q->whereBetween('created_at', [$startDate, $endDate]);
                    })->count(),
                'daily_revenue' => (float) ($teamKpi->total_revenue ?? 0),
                'period_bookings' => (int) ($teamKpi->total_count ?? 0),
                'inquiry_tags' => $inquiryTags,
                'status_breakdown' => $statusBreakdown,
                'revenue_trends' => $revenueTrends,
                'booking_status_trends' => $this->getStatusTrends($teamIds, $trendStart, $monthFormat, $yearFormat),
                'agent_performance' => $agents->map(function ($agent) use ($callCounts, $inquiryCounts, $agentPerfCounts, $agentInquiryDetails, $loginActivities, $agentRevenueCounts, $tz) {
                    $inqDetails = $agentInquiryDetails->get($agent->id, collect())->map(function($item) {
                        return [
                            'tag' => $item->airline_inquiry,
                            'count' => $item->count
                        ];
                    })->values();

                    $login = $loginActivities->get($agent->id, collect())->first();
                    $loginTime = $login ? $login->created_at->timezone($tz)->format('h:i A') : '--';

                    return [
                        'id' => $agent->id,
                        'name' => $agent->name,
                        'email' => $agent->email,
                        'status' => $agent->status,
                        'bookings_count' => (int) ($agentPerfCounts[$agent->id] ?? 0),
                        'calls_count' => (int) ($callCounts[$agent->id] ?? 0),
                        'inquiries_count' => (int) ($inquiryCounts[$agent->id] ?? 0),
                        'inquiry_details' => $inqDetails,
                        'revenue' => (float) ($agentRevenueCounts[$agent->id] ?? 0),
                        'login_time' => $loginTime,
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
                    ->select(['id', 'agent_id', 'client_id', 'created_at', 'airline_inquiry', 'call_type', 'customer_outcome'])
                    ->with(['agent:id,name', 'client:id,name,first_name,last_name'])
                    ->whereIn('agent_id', $teamIds)
                    ->where('log_scope', 'booking')
                    ->latest('created_at')
                    ->take(5)
                    ->get(),
                'period_label' => $period
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
                    ->select(['id', 'agent_id', 'client_id', 'created_at', 'call_type', 'customer_outcome', 'airline_inquiry', 'notes'])
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

        $data = Cache::remember('dashboard.admin-monitor', now()->addMinutes(2), function () {
            $supervisors = User::role('supervisor')
                ->with(['supervisedAgents' => function ($query) {
                    $query->select('users.id', 'users.status');
                }])
                ->get(['id', 'name']);

            return $supervisors->map(function ($sup) {
                $agents = $sup->supervisedAgents;
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

    private function getStatusTrends($agentIds, $startDate, $monthFormat, $yearFormat)
    {
        $allRelevantStatuses = [
            'Confirmed', 'Approved', 'Completed', 'Change Approved', 
            'Pending', 'Draft', 'Awaiting Approval', 'Awaiting Change Approval', 'Work Pending'
        ];

        $query = Booking::query()
            ->select(
                DB::raw('COUNT(*) as count'),
                DB::raw('status'),
                DB::raw("$monthFormat as month_num"),
                DB::raw("$yearFormat as year_num")
            )
            ->whereIn('status', $allRelevantStatuses)
            ->where('created_at', '>=', $startDate);

        if ($agentIds !== null) {
            $query->whereIn('agent_id', $agentIds);
        }

        $results = $query->groupBy('year_num', 'month_num', 'status')
            ->orderBy('year_num', 'asc')
            ->orderBy('month_num', 'asc')
            ->get();

        $confirmedBuckets = ['Confirmed', 'Approved', 'Completed', 'Change Approved'];
        
        $trends = [];
        foreach ($results as $row) {
            $monthName = date("M", mktime(0, 0, 0, (int)$row->month_num, 1));
            $key = $row->year_num . '-' . $row->month_num;
            
            if (!isset($trends[$key])) {
                $trends[$key] = [
                    'name' => $monthName,
                    'Confirmed' => 0,
                    'Pending' => 0
                ];
            }
            
            // Map the internal status to one of the two graph categories
            $category = in_array($row->status, $confirmedBuckets) ? 'Confirmed' : 'Pending';
            $trends[$key][$category] += (int) $row->count;
        }

        return array_values($trends);
    }
}
