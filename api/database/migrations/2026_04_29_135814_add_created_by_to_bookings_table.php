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
        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
        });

        // Populate existing data from details_json
        DB::table('bookings')->orderBy('id')->chunk(100, function ($bookings) {
            foreach ($bookings as $booking) {
                $details = json_decode($booking->details_json, true);
                $creatorId = $details['created_by_id'] ?? $booking->agent_id;
                
                if ($creatorId) {
                    DB::table('bookings')
                        ->where('id', $booking->id)
                        ->update(['created_by' => $creatorId]);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn('created_by');
        });
    }
};
