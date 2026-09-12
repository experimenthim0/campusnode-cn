import { describe, it, expect, beforeEach } from "vitest";
import { escapeHtml } from "../renderer/escapeHtml.js";
import { templateRegistry, getTemplate, getAllTemplates } from "../templateRegistry.js";
import { renderEmail } from "../renderer/emailRenderer.js";
import { mockTransport, getSentEmails, clearSentEmails, getLastEmail } from "../transports/mockTransport.js";
import { sendEmail, renderPreview } from "../emailService.js";
import legacySendEmail from "../../utils/sendEmail.js";
import { SecurityMetadataCard } from "../components/SecurityMetadataCard.js";
import { extractSecurityMetadata, parseUserAgent, cleanIp, formatRequestTime } from "../utils/requestMetadata.js";

describe("CampusNode Centralized Email Subsystem", () => {
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
    it("should catalogue all 5 active templates", () => {
      const templates = getAllTemplates();
      expect(templates.length).toBe(5);

      const ids = templates.map((t) => t.id);
      expect(ids).toContain("auth:verify-account");
      expect(ids).toContain("auth:login-otp");
      expect(ids).toContain("auth:reset-password");
      expect(ids).toContain("clubs:student-head-assigned");
      expect(ids).toContain("clubs:faculty-assigned");
    });

    it("should throw an informative error on unknown template ID", () => {
      expect(() => getTemplate("unknown:template")).toThrow(
        /Unknown email template ID: "unknown:template"/
      );
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
      expect(rendered.html).toContain("CampusNode");
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
      expect(studentRender.subject).toBe("CampusNode Login Verification Code");
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
      expect(studentRender.html).toContain("CampusNode");

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
        defaultPassword: "tempPassword!",
        loginUrl: "https://campusnode.vercel.app/admin-secret-login",
      });

      expect(rendered.subject).toBe("CampusNode - Assigned as Faculty Coordinator for Robotics Club");
      expect(rendered.html).toContain("Dr. Sharma");
      expect(rendered.html).toContain("Robotics Club");
      expect(rendered.html).toContain("sharma@nitj.ac.in");
      expect(rendered.html).toContain("tempPassword!");
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
      expect(sent[0].subject).toBe("CampusNode Login Verification Code");
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

      expect(preview.subject).toBe("CampusNode Login Verification Code");
      expect(preview.html).toContain("112233");
      // Verify no email was dispatched
      expect(getSentEmails().length).toBe(0);
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
      // macOS Chrome
      const macChrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      expect(parseUserAgent(macChrome)).toBe("Chrome macOS");

      // Windows Edge
      const winEdge = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      expect(parseUserAgent(winEdge)).toBe("Edge Windows");

      // iOS Safari
      const iosSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      expect(parseUserAgent(iosSafari)).toBe("Safari iOS");

      // Android Firefox
      const androidFirefox = "Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0";
      expect(parseUserAgent(androidFirefox)).toBe("Firefox Android");

      // Fallback
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
      // 05:04 UTC corresponds to 10:34 AM in Indian Standard Time (UTC+5:30)
      const fixedDate = new Date("2026-02-09T05:04:00Z");
      const formatted = formatRequestTime(fixedDate);
      expect(formatted).toBe("Feb 9, 10:34 AM IST");

      // Custom timezone without suffix
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

      // Cloudflare City and State
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
});
