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
  CheckCircle2,
  CircleDollarSign,
  Mail
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import activityService from '../activity-tracker/activityService';
import Toast from '../../components/ui/Toast';

const AgentDashboard = () => {
  const MotionDiv = motion.div;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('active');
  const [activities, setActivities] = useState([]);
  const [lastActivityTime, setLastActivityTime] = useState(null);
  const [elapsedStatusTime, setElapsedStatusTime] = useState('00:00:00');
  
  const [baseBreakdown, setBaseBreakdown] = useState({ active: 0, on_call: 0, break: 0, idle: 0 });
  const [liveBreakdown, setLiveBreakdown] = useState({ active: '00:00:00', on_call: '00:00:00', break: '00:00:00', idle: '00:00:00', total: '00:00:00' });
  
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchStats();
    fetchStatus();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getStats();
      setStats(response.data.data);
    } catch (e) {
      console.error('Failed to fetch agent stats', e);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <p>Syncing your performance metrics...</p>
      </div>
    );
  }

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
          background: 'linear-gradient(135deg, hsla(var(--primary), 0.1) 0%, var(--bg-input) 100%)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                  padding: '8px 16px', borderRadius: '100px', 
                  background: (currentStatus === 'Break' || currentStatus === 'on_break') ? 'rgba(239, 68, 68, 0.14)' : 
                              (currentStatus === 'On Call' || currentStatus === 'on_call') ? 'rgba(234, 179, 8, 0.14)' : 
                              (currentStatus === 'Idle' || currentStatus === 'idle') ? 'rgba(156, 163, 175, 0.14)' : 
                              'rgba(59, 130, 246, 0.14)', 
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
                Good Morning, <span className="premium-gradient-text">{userName}</span>
              </h1>
              <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '500px', lineHeight: '1.6' }}>
                You have logged <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{stats.my_bookings_count} bookings</span> totaling <span style={{ color: '#4ade80', fontWeight: 700 }}>${stats.my_revenue.toLocaleString()}</span>, with <span style={{ color: '#60a5fa', fontWeight: 700 }}>${Number(stats.daily_revenue || 0).toLocaleString()}</span> booked today.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
            <Button variant="primary" icon={Plane}>Plan New Trip</Button>
            <Button variant="outline" icon={FileText}>View Queue</Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div style={{ 
          position: 'absolute', right: '-40px', top: '-40px', 
          width: '300px', height: '300px', 
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
      </MotionDiv>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px' }}>
        <Card title="Activity Log" icon={Clock}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activities.map((activity, idx) => (
              <div key={idx} style={{ 
                padding: '12px', 
                background: 'var(--bg-card)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: activity.activity_type.includes('break') ? '#eab308' : (activity.activity_type === 'login' ? '#4ade80' : '#60a5fa')
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
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Operations Shortcuts</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Streamlined workflow</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { title: "Register Client", desc: "Onboard a new traveler", icon: UserPlus, color: "#60a5fa" },
              { title: "Browse Routes", desc: "Explore curated packages", icon: Compass, color: "#f472b6" },
              { title: "Email Templates", desc: "Manage client communications", icon: Mail, color: "#10b981", onClick: () => navigate('/agent/settings') }
            ].map((action, idx) => (
              <MotionDiv 
                key={idx}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Card onClick={action.onClick} style={{ cursor: action.onClick ? 'pointer' : 'default' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '20px', color: action.color
                  }}>
                    <action.icon size={24} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{action.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{action.desc}</p>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(var(--primary))' }}>LAUNCH</span>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  </div>
                </Card>
              </MotionDiv>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(96, 165, 250, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
            <CircleDollarSign size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Daily Revenue</p>
            <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(stats.daily_revenue) || 0)}
            </h4>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', alignItems: 'center', background: 'linear-gradient(135deg, hsla(var(--primary), 0.05) 0%, transparent 100%)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Gross Logged In</p>
            <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{liveBreakdown.total}</h4>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Status</p>
            <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80', fontFamily: 'monospace' }}>{liveBreakdown.active}</h4>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(250, 204, 21, 0.2)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(250, 204, 21, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#facc15' }}>
            <Phone size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>On Calls</p>
            <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#facc15', fontFamily: 'monospace' }}>{liveBreakdown.on_call}</h4>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(248, 113, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
            <Coffee size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>On Break</p>
            <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#f87171', fontFamily: 'monospace' }}>{liveBreakdown.break}</h4>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(156, 163, 175, 0.2)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(156, 163, 175, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Time Idle</p>
            <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#9ca3af', fontFamily: 'monospace' }}>{liveBreakdown.idle}</h4>
          </div>
        </div>
      </div>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />
    </div>
  );
};

// Simple Fallback for missing icons
const ShieldCheck = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
);

export default AgentDashboard;
