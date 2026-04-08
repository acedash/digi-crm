<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('hotels') || Schema::hasColumn('hotels', 'room_type')) {
            return;
        }

        Schema::table('hotels', function (Blueprint $table) {
            $table->string('room_type')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('hotels') || ! Schema::hasColumn('hotels', 'room_type')) {
            return;
        }

        Schema::table('hotels', function (Blueprint $table) {
            $table->dropColumn('room_type');
        });
    }
};
