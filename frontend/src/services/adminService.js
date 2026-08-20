import api from '../api/axios';

const adminService = {
  getDashboard: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getDonors: (params) => api.get('/admin/donors', { params }),
  toggleUserActive: (userId, data) => api.put(`/admin/users/${userId}/status`, data),
  getRequests: (params) => api.get('/admin/requests', { params }),
  getDonations: (params) => api.get('/admin/donations', { params }),
};

export default adminService;
