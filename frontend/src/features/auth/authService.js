import api from '../../services/api';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export default authService;
