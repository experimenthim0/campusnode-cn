import api from './api';

/**
 * Admin Service
 * Administration-related API calls.
 */

export const getDashboardStats = () =>
  api.get('/api/admin/dashboard-stats');

export const getClubsList = () =>
  api.get('/api/admin/clubs-list');

export const createClub = (data) =>
  api.post('/api/admin/clubs', data);

export const updateClub = (id, data) =>
  api.put(`/api/admin/clubs/${id}`, data);

export const deleteClub = (id) =>
  api.delete(`/api/admin/clubs/${id}`);

export const getUserInfo = (id) =>
  api.get(`/api/admin/user-info/${id}`);

export const exportEventData = () =>
  api.get('/api/admin/event-data-export');

// Lost & Found Admin
export const getLostFoundStats = () =>
  api.get('/api/admin/lost-found/stats');

export const getAllLostFoundAdmin = () =>
  api.get('/api/admin/lost-found/all');

export const toggleFraud = (id) =>
  api.patch(`/api/admin/lost-found/${id}/toggle-fraud`);

export const deleteLostFoundItem = (id) =>
  api.delete(`/api/admin/lost-found/${id}`);

export const blockLostFoundUser = (userId) =>
  api.patch(`/api/admin/lost-found/user/${userId}/block`);

// Coordinators
export const getCoordinators = () =>
  api.get('/api/admin/coordinators');

export const assignCoordinator = (data) =>
  api.post('/api/admin/coordinators', data);

export const removeCoordinator = (id) =>
  api.delete(`/api/admin/coordinators/${id}`);

// Venues
export const getVenues = (params) =>
  api.get('/api/venues', { params });

export const createVenue = (data) =>
  api.post('/api/venues', data);

export const updateVenue = (id, data) =>
  api.put(`/api/venues/${id}`, data);

export const toggleVenueStatus = (id) =>
  api.patch(`/api/venues/${id}/toggle-status`);

export const deleteVenue = (id) =>
  api.delete(`/api/venues/${id}`);

// Central Organizers
export const getCentralOrganizers = () =>
  api.get('/api/admin/central-organizer');

export const assignCentralOrganizer = (data) =>
  api.post('/api/admin/central-organizer', data);

export const removeCentralOrganizer = (id) =>
  api.delete(`/api/admin/central-organizer/${id}`);

export const searchStudentsForCO = (query) =>
  api.get(`/api/admin/students/search?q=${encodeURIComponent(query)}`);
