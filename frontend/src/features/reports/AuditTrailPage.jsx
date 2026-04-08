import React, { useState, useEffect } from 'react';
import { Shield, Clock, Box, ArrowRight, Activity, Download, Search, Globe, Monitor, Eye, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import api from '../../services/api';
import { AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';

const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data?.success) {
        setLogs(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.causer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSource = filterSource === 'all' || log.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const getSourceIcon = (source) => {
    if (source === 'system') return <Box size={14} style={{ color: '#8b5cf6' }} />;
    return <Clock size={14} style={{ color: '#10b981' }} />;
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'short'
    }).format(d);
  };

  const formatFieldLabel = (key) => {
    return key
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatFieldValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Empty';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === 1 || value === '1') return 'Yes';
    if (value === 0 || value === '0') return 'No';
    return String(value);
  };

  const renderChanges = (log) => {
    if (log.source === 'temporal') {
      return (
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
            {log.event_type.replace('Agent Status: ', '')}
          </span>
        </div>
      );
    }

    if (!log.details || Object.keys(log.details).length === 0) {
      return <span style={{ color: 'var(--text-muted)' }}>No notable modifications.</span>;
    }

    if (log.details.old) {
      const changedKeys = Object.keys(log.details)
        .filter(key => key !== 'old')
        .filter(key => String(log.details.old[key] ?? '') !== String(log.details[key] ?? ''));

      if (changedKeys.length === 0) {
        return <span style={{ color: 'var(--text-muted)' }}>No field changes recorded.</span>;
      }

      // It's an update with old & new values
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {changedKeys.map(key => {
            const oldVal = log.details.old[key];
            const newVal = log.details[key];
            return (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr auto 1fr',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatFieldLabel(key)}
                </span>
                <span style={{
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.08)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  wordBreak: 'break-word'
                }}>
                  {formatFieldValue(oldVal)}
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.08)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  wordBreak: 'break-word'
                }}>
                  {formatFieldValue(newVal)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // It's a creation event or flat attributes
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.keys(log.details)
          .filter(key => log.details[key] !== null && log.details[key] !== '') // Filter out null/empty metrics
          .map(key => (
          <div key={key} style={{ 
            background: 'var(--bg-input)', border: '1px solid var(--border-color)', 
            padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-main)',
            display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', alignItems: 'center'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{formatFieldLabel(key)}</span> 
            <span style={{ fontWeight: 600 }}>{formatFieldValue(log.details[key])}</span>
          </div>
        ))}
      </div>
    );
  };

  const getDetailsSummary = (log) => {
    if (log.source === 'temporal') {
      return 'Time tracker event';
    }

    if (!log.details || Object.keys(log.details).length === 0) {
      return 'No notable modifications';
    }

    if (log.details.old) {
      const changedCount = Object.keys(log.details)
        .filter((key) => key !== 'old')
        .filter((key) => String(log.details.old[key] ?? '') !== String(log.details[key] ?? ''))
        .length;

      return changedCount > 0
        ? `${changedCount} field${changedCount === 1 ? '' : 's'} changed`
        : 'No field changes recorded';
    }

    const detailCount = Object.keys(log.details)
      .filter((key) => log.details[key] !== null && log.details[key] !== '')
      .length;

    return detailCount > 0
      ? `${detailCount} detail${detailCount === 1 ? '' : 's'} recorded`
      : 'No notable modifications';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)' }}>
            <Shield size={32} style={{ color: '#8b5cf6' }} />
            System <span className="premium-gradient-text">Audit Trail</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            A unified, human-readable timeline of all team actions and data modifications.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" size="sm" icon={Activity} onClick={fetchLogs} disabled={loading}>
            {loading ? 'Compiling...' : 'Live Sync'}
          </Button>
          <Button variant="primary" size="sm" icon={Download}>Export CSV</Button>
        </div>
      </div>

      <Card style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ padding: '20px 24px', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search by action, user, or module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 48px',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: '12px', color: 'var(--text-main)', fontSize: '14px', outline: 'none'
              }}
            />
          </div>
          
          <select 
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            style={{
              padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: '12px', color: 'var(--text-main)', fontSize: '14px', cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="all">All Ecosystem Events</option>
            <option value="system">Data Mutations (Database)</option>
            <option value="temporal">Agent Time Tracking</option>
          </select>
        </div>

        <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence>
            {loading && logs.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Extracting global telemetry...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No audit logs match your specific criteria.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    background: 'var(--bg-card)',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                  className="hover-brighten"
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1.4fr', gap: '20px', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>
                        Timestamp
                      </div>
                      <div style={{ fontFamily: 'monospace', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.5 }}>
                        {formatDate(log.timestamp)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>
                        Actor Context
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ minWidth: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 800, fontSize: '11px' }}>
                          {log.causer_name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{log.causer_name}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Globe size={12} />
                          <span style={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>{log.ip_address}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <Monitor size={12} style={{ marginTop: '3px', flexShrink: 0 }} />
                          <span style={{ wordBreak: 'break-word', lineHeight: 1.5 }}>{log.user_agent}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>
                        Action
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>{log.event_type}</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: log.source === 'system' ? '#8b5cf6' : '#10b981' }}>
                          {getSourceIcon(log.source)} {log.source === 'temporal' ? 'Time Tracker' : 'Database Event'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px' }}>
                        Details / Changes
                      </div>
                      <div style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600 }}>
                        {getDetailsSummary(log)}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" icon={Eye} onClick={() => setSelectedLog(log)}>
                      Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </AnimatePresence>
        </div>
      </Card>

      <AnimatePresence>
        {selectedLog && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.82)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '24px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '960px',
                maxHeight: '88vh',
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>
                    Audit Details
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {selectedLog.event_type}
                  </h2>
                </div>
                <Button variant="ghost" icon={XCircle} onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>
                    Timestamp
                  </div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.5 }}>
                    {formatDate(selectedLog.timestamp)}
                  </div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>
                    Actor
                  </div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>{selectedLog.causer_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', wordBreak: 'break-word' }}>
                    {selectedLog.ip_address}
                  </div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>
                    Source
                  </div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                    {selectedLog.source === 'temporal' ? 'Time Tracker' : 'Database Event'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {selectedLog.user_agent}
                  </div>
                </Card>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '10px' }}>
                  Full Details / Changes
                </div>
                {renderChanges(selectedLog)}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditTrailPage;
