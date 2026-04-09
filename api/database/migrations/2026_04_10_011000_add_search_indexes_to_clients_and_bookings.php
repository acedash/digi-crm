<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->index('name', 'clients_name_idx');
            $table->index('first_name', 'clients_first_name_idx');
            $table->index('last_name', 'clients_last_name_idx');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->index('booking_reference', 'bookings_reference_idx');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('clients_name_idx');
            $table->dropIndex('clients_first_name_idx');
            $table->dropIndex('clients_last_name_idx');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_reference_idx');
        });
    }
};
