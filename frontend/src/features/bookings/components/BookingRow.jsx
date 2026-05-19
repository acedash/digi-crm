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
  Undo,
  Check,
  CheckCircle2,
  Copy,
  Car,
  Ship,
  ClipboardList
} from 'lucide-react';
import Card from '../../../components/ui/Card';
import Modal from '../../../components/ui/Modal';

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
    color: '#059669',
    background: 'rgba(5, 150, 105, 0.08)',
    border: '1px solid rgba(5, 150, 105, 0.18)',
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
  id,
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
  onRestore,
  totalCollected = 0,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const isDeleted = Boolean(booking.deleted_at);

  const handleCopyId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(booking.booking_reference || booking.id.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  const handleCopyLink = (token) => {
    const link = `${window.location.origin}/card-collection/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const clientDisplayName = getClientDisplayName(booking);
  const createdByDisplay = booking.creator?.user_custom_id 
    ? `${booking.creator.name} (${booking.creator.user_custom_id})`
    : (booking.created_by_name || booking.agent?.name || 'Unknown');
  const currentAssigneeDisplay = booking.agent?.user_custom_id
    ? `${booking.agent.name} (${booking.agent.user_custom_id})`
    : (booking.agent?.name || 'Self/System');
  const wasReassigned = Boolean(booking.was_reassigned);
  const latestHandoffRemark = booking.latest_handoff_remark || '';

  return (
    <div
      id={id}
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
          className="responsive-booking-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1.2fr 1.3fr 0.7fr 1.0fr 1.8fr',
            alignItems: 'center',
            padding: window.innerWidth <= 768 ? '20px' : '20px 24px',
            gap: window.innerWidth <= 768 ? '16px' : '24px',
          }}
        >
          {/* Group 1: Booking / Client */}
          <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <span style={{ 
                fontFamily: 'monospace', 
                fontSize: '11px', 
                fontWeight: 800, 
                background: 'rgba(96, 165, 250, 0.12)', 
                color: '#06B68A', 
                padding: '3px 8px', 
                borderRadius: '4px', 
                letterSpacing: '0.05em', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                whiteSpace: 'nowrap'
              }}>
                <ClipboardList size={12} /> #{booking.id}
              </span>
              
              {!booking.has_cards && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '10px',
                  fontWeight: 900,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CreditCard size={10} /> No Card Details
                </span>
              )}
            </div>

            
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
                padding: '2px 0',
                borderRadius: '6px',
                transition: 'all 0.2s',
                letterSpacing: '0.03em',
                alignSelf: 'flex-start'
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.booking_reference}</span>
              {copied ? <Check size={14} /> : <Copy size={14} style={{ opacity: 0.5 }} />}
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
          </div>

          {/* Group 2: Travel Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--text-main)', fontWeight: 700, whiteSpace: 'nowrap' }}>
              <Calendar size={16} style={{ color: '#06B68A' }} />
              <span>{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'N/A'}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap' }}>({getTravelerCount(booking)} Pax)</span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(Array.isArray(booking.services) ? booking.services : []).map((service, si) => {
                const ServiceIcon = getServiceIcon(service.serviceable_type);
                return (
                  <div 
                    key={si} 
                    title={service.detail || service.type} 
                    style={{ 
                      padding: '4px 10px', 
                      borderRadius: '100px', 
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}
                  >
                    <ServiceIcon size={11} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
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
                   {createdByDisplay}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>ASSIGNED TO</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{currentAssigneeDisplay}</span>
            </div>

            {Array.isArray(booking.reassignment_history) && booking.reassignment_history.length > 0 && (
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
                <span>{`HISTORY (${booking.reassignment_history.length})`}</span>
              </button>
            )}

            <Modal 
              isOpen={showHistory} 
              onClose={() => setShowHistory(false)} 
              title="Handover History"
              maxWidth="450px"
            >
              <div style={{ display: 'grid', gap: '16px' }}>
                {(Array.isArray(booking.reassignment_history) ? booking.reassignment_history : []).map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)' }}></div>
                       {i < booking.reassignment_history.length - 1 && <div style={{ flex: 1, width: '2px', background: 'var(--border-color)', margin: '4px 0' }}></div>}
                    </div>
                    <div style={{ flex: 1, paddingBottom: i < booking.reassignment_history.length - 1 ? '16px' : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>{h.to_agent_name || `Agent #${h.to_agent_id}`}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{new Date(h.reassigned_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                        <span>From: <strong style={{color: 'var(--text-main)'}}>{h.from_agent_name || 'System'}</strong></span>
                        <span style={{opacity: 0.3}}>|</span>
                        <span>By: <strong style={{color: 'var(--text-main)'}}>{h.reassigned_by_name}</strong></span>
                      </div>
                      {h.remark && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-main)', 
                          background: 'var(--bg-app)', 
                          padding: '12px', 
                          borderRadius: '12px', 
                          border: '1px solid var(--border-color)',
                          lineHeight: 1.5
                        }}>
                          "{h.remark}"
                        </div>
                      )}
                    </div>
                  </div>
                )).reverse()}
              </div>
            </Modal>
          </div>

          {/* Group 4: Status / Amount */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(booking.total_amount) || 0)}
              </div>
              {totalCollected > 0 && (
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></div>
                   Collected: {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(totalCollected)}
                </div>
              )}
            </div>
            {statusBadge}
          </div>

          {/* Group 5: Actions */}
          <div
            id={index === 0 ? 'first-booking-actions' : undefined}
            style={{
              paddingLeft: window.innerWidth <= 768 ? '0' : '16px',
              borderLeft: window.innerWidth <= 768 ? 'none' : '1px solid var(--border-color)',
              borderTop: window.innerWidth <= 768 ? '1px solid var(--border-color)' : 'none',
              paddingTop: window.innerWidth <= 768 ? '16px' : '0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 8px',
              justifyContent: 'flex-start',
            }}
          >
            {isDeleted ? (
              <>
                <ActionChip
                  icon={Undo}
                  label="Restore"
                  onClick={() => onRestore(booking.id)}
                  tone="success"
                  title="Restore this booking"
                />
                <ActionChip
                  icon={Eye}
                  label="View"
                  onClick={() => onView(booking.id)}
                  tone="info"
                  title="Open full details"
                />
              </>
            ) : (
              <>
                {(() => {
                  const pendingAuth = (booking.payment_authorizations || booking.paymentAuthorizations || [])
                    .find(a => String(a.status).toLowerCase() === 'pending');
                  
                  if (!pendingAuth || !pendingAuth.token) {
                    return (
                      <ActionChip
                        icon={Mail}
                        label={isSendingApproval ? '...' : approvalActionLabel}
                        onClick={() => onSendApproval(booking)}
                        tone="primary"
                        title="Email payment approval link"
                        disabled={isSendingApproval}
                      />
                    );
                  }
                  
                  const isCardCollection = pendingAuth.authorization_type === 'card_collection' || pendingAuth.metadata?.authorization_type === 'card_collection';
                  const prefix = isCardCollection ? 'card-collection' : 'authorize';
                  const shareLink = `${window.location.origin}/${prefix}/${pendingAuth.token}`;

                  return (
                    <>
                      <ActionChip
                        icon={copiedLink ? Check : Copy}
                        label={copiedLink ? 'Copied' : 'Copy Link'}
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        tone={copiedLink ? 'success' : 'warning'}
                        title={isCardCollection ? "Copy secure card collection link" : "Copy secure payment link"}
                      />
                      <ActionChip
                        icon={Mail}
                        label={isSendingApproval ? '...' : (isCardCollection ? "Email Card Link" : approvalActionLabel)}
                        onClick={() => onSendApproval(booking, true)}
                        tone="primary"
                        title={isCardCollection ? "Send card collection link via email" : "Send payment link via email"}
                        disabled={isSendingApproval}
                      />

                    </>
                  );
                })()}


                <ActionChip
                  icon={Pencil}
                  label="Modify"
                  onClick={() => onEdit(booking)}
                  tone="info"
                  title="Edit or modify this booking"
                />
                {['Approved', 'Confirmed', 'Awaiting Change Approval', 'Change Approved', 'Change Rejected'].includes(booking.status) && (
                  <ActionChip
                    icon={RefreshCw}
                    label={isSendingFlightChange ? '...' : 'Flight Change'}
                    onClick={() => onSendFlightChange(booking)}
                    tone="primary"
                    title="Send flight change notification"
                    disabled={isSendingFlightChange}
                  />
                )}
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
                  onClick={() => onCall(booking)}
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
                  icon={Trash2}
                  label="Delete"
                  onClick={() => onDelete(booking.id)}
                  tone="danger"
                  title="Delete permanently"
                />

                {!booking.has_cards && !(booking.payment_authorizations || booking.paymentAuthorizations || []).some(a => String(a.status).toLowerCase() === 'pending') && (
                  <ActionChip
                    icon={ShieldCheck}
                    label="Collect Cards"
                    onClick={() => onSendApproval(booking)}
                    tone="warning"
                    title="Generate card collection link for client"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {(booking.status_remark || booking.latest_handoff_remark) && (
          <div style={{ 
            background: 'var(--bg-app)',
            borderTop: '1px solid var(--border-color)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              padding: '6px',
              background: booking.status_remark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: booking.status_remark ? '#10b981' : '#8b5cf6'
            }}>
              <ClipboardList size={16} />
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.5 }}>
              <span style={{ 
                fontWeight: 900, 
                color: booking.status_remark ? '#10b981' : '#8b5cf6',
                marginRight: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {booking.status_remark ? 'FINAL NOTE:' : 'HANDOFF NOTE:'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                {booking.status_remark || booking.latest_handoff_remark}
              </span>
            </div>
          </div>
        )}

      </Card>
    </div>
  );
};

export default React.memo(BookingRow);
