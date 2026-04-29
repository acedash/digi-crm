import { CheckCircle2, Clock, XCircle, FileText, CreditCard } from 'lucide-react';

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
  'Awaiting Cards': { icon: CreditCard, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', shadow: 'rgba(245, 158, 11, 0.2)' }
};

export const getStatusLabel = (status) => {
  switch (status) {
    case 'Pending':
      return 'Email Send Pending';
    case 'Awaiting Approval':
      return 'Pending Approval';
    case 'Approved':
      return 'Initial Approval By Client';
    case 'Completed':
      return 'Work Completed';
    case 'Awaiting Cards':
      return 'Pending Card Details';
    case 'Change Approved':
      return 'Change Approved';
    case 'Awaiting Change Approval':
      return 'Awaiting Change Approval';
    default:
      return status;
  }
};

export const getAuthorizationTypeLabel = (type) => {
  if (type === 'change_charge') return 'Change Charge Approval';
  return 'Initial Approval By Client';
};
