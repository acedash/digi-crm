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
        $status = $this->input('status');
        $isDraft = $status === 'Draft';
        $isStatusOnly = $this->input('update_mode') === 'status_only';

        return [
            'client_id' => 'nullable|exists:clients,id',
            'agent_id' => 'nullable|exists:users,id',
            'update_mode' => 'nullable|string|in:standard,service_change,status_only',
            'status' => 'nullable|string|in:Draft,Pending,Awaiting Approval,Approved,Rejected,Confirmed,Cancelled,Completed,Awaiting Change Approval,Change Approved,Change Rejected,Work Pending',
            'status_remark' => 'nullable|string|max:2000',
            'currency' => 'nullable|string|size:3',
            'passengers' => 'nullable|array',
            'passengers.*' => 'exists:passengers,id',
            'new_client' => 'nullable|array',
            'new_passengers' => 'nullable|array',
            
            // Services: Required for non-draft, non-status-only updates
            'services' => ($isDraft || $isStatusOnly) ? 'nullable|array' : 'required|array|min:1',
            'services.*.type' => 'required|string|in:flight,hotel,car,cruise',
            'services.*.cost_price' => 'nullable|numeric|min:0',
            'services.*.sell_price' => $isDraft ? 'nullable|numeric|min:0' : 'required|numeric|min:0',
            'services.*.markup' => 'nullable|numeric|min:0',
            'services.*.details' => 'nullable|array',
            
            // Flight specific
            'services.*.flight_details' => 'required_if:services.*.type,flight|array',
            'services.*.flight_details.ticket_images' => ($isDraft ? 'nullable' : 'required_if:services.*.type,flight') . '|array',
            'services.*.flight_details.airline_code' => 'nullable|string',
            'services.*.flight_details.flight_number' => 'nullable|string',
            
            // Manual Service Details
            'services.*.hotel_details' => 'required_if:services.*.type,hotel|array',
            'services.*.hotel_details.name' => ($isDraft ? 'nullable' : 'required_if:services.*.type,hotel') . '|string|max:255',
            'services.*.hotel_details.city' => ($isDraft ? 'nullable' : 'required_if:services.*.type,hotel') . '|string|max:255',
            
            'services.*.car_details' => 'required_if:services.*.type,car|array',
            'services.*.car_details.company' => ($isDraft ? 'nullable' : 'required_with:services.*.car_details') . '|string|max:255',
            'services.*.car_details.car_type' => ($isDraft ? 'nullable' : 'required_if:services.*.type,car') . '|string|max:255',
            
            'services.*.cruise_details' => 'required_if:services.*.type,cruise|array',
            'services.*.cruise_details.operator' => ($isDraft ? 'nullable' : 'required_with:services.*.cruise_details') . '|string|max:255',
            'services.*.cruise_details.cruise_name' => ($isDraft ? 'nullable' : 'required_if:services.*.type,cruise') . '|string|max:255',
            
            // Payment Cards: Required only for non-draft updates if they are provided
            'payment_cards' => 'nullable|array',
            'payment_cards.*.holder_name' => ($isDraft ? 'nullable' : 'required_with:payment_cards') . '|string|max:255',
            'payment_cards.*.number' => ($isDraft ? 'nullable' : 'required_with:payment_cards') . '|string|min:13|max:19',
            'payment_cards.*.exp' => [
                $isDraft ? 'nullable' : 'required_with:payment_cards',
                'string',
                'regex:/^(0[1-9]|1[0-2])\/\d{2}$/'
            ],
            'payment_cards.*.cvv' => 'nullable|string|min:3|max:4',
            'payment_cards.*.amount' => ($isDraft ? 'nullable' : 'required_with:payment_cards') . '|numeric|min:0.01',
            'payment_cards.*.currency' => 'nullable|string|size:3',

            'change_charge_cards_to_sync' => 'nullable|array',
            'change_charge_cards_to_sync.*.holder_name' => 'required_with:change_charge_cards_to_sync|string|max:255',
            'change_charge_cards_to_sync.*.number' => 'required_with:change_charge_cards_to_sync|string|min:13|max:19',
            'change_charge_cards_to_sync.*.exp' => [
                'required_with:change_charge_cards_to_sync',
                'string',
                'regex:/^(0[1-9]|1[0-2])\/\d{2}$/'
            ],
            'change_charge_cards_to_sync.*.cvv' => 'nullable|string|min:3|max:4',
            'change_charge_cards_to_sync.*.currency' => 'nullable|string|size:3',
        ];
    }

    public function attributes(): array
    {
        return [
            'payment_cards.*.holder_name' => 'Card Holder Name',
            'payment_cards.*.number' => 'Card Number',
            'payment_cards.*.exp' => 'Expiry Date',
            'payment_cards.*.amount' => 'Payment Amount',
            'payment_cards.*.cvv' => 'CVV',
            'new_client.first_name' => 'Client First Name',
            'new_client.last_name' => 'Client Last Name',
            'services.*.sell_price' => 'Service Sell Price',
            'services.*.hotel_details.name' => 'Hotel Name',
            'services.*.hotel_details.city' => 'Hotel City',
            'services.*.car_details.company' => 'Rental Company',
            'services.*.car_details.car_type' => 'Car Model/Type',
            'services.*.cruise_details.operator' => 'Cruise Operator',
            'services.*.cruise_details.cruise_name' => 'Ship Name',
            'services.*.flight_details.ticket_images' => 'Ticket Image',
            'services.*.flight_details.airline_code' => 'Airline Code',
            'services.*.flight_details.flight_number' => 'Flight Number',
        ];
    }

    public function messages(): array
    {
        return [
            'payment_cards.*.exp.regex' => 'The Expiry Date must be in MM/YY format.',
            'payment_cards.*.holder_name.required_with' => 'Please provide the holder name for the payment card.',
            'payment_cards.*.number.required_with' => 'Please provide the card number.',
            'payment_cards.*.amount.required_with' => 'Please specify the amount for the payment card.',
            'services.*.flight_details.ticket_images.required_if' => 'At least one Ticket Image is required for the flight.',
            'services.*.flight_details.airline_code.required_if' => 'Airline Code is required for flight segments.',
            'services.*.flight_details.flight_number.required_if' => 'Flight Number is required for flight segments.',
            'services.*.hotel_details.name.required_if' => 'Hotel Name is required.',
            'services.*.hotel_details.city.required_if' => 'Hotel City is required.',
            'services.*.car_details.company.required_with' => 'Rental Company Name is required.',
            'services.*.car_details.car_type.required_if' => 'Car Model or Type is required.',
            'services.*.cruise_details.operator.required_with' => 'Cruise operator is required.',
            'services.*.cruise_details.cruise_name.required_if' => 'Ship name or cruise name is required.',
            'services.required_unless' => 'At least one service (Flight, Hotel, etc.) is required to confirm a booking.',
        ];
    }
}
