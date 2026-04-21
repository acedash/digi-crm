<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Speed up Today/Yesterday stats queries
            if (!Schema::hasIndex('clients', 'clients_created_at_idx')) {
                $table->index('created_at', 'clients_created_at_idx');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            // Speed up status-based stats (e.g. Approved vs Pending breakdown)
            if (!Schema::hasIndex('bookings', 'bookings_status_idx')) {
                $table->index('status', 'bookings_status_idx');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('clients_created_at_idx');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_status_idx');
        });
    }
};
