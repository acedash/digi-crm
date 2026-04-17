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
        Schema::table('hotels', function (Blueprint $table) {
            $table->string('booking_confirmation')->nullable()->after('room_type');
            $table->integer('room_count')->default(1)->after('booking_confirmation');
            $table->integer('adult_count')->default(1)->after('room_count');
            $table->integer('child_count')->default(0)->after('adult_count');
            $table->string('children_ages')->nullable()->after('child_count');
            $table->dateTime('check_in_at')->nullable()->after('children_ages');
            $table->dateTime('check_out_at')->nullable()->after('check_in_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hotels', function (Blueprint $table) {
            $table->dropColumn([
                'booking_confirmation',
                'room_count',
                'adult_count',
                'child_count',
                'children_ages',
                'check_in_at',
                'check_out_at'
            ]);
        });
    }
};
