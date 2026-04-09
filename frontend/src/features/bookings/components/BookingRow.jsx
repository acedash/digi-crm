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
  ArrowUpRight,
  Car,
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
  return Package;
};

function ActionChip({ icon: Icon, label, onClick, tone = 'default', title, disabled = false }) {
  const styles = actionPalette[tone] || actionPalette.default;

  return (
    <button
      title={title || label}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: 'auto',
        padding: '8px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...styles,
      }}
    >
      {React.createElement(Icon, { size: 13 })}
      <span>{label}</span>
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
  onEdit,
  onDelete,
}) => {
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
            gridTemplateColumns: 'minmax(280px, 1.8fr) minmax(150px, 0.9fr) minmax(160px, 1fr) minmax(180px, 1fr) minmax(260px, 1.4fr)',
            alignItems: 'center',
            padding: '18px',
            gap: '16px',
          }}
        >
          <div onClick={onOpenClient} style={{ cursor: 'pointer', minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(96, 165, 250, 0.1)',
                  color: '#60a5fa',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(96, 165, 250, 0.2)',
                }}
              >
                {booking.booking_reference}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {booking.services?.map((service, serviceIndex) => {
                  const ServiceIcon = getServiceIcon(service.serviceable_type);
                  return (
                    <div
                      key={serviceIndex}
                      title={service.serviceable_type.split('\\').pop()}
                      style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                    >
                      <ServiceIcon size={14} />
                    </div>
                  );
                })}
              </div>
            </div>

            <h3
              className="hover-link"
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-main, white)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {clientDisplayName}
              <ArrowUpRight size={14} style={{ opacity: 0.5 }} className="link-icon" />
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} style={{ color: '#60a5fa' }} /> {booking.client?.phone || 'No Phone'}
              </span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>{getTravelerCount(booking)} travelers</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main, white)', fontWeight: 600 }}>
              <Calendar size={16} style={{ color: '#60a5fa' }} />
              {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {booking.services?.map((service) => service.serviceable_type.split('\\').pop()).join(', ') || 'No services'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-main, white)', fontWeight: 600 }}>
              <UserPlus size={14} style={{ color: '#60a5fa' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentAssignee}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Created by {createdByName}
            </span>
            <span style={{ fontSize: '12px', color: wasReassigned ? '#f59e0b' : 'var(--text-muted)' }}>
              {wasReassigned ? `Reassigned to ${currentAssignee}` : 'Not reassigned'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '0' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main, white)', letterSpacing: '-0.5px' }}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: booking.currency || 'USD',
              }).format(Number(booking.total_amount) || 0)}
            </div>
            {statusBadge}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '180px', lineHeight: 1.5 }}>
              {statusGuidance}
            </p>
            {latestHandoffRemark ? (
              <div
                title={latestHandoffRemark}
                style={{
                  marginTop: '4px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.18)',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  color: '#fbbf24',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '2px' }}>Handoff Note</strong>
                <span>
                  {latestHandoffRemark.length > 100 ? `${latestHandoffRemark.slice(0, 100)}...` : latestHandoffRemark}
                </span>
              </div>
            ) : null}
          </div>

          <div
            style={{
              paddingLeft: '16px',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <ActionChip
              icon={Mail}
              label={isSendingApproval ? 'Sending...' : approvalActionLabel}
              onClick={onSendApproval}
              tone="primary"
              title="Email payment approval link to client"
              disabled={isSendingApproval}
            />
            <ActionChip
              icon={RefreshCw}
              label={isSendingFlightChange ? 'Sending...' : 'Track Change'}
              onClick={onSendFlightChange}
              tone="info"
              title="Open the edit flow to record a service change and send the flight change email if needed"
              disabled={isSendingFlightChange}
            />
            <ActionChip
              icon={CreditCard}
              label={isSendingFutureCredit ? 'Sending...' : 'Future Credit'}
              onClick={onSendFutureCredit}
              tone="warning"
              title="Cancel the booking and email a future credit update"
              disabled={isSendingFutureCredit}
            />
            <ActionChip
              icon={XCircle}
              label={isSendingRefund ? 'Sending...' : 'Refund'}
              onClick={onSendRefund}
              tone="danger"
              title="Cancel the booking and email a refund update"
              disabled={isSendingRefund}
            />
            <ActionChip
              icon={ShieldCheck}
              label="Proof"
              onClick={onOpenProof}
              tone="info"
              title="Open consent proof and approval evidence"
            />
            <ActionChip
              icon={Eye}
              label="View"
              onClick={onView}
              tone="info"
              title="Open full booking details"
            />
            <ActionChip
              icon={PhoneCall}
              label="Call"
              onClick={onCall}
              tone="success"
              title="Create a call log for this booking"
            />
            {canReassign ? (
              <ActionChip
                icon={ArrowRightLeft}
                label="Reassign"
                onClick={onReassign}
                tone="warning"
                title="Transfer this booking to another user"
              />
            ) : null}
            <ActionChip
              icon={Pencil}
              label="Edit"
              onClick={onEdit}
              tone="default"
              title="Edit booking data"
            />
            <ActionChip
              icon={Trash2}
              label="Delete"
              onClick={onDelete}
              tone="danger"
              title="Delete this booking permanently"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(BookingRow);
