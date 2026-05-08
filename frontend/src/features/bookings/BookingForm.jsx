// Refactored Modular Booking Form
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Lock, ShieldCheck, Copy, ExternalLink, Check } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import bookingService from './bookingService';
import paymentAuthService from './paymentAuthService';
import { BACKEND_BASE_URL } from '../../services/api';
import Toast from '../../components/ui/Toast';
import api from '../../services/api';
import { useAuthStore } from '../auth/useAuthStore';
import Card from '../../components/ui/Card';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../../components/ui/Modal';

// Sub-components
import PassengerSection from './components/PassengerSection';
import PaymentSection from './components/PaymentSection';
import FlightSection from './components/FlightSection';
import HotelSection from './components/HotelSection';
import CarSection from './components/CarSection';
import CruiseSection from './components/CruiseSection';
import BookingFooter from './components/BookingFooter';
import EmailPreviewModal from './components/EmailPreviewModal';

const createEmptyFlightSegment = () => ({
  airline: '',
  flight_number: '',
  origin: '',
  destination: '',
  departure_at: '',
  arrival_at: '',
  seat_number: '',
  personal_item: '',
  carry_on: '',
  checkin_bags: '',
  ticket_images: [],
  ticket_previews: [],
});

const buildStoredImagePreview = (path) => {
  if (!path) return '';
  if (String(path).startsWith('data:image')) return path;
  if (String(path).startsWith('http://') || String(path).startsWith('https://')) return path;
  const cleanPath = String(path).replace(/^\/+/g, '').replace(/^(storage\/app\/public|uploads)\//, '');
  const urlBase = import.meta.env.DEV ? `${BACKEND_BASE_URL}/uploads` : `${BACKEND_BASE_URL}/core/uploads`;
  return `${urlBase}/${cleanPath}`;
};

const normalizeFlightSegments = (segments = []) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [createEmptyFlightSegment()];
  }

  return segments.map((segment) => {
    const images = Array.isArray(segment.ticket_images) && segment.ticket_images.length > 0
      ? segment.ticket_images 
      : (segment.ticket_image ? [segment.ticket_image] : []);
    return {
      airline: segment.airline || segment.airline_code || '',
      flight_number: segment.flight_number || '',
      origin: segment.origin || segment.departure_city || '',
      destination: segment.destination || segment.arrival_city || '',
      departure_at: segment.departure_at || '',
      arrival_at: segment.arrival_at || '',
      seat_number: segment.seat_number || '',
      personal_item: segment.personal_item || '',
      carry_on: segment.carry_on || '',
      checkin_bags: segment.checkin_bags || '',
      ticket_image: segment.ticket_image || (images.length > 0 ? images[0] : ''),
      ticket_images: images,
      ticket_previews: images.map(img => buildStoredImagePreview(img)),
    };
  });
};

