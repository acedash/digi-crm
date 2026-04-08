import api from './api';

const sensitiveAuditService = {
  logEvent: (payload) => api.post('/admin/sensitive-audit', payload),
};

export default sensitiveAuditService;
