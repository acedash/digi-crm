import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  ClipboardCheck, 
  AlertOctagon, 
  TrendingUp,
  Activity,
  ArrowRight,
  Target,
  RefreshCw
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import dashboardService from './dashboardService';

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
        <span style={{ marginLeft: '12px' }}>Analyzing Global Metrics...</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
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
            Global <span className="premium-gradient-text">Oversight</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            System-wide performance, security, and team metrics.
          </p>
        </div>
        <Button variant="outline" icon={Activity} size="sm">System logs</Button>
      </motion.div>

      {/* Primary Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card title="Staff Members" subtitle="Active agents" icon={Users}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total_staff}</span>
              <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginBottom: '6px' }}>Active</span>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card title="Approvals" subtitle="Pending validation" icon={ClipboardCheck}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#60a5fa' }}>{stats.pending_approvals}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Requires action</span>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <Card title="Monthly Revenue" subtitle="Current MTD" icon={TrendingUp}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)' }}>${Math.round(stats.monthly_revenue / 1000)}k</span>
              <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginBottom: '6px' }}>↑ {stats.revenue_growth}%</span>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          <Card title="Security Status" subtitle="Threat level" icon={Shield}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }}></div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>System Secure</span>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Insight Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={20} style={{ color: 'hsl(var(--primary))' }} /> Quarterly Targets
            </h3>
            <Button variant="ghost" size="sm" icon={ArrowRight}>View Detailed Reports</Button>
          </div>
          
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '24px', padding: '0 20px' }}>
            {stats.quarterly_revenue.map((item, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.min(100, (item.total / 50000) * 100)}%` }}
                  transition={{ delay: 0.5 + (i * 0.1), duration: 0.8 }}
                  style={{ 
                    width: '100%', 
                    background: i === stats.quarterly_revenue.length - 1 ? 'hsl(var(--primary))' : 'var(--bg-input)', 
                    borderRadius: '8px 8px 4px 4px' 
                  }}
                />
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{item.month.substring(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>Critical Alerts</h3>
          <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', gap: '12px' }}>
            <AlertOctagon size={20} style={{ color: '#ef4444' }} />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Server Backup Notice</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>scheduled for 02:00 AM</p>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No other unresolved issues</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

