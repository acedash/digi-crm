import api from '../../services/api';

const callLogService = {
  getCallLogs: (page = 1) => api.get(`/call-logs?page=${page}`),
  logCall: (data) => api.post('/call-logs', data),
};

export default callLogService;
