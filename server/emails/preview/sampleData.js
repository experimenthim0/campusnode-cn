/**
 * Sample fixture data for development-only email preview.
 * Contains purely fictional and non-sensitive data.
 */
export const samplePreviewData = {
  "auth:verify-account": {
    name: "Alex Sharma",
    verifyUrl: "http://localhost:5173/verify-email/sample-token-abc123xyz",
    expiryHours: 24,
  },
  "auth:login-otp": {
    otp: "839201",
    email: "alex.sharma@nitj.ac.in",
    contextLabel: "Student",
    expiryMinutes: 5,
    device: "Chrome macOS",
    location: "San Francisco, US",
    ipAddress: "192.168.1.42",
    time: "Feb 9, 10:34 AM",
  },
  "auth:reset-password": {
    resetUrl: "http://localhost:5173/reset-password/sample-reset-token-def456",
    expiryMinutes: 30,
    device: "Chrome macOS",
    location: "San Francisco, US",
    ipAddress: "192.168.1.42",
    time: "Feb 9, 10:34 AM",
  },
  "clubs:credentials": {
    clubName: "Coding Club NITJ",
    clubEmail: "codingclub@nitj.ac.in",
    defaultPassword: "coding@nitj2026",
    loginUrl: "http://localhost:5173/login",
  },
  "clubs:faculty-assigned": {
    facultyName: "Dr. Rajesh Kumar",
    clubName: "Robotics Society",
    facultyEmail: "rajesh.kumar@nitj.ac.in",
    defaultPassword: "robotics@nitj2026",
    loginUrl: "http://localhost:5173/admin-secret-login",
  },
};

export default samplePreviewData;
