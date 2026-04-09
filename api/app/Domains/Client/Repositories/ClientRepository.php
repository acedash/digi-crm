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
            ->select([
                'id',
                'agent_id',
                'created_by',
                'first_name',
                'last_name',
                'email',
                'alternate_email',
                'phone',
                'alternate_phone',
                'type',
                'created_at',
            ])
            ->with([
                'creator:id,name',
            ])
            ->withCount(['passengers', 'bookings']);

        if ($user?->hasRole('agent')) {
            $query->where('agent_id', $user->id);
        } elseif ($user?->hasRole('supervisor')) {
            $query->whereHas('agent.supervisors', function ($agentQuery) use ($user) {
                $agentQuery->where('users.id', $user->id);
            });
        }

        $clientName = trim((string) ($filters['client_name'] ?? ''));
        if ($clientName !== '') {
            $query->where(function ($clientQuery) use ($clientName) {
                $clientQuery->where('first_name', 'like', '%' . $clientName . '%')
                    ->orWhere('last_name', 'like', '%' . $clientName . '%')
                    ->orWhere('email', 'like', '%' . $clientName . '%')
                    ->orWhere('phone', 'like', '%' . $clientName . '%')
                    ->orWhere('id', 'like', '%' . $clientName . '%')
                    ->orWhereRaw("CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) like ?", ['%' . $clientName . '%']);
            });
        }

        $phone = trim((string) ($filters['phone'] ?? ''));
        if ($phone !== '') {
            $normalizedPhone = preg_replace('/\D+/', '', $phone);
            $query->where(function ($phoneQuery) use ($normalizedPhone) {
                $phoneQuery->whereRaw("
                    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?
                ", ['%' . $normalizedPhone . '%'])
                ->orWhereRaw("
                    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(alternate_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?
                ", ['%' . $normalizedPhone . '%']);
            });
        }

        $email = strtolower(trim((string) ($filters['email'] ?? '')));
        if ($email !== '') {
            $query->where(function ($emailQuery) use ($email) {
                $emailQuery->whereRaw('LOWER(email) LIKE ?', ['%' . $email . '%'])
                    ->orWhereRaw('LOWER(alternate_email) LIKE ?', ['%' . $email . '%']);
            });
        }

        if (!empty($filters['booking_id'])) {
            $searchValue = $filters['booking_id'];
            $query->where(function ($q) use ($searchValue) {
                // Search Client ID
                $q->where('id', $searchValue)
                  ->orWhereHas('bookings', function ($bookingQuery) use ($searchValue) {
                      // Search Booking ID or Reference suffix
                      $bookingQuery->where('id', $searchValue)
                          ->orWhere('booking_reference', $searchValue)
                          ->orWhere('booking_reference', 'like', '%' . $searchValue);
                  });
            });
        }

        if (!empty($filters['pnr'])) {
            $query->whereHas('bookings', function ($bookingQuery) use ($filters) {
                $bookingQuery->whereHas('services', function ($serviceQuery) use ($filters) {
                    $serviceQuery->whereHasMorph('serviceable', ['App\\Domains\\Booking\\Models\\Flight'], function ($flightQuery) use ($filters) {
                        $flightQuery->where('pnr', 'like', '%' . $filters['pnr']);
                    });
                });
            });
        }

        if (!empty($filters['card_last_4'])) {
            $query->whereHas('cards', function ($cardQuery) use ($filters) {
                $cardQuery->where('last_4', (string) $filters['card_last_4']);
            });
        }

        return $query->latest('created_at')->paginate($perPage);
    }

    public function find($id): ?Client
    {
        /** @var Client $client */
        $client = $this->model->query()
            ->with([
                'agent',
                'creator',
                'passengers',
                'cards',
                'bookings.services.serviceable',
                'callLogs' => function ($query) {
                    $query->latest('created_at');
                },
                'callLogs.agent',
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
                'created_by' => auth()->id()
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
