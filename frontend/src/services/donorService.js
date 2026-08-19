import api from '../api/axios';

const donorService = {
  createProfile: (data) => api.post('/donors/', data),
  getProfile: () => api.get('/donors/me'),
  updateProfile: (data) => api.put('/donors/me', data),
  searchDonors: (params) => api.get('/donors/', { params }),
};

export default donorService;
