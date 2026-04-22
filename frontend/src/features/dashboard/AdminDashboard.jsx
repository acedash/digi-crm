import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ClipboardList, 
  PhoneCall, 
  CircleDollarSign, 
  RefreshCw, 
  Calendar as CalendarIcon,
  Settings,
  Shield,
  Layout,
  Clock,
  Mail,
  UserPlus,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import dashboardService from './dashboardService';
import AdminMonitoringTable from './AdminMonitoringTable';
import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const COLORS = [
  '#06B68A', // Emerald
  '#06B68A', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#10b981', // Teal
  '#f43f5e', // Rose
  '#6366f1', // Indigo
  '#0ea5e9', // Sky
  '#ec4899', // Pink
  '#f97316', // Orange
  '#14b8a6'  // Cyan
];


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Independent stats periods
  const [bookPeriod, setBookPeriod] = useState('daily');
  const [callPeriod, setCallPeriod] = useState('daily');
  const [revPeriod, setRevPeriod] = useState('daily');

  // Independent stats data
  const [bookStats, setBookStats] = useState(null);
  const [callStats, setCallStats] = useState(null);
  const [revStats, setRevStats] = useState(null);

  useEffect(() => {
    if (period === 'custom') {
      if (customStart && customEnd) {
        fetchStats();
      }
    } else {
      fetchStats();
    }
  }, [period, customStart, customEnd]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getStats(period, customStart, customEnd);
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch admin stats', error);
    } finally {
      setLoading(false);
    }
  };

  const Trend = ({ value }) => {
    if (value === 0 || value === undefined) return null;
    const isPositive = value > 0;
    return (
      <span style={{ 
        fontSize: '12px', 
        fontWeight: 700, 
        color: isPositive ? '#06B68A' : '#ef4444',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        marginLeft: '8px',
        background: isPositive ? 'rgba(6, 182, 138, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        padding: '2px 6px',
        borderRadius: '6px'
      }}>
        {isPositive ? '↑' : '↓'} {Math.abs(value)}% <span style={{fontWeight: 500, fontSize: '10px', opacity: 0.8, marginLeft: '2px'}}>vs prev</span>
      </span>
    );
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={32} />
        <span style={{ marginLeft: '12px' }}>Loading admin dashboard...</span>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Staff Members',
      subtitle: `${stats.staff.active} active right now`,
      value: stats.staff.total,
      growth: stats.staff.growth,
      icon: Users,
      color: '#06B68A',
      onClick: () => navigate('/admin/users')
    },
    {
      title: 'Clients',
      subtitle: `${stats.clients.period_count} new this ${period}`,
      value: stats.clients.total,
      growth: stats.clients.growth,
      icon: Users,
      color: '#06B68A',
      onClick: () => navigate('/admin/clients')
    },
    {
      title: 'Bookings',
      subtitle: `${stats.bookings.count_trend.current} created this ${period}`,
      value: stats.bookings.total,
      growth: stats.bookings.growth,
      icon: ClipboardList,
      color: '#06B68A',
      onClick: () => navigate('/admin/bookings')
    },
    {
      title: 'Call Logs',
      subtitle: `${stats.calls.period_count} logs this ${period}`,
      value: stats.calls.total,
      growth: stats.calls.growth,
      icon: PhoneCall,
      color: '#06B68A',
      onClick: () => navigate('/admin/call-logs')
    },
    {
      title: 'Revenue Overview',
      subtitle: `Revenue this ${period}`,
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(stats.revenue.period_total) || 0),
      growth: stats.revenue.growth,
      icon: CircleDollarSign,
      color: '#06B68A',
    },
    {
      title: 'Daily Revenue',
      subtitle: 'Collected today by admin',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(stats.revenue.daily) || 0),
      icon: CircleDollarSign,
      color: '#06B68A',
      onClick: () => navigate('/admin/charge-queue')
    },
  ];

  const periods = [
    { id: 'all', label: 'All Time' },
    { id: 'daily', label: 'Daily' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom Date' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Admin <span className="premium-gradient-text">Dashboard</span>
            {loading && <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }}/>}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 500 }}>
            Overview of overall performance and business health.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: period === p.id ? 'var(--bg-card)' : 'transparent',
                  color: period === p.id ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: period === p.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <CalendarIcon size={16} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ background: 'var(--bg-input)', border: 'none', padding: '6px', borderRadius: '6px', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ background: 'var(--bg-input)', border: 'none', padding: '6px', borderRadius: '6px', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {statCards.map((item) => (
          <div 
            key={item.title} 
            onClick={item.onClick}
            style={{ cursor: item.onClick ? 'pointer' : 'default', transition: 'all 0.2s' }}
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


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'stretch' }}>
        {stats.revenue_trends && stats.revenue_trends.length > 0 && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '24px' }}>Global Revenue Trends (1 Year)</h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={stats.revenue_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} 
                    tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      backdropFilter: 'blur(8px)',
                      borderRadius: '16px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#06B68A', fontWeight: 800, fontSize: '14px' }}
                    labelStyle={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Monthly Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#06B68A" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: '#06B68A', strokeWidth: 2, stroke: 'var(--bg-card)' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#06B68A' }}
                    filter="drop-shadow(0px 4px 8px rgba(6, 182, 138, 0.4))"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {stats?.booking_status_trends && stats.booking_status_trends.length > 0 && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '24px' }}>Pending vs Confirmed Booking</h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stats.booking_status_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                    itemStyle={{ fontWeight: 700 }}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="Confirmed" fill="#06B68A" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Pending" fill="#06B68A" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {stats.booking_status_distribution && stats.booking_status_distribution.length > 0 && (
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Booking Statuses</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Current period distribution</p>
            <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={stats.booking_status_distribution}
                    cx="50%"
                    cy="40%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.booking_status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                    itemStyle={{ color: 'var(--text-main)', fontWeight: 700 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ 
                      paddingTop: '20px',
                      fontSize: '12px'
                    }}
                    formatter={(value, entry) => (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px', whiteSpace: 'nowrap' }}>
                        {value} ({entry.payload.value})
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Ready To Charge</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Approved authorizations waiting for admin collection.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/charge-queue')}>
            Open Charge Queue
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(stats.charge_queue || []).length === 0 ? (
            <div style={{ padding: '24px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
              No approved authorizations are waiting to be charged.
            </div>
          ) : (
            stats.charge_queue.map((auth) => (
              <div
                key={auth.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.8fr',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border-color)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {auth.bookings?.[0]?.booking_reference || `Authorization #${auth.id}`}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {auth.client?.name || `${auth.client?.first_name || ''} ${auth.client?.last_name || ''}`.trim() || 'Unknown Client'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</div>
                  <div style={{ fontWeight: 700, color: (auth.consent_snapshot?.authorization_type || auth.metadata?.authorization_type) === 'change_charge' ? '#f59e0b' : '#059669', marginTop: '4px' }}>
                    {(auth.consent_snapshot?.authorization_type || auth.metadata?.authorization_type) === 'change_charge'
                      ? 'Change Charge Approval'
                      : 'Initial Approval By Client'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: auth.currency || 'USD' }).format(Number(auth.total_amount) || 0)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin/charge-queue')}>
                    Review
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Recent Bookings</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Latest bookings recorded in the system.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(stats.recent_bookings || []).length === 0 ? (
            <div style={{ padding: '32px 0', color: 'var(--text-muted)', textAlign: 'center' }}>No bookings found.</div>
          ) : (
            stats.recent_bookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border-color)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{booking.booking_reference}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {booking.client?.name || `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim() || 'Unknown Client'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Agent</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
                    {booking.agent?.name || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ fontWeight: 700, color: '#06B68A', marginTop: '4px' }}>
                    {booking.status === 'Pending' ? 'Email Send Pending' : booking.status}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: booking.currency || 'USD' }).format(Number(booking.total_amount) || 0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AdminMonitoringTable />
    </div>
  );
};

export default AdminDashboard;
