<?php

namespace App\Domains\Client\Services;

use App\Domains\Client\Repositories\ClientRepository;
use App\Models\Client;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class ClientService
{
    protected ClientRepository $clientRepository;
    protected ClientDeduplicationService $clientDeduplicationService;

    public function __construct(ClientRepository $clientRepository, ClientDeduplicationService $clientDeduplicationService)
    {
        $this->clientRepository = $clientRepository;
        $this->clientDeduplicationService = $clientDeduplicationService;
    }

    public function listClients(?string $search = null): LengthAwarePaginator
    {
        return $this->clientRepository->getAll($search);
    }

    public function listClientDirectory(array $filters = [], $user = null, int $perPage = 15): LengthAwarePaginator
    {
        return $this->clientRepository->getList($filters, $user, $perPage);
    }

    public function getClient($id): Client
    {
        return Cache::remember('client.detail.' . $id, now()->addSeconds(30), function () use ($id) {
            return $this->clientRepository->find($id);
        });
    }

    public function createClient(array $data): Client
    {
        $this->clientDeduplicationService->assertNoDuplicateClient($data);
        return $this->clientRepository->createWithPassengers($data);
    }

    public function updateClient($id, array $data): Client
    {
        $client = $this->clientRepository->find($id);
        $this->clientDeduplicationService->assertNoDuplicateClient($data, $client->id);
        return $this->clientRepository->updateWithPassengers($client, $data);
    }

    public function deleteClient($id): bool
    {
        $client = $this->clientRepository->find($id);

        $blockingRelations = [];

        if ($client->bookings()->exists()) {
            $blockingRelations[] = 'bookings';
        }

        if ($client->callLogs()->exists()) {
            $blockingRelations[] = 'call logs';
        }

        if ($client->paymentAuthorizations()->exists()) {
            $blockingRelations[] = 'payment authorizations';
        }

        if ($client->passengers()->exists()) {
            $blockingRelations[] = 'passengers';
        }

        if ($client->cards()->exists()) {
            $blockingRelations[] = 'saved cards';
        }

        if (!empty($blockingRelations)) {
            throw ValidationException::withMessages([
                'client' => [
                    'This client cannot be deleted because it still has linked ' . implode(', ', $blockingRelations) . '. Remove the linked history first, or keep the client profile for CRM history.',
                ],
            ]);
        }

        return $this->clientRepository->delete($client);
    }

    public function mergeCurrentDuplicateClients(): array
    {
        return $this->clientDeduplicationService->mergeCurrentDuplicates();
    }
}
