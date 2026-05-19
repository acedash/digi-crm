import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/useAuthStore';
import dashboardService from './dashboardService';
import userService from '../users/userService';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  FileText, 
  ChevronRight,
  Clock,
  Sparkles,
  PieChart as PieChartIcon,
  PhoneCall,
  UserPlus,
  ArrowRight,
  Target,
  BadgeAlert,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  History,
  ReceiptText,
  CheckCircle2,
  ArrowDownLeft,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';

const SupervisorDashboard = () => {
  const MotionDiv = motion.div;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('monthly');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [handoffRemark, setHandoffRemark] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });
  const prevChargesRef = React.useRef([]);

  useEffect(() => {
    if (period === 'custom' && (!customRange.start || !customRange.end)) return;
    
    fetchData();

    const intervalId = setInterval(() => {
      fetchData(true); // silent poll
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [period, customRange.start, customRange.end]);

  const fetchData = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const start = period === 'custom' ? customRange.start : null;
      const end = period === 'custom' ? customRange.end : null;

      const [agentsRes, statsRes] = await Promise.all([
        userService.getMyAgents(),
        dashboardService.getStats(period, start, end, 'supervisor')
      ]);
      
      const newStats = statsRes.data.data;
      setAgents(agentsRes.data.data || agentsRes.data);
      setStats(newStats);
      prevChargesRef.current = newStats.recent_charges || [];
    } catch {
      console.error('Failed to load supervisor data');
      setToast({ message: 'Failed to sync team performance. Retrying...', type: 'error' });
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  // Monitor status changes
  useEffect(() => {
    if (!stats?.recent_charges) return;
    
    const isFirstLoad = !window._dashboardInitializedSup;
    if (!window._lastSeenChargesSup) window._lastSeenChargesSup = {};

    stats.recent_charges.forEach(charge => {
      const chargeKey = `charge_${charge.id}`;
      const prevStatus = window._lastSeenChargesSup[chargeKey];

      // Only notify if this isn't the first time the dashboard loaded
      if (!isFirstLoad) {
        if (!prevStatus || prevStatus !== charge.charge_status) {
          const msg = `Update: [Booking ${charge.booking_ref}] is now ${charge.charge_status}`;
          setToast({ message: msg, type: charge.charge_status === 'Charged/Captured' ? 'success' : 'error' });
          
          console.log('%c!!! SUP NOTIFICATION TRIGGERED !!!', 'color: white; background: red; font-size: 20px', msg);
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => {});
          } catch(e) {}
        }
      }
      window._lastSeenChargesSup[chargeKey] = charge.charge_status;
    });

    if (isFirstLoad && stats.recent_charges.length > 0) {
      window._dashboardInitializedSup = true;
      console.log('Supervisor notifications initialized.');
    }
  }, [stats?.recent_charges]);

  const handleReassign = async (bookingId) => {
    if (!selectedAgentId) return;
    setReassigning(true);
    try {
      // Reassignment logic
      setToast({ message: 'Booking reassigned successfully', type: 'success' });
    } catch {
      setToast({ message: 'Failed to reassign booking', type: 'error' });
    } finally {
      setReassigning(false);
    }
  };

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <p>Syncing team performance metrics...</p>
      </div>
    );
  }

  const periods = [
    { id: 'daily', label: 'Today' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom' },
  ];

  const renderFilterBar = () => (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap',
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: '20px',
      background: 'var(--bg-card)',
      padding: '20px 24px',
      borderRadius: '24px',
      border: '1px solid var(--border-color)',
      marginBottom: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        background: 'var(--bg-input)', 
        padding: '4px', 
        borderRadius: '14px', 
        border: '1px solid var(--border-color)' 
      }}>
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: period === p.id ? 'var(--bg-card)' : 'transparent',
              color: period === p.id ? 'hsl(var(--primary))' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: period === p.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, background: 'var(--bg-input)', padding: '8px 16px', borderRadius: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
          Last synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} style={{ marginBottom: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <Input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} style={{ marginBottom: 0 }} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* Premium Welcome Hero */}
      <MotionDiv 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          padding: '48px', 
          borderRadius: '32px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '12px', color: 'var(--text-main)' }}>
            Welcome Back, <span className="premium-gradient-text">{user?.name}</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '600px', lineHeight: '1.6' }}>
            Managing <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{agents.length} Agents</span> across the platform. 
            Real-time performance summary for this {period}.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div style={{ 
          position: 'absolute', right: '-40px', top: '-40px', 
          width: '300px', height: '300px', 
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
      </MotionDiv>

      {renderFilterBar()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <Card title="Team Total" icon={TrendingUp}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.total_revenue || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total team revenue this {period}</div>
        </Card>
        <Card title="Team Bookings" icon={FileText}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total_bookings}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total bookings confirmed</div>
        </Card>
        <Card title="Average Close" icon={Target}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'hsl(var(--primary))' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.avg_booking_value || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Per booking average</div>
        </Card>
        <Card title="Team Activity" icon={Clock}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.team_calls || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total call logs today</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <Card title="Agent Performance Breakdown" icon={Users} subtitle="Revenue contribution per agent">
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.agent_performance} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-main)' }}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-input)', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {stats.agent_performance?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--primary), ${1 - (index * 0.1)})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Performance Distribution" icon={PieChartIcon} subtitle="By Booking Type">
           <div style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {stats.performance_metrics?.map((item, idx) => (
                <div key={idx} style={{ padding: '20px', background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'hsl(var(--primary))' }}>{item.value}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-card)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.value}%`, background: 'hsl(var(--primary))' }} />
                  </div>
                </div>
              ))}
              {(!stats.performance_metrics || stats.performance_metrics.length === 0) && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '100px' }}>No distribution data available</div>
              )}
           </div>
        </Card>
      </div>

      <Card title="Team Monitoring" icon={BadgeAlert} subtitle="Real-time agent status & activity">
         <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
               <thead>
                  <tr style={{ textAlign: 'left' }}>
                     <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Agent</th>
                     <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Current Status</th>
                     <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Time in Status</th>
                     <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Daily Revenue</th>
                     <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Actions</th>
                  </tr>
               </thead>
               <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.id} className="agent-row" style={{ background: 'var(--bg-input)', borderRadius: '16px' }}>
                      <td style={{ padding: '16px 20px', borderRadius: '16px 0 0 16px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                               {agent.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 700 }}>{agent.name}</span>
                         </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                         <span style={{ 
                            padding: '6px 12px', 
                            borderRadius: '100px', 
                            fontSize: '11px', 
                            fontWeight: 800,
                            background: agent.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: agent.status === 'Active' ? '#22c55e' : '#ef4444'
                         }}>
                            {agent.status || 'Offline'}
                         </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-muted)' }}>
                         {agent.time_in_status || '00:00:00'}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: '#06B68A' }}>
                         ${agent.daily_revenue || 0}
                      </td>
                      <td style={{ padding: '16px 20px', borderRadius: '0 16px 16px 0' }}>
                         <Button variant="ghost" size="sm" icon={ChevronRight} />
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Card>

      {/* Recent Team Charges Section */}
      {(stats.recent_charges || []).length > 0 && (
        <Card title="Team Payment Activity" icon={ReceiptText} subtitle="Latest transactions across your team">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {(stats.recent_charges || []).map((charge, idx) => {
              const isCapture   = charge.charge_status === 'Charged/Captured';
              const isRefund    = charge.charge_status === 'Refunded';
              const isChargeback = charge.charge_status === 'Chargeback';
              const color  = isCapture ? '#059669' : isRefund ? '#3b82f6' : '#ef4444';
              const bg     = isCapture ? 'rgba(5,150,105,0.10)' : isRefund ? 'rgba(59,130,246,0.10)' : 'rgba(239,68,68,0.10)';
              const label  = isCapture ? 'Captured' : isRefund ? 'Refunded' : 'Chargeback';
              const Icon   = isCapture ? CheckCircle2 : isRefund ? ArrowDownLeft : AlertTriangle;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--bg-input)',
                  border: `1px solid ${color}30`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      background: bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                        {charge.booking_ref}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Agent: <span style={{color: 'var(--text-main)', fontWeight: 600}}>{charge.agent_name || 'System'}</span> &nbsp;·&nbsp;
                        {charge.client_name} &nbsp;·&nbsp;
                        {charge.collected_at ? new Date(charge.collected_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: charge.currency || 'USD' }).format(charge.amount)}
                    </div>
                    <span style={{
                      display: 'inline-block', marginTop: '4px',
                      fontSize: '9px', fontWeight: 800, textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '2px 8px',
                      borderRadius: '20px', background: bg, color
                    }}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'error' })} 
      />
    </div>
  );
};

export default SupervisorDashboard;
