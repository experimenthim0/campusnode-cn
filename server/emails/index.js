export { sendEmail, renderPreview } from "./emailService.js";
export { templateRegistry, getTemplate, getAllTemplates } from "./templateRegistry.js";
export { emailConfig } from "./config/emailConfig.js";
export { escapeHtml } from "./renderer/escapeHtml.js";
export { renderEmail } from "./renderer/emailRenderer.js";
export { mockTransport } from "./transports/mockTransport.js";
export { resendTransport } from "./transports/resendTransport.js";
export { SecurityMetadataCard } from "./components/SecurityMetadataCard.js";
export { extractSecurityMetadata } from "./utils/requestMetadata.js";

export { default } from "./emailService.js";

