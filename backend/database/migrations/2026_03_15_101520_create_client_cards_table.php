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
        Schema::create('client_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->string('card_holder_name');
            $table->string('card_number'); // Will be encrypted at model level or using encrypted column
            $table->integer('expiry_month');
            $table->integer('expiry_year');
            $table->string('card_type')->nullable(); // Visa, Mastercard, etc.
            $table->string('cvv')->nullable();
            $table->text('billing_address')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_cards');
    }
};
