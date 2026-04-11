import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardList, PhoneCall, CircleDollarSign, RefreshCw, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import dashboardService from './dashboardService';
import AdminMonitoringTable from './AdminMonitoringTable';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getStats(period);
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch admin stats', error);
    } finally {
      setLoading(false);
    }
  };

  const Trend = ({ value }) => {
    if (value === 0) return null;
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
        {isPositive ? '↑' : '↓'} {Math.abs(value)}%
      </span>
    );
  };

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={32} />
        <span style={{ marginLeft: '12px' }}>Loading admin dashboard...</span>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Staff Member',
      subtitle: `${stats.staff.active} active right now`,
      value: stats.staff.total,
      growth: stats.staff.growth,
      icon: Users,
      color: 'var(--text-main)',
      onClick: () => navigate('/admin/users')
    },
    {
      title: 'Clients',
      subtitle: `${stats.clients.period_count} new this ${period}`,
      value: stats.clients.total,
      growth: stats.clients.growth,
      icon: Users,
      color: '#60a5fa',
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
      color: '#f59e0b',
      onClick: () => navigate('/admin/call-logs')
    },
    {
      title: 'Revenue Overview',
      subtitle: `Revenue vs previous ${period}`,
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
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
            Admin Overview
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Real-time operational summary across staff, bookings, clients, and calls.
          </p>
        </div>

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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {statCards.map((item) => (
          <div 
            key={item.title} 
            onClick={item.onClick}
            style={{ cursor: item.onClick ? 'pointer' : 'default' }}
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
                  <div style={{ fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                    {(auth.consent_snapshot?.authorization_type || auth.metadata?.authorization_type) === 'change_charge'
                      ? 'Change Charge'
                      : 'Initial Approval'}
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
                  <div style={{ fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>{booking.status}</div>
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
