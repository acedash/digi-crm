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
        Schema::table('cars', function (Blueprint $table) {
            $table->string('pickup_location')->nullable()->after('company');
            $table->string('drop_off_location')->nullable()->after('pickup_location');
            $table->dateTime('pickup_at')->nullable()->after('drop_off_location');
            $table->dateTime('drop_off_at')->nullable()->after('pickup_at');
            $table->string('driver_name')->nullable()->after('drop_off_at');
            $table->date('driver_dob')->nullable()->after('driver_name');
            $table->integer('adult_count')->default(0)->after('driver_dob');
            $table->integer('child_count')->default(0)->after('adult_count');
            $table->integer('infant_count')->default(0)->after('child_count');
            $table->decimal('pay_now_amount', 10, 2)->default(0)->after('infant_count');
            $table->decimal('pay_at_pickup_amount', 10, 2)->default(0)->after('pay_now_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropColumn([
                'pickup_location',
                'drop_off_location',
                'pickup_at',
                'drop_off_at',
                'driver_name',
                'driver_dob',
                'adult_count',
                'child_count',
                'infant_count',
                'pay_now_amount',
                'pay_at_pickup_amount'
            ]);
        });
    }
};
