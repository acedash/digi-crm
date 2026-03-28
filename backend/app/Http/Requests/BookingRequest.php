<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => 'nullable|exists:clients,id',
            'agent_id' => 'nullable|exists:users,id',
            'status' => 'nullable|string|in:Pending,Awaiting Approval,Approved,Rejected,Confirmed,Cancelled,Completed',
            'currency' => 'nullable|string|size:3',
            'passengers' => 'nullable|array',
            'passengers.*' => 'exists:passengers,id',
            'new_client' => 'nullable|array',
            'new_passengers' => 'nullable|array',
            'services' => 'required|array|min:1',
            'services.*.type' => 'required|string|in:flight,hotel,car,cruise',
            'services.*.cost_price' => 'nullable|numeric|min:0',
            'services.*.sell_price' => 'required|numeric|min:0',
            'services.*.markup' => 'nullable|numeric|min:0',
            'services.*.details' => 'nullable|array',
            
            // Flight specific
            'services.*.flight_details' => 'required_if:services.*.type,flight|array',
            
            // Manual Service Details
            'services.*.hotel_details' => 'required_if:services.*.type,hotel|array',
            'services.*.car_details' => 'required_if:services.*.type,car|array',
            'services.*.cruise_details' => 'required_if:services.*.type,cruise|array',
            
            // Payment Cards
            'payment_cards' => 'nullable|array',
            'payment_cards.*.holder_name' => 'required_with:payment_cards|string|max:255',
            'payment_cards.*.number' => 'required_with:payment_cards|string|min:13|max:19',
            'payment_cards.*.exp' => [
                'required_with:payment_cards',
                'string',
                'regex:/^(0[1-9]|1[0-2])\/\d{2}$/'
            ],
            'payment_cards.*.cvv' => 'nullable|string|min:3|max:4',
            'payment_cards.*.amount' => 'required_with:payment_cards|numeric|min:0.01',
        ];
    }
}
