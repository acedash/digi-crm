<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->string('masked_card')->nullable()->after('approved_email');
            $table->string('declaration_version')->nullable()->after('masked_card');
            $table->text('declaration_text')->nullable()->after('declaration_version');
            $table->json('consent_snapshot')->nullable()->after('declaration_text');
        });
    }

    public function down(): void
    {
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->dropColumn([
                'masked_card',
                'declaration_version',
                'declaration_text',
                'consent_snapshot',
            ]);
        });
    }
};
