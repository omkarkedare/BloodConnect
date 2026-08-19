import api from '../api/axios';

const requestService = {
  createRequest: (data) => api.post('/blood-requests/', data),
  getRequests: (params) => api.get('/blood-requests/', { params }),
  getRequest: (id) => api.get(`/blood-requests/${id}`),
  updateRequest: (id, data) => api.put(`/blood-requests/${id}`, data),
  cancelRequest: (id) => api.put(`/blood-requests/${id}`, { status: 'cancelled' }),
};

export default requestService;
