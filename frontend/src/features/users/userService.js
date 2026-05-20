import api from '../../services/api';

export const userService = {
  getUsers: (config = {}) => api.get('/admin/users', config),
  getSupervisors: (config = {}) => api.get('/admin/supervisors', config),
  getMyAgents: (config = {}) => api.get('/supervisor/my-agents', config),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/users/${id}/toggle-status`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default userService;
