import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane,
  Hotel,
  Search,
  Plus, 
  Filter, 
  RefreshCw, 
  Calendar, 
  Tag, 
  User, 
  MoreHorizontal,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Download,
  Trash2,
  Pencil,
  Eye,
  Phone,
  Mail,
  CreditCard,
  Car,
  Ship,
  UserPlus,
  ArrowUpRight,
  EyeOff,
  PhoneCall,
  ClipboardList,
  ArrowRightLeft,
  ShieldCheck
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import bookingService from './bookingService';
import paymentAuthService from './paymentAuthService';
import Toast from '../../components/ui/Toast';
import CallLogModal from './components/CallLogModal';
import { useAuthStore } from '../auth/useAuthStore';
import api, { BACKEND_BASE_URL } from '../../services/api';

const BookingList = ({ onCreate, onEdit }) => {
  const { user } = useAuthStore();
  const activeRole = typeof user?.roles?.[0] === 'object' ? user.roles[0].name : user?.roles?.[0];
  const canReassign = activeRole === 'admin' || activeRole === 'supervisor';
  const navigate = useNavigate();
  const location = window.location;
  const basePath = '/' + location.pathname.split('/')[1];
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewBooking, setViewBooking] = useState(null);
  const [showCallLog, setShowCallLog] = useState(false);
  const [selectedBookingForCall, setSelectedBookingForCall] = useState(null);
  const [reassignModal, setReassignModal] = useState({ open: false, bookingId: null, currentAgentId: null });
  const [availableAgents, setAvailableAgents] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'error' });
  const [showModalCards, setShowModalCards] = useState({});
  const [sendingApprovalId, setSendingApprovalId] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0
  });

  useEffect(() => {
    fetchBookings(pagination.current_page);
  }, [pagination.current_page]);

  const fetchBookings = async (page = 1) => {
    try {
      setLoading(true);
      const response = await bookingService.getBookings({ 
        page, 
        per_page: pagination.per_page,
        search: searchTerm 
      });
      const result = response.data.data;
      
      if (result && result.data) {
        setBookings(result.data);
        setPagination({
          current_page: result.current_page,
          last_page: result.last_page,
          per_page: result.per_page,
          total: result.total
        });
      } else {
        setBookings(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReassignClick = async (booking) => {
    setReassignModal({ open: true, bookingId: booking.id, currentAgentId: booking.agent_id });
    if (availableAgents.length === 0) {
      try {
        const endpoint = activeRole === 'admin' ? '/admin/users' : '/supervisor/my-agents';
        const res = await api.get(endpoint);
        let agents = res.data.data;
        if (activeRole === 'admin') {
          agents = agents.filter(u => u.roles.some(r => r.name === 'agent' || r.name === 'supervisor'));
        }
        setAvailableAgents(agents);
      } catch {
        setToast({ message: 'Failed to fetch agents', type: 'error' });
      }
    }
  };

  const executeReassign = async (newAgentId) => {
    try {
      await bookingService.reassignBooking(reassignModal.bookingId, newAgentId);
      setToast({ message: 'Booking reassigned successfully', type: 'success' });
      setReassignModal({ open: false, bookingId: null, currentAgentId: null });
      fetchBookings(pagination.current_page);
    } catch {
      setToast({ message: 'Failed to reassign booking', type: 'error' });
    }
  };

  const handleSendApproval = async (booking) => {
    if (sendingApprovalId === booking.id) return;

    const clientName =
      booking.client?.name ||
      (booking.client?.first_name || booking.client?.last_name
        ? `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim()
        : 'this client');

    const email = booking.client?.email || 'no email provided';
    const confirmed = window.confirm(
      `Send approval email for ${booking.booking_reference} to ${clientName} (${email})?`
    );

    if (!confirmed) return;

    try {
      setSendingApprovalId(booking.id);
      await paymentAuthService.create({
        client_id: booking.client_id,
        booking_ids: [booking.id],
      });
      setToast({ message: `Approval email sent to ${booking.client?.email || 'client'}`, type: 'success' });
    } catch (error) {
      setToast({
        message: error?.response?.data?.message || 'Failed to send approval email',
        type: 'error',
      });
    } finally {
      setSendingApprovalId(null);
    }
  };

  const statusIcons = {
    'Approved': { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', shadow: 'rgba(16, 185, 129, 0.2)' },
    'Confirmed': { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', shadow: 'rgba(16, 185, 129, 0.2)' },
    'Awaiting Approval': { icon: Clock, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', shadow: 'rgba(139, 92, 246, 0.2)' },
    'Pending': { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', shadow: 'rgba(245, 158, 11, 0.2)' },
    'Cancelled': { icon: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
    'Rejected': { icon: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
    'Completed': { icon: CheckCircle2, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', shadow: 'rgba(59, 130, 246, 0.2)' }
  };

  const getStatusGuidance = (status) => {
    switch (status) {
      case 'Pending':
        return 'Booking is saved in CRM and ready for the next step.';
      case 'Awaiting Approval':
        return 'Approval email sent. Waiting for the client response.';
      case 'Approved':
      case 'Confirmed':
        return 'Client approved payment. Booking is cleared to process.';
      case 'Rejected':
        return 'Client rejected the authorization. Review before proceeding.';
      case 'Cancelled':
        return 'Booking has been cancelled and is no longer active.';
      case 'Completed':
        return 'Trip workflow has been completed successfully.';
      default:
        return 'Review the booking details and continue the workflow.';
    }
  };

  const getApprovalActionLabel = (status) => {
    if (status === 'Awaiting Approval') return 'Resend Approval';
    if (status === 'Approved' || status === 'Confirmed') return 'Send Again';
    if (status === 'Rejected') return 'Send New Approval';
    return 'Send Approval';
  };

  const getStatusStyle = (status) => {
    const config = statusIcons[status] || statusIcons['Pending'];
    const Icon = typeof config.icon === 'string' ? XCircle : config.icon;
    const color = config.color || (typeof config.icon === 'string' ? config.icon : '#64748b');
    
    return (
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '6px 14px', 
        borderRadius: '100px', 
        fontSize: '11px', 
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: config.bg,
        color: color,
        border: `1px solid ${color}30`,
        boxShadow: `0 4px 12px ${config.shadow}`
      }}>
        <Icon size={12} strokeWidth={3} />
        {status}
      </div>
    );
  };

  const filteredBookings = bookings.filter(booking => {
    const clientName = booking.client?.name || 
      (booking.client?.first_name || booking.client?.last_name ? 
       `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim() : 
       '');
    const matchesSearch = 
      booking.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesFilter = filterType === 'all' || booking.status?.toLowerCase() === filterType.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      await bookingService.deleteBooking(id);
      fetchBookings();
    } catch (error) {
      console.error('Failed to delete booking:', error);
      setToast({ message: 'Failed to delete booking', type: 'error' });
    }
  };

  const renderActionButton = ({ icon, label, onClick, tone = 'default', title, compact = false, disabled = false }) => {
    const palette = {
      default: {
        color: 'var(--text-main)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
      },
      primary: {
        color: '#8b5cf6',
        background: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.18)',
      },
      info: {
        color: '#2563eb',
        background: 'rgba(37, 99, 235, 0.08)',
        border: '1px solid rgba(37, 99, 235, 0.18)',
      },
      success: {
        color: '#059669',
        background: 'rgba(5, 150, 105, 0.08)',
        border: '1px solid rgba(5, 150, 105, 0.18)',
      },
      warning: {
        color: '#d97706',
        background: 'rgba(217, 119, 6, 0.08)',
        border: '1px solid rgba(217, 119, 6, 0.18)',
      },
      danger: {
        color: '#dc2626',
        background: 'rgba(220, 38, 38, 0.08)',
        border: '1px solid rgba(220, 38, 38, 0.18)',
      },
    };

    const styles = palette[tone] || palette.default;

    return (
      <button
        title={title || label}
        onClick={onClick}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: compact ? 'auto' : '100%',
          padding: compact ? '8px 10px' : '10px 12px',
          borderRadius: compact ? '999px' : '12px',
          fontSize: compact ? '11px' : '12px',
          fontWeight: 700,
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...styles,
        }}
      >
        {React.createElement(icon, { size: compact ? 13 : 14 })}
        <span>{label}</span>
      </button>
    );
  };

  const BookingViewModal = ({ booking, onClose }) => {
    if (!booking) return null;
    
    const clientName = booking.client?.name || `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim() || 'Unknown';
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '24px'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass-panel"
          style={{ 
            width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
            borderRadius: '24px', background: 'var(--bg-card)', padding: '32px', border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#60a5fa', marginBottom: '8px', display: 'block' }}>
                Booking Details
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800 }}>{booking.booking_reference}</h2>
            </div>
            <Button variant="ghost" onClick={onClose} icon={XCircle}>Close</Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Left: Client & Passengers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <User size={18} color="#60a5fa" /> Primary Client
                </h3>
                <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>{clientName}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <p style={{ color: 'var(--text-muted)' }}><Mail size={12} style={{ marginRight: '4px' }} /> {booking.client?.email}</p>
                    <p style={{ color: 'var(--text-muted)' }}><Phone size={12} style={{ marginRight: '4px' }} /> {booking.client?.phone}</p>
                    <p style={{ color: 'var(--text-muted)' }}><strong>DOB:</strong> {booking.client?.date_of_birth || 'N/A'}</p>
                    <p style={{ color: 'var(--text-muted)' }}><strong>Gender:</strong> {booking.client?.gender || 'N/A'}</p>
                  </div>
                  {booking.client?.address && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <strong>Address:</strong> {booking.client.address}
                    </p>
                  )}
                  <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'hsl(var(--primary))', fontWeight: 600 }}>
                    <UserPlus size={14} />
                    Assigned to: {booking.agent?.name || 'Self/System'}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Package size={18} color="#60a5fa" /> Passengers ({booking.passengers?.length || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {booking.passengers?.map((p, idx) => (
                    <div key={idx} style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</span>
                        <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700 }}>{p.type || 'Adult'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <span><strong>DOB:</strong> {p.date_of_birth || 'N/A'}</span>
                        <span><strong>Gender:</strong> {p.gender || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Services & Payments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <ClipboardList size={18} color="#60a5fa" /> Services Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {booking.services?.map((s, idx) => (
                    <div key={idx} style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           {s.serviceable_type.includes('Flight') ? <Plane size={16} /> :
                            s.serviceable_type.includes('Hotel') ? <Hotel size={16} /> :
                            s.serviceable_type.includes('Car') ? <Car size={16} /> : <Ship size={16} />}
                           <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', color: '#60a5fa' }}>{s.serviceable_type.split('\\').pop()}</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '16px' }}>${s.sell_price}</span>
                      </div>
                      
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {s.serviceable_type.includes('Flight') ? (
                          <div style={{ gridColumn: '1 / -1' }}>
                            {s.serviceable?.ticket_image ? (
                              <div style={{ marginTop: '8px' }}>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Ticket Screenshot:</p>
                                <img 
                                  src={`${BACKEND_BASE_URL}/storage/${s.serviceable.ticket_image}`} 
                                  alt="Ticket" 
                                  style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)', cursor: 'zoom-in' }} 
                                  onClick={() => window.open(`${BACKEND_BASE_URL}/storage/${s.serviceable.ticket_image}`, '_blank')}
                                />
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <span><strong>PNR:</strong> {s.serviceable?.pnr || 'N/A'}</span>
                                <span><strong>Airline:</strong> {s.serviceable?.airline || 'N/A'}</span>
                                <span><strong>From:</strong> {s.serviceable?.origin || 'N/A'}</span>
                                <span><strong>To:</strong> {s.serviceable?.destination || 'N/A'}</span>
                              </div>
                            )}
                          </div>
                        ) : s.serviceable_type.includes('Hotel') ? (
                          <>
                            <span style={{ gridColumn: '1 / -1' }}><strong>Hotel:</strong> {s.serviceable?.name}</span>
                            <span><strong>Location:</strong> {s.serviceable?.city}</span>
                            <span><strong>Dates:</strong> {s.details_json?.checkin} to {s.details_json?.checkout}</span>
                          </>
                        ) : s.serviceable_type.includes('Car') ? (
                          <>
                            <span style={{ gridColumn: '1 / -1' }}><strong>Rental:</strong> {s.serviceable?.company} ({s.serviceable?.car_type})</span>
                            <span><strong>Pickup:</strong> {s.details_json?.pickup_loc}</span>
                            <span><strong>Dates:</strong> {s.details_json?.pickup_date} to {s.details_json?.dropoff_date}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ gridColumn: '1 / -1' }}><strong>Cruise:</strong> {s.serviceable?.cruise_name} ({s.serviceable?.operator})</span>
                            <span><strong>Dates:</strong> {s.details_json?.departure_date} to {s.details_json?.arrival_date}</span>
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Cost: ${s.cost_price}</span>
                        <span>Markup: ${s.markup}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <CreditCard size={18} color="#60a5fa" /> Payment Metadata
                </h3>
                <div style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Booking Value:</span>
                    <span style={{ fontWeight: 800, fontSize: '18px', color: '#4ade80' }}>${booking.total_amount}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(booking.details_json?.payment_cards || []).map((card, idx) => (
                      <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{card.holder_name || 'Card Holder'}</span>
                          <span style={{ fontWeight: 700, color: '#60a5fa' }}>${card.amount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', letterSpacing: '1px' }}>
                            {showModalCards[`${booking.id}-${idx}`] ? (
                              card.number.match(/.{1,4}/g).join(' ')
                            ) : (
                              `**** **** **** ${card.number?.slice(-4)}`
                            )}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Exp: {card.exp}</span>
                            {card.cvv && (
                              <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                CVV: {showModalCards[`${booking.id}-${idx}`] ? card.cvv : '•••'}
                              </span>
                            )}
                            <button 
                              onClick={() => setShowModalCards({...showModalCards, [`${booking.id}-${idx}`]: !showModalCards[`${booking.id}-${idx}`]})}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', padding: '2px' }}
                            >
                              {showModalCards[`${booking.id}-${idx}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const ReassignModal = () => {
    if (!reassignModal.open) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-card)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-color)' }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} color="#8b5cf6" /> Reassign Booking
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Select an agent to transfer this booking wrapper and all related services.</p>
          
          <select 
            onChange={e => executeReassign(e.target.value)}
            defaultValue=""
            style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', marginBottom: '24px', fontSize: '14px' }}
          >
            <option value="" disabled>-- Select New Agent --</option>
            {user?.id !== reassignModal.currentAgentId && (
              <option value={user?.id}>Assign to myself ({user?.name})</option>
            )}
            {availableAgents.filter(ag => ag.id !== reassignModal.currentAgentId && ag.id !== user?.id).map(ag => (
              <option key={ag.id} value={ag.id}>{ag.name} ({ag.user_custom_id})</option>
            ))}
          </select>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setReassignModal({ open: false, bookingId: null, currentAgentId: null })}>Cancel</Button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="premium-gradient-text" style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
            Bookings
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '14px' }}>
            Manage client reservations and itineraries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="primary" icon={Plus} onClick={onCreate}>New Booking</Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Bookings', value: bookings.length, icon: Package, color: 'blue' },
          { label: 'Approved', value: bookings.filter(b => b.status === 'Approved' || b.status === 'Confirmed').length, icon: CheckCircle2, color: 'green' },
          { label: 'Awaiting Approval', value: bookings.filter(b => b.status === 'Awaiting Approval').length, icon: Clock, color: 'yellow' },
          { label: 'Rejected', value: bookings.filter(b => b.status === 'Rejected' || b.status === 'Cancelled').length, icon: XCircle, color: 'red' }
        ].map((stat, i) => (
          <Card key={i} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                padding: '12px', 
                borderRadius: '12px', 
                background: `rgba(var(--${stat.color}-rgb), 0.1)`,
                color: stat.color 
              }}>
                <stat.icon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>{stat.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main, white)' }}>{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <Input 
          placeholder="Search by reference or client name..." 
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: 0, maxWidth: '500px' }}
        />
        
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['all', 'Pending', 'Awaiting Approval', 'Approved', 'Rejected', 'Completed', 'Cancelled'].map(status => (
            <button 
              key={status}
              onClick={() => setFilterType(status)}
              style={{ 
                padding: '6px 16px', 
                borderRadius: '100px', 
                background: filterType === status ? 'hsl(var(--primary))' : 'var(--bg-card)', 
                color: filterType === status ? 'white' : 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: status === 'all' ? 'uppercase' : 'none'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Grid */}
      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{
              minWidth: '1180px',
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1.8fr) minmax(150px, 0.9fr) minmax(160px, 1fr) minmax(180px, 1fr) minmax(260px, 1.4fr)',
              gap: '16px',
              padding: '0 18px 10px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            <div>Booking / Client</div>
            <div>Travel</div>
            <div>Assigned To</div>
            <div>Amount / Status</div>
            <div>Actions</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '1180px', display: 'grid', gap: '12px' }}>
        <AnimatePresence mode="popLayout">
          {filteredBookings.map((booking, index) => {
            const statusColor = statusIcons[booking.status]?.color || (typeof statusIcons[booking.status]?.icon === 'string' ? statusIcons[booking.status]?.icon : '#f59e0b');
            const clientDisplayName =
              booking.client?.name ||
              (booking.client?.first_name || booking.client?.last_name
                ? `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim()
                : 'Unknown Client');
            const isSendingApproval = sendingApprovalId === booking.id;
            
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover-glow" style={{ 
                  padding: '0', 
                  overflow: 'hidden', 
                  borderLeft: `6px solid ${statusColor}`,
                  marginBottom: '0'
                }}>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'minmax(280px, 1.8fr) minmax(150px, 0.9fr) minmax(160px, 1fr) minmax(180px, 1fr) minmax(260px, 1.4fr)',
                    alignItems: 'center',
                    padding: '18px',
                    gap: '16px'
                  }}>
                    {/* Booking / Client */}
                    <div 
                      onClick={() => navigate(`${basePath}/clients/${booking.client_id}`)}
                      style={{ cursor: 'pointer', minWidth: '0' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '11px', 
                          fontWeight: 700,
                          background: 'rgba(96, 165, 250, 0.1)', 
                          color: '#60a5fa',
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          border: '1px solid rgba(96, 165, 250, 0.2)' 
                        }}>
                          {booking.booking_reference}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {booking.services?.map((s, i) => (
                            <div key={i} title={s.serviceable_type.split('\\').pop()} style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                              {s.serviceable_type.includes('Flight') ? <Plane size={14} /> : 
                               s.serviceable_type.includes('Hotel') ? <Hotel size={14} /> : 
                               s.serviceable_type.includes('Car') ? <Car size={14} /> : <Package size={14} />}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <h3 className="hover-link" style={{ 
                        fontSize: '16px', 
                        fontWeight: 700, 
                        color: 'var(--text-main, white)', 
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {clientDisplayName}
                        <ArrowUpRight size={14} style={{ opacity: 0.5 }} className="link-icon" />
                      </h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} style={{ color: '#60a5fa' }} /> {booking.client?.phone || 'No Phone'}
                        </span>
                        <span style={{ opacity: 0.3 }}>|</span>
                        <span>{booking.passengers?.length || 0} travelers</span>
                      </div>
                    </div>

                    {/* Travel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main, white)', fontWeight: 600 }}>
                        <Calendar size={16} style={{ color: '#60a5fa' }} />
                        {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {booking.services?.map((s) => s.serviceable_type.split('\\').pop()).join(', ') || 'No services'}
                      </span>
                    </div>

                    {/* Assigned */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main, white)', fontWeight: 600 }}>
                        <UserPlus size={14} style={{ color: '#60a5fa' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {booking.agent?.name || 'Self/System'}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {booking.agent?.user_custom_id || 'No user id'}
                      </span>
                    </div>

                    {/* Amount / Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '0' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main, white)', letterSpacing: '-0.5px' }}>
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: booking.currency || 'USD' 
                        }).format(Number(booking.total_amount) || 0)}
                      </div>
                      {getStatusStyle(booking.status)}
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '180px', lineHeight: 1.5 }}>
                        {getStatusGuidance(booking.status)}
                      </p>
                    </div>

                    {/* Actions Block */}
                    <div style={{ 
                      paddingLeft: '16px', 
                      borderLeft: '1px solid var(--border-color)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      flexShrink: 0
                    }}>
                      {renderActionButton({
                        icon: Mail,
                        label: isSendingApproval ? 'Sending...' : getApprovalActionLabel(booking.status),
                        onClick: () => handleSendApproval(booking),
                        tone: 'primary',
                        title: 'Email payment approval link to client',
                        compact: true,
                        disabled: isSendingApproval,
                      })}
                      {renderActionButton({
                        icon: ShieldCheck,
                        label: 'Proof',
                        onClick: () => navigate(`${basePath}/bookings/${booking.id}/consent-proof`),
                        tone: 'info',
                        title: 'Open consent proof and approval evidence',
                        compact: true,
                      })}
                      {renderActionButton({
                        icon: Eye,
                        label: 'View',
                        onClick: () => setViewBooking(booking),
                        tone: 'info',
                        title: 'Open full booking details',
                        compact: true,
                      })}
                      {renderActionButton({
                        icon: PhoneCall,
                        label: 'Call',
                        onClick: () => {
                          setSelectedBookingForCall(booking);
                          setShowCallLog(true);
                        },
                        tone: 'success',
                        title: 'Create a call log for this booking',
                        compact: true,
                      })}
                      {canReassign && (
                        renderActionButton({
                          icon: ArrowRightLeft,
                          label: 'Reassign',
                          onClick: () => handleReassignClick(booking),
                          tone: 'warning',
                          title: 'Transfer this booking to another user',
                          compact: true,
                        })
                      )}
                      {renderActionButton({
                        icon: Pencil,
                        label: 'Edit',
                        onClick: () => onEdit(booking.id),
                        tone: 'default',
                        title: 'Edit booking data',
                        compact: true,
                      })}
                      {renderActionButton({
                        icon: Trash2,
                        label: 'Delete',
                        onClick: () => handleDelete(booking.id),
                        tone: 'danger',
                        title: 'Delete this booking permanently',
                        compact: true,
                      })}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredBookings.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '64px', opacity: 0.5 }}>
            <Package size={48} style={{ margin: '0 auto 16px' }} />
            <p>No bookings found. Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Pagination Controls */}
      {pagination.last_page > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '12px', 
          marginTop: '32px',
          padding: '20px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={pagination.current_page === 1}
            onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
          >
            Previous
          </Button>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setPagination(prev => ({ ...prev, current_page: page }))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: pagination.current_page === page ? 'hsl(var(--primary))' : 'transparent',
                  color: pagination.current_page === page ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                className={pagination.current_page === page ? 'pagination-active' : ''}
              >
                {page}
              </button>
            ))}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            disabled={pagination.current_page === pagination.last_page}
            onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}


      <AnimatePresence>
        {viewBooking && (
          <BookingViewModal booking={viewBooking} onClose={() => setViewBooking(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCallLog && (
          <CallLogModal 
            client={selectedBookingForCall?.client} 
            onClose={() => setShowCallLog(false)}
            onSuccess={() => setToast({ message: 'Call logged successfully!', type: 'success' })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <ReassignModal />
      </AnimatePresence>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'error' })} 
      />
    </div>
  );
};

export default BookingList;
