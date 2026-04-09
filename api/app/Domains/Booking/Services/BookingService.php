<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Repositories\BookingRepository;
use App\Domains\Booking\Services\BookingOrchestrator;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

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
            ->select([
                'id',
                'client_id',
                'agent_id',
                'booking_reference',
                'status',
                'total_amount',
                'currency',
                'created_at',
            ])
            ->with([
                'client:id,agent_id,first_name,last_name,name,phone',
                'agent:id,name',
                'services:id,booking_id,serviceable_type',
            ])
            ->withCount('passengers')
            ->orderBy('created_at', 'desc');

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('booking_reference', 'like', '%' . $search . '%')
                    ->orWhereHas('client', function ($clientQuery) use ($search) {
                        $clientQuery->where('name', 'like', '%' . $search . '%')
                            ->orWhere('first_name', 'like', '%' . $search . '%')
                            ->orWhere('last_name', 'like', '%' . $search . '%');
                    });
            });
        }

        if (auth()->user()->hasRole('admin')) {
            return $this->transformBookingListPaginator($query->paginate($perPage));
        }

        if (auth()->user()->hasRole('supervisor')) {
            $teamIds = auth()->user()->agents()->pluck('id')->toArray();
            $teamIds[] = auth()->id();
            
            return $this->transformBookingListPaginator(
                $query->whereIn('agent_id', $teamIds)->paginate($perPage)
            );
        }

        return $this->transformBookingListPaginator(
            $query->where('agent_id', auth()->id())->paginate($perPage)
        );
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
            $teamIds = $user->agents()->pluck('id')->toArray();
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

    public function reassign($id, $newAgentId, $handoffRemark)
    {
        $booking = $this->bookingRepo->find($id);
        if (!$booking) {
            throw new \Exception("Booking not found.");
        }

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
                    ] : null,
                    'services' => collect($booking->services ?? [])->map(function ($service) {
                        return [
                            'id' => $service->id,
                            'serviceable_type' => $service->serviceable_type,
                        ];
                    })->values()->all(),
                    'created_by_name' => $details['created_by_name']
                        ?? ($latestReassignment['from_agent_name'] ?? null)
                        ?? ($booking->agent->name ?? null),
                    'latest_handoff_remark' => $latestReassignment['remark']
                        ?? ($details['latest_reassignment_remark'] ?? null),
                    'was_reassigned' => $history->isNotEmpty(),
                ];
            })
        );

        return $paginator;
    }
}
