<?php

namespace App\Services;

use App\Models\Client;
use App\Domains\Booking\Models\Booking;
use Illuminate\Database\Eloquent\Builder;

class SearchService
{
    /**
     * Search for clients or bookings based on multiple parameters.
     */
    public function unifiedSearch(array $params)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        $query = Client::query();

        // Role-based filtering
        if ($user->hasRole('agent')) {
            $query->where(function($q) use ($user) { $q->where('agent_id', '=', $user->id); });
        } elseif ($user->hasRole('supervisor')) {
            $query->where(function($q) use ($user) {
                $q->where('supervisor_id', '=', $user->id)
                  ->orWhereHas('agent', function($aq) use ($user) {
                      $aq->where('supervisor_id', '=', $user->id);
                  });
            });
        }

        if (!empty($params['client_name'])) {
            $query->where(function($q) use ($params) {
                $q->where('name', 'like', '%' . $params['client_name'] . '%')
                  ->orWhere('first_name', 'like', '%' . $params['client_name'] . '%')
                  ->orWhere('last_name', 'like', '%' . $params['client_name'] . '%');
            });
        }

        if (!empty($params['phone'])) {
            $query->where(function($q) use ($params) { $q->where('phone', 'like', '%' . (string)$params['phone'] . '%'); });
        }

        if (!empty($params['email'])) {
            $query->where(function($q) use ($params) { $q->where('email', 'like', '%' . (string)$params['email'] . '%'); });
        }

        // Search by Booking ID or PNR
        if (!empty($params['booking_id']) || !empty($params['pnr'])) {
            $query->whereHas('bookings', function ($q) use ($params) {
                if (!empty($params['booking_id'])) {
                    $q->where('id', $params['booking_id'])
                      ->orWhere('booking_reference', 'like', '%' . $params['booking_id'] . '%');
                }
                if (!empty($params['pnr'])) {
                    $q->whereHas('services', function ($sq) use ($params) {
                        $sq->where('details_json->pnr', 'like', '%' . $params['pnr'] . '%');
                    });
                }
            });
        }

        // Search by Card Last 4
        if (!empty($params['card_last_4'])) {
            $query->whereHas('cards', function ($q) use ($params) {
                $q->where('last_4', '=', (string)$params['card_last_4']);
            });
        }

        return $query->with(['bookings', 'cards'])->paginate(15);
    }
}
