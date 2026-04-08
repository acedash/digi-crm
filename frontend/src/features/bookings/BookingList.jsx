import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Mail,
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
import BookingRow from './components/BookingRow';
import { useAuthStore } from '../auth/useAuthStore';
import api, { BACKEND_BASE_URL } from '../../services/api';

const BookingList = ({ onCreate, onEdit }) => {
  const { user } = useAuthStore();
  const activeRole = typeof user?.roles?.[0] === 'object' ? user.roles[0].name : user?.roles?.[0];
  const canReassign = activeRole === 'admin' || activeRole === 'supervisor';
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const location = window.location;
  const basePath = '/' + location.pathname.split('/')[1];
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCallLog, setShowCallLog] = useState(false);
  const [selectedBookingForCall, setSelectedBookingForCall] = useState(null);
  const [reassignModal, setReassignModal] = useState({ open: false, bookingId: null, currentAgentId: null });
  const [handoffRemark, setHandoffRemark] = useState('');
  const [selectedReassignAgent, setSelectedReassignAgent] = useState('');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'error' });
  const [sendingApprovalId, setSendingApprovalId] = useState(null);
  const [sendingTemplateAction, setSendingTemplateAction] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0
  });

  const fetchBookings = useCallback(async (page = 1) => {
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
  }, [pagination.per_page, searchTerm]);

  useEffect(() => {
    fetchBookings(pagination.current_page);
  }, [fetchBookings, pagination.current_page]);

  useEffect(() => {
    const flash = routeLocation.state?.flash;
    if (flash?.message) {
      setToast({ message: flash.message, type: flash.type || 'success' });
      navigate(routeLocation.pathname, { replace: true, state: {} });
    }
  }, [navigate, routeLocation.pathname, routeLocation.state]);

  const handleReassignClick = async (booking) => {
    setReassignModal({ open: true, bookingId: booking.id, currentAgentId: booking.agent_id });
    setHandoffRemark('');
    setSelectedReassignAgent('');
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

  const executeReassign = async () => {
    if (!selectedReassignAgent) {
      setToast({ message: 'Please select who should receive this booking.', type: 'error' });
      return;
    }

    if (!handoffRemark.trim()) {
      setToast({ message: 'Please add a handoff remark for the new assignee.', type: 'error' });
      return;
    }

    try {
      await bookingService.reassignBooking(reassignModal.bookingId, selectedReassignAgent, handoffRemark.trim());
      setToast({ message: 'Booking reassigned successfully', type: 'success' });
      setReassignModal({ open: false, bookingId: null, currentAgentId: null });
      setHandoffRemark('');
      setSelectedReassignAgent('');
      fetchBookings(pagination.current_page);
    } catch (error) {
      setToast({
        message: error?.response?.data?.message || 'Failed to reassign booking',
        type: 'error',
      });
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

  const templateActionMeta = {
    flight_change: {
      label: 'Flight Change',
      success: 'Flight change email sent successfully.',
      confirm: 'Send flight change update',
    },
    cancellation_future_credit: {
      label: 'Future Credit',
      success: 'Future credit cancellation email sent successfully.',
      confirm: 'Send future credit cancellation email',
    },
    cancellation_refund: {
      label: 'Refund',
      success: 'Refund cancellation email sent successfully.',
      confirm: 'Send refund cancellation email',
    },
  };

  const handleSendTemplateEmail = async (booking, templateKey) => {
    if (templateKey === 'flight_change') {
      if (!['Approved', 'Confirmed', 'Awaiting Change Approval', 'Change Approved', 'Change Rejected'].includes(booking.status)) {
        setToast({
          message: 'Flight change workflow is available only after payment approval. Use normal edit until the booking is approved.',
          type: 'error',
        });
        return;
      }

      navigate(`${basePath}/bookings/${booking.id}/edit?workflow=service-change&template=flight_change`);
      return;
    }

    const action = templateActionMeta[templateKey];
    if (!action) return;

    const actionId = `${booking.id}:${templateKey}`;
    if (sendingTemplateAction === actionId) return;

    const clientName =
      booking.client?.name ||
      (booking.client?.first_name || booking.client?.last_name
        ? `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim()
        : 'this client');

    const email = booking.client?.email || 'no email provided';
    const confirmed = window.confirm(
      `${action.confirm} for ${booking.booking_reference} to ${clientName} (${email})?`
    );

    if (!confirmed) return;

    try {
      setSendingTemplateAction(actionId);
      await bookingService.sendTemplateEmail(booking.id, templateKey);
      setToast({ message: action.success, type: 'success' });
      fetchBookings(pagination.current_page);
    } catch (error) {
      setToast({
        message: error?.response?.data?.message || `Failed to send ${action.label.toLowerCase()} email`,
        type: 'error',
      });
    } finally {
      setSendingTemplateAction(null);
    }
  };

  const handleEditBooking = (booking) => {
    if (['Approved', 'Confirmed', 'Awaiting Change Approval', 'Change Approved', 'Change Rejected'].includes(booking.status)) {
      navigate(`${basePath}/bookings/${booking.id}/edit?workflow=service-change`, {
        state: {
          flash: {
            message: 'This booking is already approved. Normal edit is locked, so we opened tracked change mode instead.',
            type: 'success',
          },
        },
      });
      return;
    }

    onEdit(booking.id);
  };

  const statusIcons = {
    'Approved': { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', shadow: 'rgba(16, 185, 129, 0.2)' },
    'Change Approved': { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', shadow: 'rgba(16, 185, 129, 0.2)' },
    'Confirmed': { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', shadow: 'rgba(16, 185, 129, 0.2)' },
    'Awaiting Approval': { icon: Clock, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', shadow: 'rgba(139, 92, 246, 0.2)' },
    'Awaiting Change Approval': { icon: Clock, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', shadow: 'rgba(139, 92, 246, 0.2)' },
    'Pending': { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', shadow: 'rgba(245, 158, 11, 0.2)' },
    'Cancelled': { icon: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
    'Rejected': { icon: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
    'Change Rejected': { icon: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
    'Completed': { icon: CheckCircle2, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', shadow: 'rgba(59, 130, 246, 0.2)' }
  };

  const getStatusGuidance = (status) => {
    switch (status) {
      case 'Pending':
        return 'Booking is saved in CRM and ready for the next step.';
      case 'Awaiting Approval':
        return 'Approval email sent. Waiting for the client response.';
      case 'Awaiting Change Approval':
        return 'A post-approval change charge was sent. Waiting for the client to approve the updated amount.';
      case 'Approved':
      case 'Confirmed':
        return 'Client approved payment. Booking is cleared to process.';
      case 'Change Approved':
        return 'Client approved the latest change charge. Updated booking is cleared to process.';
      case 'Rejected':
        return 'Client rejected the authorization. Review before proceeding.';
      case 'Change Rejected':
        return 'Client rejected the latest change charge. Review the booking update before proceeding.';
      case 'Cancelled':
        return 'Booking has been cancelled and is no longer active.';
      case 'Completed':
        return 'Trip workflow has been completed successfully.';
      default:
        return 'Review the booking details and continue the workflow.';
    }
  };

  const getApprovalActionLabel = (status) => {
    if (status === 'Awaiting Approval' || status === 'Awaiting Change Approval') return 'Resend Approval';
    if (status === 'Approved' || status === 'Confirmed' || status === 'Change Approved') return 'Send Again';
    if (status === 'Rejected' || status === 'Change Rejected') return 'Send New Approval';
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

  const renderReassignModal = () => {
    if (!reassignModal.open) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px'
      }}>
        <div
          style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-card)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-color)' }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} color="#8b5cf6" /> Reassign Booking
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Select who should take this booking and leave a clear handoff note for them.</p>
          
          <select 
            value={selectedReassignAgent}
            onChange={e => setSelectedReassignAgent(e.target.value)}
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

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Final Handoff Remark
            </label>
            <textarea
              value={handoffRemark}
              onChange={(e) => setHandoffRemark(e.target.value)}
              placeholder="Write the important context for the next agent: what was discussed, what is pending, and what they should do next."
              style={{
                width: '100%',
                minHeight: '110px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                outline: 'none',
                resize: 'vertical',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setReassignModal({ open: false, bookingId: null, currentAgentId: null });
                setHandoffRemark('');
                setSelectedReassignAgent('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={executeReassign}>
              Reassign
            </Button>
          </div>
        </div>
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
          {
            label: 'Approved',
            value: bookings.filter(
              (b) => b.status === 'Approved' || b.status === 'Confirmed' || b.status === 'Change Approved'
            ).length,
            icon: CheckCircle2,
            color: 'green',
          },
          {
            label: 'Awaiting Approval',
            value: bookings.filter(
              (b) => b.status === 'Awaiting Approval' || b.status === 'Awaiting Change Approval'
            ).length,
            icon: Clock,
            color: 'yellow',
          },
          {
            label: 'Rejected',
            value: bookings.filter(
              (b) => b.status === 'Rejected' || b.status === 'Change Rejected' || b.status === 'Cancelled'
            ).length,
            icon: XCircle,
            color: 'red',
          }
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
          {[
            'all',
            'Pending',
            'Awaiting Approval',
            'Awaiting Change Approval',
            'Approved',
            'Change Approved',
            'Rejected',
            'Change Rejected',
            'Completed',
            'Cancelled',
          ].map(status => (
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
            const isSendingApproval = sendingApprovalId === booking.id;
            const isSendingFlightChange = sendingTemplateAction === `${booking.id}:flight_change`;
            const isSendingFutureCredit = sendingTemplateAction === `${booking.id}:cancellation_future_credit`;
            const isSendingRefund = sendingTemplateAction === `${booking.id}:cancellation_refund`;
            
            return (
              <BookingRow
                key={booking.id}
                booking={booking}
                index={index}
                canReassign={canReassign}
                statusColor={statusColor}
                statusBadge={getStatusStyle(booking.status)}
                statusGuidance={getStatusGuidance(booking.status)}
                approvalActionLabel={getApprovalActionLabel(booking.status)}
                isSendingApproval={isSendingApproval}
                isSendingFlightChange={isSendingFlightChange}
                isSendingFutureCredit={isSendingFutureCredit}
                isSendingRefund={isSendingRefund}
                onOpenClient={() => navigate(`${basePath}/clients/${booking.client_id}`)}
                onSendApproval={() => handleSendApproval(booking)}
                onSendFlightChange={() => handleSendTemplateEmail(booking, 'flight_change')}
                onSendFutureCredit={() => handleSendTemplateEmail(booking, 'cancellation_future_credit')}
                onSendRefund={() => handleSendTemplateEmail(booking, 'cancellation_refund')}
                onOpenProof={() => navigate(`${basePath}/bookings/${booking.id}/consent-proof`)}
                onView={() => navigate(`${basePath}/bookings/${booking.id}`)}
                onCall={() => {
                  setSelectedBookingForCall(booking);
                  setShowCallLog(true);
                }}
                onReassign={() => handleReassignClick(booking)}
                onEdit={() => handleEditBooking(booking)}
                onDelete={() => handleDelete(booking.id)}
              />
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
        {showCallLog && (
          <CallLogModal 
            client={selectedBookingForCall?.client} 
            onClose={() => setShowCallLog(false)}
            onSuccess={() => setToast({ message: 'Call logged successfully!', type: 'success' })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renderReassignModal()}
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
