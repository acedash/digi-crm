<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_supervisor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('supervisor_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'supervisor_id']);
        });

        $existingAssignments = DB::table('users')
            ->whereNotNull('supervisor_id')
            ->select('id as user_id', 'supervisor_id')
            ->get();

        foreach ($existingAssignments as $assignment) {
            DB::table('user_supervisor')->updateOrInsert(
                [
                    'user_id' => $assignment->user_id,
                    'supervisor_id' => $assignment->supervisor_id,
                ],
                [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_supervisor');
    }
};
