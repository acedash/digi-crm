import api from '../../services/api';

const settingsService = {
  getMailSettings: () => api.get('/admin/settings/mail'),
  updateMailSettings: (data) => api.put('/admin/settings/mail', data),
};

export default settingsService;
