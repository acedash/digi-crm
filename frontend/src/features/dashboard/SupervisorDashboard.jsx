import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Activity, 
  TrendingUp,
  Award,
  Phone,
  Plane,
  CircleDollarSign,
  ArrowRightLeft,
  X,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight
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
  BarChart,
  Bar,
  Legend
} from 'recharts';
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
  
  // Filtering state
  const [period, setPeriod] = useState('monthly');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  
  const [reassignModal, setReassignModal] = useState({ open: false, bookingId: null, currentAgentId: null });
  const [selectedReassignAgent, setSelectedReassignAgent] = useState('');
  const [handoffRemark, setHandoffRemark] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = period === 'custom' ? customRange.start : null;
      const end = period === 'custom' ? customRange.end : null;

      const [agentsRes, statsRes] = await Promise.all([
        userService.getMyAgents(),
        dashboardService.getStats(period, start, end)
      ]);
      setAgents(agentsRes.data.data || agentsRes.data);
      setStats(statsRes.data.data);
    } catch {
      console.error('Failed to load supervisor data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomFilter = () => {
    if (customRange.start && customRange.end) {
      fetchData();
    }
  };

  const openReassignModal = (booking) => {
    setReassignModal({
      open: true,
      bookingId: booking.id,
      currentAgentId: booking.agent_id,
    });
    setSelectedReassignAgent('');
    setHandoffRemark('');
  };

  const closeReassignModal = () => {
    if (reassigning) return;
    setReassignModal({ open: false, bookingId: null, currentAgentId: null });
  };

  const handleReassign = async () => {
    if (!selectedReassignAgent) {
      setToast({ message: 'Please select an agent.', type: 'error' });
      return;
    }
    try {
      setReassigning(true);
      await bookingService.reassignBooking(reassignModal.bookingId, selectedReassignAgent, handoffRemark.trim());
      setToast({ message: 'Booking reassigned successfully', type: 'success' });
      setReassignModal({ open: false, bookingId: null, currentAgentId: null });
      await fetchData();
    } catch (error) {
      setToast({ message: error?.response?.data?.message || 'Reassignment failed', type: 'error' });
    } finally {
      setReassigning(false);
    }
  };

  const revenueData = stats?.revenue_trends || [];
  const statusData = stats?.status_breakdown || [];
  const inquiryTags = stats?.inquiry_tags || [];
  
  const COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#8b5cf6', '#f87171'];

  const renderFilterBar = () => (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap',
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: '16px',
      background: 'var(--bg-card)',
      padding: '16px 24px',
      borderRadius: '20px',
      border: '1px solid var(--border-color)',
      marginBottom: '8px'
    }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {['daily', 'weekly', 'monthly', 'custom'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'capitalize',
              border: '1px solid var(--border-color)',
              background: period === p ? 'hsl(var(--primary))' : 'var(--bg-app)',
              color: period === p ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {p === 'daily' ? 'Today' : p}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>From:</span>
            <input 
              type="date" 
              value={customRange.start} 
              onChange={e => setCustomRange({...customRange, start: e.target.value})}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>To:</span>
            <input 
              type="date" 
              value={customRange.end} 
              onChange={e => setCustomRange({...customRange, end: e.target.value})}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '13px' }}
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleApplyCustomFilter}>Apply</Button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
        <Clock size={14} />
        Last synced: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ maxWidth: '700px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            letterSpacing: '-1px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Team <span className="premium-gradient-text">Console</span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '20px', color: 'var(--text-muted)', letterSpacing: '0' }}>Real-time</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.5' }}>
            Monitor agent performance, track bookings, and oversee overall team operations in real time.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Logged in as</div>
          <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>{user?.name}</div>
        </div>
      </div>

      {renderFilterBar()}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <Card title="Clients with Bookings" icon={Users}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#06B68A' }}>{stats?.total_clients || 0}</span>
            <Users size={40} style={{ opacity: 0.1, marginBottom: '-8px' }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Total number of clients handled by your team</div>
        </Card>

        <Card title="Team Bookings" icon={TrendingUp}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#06B68A' }}>{stats?.period_bookings || 0}</span>
            <TrendingUp size={40} style={{ opacity: 0.1, marginBottom: '-8px' }} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Bookings created by your team (Selected Period)</div>
        </Card>

        <Card title="Revenue Generated" icon={CircleDollarSign}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#06B68A' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats?.daily_revenue || 0)}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>Revenue generated {period === 'daily' ? 'today' : 'in selected period'}</div>
        </Card>

        <Card title="Inquiry Tags" icon={Phone}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '40px' }}>
            {inquiryTags.length > 0 ? inquiryTags.map(t => (
              <div key={t.tag} style={{ 
                padding: '4px 10px', 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-main)'
              }}>
                ({t.count}{(t.tag || '').toLowerCase().replace('inquiry', '')})
              </div>
            )) : <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No inquiries found</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>Latest inquiries by category (Selected Period)</div>
        </Card>
      </div>

      {/* Visual Activity Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <Card title="Monthly Revenue & Trends" subtitle="Team performance over the last 6 months" icon={TrendingUp}>
          <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Booking Status" subtitle="Team distribution" icon={CheckCircle2}>
          <div style={{ height: '300px', width: '100%', marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '-20px' }}>
              {statusData.map((item, idx) => (
                <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.status === 'Pending' ? 'Email Send Pending' : item.status} ({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {stats?.booking_status_trends && stats.booking_status_trends.length > 0 && (
          <Card title="Pending vs Confirmed" subtitle="Last 6 months closing trend" icon={TrendingUp}>
            <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.booking_status_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                    itemStyle={{ fontWeight: 700 }}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '10px' }} />
                  <Bar dataKey="Confirmed" fill="#34d399" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Pending" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Tables - Performance and Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <Card title="Agent Performance" subtitle="Track calls, bookings, and inquiries" icon={Award}>
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agent</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Login</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inquiries (Details)</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Revenue</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>KPIs</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading records...</td></tr>
                ) : stats?.agent_performance.map(agent => (
                  <tr key={agent.id} style={{ background: 'var(--bg-input)', transition: 'transform 0.2s' }}>
                    <td style={{ padding: '16px', borderRadius: '16px 0 0 16px', border: '1px solid var(--border-color)', borderRight: 'none' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{agent.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent.status === 'Active' ? '#22c55e' : '#f59e0b' }} />
                        {agent.status}
                      </div>
                    </td>
                    <td style={{ padding: '16px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{agent.login_time || '--'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {agent.inquiry_details?.length > 0 ? agent.inquiry_details.map(detail => (
                          <span key={detail.tag} style={{ 
                            padding: '2px 8px', 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '6px', 
                            fontSize: '10px', 
                            fontWeight: 700,
                            color: 'var(--text-main)'
                          }}>
                            {detail.count} {detail.tag}
                          </span>
                        )) : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{agent.inquiries_count} Total</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 800, color: '#22c55e', fontSize: '14px' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(agent.revenue || 0)}
                      </div>
                    </td>
                    <td style={{ padding: '16px', borderRadius: '0 16px 16px 0', border: '1px solid var(--border-color)', borderLeft: 'none' }}>
                       <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>CALLS</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#60a5fa' }}>{agent.calls_count}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>BOOKINGS</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#a855f7' }}>{agent.bookings_count}</div>
                          </div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <Card title="Recent Inquiries" subtitle="Latest team inquiries" icon={Phone}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {stats?.recent_inquiries.map(inq => (
                <div key={inq.id} style={{ 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-input)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inq.client?.name || 'New Lead'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Agent: {inq.agent?.name} • {
                        [
                          ...(Array.isArray(inq.call_type) ? inq.call_type : (inq.call_type ? [inq.call_type] : [])),
                          ...(Array.isArray(inq.airline_inquiry) ? inq.airline_inquiry : (inq.airline_inquiry ? [inq.airline_inquiry] : []))
                        ].filter(Boolean).join(', ') || 'General Inquiry'
                      }
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginTop: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Team Bookings" subtitle="Latest bookings created by your team" icon={Plane}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {stats?.recent_bookings.map(book => (
                <div key={book.id} style={{ 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-input)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'hsl(var(--primary))' }}>{book.booking_reference}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {book.client?.name} • ${book.total_amount}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '10px', 
                      fontWeight: 800,
                      background: book.status === 'Confirmed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                      color: book.status === 'Confirmed' ? '#22c55e' : '#60a5fa'
                    }}>
                      {book.status === 'Pending' ? 'Email Send Pending' : book.status}
                    </span>
                    <button 
                      onClick={() => openReassignModal(book)}
                      style={{ 
                        display: 'block', 
                        fontSize: '10px', 
                        color: 'var(--text-muted)', 
                        marginTop: '8px',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Reassign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {reassignModal.open && (
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
          <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Reassign Booking</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Select a team member to take over this booking.</p>
            
            <select
              value={selectedReassignAgent}
              onChange={(e) => setSelectedReassignAgent(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '16px' }}
            >
              <option value="">Select Agent</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <textarea 
              placeholder="Add handoff notes..." 
              value={handoffRemark}
              onChange={e => setHandoffRemark(e.target.value)}
              style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '12px', background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '20px', resize: 'none' }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button style={{ flex: 1 }} variant="ghost" onClick={closeReassignModal}>Cancel</Button>
              <Button style={{ flex: 1 }} variant="primary" onClick={handleReassign} isLoading={reassigning}>Reassign Now</Button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
    </div>
  );
};

export default SupervisorDashboard;
