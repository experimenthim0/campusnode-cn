
import "dotenv/config";
import fs from "fs";
import path from "path";
import QRCodeModule from "../../client/node_modules/qrcode/lib/index.js";
import { signTicket } from "../services/qrSigningService.js";

const QRCode = QRCodeModule.default || QRCodeModule;

const DEMO_EVENT_ID = "demo_event_2026";
const WRONG_EVENT_ID = "other_hackathon_2026";

const sampleTickets = [
  { id: 1, ticketId: "tkt_demo_001", name: "Alex Johnson", branch: "Computer Science", rollNo: "21BCS001", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #1 — Valid Entry" },
  { id: 2, ticketId: "tkt_demo_002", name: "Priya Sharma", branch: "Electronics & Comm", rollNo: "21BEC002", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #2 — Valid Entry" },
  { id: 3, ticketId: "tkt_demo_003", name: "Rahul Verma", branch: "Information Tech", rollNo: "21BIT003", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #3 — Valid Entry" },
  { id: 4, ticketId: "tkt_demo_004", name: "Ananya Patel", branch: "Mechanical Eng", rollNo: "21BME004", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #4 — Valid Entry" },
  { id: 5, ticketId: "tkt_demo_005", name: "Rohan Gupta", branch: "Electrical Eng", rollNo: "21BEE005", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #5 — Valid Entry" },
  { id: 6, ticketId: "tkt_demo_006", name: "Sneha Reddy", branch: "Civil Engineering", rollNo: "21BCE006", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #6 — Valid Entry" },
  { id: 7, ticketId: "tkt_demo_007", name: "Vikram Malhotra", branch: "Aerospace Eng", rollNo: "21BAE007", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #7 — Valid Entry" },
  { id: 8, ticketId: "tkt_demo_008", name: "Kavya Nair", branch: "Biotechnology", rollNo: "21BBT008", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #8 — Valid Entry" },
  { id: 9, ticketId: "tkt_demo_009", name: "Aditya Singh", branch: "Computer Science", rollNo: "21BCS009", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #9 — Valid Entry" },
  { id: 10, ticketId: "tkt_demo_010", name: "Meera Iyer", branch: "Artificial Intel", rollNo: "21BAI010", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #10 — Valid Entry" },
  { id: 11, ticketId: "tkt_demo_011", name: "Karan Desai", branch: "Data Science", rollNo: "21BDS011", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #11 — Valid Entry" },
  { id: 12, ticketId: "tkt_demo_012", name: "Tanvi Saxena", branch: "Electronics & Comm", rollNo: "21BEC012", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #12 — Valid Entry" },
  { id: 13, ticketId: "tkt_demo_013", name: "Siddharth Rao", branch: "Cyber Security", rollNo: "21BCY013", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #13 — Valid Entry" },
  { id: 14, ticketId: "tkt_demo_014", name: "Pooja Hegde", branch: "Information Tech", rollNo: "21BIT014", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #14 — Valid Entry" },
  { id: 15, ticketId: "tkt_demo_015", name: "Arjun Kapoor", branch: "Computer Science", rollNo: "21BCS015", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #15 — Valid Entry" },
  { id: 16, ticketId: "tkt_demo_016", name: "Ishaan Ghosh", branch: "Robotics Eng", rollNo: "21BRO016", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #16 — Valid Entry" },
  { id: 17, ticketId: "tkt_demo_017", name: "Divya Joshi", branch: "Chemical Eng", rollNo: "21BCH017", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #17 — Valid Entry" },
  { id: 18, ticketId: "tkt_demo_018", name: "Nikhil Menon", branch: "Mechanical Eng", rollNo: "21BME018", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #18 — Valid Entry" },
  { id: 19, ticketId: "tkt_demo_019", name: "Shreya Ghoshal", branch: "Computer Science", rollNo: "21BCS019", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #19 — Valid Entry" },
  { id: 20, ticketId: "tkt_demo_020", name: "Manish Pandey", branch: "Information Tech", rollNo: "21BIT020", eventId: DEMO_EVENT_ID, testType: "VALID_ENTRY", desc: "✓ Pass #20 — Valid Entry" },

  { id: 21, ticketId: "tkt_demo_001", name: "Alex Johnson (Duplicate Test)", branch: "Computer Science", rollNo: "21BCS001", eventId: DEMO_EVENT_ID, testType: "DUPLICATE_TEST", desc: "⚠ Duplicate Test (Same as Pass #1) — Should alert ALREADY CHECKED IN" },
  { id: 22, ticketId: "tkt_demo_002", name: "Priya Sharma (Duplicate Test)", branch: "Electronics & Comm", rollNo: "21BEC002", eventId: DEMO_EVENT_ID, testType: "DUPLICATE_TEST", desc: "⚠ Duplicate Test (Same as Pass #2) — Should alert ALREADY CHECKED IN" },
  { id: 23, ticketId: "tkt_demo_003", name: "Rahul Verma (Duplicate Test)", branch: "Information Tech", rollNo: "21BIT003", eventId: DEMO_EVENT_ID, testType: "DUPLICATE_TEST", desc: "⚠ Duplicate Test (Same as Pass #3) — Should alert ALREADY CHECKED IN" },

  { id: 24, ticketId: "tkt_demo_024", name: "Marcus Lee (Refunded)", branch: "Computer Science", rollNo: "21BCS024", eventId: DEMO_EVENT_ID, testType: "CANCELLED_TEST", desc: "✕ Cancelled Pass — Should show REGISTRATION CANCELLED" },
  { id: 25, ticketId: "tkt_demo_025", name: "Zara Khan (Cancelled)", branch: "Biotechnology", rollNo: "21BBT025", eventId: DEMO_EVENT_ID, testType: "CANCELLED_TEST", desc: "✕ Cancelled Pass — Should show REGISTRATION CANCELLED" },
  { id: 26, ticketId: "tkt_demo_026", name: "Kunal Bahl (Revoked)", branch: "Data Science", rollNo: "21BDS026", eventId: DEMO_EVENT_ID, testType: "CANCELLED_TEST", desc: "✕ Cancelled Pass — Should show REGISTRATION CANCELLED" },

  { id: 27, ticketId: "tkt_demo_027", name: "Devansh Roy (Other Event)", branch: "Robotics", rollNo: "21BRO027", eventId: WRONG_EVENT_ID, testType: "WRONG_EVENT", desc: "✕ Wrong Event — Ticket issued for RoboWars, not HackSprint" },
  { id: 28, ticketId: "tkt_demo_028", name: "Natasha Roman (Other Event)", branch: "Aerospace", rollNo: "21BAE028", eventId: WRONG_EVENT_ID, testType: "WRONG_EVENT", desc: "✕ Wrong Event — Ticket issued for AeroExpo, not HackSprint" },

  // 29-30: Tampered / Counterfeit QR Passes
  { id: 29, ticketId: "tkt_demo_029", name: "Forged Payload (Modified Sig)", branch: "Unknown", rollNo: "FAKE029", eventId: DEMO_EVENT_ID, testType: "TAMPERED_SIG", desc: "✕ Security Verification Failed — Signature bytes corrupted" },
  { id: 30, ticketId: "tkt_demo_030", name: "Invalid QR (Random Data)", branch: "Unknown", rollNo: "FAKE030", eventId: DEMO_EVENT_ID, testType: "INVALID_FORMAT", desc: "✕ Security Verification Failed — Non-CampusNode QR code" }
];

async function generateHtml() {
  const renderedTickets = [];

  for (const t of sampleTickets) {
    let payload = "";
    if (t.testType === "TAMPERED_SIG") {
      const valid = signTicket(t.eventId, t.ticketId);
      payload = valid.qrPayload.slice(0, 15) + "X9Z" + valid.qrPayload.slice(18);
    } else if (t.testType === "INVALID_FORMAT") {
      payload = "https://random-website.example.com/tickets/123456789";
    } else {
      const { qrPayload } = signTicket(t.eventId, t.ticketId);
      payload = qrPayload;
    }

    const dataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
    renderedTickets.push({ ...t, qrPayload: payload, dataUrl });
  }

  const cardsHtml = renderedTickets.map((t) => {
    const badgeClass = t.testType === "VALID_ENTRY" ? "badge-valid" : t.testType === "DUPLICATE_TEST" ? "badge-warn" : "badge-error";
    return `
    <div class="card" id="pass-${t.id}">
      <div class="card-top">
        <span class="pass-num">#${t.id} of 30</span>
        <span class="badge ${badgeClass}">${t.testType}</span>
      </div>
      <h3>${t.name}</h3>
      <div class="meta">${t.branch} • ${t.rollNo}</div>
      <div class="qr-container">
        <img src="${t.dataUrl}" alt="${t.name}" width="220" height="220" />
      </div>
      <div class="desc">${t.desc}</div>
    </div>
    `;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CampusNode Scanner — 30 Rapid-Fire Test Passes</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #080c18;
      color: #f8fafc;
      margin: 0;
      padding: 30px 16px 100px 16px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 26px;
      color: #38bdf8;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #94a3b8;
      font-size: 14px;
      margin: 0;
    }
    .banner {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 14px 20px;
      border-radius: 12px;
      max-width: 520px;
      margin: 0 auto 30px auto;
      text-align: center;
      font-size: 14px;
      color: #bae6fd;
      line-height: 1.5;
    }
    .banner strong {
      color: #ffffff;
    }
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .stat-pill {
      background: #141a2e;
      border: 1px solid #1e2640;
      padding: 6px 14px;
      border-radius: 20px;
      color: #94a3b8;
    }
    .stat-pill strong {
      color: #38bdf8;
    }
    .column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 36px;
      max-width: 460px;
      margin: 0 auto;
    }
    .card {
      background: #121829;
      border-radius: 20px;
      padding: 24px;
      border: 1px solid #1e2640;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .card:hover {
      border-color: #38bdf8;
      transform: translateY(-2px);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 12px;
    }
    .pass-num {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      background: #080c18;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .card h3 {
      margin: 0 0 4px 0;
      font-size: 19px;
      color: #ffffff;
      font-weight: 700;
    }
    .card .meta {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 16px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .badge-valid { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
    .badge-warn { background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); }
    .badge-error { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .qr-container {
      background: #ffffff;
      padding: 14px;
      border-radius: 16px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .qr-container img {
      display: block;
      width: 220px;
      height: 220px;
    }
    .desc {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.4;
      background: #080c18;
      padding: 12px 16px;
      border-radius: 10px;
      width: 100%;
      border: 1px solid #1e2640;
    }
    .floating-nav {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      border: 1px solid #334155;
      padding: 8px 18px;
      border-radius: 30px;
      display: flex;
      gap: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 100;
    }
    .floating-nav button {
      background: #0f172a;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .floating-nav button:hover {
      background: #38bdf8;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📱 CampusNode Scanner — 30 Rapid-Fire Test Passes</h1>
    <p>Scroll down one-by-one to test sub-millisecond barcode scanning performance.</p>
  </div>

  <div class="banner">
    🚀 <strong>Speed Test Instructions:</strong> Open Scanner App &rarr; Tap <strong>"🧪 Launch Offline Test Mode"</strong> &rarr; Scroll down and aim camera continuously at each pass!
  </div>

  <div class="stats-bar">
    <div class="stat-pill">Total Passes: <strong>30</strong></div>
    <div class="stat-pill">Valid: <strong>20</strong></div>
    <div class="stat-pill">Duplicates: <strong>3</strong></div>
    <div class="stat-pill">Cancelled: <strong>3</strong></div>
    <div class="stat-pill">Errors: <strong>4</strong></div>
  </div>

  <!-- Single vertical column layout -->
  <div class="column">
    ${cardsHtml}
  </div>

  <div class="floating-nav">
    <button onclick="scrollToPass('prev')">↑ Previous</button>
    <button onclick="scrollToPass('top')">Top</button>
    <button onclick="scrollToPass('next')">↓ Next Pass</button>
  </div>

  <script>
    let currentPass = 1;
    function scrollToPass(dir) {
      if (dir === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        currentPass = 1;
        return;
      }
      if (dir === 'next' && currentPass < 30) currentPass++;
      if (dir === 'prev' && currentPass > 1) currentPass--;
      const el = document.getElementById('pass-' + currentPass);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === ' ') {
        e.preventDefault();
        scrollToPass('next');
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToPass('prev');
      }
    });
  </script>
</body>
</html>`;

  const outputPath = path.resolve(process.cwd(), "test-tickets.html");
  fs.writeFileSync(outputPath, html, "utf8");
  console.log(`✓ Generated 30 visual test tickets at: ${outputPath}`);
}

generateHtml().catch(console.error);
