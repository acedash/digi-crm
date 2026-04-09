import api from '../../services/api';

const clientService = {
  getClients: (params = {}) => api.get('/admin/clients', { params }),
  getClient: (id) => api.get(`/admin/clients/${id}`),
  createClient: (data) => api.post('/admin/clients', data),
  updateClient: (id, data) => api.put(`/admin/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
};

export default clientService;
