import api from './api';

/**
 * Certificate Service
 * Certificate design, download, verification, and revocation API calls.
 */

export const saveCertificateTemplate = (eventId, data) =>
  api.post(`/api/certificates/${eventId}/template`, data);

export const uploadCertificateBackground = (formData) =>
  api.post('/api/certificates/upload-template', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const uploadCertificateTemplate = uploadCertificateBackground;

export const downloadCertificate = (eventId) =>
  api.get(`/api/certificates/${eventId}/download`, {
    responseType: 'blob',
  });

export const verifyCertificate = (token) =>
  api.get(`/api/certificates/verify/${token}`);

export const revokeCertificate = (certificateId, reason) =>
  api.patch(`/api/certificates/${certificateId}/revoke`, { reason });

export const getIssuedCertificates = (eventId) =>
  api.get(`/api/certificates/${eventId}/issued`);
