import api from '../../services/api';

const dashboardService = {
    getStats: () => api.get('/dashboard/stats'),
    getAgentMonitor: () => api.get('/dashboard/agent-monitor'),
    getAdminMonitor: () => api.get('/dashboard/admin-monitor')
};

export default dashboardService;
