import React, { useEffect, useState } from 'react';
import { 
  X, 
  TrendingUp, 
  CircleDollarSign, 
  ClipboardList, 
  PhoneCall, 
  Clock, 
  ChevronRight,
  TrendingDown,
  Info,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Card from '../../../components/ui/Card';
import dashboardService from '../dashboardService';

const COLORS = ['#06B68A', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#94a3b8'];

const AgentReportSlideOver = ({ isOpen, onClose, agentId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (isOpen && agentId) {
      fetchReport();
    }
  }, [isOpen, agentId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getAgentReport(agentId);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch agent report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)' }}
        />
        
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: '600px', 
            height: '100%', 
            background: 'var(--bg-app)', 
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ 
                  background: 'rgba(96, 165, 250, 0.1)', 
                  color: '#60a5fa', 
                  padding: '2px 8px', 
                  borderRadius: '6px', 
                  fontSize: '10px', 
                  fontWeight: 800, 
                  textTransform: 'uppercase' 
                }}>Agent Analytics</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-1px' }}>
                {loading ? 'Crunching numbers...' : data?.agent?.name}
              </h2>
            </div>
            <button 
              onClick={onClose}
              style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '16px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <RefreshCw size={40} />
              </motion.div>
              <p style={{ fontWeight: 600 }}>Building performance profile...</p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Quick Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Total Revenue</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.stats.total_revenue)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Bookings</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>{data.stats.total_bookings}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Daily Rev</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.stats.daily_revenue)}
                  </div>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CircleDollarSign size={18} style={{ color: '#10b981' }} /> Yearly Revenue Trend
                </h3>
                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenue_trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(val) => `$${val >= 1000 ? val/1000 + 'k' : val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '8px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}
                        labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} filter="drop-shadow(0px 4px 4px rgba(16, 185, 129, 0.2))" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Status Split</h3>
                  <div style={{ height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.status_distribution}
                          innerRadius={45}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.status_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {data.status_distribution.slice(0, 4).map((status, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                        {status.name} ({status.value})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Summary</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Success Rate</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {data.stats.total_bookings > 0 ? ((data.status_distribution.find(s => s.name === 'Confirmed')?.value || 0) / data.stats.total_bookings * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#10b981', width: `${data.stats.total_bookings > 0 ? ((data.status_distribution.find(s => s.name === 'Confirmed')?.value || 0) / data.stats.total_bookings * 100) : 0}%` }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Call Logs</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>{data.stats.total_calls}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(96, 165, 250, 0.05)', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.1)', display: 'flex', gap: '10px' }}>
                    <Info size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
                    <p style={{ fontSize: '11px', color: 'rgba(96, 165, 250, 0.8)', lineHeight: '1.4' }}>Metrics are based on real-time activity and all-time booking history for this agent.</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={18} style={{ color: '#8b5cf6' }} /> Recent Call Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.recent_calls.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No recent activity logs found.
                    </div>
                  ) : (
                    data.recent_calls.map((call, idx) => (
                      <div key={idx} style={{ 
                        background: 'var(--bg-card)', 
                        padding: '16px', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '16px'
                      }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                          <PhoneCall size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>
                              {call.client?.name || 'Unknown Client'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
                              {new Date(call.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {call.customer_outcome || 'No outcome recorded'} • <span style={{ color: '#60a5fa' }}>{call.airline_inquiry}</span>
                          </div>
                          {call.notes && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-main)', fontStyle: 'italic' }}>
                              "{call.notes.length > 80 ? call.notes.substring(0, 80) + '...' : call.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AgentReportSlideOver;
