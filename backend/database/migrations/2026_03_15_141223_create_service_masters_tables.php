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
        Schema::create('hotels', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('supplier_id');
            $table->string('name');
            $table->string('city');
            $table->string('country');
            $table->integer('rating')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
        });

        Schema::create('cars', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('supplier_id');
            $table->string('car_type'); // Sedan, SUV, etc.
            $table->string('company'); // Brand/Model
            $table->integer('capacity')->default(4);
            $table->decimal('price_per_day', 10, 2)->nullable();
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
        });

        Schema::create('cruises', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('supplier_id');
            $table->string('cruise_name');
            $table->string('operator');
            $table->string('departure_port')->nullable();
            $table->string('destination')->nullable();
            $table->string('duration')->nullable();
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cruises');
        Schema::dropIfExists('cars');
        Schema::dropIfExists('hotels');
    }
};
