import api from '../api/axios';

const donationService = {
  createDonation: (data) => api.post('/donations', data),
  getDonations: (params) => api.get('/donations', { params }),
  getMyDonations: () => api.get('/donations/me'),
  getDonation: (id) => api.get(`/donations/${id}`),
  getCertificate: (id) => api.get(`/donations/${id}/certificate`),
  verifyCertificate: (certificateId, name = null) => {
    const params = name ? { name } : {};
    return api.get(`/donations/verify/${encodeURIComponent(certificateId)}`, { params });
  },
};

export default donationService;
