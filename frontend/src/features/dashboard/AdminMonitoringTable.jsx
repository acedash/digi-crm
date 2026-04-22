import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Users, Activity, Coffee } from 'lucide-react';
import Card from '../../components/ui/Card';
import dashboardService from './dashboardService';
import { motion, AnimatePresence } from 'framer-motion';

const AdminMonitoringTable = ({ onSummaryChange }) => {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monPeriod, setMonPeriod] = useState('daily');
  const [monStart, setMonStart] = useState('');
  const [monEnd, setMonEnd] = useState('');

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAdminMonitor(monPeriod, monStart, monEnd);
      if (res.data?.success) {
        const data = res.data.data;
        setSupervisors(data);
        if (onSummaryChange) {
          onSummaryChange({
            supervisors: data.length,
            active: data.reduce((acc, sup) => acc + (sup.active_agents || 0), 0),
            break: data.reduce((acc, sup) => acc + (sup.on_break || 0), 0)
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin monitor:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    if (monPeriod === 'daily') {
      const interval = setInterval(fetchActivity, 300000); // Every 5 minutes for current day
      return () => clearInterval(interval);
    }
  }, [monPeriod, monStart, monEnd]);

  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom' }
  ];

  return (
    <Card style={{ padding: '0', overflow: 'hidden', marginTop: '32px', border: '1px solid var(--border-color)' }}>
      <div style={{ 
        padding: '24px', 
        borderBottom: '1px solid var(--border-color)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-app)',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ minWidth: '200px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <ShieldCheck size={20} style={{ color: '#8b5cf6' }} />
            Admin Monitoring
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {monPeriod === 'live' ? 'Real-time overview of current activity.' : `Summary of activity for the selected ${monPeriod} period.`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Custom Date Inputs */}
          {monPeriod === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="date" 
                value={monStart} 
                onChange={(e) => setMonStart(e.target.value)}
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
              <input 
                type="date" 
                value={monEnd} 
                onChange={(e) => setMonEnd(e.target.value)}
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', outline: 'none' }}
              />
            </div>
          )}

          {/* Period Selector */}
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-card)', 
            padding: '4px', 
            borderRadius: '10px', 
            border: '1px solid var(--border-color)',
            gap: '2px'
          }}>
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setMonPeriod(p.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: monPeriod === p.id ? 'hsl(var(--primary))' : 'transparent',
                  color: monPeriod === p.id ? 'white' : 'var(--text-muted)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ color: 'var(--border-color)' }}>|</div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," 
                  + "Supervisor,Total Agents,Active,On Break\n"
                  + supervisors.map(s => `${s.supervisor_name},${s.total_agents},${s.active_agents},${s.on_break}`).join("\n");
                const link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                link.setAttribute("download", `monitoring_${monPeriod}_${new Date().getTime()}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
              }}
              style={{ 
                background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer',
                padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700,
                transition: 'all 0.2s'
              }}
              className="hover-brighten"
            >
              Export
            </button>
            <button 
              onClick={fetchActivity}
              style={{ 
                background: '#8b5cf6', border: 'none', color: 'white', cursor: 'pointer',
                padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
              }}
              className="hover-brighten"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Supervisor</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agents</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Break</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {supervisors.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Compiling hierarchy...' : 'No supervisors found.'}
                  </td>
                </tr>
              ) : (
                supervisors.map((sup, idx) => (
                  <motion.tr 
                    key={sup.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ borderBottom: '1px solid var(--border-color)' }} 
                    className="hover-brighten"
                  >
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '12px', fontWeight: 800, color: '#8b5cf6' }}>
                        {sup.supervisor_name.charAt(0)}
                      </div>
                      {sup.supervisor_name}
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                          <Users size={14} style={{ color: 'var(--text-main)' }} />
                        </div>
                        {sup.total_agents}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#10b981' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '6px' }}>
                          <Activity size={14} style={{ color: '#10b981' }} />
                        </div>
                        {sup.active_agents}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#f59e0b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '6px' }}>
                          <Coffee size={14} style={{ color: '#f59e0b' }} />
                        </div>
                        {sup.on_break}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default React.memo(AdminMonitoringTable);
