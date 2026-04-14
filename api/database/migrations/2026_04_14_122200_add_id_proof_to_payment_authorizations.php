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
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->string('id_proof_path')->nullable()->after('consent_snapshot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->dropColumn('id_proof_path');
        });
    }
};
