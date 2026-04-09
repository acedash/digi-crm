import api from '../../services/api';

const dashboardService = {
    getStats: (period = 'monthly') => api.get(`/dashboard/stats?period=${period}`),
    getAgentMonitor: () => api.get('/dashboard/agent-monitor'),
    getAdminMonitor: () => api.get('/dashboard/admin-monitor')
};

export default dashboardService;
