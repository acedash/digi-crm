import React from 'react';
import { Save } from 'lucide-react';
import Button from '../../../components/ui/Button';

const BookingFooter = ({ calculateTotal, totalAllocated, handleSubmit, loading }) => {
  const grandTotal = calculateTotal();
  const isBalanced = Math.abs(totalAllocated - grandTotal) < 0.01;

  return (
    <div style={{ 
      position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', 
      padding: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', zIndex: 100
    }}>
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '48px' }}>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Grand Total</p>
            <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)' }}>USD {grandTotal.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Allocated</p>
            <p style={{ 
              fontSize: '28px', fontWeight: 900, 
              color: isBalanced ? '#4ade80' : '#f87171' 
            }}>
              USD {totalAllocated.toFixed(2)}
            </p>
          </div>
        </div>
        <Button 
          variant="primary" 
          size="lg" 
          onClick={handleSubmit}
          isLoading={loading}
          icon={Save}
        >
          Save Booking
        </Button>
      </div>
    </div>
  );
};

export default BookingFooter;
