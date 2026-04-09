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
        Schema::create('payment_authorizations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('client_id');
            $table->string('token')->unique(); // For secure public access
            $table->string('status')->default('Pending'); // Pending, Approved, Declined, Expired
            $table->decimal('total_amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            
            // Compliance & Consent Logs
            $table->timestamp('approved_at')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('digital_signature')->nullable(); // Optional visual signature data
            
            $table->json('metadata')->nullable(); // Store snapshot of itinerary details
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
        });

        Schema::create('booking_payment_auth', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payment_auth_id');
            $table->unsignedBigInteger('booking_id');
            
            $table->foreign('payment_auth_id')->references('id')->on('payment_authorizations')->onDelete('cascade');
            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_payment_auth');
        Schema::dropIfExists('payment_authorizations');
    }
};
