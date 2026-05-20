import api from '../../services/api';

const clientService = {
  getClients: (params = {}, config = {}) => api.get('/admin/clients', { params, ...config }),
  getClient: (id, config = {}) => api.get(`/admin/clients/${id}`, config),
  createClient: (data) => api.post('/admin/clients', data),
  updateClient: (id, data) => api.put(`/admin/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
};

export default clientService;
