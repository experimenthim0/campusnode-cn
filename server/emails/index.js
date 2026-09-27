export {
  sendEmail,
  sendEmailDirect,
  sendVerificationEmail,
  sendLoginOtpEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  renderPreview,
} from "./emailService.js";

export { enqueueEmail, initEmailWorker, closeEmailWorker, getEmailQueue } from "./emailQueue.js";
export { templateRegistry, getTemplate, getAllTemplates } from "./templateRegistry.js";
export { emailConfig } from "./config/emailConfig.js";
export { designTokens, colors, typography, spacing, radii, shadows } from "./config/designTokens.js";

// Components
export { BaseLayout } from "./components/BaseLayout.js";
export { Button } from "./components/Button.js";
export { Header } from "./components/Header.js";
export { Footer } from "./components/Footer.js";
export { OtpBadge } from "./components/OtpBadge.js";
export { InfoBox } from "./components/InfoBox.js";
export { Divider } from "./components/Divider.js";
export { SecurityMetadataCard } from "./components/SecurityMetadataCard.js";
export {
  Typography,
  Heading,
  BodyText,
  MutedText,
  SmallText,
  LinkText,
} from "./components/Typography.js";

// Utilities & Transports
export { escapeHtml } from "./renderer/escapeHtml.js";
export { renderEmail } from "./renderer/emailRenderer.js";
export { mockTransport } from "./transports/mockTransport.js";
export { resendTransport } from "./transports/resendTransport.js";
export { extractSecurityMetadata } from "./utils/requestMetadata.js";

export { default } from "./emailService.js";
