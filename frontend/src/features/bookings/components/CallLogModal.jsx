import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle, PhoneCall, CheckCircle2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import api from '../../../services/api';

const CallLogModal = ({ client, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    call_type: ['Flight'],
    airline_inquiry: {},
    customer_outcome: 'Inquiry only',
    notes: '',
    callback_required: false,
    callback_datetime: ''
  });

  const callTypes = ['Flight', 'Hotel', 'Cruise', 'Car Rental', 'General Inquiry'];
  const outcomes = [
    'Booking created',
    'Inquiry only',
    'Follow up required',
    'Call dropped'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/call-logs', {
        ...formData,
        callback_required: formData.customer_outcome === 'Follow up required',
        client_id: client?.id,
        log_scope: 'booking',
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to log call:', error);
      alert('Failed to log call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px'
    }}>
      <div
        className="glass-panel"
        style={{ 
          width: '100%', maxWidth: '450px', borderRadius: '24px', 
          background: 'var(--bg-card)', padding: '24px', border: '1px solid var(--border-color)' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '10px', color: '#60a5fa' }}>
              <PhoneCall size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Log Call</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <XCircle size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Recording call for <strong>{client?.name || 'Client'}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Call Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {callTypes.map(type => {
                const isSelected = formData.call_type.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const newTypes = isSelected 
                        ? formData.call_type.filter(t => t !== type)
                        : [...formData.call_type, type];
                      // Ensure at least one is selected or handle empty
                      setFormData({ ...formData, call_type: newTypes.length > 0 ? newTypes : ['General Inquiry'] });
                    }}
                    style={{
                      padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                      border: '1px solid',
                      borderColor: isSelected ? '#60a5fa' : 'var(--border-color)',
                      background: isSelected ? 'rgba(96, 165, 250, 0.1)' : 'var(--bg-input)',
                      color: isSelected ? '#60a5fa' : 'var(--text-main)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {formData.call_type.length > 0 && formData.call_type.map(type => (
            <motion.div key={type} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#60a5fa', marginBottom: '6px', textTransform: 'uppercase' }}>
                {type} Inquiry
              </label>
              <input 
                type="text"
                placeholder={`Specifics for ${type.toLowerCase()}...`}
                value={formData.airline_inquiry[type] || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  airline_inquiry: { ...formData.airline_inquiry, [type]: e.target.value } 
                })}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px',
                  background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                  color: 'var(--text-main)', outline: 'none'
                }}
              />
            </motion.div>
          ))}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Call Outcome</label>
            <select 
              value={formData.customer_outcome}
              onChange={(e) => setFormData({ ...formData, customer_outcome: e.target.value })}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', outline: 'none'
              }}
            >
              {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Notes (Optional)</label>
            <textarea 
              placeholder="Quick notes about the call..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%', height: '80px', padding: '12px', borderRadius: '12px',
                background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', outline: 'none', resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {formData.customer_outcome === 'Follow up required' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Scheduled Callback Time</label>
                <input 
                  type="datetime-local"
                  value={formData.callback_datetime || ''}
                  onChange={(e) => setFormData({ ...formData, callback_datetime: e.target.value })}
                  required
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                    color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </motion.div>
            )}
          </div>

          <div style={{ marginTop: '16px' }}>
            <Button 
              variant="primary" 
              fullWidth 
              type="submit" 
              isLoading={loading}
              icon={CheckCircle2}
            >
              Save Call Log
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};



export default CallLogModal;
