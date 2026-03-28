import api from '../../services/api';

const clientService = {
  getClients: (params) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/clients?${query}`);
  },
  getClient: (id) => api.get(`/admin/clients/${id}`),
  createClient: (data) => api.post('/admin/clients', data),
  updateClient: (id, data) => api.put(`/admin/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
};

export default clientService;
