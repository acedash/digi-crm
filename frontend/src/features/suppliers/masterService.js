import api from '../../services/api';

const masterService = {
  // Masters Only
  getHotels: (search = '') => api.get(`/masters/hotels?search=${search}`),
  getCars: (search = '') => api.get(`/masters/cars?search=${search}`),
  getCruises: (search = '') => api.get(`/masters/cruises?search=${search}`),
  createMaster: (type, data) => api.post(`/masters/${type}`, data),
  updateMaster: (type, id, data) => api.put(`/masters/${type}/${id}`, data),
};

export default masterService;
