import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, CreditCard, Lock, CheckCircle2, ChevronRight, Globe, Info } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const PublicCardCollection = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [auth, setAuth] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [cards, setCards] = useState([
    {
      card_holder_name: '',
      card_number: '',
      expiry_month: '',
      expiry_year: '',
      cvv: '',
      billing_address: '',
      amount: '',
      currency: 'USD'
    }
  ]);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const response = await api.get(`/authorize/${token}`);
        const authData = response.data.data;
        setAuth(authData);
        
        if (authData.total_amount > 0) {
          setCards(prev => [{ ...prev[0], amount: authData.total_amount.toString(), currency: authData.currency || 'USD' }]);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Invalid or expired link.');
      } finally {
        setLoading(false);
      }
    };
    fetchAuth();
  }, [token]);

  const handleInputChange = (index, field, value) => {
    const newCards = [...cards];
    let nextValue = value;
    
    if (field === 'card_number') {
      nextValue = value.replace(/\D/g, '').substring(0, 16);
      nextValue = nextValue.match(/.{1,4}/g)?.join(' ') || nextValue;
    } else if (field === 'expiry_month') {
      nextValue = value.replace(/\D/g, '').substring(0, 2);
    } else if (field === 'expiry_year') {
      nextValue = value.replace(/\D/g, '').substring(0, 4);
    } else if (field === 'cvv') {
      nextValue = value.replace(/\D/g, '').substring(0, 4);
    } else if (field === 'amount') {
      nextValue = value.replace(/[^\d.]/g, '');
    }
    
    newCards[index][field] = nextValue;
    setCards(newCards);
  };

  const addCard = () => {
    setCards([...cards, {
      card_holder_name: '',
      card_number: '',
      expiry_month: '',
      expiry_year: '',
      cvv: '',
      billing_address: cards[0]?.billing_address || '', 
      amount: '',
      currency: auth?.currency || 'USD'
    }]);
  };

  const removeCard = (index) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  const totalAllocated = cards.reduce((sum, card) => sum + (parseFloat(card.amount) || 0), 0);
  const remaining = (auth?.total_amount || 0) - totalAllocated;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (auth?.total_amount > 0 && Math.abs(remaining) > 0.01) {
      setError(`Total allocation must match exactly ${auth.currency} ${auth.total_amount.toLocaleString()}. Current total: ${totalAllocated.toLocaleString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      cards: cards.map(c => ({
        ...c,
        card_number: c.card_number.replace(/\D/g, ''),
        expiry_month: c.expiry_month.padStart(2, '0')
      }))
    };

    try {
      await api.post(`/authorize/${token}/submit-card`, payload);
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit card details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid rgba(16, 185, 129, 0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ fontWeight: 600 }}>Establishing Secure Connection...</p>
        </div>
      </div>
    );
  }

  if (error && !auth) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Info size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Link Unavailable</h1>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>{error}</p>
          <p style={{ fontSize: '14px', color: '#64748b' }}>Please contact your booking agent for a new secure link.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '440px', width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '32px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.1)' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
            <CheckCircle2 size={40} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '16px' }}>Security Verified</h1>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: '32px' }}>
            Your card details have been securely encrypted and transmitted. Your agent can now proceed with your deductions as specified.
          </p>
          <div style={{ paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
             <p style={{ fontSize: '14px', color: '#64748b' }}>You can safely close this window.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark" style={{ 
      minHeight: '100vh', backgroundColor: '#020617', color: '#e2e8f0', 
      fontFamily: "'Outfit', sans-serif", position: 'relative', overflowX: 'hidden'
    }}>

      {/* Background Decor */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '50%', filter: 'blur(120px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '30%', height: '30%', backgroundColor: 'rgba(6, 182, 138, 0.05)', borderRadius: '50%', filter: 'blur(120px)' }}></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto', padding: '60px 24px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '9999px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>
                <Lock size={12} strokeWidth={3} />
                Multi-Card Secure Portal
            </div>
            <h1 style={{ fontSize: '40px', fontWeight: 900, color: 'white', marginBottom: '16px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Secure Card <span style={{ background: 'linear-gradient(to right, #6ee7b7, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Verification</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '17px', fontWeight: 500, lineHeight: 1.6 }}>
                Welcome, <span style={{ color: 'white', fontWeight: 600 }}>{auth?.client?.first_name}</span>. Please authorize the cards you wish to use for this transaction.
            </p>
        </div>

        {/* Amount Tracker Block */}
        {auth?.total_amount > 0 && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '24px', padding: '20px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Amount Requested</p>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>{auth.currency} {auth.total_amount.toLocaleString()}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', fontWeight: 800, color: Math.abs(remaining) < 0.01 ? '#10b981' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  {remaining > 0 ? 'Remaining to Allocate' : remaining < 0 ? 'Exceeds Total By' : 'All Allocated'}
                </p>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: Math.abs(remaining) < 0.01 ? '#10b981' : '#f87171' }}>
                  {auth.currency} {Math.abs(remaining).toLocaleString()}
                </h3>
              </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '32px' }}>
          {cards.map((card, index) => (
            <div key={index} style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '32px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }}>
                {cards.length > 1 && (
                  <button type="button" onClick={() => removeCard(index)} style={{ position: 'absolute', top: '24px', right: '24px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'none', borderRadius: '12px', padding: '8px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
                    REMOVE
                  </button>
                )}
                
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: '#10b981', color: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{index + 1}</div>
                  Card Details
                </h3>

                <div style={{ display: 'grid', gap: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <Input label="Holder Name" placeholder="Full name" value={card.card_holder_name} onChange={(e) => handleInputChange(index, 'card_holder_name', e.target.value)} required style={{ marginBottom: '0' }} />
                      <Input label="Deduction Amount" placeholder="0.00" value={card.amount} onChange={(e) => handleInputChange(index, 'amount', e.target.value)} required style={{ marginBottom: '0' }} />
                    </div>

                    <Input label="Card Number" placeholder="0000 0000 0000 0000" value={card.card_number} onChange={(e) => handleInputChange(index, 'card_number', e.target.value)} required icon={CreditCard} style={{ marginBottom: '0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <Input label="Expiry (MM)" placeholder="MM" value={card.expiry_month} onChange={(e) => handleInputChange(index, 'expiry_month', e.target.value)} maxLength={2} required style={{ marginBottom: '0' }} />
                        <Input label="Year (YYYY)" placeholder="YYYY" value={card.expiry_year} onChange={(e) => handleInputChange(index, 'expiry_year', e.target.value)} maxLength={4} required style={{ marginBottom: '0' }} />
                        <Input label="CVV" placeholder="123" type="password" value={card.cvv} onChange={(e) => handleInputChange(index, 'cvv', e.target.value)} maxLength={4} required icon={ShieldCheck} style={{ marginBottom: '0' }} />
                    </div>

                    <div style={{ marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}><Globe size={14} /> Billing Address</label>
                        <textarea 
                          style={{ 
                            width: '100%', 
                            backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                            borderRadius: '16px', 
                            padding: '16px', 
                            color: '#f8fafc', 
                            fontSize: '13px', 
                            minHeight: '100px', 
                            outline: 'none', 
                            transition: 'all 0.2s',
                            lineHeight: '1.6'
                          }} 
                          placeholder="Please enter the registered billing address for this card..." 
                          value={card.billing_address} 
                          onChange={(e) => handleInputChange(index, 'billing_address', e.target.value)} 
                          onFocus={(e) => {
                            e.target.style.borderColor = '#10b981';
                            e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
                          }} 
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                          }} 
                        />

                    </div>
                </div>
            </div>
          ))}

          <button type="button" onClick={addCard} style={{ width: '100%', padding: '20px', border: '2px dashed rgba(255, 255, 255, 0.1)', borderRadius: '24px', backgroundColor: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
            + Add Another Card for Partial Payment
          </button>

          <div style={{ marginTop: '24px' }}>
            {error && (
              <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '13px', display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <p>{error}</p>
              </div>
            )}

            <button type="submit" disabled={submitting} style={{ width: '100%', height: '64px', background: 'linear-gradient(to bottom right, #10b981, #059669)', color: 'white', fontSize: '16px', fontWeight: 800, borderRadius: '20px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 30px -5px rgba(16, 185, 129, 0.4)', transition: 'transform 0.2s' }} onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              {submitting ? (
                <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              ) : (
                <>
                  <Lock size={20} />
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Securely Submit {cards.length} Card{cards.length > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '20px' }}>Protected by 256-bit SSL encryption. Your full data is never stored locally.</p>
          </div>
        </form>

        <footer style={{ marginTop: '64px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', opacity: 0.3, filter: 'grayscale(1)' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" style={{ height: '14px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" style={{ height: '22px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png" alt="Amex" style={{ height: '22px' }} />
            </div>
            <p style={{ marginTop: '32px', fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em' }}>Secure Payment Shield by Digi CRM</p>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
    </div>
  );
};

export default PublicCardCollection;
