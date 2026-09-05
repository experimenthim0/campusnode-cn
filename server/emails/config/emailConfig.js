import dotenv from "dotenv";
import { getClientUrl as getCorsClientUrl } from "../../utils/corsConfig.js";

dotenv.config();

export const emailConfig = {
  getFromName: () => process.env.EMAIL_FROM_NAME || "CampusNode Support",
  getFromEmail: () => process.env.EMAIL_FROM || "onboarding@resend.dev",
  getFromHeader: () => `${emailConfig.getFromName()} <${emailConfig.getFromEmail()}>`,
  getApiKey: () => process.env.RESEND_API_KEY || "",
  getClientUrl: (origin) => {
    if (origin) {
      return getCorsClientUrl(origin);
    }
    return process.env.CLIENT_URL || "https://clubsetu.nikhim.me";
  },
  isTest: () => process.env.NODE_ENV === "test",
  isProduction: () => process.env.NODE_ENV === "production",
};

export default emailConfig;
