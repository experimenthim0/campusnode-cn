import handler from "../../client/api/preview.js";

async function run() {
  const tests = [
    { name: "Event with poster (AA DEKH ZARA 4.0)", slug: "aa-dekh-zara-40" },
    { name: "Event without poster (test-debate-2026)", slug: "test-debate-2026" },
    {
      name: "Event with emojis in title",
      slug: "-blood-donation-camp-tribute-to-amar-shaheed-lala-jagat-narayan-ji-event-category",
    },
    { name: "Non-existent event slug", slug: "invalid-event-xyz-999" },
  ];

  for (const t of tests) {
    console.log("==================================================");
    console.log(`TEST: ${t.name} (slug: ${t.slug})`);
    console.log("==================================================");

    let output = "";
    const req = {
      query: { slug: t.slug },
      headers: {
        host: "clubsetu.nikhim.me",
        "user-agent": "WhatsApp/2.21.12.21 A",
      },
    };

    const res = {
      code: 200,
      headers: {},
      status(c) {
        this.code = c;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
      send(b) {
        output = b;
      },
    };

    await handler(req, res);

    const getMeta = (prop) => {
      const match = output.match(
        new RegExp(`<meta (?:property|name)="${prop}" content="([^"]+)"`)
      );
      return match ? match[1] : "MISSING";
    };

    const titleMatch = output.match(/<title>([^<]+)<\/title>/);
    console.log("  Status Code:  ", res.code);
    console.log("  Cache-Control:", res.headers["Cache-Control"]);
    console.log("  <title>:      ", titleMatch ? titleMatch[1] : "MISSING");
    console.log("  og:title:     ", getMeta("og:title"));
    console.log("  og:description:", getMeta("og:description"));
    console.log("  og:image:     ", getMeta("og:image"));
    console.log("  og:url:       ", getMeta("og:url"));
    console.log("  twitter:card: ", getMeta("twitter:card"));

    // Verify image HTTP HEAD if remote URL
    const imageUrl = getMeta("og:image");
    if (imageUrl && imageUrl.startsWith("https://res.cloudinary.com")) {
      try {
        const imgRes = await fetch(imageUrl, { method: "HEAD" });
        console.log(`  Image Probe:   HTTP ${imgRes.status} (${imgRes.headers.get("content-type")})`);
      } catch (err) {
        console.log(`  Image Probe Error: ${err.message}`);
      }
    }
    console.log("");
  }
}

run().catch(console.error);
