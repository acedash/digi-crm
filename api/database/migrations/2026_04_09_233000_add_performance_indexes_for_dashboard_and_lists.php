<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->index(['agent_id', 'created_at'], 'bookings_agent_created_at_idx');
            $table->index(['agent_id', 'status'], 'bookings_agent_status_idx');
            $table->index(['status', 'created_at'], 'bookings_status_created_at_idx');
            $table->index(['client_id', 'created_at'], 'bookings_client_created_at_idx');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->index('agent_id', 'clients_agent_id_idx');
            $table->index('created_by', 'clients_created_by_idx');
            $table->index('phone', 'clients_phone_idx');
            $table->index('email', 'clients_email_idx');
        });

        Schema::table('call_logs', function (Blueprint $table) {
            $table->index(['agent_id', 'created_at'], 'call_logs_agent_created_at_idx');
            $table->index(['agent_id', 'log_scope', 'created_at'], 'call_logs_agent_scope_created_at_idx');
            $table->index(['client_id', 'created_at'], 'call_logs_client_created_at_idx');
            $table->index(['log_scope', 'created_at'], 'call_logs_scope_created_at_idx');
        });

        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->index(['status', 'collected_at'], 'payment_auth_status_collected_idx');
            $table->index(['collected_at'], 'payment_auth_collected_at_idx');
            $table->index(['approved_at'], 'payment_auth_approved_at_idx');
            $table->index(['client_id', 'status'], 'payment_auth_client_status_idx');
        });

        Schema::table('booking_payment_auth', function (Blueprint $table) {
            $table->index(['booking_id', 'payment_auth_id'], 'booking_payment_auth_booking_auth_idx');
            $table->index(['payment_auth_id', 'booking_id'], 'booking_payment_auth_auth_booking_idx');
        });

        Schema::table('booking_services', function (Blueprint $table) {
            $table->index(['booking_id', 'serviceable_type'], 'booking_services_booking_type_idx');
        });

        Schema::table('user_activities', function (Blueprint $table) {
            $table->index(['user_id', 'created_at'], 'user_activities_user_created_at_idx');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_agent_created_at_idx');
            $table->dropIndex('bookings_agent_status_idx');
            $table->dropIndex('bookings_status_created_at_idx');
            $table->dropIndex('bookings_client_created_at_idx');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex('clients_agent_id_idx');
            $table->dropIndex('clients_created_by_idx');
            $table->dropIndex('clients_phone_idx');
            $table->dropIndex('clients_email_idx');
        });

        Schema::table('call_logs', function (Blueprint $table) {
            $table->dropIndex('call_logs_agent_created_at_idx');
            $table->dropIndex('call_logs_agent_scope_created_at_idx');
            $table->dropIndex('call_logs_client_created_at_idx');
            $table->dropIndex('call_logs_scope_created_at_idx');
        });

        Schema::table('payment_authorizations', function (Blueprint $table) {
            $table->dropIndex('payment_auth_status_collected_idx');
            $table->dropIndex('payment_auth_collected_at_idx');
            $table->dropIndex('payment_auth_approved_at_idx');
            $table->dropIndex('payment_auth_client_status_idx');
        });

        Schema::table('booking_payment_auth', function (Blueprint $table) {
            $table->dropIndex('booking_payment_auth_booking_auth_idx');
            $table->dropIndex('booking_payment_auth_auth_booking_idx');
        });

        Schema::table('booking_services', function (Blueprint $table) {
            $table->dropIndex('booking_services_booking_type_idx');
        });

        Schema::table('user_activities', function (Blueprint $table) {
            $table->dropIndex('user_activities_user_created_at_idx');
        });
    }
};
