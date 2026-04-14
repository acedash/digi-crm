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
          marginBottom: '0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '20% 18% 13% 13% 36%',
            alignItems: 'center',
            padding: '8px 12px',
            gap: '8px',
          }}
        >
          {/* Group 1: Booking / Client */}
          <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px' }}>
                 #{booking.id}
               </span>
               <span 
                onClick={handleCopyId}
                title="Click to copy reference"
                style={{ 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  color: copied ? '#06B68A' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'copy',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
              >
                {booking.booking_reference}
                {copied ? <Check size={10} /> : <Copy size={10} style={{ opacity: 0.5 }} />}
              </span>
            </div>
            
            <div onClick={onOpenClient} style={{ cursor: 'pointer' }}>
               <h3 className="hover-link" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clientDisplayName}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>{booking.client?.phone || 'N/A'}</span>
                <span>•</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.client?.email || 'N/A'}</span>
              </div>
            </div>
            {(booking.latest_handoff_remark || booking.details_json?.status_remark) && (
              <div style={{ 
                marginTop: '4px',
                fontSize: '11px',
                color: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.05)',
                padding: '4px 8px',
                borderRadius: '6px',
                borderLeft: '2px solid #8b5cf6',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }} title={booking.latest_handoff_remark || booking.details_json?.status_remark}>
                <strong>Note:</strong> {booking.latest_handoff_remark || booking.details_json?.status_remark}
              </div>
            )}
          </div>

          {/* Group 2: Travel Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>
              <Calendar size={14} style={{ color: '#60a5fa' }} />
              <span>{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : 'N/A'}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '12px' }}>({getTravelerCount(booking)} Pax)</span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {booking.services?.map((service, si) => {
                const ServiceIcon = getServiceIcon(service.serviceable_type);
                return (
                  <div key={si} title={service.detail || service.type} style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ServiceIcon size={12} style={{ color: '#8b5cf6' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {service.detail ? service.detail.split(' ')[0] : service.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 3: Assigned To */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Creator</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{createdByName}</span>
            </div>
            {wasReassigned && currentAssignee !== createdByName && (
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)', paddingTop: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase' }}>Current Agent</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{currentAssignee}</span>
              </div>
            )}
          </div>

          {/* Group 4: Status / Amount */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(booking.total_amount) || 0)}
            </div>
            {statusBadge}
          </div>

          {/* Group 5: Actions */}
          <div
            style={{
              paddingLeft: '8px',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
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
                onClick={() => onReassign(booking.id)}
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
