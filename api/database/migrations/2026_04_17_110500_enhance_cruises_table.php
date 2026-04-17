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
        Schema::table('cruises', function (Blueprint $table) {
            $table->string('room_type')->nullable()->after('duration');
            $table->string('deck_number')->nullable()->after('room_type');
            $table->string('room_number')->nullable()->after('deck_number');
            $table->integer('room_count')->default(1)->after('room_number');
            $table->integer('adult_count')->default(1)->after('room_count');
            $table->integer('child_count')->default(0)->after('adult_count');
            $table->string('children_dob')->nullable()->after('child_count');
            $table->decimal('deposit_amount', 15, 2)->nullable()->after('children_dob');
            $table->decimal('due_amount', 15, 2)->nullable()->after('deposit_amount');
            $table->date('due_date')->nullable()->after('due_amount');
            $table->dateTime('departure_at')->nullable()->after('due_date');
            $table->dateTime('arrival_at')->nullable()->after('departure_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cruises', function (Blueprint $table) {
            $table->dropColumn([
                'room_type',
                'deck_number',
                'room_number',
                'room_count',
                'adult_count',
                'child_count',
                'children_dob',
                'deposit_amount',
                'due_amount',
                'due_date',
                'departure_at',
                'arrival_at'
            ]);
        });
    }
};
