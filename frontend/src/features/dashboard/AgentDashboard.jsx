import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/useAuthStore';
import dashboardService from './dashboardService';
import { motion } from 'framer-motion';
import { 
  UserPlus, 
  Plane, 
  FileText, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  Map,
  Coffee,
  Play,
  LogOut,
  Clock,
  Compass,
  Phone,
  PhoneCall,
  CheckCircle2,
  CircleDollarSign,
  Mail,
  Calendar,
  PieChart as PieChartIcon,
  ReceiptText,
  ArrowDownLeft,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
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
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import activityService from '../activity-tracker/activityService';
import Toast from '../../components/ui/Toast';
import { useWalkthroughStore } from '../../store/walkthroughStore';

// Inline SVG fallback for missing icons
const ShieldCheck = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const AgentDashboard = () => {
  const MotionDiv = motion.div;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('monthly');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  
  const [baseBreakdown, setBaseBreakdown] = useState({ active: 0, on_call: 0, break: 0, idle: 0 });
  const [liveBreakdown, setLiveBreakdown] = useState({ active: '00:00:00', on_call: '00:00:00', break: '00:00:00', idle: '00:00:00', total: '00:00:00' });
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('Active');
  const [lastActivityTime, setLastActivityTime] = useState(null);
  const [elapsedStatusTime, setElapsedStatusTime] = useState('00:00:00');
  const [activities, setActivities] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const prevChargesRef = React.useRef([]);

  const startAgentTour = () => {
    const { startTour } = useWalkthroughStore.getState();
    startTour([
      {
        target: '#agent-dashboard-title',
        title: 'Welcome to your Dashboard 👋',
        content: 'This is your central hub. Keep track of your current status, session time, and overall personal performance.',
        position: 'right'
      },
      {
        target: '#agent-period-selector',
        title: 'Time Period 📅',
        content: 'Filter your stats by Day, Week, Month, or use a custom date range to track your progress over time.',
        position: 'bottom'
      },
      {
        target: '#agent-stats-grid',
        title: 'Quick Stats ⚡',
        content: 'Get a quick overview of your new bookings, call logs, tagged inquiries, and total all-time bookings.',
        position: 'bottom'
      },
      {
        target: '#agent-revenue-breakdown',
        title: 'Revenue Breakdown 💰',
        content: 'Track your financial performance including net revenue, collected amounts, refunds, and chargebacks.',
        position: 'top'
      },
      {
        target: '#agent-charts-section',
        title: 'Performance Trends 📈',
        content: 'Visualize your revenue trends over the last 6 months and see your booking distribution by type.',
        position: 'top'
      },
      {
        target: '#agent-status-breakdown',
        title: 'Time Management ⏱️',
        content: 'Monitor exactly how much time you have spent in Active, On Call, Break, and Idle statuses today.',
        position: 'right'
      }
    ]);
  };

  useEffect(() => {
    if (period === 'custom' && (!customRange.start || !customRange.end)) return;
    fetchStats();

    const intervalId = setInterval(() => {
      fetchStats(true); // pass true to indicate silent poll
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId);
  }, [period, customRange.start, customRange.end]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStats = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const response = await dashboardService.getStats(period, customRange.start, customRange.end, 'agent');
      const newStats = response.data.data;
      
      prevChargesRef.current = newStats.recent_charges || [];
      setStats(newStats);
      fetchStatus();
    } catch (e) {
      console.error('Failed to fetch agent stats', e);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  // Dedicated effect to monitor charge status changes
  useEffect(() => {
    if (!stats?.recent_charges) return;
    
    const isFirstLoad = !window._dashboardInitialized;
    if (!window._lastSeenCharges) window._lastSeenCharges = {};

    let hasChange = false;
    stats.recent_charges.forEach(charge => {
      const chargeKey = `charge_${charge.id}`;
      const prevStatus = window._lastSeenCharges[chargeKey];

      // Only notify if this isn't the very first time the dashboard loaded
      if (!isFirstLoad) {
        if (!prevStatus || prevStatus !== charge.charge_status) {
          const msg = `Update: Booking ${charge.booking_ref} is now ${charge.charge_status}`;
          setToast({ message: msg, type: charge.charge_status === 'Charged/Captured' ? 'success' : 'error' });
          
          console.log('%c!!! NOTIFICATION TRIGGERED !!!', 'color: white; background: red; font-size: 20px', msg);
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => {});
          } catch(e) {}
          
          hasChange = true;
        }
      }
      
      window._lastSeenCharges[chargeKey] = charge.charge_status;
    });

    if (isFirstLoad && stats.recent_charges.length > 0) {
      window._dashboardInitialized = true;
      console.log('Dashboard notifications initialized.');
    }
  }, [stats?.recent_charges]);

  const fetchStatus = async () => {
    try {
      const statusRes = await activityService.getStatus();
      setCurrentStatus(statusRes.data.data.status);
      setLastActivityTime(statusRes.data.data.last_activity?.created_at);
      setBaseBreakdown(statusRes.data.data.breakdown || { active: 0, on_call: 0, break: 0, idle: 0 });
      
      const activityRes = await activityService.getActivities();
      setActivities(activityRes.data.data.slice(0, 5));
    } catch (e) {
      console.error('Failed to fetch status', e);
    }
  };

  useEffect(() => {
    let interval;
    if (lastActivityTime !== null) {
      const updateTimer = () => {
        const start = new Date(lastActivityTime).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        
        const formatHms = (totalSec) => {
          const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
          const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
          const s = (totalSec % 60).toString().padStart(2, '0');
          return `${h}:${m}:${s}`;
        };
        
        setElapsedStatusTime(formatHms(diff));

        const activeSec = baseBreakdown.active + (currentStatus === 'Active' || currentStatus === 'active' ? diff : 0);
        const onCallSec = baseBreakdown.on_call + (currentStatus === 'On Call' || currentStatus === 'on_call' ? diff : 0);
        const breakSec  = baseBreakdown.break + (currentStatus === 'Break' || currentStatus === 'break' || currentStatus === 'on_break' ? diff : 0);
        const idleSec   = baseBreakdown.idle + (currentStatus === 'Idle' || currentStatus === 'idle' ? diff : 0);

        setLiveBreakdown({
          active: formatHms(activeSec),
          on_call: formatHms(onCallSec),
          break: formatHms(breakSec),
          idle: formatHms(idleSec),
          total: formatHms(activeSec + onCallSec + breakSec + idleSec)
        });
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [lastActivityTime, currentStatus, baseBreakdown]);

  const userName = user?.name || "Member"; 
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";

  const periods = [
    { id: 'all', label: 'All Time' },
    { id: 'daily', label: 'Daily' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom Date' },
  ];

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <p>Syncing your performance metrics...</p>
      </div>
    );
  }

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
      <div id="agent-period-selector" style={{ 
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, background: 'var(--bg-input)', padding: '8px 16px', borderRadius: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
          Last synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={startAgentTour}
          icon={HelpCircle}
          style={{ borderRadius: '100px', fontWeight: 700, color: 'hsl(var(--primary))' }}
        >
          Show Guide
        </Button>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '150px' }}>
              <Input 
                type="date" 
                icon={Calendar}
                value={customRange.start} 
                onChange={e => setCustomRange({...customRange, start: e.target.value})}
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px', height: 'auto' }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, padding: '0 4px', fontSize: '13px' }}>to</span>
            <div style={{ width: '150px' }}>
              <Input 
                type="date" 
                icon={Calendar}
                value={customRange.end} 
                onChange={e => setCustomRange({...customRange, end: e.target.value})}
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px', height: 'auto' }}
              />
            </div>
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
        className="glass-panel"
        style={{ 
          padding: '48px', 
          borderRadius: '32px',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div id="agent-dashboard-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                  padding: '8px 16px', borderRadius: '100px', 
                  background: (currentStatus === 'Break' || currentStatus === 'on_break') ? 'rgba(239, 68, 68, 0.14)' : 
                              (currentStatus === 'On Call' || currentStatus === 'on_call') ? 'rgba(234, 179, 8, 0.14)' : 
                              (currentStatus === 'Idle' || currentStatus === 'idle') ? 'rgba(156, 163, 175, 0.14)' : 
                              'rgba(6, 182, 138, 0.14)', 
                  color: (currentStatus === 'Break' || currentStatus === 'on_break') ? '#ef4444' : 
                         (currentStatus === 'On Call' || currentStatus === 'on_call') ? '#eab308' : 
                         (currentStatus === 'Idle' || currentStatus === 'idle') ? '#9ca3af' : 
                         'hsl(var(--primary))',
                  fontSize: '12px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <Sparkles size={14} /> {(currentStatus === 'Break' || currentStatus === 'on_break') ? 'ON BREAK' : 
                                           (currentStatus === 'On Call' || currentStatus === 'on_call') ? 'ON CALL' : 
                                           (currentStatus === 'Idle' || currentStatus === 'idle') ? 'IDLE' : 'ACTIVE'}
                </div>
                {lastActivityTime && (
                  <div style={{
                    padding: '8px 16px', borderRadius: '100px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    color: 'var(--text-main)', fontSize: '13px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace'
                  }} title="Current Session Duration">
                    <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, marginRight: '4px', fontFamily: 'var(--font-primary)'}}>SESSION:</span> 
                    {elapsedStatusTime}
                  </div>
                )}
                <div style={{
                  padding: '8px 16px', borderRadius: '100px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  color: '#4ade80', fontSize: '13px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace'
                }} title="Total Logged In Today">
                  <CheckCircle2 size={14} />
                  <span style={{color: '#4ade80', opacity: 0.8, fontSize: '11px', fontWeight: 600, marginRight: '4px', fontFamily: 'var(--font-primary)'}}>TOTAL TODAY:</span> 
                  {liveBreakdown.total}
                </div>
              </div>
              <h1 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '12px', color: 'var(--text-main)' }}>
                {greeting}, <span className="premium-gradient-text">{userName}</span>
              </h1>
              <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '500px', lineHeight: '1.6' }}>
                Personal Performance Overview for <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{period === 'all' ? 'All Time' : (period === 'monthly' ? 'this Month' : (period === 'weekly' ? 'this Week' : (period === 'daily' ? 'Today' : 'selected period')))}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div style={{ 
          position: 'absolute', right: '-40px', top: '-40px', 
          width: '300px', height: '300px', 
          background: 'radial-gradient(circle, rgba(6, 182, 138, 0.15) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
      </MotionDiv>

      {renderFilterBar()}

      <div id="agent-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <Card title="Period Bookings" icon={FileText}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.my_bookings_count}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>New bookings this {period}</div>
        </Card>
        <Card title="Total Call Logs" icon={PhoneCall}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.my_calls}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total logged this {period}</div>
        </Card>
        <Card title="My Inquiries" icon={Mail}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'hsl(var(--primary))' }}>{stats.my_inquiries}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total inquiries tagged</div>
        </Card>
        <Card title="Total Bookings" icon={Compass}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total_bookings_all_time}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Total across all time</div>
        </Card>
      </div>

      {/* Revenue Breakdown Section */}
      <Card style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div id="agent-revenue-breakdown">
            <h3 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CircleDollarSign size={20} color="hsl(var(--primary))" /> Revenue Breakdown
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Detailed financial metrics for selected period</p>
          </div>
          <div style={{ textAlign: 'right' }}>
             <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total All-Time Revenue</p>
             <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#06B68A' }}>
               {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.total_revenue_all_time || 0)}
             </h4>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Net Revenue</p>
            <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#06B68A' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.daily_revenue || 0)}
            </h4>
          </div>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Collected</p>
            <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.revenue?.charged || 0)}
            </h4>
          </div>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Refunded</p>
            <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.revenue?.refunded || 0)}
            </h4>
          </div>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Chargeback</p>
            <h4 style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.revenue?.chargeback || 0)}
            </h4>
          </div>
        </div>
      </Card>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
        <Card titleId="agent-charts-section" title="Revenue Trend" icon={TrendingUp} subtitle="Last 6 months performance">
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenue_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B68A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06B68A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: '#06B68A', fontWeight: 800 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#06B68A" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Booking Overview" icon={PieChartIcon} subtitle={`Based on ${period} data`}>
          <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.booking_distribution || []}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats.booking_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[
                      '#06B68A', // Emerald
                      '#3b82f6', // Blue
                      '#f59e0b', // Amber
                      '#ef4444', // Red
                      '#8b5cf6', // Violet
                      '#10b981', // Teal
                      '#ec4899', // Pink
                    ][index % 7]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-color)' 
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px' }}>
        <Card title="Recent Activity" icon={Clock}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activities.map((activity, idx) => (
              <div key={idx} style={{ 
                padding: '12px', 
                background: 'var(--bg-input)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: activity.activity_type.includes('break') ? '#eab308' : (activity.activity_type === 'login' ? '#4ade80' : '#06B68A')
                }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{activity.description}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No activity recorded today.</p>}
          </div>
        </Card>
        
        <Card titleId="agent-status-breakdown" title="Status Breakdown" icon={Clock}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active</p>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80' }}>{liveBreakdown.active}</h4>
            </div>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>On Call</p>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#facc15' }}>{liveBreakdown.on_call}</h4>
            </div>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Break</p>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#f87171' }}>{liveBreakdown.break}</h4>
            </div>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Idle</p>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#9ca3af' }}>{liveBreakdown.idle}</h4>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>Recent My Bookings</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(stats.recent_bookings || []).map(book => (
                <div key={book.id} style={{ 
                  padding: '14px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-input)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }} onClick={() => navigate(`/agent/bookings/${book.id}`)}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{book.booking_reference}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{book.client?.name || 'No Client'} • {new Date(book.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#06B68A' }}>${Number(book.total_amount).toLocaleString()}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'hsl(var(--primary))', marginTop: '4px' }}>{book.status}</div>
                  </div>
                </div>
              ))}
              {(stats.recent_bookings || []).length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No bookings found.</p>}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Charges Section */}
      {(stats.recent_charges || []).length > 0 && (
        <Card title="Recent Payment Activity" icon={ReceiptText} subtitle="Latest Captured · Refunded · Chargeback transactions">
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
                        {charge.client_name} &nbsp;·&nbsp;
                        {charge.collected_at
                          ? new Date(charge.collected_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
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
        onClose={() => setToast({ message: '', type: 'success' })} 
      />
    </div>
  );
};

export default AgentDashboard;
