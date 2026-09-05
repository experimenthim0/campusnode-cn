import dotenv from "dotenv";

dotenv.config();

const { sendEmail } = await import("../emails/emailService.js");

const testEmail = async () => {
  const recipientEmail = "contact.nikhim@gmail.com"; // Replace with your email for testing

  console.log(`Attempting to send test email to ${recipientEmail}...`);
  console.log(
    `Using API Key: ${process.env.RESEND_API_KEY ? "Loaded" : "MISSING"}`,
  );
  console.log(
    `From Email: ${process.env.EMAIL_FROM || "onboarding@resend.dev"}`,
  );

  try {
    const result = await sendEmail({
      to: recipientEmail,
      template: "auth:login-otp",
      data: {
        otp: "123456",
        email: recipientEmail,
        contextLabel: "Developer Test",
        expiryMinutes: 10,
        device: "Chrome macOS",
        location: "San Francisco, US",
        ipAddress: "192.168.1.42",
        time: "Feb 9, 10:34 AM",
      },
    });
    console.log("✅ Test email sent successfully! Result:", result);
  } catch (error) {
    console.error("❌ Failed to send test email.");
    console.error(error);
  }
};

testEmail();

