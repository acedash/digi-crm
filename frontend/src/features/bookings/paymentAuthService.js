import api from '../../services/api';

const paymentAuthService = {
  create: (data) => api.post('/payment-authorizations', data),
  getByToken: (token) => api.get(`/authorize/${token}`),
  approve: (token, data) => api.post(`/authorize/${token}/approve`, data),
  reject: (token, data) => api.post(`/authorize/${token}/reject`, data),
  getProofByBooking: (bookingId) => api.get(`/bookings/${bookingId}/consent-proof`),
};

export default paymentAuthService;
