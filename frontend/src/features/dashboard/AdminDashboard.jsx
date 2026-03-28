import React, { useEffect, useState } from 'react';
import { Users, ClipboardList, PhoneCall, CircleDollarSign, RefreshCw, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import dashboardService from './dashboardService';
import AdminMonitoringTable from './AdminMonitoringTable';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await dashboardService.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch admin stats', error);
    } finally {
      setLoading(false);
    }
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
      title: 'Staff Members',
      subtitle: `${stats.active_staff || 0} currently active`,
      value: stats.total_staff || 0,
      icon: Users,
      color: 'var(--text-main)',
    },
    {
      title: 'Clients',
      subtitle: 'All client records',
      value: stats.total_clients || 0,
      icon: Users,
      color: '#60a5fa',
    },
    {
      title: 'Bookings',
      subtitle: `${stats.pending_approvals || 0} pending`,
      value: stats.total_bookings || 0,
      icon: ClipboardList,
      color: '#10b981',
    },
    {
      title: 'Call Logs',
      subtitle: 'Recorded calls',
      value: stats.total_calls || 0,
      icon: PhoneCall,
      color: '#f59e0b',
    },
    {
      title: 'Monthly Revenue',
      subtitle: `${stats.revenue_growth >= 0 ? '+' : ''}${stats.revenue_growth || 0}% vs last month`,
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(stats.monthly_revenue) || 0),
      icon: CircleDollarSign,
      color: '#16a34a',
    },
    {
      title: 'Pending Approvals',
      subtitle: 'Needs attention',
      value: stats.pending_approvals || 0,
      icon: Clock,
      color: '#ef4444',
    },
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
        <Button variant="outline" icon={RefreshCw} size="sm" onClick={fetchStats}>
          Refresh
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {statCards.map((item) => (
          <Card key={item.title} title={item.title} subtitle={item.subtitle} icon={item.icon}>
            <div style={{ fontSize: '30px', fontWeight: 800, color: item.color }}>
              {item.value}
            </div>
          </Card>
        ))}
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
