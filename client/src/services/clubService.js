import api from './api';

/**
 * Club Service
 * All club-related API calls.
 */

export const getClubs = () =>
  api.get('/api/clubs');

export const getClubById = (id) =>
  api.get(`/api/clubs/${id}`);

export const getClubBySlugOrId = (identifier) =>
  api.get(`/api/clubs/${identifier}`);

export const updateClub = (id, data) =>
  api.put(`/api/clubs/${id}`, data);

export const uploadClubBanner = (clubId, formData) =>
  api.post(`/api/clubs/${clubId}/banner`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteClub = (id) =>
  api.delete(`/api/clubs/${id}`);

// ── Members ────────────────────────────────────────────────────────────────
export const getClubMembers = (clubId) =>
  api.get(`/api/club-members/${clubId}/members`);

export const addClubMember = (clubId, data) =>
  api.post(`/api/club-members/${clubId}/members`, data);

export const searchStudentsForClub = (clubId, q) =>
  api.get(`/api/club-members/${clubId}/search-students?q=${encodeURIComponent(q)}`);

export const updateClubMember = (arg1, arg2, arg3) => {
  if (arg3 !== undefined) {
    return api.put(`/api/club-members/${arg1}/members/${arg2}`, arg3);
  }
  return api.put(`/api/club-members/members/${arg1}`, arg2);
};

export const transferStudentLead = (clubId, data) =>
  api.post(`/api/club-members/${clubId}/transfer-student-lead`, typeof data === "string" ? { targetMembershipId: data } : data);

export const removeClubMember = (arg1, arg2) => {
  if (arg2 !== undefined) {
    return api.delete(`/api/club-members/${arg1}/members/${arg2}`);
  }
  return api.delete(`/api/club-members/members/${arg1}`);
};

// ── Leaderboard ────────────────────────────────────────────────────────────
export const getClubLeaderboard = () =>
  api.get('/api/clubs/leaderboard');

// ── Announcements ──────────────────────────────────────────────────────────
export const createClubAnnouncement = (clubId, data) =>
  api.post(`/api/clubs/${clubId}/announcements`, data);

export const updateClubAnnouncement = (clubId, announcementId, data) =>
  api.put(`/api/clubs/${clubId}/announcements/${announcementId}`, data);

export const deleteClubAnnouncement = (clubId, announcementId) =>
  api.delete(`/api/clubs/${clubId}/announcements/${announcementId}`);

export const togglePinClubAnnouncement = (clubId, announcementId) =>
  api.patch(`/api/clubs/${clubId}/announcements/${announcementId}/pin`);

// ── Achievements ───────────────────────────────────────────────────────────
export const createClubAchievement = (clubId, data) =>
  api.post(`/api/clubs/${clubId}/achievements`, data);

export const updateClubAchievement = (clubId, achievementId, data) =>
  api.put(`/api/clubs/${clubId}/achievements/${achievementId}`, data);

export const deleteClubAchievement = (clubId, achievementId) =>
  api.delete(`/api/clubs/${clubId}/achievements/${achievementId}`);

// ── Gallery ────────────────────────────────────────────────────────────────
export const addClubGalleryMedia = (clubId, data) =>
  api.post(`/api/clubs/${clubId}/gallery`, data);

export const deleteClubGalleryMedia = (clubId, mediaId) =>
  api.delete(`/api/clubs/${clubId}/gallery/${mediaId}`);

// ── Events ─────────────────────────────────────────────────────────────────
export const toggleEventFeatured = (eventId) =>
  api.patch(`/api/events/${eventId}/feature`);

