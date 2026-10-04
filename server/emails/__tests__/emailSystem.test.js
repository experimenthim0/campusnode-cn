import { describe, it, expect, beforeEach } from "vitest";
import { escapeHtml } from "../renderer/escapeHtml.js";
import { templateRegistry, getTemplate, getAllTemplates } from "../templateRegistry.js";
import { renderEmail } from "../renderer/emailRenderer.js";
import { mockTransport, getSentEmails, clearSentEmails, getLastEmail } from "../transports/mockTransport.js";
import {
  sendEmail,
  sendVerificationEmail,
  sendLoginOtpEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  renderPreview,
} from "../emailService.js";
import legacySendEmail from "../../utils/sendEmail.js";
import { SecurityMetadataCard } from "../components/SecurityMetadataCard.js";
import { Heading, BodyText, MutedText, SmallText, LinkText } from "../components/Typography.js";
import { Button } from "../components/Button.js";
import { InfoBox } from "../components/InfoBox.js";
import { Divider } from "../components/Divider.js";
import { colors, typography, spacing, designTokens } from "../config/designTokens.js";
import { extractSecurityMetadata, parseUserAgent, cleanIp, formatRequestTime } from "../utils/requestMetadata.js";

describe("Campusnode Centralized Email Subsystem", () => {
  beforeEach(() => {
    clearSentEmails();
  });

  describe("HTML Escaping Security Utility", () => {
    it("should escape special characters to prevent HTML injection", () => {
      const malicious = '<script>alert("xss")</script> & \'test\'';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#039;test&#039;'
      );
    });

    it("should handle null and undefined safely", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });
  });

  describe("Template Registry", () => {
    it("should catalogue all 6 active templates", () => {
      const templates = getAllTemplates();
      expect(templates.length).toBe(6);

      const ids = templates.map((t) => t.id);
      expect(ids).toContain("auth:verify-account");
      expect(ids).toContain("auth:login-otp");
      expect(ids).toContain("auth:reset-password");
      expect(ids).toContain("auth:password-changed");
      expect(ids).toContain("clubs:student-head-assigned");
      expect(ids).toContain("clubs:faculty-assigned");
    });

    it("should resolve developer-friendly aliases", () => {
      expect(getTemplate("verify-email").id).toBe("auth:verify-account");
      expect(getTemplate("login-otp").id).toBe("auth:login-otp");
      expect(getTemplate("reset-password").id).toBe("auth:reset-password");
      expect(getTemplate("password-changed").id).toBe("auth:password-changed");
      expect(getTemplate("auth:change-password").id).toBe("auth:password-changed");
    });

    it("should throw an informative error on unknown template ID", () => {
      expect(() => getTemplate("unknown:template")).toThrow(
        /Unknown email template ID: "unknown:template"/
      );
    });
  });

  describe("Design Tokens & Reusable Typography / Components", () => {
    it("designTokens - should define coherent colors, typography, and spacing", () => {
      expect(designTokens.colors.primary).toBe("#0078d4");
      expect(designTokens.colors.heading).toBe("#0f172a");
      expect(designTokens.colors.body).toBe("#334155");
      expect(designTokens.colors.muted).toBe("#64748b");
      expect(designTokens.colors.teal).toBe("#00c977");
      expect(designTokens.typography.fontFamily).toContain("Google Sans");
    });

    it("Heading - should render standardized heading tags and styles", () => {
      const h1 = Heading({ children: "Welcome", level: 1 });
      expect(h1).toContain("<h1");
      expect(h1).toContain("24px");
      expect(h1).toContain("Welcome");

      const h2 = Heading({ children: "Sub Title", level: 2 });
      expect(h2).toContain("<h2");
      expect(h2).toContain("Sub Title");
    });

    it("BodyText, MutedText, SmallText - should render semantic paragraph elements", () => {
      const body = BodyText({ children: "Main paragraph content." });
      expect(body).toContain('class="email-body-text"');
      expect(body).toContain("Main paragraph content.");

      const muted = MutedText({ children: "Footnote message." });
      expect(muted).toContain('class="email-muted-text"');
      expect(muted).toContain("Footnote message.");

      const small = SmallText({ children: "Legal disclaimer." });
      expect(small).toContain("12px");
      expect(small).toContain("Legal disclaimer.");
    });

    it("LinkText - should render accessible anchor tags with word-break", () => {
      const link = LinkText({ href: "https://campusnode.in/help", label: "Help Center" });
      expect(link).toContain('href="https://campusnode.in/help"');
      expect(link).toContain("Help Center");
      expect(link).toContain("word-break: break-all");
    });

    it("Button - should render Outlook VML and HTML button across variants", () => {
      const primaryBtn = Button({ label: "Confirm Account", url: "https://campusnode.in/confirm", variant: "primary" });
      expect(primaryBtn).toContain("Confirm Account");
      expect(primaryBtn).toContain("#0078d4");
      expect(primaryBtn).toContain("v:roundrect");

      const secondaryBtn = Button({ label: "Dismiss", url: "https://campusnode.in/home", variant: "secondary" });
      expect(secondaryBtn).toContain("Dismiss");
      expect(secondaryBtn).toContain(colors.bgApp);

      const tealBtn = Button({ label: "Join Club", url: "https://campusnode.in/join", variant: "teal" });
      expect(tealBtn).toContain("#00c977");
    });

    it("InfoBox - should render styled alert box across variants", () => {
      const warningBox = InfoBox({
        variant: "warning",
        title: "Security Alert",
        children: "Unauthorized attempt detected.",
      });
      expect(warningBox).toContain("Security Alert");
      expect(warningBox).toContain("Unauthorized attempt detected.");
      expect(warningBox).toContain(colors.warningBg);

      const infoBox = InfoBox({
        variant: "info",
        children: "Informational notice.",
      });
      expect(infoBox).toContain(colors.infoBg);
    });

    it("Divider - should render clean separator line", () => {
      const div = Divider();
      expect(div).toContain("<hr");
      expect(div).toContain(colors.divider);
    });
  });

  describe("Template Validation & Rendering", () => {
    it("auth:verify-account - should validate required fields and render correctly", () => {
      const template = getTemplate("auth:verify-account");

      expect(() => template.validate({})).toThrow(/Missing required field: "name"/);
      expect(() => template.validate({ name: "Alex" })).toThrow(/Missing required field: "verifyUrl"/);

      const data = {
        name: "Alex <Student>",
        verifyUrl: "https://campusnode.vercel.app/verify-email/test-token-123",
      };

      const rendered = renderEmail(template, data);
      expect(rendered.subject).toBe("Account Verification");
      expect(rendered.html).toContain("Alex &lt;Student&gt;");
      expect(rendered.html).toContain("verify-email/test-token-123");
      expect(rendered.html).toContain("Verify My Account");
      expect(rendered.html).toContain("Campusnode");
      expect(rendered.html).toContain("fonts.googleapis.com/css2?family=Google+Sans");
    });

    it("auth:login-otp - should render correctly across Student, Admin, and External user contexts with Inter typography", () => {
      const template = getTemplate("auth:login-otp");

      expect(() => template.validate({})).toThrow(/Missing required field: "otp"/);
      expect(() => template.validate({ otp: "123456" })).toThrow(/Missing required field: "email"/);

      // 1. Student context with device, location, IP address, and time
      const studentRender = renderEmail(template, {
        otp: "123456",
        email: "student@nitj.ac.in",
        contextLabel: "Student",
        device: "Chrome macOS",
        location: "San Francisco, US",
        ipAddress: "192.168.1.42",
        time: "Feb 9, 10:34 AM",
      });
      expect(studentRender.subject).toBe("Campusnode Login Verification Code");
      expect(studentRender.html).toContain("Verify Your Login");
      expect(studentRender.html).toContain("123456");
      expect(studentRender.html).toContain("student@nitj.ac.in");
      expect(studentRender.html).toContain("DEVICE");
      expect(studentRender.html).toContain("Chrome macOS");
      expect(studentRender.html).toContain("LOCATION");
      expect(studentRender.html).toContain("San Francisco, US");
      expect(studentRender.html).toContain("IP ADDRESS");
      expect(studentRender.html).toContain("192.168.1.42");
      expect(studentRender.html).toContain("TIME");
      expect(studentRender.html).toContain("Feb 9, 10:34 AM");
      expect(studentRender.html).toContain("SFMono-Regular");
      expect(studentRender.html).toContain("Campusnode");

      // 2. Admin portal context
      const adminRender = renderEmail(template, {
        otp: "654321",
        email: "admin@nitj.ac.in",
        contextLabel: "Admin",
      });
      expect(adminRender.subject).toBe("Admin Login Verification Code");
      expect(adminRender.html).toContain("654321");
    });

    it("auth:reset-password - should validate and render password reset button, link, and security metadata", () => {
      const template = getTemplate("auth:reset-password");

      expect(() => template.validate({})).toThrow(/Missing required field: "resetUrl"/);

      const rendered = renderEmail(template, {
        resetUrl: "https://campusnode.vercel.app/reset-password/sample-token",
        device: "Chrome macOS",
        location: "San Francisco, US",
        ipAddress: "192.168.1.42",
        time: "Feb 9, 10:34 AM",
      });
      expect(rendered.subject).toBe("Password Reset Request");
      expect(rendered.html).toContain("Reset Password");
      expect(rendered.html).toContain("reset-password/sample-token");
      expect(rendered.html).toContain("DEVICE");
      expect(rendered.html).toContain("Chrome macOS");
      expect(rendered.html).toContain("LOCATION");
      expect(rendered.html).toContain("San Francisco, US");
      expect(rendered.html).toContain("IP ADDRESS");
      expect(rendered.html).toContain("192.168.1.42");
      expect(rendered.html).toContain("TIME");
      expect(rendered.html).toContain("Feb 9, 10:34 AM");
    });

    it("auth:password-changed - should render password changed alert with instructions and security card", () => {
      const template = getTemplate("auth:password-changed");

      const rendered = renderEmail(template, {
        name: "Priya Patel",
        email: "priya@nitj.ac.in",
        device: "Safari on iOS",
        location: "Chandigarh, IN",
        ipAddress: "103.21.244.2",
        time: "Sep 24, 11:30 PM IST",
        supportEmail: "support@campusnode.in",
      });

      expect(rendered.subject).toBe("Your Campusnode password has been changed");
      expect(rendered.html).toContain("Password Changed");
      expect(rendered.html).toContain("Priya Patel");
      expect(rendered.html).toContain("Didn&#039;t make this change?");
      expect(rendered.html).toContain("support@campusnode.in");
      expect(rendered.html).toContain("DEVICE");
      expect(rendered.html).toContain("Safari on iOS");
      expect(rendered.html).toContain("LOCATION");
      expect(rendered.html).toContain("Chandigarh, IN");
      expect(rendered.html).toContain("IP ADDRESS");
      expect(rendered.html).toContain("103.21.244.2");
      // Security principle: Never include reset URL in password changed alert
      expect(rendered.html).not.toContain("reset-password/");
    });

    it("clubs:student-head-assigned - should render student lead appointment details with dark mode compatibility", () => {
      const template = getTemplate("clubs:student-head-assigned");

      expect(() => template.validate({})).toThrow(/Missing required field: "studentName"/);
      expect(() => template.validate({ studentName: "Rahul" })).toThrow(/Missing required field: "clubName"/);

      const rendered = renderEmail(template, {
        studentName: "Rahul Sharma",
        studentEmail: "rahul@nitj.ac.in",
        rollNo: "22103045",
        clubName: "Coding Club NITJ",
        dashboardUrl: "https://campusnode.vercel.app/events",
      });

      expect(rendered.subject).toBe("🎉 Congratulations Rahul Sharma! You've been appointed as Club Head of Coding Club NITJ");
      expect(rendered.html).toContain("Rahul Sharma");
      expect(rendered.html).toContain("Coding Club NITJ");
      expect(rendered.html).toContain("rahul@nitj.ac.in");
      expect(rendered.html).toContain("22103045");
      expect(rendered.html).toContain("Club Head (Student Lead)");
      expect(rendered.html).toContain("Go to Club Dashboard");
      expect(rendered.html).toContain("info-table");
      expect(rendered.html).toContain("No Separate Password Needed");

      // Verify dark mode theme injection
      const darkRendered = renderEmail(template, {
        studentName: "Rahul Sharma",
        clubName: "Coding Club NITJ",
      }, { theme: "dark" });
      expect(darkRendered.html).toContain('data-theme="dark"');
    });

    it("clubs:faculty-assigned - should render unified coordinator template", () => {
      const template = getTemplate("clubs:faculty-assigned");

      expect(() => template.validate({})).toThrow(/Missing required field/);

      const rendered = renderEmail(template, {
        facultyName: "Dr. Sharma",
        clubName: "Robotics Club",
        facultyEmail: "sharma@nitj.ac.in",
        loginUrl: "https://campusnode.vercel.app/login",
      });

      expect(rendered.subject).toBe("Campusnode - Assigned as Faculty Coordinator for Robotics Club");
      expect(rendered.html).toContain("Dr. Sharma");
      expect(rendered.html).toContain("Robotics Club");
      expect(rendered.html).toContain("sharma@nitj.ac.in");
      expect(rendered.html).toContain("No Separate Password Needed");
    });
  });

  describe("Email Dispatch & Transport Safety", () => {
    it("should use mock transport in test mode and not make real HTTP calls", async () => {
      const res = await sendEmail({
        to: "recipient@nitj.ac.in",
        template: "auth:login-otp",
        data: {
          otp: "998877",
          email: "recipient@nitj.ac.in",
        },
      });

      expect(res.id).toMatch(/^mock_/);

      const sent = getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe("recipient@nitj.ac.in");
      expect(sent[0].subject).toBe("Campusnode Login Verification Code");
      expect(sent[0].html).toContain("998877");
    });

    it("should support legacy sendEmail({ email, subject, message }) signature", async () => {
      const res = await legacySendEmail({
        email: "legacy@nitj.ac.in",
        subject: "Legacy Direct Subject",
        message: "<p>Legacy raw HTML content</p>",
      });

      expect(res.id).toMatch(/^mock_/);

      const last = getLastEmail();
      expect(last).toBeDefined();
      expect(last.to).toBe("legacy@nitj.ac.in");
      expect(last.subject).toBe("Legacy Direct Subject");
      expect(last.html).toBe("<p>Legacy raw HTML content</p>");
    });

    it("renderPreview - should render without dispatching to transport", () => {
      const preview = renderPreview({
        template: "auth:login-otp",
        data: {
          otp: "112233",
          email: "preview@nitj.ac.in",
        },
      });

      expect(preview.subject).toBe("Campusnode Login Verification Code");
      expect(preview.html).toContain("112233");
      expect(getSentEmails().length).toBe(0);
    });
  });

  describe("High-Level Email Service Helpers", () => {
    it("sendVerificationEmail - dispatches auth:verify-account with correct payload", async () => {
      const res = await sendVerificationEmail({
        to: "newuser@nitj.ac.in",
        name: "Aman Deep",
        verifyUrl: "https://campusnode.in/verify/abc123token",
        expiryHours: 24,
      });

      expect(res.id).toMatch(/^mock_/);
      const email = getLastEmail();
      expect(email.to).toBe("newuser@nitj.ac.in");
      expect(email.subject).toBe("Account Verification");
      expect(email.html).toContain("Aman Deep");
      expect(email.html).toContain("https://campusnode.in/verify/abc123token");
    });

    it("sendLoginOtpEmail - dispatches auth:login-otp with correct payload and metadata", async () => {
      const res = await sendLoginOtpEmail({
        to: "student@nitj.ac.in",
        otp: "543210",
        contextLabel: "Student",
        device: "Edge Windows",
        location: "New Delhi, IN",
      });

      expect(res.id).toMatch(/^mock_/);
      const email = getLastEmail();
      expect(email.to).toBe("student@nitj.ac.in");
      expect(email.subject).toBe("Campusnode Login Verification Code");
      expect(email.html).toContain("543210");
      expect(email.html).toContain("Edge Windows");
      expect(email.html).toContain("New Delhi, IN");
    });

    it("sendPasswordResetEmail - dispatches auth:reset-password with reset URL", async () => {
      const res = await sendPasswordResetEmail({
        to: "forgot@nitj.ac.in",
        resetUrl: "https://campusnode.in/reset/xyztoken",
        expiryMinutes: 15,
      });

      expect(res.id).toMatch(/^mock_/);
      const email = getLastEmail();
      expect(email.to).toBe("forgot@nitj.ac.in");
      expect(email.subject).toBe("Password Reset Request");
      expect(email.html).toContain("https://campusnode.in/reset/xyztoken");
      expect(email.html).toContain("15 minutes");
    });

    it("sendPasswordChangedEmail - dispatches auth:password-changed alert", async () => {
      const res = await sendPasswordChangedEmail({
        to: "changed@nitj.ac.in",
        name: "Kavita Rao",
        device: "Firefox Android",
        location: "Mumbai, IN",
      });

      expect(res.id).toMatch(/^mock_/);
      const email = getLastEmail();
      expect(email.to).toBe("changed@nitj.ac.in");
      expect(email.subject).toBe("Your Campusnode password has been changed");
      expect(email.html).toContain("Kavita Rao");
      expect(email.html).toContain("Firefox Android");
      expect(email.html).toContain("Mumbai, IN");
    });
  });

  describe("Security Metadata Extraction & Card Component", () => {
    it("SecurityMetadataCard - should render 4 rows with Inter labels and Monospace values", () => {
      const html = SecurityMetadataCard({
        device: "Chrome macOS",
        location: "San Francisco, US",
        ipAddress: "192.168.1.42",
        time: "Feb 9, 10:34 AM",
      });

      expect(html).toContain("DEVICE");
      expect(html).toContain("Chrome macOS");
      expect(html).toContain("LOCATION");
      expect(html).toContain("San Francisco, US");
      expect(html).toContain("IP ADDRESS");
      expect(html).toContain("192.168.1.42");
      expect(html).toContain("TIME");
      expect(html).toContain("Feb 9, 10:34 AM");
      expect(html).toContain("SFMono-Regular");
      expect(html).toContain("letter-spacing: 0.5px");
    });

    it("SecurityMetadataCard - should return empty string if no metadata provided", () => {
      expect(SecurityMetadataCard({})).toBe("");
      expect(SecurityMetadataCard(undefined)).toBe("");
    });

    it("parseUserAgent - should accurately recognize browser and operating system", () => {
      const macChrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(parseUserAgent(macChrome)).toBe("Chrome macOS");

      const winEdge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      expect(parseUserAgent(winEdge)).toBe("Edge Windows");

      const iosSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      expect(parseUserAgent(iosSafari)).toBe("Safari iOS");

      const androidFirefox = "Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0";
      expect(parseUserAgent(androidFirefox)).toBe("Firefox Android");

      expect(parseUserAgent(null)).toBe("Unknown Device");
      expect(parseUserAgent("")).toBe("Unknown Device");
    });

    it("cleanIp - should strip IPv6 prefix and normalize loopback", () => {
      expect(cleanIp("::ffff:192.168.1.42")).toBe("192.168.1.42");
      expect(cleanIp("::1")).toBe("127.0.0.1");
      expect(cleanIp("localhost")).toBe("127.0.0.1");
      expect(cleanIp("10.0.0.5")).toBe("10.0.0.5");
    });

    it("formatRequestTime - should format timestamp in Indian Standard Time (IST)", () => {
      const fixedDate = new Date("2026-02-09T05:04:00Z");
      const formatted = formatRequestTime(fixedDate);
      expect(formatted).toBe("Feb 9, 10:34 AM IST");

      const utcFormatted = formatRequestTime(fixedDate, "UTC", false);
      expect(utcFormatted).toBe("Feb 9, 5:04 AM");
    });

    it("extractSecurityMetadata - should extract IP, exact City, State, and device from request headers", async () => {
      const mockVercelReq = {
        headers: {
          "cf-connecting-ip": "192.168.1.42",
          "x-vercel-ip-city": "San%20Francisco",
          "x-vercel-ip-country-region": "CA",
          "x-vercel-ip-country": "US",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
      };

      const meta = await extractSecurityMetadata(mockVercelReq, {
        time: "Feb 9, 10:34 AM IST",
      });

      expect(meta.device).toBe("Chrome macOS");
      expect(meta.ipAddress).toBe("192.168.1.42");
      expect(meta.location).toBe("San Francisco, CA, US");
      expect(meta.time).toBe("Feb 9, 10:34 AM IST");

      const mockCfReq = {
        headers: {
          "cf-connecting-ip": "103.21.244.2",
          "cf-ipcity": "Jalandhar",
          "cf-region": "Punjab",
          "cf-ipcountry": "IN",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        },
      };

      const cfMeta = await extractSecurityMetadata(mockCfReq);
      expect(cfMeta.location).toBe("Jalandhar, Punjab, IN");
      expect(cfMeta.device).toBe("Chrome Windows");
    });
  });

  describe("Primary Action Visual Hierarchy Order & Resilience", () => {
    it("auth:login-otp - Primary Action (OTP) must render before explanation, expiry, and security metadata", () => {
      const template = getTemplate("auth:login-otp");
      const rendered = renderEmail(template, {
        otp: "482917",
        email: "student@nitj.ac.in",
        contextLabel: "Student",
        device: "Chrome on macOS",
        location: "Jalandhar, India",
        ipAddress: "14.139.241.2",
        time: "Sep 14, 6:30 PM IST",
      });

      const headingIdx = rendered.html.indexOf("Verify Your Login");
      const otpIdx = rendered.html.indexOf("482917");
      const promptIdx = rendered.html.indexOf("A login was requested for your student account");
      const expiryIdx = rendered.html.indexOf("Expires in <strong>5 minutes</strong>");
      const metadataIdx = rendered.html.indexOf('class="metadata-table"');

      expect(headingIdx).toBeGreaterThan(-1);
      expect(otpIdx).toBeGreaterThan(headingIdx);
      expect(promptIdx).toBeGreaterThan(otpIdx);
      expect(expiryIdx).toBeGreaterThan(promptIdx);
      expect(metadataIdx).toBeGreaterThan(expiryIdx);
    });

    it("auth:reset-password - Primary Action (Reset Button) must render before explanation, expiry, and security metadata", () => {
      const template = getTemplate("auth:reset-password");
      const rendered = renderEmail(template, {
        resetUrl: "https://campusnode.vercel.app/reset-password/sample-token",
        expiryMinutes: 15,
        device: "Safari on iOS",
        location: "Delhi, India",
        ipAddress: "103.21.244.2",
        time: "Sep 14, 6:30 PM IST",
      });

      const headingIdx = rendered.html.indexOf("Reset Your Password");
      const buttonIdx = rendered.html.indexOf('href="https://campusnode.vercel.app/reset-password/sample-token"');
      const explanationIdx = rendered.html.indexOf("We received a request to reset your Campusnode account password");
      const expiryIdx = rendered.html.indexOf("expire in <strong>15 minutes</strong>");
      const metadataIdx = rendered.html.indexOf('class="metadata-table"');

      expect(headingIdx).toBeGreaterThan(-1);
      expect(buttonIdx).toBeGreaterThan(headingIdx);
      expect(explanationIdx).toBeGreaterThan(buttonIdx);
      expect(expiryIdx).toBeGreaterThan(explanationIdx);
      expect(metadataIdx).toBeGreaterThan(expiryIdx);
    });

    it("auth:verify-account - Primary Action (Verify Button) must render before explanation, expiry, and security metadata", () => {
      const template = getTemplate("auth:verify-account");
      const rendered = renderEmail(template, {
        name: "Alex",
        verifyUrl: "https://campusnode.vercel.app/verify-email/test-token",
        expiryHours: 24,
        device: "Firefox on Android",
        location: "Punjab, India",
        ipAddress: "14.139.241.10",
        time: "Sep 14, 6:30 PM IST",
      });

      const headingIdx = rendered.html.indexOf("Welcome to Campusnode!");
      const explanationIdx = rendered.html.indexOf("To complete your registration and activate your student account");
      const buttonIdx = rendered.html.indexOf("Verify My Account");
      const expiryIdx = rendered.html.indexOf("expire in <strong>24 hours</strong>");

      expect(headingIdx).toBeGreaterThan(-1);
      expect(explanationIdx).toBeGreaterThan(headingIdx);
      expect(buttonIdx).toBeGreaterThan(explanationIdx);
      expect(expiryIdx).toBeGreaterThan(buttonIdx);
    });

    it("Missing security metadata - primary actions must render cleanly when device/location/ipAddress/time are omitted", () => {
      const otpTemplate = getTemplate("auth:login-otp");
      const otpRender = renderEmail(otpTemplate, {
        otp: "123456",
        email: "test@nitj.ac.in",
      });
      expect(otpRender.html).toContain("123456");
      expect(otpRender.html).not.toContain('class="metadata-table"');
      expect(otpRender.html).not.toContain("DEVICE");

      const resetTemplate = getTemplate("auth:reset-password");
      const resetRender = renderEmail(resetTemplate, {
        resetUrl: "https://campusnode.vercel.app/reset-password/token-123",
      });
      expect(resetRender.html).toContain("Reset Password");
      expect(resetRender.html).not.toContain('class="metadata-table"');
      expect(resetRender.html).not.toContain("IP ADDRESS");

      const verifyTemplate = getTemplate("auth:verify-account");
      const verifyRender = renderEmail(verifyTemplate, {
        name: "Sam",
        verifyUrl: "https://campusnode.vercel.app/verify-email/token-123",
      });
      expect(verifyRender.html).toContain("Verify My Account");
      expect(verifyRender.html).not.toContain('class="metadata-table"');
    });

    it("Missing optional context - templates render cleanly without contextLabel or optional fields", () => {
      const otpTemplate = getTemplate("auth:login-otp");
      const rendered = renderEmail(otpTemplate, {
        otp: "778899",
        email: "generic@nitj.ac.in",
      });
      expect(rendered.html).toContain("A login was requested for your account");
      expect(rendered.html).toContain("778899");
      expect(rendered.html).not.toContain("undefined");
      expect(rendered.html).not.toContain("null");
    });
  });

  describe("HTML Injection & XSS Immunity", () => {
    it("should neutralize malicious XSS vectors across all dynamic fields", () => {
      const maliciousVectors = {
        name: '<script>alert("hacked")</script>',
        email: 'victim" onmouseover="alert(1)"@domain.com',
        verifyUrl: 'https://campusnode.in/verify?x="><script>alert(1)</script>',
        resetUrl: 'https://campusnode.in/reset?token=<img src=x onerror=alert(1)>',
        otp: '<script>999999</script>',
        device: '<b style="color:red">Hacker Device</b>',
        location: '"><script>stealCookie()</script>',
      };

      // 1. Verify Account
      const verifyTpl = getTemplate("auth:verify-account");
      const verifyHtml = renderEmail(verifyTpl, {
        name: maliciousVectors.name,
        verifyUrl: maliciousVectors.verifyUrl,
      }).html;
      expect(verifyHtml).not.toContain("<script>");
      expect(verifyHtml).toContain("&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;");

      // 2. Login OTP
      const otpTpl = getTemplate("auth:login-otp");
      const otpHtml = renderEmail(otpTpl, {
        otp: maliciousVectors.otp,
        email: maliciousVectors.email,
        device: maliciousVectors.device,
        location: maliciousVectors.location,
      }).html;
      expect(otpHtml).not.toContain("<script>");
      expect(otpHtml).not.toContain("<b style=");
      expect(otpHtml).toContain("&lt;script&gt;999999&lt;/script&gt;");

      // 3. Password Reset
      const resetTpl = getTemplate("auth:reset-password");
      const resetHtml = renderEmail(resetTpl, {
        resetUrl: maliciousVectors.resetUrl,
        device: maliciousVectors.device,
      }).html;
      expect(resetHtml).not.toContain("<img src=x");
      expect(resetHtml).toContain("&lt;img src=x onerror=alert(1)&gt;");

      // 4. Password Changed
      const changedTpl = getTemplate("auth:password-changed");
      const changedHtml = renderEmail(changedTpl, {
        name: maliciousVectors.name,
        email: maliciousVectors.email,
        device: maliciousVectors.device,
      }).html;
      expect(changedHtml).not.toContain("<script>");
      expect(changedHtml).toContain("&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;");
    });
  });
});
