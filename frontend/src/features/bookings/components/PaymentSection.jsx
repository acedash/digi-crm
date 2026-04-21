import React, { useState } from 'react';
import { CreditCard, Trash2, Plus, CheckCircle2, UserPlus, ShieldCheck, Lock } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import SectionHeader from './SectionHeader';

const CURRENCIES = [
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'CAD', label: 'CAD - Canadian Dollar' },
  { code: 'AUD', label: 'AUD - Australian Dollar' },
  { code: 'AED', label: 'AED - UAE Dirham' },
  { code: 'SAR', label: 'SAR - Saudi Riyal' },
  { code: 'INR', label: 'INR - Indian Rupee' },
  { code: 'PKR', label: 'PKR - Pakistani Rupee' },
  { code: 'PHP', label: 'PHP - Philippine Peso' },
  { code: 'NZD', label: 'NZD - New Zealand Dollar' },
  { code: 'SGD', label: 'SGD - Singapore Dollar' },
  { code: 'HKD', label: 'HKD - Hong Kong Dollar' },
  { code: 'JPY', label: 'JPY - Japanese Yen' },
  { code: 'OMR', label: 'OMR - Omani Rial' },
  { code: 'QAR', label: 'QAR - Qatari Rial' },
  { code: 'KWD', label: 'KWD - Kuwaiti Dinar' },
  { code: 'BHD', label: 'BHD - Bahraini Dinar' },
];

const PaymentSection = ({ 
  paymentCards, 
  setPaymentCards, 
  grandTotal, 
  requestCardOnSave,
  setRequestCardOnSave
}) => {
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
        
        {/* Workflow Toggle */}
        <div style={{ marginBottom: '24px', display: 'flex', background: 'var(--bg-app)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <button 
            type="button"
            onClick={() => setRequestCardOnSave(false)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: !requestCardOnSave ? 'var(--bg-card)' : 'transparent',
              color: !requestCardOnSave ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: !requestCardOnSave ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Add Manually
          </button>
          <button 
            type="button"
            onClick={() => setRequestCardOnSave(true)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: requestCardOnSave ? 'var(--bg-card)' : 'transparent',
              color: requestCardOnSave ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: requestCardOnSave ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Lock size={14} />
            Request from Client
          </button>
        </div>

        {!requestCardOnSave ? (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Total Booking: <strong style={{ color: 'var(--text-main)' }}>${grandTotal}</strong>
              </span>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Total Allocated: <strong style={{ color: Math.abs(totalAllocated - grandTotal) < 0.01 ? '#06B68A' : '#f87171' }}>
                  ${totalAllocated.toFixed(2)}
                </strong>
              </span>
            </div>

            {paymentCards.map((card, index) => (
              <div key={index} style={{ 
                padding: '20px', 
                background: 'var(--bg-card)', 
                borderRadius: '16px', 
                border: '1px solid var(--border-color)',
                marginBottom: '16px',
                position: 'relative',
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '16px', 
                  marginBottom: '16px' 
                }}>
                  <Input 
                    label="Card Holder" required
                    placeholder="Full name as on card"
                    value={card.holder_name || ''} 
                    onChange={e => updatePaymentCard(index, 'holder_name', e.target.value)} 
                    style={{ marginBottom: 0 }}
                  />
                  <Input 
                    label="Card Number" required
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={card.number || ''} 
                    onChange={e => updatePaymentCard(index, 'number', e.target.value)} 
                    style={{ marginBottom: 0 }}
                  />
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr 1.2fr auto', 
                  gap: '16px', 
                  alignItems: 'end' 
                }}>
                  <Input 
                    label="Expiry" required
                    placeholder="MM/YY"
                    value={card.exp || ''} 
                    onChange={e => updatePaymentCard(index, 'exp', e.target.value)} 
                    style={{ marginBottom: 0 }}
                  />
                  <Input 
                    label="CVV" 
                    type="password"
                    placeholder="***"
                    value={card.cvv || ''} 
                    onChange={e => updatePaymentCard(index, 'cvv', e.target.value)} 
                    style={{ marginBottom: 0 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Currency</label>
                    <select
                      value={card.currency || 'USD'}
                      onChange={e => updatePaymentCard(index, 'currency', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 32px 12px 12px',
                        borderRadius: '12px',
                        background: 'var(--bg-input)',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontSize: '14px',
                        outline: 'none',
                        height: '46px',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none'
                      }}
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>{curr.code}</option>
                      ))}
                    </select>
                  </div>
                  <Input 
                    label="Amount" required
                    type="number"
                    value={card.amount ?? ''} 
                    placeholder="0.00"
                    onChange={e => updatePaymentCard(index, 'amount', e.target.value)} 
                    style={{ marginBottom: 0 }}
                  />
                  <Button 
                    variant="ghost" 
                    icon={Trash2} 
                    onClick={() => { const arr = [...paymentCards]; arr.splice(index, 1); setPaymentCards(arr); }}
                    style={{ color: '#ef4444', height: '46px' }}
                    disabled={paymentCards.length === 1}
                  />
                </div>

                <div style={{ marginTop: '14px' }}>
                  <div style={{ color: '#06B68A', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} />
                    Primary Card
                  </div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                    Remarks
                  </label>
                  <textarea
                    value={card.remarks || ''}
                    onChange={(e) => updatePaymentCard(index, 'remarks', e.target.value)}
                    placeholder="Add card-specific notes..."
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
              onClick={() => setPaymentCards([...paymentCards, { holder_name: '', number: '', exp: '', cvv: '', amount: '', remarks: '', currency: 'USD' }])}
              icon={Plus}
            >
              Add Another Card
            </Button>
          </>
        ) : (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            background: 'rgba(16, 185, 129, 0.03)', 
            borderRadius: '20px', 
            border: '2px dashed rgba(16, 185, 129, 0.2)',
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldCheck size={32} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Secure Client Request Enabled</h4>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>
              A unique, encrypted link will be <strong>automatically generated</strong> once you save this booking. 
              You can then copy or email the link to the client from the booking details page.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PaymentSection;
