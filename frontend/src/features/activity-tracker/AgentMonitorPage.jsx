import React, { useState, useEffect } from 'react';
import AgentActivityTable from '../dashboard/AgentActivityTable';
import AdminMonitoringTable from '../dashboard/AdminMonitoringTable';
import { 
  Activity, 
  Users, 
  ClipboardList, 
  PhoneCall, 
  CircleDollarSign,
  Calendar as CalendarIcon,
  RefreshCw 
} from 'lucide-react';
import { useAuthStore } from '../auth/useAuthStore';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import dashboardService from '../dashboard/dashboardService';

import AgentReportSlideOver from '../dashboard/components/AgentReportSlideOver';
import AttendanceReport from './AttendanceReport';
import Button from '../../components/ui/Button';

const AgentMonitorPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.[0]?.name === 'admin';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monitoringSummary, setMonitoringSummary] = useState({ supervisors: 0, active: 0, break: 0 });

  const [globalPeriod, setGlobalPeriod] = useState('daily');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState({ period: 'daily', start: null, end: null });
  const [showAttendance, setShowAttendance] = useState(false);

  // Independent stats data
  const [bookStats, setBookStats] = useState(null);
  const [callStats, setCallStats] = useState(null);
  const [revStats, setRevStats] = useState(null);

  useEffect(() => {
    if (globalPeriod === 'custom') {
      if (customStart && customEnd) {
        fetchMainStats();
      }
    } else {
      fetchMainStats();
    }
  }, [globalPeriod, customStart, customEnd]);

  const fetchMainStats = async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getStats(globalPeriod, customStart, customEnd);
      const data = response.data.data;
      setStats(data);
      setBookStats(data.bookings);
      setCallStats(data.calls);
      setRevStats(data.revenue);
    } catch (error) {
      console.error('Failed to fetch monitor stats', error);
    } finally {
      setLoading(false);
    }
  };


  const handleViewReport = (id, period, start, end) => {
    setSelectedAgentId(id);
    setReportFilters({ period: period === 'live' ? 'daily' : period, start, end });
    setIsReportOpen(true);
  };

  const statCards = stats ? [
    {
      title: 'Bookings Created',
      subtitle: `Created this ${globalPeriod}`,
      value: bookStats?.total || stats?.bookings?.total || 0,
      growth: bookStats?.growth || stats?.bookings?.growth || 0,
      icon: ClipboardList,
      color: '#06B68A',
    },
    {
      title: 'Calls Picked',
      subtitle: `Logs this ${globalPeriod}`,
      value: callStats?.total || stats?.calls?.total || 0,
      growth: callStats?.growth || stats?.calls?.growth || 0,
      icon: PhoneCall,
      color: '#f59e0b',
    },
    {
      title: 'Revenue',
      subtitle: `Revenue this ${globalPeriod}`,
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(revStats?.period_total || stats?.revenue?.period_total) || 0),
      growth: revStats?.growth || stats?.revenue?.growth || 0,
      icon: CircleDollarSign,
      color: '#06B68A',
    },
  ] : [];

  const periods = [
    { id: 'all', label: 'All Time' },
    { id: 'daily', label: 'Daily' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom Date' },
  ];

  const Trend = ({ value }) => {
    if (value === 0 || value === undefined) return null;
    const isPositive = value > 0;
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px', 
        fontSize: '12px', 
        fontWeight: 700, 
        color: isPositive ? '#10b981' : '#f87171',
        marginLeft: '4px'
      }}>
        {isPositive ? '↑' : '↓'}{Math.abs(value)}%
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Activity size={32} style={{ color: '#06B68A' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              <span className="premium-gradient-text">Team Activity Monitor</span>
            </h1>
            {loading && <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }}/>}
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '15px', fontWeight: 500 }}>
            Monitor activity and performance in real time.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6' }}>
              <span style={{ fontSize: '16px' }}>{monitoringSummary.supervisors}</span> Supervisors
            </div>
            <div style={{ color: 'var(--border-color)' }}>|</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
              <span style={{ fontSize: '16px' }}>{monitoringSummary.active}</span> Active Agents
            </div>
            <div style={{ color: 'var(--border-color)' }}>|</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
              <span style={{ fontSize: '16px' }}>{monitoringSummary.break}</span> On Break
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
           <Button 
              variant={showAttendance ? "primary" : "secondary"}
              icon={CalendarIcon}
              onClick={() => setShowAttendance(!showAttendance)}
            >
              {showAttendance ? "Back to Monitor" : "Attendance Report"}
            </Button>
        </div>
      </div>

      {showAttendance ? (
        <AttendanceReport onClose={() => setShowAttendance(false)} />
      ) : (
        <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', marginTop: '-60px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setGlobalPeriod(p.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: globalPeriod === p.id ? 'var(--bg-card)' : 'transparent',
                color: globalPeriod === p.id ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: globalPeriod === p.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {globalPeriod === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '160px' }}>
              <Input 
                type="date" 
                icon={CalendarIcon}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, padding: '0 4px' }}>to</span>
            <div style={{ width: '160px' }}>
              <Input 
                type="date" 
                icon={CalendarIcon}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ marginBottom: 0 }}
                inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {statCards.map((item) => (
          <div 
            key={item.title} 
            style={{ position: 'relative', transition: 'all 0.2s' }}
            className="hover:scale-[1.02]"
          >
            <Card title={item.title} subtitle={item.subtitle} icon={item.icon}>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <div style={{ fontSize: '30px', fontWeight: 800, color: item.color }}>
                  {item.value}
                </div>
                {item.growth !== undefined && <Trend value={item.growth} />}
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {isAdmin && (
          <div>
            <AdminMonitoringTable 
              onSummaryChange={setMonitoringSummary} 
              period={globalPeriod}
              startDate={customStart}
              endDate={customEnd}
            />
          </div>
        )}
        
        <div>
          <AgentActivityTable 
            onViewReport={handleViewReport} 
            period={globalPeriod}
            startDate={customStart}
            endDate={customEnd}
          />
        </div>
      </div>
      </>
      )}

      <AgentReportSlideOver 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        agentId={selectedAgentId}
        initialPeriod={reportFilters.period}
        initialStart={reportFilters.start}
        initialEnd={reportFilters.end}
      />
    </div>
  );
};

export default AgentMonitorPage;
