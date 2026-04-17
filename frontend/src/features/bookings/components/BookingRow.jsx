import React from 'react';
import {
  Plane,
  Hotel,
  Package,
  Phone,
  UserPlus,
  Calendar,
  Mail,
  RefreshCw,
  CreditCard,
  XCircle,
  ShieldCheck,
  Eye,
  PhoneCall,
  ArrowRightLeft,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  Copy,
  Car,
  Ship,
} from 'lucide-react';
import Card from '../../../components/ui/Card';

const actionPalette = {
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
    color: '#06B68A',
    background: 'rgba(6, 182, 138, 0.08)',
    border: '1px solid rgba(6, 182, 138, 0.18)',
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

const getClientDisplayName = (booking) => (
  booking.client?.name ||
  (booking.client?.first_name || booking.client?.last_name
    ? `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim()
    : 'Unknown Client')
);

const getTravelerCount = (booking) => (
  Number(booking.passengers_count) || booking.passengers?.length || 0
);

const getServiceIcon = (serviceableType) => {
  if (serviceableType.includes('Flight')) return Plane;
  if (serviceableType.includes('Hotel')) return Hotel;
  if (serviceableType.includes('Car')) return Car;
  if (serviceableType.includes('Cruise')) return Ship;
  return Package;
};

function ActionChip({ icon: Icon, label, onClick, tone = 'default', title, disabled = false, hideLabel = false }) {
  const styles = actionPalette[tone] || actionPalette.default;

  return (
    <button
      type="button"
      title={title || label}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onClick) onClick();
      }}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: 'auto',
        height: '32px',
        padding: '4px 10px',
        borderRadius: '100px',
        fontSize: '11px',
        fontWeight: 700,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: `0 4px 12px ${styles.color}15`,
        ...styles,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 8px 18px ${styles.color}40`;
          e.currentTarget.style.filter = 'brightness(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${styles.color}15`;
          e.currentTarget.style.filter = 'brightness(1)';
        }
      }}
    >
      {React.createElement(Icon, { size: hideLabel ? 16 : 14 })}
      {!hideLabel && <span>{label}</span>}
    </button>
  );
}

