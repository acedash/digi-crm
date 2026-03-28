import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Activity, 
  TrendingUp,
  Award,
  Phone,
  Plane,
  ArrowRightLeft,
  X
} from 'lucide-react';
import userService from '../users/userService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import dashboardService from './dashboardService';
import bookingService from '../bookings/bookingService';
import Toast from '../../components/ui/Toast';
import { useAuthStore } from '../auth/useAuthStore';

const SupervisorDashboard = () => {
  const { user } = useAuthStore();
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reassignModal, setReassignModal] = useState({ open: false, bookingId: null, currentAgentId: null });
  const [reassigning, setReassigning] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, statsRes] = await Promise.all([
        userService.getMyAgents(),
        dashboardService.getStats()
      ]);
      setAgents(agentsRes.data.data || agentsRes.data);
      setStats(statsRes.data.data);
    } catch {
      console.error('Failed to load supervisor data');
    } finally {
      setLoading(false);
    }
  };

  const openReassignModal = (booking) => {
    setReassignModal({
      open: true,
      bookingId: booking.id,
      currentAgentId: booking.agent_id,
    });
  };

  const closeReassignModal = () => {
    if (reassigning) return;
    setReassignModal({ open: false, bookingId: null, currentAgentId: null });
  };

  const handleReassign = async (event) => {
    const nextAgentId = event.target.value;
    if (!nextAgentId) return;

    try {
      setReassigning(true);
      await bookingService.reassignBooking(reassignModal.bookingId, nextAgentId);
      setToast({ message: 'Booking reassigned successfully', type: 'success' });
      setReassignModal({ open: false, bookingId: null, currentAgentId: null });
      await fetchData();
    } catch {
      setToast({ message: 'Failed to reassign booking', type: 'error' });
    } finally {
      setReassigning(false);
    }
  };

  const performance = stats?.agent_performance || [];
  const recentBookings = stats?.recent_bookings || [];
  const recentInquiries = stats?.recent_inquiries || [];

  const ReassignModal = () => {
    if (!reassignModal.open) return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '24px'
      }}>
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Reassign Booking</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Move this booking to another agent on your team.
              </p>
            </div>
            <Button variant="ghost" size="sm" icon={X} onClick={closeReassignModal} disabled={reassigning} />
          </div>

          <select
            defaultValue=""
            onChange={handleReassign}
            disabled={reassigning}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '14px',
              outline: 'none',
              cursor: reassigning ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="" disabled>{reassigning ? 'Reassigning...' : '-- Select Agent --'}</option>
            {user?.id !== reassignModal.currentAgentId && (
              <option value={user?.id}>Assign to myself ({user?.name})</option>
            )}
            {agents
              .filter((agent) => agent.id !== reassignModal.currentAgentId && agent.id !== user?.id)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            letterSpacing: '-1px',
            marginBottom: '8px'
          }}>
            Team <span className="premium-gradient-text">Console</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Monitor agent performance and oversee operational excellence.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
            Supervisor: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{user?.name || 'Unknown'}</span>
          </p>
        </div>
        <Button variant="outline" icon={Activity} size="sm" onClick={fetchData}>Refresh Sync</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <Card title="Clients with Bookings" subtitle="Handled by your team" icon={Users}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stats?.total_clients || 0}</p>
        </Card>
        <Card title="Bookings Created by Team" subtitle="Last 7 days" icon={TrendingUp}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa' }}>
            {stats?.weekly_bookings || 0}
          </p>
        </Card>
        <Card title="Calls Handled by Team" subtitle="Last 7 days" icon={Activity}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#4ade80' }}>
            {stats?.team_calls || 0}
          </p>
        </Card>
        <Card title="Airline Inquiry from Team" subtitle="Last 7 days" icon={Phone}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
            {stats?.team_airline_inquiries || 0}
          </p>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        <Card title="Agent Performance" subtitle="Calls handled, bookings created, airline inquiries" icon={Award}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', padding: '8px 0' }}>Loading performance data...</div>
            ) : performance.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '8px 0' }}>No agent performance data yet.</div>
            ) : (
              performance.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr repeat(3, 0.7fr)',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '14px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    background: 'var(--bg-input)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{agent.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{agent.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bookings Created</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{agent.bookings_count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calls Handled</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80' }}>{agent.calls_count}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Airline Inquiries</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>{agent.airline_inquiries_count}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Recent Inquiries" subtitle="Latest team inquiry activity" icon={Phone}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', padding: '8px 0' }}>Loading inquiries...</div>
            ) : recentInquiries.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '8px 0' }}>No recent inquiries found.</div>
            ) : (
              recentInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    background: 'var(--bg-input)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {inquiry.agent?.name || 'Unknown Agent'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {inquiry.call_type || 'Inquiry'}{inquiry.airline_inquiry ? ` • ${inquiry.airline_inquiry}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(inquiry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Client: {inquiry.client?.name || `${inquiry.client?.first_name || ''} ${inquiry.client?.last_name || ''}`.trim() || 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card title="Recent Team Bookings" subtitle="Latest bookings created by your team" icon={Plane}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', padding: '8px 0' }}>Loading recent bookings...</div>
          ) : recentBookings.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: '8px 0' }}>No recent team bookings found.</div>
          ) : (
            recentBookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 0.9fr 0.8fr auto',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '18px',
                  background: 'var(--bg-input)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{booking.booking_reference}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {booking.client?.name || `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.trim() || 'Unknown Client'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Agent</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {booking.agent?.name || 'Self/System'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>{booking.status}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ArrowRightLeft}
                  onClick={() => openReassignModal(booking)}
                >
                  Reassign
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      <ReassignModal />
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'error' })}
      />
    </div>
  );
};

export default SupervisorDashboard;
