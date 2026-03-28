import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Users,
  Phone, 
  Mail, 
  Calendar, 
  Trash2, 
  X, 
  Plus,
  Briefcase,
  MapPin,
  Info,
  Save,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import clientService from './clientService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const ClientForm = ({ client, onClose, onSuccess, isFullPage = false }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Male',
    address: '',
    type: 'Individual',
    passengers: [],
    cards: []
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (client) {
      setFormData({
        first_name: client.first_name || '',
        middle_name: client.middle_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        date_of_birth: client.date_of_birth || '',
        gender: client.gender || 'Male',
        address: client.address || '',
        type: client.type || 'Individual',
        passengers: client.passengers || [],
        cards: client.cards || []
      });
    }
  }, [client]);

  const addPassenger = () => {
    setFormData({
      ...formData,
      passengers: [...formData.passengers, { 
        first_name: '', 
        middle_name: '', 
        last_name: '', 
        date_of_birth: '',
        gender: 'Male'
      }]
    });
  };

  const removePassenger = (index) => {
    const newPassengers = [...formData.passengers];
    newPassengers.splice(index, 1);
    setFormData({ ...formData, passengers: newPassengers });
  };

  const handlePassengerChange = (index, field, value) => {
    const newPassengers = [...formData.passengers];
    newPassengers[index][field] = value;
    setFormData({ ...formData, passengers: newPassengers });
  };

  const addCard = () => {
    setFormData({
      ...formData,
      cards: [...formData.cards, { 
        card_holder_name: '', 
        card_number: '', 
        expiry_month: '', 
        expiry_year: '',
        card_type: 'Visa',
        cvv: '',
        billing_address: '',
        is_primary: formData.cards.length === 0
      }]
    });
  };

  const removeCard = (index) => {
    const newCards = [...formData.cards];
    newCards.splice(index, 1);
    setFormData({ ...formData, cards: newCards });
  };

  const handleCardChange = (index, field, value) => {
    const newCards = [...formData.cards];
    newCards[index][field] = value;
    setFormData({ ...formData, cards: newCards });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic frontend validation for cards
    for (const card of formData.cards) {
      if (!/^\d{1,2}$/.test(card.expiry_month)) {
        setError('Expiry Month must be 1 or 2 digits');
        setLoading(false);
        return;
      }
      if (!/^\d{4}$/.test(card.expiry_year)) {
        setError('Expiry Year must be a 4-digit number');
        setLoading(false);
        return;
      }
      if (parseInt(card.expiry_month) < 1 || parseInt(card.expiry_month) > 12) {
        setError('Expiry Month must be between 01 and 12');
        setLoading(false);
        return;
      }
    }

    // Pre-process data to ensure correct types for backend
    const submissionData = {
      ...formData,
      cards: formData.cards.map(card => ({
        ...card,
        expiry_month: parseInt(card.expiry_month, 10),
        expiry_year: parseInt(card.expiry_year, 10)
      }))
    };

    try {
      if (client) {
        await clientService.updateClient(client.id, submissionData);
      } else {
        await clientService.createClient(submissionData);
      }
      onSuccess();
    } catch (err) {
      if (err.response?.data?.errors) {
        // Handle Laravel validation errors object
        const firstError = Object.values(err.response.data.errors)[0][0];
        setError(firstError);
      } else {
        setError(err.response?.data?.message || 'Failed to save client record');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: 'white',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '6px',
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const FormContent = (
      <motion.div
        initial={isFullPage ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={isFullPage ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2 }}
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '100%',
          minHeight: isFullPage ? 'auto' : 'calc(100vh - 40px)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: isFullPage ? 'rgba(255, 255, 255, 0.02)' : 'var(--bg-card)',
          border: isFullPage ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid var(--border-color)'
        }}
      >
        {/* Modal Header */}
        <div style={{ 
          padding: '18px 24px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', 
              background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700
            }}>
              {step}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                {client ? 'Update Client' : 'New Client'}
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.35)', marginTop: '2px' }}>
                {step === 1 ? 'Step 1: Identity & Travelers' : 'Step 2: Payment Details'}
              </p>
            </div>
          </div>
          {!isFullPage && <Button variant="ghost" icon={X} onClick={onClose} />}
        </div>


        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '32px',
                fontSize: '14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}
            >
              <Info size={18} />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <form id="client-form-step1" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                  {/* Two-column layout */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    
                    {/* Left: Identity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <User size={14} style={{ color: 'hsl(var(--primary))' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Identity</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <Input label="First Name" placeholder="First" value={formData.first_name} 
                          onChange={e => setFormData({...formData, first_name: e.target.value})} required />
                        <Input label="Last Name" placeholder="Last" value={formData.last_name} 
                          onChange={e => setFormData({...formData, last_name: e.target.value})} required />
                      </div>

                      <Input label="Middle Name" placeholder="Middle (optional)" value={formData.middle_name}
                        onChange={e => setFormData({...formData, middle_name: e.target.value})} />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={labelStyle}>Gender</label>
                          <select style={selectStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <Input label="Birthday" type="date" value={formData.date_of_birth}
                          onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                      </div>

                      <div>
                        <label style={labelStyle}>Client Type</label>
                        <select style={selectStyle} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                          <option value="Individual">Individual Traveler</option>
                          <option value="Corporate">Corporate Account</option>
                        </select>
                      </div>
                    </div>

                    {/* Right: Communication */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Phone size={14} style={{ color: 'hsl(var(--primary))' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Communication</span>
                      </div>
                      <Input label="Email" placeholder="name@example.com" icon={Mail} value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})} />
                      <Input label="Phone" placeholder="+1 (555) 000-0000" icon={Phone} value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})} />
                      <Input label="Address" placeholder="City, Country" icon={MapPin} value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                  </div>

                  {/* Passengers Section */}
                  <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} style={{ color: 'hsl(var(--primary))' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Additional Travelers</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>({formData.passengers.length})</span>
                      </div>
                      <Button variant="outline" size="sm" icon={Plus} onClick={addPassenger}>Add</Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AnimatePresence>
                        {formData.passengers.length === 0 ? (
                          <div style={{ 
                            textAlign: 'center', padding: '16px',
                            background: 'rgba(255, 255, 255, 0.02)', 
                            borderRadius: '10px',
                            border: '1px dashed rgba(255, 255, 255, 0.08)',
                            color: 'rgba(255, 255, 255, 0.25)',
                            fontSize: '12px'
                          }}>
                            No additional travelers — click Add to include group members.
                          </div>
                        ) : (
                          formData.passengers.map((p, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}
                            >
                              {/* Row 1: Names */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <Input placeholder="First Name" value={p.first_name} 
                                  onChange={e => handlePassengerChange(index, 'first_name', e.target.value)} 
                                  required style={{ marginBottom: 0 }} />
                                <Input placeholder="Middle" value={p.middle_name || ''} 
                                  onChange={e => handlePassengerChange(index, 'middle_name', e.target.value)} 
                                  style={{ marginBottom: 0 }} />
                                <Input placeholder="Last Name" value={p.last_name} 
                                  onChange={e => handlePassengerChange(index, 'last_name', e.target.value)} 
                                  required style={{ marginBottom: 0 }} />
                              </div>

                              {/* Row 2: Metadata & Actions */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '10px', alignItems: 'flex-end' }}>
                                <div>
                                  <label style={labelStyle}>Date of Birth</label>
                                  <Input type="date" value={p.date_of_birth} 
                                    onChange={e => handlePassengerChange(index, 'date_of_birth', e.target.value)}
                                    style={{ marginBottom: 0 }} />
                                </div>
                                <div>
                                  <label style={labelStyle}>Gender</label>
                                  <select 
                                    value={p.gender || 'Male'} 
                                    onChange={e => handlePassengerChange(index, 'gender', e.target.value)}
                                    style={{...selectStyle, height: '42px'}}
                                  >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => removePassenger(index)} 
                                  style={{ 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    color: '#ef4444', 
                                    border: 'none', 
                                    height: '42px',
                                    width: '42px',
                                    borderRadius: '10px', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <form id="client-form-step2" onSubmit={handleSubmit}>
                  {/* Cards Section */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} style={{ color: 'hsl(var(--primary))' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Payment Methods</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>({formData.cards.length})</span>
                    </div>
                    <Button variant="outline" size="sm" icon={Plus} onClick={addCard}>Add Card</Button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <AnimatePresence>
                      {formData.cards.length === 0 ? (
                        <div style={{ 
                          textAlign: 'center', padding: '32px 16px',
                          background: 'rgba(255, 255, 255, 0.02)', 
                          borderRadius: '16px',
                          border: '1px dashed rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.25)',
                          fontSize: '13px'
                        }}>
                          No cards registered — add a payment method for bookings.
                        </div>
                      ) : (
                        formData.cards.map((card, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: 20 }}
                            style={{ 
                              padding: '16px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: '16px',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '10px' }}>
                              <Input label="Card Holder" placeholder="Name on card" value={card.card_holder_name} 
                                onChange={e => handleCardChange(index, 'card_holder_name', e.target.value)} required />
                              <Input label="Card Number" placeholder="16 Digit Card Number" value={card.card_number} 
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  if (val.length <= 16) handleCardChange(index, 'card_number', val);
                                }} required />
                              <div>
                                <label style={labelStyle}>Card Type</label>
                                <select style={selectStyle} value={card.card_type} onChange={e => handleCardChange(index, 'card_type', e.target.value)}>
                                  <option value="Visa">Visa</option>
                                  <option value="MasterCard">MasterCard</option>
                                  <option value="AMEX">AMEX</option>
                                  <option value="Discover">Discover</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 40px', gap: '10px', alignItems: 'flex-end' }}>
                              <Input label="Exp Month" placeholder="01" value={card.expiry_month} 
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  if (val.length <= 2) handleCardChange(index, 'expiry_month', val);
                                }} required />
                              <Input label="Exp Year" placeholder="2025" value={card.expiry_year} 
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  if (val.length <= 4) handleCardChange(index, 'expiry_year', val);
                                }} required />
                              <Input label="CVV" placeholder="***" type="password" value={card.cvv} 
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  if (val.length <= 4) handleCardChange(index, 'cvv', val);
                                }} />
                              <button 
                                type="button" 
                                onClick={() => removeCard(index)} 
                                style={{ 
                                  background: 'rgba(239, 68, 68, 0.1)', 
                                  color: '#ef4444', 
                                  border: 'none', 
                                  height: '42px',
                                  width: '42px',
                                  borderRadius: '10px', 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <Input label="Billing Address" placeholder="Street, City, Zip (Optional)" value={card.billing_address} 
                              onChange={e => handleCardChange(index, 'billing_address', e.target.value)} />
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div style={{ 
          padding: '14px 24px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          gap: '10px',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <div>
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(1)}>Back to Details</Button>
            )}
            {step === 1 && (
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {step === 1 ? (
              <Button variant="primary" onClick={() => setStep(2)} type="button">
                Next: Payment Details
              </Button>
            ) : (
              <Button variant="primary" form="client-form-step2" type="submit" isLoading={loading} icon={Save}>
                {client ? 'Save Changes' : 'Register Client'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
  );

  if (isFullPage) return FormContent;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '780px' }}>
        {FormContent}
      </div>
    </div>
  );
};

export default ClientForm;