const BookingRow = ({
  booking,
  index,
  canReassign,
  statusColor,
  statusBadge,
  statusGuidance,
  approvalActionLabel,
  isSendingApproval,
  isSendingFlightChange,
  isSendingFutureCredit,
  isSendingRefund,
  onOpenClient,
  onSendApproval,
  onSendFlightChange,
  onSendFutureCredit,
  onSendRefund,
  onOpenProof,
  onView,
  onCall,
  onReassign,
  onMarkCompleted,
  onMarkPending,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);

  const handleCopyId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(booking.booking_reference || booking.id.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clientDisplayName = getClientDisplayName(booking);
  const createdByName =
    booking.created_by_name ||
    booking.agent?.name ||
    'Unknown';
  const currentAssignee = booking.agent?.name || 'Self/System';
  const wasReassigned = Boolean(booking.was_reassigned);
  const latestHandoffRemark = booking.latest_handoff_remark || '';

  return (
    <div
      key={booking.id}
      style={{
        opacity: 1,
        transform: 'translateY(0)',
        transition: `all 0.2s ease ${index * 0.05}s`,
      }}
    >
      <Card
        className="hover-glow"
        style={{
          padding: '0',
          overflow: 'hidden',
          borderLeft: `6px solid ${statusColor}`,
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.3fr 0.7fr 0.7fr 2.1fr',
            alignItems: 'center',
            padding: '20px 24px',
            gap: '24px',
          }}
        >
          {/* Group 1: Booking / Client */}
          <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, background: 'rgba(96, 165, 250, 0.12)', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                 #{booking.id}
               </span>
               <div 
                onClick={handleCopyId}
                title="Click to copy reference"
                style={{ 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  color: copied ? '#06B68A' : 'var(--text-main)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'copy',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  letterSpacing: '0.03em',
                  background: 'rgba(255, 255, 255, 0.03)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
              >
                <span>{booking.booking_reference}</span>
                {copied ? <Check size={14} /> : <Copy size={14} style={{ opacity: 0.5 }} />}
              </div>
            </div>
            
            <div onClick={onOpenClient} style={{ cursor: 'pointer' }}>
               <h3 className="hover-link" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clientDisplayName}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                <span>{booking.client?.phone || 'N/A'}</span>
                <span style={{ opacity: 0.4 }}>•</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.client?.email || 'N/A'}</span>
              </div>
            </div>
            {(booking.status_remark || booking.latest_handoff_remark) && (
              <div style={{ 
                marginTop: '10px',
                fontSize: '11px',
                color: booking.status_remark ? '#059669' : '#8b5cf6',
                background: booking.status_remark ? 'rgba(5, 150, 105, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                padding: '8px 12px',
                borderRadius: '8px',
                borderLeft: `3px solid ${booking.status_remark ? '#059669' : '#8b5cf6'}`,
                maxWidth: '100%',
                lineHeight: 1.5
              }} title={booking.status_remark || booking.latest_handoff_remark}>
                <strong style={{ opacity: 0.8 }}>{booking.status_remark ? 'FINAL NOTE:' : 'HANDOFF NOTE:'}</strong> {booking.status_remark || booking.latest_handoff_remark}
              </div>
            )}
          </div>

          {/* Group 2: Travel Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--text-main)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              <Calendar size={16} style={{ color: '#60a5fa' }} />
              <span>{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'N/A'}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap' }}>({getTravelerCount(booking)} Pax)</span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {booking.services?.map((service, si) => {
                const ServiceIcon = getServiceIcon(service.serviceable_type);
                return (
                  <div key={si} title={service.detail || service.type} style={{ padding: '5px 10px', borderRadius: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ServiceIcon size={12} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                      {service.detail ? service.detail.split(' ')[0] : service.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 3: Assigned To / History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.08em', marginBottom: '4px' }}>CREATED BY</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   {createdByName}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>ASSIGNED TO</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{currentAssignee}</span>
            </div>

            {booking.reassignment_history && booking.reassignment_history.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: '#8b5cf6',
                  fontSize: '10px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  width: 'fit-content',
                  marginTop: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
              >
                <ArrowRightLeft size={10} />
                <span>{showHistory ? 'HIDE LOG' : `HISTORY (${booking.reassignment_history.length})`}</span>
              </button>
            )}

            {showHistory && booking.reassignment_history && (
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  zIndex: 100,
                  top: '100%',
                  left: '24px',
                  width: '320px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  marginTop: '4px'
                }}
              >
                <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Handover History</h4>
                <div style={{ display: 'grid', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                  {booking.reassignment_history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                         {i < booking.reassignment_history.length - 1 && <div style={{ flex: 1, width: '2px', background: 'var(--border-color)', margin: '4px 0' }}></div>}
                      </div>
                      <div style={{ flex: 1, paddingBottom: i < booking.reassignment_history.length - 1 ? '12px' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)' }}>{h.to_agent_name || `Agent #${h.to_agent_id}`}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(h.reassigned_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          From: {h.from_agent_name || 'System'} • By: {h.reassigned_by_name}
                        </div>
                        {h.remark && (
                          <div style={{ fontSize: '10px', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px', borderLeft: '2px solid rgba(139, 92, 246, 0.4)' }}>
                            "{h.remark}"
                          </div>
                        )}
                      </div>
                    </div>
                  )).reverse()}
                </div>
              </div>
            )}
          </div>

          {/* Group 4: Status / Amount */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(booking.total_amount) || 0)}
            </div>
            {statusBadge}
          </div>

          {/* Group 5: Actions */}
          <div
            style={{
              paddingLeft: '16px',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 8px',
              justifyContent: 'flex-start',
            }}
          >
            <ActionChip
              icon={Mail}
              label={isSendingApproval ? '...' : approvalActionLabel}
              onClick={() => onSendApproval(booking)}
              tone="primary"
              title="Email payment approval link"
              disabled={isSendingApproval}
            />
            <ActionChip
              icon={RefreshCw}
              label={isSendingFlightChange ? '...' : 'Modify'}
              onClick={() => onSendFlightChange(booking)}
              tone="info"
              title="Record service adjustment"
              disabled={isSendingFlightChange}
            />
            <ActionChip
              icon={CreditCard}
              label={isSendingFutureCredit ? '...' : 'Future Credit'}
              onClick={() => onSendFutureCredit(booking)}
              tone="warning"
              title="Cancel with future credit"
              disabled={isSendingFutureCredit}
            />
            <ActionChip
              icon={XCircle}
              label={isSendingRefund ? '...' : 'Refund'}
              onClick={() => onSendRefund(booking)}
              tone="danger"
              title="Cancel with refund"
              disabled={isSendingRefund}
            />
            {booking.status === 'Approved' && (
              <ActionChip
                icon={RefreshCw}
                label="Process"
                onClick={() => onMarkPending(booking.id)}
                tone="primary"
                title="Move to Work Pending status"
              />
            )}
            {(booking.status === 'Work Pending' || booking.status === 'Approved') && (
              <ActionChip
                icon={CheckCircle2}
                label="Complete"
                onClick={() => onMarkCompleted(booking.id)}
                tone="success"
                title="Mark as fully completed"
              />
            )}
            <ActionChip
              icon={ShieldCheck}
              label="Proof"
              onClick={() => onOpenProof(booking.id)}
              tone="info"
              title="Open consent proof"
            />
            <ActionChip
              icon={Eye}
              label="View"
              onClick={() => onView(booking.id)}
              tone="info"
              title="Open full details"
            />
            <ActionChip
              icon={PhoneCall}
              label="Call"
              onClick={() => onCall(booking.id)}
              tone="success"
              title="Create call log"
            />
            {canReassign ? (
              <ActionChip
                icon={ArrowRightLeft}
                label="Reassign"
                onClick={() => onReassign(booking)}
                tone="warning"
                title="Transfer booking"
              />
            ) : null}
            <ActionChip
              icon={Pencil}
              label="Edit"
              onClick={() => onEdit(booking)}
              tone="default"
              title="Edit booking data"
            />
            <ActionChip
              icon={Trash2}
              label="Delete"
              onClick={() => onDelete(booking.id)}
              tone="danger"
              title="Delete permanently"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(BookingRow);
