import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Clock, Phone, Coffee, CircleDollarSign } from 'lucide-react';
import Card from '../../components/ui/Card';
import dashboardService from './dashboardService';
import { motion, AnimatePresence } from 'framer-motion';

const AgentActivityTable = ({ onViewReport }) => {
  const MotionTr = motion.tr;
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAgentMonitor();
      if (res.data?.success) {
        setAgents(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch agent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', dot: '#22c55e' };
      case 'on call': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', dot: '#3b82f6' };
      case 'break': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', dot: '#eab308' };
      case 'week off': return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', dot: '#8b5cf6' };
      case 'offline':
      case 'not logged in': return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', dot: '#94a3b8' };
      default: return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', dot: '#94a3b8' };
    }
  };

  return (
    <Card style={{ padding: '0', overflow: 'hidden', marginTop: '32px', border: '1px solid var(--border-color)' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            Live Team Activity
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Track agent activity and status in real time.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," 
                + "Agent,Login Time,Status,Calls Picked,Bookings Created,Daily Revenue,Break Time\n"
                + agents.map(a => `${a.agent_name},${a.login_time},${a.status?.toLowerCase() === 'offline' ? 'Not Logged In' : a.status},${a.calls_picked},${a.bookings_created},${a.daily_revenue || 0},${a.break_time}`).join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", `team_activity_${new Date().getTime()}.csv`);
              document.body.appendChild(link);
              link.click();
            }}
            style={{ 
              background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer',
              padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700,
              transition: 'all 0.2s'
            }}
            className="hover:brightness-110"
          >
            Export CSV
          </button>
          <button 
            onClick={fetchActivity}
            style={{ 
              background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer',
              padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700,
              transition: 'all 0.2s'
            }}
            className="hover:brightness-110"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Login Time</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calls Picked</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bookings Created</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Revenue</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Break Time</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Initializing telemetry...' : 'No agents assigned or active.'}
                  </td>
                </tr>
              ) : (
                agents.map((agent, idx) => {
                  const style = getStatusColor(agent.status);
                  return (
                    <MotionTr 
                      key={agent.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ borderBottom: '1px solid var(--border-color)' }} 
                      className="hover-brighten"
                    >
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 800, color: '#60a5fa' }}>
                          {agent.agent_name.charAt(0)}
                        </div>
                        {agent.agent_name}
                      </td>
                      <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} style={{ color: 'var(--text-muted)', opacity: 0.7 }} /> 
                          {agent.login_time}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: style.bg, color: style.color, 
                          padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
                          border: `1px solid ${style.color}30`
                        }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: style.dot, boxShadow: `0 0 5px ${style.dot}` }} />
                          {agent.status?.toLowerCase() === 'offline' ? 'Not Logged In' : agent.status}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                            <Phone size={14} style={{ color: '#4ade80' }} />
                          </div>
                          {agent.calls_picked}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                          </div>
                          {agent.bookings_created}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: '#22c55e' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '6px', borderRadius: '6px' }}>
                            <CircleDollarSign size={14} style={{ color: '#22c55e' }} />
                          </div>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(agent.daily_revenue) || 0)}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: agent.break_time !== '--' ? '#facc15' : 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                            <Coffee size={14} style={{ color: agent.break_time !== '--' ? '#facc15' : 'var(--text-muted)' }} />
                          </div>
                          {agent.break_time}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => onViewReport && onViewReport(agent.id)}
                          style={{ 
                            background: 'rgba(96, 165, 250, 0.1)', 
                            border: '1px solid rgba(96, 165, 250, 0.2)', 
                            color: '#60a5fa', 
                            padding: '6px 12px', 
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          className="hover:scale-105"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                          Report
                        </button>
                      </td>
                    </MotionTr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default React.memo(AgentActivityTable);
