import api from '../../services/api';

const paymentAuthService = {
  create: (data) => api.post('/payment-authorizations', data),
  getByToken: (token) => api.get(`/authorize/${token}`),
  approve: (token, data) => api.post(`/authorize/${token}/approve`, data),
};

export default paymentAuthService;
