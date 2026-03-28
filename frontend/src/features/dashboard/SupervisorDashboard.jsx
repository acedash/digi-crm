import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ClipboardCheck, 
  Activity, 
  Shield, 
  Mail,
  ChevronRight,
  TrendingUp,
  Award,
  Clock,
  UserX
} from 'lucide-react';
import userService from '../users/userService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import dashboardService from './dashboardService';

const SupervisorDashboard = () => {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error('Failed to load supervisor data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
      >
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
        </div>
        <Button variant="outline" icon={Activity} size="sm" onClick={fetchData}>Refresh Sync</Button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <Card title="Total Clients" subtitle="In your jurisdiction" icon={Users}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)' }}>{stats?.total_clients || 0}</p>
        </Card>
        <Card title="Weekly Bookings" subtitle="Team velocity" icon={TrendingUp}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa' }}>
            {stats?.weekly_bookings || 0}
          </p>
        </Card>
        <Card title="Team Calls" subtitle="Last 7 days" icon={Activity}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#4ade80' }}>
            {stats?.team_calls || 0}
          </p>
        </Card>
        <Card title="Pending Tasks" subtitle="Requires oversight" icon={ClipboardCheck}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#f87171' }}>
            {stats?.pending_tasks || 0}
          </p>
        </Card>
      </div>

      {/* Team Roster Section */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Team Roster</h2>
          <Button variant="ghost" size="sm" icon={Award}>Performance Leaderboard</Button>
        </div>

        <div className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          <div style={{ 
            padding: '20px 24px', 
            background: 'var(--bg-input)', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member Details</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Status</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.3)' }}>Syncing team data...</div>
              ) : agents.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.2)' }}>No agents are currently under your supervision.</div>
              ) : (
                agents.map((agent, idx) => (
                  <motion.div 
                    key={agent.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{ 
                      padding: '20px 24px', 
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="hover-brighten"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '12px', 
                        background: 'rgba(255, 255, 255, 0.05)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white'
                      }}>
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>{agent.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} /> {agent.email}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                          background: agent.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 
                                      agent.status === 'On Call' ? 'rgba(250, 204, 21, 0.1)' :
                                      agent.status === 'Break' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: agent.status === 'Active' ? '#4ade80' : 
                                 agent.status === 'On Call' ? '#facc15' :
                                 agent.status === 'Break' ? '#f87171' : 'var(--text-muted)',
                          border: `1px solid ${agent.status === 'Active' ? 'rgba(34, 197, 94, 0.2)' : 
                                                agent.status === 'On Call' ? 'rgba(250, 204, 21, 0.2)' :
                                                agent.status === 'Break' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                        }}>
                          {agent.status || 'Offline'}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" icon={UserX} onClick={() => alert('Reassignment interface...')}>
                        Reassign
                      </Button>
                      <ChevronRight size={18} style={{ color: 'rgba(255, 255, 255, 0.1)' }} />
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;

