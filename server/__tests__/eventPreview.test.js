import { describe, it, expect } from "vitest";
import {
  formatEventTitle,
  cleanEventDescription,
  escapeHtmlAttr,
  resolveSocialImage,
  generateEventSocialHtml,
  generateDefaultSocialHtml,
} from "../utils/eventSocialMetadata.js";

describe("Event Social & Open Graph Metadata Utility", () => {
  describe("formatEventTitle", () => {
    it("should append '| CampusNode' to standard event title", () => {
      expect(formatEventTitle("Code Wars 2026")).toBe("Code Wars 2026 | CampusNode");
    });

    it("should NOT double append '| CampusNode' if event title already contains CampusNode", () => {
      expect(formatEventTitle("CampusNode Winter Hackathon")).toBe("CampusNode Winter Hackathon");
      expect(formatEventTitle("campusnode tech summit")).toBe("campusnode tech summit");
      expect(formatEventTitle("Annual Meet - CampusNode")).toBe("Annual Meet - CampusNode");
    });

    it("should return default fallback title when title is empty or missing", () => {
      expect(formatEventTitle("")).toBe("CampusNode - Event Management");
      expect(formatEventTitle(null)).toBe("CampusNode - Event Management");
      expect(formatEventTitle(undefined)).toBe("CampusNode - Event Management");
    });
  });

  describe("cleanEventDescription", () => {
    it("should strip markdown symbols and bold formatting", () => {
      const raw = "**AA DEKH ZARA 4.0** is an *epic* cultural event! Join [here](https://example.com) for details.";
      const cleaned = cleanEventDescription(raw);
      expect(cleaned).toBe("AA DEKH ZARA 4.0 is an epic cultural event! Join here for details.");
    });

    it("should strip HTML tags and excessive whitespace", () => {
      const raw = "<p>Welcome to <strong>Hackathon</strong>.</p><br><div>Register now!</div>";
      const cleaned = cleanEventDescription(raw);
      expect(cleaned).toBe("Welcome to Hackathon. Register now!");
    });

    it("should generate a rich fallback description if description is empty or only whitespace/empty tags", () => {
      const event = {
        title: "RoboWars 2026",
        club: { clubName: "Robotics Society" },
        venue: "Auditorium",
      };

      const cleanedEmpty = cleanEventDescription("", event);
      expect(cleanedEmpty).toContain("Join RoboWars 2026");
      expect(cleanedEmpty).toContain("Robotics Society");
      expect(cleanedEmpty).toContain("Auditorium");

      const cleanedTags = cleanEventDescription("<p></p>", event);
      expect(cleanedTags).toContain("Join RoboWars 2026");
    });

    it("should truncate long descriptions cleanly on a word boundary with ellipsis", () => {
      const longDesc =
        "This is an extraordinarily long and comprehensive description of an inter-college robotics competition that covers autonomous drones, line followers, combat robots, arena challenges, prizes, rules, and student participation guidelines for all engineering students.";
      const cleaned = cleanEventDescription(longDesc);
      expect(cleaned.length).toBeLessThanOrEqual(180);
      expect(cleaned.endsWith("...")).toBe(true);
      expect(cleaned).not.toContain("   ");
    });
  });

  describe("escapeHtmlAttr", () => {
    it("should escape special characters to prevent HTML tag or attribute breakage", () => {
      const unsafe = '<script>alert("hack")</script> & \'test\'';
      const safe = escapeHtmlAttr(unsafe);
      expect(safe).toBe("&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt; &amp; &#39;test&#39;");
      expect(safe).not.toContain("<");
      expect(safe).not.toContain(">");
      expect(safe).not.toContain('"');
    });

    it("should handle null and undefined safely", () => {
      expect(escapeHtmlAttr(null)).toBe("");
      expect(escapeHtmlAttr(undefined)).toBe("");
    });
  });

  describe("resolveSocialImage", () => {
    it("should return the public HTTPS imageUrl when available", () => {
      const event = {
        imageUrl: "https://res.cloudinary.com/dphudd2z1/image/upload/v12345/poster.png",
      };
      expect(resolveSocialImage(event)).toBe("https://res.cloudinary.com/dphudd2z1/image/upload/v12345/poster.png");
    });

    it("should fall back to campusnode-og-fallback.png when event has no imageUrl", () => {
      const eventNoImg = { imageUrl: "" };
      expect(resolveSocialImage(eventNoImg, "https://clubsetu.nikhim.me")).toBe("https://clubsetu.nikhim.me/campusnode-og-fallback.png");

      const eventNullImg = { imageUrl: null };
      expect(resolveSocialImage(eventNullImg, "https://clubsetu.nikhim.me")).toBe("https://clubsetu.nikhim.me/campusnode-og-fallback.png");
    });
  });

  describe("generateEventSocialHtml", () => {
    const mockEvent = {
      id: "event-123",
      slug: "tech-fiesta-2026",
      title: "Tech Fiesta 2026",
      description: "Annual technical extravaganza organized by the Computer Science Society.",
      imageUrl: "https://res.cloudinary.com/demo/image/upload/v123/techfiesta.jpg",
      venue: "Main Audi",
      club: { clubName: "CS Society" },
    };

    it("should render a full HTML document with all required Open Graph and Twitter Card tags", () => {
      const html = generateEventSocialHtml(mockEvent, {
        canonicalDomain: "https://clubsetu.nikhim.me",
      });

      // Title and Description
      expect(html).toContain("<title>Tech Fiesta 2026 | CampusNode</title>");
      expect(html).toContain('<meta name="description" content="Annual technical extravaganza');

      // Canonical URL
      expect(html).toContain('<link rel="canonical" href="https://clubsetu.nikhim.me/events/tech-fiesta-2026">');

      // Open Graph Tags
      expect(html).toContain('<meta property="og:type" content="website">');
      expect(html).toContain('<meta property="og:site_name" content="CampusNode">');
      expect(html).toContain('<meta property="og:title" content="Tech Fiesta 2026 | CampusNode">');
      expect(html).toContain('<meta property="og:url" content="https://clubsetu.nikhim.me/events/tech-fiesta-2026">');
      expect(html).toContain('<meta property="og:image" content="https://res.cloudinary.com/demo/image/upload/v123/techfiesta.jpg">');
      expect(html).toContain('<meta property="og:image:width" content="1200">');
      expect(html).toContain('<meta property="og:image:height" content="630">');

      // Twitter Card Tags
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(html).toContain('<meta name="twitter:title" content="Tech Fiesta 2026 | CampusNode">');
      expect(html).toContain('<meta name="twitter:image" content="https://res.cloudinary.com/demo/image/upload/v123/techfiesta.jpg">');

      // Client Fallback Redirect
      expect(html).toContain('<meta http-equiv="refresh" content="0;url=https://clubsetu.nikhim.me/events/tech-fiesta-2026">');
      expect(html).toContain('window.location.replace("https://clubsetu.nikhim.me/events/tech-fiesta-2026")');
    });

    it("should escape special characters in event title to prevent HTML breaking", () => {
      const eventWithQuotes = {
        ...mockEvent,
        title: 'Debate on "AI & Future" <2026>',
      };
      const html = generateEventSocialHtml(eventWithQuotes);

      expect(html).toContain("&quot;AI &amp; Future&quot; &lt;2026&gt;");
      expect(html).not.toContain('<meta property="og:title" content="Debate on "AI');
    });
  });

  describe("generateDefaultSocialHtml", () => {
    it("should generate safe branded metadata without leaking private event information", () => {
      const html = generateDefaultSocialHtml({
        canonicalDomain: "https://clubsetu.nikhim.me",
        message: "This event is currently under review.",
      });

      expect(html).toContain("<title>CampusNode - NIT Jalandhar Clubs &amp; Events</title>");
      expect(html).toContain("This event is currently under review.");
      expect(html).toContain('<meta property="og:image" content="https://clubsetu.nikhim.me/campusnode-og-fallback.png">');
      expect(html).toContain('<meta property="og:type" content="website">');
    });
  });
});
