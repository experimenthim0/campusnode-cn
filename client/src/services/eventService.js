import api from './api';

/**
 * Event Service
 * All event-related API calls.
 */

export const getEvents = (params) =>
  api.get('/api/events', { params });

export const getEventBySlug = (slug) =>
  api.get(`/api/events/${slug}`);

export const getEventById = (id) =>
  api.get(`/api/events/${id}`);

export const getClubEvents = (clubId) =>
  api.get(`/api/events/club/${clubId}`);

export const getClubManagedEvents = (clubId) =>
  api.get(`/api/events/club-manage/${clubId}`);

export const exportClubEvents = (clubId, query) =>
  api.get(`/api/events/club-manage/${clubId}/export?${query}`);

export const getUserEvents = (userId) =>
  api.get(`/api/events/user/${userId}`, {
    headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
  });

export const createEvent = (data) =>
  api.post('/api/events', data);

export const updateEvent = (id, data) =>
  api.put(`/api/events/${id}`, data);

export const deleteEvent = (id) =>
  api.delete(`/api/events/${id}`);

export const reviewEvent = (id, payload) =>
  api.put(`/api/events/${id}/review`, typeof payload === 'object' ? payload : { status: payload });

export const registerForEvent = (eventId, payload) =>
  api.post(`/api/events/${eventId}/register`, payload);

export const deregisterFromEvent = (eventId, data) =>
  api.delete(`/api/events/${eventId}/register`, { data });

export const cancelRegistration = deregisterFromEvent;

export const getEventRegistrations = (eventId) =>
  api.get(`/api/events/${eventId}/registrations`);

export const checkInUser = (eventId, data) =>
  api.post(`/api/events/${eventId}/check-in`, data);

export const getCheckInStats = (eventId) =>
  api.get(`/api/events/${eventId}/check-in/stats`);

export const getEventStaff = (eventId) =>
  api.get(`/api/events/${eventId}/staff`);

export const updateEventStaff = (eventId, data) =>
  api.put(`/api/events/${eventId}/staff`, data);

export const getCalendarEvents = (params) =>
  api.get('/api/events/calendar', { params });

export const getConflicts = () =>
  api.get('/api/events/conflicts');

export const uploadEventImage = (formData) =>
  api.post('/api/events/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
