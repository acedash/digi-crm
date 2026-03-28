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

    public function find($id): ?Client
    {
        /** @var Client $client */
        $client = $this->model->with(['agent', 'creator', 'passengers', 'cards', 'bookings.services.serviceable', 'callLogs.agent'])->findOrFail($id);
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
