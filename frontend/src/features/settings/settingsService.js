import api from '../../services/api';

const settingsService = {
  getMailSettings: () => api.get('/admin/settings/mail'),
  updateMailSettings: (data) => api.put('/admin/settings/mail', data),
  getMailTemplates: () => api.get('/admin/settings/mail-templates'),
  updateMailTemplates: (templates) => api.put('/admin/settings/mail-templates', { templates }),
};

export default settingsService;
