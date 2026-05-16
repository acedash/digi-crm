import api from '../../services/api';

export const userService = {
  getUsers: () => api.get('/admin/users'),
  getSupervisors: () => api.get('/admin/supervisors'),
  getMyAgents: () => api.get('/supervisor/my-agents'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/users/${id}/toggle-status`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default userService;
