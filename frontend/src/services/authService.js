import api from '../api/axios';

const authService = {
  register: (data) => {
    const { role, ...userData } = data;
    return api.post(`/auth/register?role=${role || 'donor'}`, userData);
  },
  login: (data) => {
    const formData = new URLSearchParams();
    formData.append('username', data.email);
    formData.append('password', data.password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};

export default authService;
