<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Domains\Client\Services\ClientService;
use App\Http\Requests\Domains\Client\CreateClientRequest;
use App\Http\Requests\Domains\Client\UpdateClientRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClientController extends Controller
{
    use ApiResponseTrait;

    protected ClientService $clientService;

    public function __construct(ClientService $clientService)
    {
        $this->clientService = $clientService;
    }

    public function index(Request $request): JsonResponse
    {
        $clients = $this->clientService->listClientDirectory(
            $request->all(),
            $request->user(),
            (int) $request->get('per_page', 15)
        );

        return $this->success($clients, 'Clients retrieved successfully');
    }

    public function store(CreateClientRequest $request): JsonResponse
    {
        try {
            $client = $this->clientService->createClient($request->validated());
            return $this->success($client, 'Client created successfully', 201);
        } catch (ValidationException $e) {
            return $this->error(
                $e->errors()['client'][0] ?? $e->getMessage(),
                422,
                $e->errors()
            );
        }
    }

    public function show($id): JsonResponse
    {
        $client = $this->clientService->getClient($id);
        return $this->success($client, 'Client retrieved successfully');
    }

    public function update(UpdateClientRequest $request, $id): JsonResponse
    {
        try {
            $client = $this->clientService->updateClient($id, $request->validated());
            return $this->success($client, 'Client updated successfully');
        } catch (ValidationException $e) {
            return $this->error(
                $e->errors()['client'][0] ?? $e->getMessage(),
                422,
                $e->errors()
            );
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $this->clientService->deleteClient($id);
            return $this->success(null, 'Client deleted successfully', 204);
        } catch (ValidationException $e) {
            return $this->error(
                $e->errors()['client'][0] ?? $e->getMessage(),
                422,
                $e->errors()
            );
        }
    }
}
