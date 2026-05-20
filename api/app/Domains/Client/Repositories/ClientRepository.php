<?php

namespace App\Domains\Client\Repositories;

use App\Models\Client;
use App\Models\Passenger;
use App\Domains\Core\Repositories\BaseRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ClientRepository extends BaseRepository
{
    public function __construct(Client $model)
    {
        parent::__construct($model);
    }

    public function getAll($search = null): LengthAwarePaginator
    {
        $query = $this->model->with(['agent', 'creator', 'passengers', 'cards']);
        
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhereHas('passengers', function($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        return $query->latest()->paginate(20);
    }

    public function getList(array $filters = [], ?\App\Models\User $user = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->query()
            ->with([
                'creator:id,name',
                'agent:id,name',
                'latestBooking' => function ($query) {
                    $query->select(['id', 'client_id', 'booking_reference', 'status', 'total_amount', 'currency', 'created_at']);
                },
                'latestBooking.services' => function ($query) {
                    $query->select(['id', 'booking_id', 'serviceable_id', 'serviceable_type', 'status']);
                },
                'latestBooking.services.serviceable',
                'latestBooking.paymentAuthorizations' => function ($query) {
                    $query->select(['payment_authorizations.id', 'payment_authorizations.charge_status', 'payment_authorizations.status']);
                },
            ]);


        // 1. Role-based scoping (Index Friendly)
        if ($user?->hasRole('agent')) {
            $query->where('clients.agent_id', $user->id);
        } elseif ($user?->hasRole('supervisor')) {
            $query->whereIn('clients.agent_id', function($q) use ($user) {
                $q->select('user_id')
                  ->from('user_supervisor')
                  ->where('supervisor_id', $user->id);
            });
        }

        // 2. Name Search (Using indexes instead of CONCAT)
        $clientName = trim((string) ($filters['client_name'] ?? ''));
        if ($clientName !== '') {
            $query->where(function ($q) use ($clientName) {
                $q->where('first_name', 'like', $clientName . '%')
                  ->orWhere('last_name', 'like', $clientName . '%')
                  ->orWhere('email', 'like', $clientName . '%')
                  ->orWhere('phone', 'like', $clientName . '%')
                  ->orWhere('id', 'like', $clientName . '%')
                  ->orWhereHas('creator', function($cq) use ($clientName) {
                      $cq->where('name', 'like', '%' . $clientName . '%');
                  });
            });
        }

        // 3. Phone Search (Avoid REPLACE() which breaks indexes)
        $phone = trim((string) ($filters['phone'] ?? ''));
        if ($phone !== '') {
            $query->where(function ($q) use ($phone) {
                $q->where('phone', 'like', '%' . $phone . '%')
                  ->orWhere('alternate_phone', 'like', '%' . $phone . '%');
            });
        }

        // 4. Email Search (Index friendly)
        $email = trim((string) ($filters['email'] ?? ''));
        if ($email !== '') {
            $query->where(function ($q) use ($email) {
                $q->where('email', 'like', '%' . $email . '%')
                  ->orWhere('alternate_email', 'like', '%' . $email . '%');
            });
        }

        // 5. Booking Search (Simple exists)
        if (!empty($filters['booking_id'])) {
            $searchValue = $filters['booking_id'];
            $query->where(function ($q) use ($searchValue) {
                $q->where('id', $searchValue)
                  ->orWhereHas('bookings', function ($bq) use ($searchValue) {
                      $bq->where('id', $searchValue)
                         ->orWhere('booking_reference', 'like', '%' . $searchValue);
                  });
            });
        }

        // 6. PNR Search
        if (!empty($filters['pnr'])) {
            $pnrValue = $filters['pnr'];
            $query->whereExists(function ($q) use ($pnrValue) {
                $q->select(DB::raw(1))
                  ->from('bookings')
                  ->join('booking_services', 'bookings.id', '=', 'booking_services.booking_id')
                  ->join('flights', function($join) {
                      $join->on('booking_services.serviceable_id', '=', 'flights.id')
                           ->where('booking_services.serviceable_type', '=', 'App\\Domains\\Booking\\Models\\Flight');
                  })
                  ->whereColumn('bookings.client_id', 'clients.id')
                  ->where('flights.pnr', 'like', '%' . $pnrValue);
            });
        }

        // 7. Date Filtering (Index friendly ranges)
        if (!empty($filters['start_date'])) {
            $query->where('created_at', '>=', \Illuminate\Support\Carbon::parse($filters['start_date'])->startOfDay());
        }

        if (!empty($filters['end_date'])) {
            $query->where('created_at', '<=', \Illuminate\Support\Carbon::parse($filters['end_date'])->endOfDay());
        }

        // 8. Charge Status Filtering
        if (!empty($filters['charge_status'])) {
            $status = $filters['charge_status'];
            $query->whereHas('bookings.paymentAuthorizations', function($q) use ($status) {
                $q->where('charge_status', $status);
            });
        }

        $paginator = $query->latest('created_at')->paginate($perPage);
        
        // Optimize: Load heavy aggregates only for the paginated subset to avoid full table scans
        $paginator->getCollection()->loadCount(['passengers', 'bookings'])->loadSum('bookings', 'total_amount');
        
        return $paginator;
    }

    public function find($id): ?Client
    {
        /** @var Client $client */
        $client = $this->model->query()
            ->with([
                'agent:id,name',
                'creator:id,name',
                'passengers:id,client_id,first_name,last_name,middle_name,date_of_birth,gender,type',
                'cards',
                // Limit to recent 20 bookings to avoid loading entire booking history on every profile view
                'bookings' => function ($query) {
                    $query->select(['id', 'client_id', 'agent_id', 'booking_reference', 'status', 'total_amount', 'currency', 'created_at', 'details_json'])
                          ->latest('created_at')
                          ->limit(20)
                          ->with([
                              'services:id,booking_id,serviceable_type,serviceable_id',
                              'services.serviceable',
                              'paymentAuthorizations',
                          ]);

                },
                'callLogs' => function ($query) {
                    $query->select(['id', 'client_id', 'agent_id', 'call_type', 'customer_outcome', 'notes', 'callback_required', 'callback_datetime', 'created_at'])
                          ->latest('created_at');
                },
                'callLogs.agent:id,name',
            ])
            ->findOrFail($id);
        return $client;
    }

    public function createWithPassengers(array $data): Client
    {
        return DB::transaction(function () use ($data) {
            $passengers = $data['passengers'] ?? [];
            $cards = $data['cards'] ?? [];
            unset($data['passengers'], $data['cards']);

            $client = $this->model->create(array_merge($data, [
                'created_by' => auth()->id(),
                'agent_id' => $data['agent_id'] ?? (auth()->user()->hasRole('agent') ? auth()->id() : null)
            ]));

            // Always ensure the primary traveler (the client) is a passenger
            $client->passengers()->create([
                'first_name' => $client->first_name,
                'middle_name' => $client->middle_name,
                'last_name' => $client->last_name,
                'date_of_birth' => $client->date_of_birth,
                'gender' => $client->gender,
                'name' => "{$client->first_name} {$client->last_name}",
            ]);

            foreach ($passengers as $passengerData) {
                $client->passengers()->create($passengerData);
            }

            foreach ($cards as $cardData) {
                $client->cards()->create($cardData);
            }

            return $client->load(['passengers', 'cards']);
        });
    }

    public function updateWithPassengers(Client $client, array $data): Client
    {
        return DB::transaction(function () use ($client, $data) {
            $passengers = $data['passengers'] ?? null;
            $cards = $data['cards'] ?? null;
            unset($data['passengers'], $data['cards']);

            $client->update($data);

            if ($passengers !== null) {
                $client->passengers()->delete();
                
                // Re-add primary traveler (the client)
                $client->passengers()->create([
                    'first_name' => $client->first_name,
                    'middle_name' => $client->middle_name,
                    'last_name' => $client->last_name,
                    'date_of_birth' => $client->date_of_birth,
                    'gender' => $client->gender,
                    'name' => "{$client->first_name} {$client->last_name}",
                ]);

                foreach ($passengers as $passengerData) {
                    $client->passengers()->create($passengerData);
                }
            }

            if ($cards !== null) {
                $client->cards()->delete();
                foreach ($cards as $cardData) {
                    $client->cards()->create($cardData);
                }
            }

            return $client->load(['passengers', 'cards']);
        });
    }
}
