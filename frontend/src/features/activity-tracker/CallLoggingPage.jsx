import React, { useState, useEffect, useCallback } from 'react';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, CheckCircle2, History, Megaphone, Briefcase, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import callLogService from './callLogService';
import clientService from '../clients/clientService';
import sensitiveAuditService from '../../services/sensitiveAuditService';

const CallLoggingPage = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [formData, setFormData] = useState({
    log_scope: 'general',
    client_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    lead_source: '',
    call_type: 'Flight',
    airline_inquiry: '',
    customer_outcome: 'Inquiry only',
    notes: '',
    callback_required: false,
    callback_datetime: ''
  });

  const callTypes = ['Flight', 'Hotel', 'Cruise', 'General Inquiry'];
  const outcomes = [
    'Booking created',
    'Inquiry only',
    'Follow up required',
    'Call dropped'
  ];

  const fetchLogs = useCallback(async () => {
    try {
      const response = await callLogService.getCallLogs(1, scopeFilter);
      setLogs(response.data.data.data || []);
    } catch (e) { console.error(e); }
  }, [scopeFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientService.getClients();
      setClients(response.data.data.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchClients();
  }, [fetchClients, fetchLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await callLogService.logCall(formData);
      setFormData({
        log_scope: 'general',
        client_id: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        lead_source: '',
        call_type: 'Flight',
        airline_inquiry: '',
        customer_outcome: 'Inquiry only',
        notes: '',
        callback_required: false,
        callback_datetime: ''
      });
      fetchLogs();
    } catch {
      alert('Failed to log call');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await callLogService.exportCallLogs(scopeFilter);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const scopeLabel = scopeFilter === 'all' ? 'all' : scopeFilter;
      link.href = url;
      link.setAttribute('download', `call-logs-${scopeLabel}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      sensitiveAuditService.logEvent({
        event_type: 'Sensitive Export',
        module: 'Call Logs',
        description: 'Exported call logs CSV',
        details: {
          scope: scopeFilter,
        },
      }).catch(() => {});
    } catch {
      alert('Failed to export call logs');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Call <span className="premium-gradient-text">Logging</span></h1>
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExport}
            isLoading={exporting}
          >
            Export CSV
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'All Calls' },
            { value: 'booking', label: 'Booking Calls' },
            { value: 'general', label: 'Marketing Calls' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScopeFilter(option.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                background: scopeFilter === option.value ? 'hsl(var(--primary))' : 'var(--bg-card)',
                color: scopeFilter === option.value ? 'white' : 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        
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
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      {log.client
                        ? `${log.client.first_name || ''} ${log.client.last_name || ''}`.trim() || log.client.name
                        : log.contact_name || log.contact_email || log.contact_phone || 'Unknown Caller'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {log.log_scope === 'general' ? 'Marketing Call' : 'Booking Call'} • {log.customer_outcome} • {new Date(log.created_at).toLocaleString()}
                    </div>
                    {log.log_scope === 'general' && (log.contact_email || log.contact_phone || log.lead_source) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {[log.contact_email, log.contact_phone, log.lead_source].filter(Boolean).join(' • ')}
                      </div>
                    )}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { value: 'general', label: 'General Marketing', icon: Megaphone },
                { value: 'booking', label: 'Booking / CRM', icon: Briefcase },
              ].map((option) => {
                const Icon = option.icon;
                const selected = formData.log_scope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({
                      ...prev,
                      log_scope: option.value,
                      client_id: option.value === 'general' ? '' : prev.client_id,
                    }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: selected ? 'hsl(var(--primary))' : 'var(--border-color)',
                      background: selected ? 'hsla(var(--primary), 0.1)' : 'transparent',
                      color: selected ? 'hsl(var(--primary))' : 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {formData.log_scope === 'booking' ? (
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
            ) : (
              <>
                <Input
                  label="Contact Name"
                  placeholder="e.g. John Smith"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
                <Input
                  label="Contact Email"
                  placeholder="e.g. john@example.com"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
                <Input
                  label="Contact Phone"
                  placeholder="e.g. +1 555 123 4567"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
                <Input
                  label="Lead Source"
                  placeholder="e.g. Facebook Ads, Google, Referral"
                  value={formData.lead_source}
                  onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                />
              </>
            )}

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

            {formData.callback_required && (
              <Input
                label="Callback Time"
                type="datetime-local"
                value={formData.callback_datetime}
                onChange={(e) => setFormData({ ...formData, callback_datetime: e.target.value })}
              />
            )}

            <Button variant="primary" fullWidth isLoading={loading} type="submit" icon={CheckCircle2}>Save Log Entry</Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CallLoggingPage;
