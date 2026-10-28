import dotenv from "dotenv";
import { getClientUrl as getCorsClientUrl } from "../../utils/corsConfig.js";

dotenv.config();

export const emailConfig = {
  getFromName: () => process.env.EMAIL_FROM_NAME || "CampusNode Support",
  getFromEmail: () => process.env.EMAIL_FROM || "no-reply@campusnode.nitj.ac.in",
  getFromHeader: () => {
    const from = emailConfig.getFromEmail();
    if (from.includes("<") && from.includes(">")) {
      return from;
    }
    return `${emailConfig.getFromName()} <${from}>`;
  },
  getSmtpConfig: () => {
    // In automated test environment, use Nodemailer's JSON transport for fast, offline, and reliable test execution
    if (process.env.NODE_ENV === "test") {
      return { jsonTransport: true };
    }

    const host = process.env.SMTP_HOST || "localhost";
    const port = parseInt(process.env.SMTP_PORT || "1025", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const config = {
      host,
      port,
      secure,
    };

    if (user && pass) {
      config.auth = {
        user,
        pass,
      };
    }

    if (
      process.env.SMTP_IGNORE_TLS === "true" ||
      process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false"
    ) {
      config.tls = {
        rejectUnauthorized: false,
      };
    }

    return config;
  },
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
