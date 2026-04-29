import React, { useState, useEffect, useCallback } from 'react';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, CheckCircle2, History, Megaphone, Briefcase, Download, MoreHorizontal, FileText, Table, Phone, Mail, FileJson } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import callLogService from './callLogService';
import clientService from '../clients/clientService';
import sensitiveAuditService from '../../services/sensitiveAuditService';
import ExportDropdown from '../../components/ui/ExportDropdown';

const CallLoggingPage = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState([]);
  const [toast, setToast] = useState(null);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [formData, setFormData] = useState({
    log_scope: 'general',
    client_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    lead_source: '',
    call_type: ['Flight'],
    airline_inquiry: {},
    customer_outcome: 'Inquiry only',
    notes: '',
    callback_required: false,
    callback_datetime: ''
  });

  const callTypes = ['Flight', 'Hotel', 'Cruise', 'Car Rental', 'General Details'];
  const outcomes = [
    'Booking created',
    'Inquiry only',
    'Follow up required',
    'Call dropped'
  ];

  const fetchLogs = useCallback(async () => {
    try {
      const response = await callLogService.getCallLogs(1, scopeFilter);
      const raw = response.data?.data;
      // Handle both paginated { data: [...] } and plain array responses
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setLogs(list);
    } catch (e) { console.error(e); }
  }, [scopeFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientService.getClients();
      const raw = response.data?.data;
      // Handle both paginated { data: [...] } and plain array responses
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setClients(list);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchClients();
  }, [fetchClients, fetchLogs]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
        call_type: ['Flight'],
        airline_inquiry: {},
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

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const response = await callLogService.exportCallLogs(scopeFilter);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const scopeLabel = scopeFilter === 'all' ? 'all' : scopeFilter;
      link.href = url;
      link.setAttribute('download', `call-logs-${scopeLabel}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: 'CSV exported successfully!', type: 'success' });
    } catch {
      setToast({ message: 'Failed to export CSV', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const data = logs.map(log => ({
        Date: new Date(log.created_at).toLocaleString(),
        Scope: log.log_scope === 'general' ? 'Marketing' : 'Booking',
        Client: log.client ? `${log.client.first_name} ${log.client.last_name}` : log.contact_name,
        Phone: log.contact_phone || log.client?.phone || '',
        Email: log.contact_email || log.client?.email || '',
        Types: (log.call_type || []).join(', '),
        'Category Details': typeof log.airline_inquiry === 'object' ? Object.entries(log.airline_inquiry).map(([k,v]) => `${k}: ${v}`).join(' | ') : log.airline_inquiry,
        Outcome: log.customer_outcome,
        Notes: log.notes
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Call Logs");
      XLSX.writeFile(wb, `call-logs-${scopeFilter}-${new Date().toISOString().split('T')[0]}.xlsx`);
      setToast({ message: 'Excel exported successfully!', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to export Excel', type: 'error' });
    } finally {
      setShowExportOptions(false);
    }
  };

  const handleExportPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Call Logging Activity Report", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Scope: ${scopeFilter.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      const tableRows = logs.map(log => [
        new Date(log.created_at).toLocaleDateString(),
        log.client ? `${log.client.first_name} ${log.client.last_name}` : (log.contact_name || 'Unknown'),
        (Array.isArray(log.call_type) ? log.call_type : [log.call_type]).join(', '),
        log.customer_outcome,
        log.notes || ''
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Date', 'Contact', 'Categories', 'Outcome', 'Notes']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }, // Use RGB for consistency
        styles: { fontSize: 8 }
      });

      doc.save(`call-logs-${scopeFilter}-${new Date().toISOString().split('T')[0]}.pdf`);
      setToast({ message: 'PDF exported successfully!', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to export PDF', type: 'error' });
    } finally {
      setShowExportOptions(false);
    }
  };
  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
      const dt = document.createElement('a');
      const scopeLabel = scopeFilter === 'all' ? 'all' : scopeFilter;
      dt.setAttribute("href", dataStr);
      dt.setAttribute("download", `call-logs-${scopeLabel}-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(dt);
      dt.click();
      dt.remove();
      setToast({ message: 'JSON exported successfully!', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Failed to export JSON', type: 'error' });
    } finally {
      setShowExportOptions(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Call <span className="premium-gradient-text">Logging</span></h1>
          
          <ExportDropdown
            isExporting={exporting}
            options={[
              { label: 'As PDF Report', icon: FileText, onClick: handleExportPdf },
              { label: 'As Excel Data', icon: Table, onClick: handleExportExcel },
              { label: 'As CSV Format', icon: FileText, onClick: handleExportCsv },
              { label: 'As Raw JSON', icon: FileJson, onClick: handleExportJson },
            ]}
          />
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
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
                    background: log.call_type?.includes('Inbound') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(6, 182, 138, 0.1)',
                    color: log.call_type?.includes('Inbound') ? '#22c55e' : '#06B68A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px'
                  }}>
                    {log.call_type?.includes('Inbound') ? <PhoneIncoming size={18} /> : <PhoneOutgoing size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px' }}>
                        {log.client
                          ? `${log.client.first_name || ''} ${log.client.last_name || ''}`.trim() || log.client.name
                          : log.contact_name || log.contact_email || log.contact_phone || 'Unknown Caller'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                      {(Array.isArray(log.call_type) ? log.call_type : [log.call_type]).map(t => (
                        <span key={t} style={{ 
                          fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', 
                          background: t === 'Flight' ? 'rgba(6, 182, 138, 0.1)' : 
                                      t === 'Hotel' ? 'rgba(139, 92, 246, 0.1)' : 
                                      t === 'Cruise' ? 'rgba(236, 72, 153, 0.1)' :
                                      t === 'Car Rental' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                          color: t === 'Flight' ? '#06B68A' : 
                                 t === 'Hotel' ? '#8b5cf6' : 
                                 t === 'Cruise' ? '#ec4899' :
                                 t === 'Car Rental' ? '#f59e0b' : 'var(--text-muted)',
                          border: `1px solid currentColor`, textTransform: 'uppercase'
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {(log.contact_phone || log.client?.phone) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '4px 10px', borderRadius: '8px' }}>
                          <Phone size={12} style={{ color: 'hsl(var(--primary))' }} />
                          <span style={{ color: 'var(--text-main)' }}>{log.contact_phone || log.client?.phone}</span>
                        </div>
                      )}
                      {(log.contact_email || log.client?.email) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-app)', padding: '4px 10px', borderRadius: '8px' }}>
                          <Mail size={12} style={{ color: 'hsl(var(--primary))' }} />
                          <span style={{ color: 'var(--text-main)' }}>{log.contact_email || log.client?.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Inquiry Details Upfront */}
                    {typeof log.airline_inquiry === 'object' && log.airline_inquiry !== null && Object.keys(log.airline_inquiry).length > 0 && (
                      <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.entries(log.airline_inquiry).map(([cat, detail]) => detail && (
                          <div key={cat} style={{ fontSize: '12px', background: 'var(--bg-app)', padding: '6px 12px', borderRadius: '8px', borderLeft: '3px solid hsl(var(--primary))' }}>
                            <span style={{ fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '10px', textTransform: 'uppercase', marginRight: '8px' }}>{cat}:</span>
                            <span style={{ color: 'var(--text-main)' }}>{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notes Upfront */}
                    {log.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', marginBottom: '10px' }}>
                        "{log.notes}"
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: log.log_scope === 'general' ? '#ec4899' : '#8b5cf6' }}>
                        {log.log_scope === 'general' ? 'MARKETING' : 'BOOKING'}
                      </span>
                      <span>•</span>
                      <span>{log.customer_outcome}</span>
                      {log.agent && (
                        <>
                          <span>•</span>
                          <span>By {log.agent.name}</span>
                        </>
                      )}
                    </div>

                    {/* Callback Action Bar */}
                    {log.callback_required && (
                      <div style={{ 
                        marginTop: '12px', padding: '10px', borderRadius: '12px', 
                        background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.3)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '6px', fontWeight: 900 }}>CALLBACK</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                               {log.contact_phone || log.client?.phone || 'No phone'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                               Scheduled: {log.callback_datetime ? new Date(log.callback_datetime).toLocaleString() : 'Not set'}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const num = log.contact_phone || log.client?.phone;
                            if (num) {
                              navigator.clipboard.writeText(num);
                              setToast({ message: 'Number copied!', type: 'success' });
                            }
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', background: 'white', color: '#1e293b', 
                            border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          Copy Number
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
                {Array.isArray(clients) && clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
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
              {callTypes.map(t => {
                const isSelected = formData.call_type.includes(t);
                return (
                  <button 
                    key={t}
                    type="button"
                    onClick={() => {
                        const newTypes = isSelected 
                          ? formData.call_type.filter(x => x !== t)
                          : [...formData.call_type, t];
                        setFormData({ ...formData, call_type: newTypes.length > 0 ? newTypes : ['General Details'] });
                    }}
                    style={{
                      padding: '8px 12px', borderRadius: '10px', border: '1px solid',
                      borderColor: isSelected ? 'hsl(var(--primary))' : 'var(--border-color)',
                      background: isSelected ? 'hsla(var(--primary), 0.1)' : 'transparent',
                      color: isSelected ? 'hsl(var(--primary))' : 'var(--text-muted)',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {formData.call_type.length > 0 && formData.call_type.map(t => (
              <div key={t} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: 'hsl(var(--primary))', textTransform: 'uppercase' }}>{t} Name</label>
                <input 
                  type="text"
                  placeholder={`Details for ${t.toLowerCase()}...`}
                  value={formData.airline_inquiry[t] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    airline_inquiry: { ...formData.airline_inquiry, [t]: e.target.value }
                  })}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
            ))}

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

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#22c55e' : '#ef4444', color: 'white',
          padding: '12px 24px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 9999
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default CallLoggingPage;
