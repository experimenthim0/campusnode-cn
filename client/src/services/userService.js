import api from './api';

/**
 * User Service
 * Profile-related API calls.
 */

export const getMe = () =>
  api.get('/api/users/me');

export const updateProfile = (role, userId, data) =>
  api.put(`/api/users/${role}/${userId}`, data);

export const searchUsers = (query) =>
  api.get(`/api/users/search?query=${encodeURIComponent(query || "")}`);

export const uploadProfilePhoto = (formData, config = {}) =>
  api.post('/api/users/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  });

export const deleteProfilePhoto = () =>
  api.delete('/api/users/profile-photo');

