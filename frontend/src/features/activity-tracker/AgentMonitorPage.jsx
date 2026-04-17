import React, { useState, useEffect } from 'react';
import AgentActivityTable from '../dashboard/AgentActivityTable';
import AdminMonitoringTable from '../dashboard/AdminMonitoringTable';
import { 
  Activity, 
  Users, 
  ClipboardList, 
  PhoneCall, 
  CircleDollarSign,
  TrendingUp,
  RefreshCw 
} from 'lucide-react';
import { useAuthStore } from '../auth/useAuthStore';
import Card from '../../components/ui/Card';
import dashboardService from '../dashboard/dashboardService';

const AgentMonitorPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.[0]?.name === 'admin';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monitoringSummary, setMonitoringSummary] = useState({ supervisors: 0, active: 0, break: 0 });

  const [globalPeriod, setGlobalPeriod] = useState('daily');

  // Independent stats data
  const [bookStats, setBookStats] = useState(null);
  const [callStats, setCallStats] = useState(null);
  const [revStats, setRevStats] = useState(null);

  useEffect(() => {
    fetchMainStats();
  }, []);

  const fetchMainStats = async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getStats('daily');
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

  const fetchLocalizedStats = async (p) => {
    try {
      const response = await dashboardService.getStats(p);
      const data = response.data.data;
      setBookStats(data.bookings);
      setCallStats(data.calls);
      setRevStats(data.revenue);
    } catch (error) {
      console.error(`Failed to fetch stats for period ${p}`, error);
    }
  };

  const statCards = stats ? [
    {
      title: 'Bookings Created',
      subtitle: `Created this ${globalPeriod}`,
      value: bookStats?.total || stats.bookings.total,
      growth: bookStats?.growth || stats.bookings.growth,
      icon: ClipboardList,
      color: '#06B68A',
    },
    {
      title: 'Calls Picked',
      subtitle: `Logs this ${globalPeriod}`,
      value: callStats?.total || stats.calls.total,
      growth: callStats?.growth || stats.calls.growth,
      icon: PhoneCall,
      color: '#f59e0b',
    },
    {
      title: 'Revenue',
      subtitle: `Revenue this ${globalPeriod}`,
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(revStats?.period_total || stats.revenue.period_total) || 0),
      growth: revStats?.growth || stats.revenue.growth,
      icon: CircleDollarSign,
      color: '#06B68A',
    },
  ] : [];

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
        <TrendingUp size={12} style={{ transform: isPositive ? 'none' : 'rotate(180deg)' }} />
        {isPositive ? '+' : ''}{value}%
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ marginBottom: '0' }}>
          <h1 className="premium-gradient-text" style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={32} style={{ color: '#60a5fa' }} />
            Team Activity <span className="premium-gradient-text">Monitor</span>
            {loading && <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }}/>}
          </h1>
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
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-12px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '4px 8px 4px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period:</span>
          <select
            value={globalPeriod}
            onChange={(e) => { setGlobalPeriod(e.target.value); fetchLocalizedStats(e.target.value); }}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-main)', fontSize: '12px', fontWeight: 700, padding: '4px 2px 4px 4px', cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
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
            <AdminMonitoringTable onSummaryChange={setMonitoringSummary} />
          </div>
        )}
        
        <div>
          <AgentActivityTable />
        </div>
      </div>
    </div>
  );
};

export default AgentMonitorPage;
