<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Repositories\BookingRepository;
use App\Domains\Booking\Models\Booking;
use App\Domains\Booking\Services\BookingOrchestrator;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Cache;

class BookingService
{
    protected $bookingRepo;
    protected $orchestrator;

    public function __construct(BookingRepository $bookingRepo, BookingOrchestrator $orchestrator)
    {
        $this->bookingRepo = $bookingRepo;
        $this->orchestrator = $orchestrator;
    }

    public function create(array $data)
    {
        return $this->orchestrator->createMultiServiceBooking($data);
    }


    public function getAllBookings($params = [])
    {
        $perPage = $params['per_page'] ?? 15;
        $search = trim((string) ($params['search'] ?? ''));

        $query = \App\Domains\Booking\Models\Booking::query()
            ->with([
                'client:id,agent_id,first_name,last_name,name,phone,email',
                'agent:id,name,user_custom_id',
                'creator:id,name,user_custom_id',
                'services:id,booking_id,serviceable_type,serviceable_id',
                'services.serviceable',
                'paymentAuthorizations:id,status,collected_at,approved_at,total_amount,currency', // Strictly avoid consent_snapshot/digital_signature
            ])
            ->withCount('passengers')
            ->orderBy('created_at', 'desc');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('booking_reference', $search)
                    ->orWhere('booking_reference', 'like', '%' . $search)
                    ->orWhere('id', $search)
                    ->orWhereHas('client', function ($clientQuery) use ($search) {
                        $clientQuery->where('first_name', 'like', '%' . $search . '%')
                            ->orWhere('last_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%')
                            ->orWhere('phone', 'like', '%' . $search . '%')
                            ->orWhere('id', $search)
                            ->orWhereRaw("CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) like ?", ['%' . $search . '%']);
                    })
                    ->orWhereHas('creator', function ($creatorQuery) use ($search) {
                        $creatorQuery->where('name', 'like', '%' . $search . '%');
                    });
            });
        }

        if (isset($params['start_date']) && $params['start_date']) {
            $query->whereDate('created_at', '>=', $params['start_date']);
        }
        
        if (isset($params['end_date']) && $params['end_date']) {
            $query->whereDate('created_at', '<=', $params['end_date']);
        }

        if (auth()->user()->hasRole('admin')) {
            // No specific agent filter for admin
        } elseif (auth()->user()->hasRole('supervisor')) {
            $teamIds = auth()->user()->supervisedAgents()->pluck('users.id')->toArray();
            $teamIds[] = auth()->id();
            $query->whereIn('agent_id', $teamIds);
        } else {
            $query->where('agent_id', auth()->id());
        }

        // Cache the stats GROUP BY for 300s (5 mins)
        $statsCacheKey = 'booking_stats.v2.' . auth()->id() . '.' . md5(json_encode([
            $search,
            $params['start_date'] ?? '',
            $params['end_date'] ?? '',
        ]));

        $stats = Cache::remember($statsCacheKey, 300, function () use ($query) {
            $statsQuery = clone $query;
            // Clear eager loads and unnecessary parts for the stats count
            return $statsQuery->setEagerLoads([])
                ->select('status', \Illuminate\Support\Facades\DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();
        });

        // Total count (ignoring status if we want global total under these filters)
        $totalCount = array_sum($stats);

        $results = $query->paginate($perPage);
        $paginatedData = $this->transformBookingListPaginator($results);

        return [
            'data' => $paginatedData,
            'stats' => [
                'Total' => $totalCount,
                'Approved' => ($stats['Approved'] ?? 0) + ($stats['Confirmed'] ?? 0) + ($stats['Change Approved'] ?? 0),
                'Drafts' => $stats['Draft'] ?? 0,
                'Pending' => ($stats['Pending'] ?? 0) + ($stats['Awaiting Cards'] ?? 0),
                'Work Pending' => $stats['Work Pending'] ?? 0,
                'Completed' => $stats['Completed'] ?? 0,
                'Rejected' => ($stats['Rejected'] ?? 0) + ($stats['Change Rejected'] ?? 0) + ($stats['Cancelled'] ?? 0),
            ]
        ];
    }

    public function getById($id)
    {
        $booking = $this->bookingRepo->findDetailed($id);

        if (! $booking) {
            return null;
        }

        $user = auth()->user();
        if (! $user) {
            throw new AuthorizationException('Unauthorized');
        }

        if ($user->hasRole('admin')) {
            return $this->attachCardPermissions($booking, true);
        }

        if ($user->hasRole('supervisor')) {
            $teamIds = $user->supervisedAgents()->pluck('users.id')->toArray();
            $teamIds[] = $user->id;

            if (! in_array((int) $booking->agent_id, $teamIds, true)) {
                throw new AuthorizationException('You are not allowed to view this booking.');
            }
        } elseif ((int) $booking->agent_id !== (int) $user->id) {
            throw new AuthorizationException('You are not allowed to view this booking.');
        }

        $creatorId = (int) data_get($booking->details_json, 'created_by_id');
        $canViewSensitiveCards = $creatorId > 0 && $creatorId === (int) $user->id;

        // Optimization: Reduce JSON payload size by stripping excessive history
        // if it exceeds a certain complexity threshold.
        $details = $booking->details_json ?? [];
        if (isset($details['service_change_history']) && count($details['service_change_history']) > 10) {
            // Keep only the last 3 entries in memory for the main view to keep response small
            $details['service_change_history'] = array_slice($details['service_change_history'], -3);
            $details['has_more_history'] = true;
            $booking->details_json = $details;
        }

        return $this->attachCardPermissions($booking, $canViewSensitiveCards);
    }

    public function delete($id)
    {
        $booking = $this->bookingRepo->find($id);
        if (!$booking) {
            throw new \Exception("Booking not found.");
        }
        return $this->bookingRepo->delete($booking);
    }

    public function update($id, array $data)
    {
        $booking = $this->bookingRepo->find($id);
        if (!$booking) {
            throw new \Exception("Booking not found.");
        }

        $updateMode = $data['update_mode'] ?? 'standard';
        if ($updateMode === 'status_only') {
            $details = $booking->details_json ?? [];
            $details['status_remark'] = $data['status_remark'] ?? null;
            
            $booking->update([
                'status' => $data['status'],
                'details_json' => $details
            ]);
            
            return $booking->fresh()->load(['client', 'agent', 'passengers', 'services.serviceable']);
        }

        $isApprovedBooking = in_array($booking->status, [
            'Approved',
            'Confirmed',
            'Awaiting Change Approval',
            'Change Approved',
            'Change Rejected',
        ], true);

        if ($updateMode === 'service_change' && !$isApprovedBooking) {
            throw ValidationException::withMessages([
                'booking' => ['Tracked change is only available after payment approval. Use normal edit until the booking is approved.'],
            ]);
        }

        if ($isApprovedBooking && $updateMode !== 'service_change') {
            throw ValidationException::withMessages([
                'booking' => ['This booking has already been approved. Use the tracked change workflow for any post-approval updates.'],
            ]);
        }

        return $this->orchestrator->updateMultiServiceBooking($id, $data);
    }

    public function reassign(Booking $booking, $newAgentId, $handoffRemark)
    {
        $currentAgent = $booking->agent;
        $existingDetails = $booking->details_json ?? [];
        $history = $existingDetails['reassignment_history'] ?? [];

        $history[] = [
            'reassigned_at' => now()->toDateTimeString(),
            'reassigned_by_id' => auth()->id(),
            'reassigned_by_name' => auth()->user()?->name,
            'from_agent_id' => $booking->agent_id,
            'from_agent_name' => $currentAgent?->name,
            'to_agent_id' => (int) $newAgentId,
            'remark' => $handoffRemark,
        ];

        $existingDetails['latest_reassignment_remark'] = $handoffRemark;
        $existingDetails['reassignment_history'] = $history;

        $booking->update([
            'agent_id' => $newAgentId,
            'details_json' => $existingDetails,
        ]);

        activity('booking_handoff')
            ->performedOn($booking)
            ->causedBy(auth()->user())
            ->withProperties([
                'event_type' => 'Booking Reassigned',
                'module' => 'Bookings',
                'details' => [
                    'booking_reference' => $booking->booking_reference,
                    'from_agent_name' => $currentAgent?->name ?: 'Unassigned',
                    'to_agent_id' => (int) $newAgentId,
                    'handoff_remark' => $handoffRemark,
                ],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->log('booking reassigned');

        return $booking->fresh()->load(['client', 'agent', 'passengers', 'services.serviceable']);
    }

    protected function attachCardPermissions($booking, bool $canViewSensitiveCards)
    {
        $details = $booking->details_json ?? [];
        $details['permissions'] = array_merge($details['permissions'] ?? [], [
            'can_view_sensitive_cards' => $canViewSensitiveCards,
        ]);

        if (! $canViewSensitiveCards) {
            $details['payment_cards'] = collect($details['payment_cards'] ?? [])
                ->map(function ($card) {
                    $number = (string) ($card['number'] ?? '');
                    $clean = preg_replace('/\D+/', '', $number);
                    $masked = $clean
                        ? '•••• •••• •••• ' . substr($clean, -4)
                        : 'Card number hidden';

                    return array_merge($card, [
                        'number' => $masked,
                        'cvv' => null,
                    ]);
                })
                ->values()
                ->all();
        }

        $booking->details_json = $details;

        return $booking;
    }

    protected function transformBookingListPaginator($paginator)
    {
        $paginator->setCollection(
            $paginator->getCollection()->map(function ($booking) {
                $details = $booking->details_json ?? [];
                $history = collect($details['reassignment_history'] ?? []);
                $latestReassignment = $history->last();

                return [
                    'id' => $booking->id,
                    'client_id' => $booking->client_id,
                    'agent_id' => $booking->agent_id,
                    'booking_reference' => $booking->booking_reference,
                    'status' => $booking->status,
                    'total_amount' => $booking->total_amount,
                    'currency' => $booking->currency,
                    'travel_date' => $booking->travel_date,
                    'created_at' => $booking->created_at,
                    'passengers_count' => (int) ($booking->passengers_count ?? 0),
                    'client' => $booking->client ? [
                        'id' => $booking->client->id,
                        'name' => $booking->client->name,
                        'first_name' => $booking->client->first_name,
                        'last_name' => $booking->client->last_name,
                        'phone' => $booking->client->phone,
                        'email' => $booking->client->email ?? null,
                    ] : null,
                    'agent' => $booking->agent ? [
                        'id' => $booking->agent->id,
                        'name' => $booking->agent->name,
                        'user_custom_id' => $booking->agent->user_custom_id,
                    ] : null,
                    'services' => collect($booking->services ?? [])->map(function ($service) {
                        $type = str_replace('App\\Domains\\Booking\\Models\\', '', (string)$service->serviceable_type);
                        $type = str_replace('App\\Domains\\Supplier\\Models\\', '', $type);
                        
                        $detail = '';
                        $serviceable = $service->serviceable;
                        
                        if ($serviceable) {
                            switch ($type) {
                                case 'Flight':
                                    $detail = ($serviceable->airline_code ?: 'Unknown Airline') . ' (' . $serviceable->departure_city . '-' . $serviceable->arrival_city . ')';
                                    break;
                                case 'Hotel':
                                    $detail = $serviceable->name ?: 'Unnamed Hotel';
                                    break;
                                case 'Car':
                                    $detail = ($serviceable->vendor_name ?: 'Car Rental') . ' (' . ($serviceable->car_type ?: 'Standard') . ')';
                                    break;
                                case 'Cruise':
                                    $detail = ($serviceable->cruise_line ?: 'Cruise') . ' - ' . ($serviceable->ship_name ?: 'Vessel');
                                    break;
                                default:
                                    $detail = $type;
                            }
                        }

                        return [
                            'id' => $service->id,
                            'type' => $type,
                            'detail' => $detail,
                            'serviceable_type' => $service->serviceable_type,
                        ];
                    })->values()->all(),
                    'created_by_name' => $booking->creator->name 
                        ?? $details['created_by_name']
                        ?? ($details['created_by_user_name'] ?? null)
                        ?? ($history->first()['from_agent_name'] ?? null)
                        ?? ($booking->agent->name ?? 'System'),
                    'creator' => $booking->creator ? [
                        'id' => $booking->creator->id,
                        'name' => $booking->creator->name,
                        'user_custom_id' => $booking->creator->user_custom_id,
                    ] : null,
                    'created_by_id' => $booking->created_by ?? ($details['created_by_id'] ?? null),
                    'latest_handoff_remark' => $latestReassignment['remark']
                        ?? ($details['latest_reassignment_remark'] ?? null),
                    'status_remark' => $details['status_remark'] ?? null,
                    'was_reassigned' => $history->isNotEmpty(),
                    'reassignment_history' => $history->take(-3)->all(), // Only send last 3 entries to save space
                    'payment_authorizations' => $booking->paymentAuthorizations,
                    // REMOVED 'details_json' => $details from the response to save massive bandwidth (20MB -> 100KB)
                ];
            })
        );

        return $paginator;
    }
}
