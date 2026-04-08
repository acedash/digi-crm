<?php

use App\Domains\Client\Services\ClientService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('clients:merge-duplicates', function (ClientService $clientService) {
    $result = $clientService->mergeCurrentDuplicateClients();

    $this->info(sprintf(
        'Merged %d client records across %d duplicate groups.',
        $result['clients_merged'],
        $result['groups_merged']
    ));

    foreach ($result['details'] as $group) {
        $this->line(sprintf(
            'Canonical client %d absorbed [%s]',
            $group['canonical_client_id'],
            implode(', ', $group['merged_client_ids'])
        ));
    }
})->purpose('Merge duplicate client profiles by matching email or phone');
