import api from '../../services/api';

const activityService = {
  getActivities: () => api.get('/activities'),
  getStatus: () => api.get('/activities/status'),
  logActivity: (data) => api.post('/activities', data),
  getDailySummary: () => api.get('/activities/daily-summary'),
  getDailyDetails: (date, params = {}) => api.get(`/activities/daily-details/${date}`, { params })
};

export default activityService;
