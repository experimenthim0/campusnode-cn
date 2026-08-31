import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  const fromName = process.env.EMAIL_FROM_NAME || "CampusNode Support";
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.email,
      subject: options.subject,
      html: options.message,
    });

    if (error) {
      console.error("Error sending email via Resend:", error);
      throw error;
    }

    console.log(`Email sent successfully: ${data.id}`);
    return data;
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    throw error;
  }
};

export default sendEmail;
