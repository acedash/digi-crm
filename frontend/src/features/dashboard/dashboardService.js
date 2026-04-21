import api from '../../services/api';

const dashboardService = {
    getStats: (period = 'monthly', startDate = null, endDate = null) => {
        let url = `/dashboard/stats?period=${period}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        return api.get(url);
    },
    getAgentMonitor: () => api.get('/dashboard/agent-monitor'),
    getAdminMonitor: () => api.get('/dashboard/admin-monitor'),
    getAgentReport: (agentId) => api.get(`/dashboard/agent-report/${agentId}`)
};

export default dashboardService;
