import api from '../api/axios';

const notificationService = {
  getNotifications: () => api.get('/notifications/'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export default notificationService;
