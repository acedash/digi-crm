<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->string('approved_email')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->dropColumn('approved_email');
        });
    }
};
