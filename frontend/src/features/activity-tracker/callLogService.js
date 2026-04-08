import api from '../../services/api';

const callLogService = {
  getCallLogs: (page = 1, scope = 'all') =>
    api.get(`/call-logs?page=${page}${scope && scope !== 'all' ? `&scope=${scope}` : ''}`),
  exportCallLogs: (scope = 'all') =>
    api.get(`/call-logs/export${scope && scope !== 'all' ? `?scope=${scope}` : ''}`, {
      responseType: 'blob',
    }),
  logCall: (data) => api.post('/call-logs', data),
};

export default callLogService;
