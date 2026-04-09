<?php

namespace App\Core\Traits;

use App\Domains\Activity\Models\ActivityLog;

trait HasActivityLogs
{
    public function logActivity($action, $details = null)
    {
        // Placeholder for activity logging logic
        // ActivityLog::create([...]);
    }
}
