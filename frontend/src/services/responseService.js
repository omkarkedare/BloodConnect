import api from '../api/axios';

const responseService = {
  respondToRequest: (requestId, data) => api.post(`/responses/`, { ...data, request_id: requestId }),
  getResponses: (requestId) => api.get(`/blood-requests/${requestId}/responses`),
  getMyResponses: () => api.get('/responses/me'),
  updateResponse: (responseId, data) => api.put(`/responses/${responseId}`, data),
};

export default responseService;
