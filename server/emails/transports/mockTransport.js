/**
 * In-memory Mock Transport for testing and offline local development.
 * Never makes outbound network calls.
 */
let sentEmails = [];

/**
 * Sends an email into the mock in-memory store.
 *
 * @param {object} payload
 * @param {string} payload.from
 * @param {string} payload.to
 * @param {string} payload.subject
 * @param {string} payload.html
 * @param {string} [payload.templateId]
 * @param {object} [payload.templateData]
 * @returns {Promise<{ id: string }>}
 */
export const sendViaMock = async (payload) => {
  const emailRecord = {
    ...payload,
    id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    sentAt: new Date(),
  };

  sentEmails.push(emailRecord);

  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[MockTransport] Simulated email to "${payload.to}" with subject: "${payload.subject}" (ID: ${emailRecord.id})`
    );
  }

  return { id: emailRecord.id };
};

export const getSentEmails = () => [...sentEmails];

export const getLastEmail = () => (sentEmails.length > 0 ? sentEmails[sentEmails.length - 1] : null);

export const clearSentEmails = () => {
  sentEmails = [];
};

export const mockTransport = {
  name: "mock",
  send: sendViaMock,
  getSentEmails,
  getLastEmail,
  clearSentEmails,
};

export default mockTransport;
