import api from './api';

/**
 * Event Feedback Service
 * Handles pending feedback checks, submission, history, and organizer analytics.
 */

// Fetch pending feedback events for the authenticated student
export const getPendingFeedback = () =>
  api.get('/api/feedback/pending', {
    headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
  });

// Submit feedback for a specific event
export const submitEventFeedback = (eventId, feedbackData) =>
  api.post(`/api/feedback/${eventId}`, feedbackData);

// Fetch feedback history for the authenticated student
export const getMyFeedbackHistory = () =>
  api.get('/api/feedback/my-feedback', {
    headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
  });

// Fetch aggregated and anonymized feedback analytics for event organizers
export const getEventFeedbackAnalytics = (eventId, params = {}) =>
  api.get(`/api/feedback/${eventId}/analytics`, { params });

// Fetch existing AI reviews and quota for an event
export const getAIReviews = (eventId) =>
  api.get(`/api/feedback/${eventId}/ai-reviews`);

// Generate an AI review using OpenRouter
export const generateAIReview = (eventId) =>
  api.post(`/api/feedback/${eventId}/ai-review`);

// Download AI Review as PDF
export const downloadAIReviewPDF = (eventId, reviewNumber = 1) =>
  api.get(`/api/feedback/${eventId}/ai-reviews/${reviewNumber}/pdf`, {
    responseType: 'blob',
  });

// Export AI Review as JSON
export const downloadAIReviewJSON = (eventId, reviewNumber = 1) =>
  api.get(`/api/feedback/${eventId}/ai-reviews/${reviewNumber}/json`);

