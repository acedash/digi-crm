import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Users, 
  ChevronLeft, 
  Edit, 
  Trash2,
  Calendar,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  Plane,
  Hotel,
  Car,
  Ship,
  UserPlus,
  Plus,
  Eye,
  EyeOff,
  PhoneCall,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import clientService from './clientService';
import ClientForm from './ClientForm';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const ClientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/')[1];
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCards, setShowCards] = useState({});

  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clientService.getClient(id);
      setClient(response.data.data);
    } catch (error) {
      setError('Failed to load client details. Please try again later.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      try {
        await clientService.deleteClient(id);
        navigate(`${basePath}/clients`);
      } catch {
        alert('Failed to delete client.');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'hsl(var(--primary))' }}>
        <RefreshCw className="animate-spin" size={32} />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#f87171' }}>{error || 'Client not found.'}</p>
        <Button variant="ghost" icon={ChevronLeft} onClick={() => navigate(`${basePath}/clients`)}>Back to Clients</Button>
      </div>
    );
  }

  const totalSpent = (client.bookings || []).reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
  const displayCards = (client.cards?.length ? client.cards : (client.bookings || [])
    .flatMap((booking) => (booking.details_json?.payment_cards || []).map((card, index) => ({
      id: `booking-${booking.id}-${index}`,
      card_holder_name: card.holder_name || 'Card Holder',
      card_number: card.number || '',
      expiry_month: card.exp?.split('/')?.[0] || '',
      expiry_year: card.exp?.split('/')?.[1] || '',
      card_type: 'Booking Card',
      cvv: card.cvv || '',
      is_primary: false,
      source: 'booking',
      booking_reference: booking.booking_reference,
    })))
    .filter((card, index, cards) => {
      const key = `${card.card_number}-${card.expiry_month}-${card.expiry_year}`;
      return cards.findIndex((candidate) => `${candidate.card_number}-${candidate.expiry_month}-${candidate.expiry_year}` === key) === index;
    }));

  const formatCardNumber = (cardNumber) => {
    if (!cardNumber) return 'Card number not available';
    const compact = String(cardNumber).replace(/\s+/g, '');
    if (compact.length <= 4) return compact;
    return `•••• •••• •••• ${compact.slice(-4)}`;
  };

  const revealCardNumber = (cardNumber) => {
    if (!cardNumber) return 'Card number not available';
    return String(cardNumber).replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') || String(cardNumber);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="ghost" icon={ChevronLeft} onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {client.bookings?.length > 0 && (
            <Button variant="primary" icon={Edit} onClick={() => navigate(`${basePath}/bookings/${client.bookings[0].id}/edit`)}>Edit Booking</Button>
          )}
          <Button variant="ghost" icon={Trash2} onClick={handleDelete} style={{ color: '#f87171' }}>Delete</Button>
        </div>
      </div>

      {/* Travel Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {[
          { label: 'Total Bookings', value: client.bookings?.length || 0, icon: Briefcase, color: '#60a5fa' },
          { label: 'Total Revenue', value: `$${totalSpent.toLocaleString()}`, icon: ShieldCheck, color: '#4ade80' },
          { label: 'Pending PNRs', value: (client.bookings || []).filter(b => b.status === 'Pending').length, icon: Calendar, color: '#fbbf24' },
          { label: 'Primary Contact', value: client.phone || 'N/A', icon: Phone, color: '#f472b6' }
        ].map((stat, i) => (
          <Card key={i} style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <stat.icon size={20} />
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
              <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main, white)' }}>{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Identity Card */}
          <Card className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '24px', 
                background: 'rgba(255,255,255,0.05)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))',
                border: '1px solid var(--border-color)'
              }}>
                <User size={40} />
              </div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main, white)' }}>
                  {client.first_name} {client.middle_name} {client.last_name}
                </h1>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '100px',
                    background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)'
                  }}>
                    {client.type || 'Standard'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    ID: CL-{String(client.id).padStart(4, '0')}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <InfoItem icon={Calendar} label="Date of Birth" value={client.date_of_birth || 'Not Set'} />
              <InfoItem icon={User} label="Gender" value={client.gender || 'Not Set'} />
              <InfoItem icon={UserPlus} label="Created By" value={client.agent?.name || 'Self/System'} />
              <InfoItem icon={ShieldCheck} label="Membership" value="Active Explorer" />
            </div>
          </Card>

          {/* Linked Travelers */}
          <Card className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users size={20} style={{ color: 'hsl(var(--primary))' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main, white)' }}>Linked Travelers</h3>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{client.passengers?.length || 0} Total</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {client.passengers?.length > 0 ? client.passengers.map((p, idx) => (
                <div key={idx} style={{ 
                  padding: '16px', borderRadius: '16px', background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main, white)' }}>{p.first_name} {p.last_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{p.gender} • {p.type || 'Adult'}</span>
                    <span>{p.date_of_birth}</span>
                  </div>
                </div>
              )) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                  <Users size={32} style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '13px' }}>No additional travelers linked.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Communication */}
          <Card className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main, white)', marginBottom: '24px' }}>Communication</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ContactItem icon={Mail} label="Email Address" value={client.email} />
              <ContactItem icon={Mail} label="Alternate Email" value={client.alternate_email || 'Not provided'} />
              <ContactItem icon={Phone} label="Primary Phone" value={client.phone || 'Not provided'} />
              <ContactItem icon={Phone} label="Alternate Phone" value={client.alternate_phone || 'Not provided'} />
              <ContactItem icon={MapPin} label="Home Address" value={client.address || 'Address not listed'} />
            </div>
          </Card>

          {/* Payment Methods */}
          <Card className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CreditCard size={20} style={{ color: 'hsl(var(--primary))' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main, white)' }}>Saved Cards</h3>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {displayCards.length > 0 ? displayCards.map((card, idx) => (
                <div key={idx} style={{ 
                  padding: '24px', borderRadius: '20px', 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)', position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main, white)', textTransform: 'uppercase' }}>{card.card_type}</span>
                    <CreditCard size={18} style={{ opacity: 0.4 }} />
                  </div>
                  {card.source === 'booking' ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Pulled from booking {card.booking_reference}
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ letterSpacing: '3px', fontSize: '18px', color: 'var(--text-main, white)', fontWeight: 700, fontFamily: 'monospace' }}>
                      {showCards[card.id] ? (
                        revealCardNumber(card.card_number)
                      ) : (
                        formatCardNumber(card.card_number)
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={showCards[card.id] ? EyeOff : Eye} 
                      onClick={() => setShowCards({...showCards, [card.id]: !showCards[card.id]})}
                      style={{ color: 'var(--text-muted)', padding: '4px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Card Holder</p>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{card.card_holder_name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expires</p>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>
                        {card.expiry_month && card.expiry_year ? `${card.expiry_month}/${card.expiry_year}` : 'Not available'}
                      </p>
                    </div>
                    {card.cvv && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CVV</p>
                        <p style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>
                          {showCards[card.id] ? card.cvv : '•••'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                  <CreditCard size={32} style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '13px' }}>No saved payment methods.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Booking History Section */}
      <Card className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Briefcase size={24} style={{ color: 'hsl(var(--primary))' }} />
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main, white)' }}>Full Booking History</h3>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {client.bookings?.length > 0 ? client.bookings.map((booking, idx) => (
            <div 
              key={idx} 
              onClick={() => navigate(`${basePath}/bookings/${booking.id}`)}
              className="hover-glow"
              style={{ 
                padding: '20px 24px', borderRadius: '24px', background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 140px 120px', alignItems: 'center', cursor: 'pointer', transition: '0.2s'
              }}
            >
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main, white)', marginBottom: '4px' }}>{booking.booking_reference}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Booked: {new Date(booking.created_at).toLocaleDateString()}</p>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {booking.services?.map((s, i) => {
                  const type = s.serviceable_type.split('\\').pop();
                  const name = s.serviceable?.name || s.serviceable?.company || s.serviceable?.cruise_name || s.serviceable?.airline || type;
                  return (
                    <div key={i} title={name} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))' }}>
                       {type.includes('Flight') ? <Plane size={16} /> : 
                        type.includes('Hotel') ? <Hotel size={16} /> : 
                        type.includes('Car') ? <Car size={16} /> : <Ship size={16} />}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-main, white)' }}>
                 <Calendar size={14} style={{ display: 'inline', marginRight: '6px', opacity: 0.5 }} />
                 {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'TBD'}
                 <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Departure Date</span>
              </div>

              <div style={{ 
                justifySelf: 'start', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                background: booking.status === 'Confirmed' ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
                color: booking.status === 'Confirmed' ? '#4ade80' : '#fbbf24',
                border: `1px solid ${booking.status === 'Confirmed' ? '#4ade8030' : '#fbbf2430'}`
              }}>
                {booking.status}
              </div>

              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main, white)' }}>
                  ${parseFloat(booking.total_amount).toLocaleString()}
                </div>
                <Button 
                  variant="glass" 
                  size="sm" 
                  icon={Edit} 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/bookings/${booking.id}/edit`);
                  }}
                  style={{ padding: '8px' }}
                />
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '64px', opacity: 0.5 }}>
              <Briefcase size={48} style={{ margin: '0 auto 16px' }} />
              <p>No trip records found for this client.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Call History Section */}
      <Card className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PhoneCall size={24} style={{ color: 'hsl(var(--primary))' }} />
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main, white)' }}>Call History</h3>
          </div>
          <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {client.call_logs?.length || 0} Records
          </span>
        </div>

        {client.call_logs?.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            {/* Timeline vertical line */}
            <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '7px', width: '2px', background: 'var(--border-color)', borderRadius: '2px' }}></div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {client.call_logs.map((log, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{ 
                    position: 'absolute', top: '24px', left: '-22px', 
                    width: '12px', height: '12px', borderRadius: '50%', 
                    background: 'var(--bg-card)', border: '3px solid hsl(var(--primary))',
                    zIndex: 2, boxShadow: '0 0 0 4px var(--bg-card)'
                  }}></div>

                  <div className="hover-glow" style={{ 
                    background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '20px',
                    padding: '24px', transition: 'all 0.2s ease', position: 'relative'
                  }}>
                    {/* Header: Type and Outcome */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ 
                          width: '48px', height: '48px', borderRadius: '14px', 
                          background: 'rgba(59,130,246,0.1)', color: '#60a5fa', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(59,130,246,0.2)'
                        }}>
                          {log.call_type.includes('Flight') ? <Plane size={20} /> : 
                           log.call_type.includes('Hotel') ? <Hotel size={20} /> : 
                           log.call_type.includes('Car') ? <Car size={20} /> : 
                           log.call_type.includes('Cruise') ? <Ship size={20} /> : 
                           <PhoneCall size={20} />}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main, white)', marginBottom: '4px' }}>
                            {log.call_type}
                          </h4>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Logged by <span style={{ color: '#60a5fa', fontWeight: 600 }}>{log.agent?.name || 'System'}</span>
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main, white)', marginBottom: '4px' }}>
                          {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    {log.notes ? (
                      <div style={{ 
                        fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px', 
                        background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: '14px', 
                        border: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic'
                      }}>
                        "{log.notes}"
                      </div>
                    ) : (
                      <div style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)', opacity: 0.5, fontStyle: 'italic' }}>
                        No notes provided for this interaction.
                      </div>
                    )}

                    {/* Footer: Outcomes and Badges */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ 
                        padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: log.customer_outcome.includes('Booking') ? 'rgba(34,197,94,0.1)' : 
                                    log.customer_outcome.includes('dropped') ? 'rgba(239,68,68,0.1)' : 'rgba(156,163,175,0.1)',
                        color: log.customer_outcome.includes('Booking') ? '#4ade80' : 
                               log.customer_outcome.includes('dropped') ? '#ef4444' : '#9ca3af',
                        border: `1px solid ${log.customer_outcome.includes('Booking') ? '#4ade8030' : 
                                            log.customer_outcome.includes('dropped') ? '#ef444430' : '#9ca3af30'}`
                      }}>
                        {log.customer_outcome.includes('Booking') ? <CheckCircle2 size={16} /> : 
                         log.customer_outcome.includes('dropped') ? <XCircle size={16} /> : <AlertCircle size={16} />}
                        {log.customer_outcome}
                      </span>

                      {log.callback_required && (
                        <span style={{ 
                          padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
                          boxShadow: '0 0 10px rgba(245,158,11,0.1)'
                        }}>
                          <PhoneCall size={16} /> 
                          {log.callback_datetime 
                            ? `Callback: ${new Date(log.callback_datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` 
                            : 'Callback Required'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px', opacity: 0.5 }}>
            <PhoneCall size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: 600 }}>No communication history.</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Call logs recorded by agents will appear here as a timeline.</p>
          </div>
        )}
      </Card>

    </div>
  );
};

const InfoItem = ({ icon, label, value }) => {
  const IconComponent = icon;

  return (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><IconComponent size={16} /></div>
    <div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{label}</p>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main, white)' }}>{value}</p>
    </div>
  </div>
  );
};

const ContactItem = ({ icon, label, value }) => {
  const IconComponent = icon;

  return (
  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
    <div style={{ 
      width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-input)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))',
      border: '1px solid var(--border-color)'
    }}>
      <IconComponent size={18} />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: '14px', color: 'var(--text-main, white)', wordBreak: 'break-all', fontWeight: 500 }}>{value}</p>
    </div>
  </div>
  );
};

export default ClientProfile;
