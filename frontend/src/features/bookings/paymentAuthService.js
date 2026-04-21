import api from '../../services/api';

const paymentAuthService = {
  create: (data) => api.post('/payment-authorizations', data),
  getByToken: (token) => api.get(`/authorize/${token}`),
  approve: (token, data) => {
    if (data.id_proof) {
      const formData = new FormData();
      Object.keys(data).forEach(key => formData.append(key, data[key]));
      return api.post(`/authorize/${token}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post(`/authorize/${token}/approve`, data);
  },
  reject: (token, data) => {
    if (data.id_proof) {
      const formData = new FormData();
      Object.keys(data).forEach(key => formData.append(key, data[key]));
      return api.post(`/authorize/${token}/reject`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post(`/authorize/${token}/reject`, data);
  },
  getProofByBooking: (bookingId) => api.get(`/bookings/${bookingId}/consent-proof`),
  getChargeQueue: (view = 'pending', params = {}) => {
    const query = new URLSearchParams({ view, ...params }).toString();
    return api.get(`/admin/payment-authorizations/charge-queue?${query}`);
  },
  markCharged: (paymentAuthId, data) => api.post(`/admin/payment-authorizations/${paymentAuthId}/mark-charged`, data),
  refreshProofSnapshot: (token) => api.post(`/payment-authorizations/${token}/refresh`),
  sendEmail: (id) => api.post(`/payment-authorizations/${id}/send-email`),
};

export default paymentAuthService;
