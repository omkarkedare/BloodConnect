import api from '../api/axios';

const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserActive: (userId, data) => api.patch(`/admin/users/${userId}/activate`, data),
  verifyDonor: (donorId, data) => api.patch(`/admin/donors/${donorId}/verify`, data),
  getRequests: (params) => api.get('/admin/requests', { params }),
  getDonations: (params) => api.get('/admin/donations', { params }),
  verifyDonation: (donationId, data) => api.patch(`/admin/donations/${donationId}/verify`, data),
};

export default adminService;
