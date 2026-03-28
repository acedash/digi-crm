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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->unsignedBigInteger('agent_id');
            $table->string('booking_reference')->unique(); // e.g. BK-2024-0001
            $table->string('pnr')->nullable();
            $table->string('type')->default('Flight'); // Flight, Hotel, Transport, etc
            $table->string('status')->default('Pending'); // Pending, Confirmed, Cancelled
            $table->string('description')->nullable();
            $table->date('travel_date')->nullable();
            $table->date('return_date')->nullable();
            $table->decimal('total_price', 10, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->longText('pnr_raw')->nullable(); // Store raw GDS data
            $table->string('itinerary_group')->nullable(); // For grouping multiple bookings
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('agent_id')->references('id')->on('users');
        });

        Schema::create('booking_passenger', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('booking_id');
            $table->unsignedBigInteger('passenger_id');
            $table->timestamps();

            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
            $table->foreign('passenger_id')->references('id')->on('passengers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_passenger');
        Schema::dropIfExists('bookings');
    }
};
