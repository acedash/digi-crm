import api from '../../services/api';

const callLogService = {
  getCallLogs: (page = 1, scope = 'all', startDate = '', endDate = '') => {
    let url = `/call-logs?page=${page}`;
    if (scope && scope !== 'all') url += `&scope=${scope}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return api.get(url);
  },
  exportCallLogs: (scope = 'all', startDate = '', endDate = '') => {
    let url = `/call-logs/export?scope=${scope}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return api.get(url, { responseType: 'blob' });
  },
  logCall: (data) => api.post('/call-logs', data),
};

export default callLogService;
