import dotenv from "dotenv";

dotenv.config();

const { default: sendEmail } = await import("../utils/sendEmail.js");

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
    await sendEmail({
      email: recipientEmail,
      subject: "Test Email from CampusNode (Resend)",
      message: `
        <h1>It Works!</h1>
        <p>This is a test email sent using Resend integration.</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `,
    });
    console.log("✅ Test email sent successfully!");
  } catch (error) {
    console.error("❌ Failed to send test email.");
    console.error(error);
  }
};

testEmail();
