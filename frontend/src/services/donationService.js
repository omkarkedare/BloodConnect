import api from '../api/axios';

const donationService = {
  createDonation: (data) => api.post('/donations', data),
  getDonations: (params) => api.get('/donations', { params }),
  getDonation: (id) => api.get(`/donations/${id}`),
};

export default donationService;
