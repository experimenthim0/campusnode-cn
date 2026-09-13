import api from './api';

/**
 * Authentication Service
 * All auth-related API calls consolidated in one place.
 */

export const loginUser = (email, password) =>
  api.post('/api/auth/login', { email, password });

export const verify2FA = (email, otp) =>
  api.post('/api/auth/verify-2fa', { email, otp });

export const adminLogin = (email, password) =>
  api.post('/api/admin/login', { email, password });

export const registerStudent = (formData) =>
  api.post('/api/auth/register/student', formData);

export const registerExternal = (formData) =>
  api.post('/api/auth/register/external', formData);

export const registerFaculty = (formData) =>
  api.post('/api/auth/register/faculty', formData);

export const forgotPassword = (email) =>
  api.post('/api/auth/forgot-password', { email });

export const resetPassword = (token, newPassword) =>
  api.post(`/api/auth/reset-password/${token}`, { newPassword });

export const verifyEmail = (token) =>
  api.get(`/api/auth/verify-email/${token}`);

export const resendVerificationEmail = (email) =>
  api.post('/api/auth/send-verification-email', { email });

export const changePassword = (currentPassword, newPassword) =>
  api.post('/api/auth/change-password', { currentPassword, newPassword });

export const logoutUser = () =>
  api.post('/api/auth/logout').catch(() => {});
