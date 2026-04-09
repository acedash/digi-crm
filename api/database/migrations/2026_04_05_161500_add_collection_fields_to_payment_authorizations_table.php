<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->timestamp('collected_at')->nullable()->after('approved_at');
            $table->foreignId('collected_by')->nullable()->after('collected_at')->constrained('users')->nullOnDelete();
            $table->text('collection_notes')->nullable()->after('collected_by');
            $table->string('collection_reference')->nullable()->after('collection_notes');
        });
    }

    public function down(): void
    {
        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('collected_by');
            $table->dropColumn(['collected_at', 'collection_notes', 'collection_reference']);
        });
    }
};
