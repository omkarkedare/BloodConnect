import api from '../api/axios';

const requestService = {
  createRequest: (data) => api.post('/requests', data),
  getRequests: (params) => api.get('/requests', { params }),
  getRequest: (id) => api.get(`/requests/${id}`),
  updateRequest: (id, data) => api.put(`/requests/${id}`, data),
  cancelRequest: (id) => api.patch(`/requests/${id}/cancel`),
};

export default requestService;
