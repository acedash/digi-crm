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
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  CreditCard,
  ClipboardList,
  HelpCircle
} from 'lucide-react';
import { useWalkthroughStore } from '../../store/walkthroughStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import bookingService from './bookingService';
import paymentAuthService from './paymentAuthService';
import Toast from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import CallLogModal from './components/CallLogModal';
import BookingRow from './components/BookingRow';
import { useAuthStore } from '../auth/useAuthStore';
import api, { BACKEND_BASE_URL } from '../../services/api';
import { exportToExcel, exportToPDF, exportToJSON } from './utils/bookingExport';
import ExportDropdown from '../../components/ui/ExportDropdown';
import { getStatusLabel, statusIcons } from './bookingUtils';

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCallLog, setShowCallLog] = useState(false);
  const [selectedBookingForCall, setSelectedBookingForCall] = useState(null);
  const [reassignModal, setReassignModal] = useState({ open: false, bookingId: null, currentAgentId: null });
  const [handoffRemark, setHandoffRemark] = useState('');
  const [selectedReassignAgent, setSelectedReassignAgent] = useState('');
  const [availableAgents, setAvailableAgents] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ 
    open: false, 
    title: '', 
    message: '', 
    onConfirm: null, 
    tone: 'primary',
    confirmLabel: 'Confirm',
    isLoading: false
  });
  const [sendingApprovalId, setSendingApprovalId] = useState(null);
  const [sendingTemplateAction, setSendingTemplateAction] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, bookingId: null, targetStatus: '' });
  const [statusRemark, setStatusRemark] = useState('');
  const isFetchingRef = React.useRef(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState({
    Total: 0,
    Approved: 0,
    Drafts: 0,
    Pending: 0,
    'Work Pending': 0,
    Completed: 0,
    Rejected: 0
  });

  const filteredBookings = bookings.filter(booking => {
    const clientName = booking.client?.name || 
      (booking.client?.first_name || booking.client?.last_name ? 
       `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim() : 
       '');
    const matchesSearch = 
      booking.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.client?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.client?.phone?.includes(searchTerm) ||
      booking.id.toString().includes(searchTerm);
      
    const matchesFilter = filterType === 'all' || booking.status?.toLowerCase() === (filterType || '').toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const exportHandlers = {
    excel: () => exportToExcel(filteredBookings, `bookings_${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`),
    pdf: () => exportToPDF(filteredBookings, `bookings_${filterType}_${new Date().toISOString().split('T')[0]}.pdf`),
    json: () => exportToJSON(filteredBookings, `bookings_${filterType}_${new Date().toISOString().split('T')[0]}.json`),
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPagination((current) => ({ ...current, current_page: 1 }));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const fetchBookings = useCallback(async (page = 1) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const response = await bookingService.getBookings({ 
        page, 
        per_page: pagination.per_page,
        search: debouncedSearchTerm,
        start_date: startDate,
        end_date: endDate
      });
      const result = response.data.data;
      
      if (result && result.data) {
        setBookings(result.data.data);
        setPagination({
          current_page: result.data.current_page,
          last_page: result.data.last_page,
          per_page: result.data.per_page,
          total: result.data.total
        });
        if (result.stats) {
          setStats(result.stats);
        }
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [pagination.per_page, debouncedSearchTerm, startDate, endDate]);

  // Re-fetch when page changes
  useEffect(() => {
    fetchBookings(pagination.current_page);
  }, [pagination.current_page, fetchBookings]);

  // Reset to page 1 when search or dates change
  useEffect(() => {
    setPagination(current => ({ ...current, current_page: 1 }));
    // fetchBookings will be triggered by the current_page effect if it wasn't already 1
    // If it was already 1, we still need to trigger it if startDate/endDate changed
    if (pagination.current_page === 1) {
      fetchBookings(1);
    }
  }, [startDate, endDate, debouncedSearchTerm]);



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

  const executeReassign = useCallback(async () => {
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
  }, [reassignModal.bookingId, selectedReassignAgent, handoffRemark, pagination.current_page, fetchBookings]);

  const handleSendApproval = useCallback(async (booking) => {
    if (sendingApprovalId === booking.id || isFetchingRef.current) return;

    const clientName =
      booking.client?.name ||
      (booking.client?.first_name || booking.client?.last_name
        ? `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim()
        : 'this client');

    const email = booking.client?.email || 'no email provided';
    
    setConfirmModal({
      open: true,
      title: 'Send Payment Link',
      message: `Are you sure you want to send the secure link for ${booking.booking_reference} to ${clientName} (${email})?`,
      confirmLabel: 'Send Request',
      tone: 'primary',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          setSendingApprovalId(booking.id);
          
          // Check for existing pending card collection link
          const pendingCollection = (booking.payment_authorizations || booking.paymentAuthorizations || [])
            .find(a => a.authorization_type === 'card_collection' && String(a.status).toLowerCase() === 'pending');

          if (pendingCollection) {
            await paymentAuthService.sendEmail(pendingCollection.id);
            setToast({ message: `Collection link emailed to ${booking.client?.email || 'client'}`, type: 'success' });
          } else {
            await paymentAuthService.create({
              client_id: booking.client_id,
              booking_ids: [booking.id],
            });
            setToast({ message: `Approval email sent to ${booking.client?.email || 'client'}`, type: 'success' });
          }
          
          setConfirmModal({ open: false });
        } catch (error) {
          setConfirmModal({ open: false });
          setToast({
            message: error?.response?.data?.message || 'Failed to send approval email',
            type: 'error',
          });
        } finally {
          setSendingApprovalId(null);
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  }, [sendingApprovalId]);

  const templateActionMeta = React.useMemo(() => ({
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
  }), []);

  const handleSendTemplateEmail = useCallback(async (booking, templateKey) => {
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
    
    setConfirmModal({
      open: true,
      title: action.label,
      message: `${action.confirm} for ${booking.booking_reference} to ${clientName} (${email})?`,
      confirmLabel: 'Send Email',
      tone: 'primary',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          setSendingTemplateAction(actionId);
          await bookingService.sendTemplateEmail(booking.id, templateKey);
          setToast({ message: action.success, type: 'success' });
          setConfirmModal({ open: false });
          fetchBookings(pagination.current_page);
        } catch (error) {
          setConfirmModal({ open: false });
          setToast({
            message: error?.response?.data?.message || `Failed to send ${action.label.toLowerCase()} email`,
            type: 'error',
          });
        } finally {
          setSendingTemplateAction(null);
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  }, [basePath, navigate, sendingTemplateAction, templateActionMeta, pagination.current_page, fetchBookings]);

  const handleEditBooking = useCallback((booking) => {
    const postApprovalStatuses = ['Approved', 'Confirmed', 'Awaiting Change Approval', 'Change Approved', 'Change Rejected'];
    const completedStatuses = ['Completed', 'Work Completed'];

    if (postApprovalStatuses.includes(booking.status)) {
      navigate(`${basePath}/bookings/${booking.id}/edit?workflow=service-change`, {
        state: {
          flash: {
            message: 'This booking is already approved. Normal edit is locked, so we opened modification mode instead.',
            type: 'success',
          },
        },
      });
      return;
    }

    if (completedStatuses.includes(booking.status)) {
      // Completed bookings go to the normal edit form directly
      onEdit(booking.id);
      return;
    }

    onEdit(booking.id);
  }, [basePath, navigate, onEdit]);

  // Moved to bookingUtils.js
  // const statusIcons = { ... }

  const getStatusGuidance = (status) => {
    switch (status) {
      case 'Pending':
        return 'Booking is saved in CRM. Approval email has not been sent yet.';
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
      case 'Work Completed':
        return 'Trip workflow has been completed successfully.';
      case 'Draft':
        return 'Booking is an incomplete draft. Finish client and service details to confirm.';
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
        {getStatusLabel(status)}
      </div>
    );
  };

  const handleDelete = useCallback(async (id) => {
    setConfirmModal({
      open: true,
      title: 'Delete Booking',
      message: 'Are you sure you want to delete this booking? This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await bookingService.deleteBooking(id);
          setToast({ message: 'Booking deleted successfully', type: 'success' });
          setConfirmModal({ open: false });
          fetchBookings();
        } catch (error) {
          console.error('Failed to delete booking:', error);
          setToast({ message: 'Failed to delete booking', type: 'error' });
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  }, [fetchBookings]);

  const handleStatusUpdate = useCallback(async () => {
    if (!statusModal.bookingId || !statusModal.targetStatus) return;
    
    setLoading(true);
    try {
      await bookingService.updateBooking(statusModal.bookingId, {
        status: statusModal.targetStatus,
        status_remark: statusRemark,
        update_mode: 'status_only'
      });
      
      setToast({ message: `Booking marked as ${statusModal.targetStatus}`, type: 'success' });
      setStatusModal({ open: false, bookingId: null, targetStatus: '' });
      setStatusRemark('');
      fetchBookings(pagination.current_page);
    } catch (error) {
      console.error('Failed to update status:', error);
      setToast({ message: error.response?.data?.message || 'Failed to update status', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [statusModal, statusRemark, pagination.current_page, fetchBookings]);

  // Memoized handlers for BookingRow to prevent re-renders
  const handleOpenClient = useCallback((clientId) => navigate(`${basePath}/clients/${clientId}`), [basePath, navigate]);
  const handleOpenProof = useCallback((bookingId) => navigate(`${basePath}/bookings/${bookingId}/consent-proof`), [basePath, navigate]);
  const handleViewDetails = useCallback((bookingId) => navigate(`${basePath}/bookings/${bookingId}`), [basePath, navigate]);
  const handleOpenCallLog = useCallback((booking) => {
    setSelectedBookingForCall(booking);
    setShowCallLog(true);
  }, []);
  const handleTriggerMarkCompleted = useCallback((bookingId) => setStatusModal({ open: true, bookingId, targetStatus: 'Completed' }), []);
  const handleTriggerMarkPending = useCallback((bookingId) => setStatusModal({ open: true, bookingId, targetStatus: 'Work Pending' }), []);
  const handleTriggerReassign = useCallback((booking) => handleReassignClick(booking), [handleReassignClick]);

  const renderStatusModal = () => {
    if (!statusModal.open) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px'
      }}>
        <div style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-card)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#06B68A" /> Mark as {statusModal.targetStatus}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Please provide a {statusModal.targetStatus === 'Completed' ? 'final completion' : 'work'} remark for this booking.
          </p>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Remark / Note
            </label>
            <textarea
              value={statusRemark}
              onChange={(e) => setStatusRemark(e.target.value)}
              placeholder={`Enter details about why this is being marked as ${statusModal.targetStatus.toLowerCase()}...`}
              style={{
                width: '100%',
                minHeight: '110px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                outline: 'none',
                resize: 'none',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="ghost" onClick={() => { setStatusModal({ open: false, bookingId: null, targetStatus: '' }); setStatusRemark(''); }}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={!statusRemark.trim() || loading}>
              Confirm {statusModal.targetStatus}
            </Button>
          </div>
        </div>
      </div>
    );
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
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              background: 'var(--bg-app)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-main)', 
              outline: 'none', 
              cursor: 'pointer', 
              marginBottom: '24px', 
              fontSize: '14px',
              appearance: 'none',
              WebkitAppearance: 'none'
            }}
          >
            <option value="" disabled>Select Agent</option>
            {user?.id !== reassignModal.currentAgentId && (
              <option value={user?.id}>Assign to myself ({user?.name})</option>
            )}
            {availableAgents.filter(ag => ag.id !== reassignModal.currentAgentId && ag.id !== user?.id).map(ag => (
              <option key={ag.id} value={ag.id}>{ag.name} ({ag.user_custom_id})</option>
            ))}
          </select>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Handover Notes
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
              Reassign Booking
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: window.innerWidth <= 768 ? '16px' : '24px', maxWidth: '1400px', margin: '0 auto' }}>
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const { startTour } = useWalkthroughStore.getState();
              startTour([
                {
                  target: '#booking-stats',
                  title: 'Booking Overview',
                  content: 'Quickly see the status of all your bookings, from drafts to completed trips.',
                  position: 'bottom'
                },
                {
                  target: '#booking-tools',
                  title: 'Search & Filters',
                  content: 'Search for specific bookings by ID, Client Name, or PNR. You can also filter by date ranges.',
                  position: 'bottom'
                },
                {
                  target: '#booking-list-container',
                  title: 'Your Bookings',
                  content: 'Manage your active bookings here. You can send approval links, edit details, or reassign them to other agents.',
                  position: 'top'
                }
              ]);
            }}
            icon={HelpCircle}
            style={{ borderRadius: '100px', fontWeight: 700, color: 'hsl(var(--primary))', marginRight: '8px' }}
          >
            Show Guide
          </Button>
          <Button variant="primary" icon={Plus} onClick={onCreate}>New Booking</Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div id="booking-stats" className="responsive-grid" style={{ 
        marginBottom: '40px' 
      }}>
        {[
          { label: 'Total Bookings', value: stats.Total, icon: ClipboardList, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)' },
          {
            label: 'Initial Approval By Client',
            value: stats.Approved,
            icon: CheckCircle2,
            color: '#06B68A',
            bg: 'rgba(6, 182, 138, 0.1)'
          },
          {
            label: 'Work Pending',
            value: stats['Work Pending'],
            icon: Clock,
            color: '#ec4899',
            bg: 'rgba(236, 72, 153, 0.1)'
          },
          {
            label: 'Work Completed',
            value: stats.Completed,
            icon: CheckCircle2,
            color: '#06B68A',
            bg: 'rgba(6, 182, 138, 0.1)'
          },
          {
            label: 'Drafts',
            value: stats.Drafts,
            icon: FileText,
            color: '#94a3b8',
            bg: 'rgba(148, 163, 184, 0.1)'
          },
          {
            label: 'Email Send Pending',
            value: stats.Pending,
            icon: Clock,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)'
          },
          {
            label: 'Rejected / Cancel',
            value: stats.Rejected,
            icon: XCircle,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)'
          }
        ].map((stat, i) => (
          <Card key={i} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                padding: '12px', 
                borderRadius: '12px', 
                background: stat.bg || `rgba(var(--${stat.color}-rgb), 0.1)`,
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

      {/* Toolbar Area */}
      <div id="booking-tools" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        {/* Row 1: Primary Search, Dates, Refresh, Export */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: window.innerWidth <= 768 ? '100%' : '300px', maxWidth: window.innerWidth <= 768 ? '100%' : '400px' }}>
            <Input 
              placeholder="Search by ID, reference, client name, or PNR..." 
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)', width: window.innerWidth <= 768 ? '100%' : 'auto', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <Input 
                type="date"
                icon={Calendar}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, padding: '0 4px' }}>to</span>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <Input 
                type="date"
                icon={Calendar}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: window.innerWidth <= 768 ? '0' : 'auto', width: window.innerWidth <= 768 ? '100%' : 'auto', justifyContent: window.innerWidth <= 768 ? 'space-between' : 'flex-end' }}>
            <Button 
              variant="glass" 
              icon={RefreshCw} 
              onClick={() => fetchBookings(pagination.current_page)}
              isLoading={loading}
              title="Refresh List"
            />
            <ExportDropdown 
              options={[
                { label: 'Export as PDF Report', icon: FileText, onClick: exportHandlers.pdf },
                { label: 'Export as Excel Data', icon: FileSpreadsheet, onClick: exportHandlers.excel },
                { label: 'Export Raw JSON', icon: FileJson, onClick: exportHandlers.json },
              ]}
              buttonStyle={{ background: 'var(--bg-card)', padding: '10px 16px', borderRadius: '12px' }}
            />
          </div>
        </div>
          
        {/* Row 2: Status Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['all', 'Draft', 'Pending', 'Awaiting Approval', 'Approved', 'Awaiting Cards', 'Work Pending', 'Completed', 'Cancelled'].map(status => (
            <button 
              key={status}
              onClick={() => setFilterType(status)}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '100px', 
                background: filterType === status ? 'hsl(var(--primary))' : 'var(--bg-card)', 
                color: filterType === status ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {status === 'all' ? 'All' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '20% 18% 13% 13% 36%',
              gap: '8px',
              padding: '0 12px 10px',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            <div>Booking / Client</div>
            <div>Travel Details</div>
            <div>Assigned To</div>
            <div>Amount / Status</div>
            <div>Actions</div>
          </div>
        </div>

        <div id="booking-list-container" style={{ width: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gap: '6px', width: '100%' }}>
        <AnimatePresence mode="popLayout">
          {filteredBookings.map((booking, index) => {
            const statusColor = statusIcons[booking.status]?.color || (typeof statusIcons[booking.status]?.icon === 'string' ? statusIcons[booking.status]?.icon : '#f59e0b');
            const isSendingApproval = sendingApprovalId === booking.id;
            const isSendingFlightChange = sendingTemplateAction === `${booking.id}:flight_change`;
            const isSendingFutureCredit = sendingTemplateAction === `${booking.id}:cancellation_future_credit`;
            const isSendingRefund = sendingTemplateAction === `${booking.id}:cancellation_refund`;
            
            // Calculate Card Collection Context
            const cards = booking.details_json?.payment_cards || [];
            const totalCollected = cards.reduce((sum, card) => sum + (Number(card.amount) || 0), 0);
            const authorizations = booking.payment_authorizations || booking.paymentAuthorizations || [];
            const hasPendingLink = authorizations.some(a => 
              (a.authorization_type === 'card_collection' || a.metadata?.authorization_type === 'card_collection') && 
              String(a.status).toLowerCase() === 'pending'
            );

            // Determine Override Status
            let customStatusBadge = getStatusStyle(booking.status);
            let customStatusColor = statusColor;
            
            // Priority: Life-cycle statuses (Approved, Completed, Cancelled, Work Pending) should not be overridden by card collection indicator
            const isAdvancedStatus = ['Approved', 'Completed', 'Cancelled', 'Rejected', 'Work Pending', 'Awaiting Approval'].includes(booking.status);

            if (!isAdvancedStatus && cards.length > 0) {
              customStatusColor = '#059669'; // Success Green
              customStatusBadge = (
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', 
                  borderRadius: '100px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                  background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.2)'
                }}>
                  <ShieldCheck size={10} strokeWidth={3} /> Cards Collected
                </div>
              );
            } else if (!isAdvancedStatus && hasPendingLink) {
              customStatusColor = '#f59e0b'; // Warning Orange
              customStatusBadge = (
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', 
                  borderRadius: '100px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                  background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  <RefreshCw size={10} className="spin-slow" /> Pending Card Details
                </div>
              );
            }

            return (
              <BookingRow
                key={booking.id}
                booking={booking}
                index={index}
                canReassign={canReassign}
                statusColor={customStatusColor}
                statusBadge={customStatusBadge}
                statusGuidance={getStatusGuidance(booking.status)}
                approvalActionLabel={getApprovalActionLabel(booking.status)}
                totalCollected={totalCollected}
                isSendingApproval={isSendingApproval}
                isSendingFlightChange={isSendingFlightChange}
                isSendingFutureCredit={isSendingFutureCredit}
                isSendingRefund={isSendingRefund}
                onOpenClient={() => handleOpenClient(booking.client_id)}
                onSendApproval={handleSendApproval}
                onSendFlightChange={(b) => handleSendTemplateEmail(b, 'flight_change')}
                onSendFutureCredit={(b) => handleSendTemplateEmail(b, 'cancellation_future_credit')}
                onSendRefund={(b) => handleSendTemplateEmail(b, 'cancellation_refund')}
                onOpenProof={handleOpenProof}
                onView={handleViewDetails}
                onCall={handleOpenCallLog}
                onReassign={handleTriggerReassign}
                onMarkCompleted={handleTriggerMarkCompleted}
                onMarkPending={handleTriggerMarkPending}
                onEdit={handleEditBooking}
                onDelete={handleDelete}
              />
            );
          })}
        </AnimatePresence>

        {filteredBookings.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '64px', opacity: 0.5 }}>
            <ClipboardList size={48} style={{ margin: '0 auto 16px' }} />
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
        {renderStatusModal()}
      </AnimatePresence>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'error' })} 
      />

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        tone={confirmModal.tone}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
};

export default BookingList;