const BookingForm = ({ bookingId, onSuccess, onCancel }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const basePath = '/' + location.pathname.split('/')[1];
  const activeRole = typeof user?.roles?.[0] === 'object' ? user.roles[0].name : user?.roles?.[0];
  const [loading, setLoading] = useState(false);
  const workflow = searchParams.get('workflow') || '';
  const workflowTemplate = searchParams.get('template') || '';
  const isChangeWorkflow = Boolean(bookingId && workflow === 'service-change');
  const [bookingStatus, setBookingStatus] = useState('');
  const isApprovalLocked = Boolean(
    bookingId &&
    !isChangeWorkflow &&
    ['Approved', 'Confirmed', 'Awaiting Change Approval', 'Change Approved', 'Change Rejected'].includes(bookingStatus)
  );
  const isChangeWorkflowBlocked = Boolean(
    bookingId &&
    isChangeWorkflow &&
    !['Approved', 'Confirmed', 'Awaiting Change Approval', 'Change Approved', 'Change Rejected'].includes(bookingStatus)
  );
  
  // State
  const [newClient, setNewClient] = useState({ 
    first_name: '', middle_name: '', last_name: '', 
    email: '', alternate_email: '', phone: '', alternate_phone: '', address: '', date_of_birth: '', gender: '' 
  });
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [matchedClients, setMatchedClients] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [existingClientSearch, setExistingClientSearch] = useState('');
  const [existingClientResults, setExistingClientResults] = useState([]);
  const [existingClientsLoading, setExistingClientsLoading] = useState(false);
  const [newPassengers, setNewPassengers] = useState([]);
  const [paymentCards, setPaymentCards] = useState([
    { holder_name: '', number: '', exp: '', cvv: '', amount: '', remarks: '', currency: 'USD' }
  ]);
  const [changeChargeCards, setChangeChargeCards] = useState([]);
  
  const [flight, setFlight] = useState({
    active: false,
    trip_type: 'one_way',
    pnr: '',
    segments: [createEmptyFlightSegment()],
    ticket_images: [],
    ticket_previews: [],
    remarks: '',
    change_type: '',
    change_summary: '',
    additional_charge: '',
    cost: 0,
    markup: 0,
    sell: 0
  });
  const [hotel, setHotel] = useState({ 
    active: false, 
    name: '', 
    city: '', 
    address: '', 
    room_type: '', 
    images: [], 
    image_previews: [], 
    checkin: '', 
    checkout: '', 
    booking_confirmation: '',
    room_count: 1,
    room_types: [''],
    adult_count: 1,
    child_count: 0,
    children_ages: '',
    remarks: '', 
    change_type: '', 
    change_summary: '', 
    additional_charge: '', 
    cost: 0, 
    markup: 0, 
    sell: 0 
  });
  const [vehicle, setVehicle] = useState({ 
    active: false, 
    company: '', 
    model: '', 
    images: [], 
    image_previews: [], 
    pickup_loc: '', 
    drop_loc: '', 
    pickup_date: '', 
    dropoff_date: '', 
    driver_name: '',
    driver_dob: '',
    adult_count: 0,
    child_count: 0,
    infant_count: 0,
    pay_now_amount: 0,
    pay_at_pickup_amount: 0,
    remarks: '', 
    change_type: '', 
    change_summary: '', 
    additional_charge: '', 
    cost: 0, 
    markup: 0, 
    sell: 0 
  });
  const [cruise, setCruise] = useState({ 
    active: false, 
    line: '', 
    ship: '', 
    departure_port: '',
    room_type: '',
    deck_number: '',
    room_number: '',
    room_count: 1,
    room_types: [''],
    adult_count: 1,
    child_count: 0,
    children_dob: '',
    images: [], 
    image_previews: [], 
    departure_date: '', 
    arrival_date: '', 
    deposit_amount: '', 
    due_amount: '',
    due_date: '',
    remarks: '', 
    change_type: '', 
    change_summary: '', 
    additional_charge: '', 
    cost: 0, 
    markup: 0, 
    sell: 0 
  });
  
  const [toast, setToast] = useState({ message: '', type: 'error' });
  const [existingServiceFlags, setExistingServiceFlags] = useState({
    flight: false,
    hotel: false,
    car: false,
    cruise: false,
  });

  const [requestCardOnSave, setRequestCardOnSave] = useState(false);
  const [collectionLink, setCollectionLink] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Reassignment Dropdown
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(user?.id);
  const [emailPreview, setEmailPreview] = useState({
    open: false,
    title: '',
    previewData: null,
    onConfirm: null,
    isLoading: false
  });

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
    if (bookingId || selectedClientId) {
      return;
    }

    const normalizedPhone = newClient.phone.replace(/\D+/g, '');
    const normalizedEmail = newClient.email.trim();
    const hasEnoughData = normalizedPhone.length >= 7 || normalizedEmail.length > 3;

    if (!hasEnoughData) {
      setMatchedClients([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setMatchesLoading(true);
        const response = await api.get('/admin/clients', {
          params: {
            email: normalizedEmail || undefined,
            phone: normalizedPhone,
          }
        });

        const payload = response.data?.data?.data || response.data?.data || [];
        setMatchedClients(Array.isArray(payload) ? payload.slice(0, 5) : []);
      } catch {
        setMatchedClients([]);
      } finally {
        setMatchesLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [
    bookingId,
    selectedClientId,
    newClient.email,
    newClient.phone,
  ]);

  useEffect(() => {
    if (bookingId) {
      return;
    }

    const query = existingClientSearch.trim();
    if (query.length < 2) {
      setExistingClientResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setExistingClientsLoading(true);
        const normalizedPhone = query.replace(/\D+/g, '');
        const normalizedEmail = query.toLowerCase();
        const looksLikeEmail = normalizedEmail.includes('@');
        const looksLikePhone = normalizedPhone.length >= 3 && /^[\d\s()+-]+$/.test(query);
        const response = await api.get('/admin/clients', {
          params: {
            client_name: !looksLikeEmail && !looksLikePhone ? query : undefined,
            email: looksLikeEmail ? normalizedEmail : undefined,
            phone: looksLikePhone ? normalizedPhone : undefined,
          }
        });

        // With ClientService adding stats, the paginator items might be located at response.data.data.data.data
        const resData = response.data?.data;
        let payload = [];
        if (resData) {
          if (Array.isArray(resData)) payload = resData;
          else if (Array.isArray(resData.data)) payload = resData.data; // Standard paginator
          else if (resData.data && Array.isArray(resData.data.data)) payload = resData.data.data; // Wrapped with stats
        }
        
        setExistingClientResults(payload.slice(0, 8));
      } catch {
        setExistingClientResults([]);
      } finally {
        setExistingClientsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [bookingId, existingClientSearch]);

  const applySelectedClient = useCallback((client) => {
    setSelectedClientId(client.id);
    setNewClient({
      first_name: client.first_name || '',
      middle_name: client.middle_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      alternate_email: client.alternate_email || '',
      phone: client.phone || '',
      alternate_phone: client.alternate_phone || '',
      address: client.address || '',
      date_of_birth: client.date_of_birth || '',
      gender: client.gender || '',
    });
    setMatchedClients([]);
    setExistingClientResults([]);
    setExistingClientSearch([client.first_name, client.middle_name, client.last_name].filter(Boolean).join(' ') || client.email || client.phone || '');
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      if (bookingId) {
        const res = await bookingService.getBooking(bookingId);
        const b = res.data.data;
        if (b) {
          const serviceFlags = { flight: false, hotel: false, car: false, cruise: false };
          setBookingStatus(b.status || '');
          setSelectedAgentId(b.agent_id); // Load the original assignee
          
          if (b.client) {
            const cleanClient = { ...b.client };
            Object.keys(cleanClient).forEach(key => { if (cleanClient[key] === null) cleanClient[key] = ''; });
            setNewClient(cleanClient);
            setSelectedClientId(b.client_id);
          }

          if (b.passengers) {
             const others = b.passengers.map(p => {
               const cleanP = { ...p, id: p.id };
               Object.keys(cleanP).forEach(key => { if (cleanP[key] === null) cleanP[key] = ''; });
               return cleanP;
             });
             setNewPassengers(others);
          }

          if (b.details_json?.payment_cards) {
            const mappedCards = b.details_json.payment_cards.map(c => ({
              holder_name: c.holder_name ?? '',
              number: c.number ?? '',
              exp: c.exp ?? '',
              cvv: c.cvv ?? '',
              amount: c.amount ?? '',
              remarks: c.remarks ?? '',
              currency: c.currency ?? 'USD'
            }));
            setPaymentCards(mappedCards);
            setChangeChargeCards(mappedCards.map((card) => ({
              holder_name: card.holder_name,
              number: card.number,
              exp: card.exp,
              cvv: card.cvv,
              amount: '',
              remarks: '',
              currency: card.currency,
              isNew: false,
            })));
          }

          b.services?.forEach(s => {
            const type = (s.serviceable_type || '').split('\\').pop().toLowerCase();
            const details = s.serviceable || {};
            const cost = s.cost_price ?? 0;
            const markup = s.markup ?? 0;
            const sell = s.sell_price ?? 0;

            if (type === 'flight') {
              serviceFlags.flight = true;
              const imgPath = details.ticket_image;
              const preview = buildStoredImagePreview(imgPath);
              const storedSegments = s.details_json?.segments || [];
              const normalizedSegments = normalizeFlightSegments(
                storedSegments.length
                  ? storedSegments
                  : [{
                      airline: details.airline || details.airline_code || '',
                      flight_number: details.flight_number || '',
                      origin: details.origin || details.departure_city || '',
                      destination: details.destination || details.arrival_city || '',
                      departure_at: details.departure_at || '',
                      arrival_at: details.arrival_at || '',
                      ticket_image: imgPath ?? '',
                      ticket_images: details.ticket_images || [],
                    }]
              );
              setFlight({
                active: true,
                pnr: details.pnr ?? '',
                trip_type: s.details_json?.trip_type || (normalizedSegments.length > 2 ? 'multi_city' : normalizedSegments.length === 2 ? 'round_trip' : 'one_way'),
                segments: normalizedSegments,
                ticket_images: normalizedSegments[0]?.ticket_images || [],
                ticket_previews: normalizedSegments[0]?.ticket_previews || [],
                remarks: s.details_json?.remarks ?? '',
                change_type: s.details_json?.change_type ?? '',
                change_summary: s.details_json?.change_summary ?? '',
                additional_charge: s.details_json?.additional_charge ?? '',
                cost,
                markup,
                sell
              });
            } else if (type === 'hotel') {
              serviceFlags.hotel = true;
              const roomCount = details.room_count ?? s.details_json?.room_count ?? 1;
              const storedRoomType = details.room_type ?? '';
              let roomTypes = s.details_json?.room_types || [];
              if (roomTypes.length === 0 && storedRoomType) {
                roomTypes = storedRoomType.split(' / ');
              }
              while (roomTypes.length < (parseInt(roomCount) || 1)) roomTypes.push(roomTypes[0] || '');
              if (roomTypes.length > (parseInt(roomCount) || 1)) roomTypes = roomTypes.slice(0, parseInt(roomCount));

              setHotel({
                active: true,
                name: details.name ?? '',
                city: details.city ?? '',
                address: details.address ?? '',
                room_type: storedRoomType,
                room_types: roomTypes,
                images: s.details_json?.images ?? [],
                image_previews: (s.details_json?.images ?? []).map((image) => buildStoredImagePreview(image)).filter(Boolean),
                checkin: s.details_json?.checkin ?? details.check_in_at ?? '',
                checkout: s.details_json?.checkout ?? details.check_out_at ?? '',
                booking_confirmation: details.booking_confirmation ?? s.details_json?.booking_confirmation ?? '',
                room_count: roomCount,
                adult_count: details.adult_count ?? s.details_json?.adult_count ?? 1,
                child_count: details.child_count ?? s.details_json?.child_count ?? 0,
                children_ages: details.children_ages ?? s.details_json?.children_ages ?? '',
                remarks: s.details_json?.remarks ?? '',
                change_type: s.details_json?.change_type ?? '',
                change_summary: s.details_json?.change_summary ?? '',
                additional_charge: s.details_json?.additional_charge ?? '',
                cost,
                markup,
                sell
              });
            } else if (type === 'car') {
              serviceFlags.car = true;
              setVehicle({
                active: true,
                company: details.company ?? '',
                model: details.car_type ?? details.model ?? '',
                images: s.details_json?.images ?? [],
                image_previews: (s.details_json?.images ?? []).map((image) => buildStoredImagePreview(image)).filter(Boolean),
                pickup_loc: s.details_json?.pickup_loc ?? details.pickup_location ?? '',
                drop_loc: s.details_json?.drop_loc ?? details.drop_off_location ?? '',
                pickup_date: s.details_json?.pickup_date ?? details.pickup_at ?? '',
                dropoff_date: s.details_json?.dropoff_date ?? details.drop_off_at ?? '',
                driver_name: details.driver_name ?? s.details_json?.driver_name ?? '',
                driver_dob: details.driver_dob ?? s.details_json?.driver_dob ?? '',
                adult_count: details.adult_count ?? s.details_json?.adult_count ?? 0,
                child_count: details.child_count ?? s.details_json?.child_count ?? 0,
                infant_count: details.infant_count ?? s.details_json?.infant_count ?? 0,
                pay_now_amount: details.pay_now_amount ?? s.details_json?.pay_now_amount ?? 0,
                pay_at_pickup_amount: details.pay_at_pickup_amount ?? s.details_json?.pay_at_pickup_amount ?? 0,
                remarks: s.details_json?.remarks ?? '',
                change_type: s.details_json?.change_type ?? '',
                change_summary: s.details_json?.change_summary ?? '',
                additional_charge: s.details_json?.additional_charge ?? '',
                cost,
                markup,
                sell
              });
            } else if (type === 'cruise') {
              serviceFlags.cruise = true;
              const roomCount = details.room_count ?? s.details_json?.room_count ?? 1;
              const storedRoomType = details.room_type ?? '';
              let roomTypes = s.details_json?.room_types || [];
              if (roomTypes.length === 0 && storedRoomType) {
                roomTypes = storedRoomType.split(' / ');
              }
              while (roomTypes.length < (parseInt(roomCount) || 1)) roomTypes.push(roomTypes[0] || '');
              if (roomTypes.length > (parseInt(roomCount) || 1)) roomTypes = roomTypes.slice(0, parseInt(roomCount));

              setCruise({
                active: true,
                line: details.operator ?? details.line ?? '',
                ship: details.cruise_name ?? details.ship ?? '',
                images: s.details_json?.images ?? [],
                image_previews: (s.details_json?.images ?? []).map((image) => buildStoredImagePreview(image)).filter(Boolean),
                departure_date: s.details_json?.departure_date ?? details.departure_at ?? '',
                arrival_date: s.details_json?.arrival_date ?? details.arrival_at ?? '',
                departure_port: details.departure_port ?? s.details_json?.departure_port ?? '',
                room_type: storedRoomType,
                room_types: roomTypes,
                deck_number: details.deck_number ?? s.details_json?.deck_number ?? '',
                room_number: details.room_number ?? s.details_json?.room_number ?? '',
                room_count: roomCount,
                adult_count: details.adult_count ?? s.details_json?.adult_count ?? 1,
                child_count: details.child_count ?? s.details_json?.child_count ?? 0,
                children_dob: details.children_dob ?? s.details_json?.children_dob ?? '',
                deposit_amount: details.deposit_amount ?? s.details_json?.deposit_amount ?? '',
                due_amount: details.due_amount ?? s.details_json?.due_amount ?? '',
                due_date: details.due_date ?? s.details_json?.due_date ?? '',
                remarks: s.details_json?.remarks ?? '',
                change_type: s.details_json?.change_type ?? '',
                change_summary: s.details_json?.change_summary ?? '',
                additional_charge: s.details_json?.additional_charge ?? '',
                cost,
                markup,
                sell
              });
            }
          });

          setExistingServiceFlags(serviceFlags);
        }
      }
    } catch (error) { console.error('Error loading booking:', error); } finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const calculateTotal = () => {
    let t = 0;
    if (flight.active) t += Number(flight.sell) || 0;
    if (hotel.active) t += Number(hotel.sell) || 0;
    if (vehicle.active) t += Number(vehicle.sell) || 0;
    if (cruise.active) t += Number(cruise.sell) || 0;
    return t;
  };

  const calculateAdditionalChargeTotal = () => {
    if (!isChangeWorkflow) return 0;

    let total = 0;
    if (existingServiceFlags.flight && flight.active) total += Number(flight.additional_charge) || 0;
    if (existingServiceFlags.hotel && hotel.active) total += Number(hotel.additional_charge) || 0;
    if (existingServiceFlags.car && vehicle.active) total += Number(vehicle.additional_charge) || 0;
    if (existingServiceFlags.cruise && cruise.active) total += Number(cruise.additional_charge) || 0;
    return total;
  };

  const calculateChangeChargeAllocated = () =>
    changeChargeCards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);

  const updateFlightSegmentsForTripType = useCallback((tripType) => {
    setFlight((current) => {
      let nextSegments = normalizeFlightSegments(current.segments);

      if (tripType === 'one_way') {
        nextSegments = [nextSegments[0] || createEmptyFlightSegment()];
      } else if (tripType === 'round_trip') {
        while (nextSegments.length < 2) {
          nextSegments.push(createEmptyFlightSegment());
        }
        nextSegments = nextSegments.slice(0, 2);
      } else {
        while (nextSegments.length < 2) {
          nextSegments.push(createEmptyFlightSegment());
        }
      }

      return { ...current, trip_type: tripType, segments: nextSegments };
    });
  }, []);

  const updateFlightSegment = useCallback((index, field, value) => {
    setFlight((current) => {
      const nextSegments = normalizeFlightSegments(current.segments);
      nextSegments[index] = { ...nextSegments[index], [field]: value };
      return { ...current, segments: nextSegments };
    });
  }, []);

  const addFlightSegment = useCallback(() => {
    setFlight((current) => ({
      ...current,
      trip_type: current.trip_type === 'one_way' ? 'multi_city' : current.trip_type,
      segments: [...normalizeFlightSegments(current.segments), createEmptyFlightSegment()],
    }));
  }, []);

  const removeFlightSegment = useCallback((index) => {
    setFlight((current) => {
      const minimum = current.trip_type === 'one_way' ? 1 : 2;
      const nextSegments = normalizeFlightSegments(current.segments);

      if (nextSegments.length <= minimum) {
        return current;
      }

      return {
        ...current,
        segments: nextSegments.filter((_, segmentIndex) => segmentIndex !== index),
      };
    });
  }, []);

  const formatCardLabel = (number) => {
    const clean = String(number || '').replace(/\D+/g, '');
    if (!clean) return 'Card on file';
    return `XXXXXX${clean.slice(-4)}`;
  };

  const buildTravelerFromContact = useCallback(() => ({
    first_name: newClient.first_name || '',
    middle_name: newClient.middle_name || '',
    last_name: newClient.last_name || '',
    date_of_birth: newClient.date_of_birth || '',
    gender: newClient.gender || '',
  }), [newClient]);

  const isSameTraveler = useCallback((left, right) => {
    const normalize = (value) => String(value || '').trim().toLowerCase();

    return (
      normalize(left.first_name) === normalize(right.first_name) &&
      normalize(left.middle_name) === normalize(right.middle_name) &&
      normalize(left.last_name) === normalize(right.last_name) &&
      normalize(left.date_of_birth) === normalize(right.date_of_birth) &&
      normalize(left.gender) === normalize(right.gender)
    );
  }, []);

  const contactAlreadyAddedAsTraveler = newPassengers.some((passenger) =>
    isSameTraveler(passenger, buildTravelerFromContact())
  );

  const addContactAsTraveler = useCallback(() => {
    const traveler = buildTravelerFromContact();
    const missingFields = [];

    if (!traveler.first_name) missingFields.push('First Name');
    if (!traveler.last_name) missingFields.push('Last Name');
    if (!traveler.date_of_birth) missingFields.push('Date of Birth');
    if (!traveler.gender) missingFields.push('Gender');

    if (missingFields.length > 0) {
      setToast({
        message: `Complete the card holder fields first: ${missingFields.join(', ')}`,
        type: 'error',
      });
      return;
    }

    if (newPassengers.some((passenger) => isSameTraveler(passenger, traveler))) {
      setToast({
        message: 'This card holder is already added as a traveler.',
        type: 'success',
      });
      return;
    }

    setNewPassengers((current) => [...current, traveler]);
    setToast({
      message: 'Card holder added to traveling passengers.',
      type: 'success',
    });
  }, [buildTravelerFromContact, isSameTraveler, newPassengers]);

  const updateChangeChargeCard = (index, field, value) => {
    setChangeChargeCards((current) => {
      const updated = [...current];
      let nextValue = value ?? '';

      if (field === 'exp') {
        let clean = String(nextValue).replace(/\D/g, '');
        if (clean.length > 2) {
          nextValue = clean.substring(0, 2) + '/' + clean.substring(2, 4);
        } else {
          nextValue = clean;
        }
      }

      if (field === 'number') {
        let clean = String(nextValue).replace(/\D/g, '');
        if (clean.length > 16) clean = clean.substring(0, 16);
        nextValue = clean.match(/.{1,4}/g)?.join(' ') || clean;
      }

      updated[index] = { ...updated[index], [field]: nextValue };
      return updated;
    });
  };

  const handleTicketUpload = (e, segmentIndex = 0) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFlight((current) => {
          const nextSegments = normalizeFlightSegments(current.segments);
          const segment = nextSegments[segmentIndex];
          
          const updatedImages = [...(segment.ticket_images || []), reader.result];
          const updatedPreviews = [...(segment.ticket_previews || []), reader.result];

          nextSegments[segmentIndex] = {
            ...segment,
            ticket_images: updatedImages,
            ticket_previews: updatedPreviews,
          };

          return {
            ...current,
            ticket_images: segmentIndex === 0 ? updatedImages : current.ticket_images,
            ticket_previews: segmentIndex === 0 ? updatedPreviews : current.ticket_previews,
            segments: nextSegments,
          };
        });
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = '';
  };

  const removeTicketImage = (segmentIndex, imageIndex) => {
    setFlight((current) => {
      const nextSegments = normalizeFlightSegments(current.segments);
      const segment = nextSegments[segmentIndex];

      const updatedImages = (segment.ticket_images || []).filter((_, i) => i !== imageIndex);
      const updatedPreviews = (segment.ticket_previews || []).filter((_, i) => i !== imageIndex);

      nextSegments[segmentIndex] = {
        ...segment,
        ticket_images: updatedImages,
        ticket_previews: updatedPreviews,
      };

      return {
        ...current,
        ticket_images: segmentIndex === 0 ? updatedImages : current.ticket_images,
        ticket_previews: segmentIndex === 0 ? updatedPreviews : current.ticket_previews,
        segments: nextSegments,
      };
    });
  };

  const handleQuickAllocate = (amount) => {
    if (!isChangeWorkflow || !amount || parseFloat(amount) <= 0) return;
    
    setChangeChargeCards(current => {
      if (current.length === 0) return current;
      const next = [...current];
      // Allocate to first card
      const currentVal = parseFloat(next[0].amount) || 0;
      next[0].amount = (currentVal + parseFloat(amount)).toString();
      return next;
    });

    setToast({ message: `USD ${amount} allocated to your primary card.`, type: 'success' });
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

  const handleRequestCardDetails = async () => {
    if (!selectedClientId) {
      setToast({ message: "Please select or create a client first.", type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await paymentAuthService.create({
        client_id: selectedClientId,
        booking_ids: [],
        authorization_type: 'card_collection'
      });
      
      const link = `${window.location.origin}/card-collection/${res.data.data.token}`;
      setCollectionLink(link);
      setShowLinkModal(true);
      setIsCopied(false);
    } catch (error) {
      setToast({ message: error?.response?.data?.message || 'Failed to generate card collection link.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(collectionLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSubmit = async (forcedStatus = null) => {
    // Determine the status. If forcedStatus is provided (e.g. from handleSaveDraft), use it.
    // Otherwise, if it's currently a Draft, transition it to 'Pending' on confirm.
    const statusToSubmit = forcedStatus || (bookingStatus === 'Draft' ? 'Pending' : (bookingStatus || 'Pending'));

    if (!selectedClientId) {
      if (statusToSubmit === 'Draft') {
        // For draft, only require first OR last name
        if (!newClient.first_name && !newClient.last_name) {
          return setToast({ message: "Please enter at least a First or Last Name to save a draft.", type: 'error' });
        }
      } else {
        // Full validation for non-drafts
        const missingPrimary = [];
        if (!newClient.first_name) missingPrimary.push("First Name");
        if (!newClient.last_name) missingPrimary.push("Last Name");
        if (!newClient.email) missingPrimary.push("Email");
        if (!newClient.phone) missingPrimary.push("Phone");

        if (missingPrimary.length > 0) {
          return setToast({ message: `Missing fields: ${missingPrimary.join(', ')}`, type: 'error' });
        }

        // Phone format validation
        const phoneRegex = /^([0-9\s\-\+\(\)]*)$/;
        if (!phoneRegex.test(newClient.phone) || newClient.phone.replace(/\D/g, '').length < 7) {
          return setToast({ message: "Please enter a valid phone number (at least 7 digits).", type: 'error' });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newClient.email)) {
          return setToast({ message: "Please enter a valid email address.", type: 'error' });
        }
      }
    }

    const servicesPayload = [];
    if (flight.active) {
      const normalizedSegments = normalizeFlightSegments(flight.segments);
      const firstSegment = normalizedSegments[0] || createEmptyFlightSegment();
      
      const hasFlightData = flight.pnr || firstSegment.airline || firstSegment.origin || firstSegment.destination || (parseFloat(flight.sell) > 0) || (flight.ticket_previews?.length > 0) || (firstSegment.ticket_images?.length > 0);
      
      if (statusToSubmit !== 'Draft' || hasFlightData) {
        servicesPayload.push({
          type: 'flight',
          flight_details: {
            ticket_image: normalizedSegments[0]?.ticket_image || flight.ticket_image,
            ticket_images: [
              ...(normalizedSegments[0]?.ticket_images || flight.ticket_images || []),
              ...normalizedSegments.slice(1).flatMap(s => s.ticket_images || [])
            ],
            pnr: flight.pnr,
            airline_code: firstSegment.airline,
            flight_number: firstSegment.flight_number,
            departure_city: firstSegment.origin,
            arrival_city: firstSegment.destination,
            departure_at: firstSegment.departure_at,
            arrival_at: firstSegment.arrival_at,
          },
          details: {
            trip_type: flight.trip_type,
            segments: normalizedSegments.map((segment) => ({
              airline: segment.airline,
              flight_number: segment.flight_number,
              origin: segment.origin,
              destination: segment.destination,
              departure_at: segment.departure_at,
              arrival_at: segment.arrival_at,
              seat_number: segment.seat_number,
              personal_item: segment.personal_item,
              carry_on: segment.carry_on,
              checkin_bags: segment.checkin_bags,
              ticket_image: segment.ticket_image,
            })),
            remarks: flight.remarks,
            change_type: flight.change_type,
            change_summary: flight.change_summary,
            additional_charge: flight.additional_charge
          },
          cost_price: flight.cost,
          markup: flight.markup,
          sell_price: flight.sell
        });
      }
    }
    if (hotel.active) {
      const hasHotelData = (hotel.name?.trim()) || (parseFloat(hotel.sell) > 0);
      if (statusToSubmit !== 'Draft' || hotel.name?.trim()) {
        const roomTypeString = hotel.room_types?.filter(Boolean).join(' / ') || hotel.room_type;
        servicesPayload.push({
          type: 'hotel',
          hotel_details: { 
            name: hotel.name, 
            city: hotel.city, 
            address: hotel.address, 
            room_type: roomTypeString,
            room_count: hotel.room_count
          },
          details: {
            room_types: hotel.room_types,
            images: hotel.images || [],
            checkin: hotel.checkin,
            checkout: hotel.checkout,
            remarks: hotel.remarks,
            change_type: hotel.change_type,
            change_summary: hotel.change_summary,
            additional_charge: hotel.additional_charge,
            adult_count: hotel.adult_count,
            child_count: hotel.child_count,
            children_ages: hotel.children_ages,
            booking_confirmation: hotel.booking_confirmation
          },
          cost_price: hotel.cost,
          markup: hotel.markup,
          sell_price: hotel.sell
        });
      }
    }
    if (vehicle.active) {
      const hasVehicleData = (vehicle.company?.trim()) || (parseFloat(vehicle.sell) > 0);
      if (statusToSubmit !== 'Draft' || vehicle.company?.trim()) {
        servicesPayload.push({
          type: 'car',
          car_details: { company: vehicle.company, car_type: vehicle.model },
          details: {
            images: vehicle.images || [],
            pickup_loc: vehicle.pickup_loc,
            drop_loc: vehicle.drop_loc,
            pickup_date: vehicle.pickup_date,
            dropoff_date: vehicle.dropoff_date,
            driver_name: vehicle.driver_name,
            driver_dob: vehicle.driver_dob,
            adult_count: vehicle.adult_count,
            child_count: vehicle.child_count,
            infant_count: vehicle.infant_count,
            pay_now_amount: vehicle.pay_now_amount,
            pay_at_pickup_amount: vehicle.pay_at_pickup_amount,
            remarks: vehicle.remarks,
            change_type: vehicle.change_type,
            change_summary: vehicle.change_summary,
            additional_charge: vehicle.additional_charge
          },
          cost_price: vehicle.cost,
          markup: vehicle.markup,
          sell_price: vehicle.sell
        });
      }
    }
    if (cruise.active) {
      const hasCruiseData = (cruise.line?.trim()) || (parseFloat(cruise.sell) > 0);
      if (statusToSubmit !== 'Draft' || cruise.line?.trim()) {
        const roomTypeString = cruise.room_types?.filter(Boolean).join(' / ') || cruise.room_type;
        servicesPayload.push({
          type: 'cruise',
          cruise_details: { 
            operator: cruise.line, 
            cruise_name: cruise.ship,
            room_type: roomTypeString,
            room_count: cruise.room_count
          },
          details: {
            room_types: cruise.room_types,
            deck_number: cruise.deck_number,
            room_number: cruise.room_number,
            departure_port: cruise.departure_port,
            adult_count: cruise.adult_count,
            child_count: cruise.child_count,
            children_dob: cruise.children_dob,
            images: cruise.images || [],
            departure_date: cruise.departure_date,
            arrival_date: cruise.arrival_date,
            deposit_amount: cruise.deposit_amount,
            due_amount: cruise.due_amount,
            due_date: cruise.due_date,
            remarks: cruise.remarks,
            change_type: cruise.change_type,
            change_summary: cruise.change_summary,
            additional_charge: cruise.additional_charge
          },
          cost_price: cruise.cost,
          markup: cruise.markup,
          sell_price: cruise.sell
        });
      }
    }

    if (statusToSubmit !== 'Draft' && servicesPayload.length === 0) return setToast({ message: "Add at least one service.", type: 'error' });

    const grandTotal = calculateTotal();
    const totalAllocated = paymentCards.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    if (!isChangeWorkflow && statusToSubmit !== 'Draft' && !requestCardOnSave) {
      if (totalAllocated === 0) {
          return setToast({ message: "No Card Details", type: 'error' });
      }

      if (Math.abs(totalAllocated - grandTotal) > 0.01) return setToast({ message: "The total amount assigned to your payment cards must equal the booking's Grand Total.", type: 'error' });

      for (let i = 0; i < paymentCards.length; i++) {
          const card = paymentCards[i];
          const cardNumClean = (card.number || '').replace(/\s/g, '');
          if (!card.holder_name || !card.number || !card.exp || !card.amount) return setToast({ message: `Please complete all required fields for Card #${i + 1} (Name, Number, Expiry, and Amount).`, type: 'error' });
          if (!isValidLuhn(cardNumClean)) return setToast({ message: `The number for Card #${i + 1} is not a valid credit card number. Please double-check it.`, type: 'error' });
      }
    }

    const additionalChargeTotal = calculateAdditionalChargeTotal();
    const changeChargeAllocated = calculateChangeChargeAllocated();

    if (isChangeWorkflow && additionalChargeTotal > 0) {
      if (!changeChargeCards.length) {
        return setToast({ message: 'No saved cards are available for the change-charge authorization.', type: 'error' });
      }

      if (Math.abs(changeChargeAllocated - additionalChargeTotal) > 0.01) {
        return setToast({
          message: `The amount allocated to cards must match the Total Additional Charge (USD ${additionalChargeTotal.toFixed(2)}) exactly.`,
          type: 'error'
        });
      }

      for (let i = 0; i < changeChargeCards.length; i++) {
        const card = changeChargeCards[i];
        const amount = parseFloat(card.amount) || 0;
        if (amount <= 0) continue;

        const cardNumClean = (card.number || '').replace(/\s/g, '');
        if (!card.holder_name || !card.number || !card.exp) {
          return setToast({ message: `Change charge Card #${i + 1} is incomplete. Please fill in Name, Number, and Expiry.`, type: 'error' });
        }

        if (!isValidLuhn(cardNumClean)) {
          return setToast({ message: `The number for change charge Card #${i + 1} is not a valid credit card number.`, type: 'error' });
        }
      }
    }

    const payload = {
      status: statusToSubmit,
      agent_id: selectedAgentId,
      client_id: selectedClientId,
      update_mode: bookingId ? (isChangeWorkflow ? 'service_change' : 'standard') : 'standard',
      new_client: bookingId ? newClient : (selectedClientId ? null : newClient),
      new_passengers: newPassengers,
      services: servicesPayload,
      payment_cards: requestCardOnSave ? [] : paymentCards.filter(c => c.holder_name || c.number || c.amount),
      request_card_collection: requestCardOnSave,
      cards_to_sync: paymentCards.filter(c => !c.number.includes('•') && !c.number.includes('*')),
      change_charge_cards_to_sync: changeChargeCards
        .filter((card) => card.isNew && (parseFloat(card.amount) || 0) > 0)
        .map((card) => ({
          holder_name: card.holder_name,
          number: card.number,
          exp: card.exp,
          cvv: card.cvv || '',
          currency: card.currency || 'USD',
        })),
    };

    setLoading(true);
    try {
      const response = bookingId
        ? await bookingService.updateBooking(bookingId, payload)
        : await bookingService.createBooking(payload);
      const savedBooking = response?.data?.data;
      const changeTracking = savedBooking?.change_tracking || {};

      if (bookingId && isChangeWorkflow) {
        if (!changeTracking.recorded_service_change) {
          onSuccess({
            message: 'Booking updated. No tracked change was recorded, so no follow-up email was sent.',
            type: 'success',
          });
          return;
        }

        if ((Number(changeTracking.total_additional_charge) || 0) > 0) {
          try {
            await paymentAuthService.create({
              client_id: selectedClientId,
              booking_ids: [bookingId],
              authorization_type: 'change_charge',
              card_allocations: changeChargeCards
                .filter((card) => (parseFloat(card.amount) || 0) > 0)
                .map((card) => ({
                  holder_name: card.holder_name,
                  card_label: formatCardLabel(card.number),
                  amount: parseFloat(card.amount) || 0,
                  remarks: card.remarks || '',
                })),
              change_entries: changeTracking.current_service_changes || [],
            });
            onSuccess({
              message: 'Tracked change saved and change-charge authorization sent successfully.',
              type: 'success',
            });
            return;
          } catch (error) {
            setToast({
              message: error?.response?.data?.message || 'Change saved, but the change-charge authorization failed to send.',
              type: 'error'
            });
            return;
          }
        }

        if (workflowTemplate === 'flight_change' && changeTracking.recorded_flight_change) {
          try {
            const previewRes = await bookingService.previewTemplateEmail(bookingId, 'flight_change');
            setEmailPreview({
              open: true,
              title: 'Preview Flight Change Email',
              previewData: previewRes.data.data,
              confirmLabel: 'Send Notification Now',
              onConfirm: async () => {
                try {
                  setEmailPreview(prev => ({ ...prev, isLoading: true }));
                  await bookingService.sendTemplateEmail(bookingId, 'flight_change');
                  onSuccess({
                    message: 'Flight change saved and email sent successfully.',
                    type: 'success',
                  });
                  setEmailPreview({ open: false });
                } catch (err) {
                  setToast({ message: err?.response?.data?.message || 'Failed to send email', type: 'error' });
                } finally {
                  setEmailPreview(prev => ({ ...prev, isLoading: false }));
                }
              }
            });
            return;
          } catch (error) {
            setToast({
              message: error?.response?.data?.message || 'Booking saved, but failed to generate email preview.',
              type: 'error'
            });
            return;
          }
        }

        onSuccess({
          message: 'Adjustment saved successfully.',
          type: 'success',
        });
        return;
      }

      onSuccess({
        message: bookingId ? 'Booking updated successfully.' : 'Booking created successfully.',
        type: 'success',
      });
    } catch (error) {
      const errorData = error?.response?.data;
      let displayMsg = errorData?.message || 'Error saving booking.';
      
      if (errorData?.errors) {
        // Collect all error messages from the object
        const allErrors = Object.values(errorData.errors).flat();
        if (allErrors.length > 0) {
          displayMsg = allErrors.join(' | ');
        }
      }

      setToast({
        message: displayMsg,
        type: 'error'
      });
    } finally { setLoading(false); }
  };

  const handleSaveDraft = () => {
    // Save as draft skips standard field validations inside handleSubmit
    handleSubmit('Draft');
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={onCancel}>Back</Button>
        <h2 style={{ fontSize: '28px', fontWeight: 800 }}>{bookingId ? 'Edit' : 'Create'} <span className="premium-gradient-text">Booking</span></h2>
      </div>

      {isApprovalLocked ? (
        <div>
          <Card style={{ padding: '22px', border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.07)' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              Standard Edit Locked After Approval
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '18px' }}>
              This booking is already {bookingStatus}. To protect the approval record, normal edit is no longer allowed. Any update should go through modification mode so we can record what changed and handle any additional charges.
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={onCancel}>Back to Bookings</Button>
              <Button
                variant="primary"
                onClick={() => navigate(`${basePath}/bookings/${bookingId}/edit?workflow=service-change`)}
              >
                Modify Booking
              </Button>
            </div>
          </Card>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
        </div>
      ) : isChangeWorkflowBlocked ? (
        <div>
          <Card style={{ padding: '22px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
              Tracked Change Not Available Yet
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '18px' }}>
              This booking is currently {bookingStatus || 'Pending'}. Tracked change is only used after payment approval. Before approval, please use the normal edit flow.
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={onCancel}>Back to Bookings</Button>
              <Button
                variant="primary"
                onClick={() => navigate(`${basePath}/bookings/${bookingId}/edit`)}
              >
                Open Normal Edit
              </Button>
            </div>
          </Card>
          <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
        </div>
      ) : (
      <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {isChangeWorkflow ? (
          <Card style={{ padding: '18px 20px', border: '1px solid rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.06)' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
              Flight Change Workflow
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Update the booking, record the change details in the relevant service section, and save. We will only send the flight change email if a flight change was actually tracked during this edit.
            </div>
          </Card>
        ) : null}

        
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

        <PassengerSection
          isEditMode={Boolean(bookingId)}
          newClient={newClient}
          setNewClient={setNewClient}
          newPassengers={newPassengers}
          setNewPassengers={setNewPassengers}
          onAddContactAsTraveler={addContactAsTraveler}
          contactAlreadyAddedAsTraveler={contactAlreadyAddedAsTraveler}
          selectedClientId={selectedClientId}
          existingClientSearch={existingClientSearch}
          setExistingClientSearch={setExistingClientSearch}
          existingClientResults={existingClientResults}
          existingClientsLoading={existingClientsLoading}
          matchedClients={matchedClients}
          matchesLoading={matchesLoading}
          onSelectMatchedClient={applySelectedClient}
          onClearMatchedClient={() => {
            setSelectedClientId(null);
            setExistingClientSearch('');
            setExistingClientResults([]);
            setNewClient({ 
              first_name: '', middle_name: '', last_name: '', 
              email: '', alternate_email: '', phone: '', alternate_phone: '', address: '', date_of_birth: '', gender: '' 
            });
          }}
        />
        <PaymentSection 
          paymentCards={paymentCards} 
          setPaymentCards={setPaymentCards} 
          grandTotal={isChangeWorkflow ? paymentCards.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toFixed(2) : calculateTotal()} 
          requestCardOnSave={requestCardOnSave}
          setRequestCardOnSave={setRequestCardOnSave}
          title={isChangeWorkflow ? "2. Original Payment Cards" : "2. Payment Cards"}
          description={isChangeWorkflow ? (
            <span>
              This is the original approved allocation for the booking. You can now edit these details if needed. 
              Any extra charge for the tracked change should be split below in <strong style={{ color: 'var(--text-main)' }}>Change Charge Allocation</strong>.
            </span>
          ) : null}
        />
        <FlightSection 
          flight={flight} 
          setFlight={setFlight} 
          handleTicketUpload={handleTicketUpload} 
          removeTicketImage={removeTicketImage}
          isEditMode={Boolean(bookingId)}
          showChangeTracking={isChangeWorkflow && existingServiceFlags.flight}
          onQuickAllocate={handleQuickAllocate}
          updateFlightSegmentsForTripType={updateFlightSegmentsForTripType}
          updateFlightSegment={updateFlightSegment}
          addFlightSegment={addFlightSegment}
          removeFlightSegment={removeFlightSegment}
        />
        <HotelSection
          hotel={hotel}
          setHotel={setHotel}
          isEditMode={Boolean(bookingId)}
          showChangeTracking={isChangeWorkflow && existingServiceFlags.hotel}
          onQuickAllocate={handleQuickAllocate}
        />
        <CarSection
          vehicle={vehicle}
          setVehicle={setVehicle}
          isEditMode={Boolean(bookingId)}
          showChangeTracking={isChangeWorkflow && existingServiceFlags.car}
          onQuickAllocate={handleQuickAllocate}
        />
        <CruiseSection
          cruise={cruise}
          setCruise={setCruise}
          isEditMode={Boolean(bookingId)}
          showChangeTracking={isChangeWorkflow && existingServiceFlags.cruise}
        />

        {isChangeWorkflow && calculateAdditionalChargeTotal() > 0 ? (
          <Card style={{ padding: '20px', border: '1px solid rgba(1, 96, 64, 0.18)', background: 'rgba(1, 96, 64, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Change Charge Allocation
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Allocate only the additional change amount across the saved cards. We will send a fresh approval request for this change charge.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Additional Charge Total</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#06B68A' }}>USD {calculateAdditionalChargeTotal().toFixed(2)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {changeChargeCards.map((card, index) => (
                <div key={`${card.number}-${index}`} style={{ padding: '14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: card.isNew ? '1.1fr 1.1fr 0.8fr 0.8fr 0.8fr auto' : '1.2fr 0.8fr auto', gap: '16px', alignItems: 'end' }}>
                    {card.isNew ? (
                      <>
                        <Input
                          label="Holder Name"
                          value={card.holder_name || ''}
                          autoComplete="off"
                          onChange={(e) => updateChangeChargeCard(index, 'holder_name', e.target.value)}
                        />
                        <Input
                          label="Card Number"
                          value={card.number || ''}
                          autoComplete="off"
                          onChange={(e) => updateChangeChargeCard(index, 'number', e.target.value)}
                        />
                        <Input
                          label="Expiry"
                          placeholder="MM/YY"
                          value={card.exp || ''}
                          autoComplete="off"
                          onChange={(e) => updateChangeChargeCard(index, 'exp', e.target.value)}
                        />
                        <Input
                          label="CVV"
                          type="password"
                          value={card.cvv || ''}
                          autoComplete="new-password"
                          onChange={(e) => updateChangeChargeCard(index, 'cvv', e.target.value)}
                        />
                        <Input
                          label="Amount to Charge"
                          type="number"
                          value={card.amount || ''}
                          placeholder="0.00"
                          onChange={(e) => updateChangeChargeCard(index, 'amount', e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{card.holder_name || 'Card Holder'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{formatCardLabel(card.number)}</div>
                        </div>
                        <Input
                          label="Amount to Charge"
                          type="number"
                          value={card.amount || ''}
                          placeholder="0.00"
                          onChange={(e) => updateChangeChargeCard(index, 'amount', e.target.value)}
                        />
                      </>
                    )}
                    {card.isNew ? (
                      <Button
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => setChangeChargeCards((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                        style={{ color: '#ef4444', height: '42px' }}
                      />
                    ) : <div />}
                  </div>
                  {Math.abs(calculateChangeChargeAllocated() - calculateAdditionalChargeTotal()) > 0.01 && index === 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const diff = calculateAdditionalChargeTotal() - calculateChangeChargeAllocated();
                          if (diff > 0) {
                            const next = [...changeChargeCards];
                            const cur = parseFloat(next[0].amount) || 0;
                            next[0].amount = (cur + diff).toFixed(2);
                            setChangeChargeCards(next);
                            setToast({ message: `Remaining USD ${diff.toFixed(2)} allocated to primary card.`, type: 'success' });
                          }
                        }}
                      >
                        Sync Remaining Balance to this Card
                      </Button>
                    </div>
                  )}
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                      Card Charge Note
                    </label>
                    <textarea
                      value={card.remarks || ''}
                      onChange={(e) => updateChangeChargeCard(index, 'remarks', e.target.value)}
                      placeholder="Optional note for this card allocation"
                      style={{
                        width: '100%',
                        minHeight: '72px',
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        color: 'var(--text-main)',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '14px' }}>
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => setChangeChargeCards((current) => ([
                  ...current,
                  { holder_name: '', number: '', exp: '', cvv: '', amount: '', remarks: '', isNew: true }
                ]))}
              >
                Add New Card For This Change
              </Button>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>Allocated</span>
              <strong style={{ color: Math.abs(calculateChangeChargeAllocated() - calculateAdditionalChargeTotal()) < 0.01 ? '#06B68A' : '#dc2626' }}>
                USD {calculateChangeChargeAllocated().toFixed(2)}
              </strong>
            </div>
          </Card>
        ) : null}
      </div>

      <BookingFooter 
        currency={flight.currency || 'USD'}
        calculateTotal={isChangeWorkflow ? calculateAdditionalChargeTotal : calculateTotal}
        totalAllocated={isChangeWorkflow ? calculateChangeChargeAllocated() : paymentCards.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0)} 
        handleSubmit={() => handleSubmit()} 
        onSaveDraft={handleSaveDraft}
        loading={loading} 
        showDraft={!isChangeWorkflow && bookingStatus !== 'Approved' && bookingStatus !== 'Confirmed' && bookingStatus !== 'Completed'}
      />

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
      </>
      )}

      {showLinkModal && (
        <Modal 
          isOpen={showLinkModal} 
          onClose={() => setShowLinkModal(false)}
          title="Secure Card Collection Link"
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldCheck size={32} />
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 700, marginBottom: '10px' }}>Secure Link Generated</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
              Copy this link and send it to your client. They can securely upload their card details without you seeing the sensitive data.
            </p>
            
            <div style={{ display: 'flex', gap: '8px', padding: '12px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', marginBottom: '24px', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-main)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {collectionLink}
              </div>
              <Button size="sm" variant={isCopied ? 'success' : 'primary'} icon={isCopied ? Check : Copy} onClick={copyToClipboard}>
                {isCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="ghost" icon={ExternalLink} onClick={() => window.open(collectionLink, '_blank')}>
                Preview Page
              </Button>
            </div>
          </div>
        </Modal>
      )}
      
      <EmailPreviewModal
        open={emailPreview.open}
        title={emailPreview.title}
        previewData={emailPreview.previewData}
        isLoading={emailPreview.isLoading}
        onClose={() => setEmailPreview({ open: false })}
        onConfirm={emailPreview.onConfirm}
        confirmLabel={emailPreview.confirmLabel}
      />
    </div>
  );
};

export default BookingForm;
