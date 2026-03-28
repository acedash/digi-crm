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
        // 1. Refactor bookings table (Remove service-specific fields)
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'pnr', 
                'type', 
                'description', 
                'travel_date', 
                'return_date', 
                'pnr_raw', 
                'itinerary_group'
            ]);
            $table->renameColumn('total_price', 'total_amount');
        });

        // 2. Create dynamic flights table (Flights are not masters)
        Schema::create('flights', function (Blueprint $table) {
            $table->id();
            $table->string('pnr')->nullable();
            $table->string('airline_code')->nullable();
            $table->string('flight_number')->nullable();
            $table->string('departure_city')->nullable();
            $table->string('arrival_city')->nullable();
            $table->dateTime('departure_at')->nullable();
            $table->dateTime('arrival_at')->nullable();
            $table->longText('pnr_data_raw')->nullable();
            $table->timestamps();
        });

        // 3. Create polymorphic booking_services table
        Schema::create('booking_services', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('booking_id');
            $table->morphs('serviceable'); // serviceable_id, serviceable_type
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('sell_price', 15, 2)->default(0);
            $table->decimal('markup', 15, 2)->default(0);
            $table->string('status')->default('Pending');
            $table->json('details_json')->nullable();
            $table->timestamps();

            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_services');
        Schema::dropIfExists('flights');

        Schema::table('bookings', function (Blueprint $table) {
            $table->renameColumn('total_amount', 'total_price');
            $table->string('pnr')->nullable();
            $table->string('type')->default('Flight');
            $table->string('description')->nullable();
            $table->date('travel_date')->nullable();
            $table->date('return_date')->nullable();
            $table->longText('pnr_raw')->nullable();
            $table->string('itinerary_group')->nullable();
        });
    }
};
