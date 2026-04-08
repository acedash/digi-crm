import React from 'react';
import { CreditCard, Trash2, Plus } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const PaymentSection = ({ paymentCards, setPaymentCards, grandTotal }) => {
  const totalAllocated = paymentCards.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  
  const updatePaymentCard = (index, field, value) => {
    const updated = [...paymentCards];
    
    if (field === 'exp') {
      let clean = (value || '').replace(/\D/g, '');
      if (clean.length > 2) {
        value = clean.substring(0, 2) + '/' + clean.substring(2, 4);
      } else {
        value = clean;
      }
    }

    if (field === 'number') {
      let clean = (value || '').replace(/\D/g, '');
      if (clean.length > 16) clean = clean.substring(0, 16);
      value = clean.match(/.{1,4}/g)?.join(' ') || clean;
    }

    updated[index][field] = value ?? '';
    setPaymentCards(updated);
  };

  return (
    <Card style={{ padding: 0 }}>
      <SectionHeader icon={CreditCard} title="2. Payment Cards" isActive={true} />
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Total Booking: <strong style={{ color: 'var(--text-main)' }}>${grandTotal}</strong>
          </span>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Total Allocated: <strong style={{ color: Math.abs(totalAllocated - grandTotal) < 0.01 ? '#4ade80' : '#f87171' }}>
              ${totalAllocated.toFixed(2)}
            </strong>
          </span>
        </div>

        {paymentCards.map((card, index) => (
          <div key={index} style={{ 
            padding: '20px', 
            background: 'var(--bg-app)', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)',
            marginBottom: '16px',
            position: 'relative'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <Input 
                label="Holder Name" 
                value={card.holder_name || ''} 
                onChange={e => updatePaymentCard(index, 'holder_name', e.target.value)} 
              />
              <Input 
                label="Card Number" 
                value={card.number || ''} 
                onChange={e => updatePaymentCard(index, 'number', e.target.value)} 
              />
              <Input 
                label="Expiry" 
                placeholder="MM/YY"
                value={card.exp || ''} 
                onChange={e => updatePaymentCard(index, 'exp', e.target.value)} 
              />
              <Input 
                label="CVV" 
                type="password"
                value={card.cvv || ''} 
                onChange={e => updatePaymentCard(index, 'cvv', e.target.value)} 
              />
              <Input 
                label="Debit Amount" 
                type="number"
                value={card.amount ?? ''} 
                placeholder="0.00"
                onChange={e => updatePaymentCard(index, 'amount', e.target.value)} 
              />
              <Button 
                variant="ghost" 
                icon={Trash2} 
                onClick={() => { const arr = [...paymentCards]; arr.splice(index, 1); setPaymentCards(arr); }}
                style={{ color: '#ef4444', height: '42px' }}
                disabled={paymentCards.length === 1}
              />
            </div>

            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                Remarks
              </label>
              <textarea
                value={card.remarks || ''}
                onChange={(e) => updatePaymentCard(index, 'remarks', e.target.value)}
                placeholder="Add card-specific notes, authorization notes, split-payment notes, or internal remarks"
                style={{
                  width: '100%',
                  minHeight: '84px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  color: 'var(--text-main)',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        ))}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setPaymentCards([...paymentCards, { holder_name: '', number: '', exp: '', cvv: '', amount: '', remarks: '' }])}
          icon={Plus}
        >
          + Add Another Card
        </Button>
      </div>
    </Card>
  );
};

export default PaymentSection;
