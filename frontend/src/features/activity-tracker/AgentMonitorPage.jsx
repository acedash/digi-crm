import React, { useState, useEffect } from 'react';
import AgentActivityTable from '../dashboard/AgentActivityTable';
import AdminMonitoringTable from '../dashboard/AdminMonitoringTable';
import SessionAttendanceTable from '../dashboard/SessionAttendanceTable';
import {
  Activity,
  Users,
  ClipboardList,
  PhoneCall,
  CircleDollarSign,
  Calendar as CalendarIcon,
  RefreshCw,
  Filter,
  Clock,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../auth/useAuthStore';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import dashboardService from '../dashboard/dashboardService';

import AgentReportSlideOver from '../dashboard/components/AgentReportSlideOver';
import AttendanceReport from './AttendanceReport';
import Button from '../../components/ui/Button';
import { useWalkthroughStore } from '../../store/walkthroughStore';

const AgentMonitorPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.[0]?.name === 'admin';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monitoringSummary, setMonitoringSummary] = useState({ supervisors: 0, active: 0, break: 0, supActive: 0, supBreak: 0 });
  const [statsPeriod, setStatsPeriod] = useState('daily');
  const [statsStart, setStatsStart] = useState(new Date().toISOString().split('T')[0]);
  const [statsEnd, setStatsEnd] = useState(new Date().toISOString().split('T')[0]);

  const [supPeriod, setSupPeriod] = useState('daily');
  const [supStart, setSupStart] = useState('');
  const [supEnd, setSupEnd] = useState('');

  const [teamPeriod, setTeamPeriod] = useState('daily');
  const [teamStart, setTeamStart] = useState('');
  const [teamEnd, setTeamEnd] = useState('');

  const [attPeriod, setAttPeriod] = useState('daily');
  const [attStart, setAttStart] = useState('');
  const [attEnd, setAttEnd] = useState('');

  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFilters, setReportFilters] = useState({ period: 'daily', start: null, end: null });
  const [showAttendance, setShowAttendance] = useState(false);

  // Independent stats data
  const [bookStats, setBookStats] = useState(null);
  const [callStats, setCallStats] = useState(null);
  const [revStats, setRevStats] = useState(null);

  useEffect(() => {
    fetchMainStats(statsPeriod, statsStart, statsEnd);
  }, [statsPeriod, statsStart, statsEnd]);

  const fetchMainStats = async (period = 'daily', start = null, end = null) => {
    setLoading(true);
    try {
      const response = await dashboardService.getStats(period, start, end);
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

  const handlePeriodChange = (type, section) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    const weeklyDate = new Date();
    weeklyDate.setDate(weeklyDate.getDate() - 7);
    const lastWeek = weeklyDate.toISOString().split('T')[0];
    const monthlyDate = new Date();
    monthlyDate.setMonth(monthlyDate.getMonth() - 1);
    const lastMonth = monthlyDate.toISOString().split('T')[0];

    let start = '';
    let end = '';

    if (type === 'daily') { start = today; end = today; }
    else if (type === 'yesterday') { start = yesterday; end = yesterday; }
    else if (type === 'weekly') { start = lastWeek; end = today; }
    else if (type === 'monthly') { start = lastMonth; end = today; }
    else if (type === 'all') { start = ''; end = ''; }
    else if (type === 'custom') { start = today; end = today; }

    if (section === 'sup') {
      setSupPeriod(type);
      setSupStart(start);
      setSupEnd(end);
    } else if (section === 'att') {
      setAttPeriod(type);
      setAttStart(start);
      setAttEnd(end);
    } else if (section === 'stats') {
      setStatsPeriod(type);
      setStatsStart(start);
      setStatsEnd(end);
    } else {
      setTeamPeriod(type);
      setTeamStart(start);
      setTeamEnd(end);
    }
  };

  const handleViewReport = (id, period, start, end) => {
    setSelectedAgentId(id);
    setReportFilters({ period: period === 'live' ? 'daily' : period, start, end });
    setIsReportOpen(true);
  };

  const startTeamMonitorTour = () => {
    const { startTour } = useWalkthroughStore.getState();
    startTour([
      {
        target: '#team-monitor-title-area',
        title: 'Team Activity Monitor 📈',
        content: "Monitor your team's activity, performance, and summary stats in real time.",
        position: 'bottom'
      },
      {
        target: '#team-monitor-stats',
        title: 'Key Metrics',
        content: 'Quickly view total bookings, calls picked, and revenue for the selected period.',
        position: 'bottom',
        offset: 20
      },
      {
        target: '#live-team-activity-title-text',
        title: 'Activity Tables',
        content: 'View detailed activity for supervisors and agents, including live status and sessions.',
        position: 'bottom',
        scrollBlock: 'center'
      },
      {
        target: '#team-monitor-attendance-btn',
        title: 'Attendance Report',
        content: 'Toggle the Attendance Report to view detailed session logs, breaks, and hours worked.',
        position: 'bottom'
      }
    ]);
  };

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

  const statCards = stats ? [
    {
      title: 'Bookings Created',
      subtitle: statsPeriod === 'all' ? 'All Time' : statsPeriod === 'daily' ? 'Created Today' : statsPeriod === 'yesterday' ? 'Created Yesterday' : statsPeriod === 'weekly' ? 'Last 7 Days' : statsPeriod === 'monthly' ? 'Last 30 Days' : 'Custom Period',
      value: bookStats?.total || stats?.bookings?.total || 0,
      growth: bookStats?.growth || stats?.bookings?.growth || 0,
      icon: ClipboardList,
      color: '#06B68A',
    },
    {
      title: 'Calls Picked',
      subtitle: statsPeriod === 'all' ? 'All Time' : statsPeriod === 'daily' ? 'Logs Today' : statsPeriod === 'yesterday' ? 'Logs Yesterday' : statsPeriod === 'weekly' ? 'Last 7 Days' : statsPeriod === 'monthly' ? 'Last 30 Days' : 'Custom Period',
      value: callStats?.total || stats?.calls?.total || 0,
      growth: callStats?.growth || stats?.calls?.growth || 0,
      icon: PhoneCall,
      color: '#f59e0b',
    },
    {
      title: 'Revenue',
      subtitle: statsPeriod === 'all' ? 'Total Revenue' : statsPeriod === 'daily' ? 'Revenue Today' : statsPeriod === 'yesterday' ? 'Revenue Yesterday' : statsPeriod === 'weekly' ? 'Last 7 Days' : statsPeriod === 'monthly' ? 'Last 30 Days' : 'Custom Period',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(revStats?.period_total || stats?.revenue?.period_total) || 0),
      growth: revStats?.growth || stats?.revenue?.growth || 0,
      icon: CircleDollarSign,
      color: '#06B68A',
    },
  ] : [];

  const PeriodFilterBar = ({ period, start, end, onPeriodChange, onCustomStartChange, onCustomEndChange, section }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', maxWidth: '100%' }}>
      <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto', maxWidth: '100%', scrollbarWidth: 'none' }}>
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id, section)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              whiteSpace: 'nowrap',
              background: period === p.id ? 'var(--bg-card)' : 'transparent',
              color: period === p.id ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)', animation: 'fadeIn 0.3s ease', flexWrap: 'wrap' }}>
          <div style={{ width: '150px' }}>
            <Input
              type="date"
              icon={CalendarIcon}
              value={start}
              onChange={(e) => onCustomStartChange(e.target.value)}
              style={{ marginBottom: 0 }}
              inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, padding: '0 4px' }}>to</span>
          <div style={{ width: '150px' }}>
            <Input
              type="date"
              icon={CalendarIcon}
              value={end}
              onChange={(e) => onCustomEndChange(e.target.value)}
              style={{ marginBottom: 0 }}
              inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const AttendanceFilterBar = ({ period, start, end, onPeriodChange, onCustomStartChange, onCustomEndChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', maxWidth: '100%' }}>
      <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto', maxWidth: '100%', scrollbarWidth: 'none' }}>
        {[
          { id: 'daily', label: 'Daily' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'custom', label: 'Custom Date' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id, 'att')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              whiteSpace: 'nowrap',
              background: period === p.id ? 'var(--bg-card)' : 'transparent',
              color: period === p.id ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 700,
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border-color)', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ width: '180px' }}>
            <Input
              type="date"
              icon={CalendarIcon}
              value={start}
              onChange={(e) => {
                onCustomStartChange(e.target.value);
                onCustomEndChange(e.target.value);
              }}
              style={{ marginBottom: 0 }}
              inputStyle={{ padding: '8px 12px', paddingLeft: '44px', fontSize: '13px', background: 'var(--bg-input)', borderRadius: '10px' }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div id="team-monitor-title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Activity size={32} style={{ color: '#06B68A' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
              <span style={{ color: 'var(--text-main)' }}>Team</span> <span className="premium-gradient-text">Activity Monitor</span>
            </h1>
            {loading && <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '15px', fontWeight: 500 }}>
            Monitor activity and performance in real time.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', marginLeft: 'auto' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={startTeamMonitorTour}
              icon={HelpCircle}
              style={{ borderRadius: '100px', fontWeight: 700, color: 'hsl(var(--primary))' }}
            >
              Show Guide
            </Button>
            <Button
              id="team-monitor-attendance-btn"
              variant={showAttendance ? "primary" : "secondary"}
              icon={CalendarIcon}
              onClick={() => setShowAttendance(!showAttendance)}
            >
              {showAttendance ? "Back to Monitor" : "Attendance Report"}
            </Button>
          </div>

          {!showAttendance && (
            <PeriodFilterBar
              period={statsPeriod}
              start={statsStart}
              end={statsEnd}
              onPeriodChange={handlePeriodChange}
              onCustomStartChange={setStatsStart}
              onCustomEndChange={setStatsEnd}
              section="stats"
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.02)', padding: '12px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', opacity: 0.9 }}>
          <span style={{ fontSize: '16px' }}>{monitoringSummary.supActive}</span> Active Supervisors
        </div>
        <div style={{ color: 'var(--border-color)' }}>|</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', opacity: 0.9 }}>
          <span style={{ fontSize: '16px' }}>{monitoringSummary.supBreak}</span> Supervisors On Break
        </div>
        <div style={{ color: 'var(--border-color)' }}>|</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
          <span style={{ fontSize: '16px' }}>{monitoringSummary.active}</span> Active Agents
        </div>
        <div style={{ color: 'var(--border-color)' }}>|</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
          <span style={{ fontSize: '16px' }}>{monitoringSummary.break}</span> Agents On Break
        </div>
      </div>

      {showAttendance ? (
        <AttendanceReport onClose={() => setShowAttendance(false)} />
      ) : (
        <>
          <div id="team-monitor-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
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

          <div id="team-monitor-tables" style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {isAdmin && (
              <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '24px', borderRadius: '32px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Filter size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Supervisor Activity</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Individual metrics for team leads</p>
                    </div>
                  </div>
                  <PeriodFilterBar
                    period={supPeriod}
                    start={supStart}
                    end={supEnd}
                    onPeriodChange={handlePeriodChange}
                    onCustomStartChange={setSupStart}
                    onCustomEndChange={setSupEnd}
                    section="sup"
                  />
                </div>
                <AdminMonitoringTable
                  onSummaryChange={setMonitoringSummary}
                  period={supPeriod}
                  startDate={supStart}
                  endDate={supEnd}
                  onViewReport={handleViewReport}
                />
              </div>
            )}

            <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '24px', borderRadius: '32px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Filter size={20} />
                  </div>
                  <div>
                    <h2 id="live-team-activity-title-text" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Live Team Activity</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Real-time agent productivity</p>
                  </div>
                </div>
                <PeriodFilterBar
                  period={teamPeriod}
                  start={teamStart}
                  end={teamEnd}
                  onPeriodChange={handlePeriodChange}
                  onCustomStartChange={setTeamStart}
                  onCustomEndChange={setTeamEnd}
                  section="team"
                />
              </div>
              <AgentActivityTable
                onViewReport={handleViewReport}
                period={teamPeriod}
                startDate={teamStart}
                endDate={teamEnd}
                onSummaryChange={!isAdmin ? setMonitoringSummary : null}
              />
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '24px', borderRadius: '32px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>Session & Attendance</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Login, logout and break durations</p>
                  </div>
                </div>
                <AttendanceFilterBar
                  period={attPeriod}
                  start={attStart}
                  end={attEnd}
                  onPeriodChange={handlePeriodChange}
                  onCustomStartChange={setAttStart}
                  onCustomEndChange={setAttEnd}
                />
              </div>
              <SessionAttendanceTable
                period={attPeriod}
                startDate={attStart}
                endDate={attEnd}
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
