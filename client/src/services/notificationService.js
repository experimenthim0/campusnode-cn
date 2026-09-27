import api from './api';

/**
 * Notification Service
 * All notification-related API calls.
 */

export const getNotifications = () =>
  api.get('/api/notifications');

export const sendNotification = (data) =>
  api.post('/api/notifications', data);

export const getSentNotifications = (params) =>
  api.get('/api/notifications/sent', { params });

export const markAsRead = (id) =>
  api.put(`/api/notifications/${id}/read`);

export const markAllAsRead = () =>
  api.put('/api/notifications/read-all');
