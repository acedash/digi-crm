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
        Schema::table('client_cards', function (Blueprint $blueprint) {
            $blueprint->string('currency', 3)->nullable()->after('cvv');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_cards', function (Blueprint $blueprint) {
            $blueprint->dropColumn('currency');
        });
    }
};
