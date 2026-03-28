import api from '../../services/api';

export const bookingService = {
  getBookings: (params = {}) => api.get('/bookings', { params }),
  getBooking: (id) => api.get(`/bookings/${id}`),
  createBooking: (data) => api.post('/bookings', data),
  updateBooking: (id, data) => api.put(`/bookings/${id}`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
  reassignBooking: (id, agentId) => api.patch(`/bookings/${id}/reassign`, { agent_id: agentId }),
};

export default bookingService;
