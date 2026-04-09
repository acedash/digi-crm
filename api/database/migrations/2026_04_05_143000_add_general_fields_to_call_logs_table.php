<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('call_logs', function (Blueprint $table) {
            $table->string('log_scope')->default('booking')->after('client_id');
            $table->string('contact_name')->nullable()->after('log_scope');
            $table->string('contact_email')->nullable()->after('contact_name');
            $table->string('contact_phone')->nullable()->after('contact_email');
            $table->string('lead_source')->nullable()->after('contact_phone');
        });
    }

    public function down(): void
    {
        Schema::table('call_logs', function (Blueprint $table) {
            $table->dropColumn([
                'log_scope',
                'contact_name',
                'contact_email',
                'contact_phone',
                'lead_source',
            ]);
        });
    }
};
