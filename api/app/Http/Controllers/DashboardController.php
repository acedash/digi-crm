<?php

namespace App\Http\Controllers;

use App\Domains\Booking\Models\Booking;
use App\Models\Client;
use App\Models\User;
use App\Models\CallLog;
use App\Models\PaymentAuth;
use App\Models\UserActivity;
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
                case 'yesterday':
                    $currentStart = $now->copy()->subDay()->startOfDay()->toDateTimeString();
                    $currentEnd = $now->copy()->subDay()->endOfDay()->toDateTimeString();
                    $prevStart = $now->copy()->subDays(2)->startOfDay()->toDateTimeString();
                    $prevEnd = $now->copy()->subDays(2)->endOfDay()->toDateTimeString();
                    break;
                case 'all':
                    $currentStart = '2020-01-01 00:00:00'; // Assuming this as beginning of time
                    $prevStart = '2019-01-01 00:00:00';
                    $prevEnd = '2019-12-31 23:59:59';
                    break;
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

            // Optimization: select only needed columns and eager load efficiently
            $recentBookings = Booking::query()
                ->select(['id', 'booking_reference', 'client_id', 'agent_id', 'status', 'total_amount', 'currency', 'created_at'])
                ->with(['client:id,first_name,last_name,name,email,phone', 'agent:id,name'])
                ->latest('created_at')
                ->limit(5)
                ->get();

            $chargeQueue = PaymentAuth::query()
                ->select(['id', 'client_id', 'currency', 'total_amount', 'approved_at', 'status', 'collected_at']) // Strictly avoid consent_snapshot/metadata
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
            
            $revenueTrendStart = now()->subMonths(12)->startOfMonth()->toDateTimeString();
            $trendStart = now()->subMonths(6)->startOfMonth()->toDateTimeString();

            $revenueTrends = Booking::query()
                ->select(
                    DB::raw('SUM(total_amount) as amount'),
                    DB::raw("$monthFormat as month_num"),
                    DB::raw("$yearFormat as year_num")
                )
                ->where('created_at', '>=', $revenueTrendStart)
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

        $cacheDuration = ($period === 'daily' || $period === 'custom') ? 30 : 600; // 30 sec for live data, 10 mins for others

        $data = Cache::remember($cacheKey, now()->addSeconds($cacheDuration), function () use ($user, $startDate, $endDate, $period) {
            $agentIds = $user->supervisedAgents()->pluck('users.id')->toArray();
            $teamIds = array_values(array_unique(array_merge([$user->id], $agentIds)));
            
            // For trends, always look at last 12 months
            $trendStart = now()->subMonths(12)->startOfMonth()->toDateTimeString();

            // 1. Optimized Combined Agent KPI Query
            // This replaces 5+ separate queries (agentPerfCounts, agentRevenueCounts, etc.)
            $agentStats = Booking::query()
                ->whereIn('agent_id', $teamIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->select('agent_id', 
                    DB::raw('COUNT(*) as bookings_count'), 
                    DB::raw('SUM(total_amount) as total_revenue')
                )
                ->groupBy('agent_id')
                ->get()
                ->keyBy('agent_id');

            $callStats = CallLog::query()
                ->whereIn('agent_id', $teamIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->select('agent_id', 
                    DB::raw('COUNT(*) as total_calls'),
                    DB::raw('SUM(CASE WHEN airline_inquiry IS NOT NULL AND airline_inquiry != "" THEN 1 ELSE 0 END) as total_inquiries')
                )
                ->groupBy('agent_id')
                ->get()
                ->keyBy('agent_id');

            $teamKpi = [
                'total_count' => $agentStats->sum('bookings_count'),
                'total_revenue' => $agentStats->sum('total_revenue')
            ];

            $agents = $user->supervisedAgents()
                ->select(['users.id', 'users.name', 'users.email', 'users.status'])
                ->get();
            
            // Add supervisor to the list so they can track their own performance too
            $agents->push($user);
            
            // Ensure unique list just in case
            $agents = $agents->unique('id')->values();

            // 2. Aggregate Inquiry Tags from JSON keys
            $rawInquiries = CallLog::query()
                ->whereIn('agent_id', $teamIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->whereNotNull('airline_inquiry')
                ->pluck('airline_inquiry');

            $tagCounts = [];
            foreach ($rawInquiries as $inquiry) {
                if (is_array($inquiry)) {
                    foreach ($inquiry as $tag => $detail) {
                        if ($detail && count(array_filter([$detail]))) {
                            $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
                        }
                    }
                }
            }
            
            $inquiryTags = collect($tagCounts)->map(fn($count, $tag) => ['tag' => $tag, 'count' => $count])
                ->sortByDesc('count')
                ->values();

            $statusBreakdown = Booking::query()
                ->select('status', DB::raw('COUNT(*) as count'))
                ->whereIn('agent_id', $teamIds)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('status')
                ->get();

            // Optimized Inquiry Details (avoid nested loops in mapping if possible)
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

            // Revenue Trend (Last 6 Months) optimized
            $isSqlite = config('database.default') === 'sqlite';
            $monthFormat = $isSqlite ? "strftime('%m', created_at)" : "DATE_FORMAT(created_at, '%m')";
            $yearFormat = $isSqlite ? "strftime('%Y', created_at)" : "DATE_FORMAT(created_at, '%Y')";

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

            // Optimized Total Clients (JOIN is often faster than whereExists for small sets on high-load servers)
            $totalClients = DB::table('clients')
                ->join('bookings', 'bookings.client_id', '=', 'clients.id')
                ->whereIn('clients.agent_id', $teamIds)
                ->whereBetween('bookings.created_at', [$startDate, $endDate])
                ->distinct('clients.id')
                ->count('clients.id');

            return [
                'total_clients' => $totalClients,
                'daily_revenue' => (float) ($teamKpi['total_revenue'] ?? 0),
                'period_bookings' => (int) ($teamKpi['total_count'] ?? 0),
                'inquiry_tags' => $inquiryTags,
                'status_breakdown' => $statusBreakdown,
                'revenue_trends' => $revenueTrends,
                'booking_status_trends' => $this->getStatusTrends($teamIds, $trendStart, $monthFormat, $yearFormat),
                'agent_performance' => $agents->map(function ($agent) use ($agentStats, $callStats, $agentInquiryDetails, $loginActivities, $tz) {
                    $stats = $agentStats->get($agent->id);
                    $calls = $callStats->get($agent->id);
                    
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
                        'bookings_count' => (int) ($stats->bookings_count ?? 0),
                        'calls_count' => (int) ($calls->total_calls ?? 0),
                        'inquiries_count' => (int) ($calls->total_inquiries ?? 0),
                        'inquiry_details' => $inqDetails,
                        'revenue' => (float) ($stats->total_revenue ?? 0),
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
                    ->select(['id', 'agent_id', 'client_id', 'created_at', 'airline_inquiry', 'call_type', 'customer_outcome']) // Avoid heavy 'notes' in summary
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

        $period = $request->get('period', 'live');
        $customStart = $request->get('start_date');
        $customEnd = $request->get('end_date');

        $cacheKey = 'dashboard.agent-monitor.v2.' . ($user->hasRole('admin') ? 'admin' : 'supervisor.' . $user->id) . '.' . $period;
        if ($period === 'custom') {
            $cacheKey .= '.' . md5($customStart . $customEnd);
        }

        $activityData = Cache::remember($cacheKey, now()->addSeconds(30), function () use ($agents, $period, $customStart, $customEnd) {
            $tz = config('app.timezone');
            $agentIds = $agents->pluck('id')->all();

            $start = now()->timezone($tz)->startOfDay();
            $end = now()->timezone($tz)->endOfDay();

            if ($period !== 'live') {
                switch ($period) {
                    case 'yesterday':
                        $start = now()->timezone($tz)->subDay()->startOfDay();
                        $end = now()->timezone($tz)->subDay()->endOfDay();
                        break;
                    case 'weekly':
                        $start = now()->timezone($tz)->subDays(7)->startOfDay();
                        break;
                    case 'monthly':
                        $start = now()->timezone($tz)->subDays(30)->startOfDay();
                        break;
                    case 'all':
                        $start = now()->timezone($tz)->subYears(5)->startOfDay();
                        break;
                    case 'custom':
                        $start = $customStart ? now()->parse($customStart)->timezone($tz)->startOfDay() : now()->timezone($tz)->subDays(30);
                        $end = $customEnd ? now()->parse($customEnd)->timezone($tz)->endOfDay() : now()->timezone($tz);
                        break;
                    case 'daily':
                    default:
                        $start = now()->timezone($tz)->startOfDay();
                        $end = now()->timezone($tz)->endOfDay();
                        break;
                }
            }

            $activitiesByUser = \App\Models\UserActivity::query()
                ->select(['id', 'user_id', 'activity_type', 'created_at'])
                ->whereIn('user_id', $agentIds)
                ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->orderBy('created_at', 'asc')
                ->get()
                ->groupBy('user_id');

            $callCounts = CallLog::query()
                ->select('agent_id', DB::raw('COUNT(*) as total_calls'))
                ->whereIn('agent_id', $agentIds)
                ->where('log_scope', 'booking')
                ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->groupBy('agent_id')
                ->pluck('total_calls', 'agent_id');

            $bookingStats = Booking::query()
                ->select('agent_id', DB::raw('COUNT(*) as bookings_created'), DB::raw('COALESCE(SUM(total_amount), 0) as period_revenue'))
                ->whereIn('agent_id', $agentIds)
                ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->groupBy('agent_id')
                ->get()
                ->keyBy('agent_id');

            return $agents->map(function ($agent) use ($activitiesByUser, $callCounts, $bookingStats, $tz, $period) {
                $activities = $activitiesByUser->get($agent->id, collect());
                $loginActivity = $activities->firstWhere('activity_type', 'login');
                $loginTime = $loginActivity ? $loginActivity->created_at->timezone($tz)->format('h:i A') : '--';

                $breakSeconds = 0;
                $totalLoginSeconds = 0;
                $currentSegmentStart = null;
                $currentSegmentType = null;
                $sessionStart = null;

                foreach ($activities as $activity) {
                    $type = $activity->activity_type;

                    if ($type === 'login') {
                        $sessionStart = $activity->created_at;
                    } elseif ($type === 'logout' && $sessionStart) {
                        $totalLoginSeconds += abs($activity->created_at->diffInSeconds($sessionStart));
                        $sessionStart = null;
                    }

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

                if ($sessionStart) {
                    $totalLoginSeconds += abs(now()->diffInSeconds($sessionStart));
                }

                if ($currentSegmentStart && $currentSegmentType === 'break') {
                    $breakSeconds += abs(now()->diffInSeconds($currentSegmentStart));
                }

                $stats = $bookingStats->get($agent->id);

                return [
                    'id' => $agent->id,
                    'agent_name' => $agent->name,
                    'login_time' => $loginTime,
                    'status' => $agent->status ?? 'Offline',
                    'calls_picked' => (int) ($callCounts[$agent->id] ?? 0),
                    'bookings_created' => (int) ($stats->bookings_created ?? 0),
                    'daily_revenue' => (float) ($stats->period_revenue ?? 0),
                    'break_time' => $this->formatSeconds($breakSeconds),
                    'total_login_time' => $this->formatSeconds($totalLoginSeconds),
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

        $period = $request->get('period', 'live');
        $customStart = $request->get('start_date');
        $customEnd = $request->get('end_date');

        $cacheKey = 'dashboard.admin-monitor.v2.' . $period;
        if ($period === 'custom') {
            $cacheKey .= '.' . md5($customStart . $customEnd);
        }

        $data = Cache::remember($cacheKey, now()->addMinutes(2), function () use ($period, $customStart, $customEnd) {
            $supervisors = User::role('supervisor')
                ->with(['supervisedAgents' => function ($query) {
                    $query->select('users.id', 'users.status');
                }])
                ->get(['id', 'name']);

            $start = now()->timezone($tz)->startOfDay();
            $end = now()->timezone($tz)->endOfDay();

            if ($period !== 'live') {
                switch ($period) {
                    case 'yesterday':
                        $start = now()->timezone($tz)->subDay()->startOfDay();
                        $end = now()->timezone($tz)->subDay()->endOfDay();
                        break;
                    case 'weekly':
                        $start = now()->timezone($tz)->subDays(7)->startOfDay();
                        break;
                    case 'monthly':
                        $start = now()->timezone($tz)->subDays(30)->startOfDay();
                        break;
                    case 'all':
                        $start = now()->timezone($tz)->subYears(5)->startOfDay();
                        break;
                    case 'custom':
                        $start = $customStart ? now()->parse($customStart)->timezone($tz)->startOfDay() : now()->timezone($tz)->subDays(30);
                        $end = $customEnd ? now()->parse($customEnd)->timezone($tz)->endOfDay() : now()->timezone($tz);
                        break;
                    case 'daily':
                    default:
                        $start = now()->timezone($tz)->startOfDay();
                        $end = now()->timezone($tz)->endOfDay();
                        break;
                }
            }

            // Get supervisor logins
            $supIds = $supervisors->pluck('id')->toArray();
            $logins = \App\Models\UserActivity::whereIn('user_id', $supIds)
                ->where('activity_type', 'login')
                ->whereDate('created_at', now()->toDateString())
                ->orderBy('created_at', 'asc')
                ->get()
                ->groupBy('user_id');

            return $supervisors->map(function ($sup) use ($period, $start, $end, $logins, $tz) {
                $agents = $sup->supervisedAgents;
                $agentIds = $agents->pluck('id')->toArray();
                
                $login = $logins->get($sup->id, collect())->first();
                $loginTime = $login ? $login->created_at->timezone($tz)->format('h:i A') : '--';

                // Calculate Revenue for the team
                $teamRevenue = Booking::whereIn('agent_id', $agentIds)
                    ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                    ->sum('total_amount');

                if ($period === 'live') {
                    $totalAgents = $agents->count();
                    $active = $agents->filter(function ($agent) {
                        return in_array(strtolower((string) $agent->status), ['active', 'on call'], true);
                    })->count();
                    $onBreak = $agents->filter(function ($agent) {
                        return strtolower((string) $agent->status) === 'break';
                    })->count();
                } else {
                    // Historical aggregation from UserActivity
                    $activeAgentIds = \App\Models\UserActivity::whereIn('user_id', $agentIds)
                        ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                        ->whereIn('activity_type', ['login', 'on_call', 'idle'])
                        ->distinct('user_id')
                        ->pluck('user_id')
                        ->toArray();

                    $breakAgentIds = \App\Models\UserActivity::whereIn('user_id', $agentIds)
                        ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                        ->where('activity_type', 'break_start')
                        ->distinct('user_id')
                        ->pluck('user_id')
                        ->toArray();

                    $totalAgents = count(array_unique(array_merge($activeAgentIds, $breakAgentIds)));
                    $active = count($activeAgentIds);
                    $onBreak = count($breakAgentIds);
                }

                return [
                    'id' => $sup->id,
                    'supervisor_name' => $sup->name,
                    'login_time' => $loginTime,
                    'total_agents' => $totalAgents,
                    'active_agents' => $active,
                    'on_break' => $onBreak,
                    'revenue' => (float) $teamRevenue,
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

    public function getAgentStatsReport(Request $request, $agentId)
    {
        $user = $request->user();
        $agent = User::findOrFail($agentId);

        // Security: Admins can see all, Supervisors only their team
        if (!$user->hasRole('admin')) {
            if ($user->hasRole('supervisor')) {
                if (!$user->supervisedAgents()->where('users.id', $agentId)->exists()) {
                    return response()->json(['success' => false, 'message' => 'Unauthorized access to agent report'], 403);
                }
            } else {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
        }

        $period = $request->get('period', 'daily');
        $customStart = $request->get('start_date');
        $customEnd = $request->get('end_date');

        $isSqlite = config('database.default') === 'sqlite';
        $monthFormat = $isSqlite ? "strftime('%m', created_at)" : "DATE_FORMAT(created_at, '%m')";
        $yearFormat = $isSqlite ? "strftime('%Y', created_at)" : "DATE_FORMAT(created_at, '%Y')";
        
        $start = null;
        $end = now();

        switch ($period) {
            case 'all':
                $start = now()->parse('2020-01-01');
                break;
            case 'daily':
                $start = now()->startOfDay();
                break;
            case 'weekly':
                $start = now()->subDays(7);
                break;
            case 'monthly':
                $start = now()->subDays(30);
                break;
            case 'custom':
                $start = $customStart ? now()->parse($customStart)->startOfDay() : now()->subDays(30);
                $end = $customEnd ? now()->parse($customEnd)->endOfDay() : now();
                break;
            default:
                $start = now()->startOfDay();
        }

        $revenueTrendStart = now()->subMonths(12)->startOfMonth()->toDateTimeString();
        $trendStart = now()->subMonths(6)->startOfMonth()->toDateTimeString();

        $revenueTrends = Booking::query()
            ->select(
                DB::raw('SUM(total_amount) as amount'),
                DB::raw("$monthFormat as month_num"),
                DB::raw("$yearFormat as year_num")
            )
            ->where('agent_id', $agentId)
            ->where('created_at', '>=', $revenueTrendStart)
            ->groupBy('year_num', 'month_num')
            ->orderBy('year_num', 'asc')
            ->orderBy('month_num', 'asc')
            ->get()
            ->map(function ($item) {
                $monthName = date("M", mktime(0, 0, 0, (int)$item->month_num, 1));
                return ['name' => $monthName, 'revenue' => (float)$item->amount];
            });

        $statusDistribution = Booking::select('status', DB::raw('count(*) as total'))
            ->where('agent_id', $agentId)
            ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return ['name' => $item->status, 'value' => $item->total];
            });

        $recentCalls = CallLog::query()
            ->select(['id', 'agent_id', 'client_id', 'created_at', 'call_type', 'customer_outcome', 'airline_inquiry', 'notes'])
            ->with(['client:id,name,first_name,last_name'])
            ->where('agent_id', $agentId)
            ->where('log_scope', 'booking')
            ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->latest('created_at')
            ->take(10)
            ->get();

        $statsQuery = Booking::where('agent_id', $agentId)
            ->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()]);

        $stats = [
            'total_bookings' => (int) $statsQuery->count(),
            'total_revenue' => (float) $statsQuery->sum('total_amount'),
            'daily_revenue' => (float) Booking::where('agent_id', $agentId)->whereDate('created_at', now()->toDateString())->sum('total_amount'),
            'total_calls' => CallLog::where('agent_id', $agentId)->where('log_scope', 'booking')->whereBetween('created_at', [$start->toDateTimeString(), $end->toDateTimeString()])->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'agent' => [
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'email' => $agent->email,
                    'status' => $agent->status,
                ],
                'stats' => $stats,
                'revenue_trends' => $revenueTrends,
                'status_distribution' => $statusDistribution,
                'recent_calls' => $recentCalls,
                'status_trends' => $this->getStatusTrends([$agentId], $trendStart, $monthFormat, $yearFormat),
                'period' => $period,
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString()
            ]
        ]);
    }
    public function getAttendanceReport(Request $request)
    {
        $user = $request->user();
        if (!$user->hasRole('admin') && !$user->hasRole('supervisor')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $month = (int) $request->get('month', now()->month);
        $year = (int) $request->get('year', now()->year);
        
        $startOfMonth = now()->month($month)->year($year)->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();
        
        if ($user->hasRole('admin')) {
            $agents = User::role(['agent', 'supervisor'])->get(['id', 'name']);
        } else {
            $agents = $user->supervisedAgents()->get(['users.id', 'users.name']);
        }

        $agentIds = $agents->pluck('id')->toArray();

        $activities = UserActivity::query()
            ->whereIn('user_id', $agentIds)
            ->whereBetween('created_at', [$startOfMonth->toDateTimeString(), $endOfMonth->toDateTimeString()])
            ->orderBy('created_at', 'asc')
            ->get()
            ->groupBy(function($activity) {
                return $activity->user_id . '_' . $activity->created_at->format('Y-m-d');
            });

        $report = [];
        foreach ($agents as $agent) {
            $agentData = [
                'id' => $agent->id,
                'name' => $agent->name,
                'days' => []
            ];

            for ($date = $startOfMonth->copy(); $date <= $endOfMonth; $date->addDay()) {
                $dayKey = $agent->id . '_' . $date->format('Y-m-d');
                $dayActivities = $activities->get($dayKey, collect());
                
                if ($dayActivities->isEmpty()) {
                    $agentData['days'][$date->format('j')] = [
                        'status' => 'Absent',
                        'total_hours' => 0,
                    ];
                    continue;
                }

                $totalSeconds = 0;
                $sessionStart = null;
                $firstLogin = null;
                $lastLogout = null;

                foreach ($dayActivities as $activity) {
                    if ($activity->activity_type === 'login') {
                        if (!$firstLogin) $firstLogin = $activity->created_at;
                        $sessionStart = $activity->created_at;
                    } elseif ($activity->activity_type === 'logout' && $sessionStart) {
                        $totalSeconds += abs($activity->created_at->diffInSeconds($sessionStart));
                        $lastLogout = $activity->created_at;
                        $sessionStart = null;
                    }
                }
                
                if ($sessionStart) {
                    $dayEnd = $date->isToday() ? now() : $date->copy()->endOfDay();
                    $totalSeconds += abs($dayEnd->diffInSeconds($sessionStart));
                }

                $agentData['days'][$date->format('j')] = [
                    'status' => $totalSeconds > 0 ? 'Present' : 'Absent',
                    'total_hours' => round($totalSeconds / 3600, 2),
                    'first_login' => $firstLogin ? $firstLogin->format('h:i A') : null,
                    'last_logout' => $lastLogout ? $lastLogout->format('h:i A') : ($sessionStart ? 'Active' : null),
                ];
            }
            $report[] = $agentData;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'month' => (int)$month,
                'year' => (int)$year,
                'report' => $report,
                'days_in_month' => $startOfMonth->daysInMonth
            ]
        ]);
    }

    private function formatSeconds($seconds)
    {
        if ($seconds <= 0) return '--';
        if ($seconds < 3600) return floor($seconds / 60) . ' min';
        $hours = floor($seconds / 3600);
        $mins = floor(($seconds % 3600) / 60);
        return "{$hours}h {$mins}m";
    }
}
