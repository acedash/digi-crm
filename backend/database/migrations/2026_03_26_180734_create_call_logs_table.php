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
        Schema::create('call_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('users');
            $table->foreignId('client_id')->nullable()->constrained('clients');
            $table->string('call_type'); // Inbound, Outbound
            $table->string('airline_inquiry')->nullable();
            $table->string('customer_outcome');
            $table->text('notes')->nullable();
            $table->boolean('callback_required')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_logs');
    }
};
