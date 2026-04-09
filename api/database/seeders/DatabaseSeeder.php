<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            AdminUserSeeder::class,
        ]);

        // Create a Supervisor
        $supervisor = User::create([
            'name' => 'Asrar Bashir',
            'email' => 'asrar@crm.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
        ]);
        $supervisor->assignRole('supervisor');

        // Create an Agent
        $agent = User::create([
            'name' => 'Test Agent',
            'email' => 'agent@crm.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
        ]);
        $agent->assignRole('agent');

        // Run sequential ID assignment for all seeded users
        foreach (User::all() as $user) {
            $role = $user->getRoleNames()->first() ?? 'agent';
            $prefix = match($role) {
                'admin' => 'ADM',
                'supervisor' => 'SUP',
                'agent' => 'AGT',
                default => 'USR'
            };
            $count = User::role($role)->where('id', '<=', $user->id)->count();
            $user->update(['user_custom_id' => $prefix . (1000 + $count)]);
        }
    }
}
