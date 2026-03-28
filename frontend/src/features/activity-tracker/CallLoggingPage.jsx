import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, MessageSquare, CheckCircle2, History, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import callLogService from './callLogService';
import clientService from '../clients/clientService';

const CallLoggingPage = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    call_type: 'Flight',
    airline_inquiry: '',
    customer_outcome: 'Inquiry only',
    notes: '',
    callback_required: false
  });

  const callTypes = ['Flight', 'Hotel', 'Cruise', 'General Inquiry'];
  const outcomes = [
    'Booking created',
    'Inquiry only',
    'Follow up required',
    'Call dropped'
  ];

  useEffect(() => {
    fetchLogs();
    fetchClients();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await callLogService.getCallLogs();
      setLogs(response.data.data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchClients = async () => {
    try {
      const response = await clientService.getClients();
      setClients(response.data.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await callLogService.logCall(formData);
      setFormData({
        client_id: '',
        call_type: 'Inbound',
        airline_inquiry: '',
        customer_outcome: 'Inquiry',
        notes: '',
        callback_required: false
      });
      fetchLogs();
    } catch (e) {
      alert('Failed to log call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Call <span className="premium-gradient-text">Logging</span></h1>
        
        <Card title="Recent Activity" icon={History}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={i} style={{ 
                padding: '16px', 
                background: 'var(--bg-input)', 
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '12px', 
                    background: log.call_type === 'Inbound' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: log.call_type === 'Inbound' ? '#22c55e' : '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {log.call_type === 'Inbound' ? <PhoneIncoming size={18} /> : <PhoneOutgoing size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{log.client ? `${log.client.first_name} ${log.client.last_name}` : 'Unknown Caller'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.customer_outcome} • {new Date(log.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {log.callback_required && (
                  <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>CALLBACK</span>
                )}
              </div>
            )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No recent call logs found.</p>}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card title="New Log entry" icon={PhoneCall}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Client</label>
              <select 
                value={formData.client_id}
                onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="">Select Client (Optional)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {callTypes.map(t => (
                <button 
                  key={t}
                  type="button"
                  onClick={() => setFormData({...formData, call_type: t})}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', border: '1px solid',
                    borderColor: formData.call_type === t ? 'hsl(var(--primary))' : 'var(--border-color)',
                    background: formData.call_type === t ? 'hsla(var(--primary), 0.1)' : 'transparent',
                    color: formData.call_type === t ? 'hsl(var(--primary))' : 'var(--text-muted)',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {formData.call_type === 'Flight' && (
              <Input 
                label="Airline Inquiry" 
                placeholder="e.g. Emirates flight status" 
                value={formData.airline_inquiry} 
                onChange={(e) => setFormData({...formData, airline_inquiry: e.target.value})}
              />
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Outcome</label>
              <select 
                value={formData.customer_outcome}
                onChange={(e) => setFormData({...formData, customer_outcome: e.target.value})}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
              >
                {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <textarea 
              placeholder="Detailed notes..." 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              style={{ width: '100%', height: '100px', padding: '16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none', resize: 'none' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={formData.callback_required} onChange={(e) => setFormData({...formData, callback_required: e.target.checked})} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Follow-up required</span>
            </label>

            <Button variant="primary" fullWidth isLoading={loading} type="submit" icon={CheckCircle2}>Save Log Entry</Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CallLoggingPage;
