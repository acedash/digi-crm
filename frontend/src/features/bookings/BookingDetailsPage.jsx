import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  UserPlus,
  Package,
  ClipboardList,
  CreditCard,
  Plane,
  Hotel,
  Car,
  Ship,
  Eye,
  EyeOff,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import bookingService from './bookingService';
import { BACKEND_BASE_URL } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';

const BookingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/')[1];
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = React.useRef(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });
  const [showCards, setShowCards] = useState({});

  const fetchBooking = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const response = await bookingService.getBooking(id);
      setBooking(response.data?.data || null);
    } catch (error) {
      console.error('Failed to load booking details', error);
      setToast({ message: 'Failed to load booking details.', type: 'error' });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [id, fetchBooking]);

  const resolveImagePath = (path) => {
    if (!path) return '';
    const pathStr = path.toString();
    if (pathStr.startsWith('data:image') || pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
      return pathStr;
    }
    
    // Cleanup any leading slashes and ensure it points to the direct storage path
    const cleanPath = pathStr.replace(/^\/+/g, '').replace(/^(storage\/app\/public|uploads)\//, '');
    const urlBase = import.meta.env.DEV ? `${BACKEND_BASE_URL}/uploads` : `${BACKEND_BASE_URL}/core/uploads`;
    return `${urlBase}/${cleanPath}`;
  };

  const getServiceIcon = (serviceableType = '') => {
    if (serviceableType.includes('Flight')) return Plane;
    if (serviceableType.includes('Hotel')) return Hotel;
    if (serviceableType.includes('Car')) return Car;
    return Ship;
  };

  const formatCardNumber = (number) => {
    if (!number) return 'Card number not available';
    const compact = String(number).replace(/\s+/g, '');
    return compact.length <= 4 ? compact : `•••• •••• •••• ${compact.slice(-4)}`;
  };

  const revealCardNumber = (number) => {
    if (!number) return 'Card number not available';
    const compact = String(number).replace(/\s+/g, '');
    return compact.match(/.{1,4}/g)?.join(' ') || compact;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading booking details...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ padding: '24px' }}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(`${basePath}/bookings`)}>
          Back to Bookings
        </Button>
        <div style={{ marginTop: '16px', fontSize: '14px', color: '#ef4444' }}>
          Booking not found.
        </div>
      </div>
    );
  }

  const clientName =
    booking.client?.name ||
    `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim() ||
    'Unknown Client';
  const canViewSensitiveCards = Boolean(booking.details_json?.permissions?.can_view_sensitive_cards);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(`${basePath}/bookings`)}>
            Back to Bookings
          </Button>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#60a5fa', letterSpacing: '0.08em' }}>
              Booking Details
            </div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-main)' }}>{booking.booking_reference}</h1>
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              This page shows only this booking’s passengers, cards, services, and client context.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="outline" icon={ShieldCheck} onClick={() => navigate(`${basePath}/bookings/${booking.id}/consent-proof`)}>
            Consent Proof
          </Button>
          <Button variant="primary" onClick={() => navigate(`${basePath}/bookings/${booking.id}/edit`)}>
            Edit Booking
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Client', value: clientName, icon: User },
          { label: 'Status', value: booking.status === 'Pending' ? 'Email Send Pending' : (booking.status || 'Email Send Pending'), icon: ShieldCheck },
          { label: 'Travelers', value: booking.passengers?.length || 0, icon: Package },
          { label: 'Total Amount', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(booking.total_amount) || 0), icon: CreditCard },
        ].map((item) => (
          <Card key={item.label} style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <item.icon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{item.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="#60a5fa" /> Card Holder
            </h3>
            <div style={{ display: 'grid', gap: '10px', fontSize: '14px' }}>
              <div><strong>Name:</strong> {clientName}</div>
              <div><strong>Email:</strong> {booking.client?.email || 'Not provided'}</div>
              <div><strong>Alternate Email:</strong> {booking.client?.alternate_email || 'Not provided'}</div>
              <div><strong>Phone:</strong> {booking.client?.phone || 'Not provided'}</div>
              <div><strong>Alternate Phone:</strong> {booking.client?.alternate_phone || 'Not provided'}</div>
              <div><strong>Date of Birth:</strong> {booking.client?.date_of_birth || 'Not provided'}</div>
              <div><strong>Gender:</strong> {booking.client?.gender || 'Not provided'}</div>
              <div><strong>Billing Address:</strong> {booking.client?.address || 'Not provided'}</div>
              <div><strong>Assigned Agent:</strong> {booking.agent?.name || 'Self/System'}</div>
            </div>
          </Card>

          {booking.details_json?.latest_reassignment_remark ? (
            <Card style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={18} color="#f59e0b" /> Latest Handoff Note
              </h3>
              <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {booking.details_json.latest_reassignment_remark}
              </div>
              {booking.details_json?.reassignment_history?.length ? (
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Last reassigned on {booking.details_json.reassignment_history[booking.details_json.reassignment_history.length - 1]?.reassigned_at || 'Unknown time'}
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color="#60a5fa" /> Traveling Passengers
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {booking.passengers?.length ? booking.passengers.map((passenger) => (
                <div key={passenger.id} style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                    {[passenger.first_name, passenger.middle_name, passenger.last_name].filter(Boolean).join(' ')}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>DOB: {passenger.date_of_birth || 'N/A'}</span>
                    <span>Gender: {passenger.gender || 'N/A'}</span>
                    <span>Type: {passenger.type || 'Adult'}</span>
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No passengers added to this booking yet.</div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} color="#60a5fa" /> Booking Services
            </h3>
            <div style={{ display: 'grid', gap: '14px' }}>
              {booking.services?.length ? booking.services.map((service) => {
                const ServiceIcon = getServiceIcon(service.serviceable_type || '');
                const flightSegments = service.serviceable_type?.includes('Flight')
                  ? (service.details_json?.segments?.length
                      ? service.details_json.segments
                      : [{
                          airline: service.serviceable?.airline_code || '',
                          flight_number: service.serviceable?.flight_number || '',
                          origin: service.serviceable?.departure_city || '',
                          destination: service.serviceable?.arrival_city || '',
                          departure_at: service.serviceable?.departure_at || '',
                          arrival_at: service.serviceable?.arrival_at || '',
                        }])
                  : [];

                return (
                  <div key={service.id} style={{ padding: '18px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ServiceIcon size={16} color="#60a5fa" />
                        <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#60a5fa' }}>
                          {service.serviceable_type?.split('\\').pop()}
                        </span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 800 }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(service.sell_price) || 0)}
                      </span>
                    </div>

                    {service.serviceable_type?.includes('Flight') && service.serviceable?.ticket_image ? (
                      <img
                        src={resolveImagePath(service.serviceable.ticket_image)}
                        alt="Ticket"
                        style={{ width: '100%', borderRadius: '14px', border: '1px solid var(--border-color)', marginBottom: '12px' }}
                      />
                    ) : null}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {service.serviceable_type?.includes('Flight') ? (
                        <>
                          <span>PNR: {service.serviceable?.pnr || 'N/A'}</span>
                          <span>Trip Type: {(service.details_json?.trip_type || 'one_way').replace('_', ' ')}</span>
                          <span>Segments: {flightSegments.length}</span>
                        </>
                      ) : service.serviceable_type?.includes('Hotel') ? (
                        <>
                          <span>Hotel: {service.serviceable?.name || 'N/A'}</span>
                          <span>City: {service.serviceable?.city || 'N/A'}</span>
                          <span>Address: {service.serviceable?.address || 'N/A'}</span>
                          <span>Room Type: {service.serviceable?.room_type || 'N/A'}</span>
                          <span>Check-in: {service.details_json?.checkin || 'N/A'}</span>
                          <span>Check-out: {service.details_json?.checkout || 'N/A'}</span>
                        </>
                      ) : service.serviceable_type?.includes('Car') ? (
                        <>
                          <span>Company: {service.serviceable?.company || 'N/A'}</span>
                          <span>Vehicle: {service.serviceable?.car_type || 'N/A'}</span>
                          <span>Pickup: {service.details_json?.pickup_loc || 'N/A'}</span>
                          <span>Drop: {service.details_json?.drop_loc || 'N/A'}</span>
                          <span>Dates: {service.details_json?.pickup_date || 'N/A'} to {service.details_json?.dropoff_date || 'N/A'}</span>
                        </>
                      ) : (
                        <>
                          <span>Cruise: {service.serviceable?.cruise_name || 'N/A'}</span>
                          <span>Operator: {service.serviceable?.operator || 'N/A'}</span>
                          <span>Departure: {service.details_json?.departure_date || 'N/A'}</span>
                          <span>Arrival: {service.details_json?.arrival_date || 'N/A'}</span>
                          <span>Deposit Amount: {service.details_json?.deposit_amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(service.details_json.deposit_amount) || 0) : 'N/A'}</span>
                        </>
                      )}
                    </div>

                    {service.serviceable_type?.includes('Flight') ? (
                      <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                        {flightSegments.map((segment, index) => (
                          <div
                            key={`${service.id}-segment-${index}`}
                            style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}
                          >
                            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                              Flight Segment {index + 1}
                            </div>
                            {segment.ticket_image ? (
                              <img
                                src={resolveImagePath(segment.ticket_image)}
                                alt={`Ticket segment ${index + 1}`}
                                style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '10px' }}
                              />
                            ) : null}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                              <span>Airline: {segment.airline || 'N/A'}</span>
                              <span>Flight No: {segment.flight_number || 'N/A'}</span>
                              <span>Origin: {segment.origin || 'N/A'}</span>
                              <span>Destination: {segment.destination || 'N/A'}</span>
                              <span>Departure: {segment.departure_at ? new Date(segment.departure_at).toLocaleString() : 'N/A'}</span>
                              <span>Arrival: {segment.arrival_at ? new Date(segment.arrival_at).toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {service.serviceable_type?.includes('Hotel') && service.details_json?.images?.length ? (
                      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                        {service.details_json.images.map((image, index) => (
                          <img
                            key={`${service.id}-hotel-image-${index}`}
                            src={resolveImagePath(image)}
                            alt={`Hotel ${index + 1}`}
                            style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                          />
                        ))}
                      </div>
                    ) : null}

                    {service.serviceable_type?.includes('Car') && service.details_json?.images?.length ? (
                      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                        {service.details_json.images.map((image, index) => (
                          <img
                            key={`${service.id}-car-image-${index}`}
                            src={resolveImagePath(image)}
                            alt={`Car ${index + 1}`}
                            style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                          />
                        ))}
                      </div>
                    ) : null}

                    {service.serviceable_type?.includes('Cruise') && service.details_json?.images?.length ? (
                      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                        {service.details_json.images.map((image, index) => (
                          <img
                            key={`${service.id}-cruise-image-${index}`}
                            src={resolveImagePath(image)}
                            alt={`Cruise ${index + 1}`}
                            style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                          />
                        ))}
                      </div>
                    ) : null}

                    {service.details_json?.remarks ? (
                      <div style={{ marginTop: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', fontSize: '13px', color: 'var(--text-main)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Remarks
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {service.details_json.remarks}
                        </div>
                      </div>
                    ) : null}

                    {(service.details_json?.change_type || service.details_json?.change_summary || Number(service.details_json?.additional_charge || 0) > 0) ? (
                      <div style={{ marginTop: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(96,165,250,0.08)', fontSize: '13px', color: 'var(--text-main)', border: '1px solid rgba(96,165,250,0.18)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          Latest Service Change
                        </div>
                        <div style={{ display: 'grid', gap: '6px', lineHeight: 1.6 }}>
                          <div><strong>Type:</strong> {service.details_json?.change_type || 'Service Update'}</div>
                          <div><strong>Additional Charge:</strong> {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(service.details_json?.additional_charge) || 0)}</div>
                          {service.details_json?.change_summary ? (
                            <div><strong>Summary:</strong> {service.details_json.change_summary}</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{service.serviceable_type?.includes('Flight') ? 'Airline Cost' : 'Cost'}: {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(service.cost_price) || 0)}</span>
                      <span>Taxes & Charges: {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(service.markup) || 0)}</span>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No services found for this booking.</div>
              )}
            </div>
          </Card>

          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="#60a5fa" /> Payment Cards For This Booking
            </h3>
            {!canViewSensitiveCards ? (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Full card details are visible only to the booking creator and admin. Other viewers can see masked card references only.
              </div>
            ) : null}
            <div style={{ display: 'grid', gap: '12px' }}>
              {(booking.details_json?.payment_cards || []).length ? (
                booking.details_json.payment_cards.map((card, index) => {
                  const key = `${booking.id}-${index}`;
                  const isVisible = Boolean(showCards[key]);

                  return (
                    <div key={key} style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{card.holder_name || 'Card Holder'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#60a5fa' }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: card.currency || booking.currency || 'USD' }).format(Number(card.amount) || 0)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {canViewSensitiveCards
                            ? (isVisible ? revealCardNumber(card.number) : formatCardNumber(card.number))
                            : (card.number || 'Card number hidden')}
                        </div>
                        {canViewSensitiveCards ? (
                          <button
                            type="button"
                            onClick={() => setShowCards((current) => ({ ...current, [key]: !current[key] }))}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                          >
                            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>Exp: {card.exp || 'N/A'}</span>
                        {canViewSensitiveCards && card.cvv ? <span>CVV: {isVisible ? card.cvv : '•••'}</span> : null}
                      </div>
                      {card.remarks ? (
                        <div style={{ marginTop: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', fontSize: '13px', color: 'var(--text-main)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            Remarks
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {card.remarks}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No payment cards stored for this booking.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
    </div>
  );
};

export default BookingDetailsPage;
