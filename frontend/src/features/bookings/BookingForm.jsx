// Refactored Modular Booking Form
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import bookingService from './bookingService';
import { BACKEND_BASE_URL } from '../../services/api';
import Toast from '../../components/ui/Toast';
import api from '../../services/api';
import { useAuthStore } from '../auth/useAuthStore';
import Card from '../../components/ui/Card';

// Sub-components
import PassengerSection from './components/PassengerSection';
import PaymentSection from './components/PaymentSection';
import FlightSection from './components/FlightSection';
import HotelSection from './components/HotelSection';
import CarSection from './components/CarSection';
import CruiseSection from './components/CruiseSection';
import BookingFooter from './components/BookingFooter';

const BookingForm = ({ bookingId, onSuccess, onCancel }) => {
  const { user } = useAuthStore();
  const activeRole = typeof user?.roles?.[0] === 'object' ? user.roles[0].name : user?.roles?.[0];
  const [loading, setLoading] = useState(false);
  
  // State
  const [newClient, setNewClient] = useState({ 
    first_name: '', middle_name: '', last_name: '', 
    email: '', phone: '', address: '', date_of_birth: '', gender: '' 
  });
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [newPassengers, setNewPassengers] = useState([]);
  const [paymentCards, setPaymentCards] = useState([
    { holder_name: '', number: '', exp: '', cvv: '', amount: '' }
  ]);
  
  const [flight, setFlight] = useState({ active: false, ticket_image: '', ticket_preview: '', cost: 0, markup: 0, sell: 0 });
  const [hotel, setHotel] = useState({ active: false, name: '', city: '', checkin: '', checkout: '', cost: 0, markup: 0, sell: 0 });
  const [vehicle, setVehicle] = useState({ active: false, company: '', model: '', pickup_loc: '', pickup_date: '', dropoff_date: '', cost: 0, markup: 0, sell: 0 });
  const [cruise, setCruise] = useState({ active: false, line: '', ship: '', departure_date: '', arrival_date: '', cost: 0, markup: 0, sell: 0 });
  
  const [toast, setToast] = useState({ message: '', type: 'error' });

  // Reassignment Dropdown
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(user?.id);

  useEffect(() => {
    if (activeRole === 'admin' || activeRole === 'supervisor') {
      const fetchAgents = async () => {
        const endpoint = activeRole === 'admin' ? '/admin/users' : '/supervisor/my-agents';
        try {
          const res = await api.get(endpoint);
          let agents = res.data.data;
          if (activeRole === 'admin') {
            agents = agents.filter(u => u.roles.some(r => r.name === 'agent' || r.name === 'supervisor'));
          }
          setAvailableAgents(agents);
        } catch (e) {
          console.error("Failed to load agents for reassignment", e);
        }
      };
      fetchAgents();
    }
  }, [activeRole]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      if (bookingId) {
        const res = await bookingService.getBooking(bookingId);
        const b = res.data.data;
        if (b) {
          setSelectedAgentId(b.agent_id); // Load the original assignee
          
          if (b.client) {
            const cleanClient = { ...b.client };
            Object.keys(cleanClient).forEach(key => { if (cleanClient[key] === null) cleanClient[key] = ''; });
            setNewClient(cleanClient);
            setSelectedClientId(b.client_id);
          }

          if (b.passengers) {
             const others = b.passengers.filter(p => p.id !== b.client_id).map(p => {
               const cleanP = { ...p, id: p.id };
               Object.keys(cleanP).forEach(key => { if (cleanP[key] === null) cleanP[key] = ''; });
               return cleanP;
             });
             setNewPassengers(others);
          }

          if (b.details_json?.payment_cards) {
            setPaymentCards(b.details_json.payment_cards.map(c => ({
              holder_name: c.holder_name ?? '',
              number: c.number ?? '',
              exp: c.exp ?? '',
              cvv: c.cvv ?? '',
              amount: c.amount ?? ''
            })));
          }

          b.services?.forEach(s => {
            const type = s.serviceable_type.split('\\').pop().toLowerCase();
            const details = s.serviceable || {};
            const cost = s.cost_price ?? 0;
            const markup = s.markup ?? 0;
            const sell = s.sell_price ?? 0;

            if (type === 'flight') {
              const imgPath = details.ticket_image;
              const preview = imgPath ? `${BACKEND_BASE_URL}/storage/${imgPath}` : '';
              setFlight({ active: true, pnr: details.pnr ?? '', airline: details.airline ?? '', origin: details.origin ?? '', destination: details.destination ?? '', ticket_image: imgPath ?? '', ticket_preview: preview, cost, markup, sell });
            } else if (type === 'hotel') {
              setHotel({ active: true, name: details.name ?? '', city: details.city ?? '', checkin: s.details_json?.checkin ?? '', checkout: s.details_json?.checkout ?? '', cost, markup, sell });
            } else if (type === 'car') {
              setVehicle({ active: true, company: details.company ?? '', model: details.car_type ?? details.model ?? '', pickup_loc: s.details_json?.pickup_loc ?? '', pickup_date: s.details_json?.pickup_date ?? '', dropoff_date: s.details_json?.dropoff_date ?? '', cost, markup, sell });
            } else if (type === 'cruise') {
              setCruise({ active: true, line: details.operator ?? details.line ?? '', ship: details.cruise_name ?? details.ship ?? '', departure_date: s.details_json?.departure_date ?? '', arrival_date: s.details_json?.arrival_date ?? '', cost, markup, sell });
            }
          });
        }
      }
    } catch (error) { console.error('Error loading booking:', error); } finally { setLoading(false); }
  };

  const calculateTotal = () => {
    let t = 0;
    if (flight.active) t += Number(flight.sell) || 0;
    if (hotel.active) t += Number(hotel.sell) || 0;
    if (vehicle.active) t += Number(vehicle.sell) || 0;
    if (cruise.active) t += Number(cruise.sell) || 0;
    return t;
  };

  const handleTicketUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFlight({ ...flight, ticket_image: reader.result, ticket_preview: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const isValidLuhn = (number) => {
    let sum = 0; let shouldDouble = false;
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number.charAt(i));
        if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
        sum += digit; shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
  };

  const handleSubmit = async () => {
    const missingPrimary = [];
    if (!newClient.first_name) missingPrimary.push("First Name");
    if (!newClient.last_name) missingPrimary.push("Last Name");
    if (!newClient.email) missingPrimary.push("Email");
    if (!newClient.phone) missingPrimary.push("Phone");
    if (!newClient.date_of_birth) missingPrimary.push("Date of Birth");
    if (!newClient.gender) missingPrimary.push("Gender");

    if (missingPrimary.length > 0) return setToast({ message: `Missing fields: ${missingPrimary.join(', ')}`, type: 'error' });

    const servicesPayload = [];
    if (flight.active) servicesPayload.push({ type: 'flight', flight_details: { ticket_image: flight.ticket_image }, cost_price: flight.cost, markup: flight.markup, sell_price: flight.sell });
    if (hotel.active) servicesPayload.push({ type: 'hotel', hotel_details: { name: hotel.name, city: hotel.city }, details: { checkin: hotel.checkin, checkout: hotel.checkout }, cost_price: hotel.cost, markup: hotel.markup, sell_price: hotel.sell });
    if (vehicle.active) servicesPayload.push({ type: 'car', car_details: { company: vehicle.company, car_type: vehicle.model }, details: { pickup_loc: vehicle.pickup_loc, pickup_date: vehicle.pickup_date, dropoff_date: vehicle.dropoff_date }, cost_price: vehicle.cost, markup: vehicle.markup, sell_price: vehicle.sell });
    if (cruise.active) servicesPayload.push({ type: 'cruise', cruise_details: { operator: cruise.line, cruise_name: cruise.ship }, details: { departure_date: cruise.departure_date, arrival_date: cruise.arrival_date }, cost_price: cruise.cost, markup: cruise.markup, sell_price: cruise.sell });

    if (servicesPayload.length === 0) return setToast({ message: "Add at least one service.", type: 'error' });

    const grandTotal = calculateTotal();
    const totalAllocated = paymentCards.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    if (Math.abs(totalAllocated - grandTotal) > 0.01) return setToast({ message: "Payment allocation mismatch.", type: 'error' });

    for (let i = 0; i < paymentCards.length; i++) {
        const card = paymentCards[i];
        const cardNumClean = (card.number || '').replace(/\s/g, '');
        if (!card.holder_name || !card.number || !card.exp || !card.amount) return setToast({ message: `Card #${i + 1} incomplete.`, type: 'error' });
        if (!isValidLuhn(cardNumClean)) return setToast({ message: `Card #${i + 1} invalid (Luhn).`, type: 'error' });
    }

    const payload = {
      agent_id: selectedAgentId,
      client_id: selectedClientId,
      new_client: bookingId ? newClient : (selectedClientId ? null : newClient),
      new_passengers: newPassengers,
      services: servicesPayload,
      payment_cards: paymentCards,
      cards_to_sync: paymentCards.filter(c => !c.number.includes('•') && !c.number.includes('*'))
    };

    setLoading(true);
    try {
      if (bookingId) await bookingService.updateBooking(bookingId, payload);
      else await bookingService.createBooking(payload);
      onSuccess();
    } catch (error) {
      setToast({
        message: error?.response?.data?.message || 'Error saving booking.',
        type: 'error'
      });
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={onCancel}>Back</Button>
        <h2 style={{ fontSize: '28px', fontWeight: 800 }}>{bookingId ? 'Edit' : 'Create'} <span className="premium-gradient-text">Booking</span></h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Supervisor Reassignment Box */}
        {(activeRole === 'admin' || activeRole === 'supervisor') && (
          <Card style={{ padding: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-app)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span>
              Assign Responsible Agent
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Supervisors can map this booking to a specific agent on their team.</p>
            <select 
              value={selectedAgentId || ''} 
              onChange={e => setSelectedAgentId(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
            >
              <option value={user?.id}>Assign directly to myself ({user?.name})</option>
              {availableAgents.filter(ag => ag.id !== user?.id).map(ag => (
                <option key={ag.id} value={ag.id}>
                  Assign to: {ag.name} ({ag.user_custom_id})
                </option>
              ))}
            </select>
          </Card>
        )}

        <PassengerSection newClient={newClient} setNewClient={setNewClient} newPassengers={newPassengers} setNewPassengers={setNewPassengers} />
        <PaymentSection paymentCards={paymentCards} setPaymentCards={setPaymentCards} grandTotal={calculateTotal()} />
        <FlightSection flight={flight} setFlight={setFlight} handleTicketUpload={handleTicketUpload} />
        <HotelSection hotel={hotel} setHotel={setHotel} />
        <CarSection vehicle={vehicle} setVehicle={setVehicle} />
        <CruiseSection cruise={cruise} setCruise={setCruise} />
      </div>

      <BookingFooter 
        calculateTotal={calculateTotal} 
        totalAllocated={paymentCards.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)} 
        handleSubmit={handleSubmit} 
        loading={loading} 
      />

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
    </motion.div>
  );
};

export default BookingForm;
