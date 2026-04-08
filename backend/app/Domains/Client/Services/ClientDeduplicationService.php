<?php

namespace App\Domains\Client\Services;

use App\Models\Client;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientDeduplicationService
{
    public function findDuplicateClient(array $data, ?int $ignoreClientId = null): ?Client
    {
        $email = $this->normalizeEmail($data['email'] ?? null);
        $phone = $this->normalizePhone($data['phone'] ?? null);

        if ($email === null && $phone === null) {
            return null;
        }

        return Client::query()
            ->when($ignoreClientId, fn ($query) => $query->where('id', '!=', $ignoreClientId))
            ->where(function ($query) use ($email, $phone) {
                if ($email !== null) {
                    $query->orWhereRaw('LOWER(email) = ?', [$email]);
                }

                if ($phone !== null) {
                    $query->orWhereRaw($this->normalizedPhoneSql() . ' = ?', [$phone]);
                }
            })
            ->orderBy('id')
            ->first();
    }

    public function assertNoDuplicateClient(array $data, ?int $ignoreClientId = null): void
    {
        $duplicate = $this->findDuplicateClient($data, $ignoreClientId);

        if (!$duplicate) {
            return;
        }

        throw ValidationException::withMessages([
            'client' => sprintf(
                'A client profile already exists with this email or phone number. Use the existing client profile instead. Existing client ID: %d.',
                $duplicate->id
            ),
        ]);
    }

    public function mergeCurrentDuplicates(): array
    {
        return DB::transaction(function () {
            $clients = Client::query()
                ->withCount(['bookings', 'passengers', 'cards', 'callLogs'])
                ->withCount(['paymentAuthorizations as payment_authorizations_count'])
                ->orderBy('id')
                ->get();

            $components = $this->buildDuplicateComponents($clients);
            $mergedGroups = [];
            $mergedClients = 0;

            foreach ($components as $component) {
                if (count($component) < 2) {
                    continue;
                }

                $groupClients = $clients->whereIn('id', $component)->values();
                $canonical = $this->selectCanonicalClient($groupClients);
                $mergedIds = [];

                foreach ($groupClients as $client) {
                    if ($client->id === $canonical->id) {
                        continue;
                    }

                    $this->mergeClientIntoCanonical($canonical, $client);
                    $mergedIds[] = $client->id;
                    $mergedClients++;
                }

                if (!empty($mergedIds)) {
                    $mergedGroups[] = [
                        'canonical_client_id' => $canonical->id,
                        'merged_client_ids' => $mergedIds,
                    ];
                }
            }

            return [
                'groups_merged' => count($mergedGroups),
                'clients_merged' => $mergedClients,
                'details' => $mergedGroups,
            ];
        });
    }

    public function normalizeEmail(?string $email): ?string
    {
        $value = strtolower(trim((string) $email));
        return $value !== '' ? $value : null;
    }

    public function normalizePhone(?string $phone): ?string
    {
        $value = preg_replace('/\D+/', '', (string) $phone);
        return $value !== '' ? $value : null;
    }

    private function buildDuplicateComponents(Collection $clients): array
    {
        $parent = [];
        $byEmail = [];
        $byPhone = [];

        foreach ($clients as $client) {
            $parent[$client->id] = $client->id;
        }

        foreach ($clients as $client) {
            $email = $this->normalizeEmail($client->email);
            $phone = $this->normalizePhone($client->phone);

            if ($email !== null) {
                if (isset($byEmail[$email])) {
                    $this->union($parent, $client->id, $byEmail[$email]);
                } else {
                    $byEmail[$email] = $client->id;
                }
            }

            if ($phone !== null) {
                if (isset($byPhone[$phone])) {
                    $this->union($parent, $client->id, $byPhone[$phone]);
                } else {
                    $byPhone[$phone] = $client->id;
                }
            }
        }

        $components = [];
        foreach ($clients as $client) {
            $root = $this->find($parent, $client->id);
            $components[$root][] = $client->id;
        }

        return array_values($components);
    }

    private function selectCanonicalClient(Collection $clients): Client
    {
        return $clients
            ->sort(function (Client $left, Client $right) {
                $leftScore = $this->clientScore($left);
                $rightScore = $this->clientScore($right);

                if ($leftScore === $rightScore) {
                    return $left->id <=> $right->id;
                }

                return $rightScore <=> $leftScore;
            })
            ->first();
    }

    private function clientScore(Client $client): int
    {
        return
            ((int) ($client->bookings_count ?? 0) * 100) +
            ((int) ($client->payment_authorizations_count ?? 0) * 50) +
            ((int) ($client->call_logs_count ?? 0) * 20) +
            ((int) ($client->cards_count ?? 0) * 10) +
            ((int) ($client->passengers_count ?? 0) * 5);
    }

    private function mergeClientIntoCanonical(Client $canonical, Client $duplicate): void
    {
        $this->fillCanonicalFields($canonical, $duplicate);

        DB::table('bookings')->where('client_id', $duplicate->id)->update(['client_id' => $canonical->id]);
        DB::table('payment_authorizations')->where('client_id', $duplicate->id)->update(['client_id' => $canonical->id]);
        DB::table('call_logs')->where('client_id', $duplicate->id)->update(['client_id' => $canonical->id]);
        DB::table('passengers')->where('client_id', $duplicate->id)->update(['client_id' => $canonical->id]);

        $existingCardNumbers = DB::table('client_cards')
            ->where('client_id', $canonical->id)
            ->pluck('card_number')
            ->filter()
            ->map(fn ($number) => preg_replace('/\s+/', '', (string) $number))
            ->all();

        $duplicateCards = DB::table('client_cards')
            ->where('client_id', $duplicate->id)
            ->get();

        foreach ($duplicateCards as $card) {
            $normalizedCard = preg_replace('/\s+/', '', (string) ($card->card_number ?? ''));

            if ($normalizedCard !== '' && in_array($normalizedCard, $existingCardNumbers, true)) {
                DB::table('client_cards')->where('id', $card->id)->delete();
                continue;
            }

            DB::table('client_cards')->where('id', $card->id)->update(['client_id' => $canonical->id]);

            if ($normalizedCard !== '') {
                $existingCardNumbers[] = $normalizedCard;
            }
        }

        $duplicate->delete();
    }

    private function fillCanonicalFields(Client $canonical, Client $duplicate): void
    {
        $updates = [];

        foreach (['name', 'first_name', 'middle_name', 'last_name', 'email', 'alternate_email', 'phone', 'alternate_phone', 'date_of_birth', 'gender', 'address', 'type', 'agent_id', 'created_by'] as $field) {
            $canonicalValue = $canonical->{$field};
            $duplicateValue = $duplicate->{$field};

            if (($canonicalValue === null || $canonicalValue === '') && $duplicateValue !== null && $duplicateValue !== '') {
                $updates[$field] = $duplicateValue;
            }
        }

        if (!empty($updates)) {
            $canonical->update($updates);
            $canonical->refresh();
        }
    }

    private function normalizedPhoneSql(): string
    {
        return "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')";
    }

    private function find(array &$parent, int $id): int
    {
        if ($parent[$id] !== $id) {
            $parent[$id] = $this->find($parent, $parent[$id]);
        }

        return $parent[$id];
    }

    private function union(array &$parent, int $left, int $right): void
    {
        $leftRoot = $this->find($parent, $left);
        $rightRoot = $this->find($parent, $right);

        if ($leftRoot !== $rightRoot) {
            $parent[$rightRoot] = $leftRoot;
        }
    }
}
