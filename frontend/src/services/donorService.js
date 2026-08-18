import api from '../api/axios';

const donorService = {
  createProfile: (data) => api.post('/donors/profile', data),
  getProfile: () => api.get('/donors/profile'),
  updateProfile: (data) => api.put('/donors/profile', data),
  toggleAvailability: (data) => api.patch('/donors/availability', data),
  searchDonors: (params) => api.get('/donors/search', { params }),
  getDonor: (id) => api.get(`/donors/${id}`),
};

export default donorService;
