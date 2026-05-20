import api from '../../services/api';

const dashboardService = {
    getStats: (period = 'monthly', startDate = null, endDate = null, mode = null, config = {}) => {
        let url = `/dashboard/stats?period=${period}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        if (mode) url += `&mode=${mode}`;
        return api.get(url, config);
    },
    getAgentMonitor: (period = 'live', startDate = null, endDate = null, config = {}) => {
        let url = `/dashboard/agent-monitor?period=${period}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        return api.get(url, config);
    },
    getAdminMonitor: (period = 'live', startDate = null, endDate = null, config = {}) => {
        let url = `/dashboard/admin-monitor?period=${period}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        return api.get(url, config);
    },
    getAgentReport: (agentId, period = 'daily', startDate = null, endDate = null, config = {}) => {
        let url = `/dashboard/agent-report/${agentId}?period=${period}`;
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        return api.get(url, config);
    },
    getAttendanceReport: (month, year, config = {}) => {
        return api.get(`/dashboard/attendance-report?month=${month}&year=${year}`, config);
    }
};

export default dashboardService;
