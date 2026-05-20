import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/useAuthStore';
import dashboardService from './dashboardService';
import api from '../../services/api';
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
  AlertTriangle,
  HelpCircle,
  XCircle
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
  LabelList,
  Legend
} from 'recharts';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import { useWalkthroughStore } from '../../store/walkthroughStore';
import AgentReportSlideOver from './components/AgentReportSlideOver';

const SupervisorDashboard = () => {
  const MotionDiv = motion.div;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('monthly');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [stats, setStats] = useState(null);
  const [agents, setAgents] = useState([]);
  const [liveAgents, setLiveAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [handoffRemark, setHandoffRemark] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });
  const prevChargesRef = React.useRef([]);

  const startSupervisorTour = () => {
    const { startTour } = useWalkthroughStore.getState();
    startTour([
      {
        target: '#supervisor-dashboard-title',
        title: 'Supervisor Dashboard 📊',
        content: 'Welcome to your Supervisor Dashboard! Here you can monitor team activities, view overall performance, and manage agents in real time.',
        position: 'bottom'
      },
      {
        target: '#supervisor-period-selector',
        title: 'Date Range Selector 📅',
        content: 'Filter performance metrics across different time periods like Today, Weekly, Monthly, or a Custom range.',
        position: 'bottom'
      },
      {
        target: '#supervisor-stats-grid',
        title: 'Team Performance Metrics 📈',
        content: 'Get a quick overview of total team revenue, number of bookings, average close value, and total activity.',
        position: 'bottom'
      },
      {
        target: '#supervisor-agent-performance-card',
        title: 'Agent Performance Breakdown 📊',
        content: 'Visualize the revenue contribution of each agent to see who is leading team performance.',
        position: 'right'
      },
      {
        target: '#supervisor-performance-distribution-card',
        title: 'Performance Distribution 🍰',
        content: 'Analyze booking type distribution to see where your team is focusing their efforts.',
        position: 'left'
      },
      {
        target: '#supervisor-team-monitoring-title',
        title: 'Real-Time Team Monitor 👥',
        content: 'Track live agent statuses, see how long they have been in that status, and monitor their daily revenue contributions.',
        position: 'bottom',
        scrollBlock: 'start'
      }
    ]);
  };

  useEffect(() => {
    if (period === 'custom' && (!customRange.start || !customRange.end)) return;

    fetchData();

    const intervalId = setInterval(() => {
      fetchData(true); // silent poll
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [period, customRange.start, customRange.end]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchData = async (isPolling = false) => {
    if (!isPolling) {
      const start = period === 'custom' ? customRange.start : null;
      const end = period === 'custom' ? customRange.end : null;
      let url = `/dashboard/stats?period=${period}`;
      if (start) url += `&start_date=${start}`;
      if (end) url += `&end_date=${end}`;
      url += `&mode=supervisor`;

      const isCached = api.hasCached?.(url);
      if (!isCached) {
        setLoading(true);
      }
    }
    try {
      const start = period === 'custom' ? customRange.start : null;
      const end = period === 'custom' ? customRange.end : null;

      const [agentsRes, statsRes, monitorRes] = await Promise.all([
        userService.getMyAgents({ bypassCache: isPolling }),
        dashboardService.getStats(period, start, end, 'supervisor', { bypassCache: isPolling }),
        dashboardService.getAgentMonitor('live', null, null, { bypassCache: isPolling })
      ]);

      const newStats = statsRes.data.data;
      setAgents(agentsRes.data.data || agentsRes.data);
      setLiveAgents(monitorRes.data?.data || []);
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
            audio.play().catch(() => { });
          } catch (e) { }

          // HTML5 Web System Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Digi CRM Update', {
                body: msg,
                icon: '/digi-logo.jpeg',
                tag: chargeKey
              });
            } catch (e) {
              console.error('Failed to trigger native notification', e);
            }
          }
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

  const BAR_COLORS = ['#06B68A', '#0891b2', '#7c3aed', '#f59e0b', '#ef4444', '#16a34a', '#db2777', '#0284c7'];

  const periods = [
    { id: 'all', label: 'All Time' },
    { id: 'daily', label: 'Daily' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom Date' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

      {/* Top Header Row with Title, Show Guide, and Period Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <div id="supervisor-dashboard-title">
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '8px' }}>
            Supervisor <span className="premium-gradient-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 500 }}>
            Real-time agent monitoring and team performance overview.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', width: window.innerWidth <= 768 ? '100%' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}></div>
              Last synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={startSupervisorTour}
              icon={HelpCircle}
              style={{ borderRadius: '100px', fontWeight: 700, color: 'hsl(var(--primary))' }}
            >
              Show Guide
            </Button>
          </div>

          <div id="supervisor-period-selector" style={{
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

          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)', width: '100%', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} style={{ marginBottom: 0 }} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>to</span>
              <Input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} style={{ marginBottom: 0 }} />
            </div>
          )}
        </div>
      </div>

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

      <div id="supervisor-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
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

      {/* Agent Performance Breakdown - Full Width Row */}
      <Card id="supervisor-agent-performance-card" title="Agent Performance Breakdown" icon={Users} subtitle="Revenue contribution per agent" style={{ height: '400px', display: 'flex', flexDirection: 'column', padding: '16px 20px', marginBottom: '32px' }}>
        {(!stats.agent_performance || stats.agent_performance.length === 0 || stats.agent_performance.every(e => e.revenue === 0)) ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px' }}>
            <TrendingUp size={48} style={{ opacity: 0.3, color: 'hsl(var(--primary))' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>there is no data yet to be shown</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', minWidth: '300px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                <BarChart
                  data={stats.agent_performance}
                  layout="vertical"
                  margin={{ top: 8, right: 80, left: 16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.4} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickFormatter={(v) => v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700, fill: 'var(--text-main)' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-input)', opacity: 0.5 }}
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-main)'
                    }}
                    itemStyle={{ color: 'var(--text-main)' }}
                    labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                    formatter={(value) => [
                      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value),
                      'Revenue'
                    ]}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={32}>
                    {stats.agent_performance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="revenue"
                      position="right"
                      fontSize={12}
                      fontWeight={700}
                      fill="var(--text-main)"
                      formatter={(v) => v > 0 ? `$${Number(v).toLocaleString()}` : '$0'}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* Trends & Distribution - Side-by-Side Row */}
      <div id="supervisor-charts-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px', marginBottom: '32px', alignItems: 'stretch' }}>
        <Card title="Pending vs Confirmed Booking" icon={TrendingUp} subtitle="Monthly status trends" style={{ height: '400px', display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
          {(!stats.booking_status_trends || stats.booking_status_trends.length === 0 || stats.booking_status_trends.every(e => !e.Confirmed && !e.Pending)) ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px' }}>
              <TrendingUp size={48} style={{ opacity: 0.3, color: 'hsl(var(--primary))' }} />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>there is no data yet to be shown</p>
            </div>
          ) : (
            <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                <BarChart data={stats.booking_status_trends} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }}
                    dy={10}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                    itemStyle={{ fontWeight: 700 }}
                    cursor={{ fill: 'var(--bg-input)', opacity: 0.5 }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="Confirmed" fill="#06B68A" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card id="supervisor-performance-distribution-card" title="Performance Distribution" icon={PieChartIcon} subtitle="By Booking Type" style={{ height: '400px', display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
            {(() => {
              const breakdown = stats.status_breakdown || [];
              if (breakdown.length === 0 || breakdown.every(item => item.count === 0)) {
                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px' }}>
                    <PieChartIcon size={48} style={{ opacity: 0.3, color: 'hsl(var(--primary))' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>there is no data yet to be shown</p>
                  </div>
                );
              }
              const total = breakdown.reduce((sum, item) => sum + (Number(item.count) || 0), 0);

              return breakdown.map((item, idx) => {
                const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={idx} style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.status}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'hsl(var(--primary))' }}>{item.count} ({percentage}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-card)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percentage}%`, background: 'hsl(var(--primary))', borderRadius: '100px' }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      </div>

      <Card titleId="supervisor-team-monitoring-title" title="Team Monitoring" icon={BadgeAlert} subtitle="Real-time agent status & activity">
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
              {liveAgents.map((agent) => (
                <tr key={agent.id} className="agent-row" style={{ background: 'var(--bg-input)', borderRadius: '16px' }}>
                  <td style={{ padding: '16px 20px', borderRadius: '16px 0 0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                        {agent.agent_name?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 700 }}>{agent.agent_name}</span>
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
                    {agent.status?.toLowerCase() === 'break' ? agent.break_time : agent.total_login_time || '0h'}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: '#06B68A' }}>
                    ${agent.daily_revenue || 0}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', borderRadius: '0 16px 16px 0' }}>
                    <button
                      onClick={() => { setSelectedAgentId(agent.id); setIsReportOpen(true); }}
                      style={{ 
                        background: 'rgba(96, 165, 250, 0.1)', 
                        border: '1px solid rgba(96, 165, 250, 0.2)', 
                        color: '#06B68A', 
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
                      className="hover:scale-105 hide-on-print"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      Report
                    </button>
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
              const isCapture = charge.charge_status === 'Charged/Captured';
              const isRefund = charge.charge_status === 'Refunded';
              const isChargeback = charge.charge_status === 'Chargeback';
              const isDecline = charge.charge_status === 'Decline';

              const color = isCapture ? '#059669' : isRefund ? '#10b981' : isDecline ? '#f43f5e' : '#ef4444';
              const bg = isCapture ? 'rgba(5,150,105,0.10)' : isRefund ? 'rgba(16,185,129,0.10)' : isDecline ? 'rgba(244,63,94,0.10)' : 'rgba(239,68,68,0.10)';
              const label = isCapture ? 'Captured' : isRefund ? 'Refunded' : isDecline ? 'Declined' : 'Chargeback';
              const Icon = isCapture ? CheckCircle2 : isRefund ? ArrowDownLeft : isDecline ? XCircle : AlertTriangle;
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
                        Agent: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{charge.agent_name || 'System'}</span> &nbsp;·&nbsp;
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
      
      <AgentReportSlideOver
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        agentId={selectedAgentId}
        initialPeriod={period}
        initialStart={customRange.start}
        initialEnd={customRange.end}
      />
    </div>
  );
};

export default SupervisorDashboard;
