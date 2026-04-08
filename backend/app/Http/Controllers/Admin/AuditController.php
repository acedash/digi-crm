<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;
use App\Models\UserActivity;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        // 1. Fetch Spatie Model CRUD Activities
        $modelActivities = Activity::with('causer')->latest()->take(500)->get()->map(function($act) {
            $subjectName = $act->subject_type ? class_basename($act->subject_type) : null;
            $action = ucfirst($act->description); // e.g., "Created", "Updated"
            
            $details = [];
            if ($act->properties && $act->properties->has('attributes')) {
                $details = $act->properties['attributes'];
                if ($act->properties->has('old')) {
                    $details['old'] = $act->properties['old'];
                }
            } elseif ($act->properties && $act->properties->has('details')) {
                $details = $act->properties['details'];
            }

            $ip = $act->properties ? $act->properties->get('ip_address', 'Unknown IP') : 'Unknown IP';
            $ua = $act->properties ? $act->properties->get('user_agent', 'Unknown Device') : 'Unknown Device';
            $eventType = $subjectName
                ? "{$subjectName} {$action}"
                : ($act->properties ? $act->properties->get('event_type', $act->description) : $act->description);
            $module = $subjectName
                ? $subjectName
                : ($act->properties ? $act->properties->get('module', 'System Activity') : 'System Activity');

            return [
                'id' => 'model_' . $act->id,
                'source' => 'system',
                'event_type' => $eventType,
                'module' => $module,
                'causer_name' => $act->causer ? $act->causer->name : 'System / Background',
                'ip_address' => $ip,
                'user_agent' => $ua,
                'details' => $details,
                'timestamp' => $act->created_at,
            ];
        });

        // 2. Fetch Agent Temporal State Changes
        $temporalActivities = UserActivity::with('user')->latest()->take(500)->get()->map(function($act) {
            $formattedDesc = ucwords(str_replace('_', ' ', $act->activity_type));
            return [
                'id' => 'temp_' . $act->id,
                'source' => 'temporal',
                'event_type' => "Agent Status: {$formattedDesc}",
                'module' => 'Authentication & Presence',
                'causer_name' => $act->user ? $act->user->name : 'Unknown User',
                'ip_address' => $act->ip_address ?? 'Unknown IP',
                'user_agent' => $act->user_agent ?? 'Unknown Device',
                'details' => $act->metadata ?? [],
                'timestamp' => $act->created_at,
            ];
        });

        // Merge both arrays, sort by chronological descending, scale limit
        $mergedFeed = $modelActivities->concat($temporalActivities)
            ->sortByDesc('timestamp')
            ->values()
            ->slice(0, 500); // 500 most recent events across the whole system
            
        return response()->json([
            'success' => true,
            'data' => $mergedFeed
        ]);
    }
}
