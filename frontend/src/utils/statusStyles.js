import { CheckCircle2, Clock, XCircle, FileText, CreditCard, Trash2 } from 'lucide-react';

export const statusIcons = {
  'Approved': { icon: CheckCircle2, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)', shadow: 'rgba(6, 182, 138, 0.2)' },
  'Change Approved': { icon: CheckCircle2, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)', shadow: 'rgba(6, 182, 138, 0.2)' },
  'Confirmed': { icon: CheckCircle2, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)', shadow: 'rgba(6, 182, 138, 0.2)' },
  'Work Pending': { icon: Clock, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', shadow: 'rgba(236, 72, 153, 0.2)' },
  'Awaiting Approval': { icon: Clock, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', shadow: 'rgba(139, 92, 246, 0.2)' },
  'Awaiting Change Approval': { icon: Clock, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', shadow: 'rgba(139, 92, 246, 0.2)' },
  'Pending': { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', shadow: 'rgba(245, 158, 11, 0.2)' },
  'Cancelled': { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
  'Rejected': { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
  'Change Rejected': { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
  'Completed': { icon: CheckCircle2, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)', shadow: 'rgba(6, 182, 138, 0.2)' },
  'Work Completed': { icon: CheckCircle2, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)', shadow: 'rgba(6, 182, 138, 0.2)' },
  'Draft': { icon: FileText, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', shadow: 'rgba(148, 163, 184, 0.2)' },
  'Awaiting Cards': { icon: CreditCard, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', shadow: 'rgba(245, 158, 11, 0.2)' },
  'Deleted': { icon: Trash2, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', shadow: 'rgba(148, 163, 184, 0.2)' },
  'Decline': { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' },
  'Charged': { icon: CheckCircle2, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)', shadow: 'rgba(6, 182, 138, 0.2)' },
  'Charged/Captured': { icon: CheckCircle2, color: '#06B68A', bg: 'rgba(6, 182, 138, 0.1)', shadow: 'rgba(6, 182, 138, 0.2)' },

  'Refunded': { icon: XCircle, color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', shadow: 'rgba(248, 113, 113, 0.2)' },
  'Chargeback': { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', shadow: 'rgba(239, 68, 68, 0.2)' }
};



export const getStatusStyle = (status, deleted_at = null) => {
  const lookupStatus = deleted_at ? 'Deleted' : status;
  const config = statusIcons[lookupStatus] || statusIcons['Pending'];
  
  return {
    bg: config.bg,
    text: config.color,
    border: `${config.color}30`,
    shadow: config.shadow,
    icon: config.icon
  };
};
