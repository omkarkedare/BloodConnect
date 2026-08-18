import api from '../api/axios';

const responseService = {
  respondToRequest: (requestId, data) => api.post(`/requests/${requestId}/responses`, data),
  getResponses: (requestId) => api.get(`/requests/${requestId}/responses`),
  updateResponse: (responseId, data) => api.patch(`/responses/${responseId}`, data),
};

export default responseService;
