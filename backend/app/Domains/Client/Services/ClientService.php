<?php

namespace App\Domains\Client\Services;

use App\Domains\Client\Repositories\ClientRepository;
use App\Models\Client;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ClientService
{
    protected ClientRepository $clientRepository;

    public function __construct(ClientRepository $clientRepository)
    {
        $this->clientRepository = $clientRepository;
    }

    public function listClients(?string $search = null): LengthAwarePaginator
    {
        return $this->clientRepository->getAll($search);
    }

    public function getClient($id): Client
    {
        return $this->clientRepository->find($id);
    }

    public function createClient(array $data): Client
    {
        return $this->clientRepository->createWithPassengers($data);
    }

    public function updateClient($id, array $data): Client
    {
        $client = $this->clientRepository->find($id);
        return $this->clientRepository->updateWithPassengers($client, $data);
    }

    public function deleteClient($id): bool
    {
        $client = $this->clientRepository->find($id);
        return $this->clientRepository->delete($client);
    }
}
