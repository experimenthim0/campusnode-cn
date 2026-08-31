export function sanitizeUser(userDoc) {
  const obj = { ...userDoc };
  [
    "password",
    "otp",
    "otpExpire",
    "verificationToken",
    "verificationTokenExpire",
    "resetPasswordToken",
    "resetPasswordExpire",
  ].forEach((k) => delete obj[k]);

  obj._id = obj.id;

  return obj;
}
