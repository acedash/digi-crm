import api from '../../services/api';

export const bookingService = {
  getBookings: (params = {}) => api.get('/bookings', { params }),
  getBooking: (id) => api.get(`/bookings/${id}`),
  createBooking: (data) => api.post('/bookings', data),
  updateBooking: (id, data) => api.put(`/bookings/${id}`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
  restoreBooking: (id) => api.post(`/bookings/${id}/restore`),
  reassignBooking: (id, agentId, handoffRemark) => api.patch(`/bookings/${id}/reassign`, {
    agent_id: agentId,
    handoff_remark: handoffRemark,
  }),
  sendTemplateEmail: (id, templateKey) => api.post(`/bookings/${id}/send-template-email`, { template_key: templateKey }),
  previewTemplateEmail: (id, templateKey) => api.get(`/bookings/${id}/preview-template-email`, { params: { template_key: templateKey } }),
};

export default bookingService;
