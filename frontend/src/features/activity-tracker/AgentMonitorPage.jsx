import React from 'react';
import AgentActivityTable from '../dashboard/AgentActivityTable';
import AdminMonitoringTable from '../dashboard/AdminMonitoringTable';
import { Activity } from 'lucide-react';
import { useAuthStore } from '../auth/useAuthStore';

const AgentMonitorPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.[0]?.name === 'admin';

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="premium-gradient-text" style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={32} style={{ color: '#60a5fa' }} />
          Team <span className="premium-gradient-text">Monitor</span>
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '14px' }}>
          Live operational telemetry and real-time agent activity tracking.
        </p>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '48px' }}>
          <AdminMonitoringTable />
        </div>
      )}
      
      <AgentActivityTable />
    </div>
  );
};

export default AgentMonitorPage;
