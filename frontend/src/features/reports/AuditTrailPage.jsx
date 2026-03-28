import React, { useState, useEffect } from 'react';
import { Shield, Clock, Box, ArrowRight, Activity, Download, Search, Globe, Monitor } from 'lucide-react';
import Card from '../../components/ui/Card';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';

const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');

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

  const renderChanges = (log) => {
    if (log.source === 'temporal') {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ background: 'var(--bg-input)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
            {log.event_type.replace('Agent Status: ', '')}
          </span>
        </div>
      );
    }

    if (!log.details || Object.keys(log.details).length === 0) {
      return <span style={{ color: 'var(--text-muted)' }}>No notable modifications.</span>;
    }

    if (log.details.old) {
      // It's an update with old & new values
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.keys(log.details).filter(k => k !== 'old').map(key => {
            const oldVal = log.details.old[key];
            const newVal = log.details[key];
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize', minWidth: '80px' }}>
                  {key.replace('_', ' ')}:
                </span>
                <span style={{ 
                  color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)',
                  padding: '4px 8px', borderRadius: '6px', textDecoration: 'line-through', fontWeight: 600
                }}>
                  {String(oldVal || 'empty')}
                </span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ 
                  color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 8px', borderRadius: '6px', fontWeight: 600
                }}>
                  {String(newVal || 'empty')}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // It's a creation event or flat attributes
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.keys(log.details)
          .filter(key => log.details[key] !== null && log.details[key] !== '') // Filter out null/empty metrics
          .map(key => (
          <div key={key} style={{ 
            background: 'var(--bg-input)', border: '1px solid var(--border-color)', 
            padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-main)',
            display: 'flex', gap: '6px', alignItems: 'center'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'capitalize' }}>{key.replace('_', ' ')}:</span> 
            <span style={{ fontWeight: 600 }}>{String(log.details[key])}</span>
          </div>
        ))}
      </div>
    );
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

        <div style={{ overflowX: 'auto', maxHeight: '65vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timestamp</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actor Network Context</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action Taken</th>
                <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details / Changes</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Extracting global telemetry...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No audit logs match your specific criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx > 15 ? 0 : idx * 0.02 }}
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      className="hover-brighten"
                    >
                      <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatDate(log.timestamp)}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontWeight: 800, fontSize: '11px' }}>
                              {log.causer_name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{log.causer_name}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Globe size={11} /> <span style={{ fontFamily: 'monospace' }}>{log.ip_address}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={log.user_agent}>
                              <Monitor size={11} /> <span>{log.user_agent.length > 30 ? log.user_agent.substring(0, 30) + '...' : log.user_agent}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>{log.event_type}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: log.source === 'system' ? '#8b5cf6' : '#10b981' }}>
                            {getSourceIcon(log.source)} {log.source === 'temporal' ? 'Time Tracker' : 'Database Event'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', width: '45%' }}>
                        {renderChanges(log)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AuditTrailPage;
