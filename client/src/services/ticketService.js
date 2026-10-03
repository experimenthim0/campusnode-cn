import QRCode from 'qrcode';

/**
 * CampusNode Ticket Service
 * Handles QR code generation, canvas ticket rendering using CampusNode brand tokens,
 * and seamless ticket image downloads.
 */

export const BRAND_COLORS = {
  // Primary brand blues
  blue: '#0094FF',        // Brand 500
  blueHover: '#0078D4',   // Brand 600
  blueDark: '#0061AD',    // Brand 700
  
  // Brand navy scale
  navyRich: '#064F89',    // Brand 800
  navy: '#0B416F',        // Brand 900
  navyDark: '#062B49',    // Brand 950
  
  // Brand soft tints
  blue50: '#EFF8FF',      // Brand 50
  blue100: '#DFF1FF',     // Brand 100
  blue200: '#B8E1FF',     // Brand 200
  blue300: '#7CCAFF',     // Brand 300
  
  // Clean accents
  white: '#FFFFFF',
  mutedText: '#5A7A9A',   // Slate brand blue muted
  lightBorder: '#D9E8F5', // Soft brand divider
  notchBg: '#F0F6FA',     // Subtle contrast notch
};

/**
 * Ensures the navbar's custom logo font ('logofont') and other canvas fonts are loaded.
 */
const ensureFontsReady = async () => {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.allSettled([
      document.fonts.load('32px "logofont"'),
      document.fonts.load('bold 32px "logofont"'),
      document.fonts.load('130px "logofont"'),
      document.fonts.load('16px "myfont"'),
      document.fonts.ready,
    ]);
  } catch (err) {
    console.warn('TicketService: Font loading notice:', err);
  }
};

/**
 * Draws rounded rectangle with fallback.
 */
const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
};

/**
 * Helper to truncate text with ellipsis if it exceeds maxWidth.
 */
const truncateText = (ctx, text, maxWidth) => {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? truncated + '...' : text;
};

/**
 * Loads an image from a URL/dataURL asynchronously.
 */
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

/**
 * Generates QR Code Data URL with brand-optimal contrast.
 * @param {string} payload 
 * @returns {Promise<string>}
 */
export const generateTicketQrUrl = async (payload) => {
  if (!payload) throw new Error('No QR payload provided');
  return await QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: {
      dark: '#062B49', // Deep brand navy
      light: '#FFFFFF',
    },
  });
};

/**
 * Renders the high-fidelity branded CampusNode event ticket onto a canvas.
 * @param {Object} options
 * @param {Object} options.ticket - The registration/ticket object
 * @param {string} options.qrDataUrl - Data URL for the QR code
 * @param {Object} [options.user] - The logged in user
 * @returns {Promise<HTMLCanvasElement>}
 */
export const generateTicketCanvas = async ({ ticket, qrDataUrl, user }) => {
  if (!ticket) throw new Error('Ticket data is required');

  await ensureFontsReady();

  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  const ev = ticket.eventId || ticket.event || {};
  const passId = ticket.qrCode || ticket.id || ticket._id || 'PASS';

  const organizerName =
    ev.club?.clubName ||
    ev.club?.name ||
    ev.organizers?.[0]?.club?.clubName ||
    ev.centralOrganizer?.name ||
    (ev.organizerType === 'CENTRAL_ORGANIZATION' ? 'Central Student Body' : null) ||
    ev.createdBy?.name ||
    'CampusNode';

  const attendeeName =
    ticket.student?.name ||
    user?.name ||
    'Guest Participant';

  const attendeeRoll =
    ticket.student?.rollNo ||
    user?.rollNo ||
    null;

  const eventDateObj = ev.startTime ? new Date(ev.startTime) : null;
  const isValidDate = eventDateObj && !isNaN(eventDateObj.getTime());

  const formattedDate = isValidDate
    ? eventDateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : 'TBA';

  const formattedTime = isValidDate
    ? eventDateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : 'TBA';

  const venue = ev.venue || 'Campus Venue TBA';

  // 1. Base Ticket Card Background (Main 700px section)
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.fillRect(0, 0, 700, canvas.height);

  // 2. Subtle Brand Geometric Background Hatching
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 148, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = -400; i < 700; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 400, 400);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Left Brand Border Accent Stripe
  const accentGrad = ctx.createLinearGradient(0, 0, 12, 400);
  accentGrad.addColorStop(0, BRAND_COLORS.blue);
  accentGrad.addColorStop(0.5, BRAND_COLORS.blueHover);
  accentGrad.addColorStop(1, BRAND_COLORS.navy);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, 12, canvas.height);

  // 4. Ghost Watermark using navbar's exact 'logofont'
  ctx.save();
  ctx.font = 'bold 125px "logofont", serif';
  ctx.fillStyle = 'rgba(0, 148, 255, 0.035)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(340, 230);
  ctx.rotate(-Math.PI / 14);
  ctx.fillText('Campusnode', 0, 0);
  ctx.restore();

  // 5. Header Branding: Navbar Logo Font ("Campus" + "node")
  const brandX = 55;
  const brandY = 62;
  ctx.save();
  ctx.font = '32px "logofont", serif';
  ctx.letterSpacing = '1px';
  ctx.fillStyle = BRAND_COLORS.navyDark;
  ctx.fillText('Campus', brandX, brandY);
  const campusWidth = ctx.measureText('Campus').width;
  ctx.fillStyle = BRAND_COLORS.blue;
  ctx.fillText('node', brandX + campusWidth, brandY);
  ctx.restore();

  // Top Category / Security Pill Tag (top-right of main card)
  ctx.save();
  const pillText = ticket.team?.teamName ? `TEAM: ${ticket.team.teamName}` : 'OFFICIAL PASS';
  ctx.font = 'bold 11px "myfont", sans-serif';
  const pillWidth = Math.min(220, ctx.measureText(pillText.toUpperCase()).width + 24);
  const pillX = 660 - pillWidth;
  const pillY = 42;
  drawRoundedRect(ctx, pillX, pillY, pillWidth, 24, 12);
  ctx.fillStyle = BRAND_COLORS.blue50;
  ctx.fill();
  ctx.strokeStyle = BRAND_COLORS.blue200;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = BRAND_COLORS.blueHover;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncateText(ctx, pillText.toUpperCase(), pillWidth - 16), pillX + pillWidth / 2, pillY + 12);
  ctx.restore();

  // Subtitle under logo
  ctx.save();
  ctx.font = 'bold 10px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.mutedText;
  ctx.letterSpacing = '1.5px';
  ctx.fillText('DIGITAL ADMISSION CREDENTIAL', 56, 84);
  ctx.restore();

  // 6. Event Name Title
  ctx.save();
  ctx.font = 'bold 34px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.navyDark;
  const rawTitle = ev.title || 'Event Admission Pass';
  const displayTitle = truncateText(ctx, rawTitle, 600);
  ctx.fillText(displayTitle, 55, 134);

  // Organizer info
  ctx.font = '13px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.mutedText;
  ctx.fillText(`Organized by ${truncateText(ctx, organizerName, 500)}`, 55, 158);
  ctx.restore();

  // Horizontal divider
  ctx.save();
  ctx.strokeStyle = BRAND_COLORS.lightBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(55, 178);
  ctx.lineTo(660, 178);
  ctx.stroke();
  ctx.restore();

  // 7. Grid of Details (Row 1 & Row 2)
  const drawField = (label, value, x, y, width) => {
    ctx.save();
    ctx.font = 'bold 11px "myfont", sans-serif';
    ctx.fillStyle = BRAND_COLORS.mutedText;
    ctx.letterSpacing = '0.5px';
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.font = 'bold 18px "myfont", sans-serif';
    ctx.fillStyle = BRAND_COLORS.navyDark;
    ctx.letterSpacing = '0px';
    const displayVal = width ? truncateText(ctx, value, width) : value;
    ctx.fillText(displayVal, x, y + 24);
    ctx.restore();
  };

  // Row 1
  drawField('Participant', attendeeName, 55, 208, 260);
  if (attendeeRoll) {
    drawField('Roll Number', attendeeRoll, 340, 208, 160);
  } else if (ticket.team?.teamName) {
    drawField('Team Registration', ticket.team.teamName, 340, 208, 200);
  } else {
    drawField('Pass Type', 'Student Attendee', 340, 208, 180);
  }

  // Row 2
  drawField('Date', formattedDate, 55, 276, 170);
  drawField('Time', formattedTime, 240, 276, 180);
  drawField('Venue', venue, 430, 276, 230);

  // Bottom Security / Compliance Badge
  ctx.save();
  ctx.font = 'bold 9.5px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.mutedText;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('SECURE PASS • PRESENT FOR VERIFICATION AT ENTRANCE • CAMPUSNODE ADMISSION', 55, 365);
  ctx.restore();

  // 8. Right Ticket Stub (700 to 1000) using New Brand Colors Only
  const stubGrad = ctx.createLinearGradient(700, 0, 1000, 400);
  stubGrad.addColorStop(0, BRAND_COLORS.navy);     // #0B416F
  stubGrad.addColorStop(1, BRAND_COLORS.navyDark); // #062B49
  ctx.fillStyle = stubGrad;
  ctx.fillRect(700, 0, 300, canvas.height);

  // Subtle radial glow behind the QR code
  ctx.save();
  const qrGlow = ctx.createRadialGradient(850, 192, 10, 850, 192, 150);
  qrGlow.addColorStop(0, 'rgba(0, 148, 255, 0.22)');
  qrGlow.addColorStop(1, 'rgba(0, 148, 255, 0)');
  ctx.fillStyle = qrGlow;
  ctx.fillRect(700, 40, 300, 310);
  ctx.restore();

  // Stub Perforation Notches (Top & Bottom)
  ctx.fillStyle = BRAND_COLORS.notchBg;
  ctx.beginPath();
  ctx.arc(700, 0, 22, 0, Math.PI, false);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(700, 400, 22, Math.PI, 0, false);
  ctx.fill();

  // Dashed tear-line along perforation
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(700, 28);
  ctx.lineTo(700, 372);
  ctx.stroke();
  ctx.restore();

  // Stub Title & Instructions
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.letterSpacing = '1.5px';
  ctx.fillText('ENTRY PASS', 850, 46);

  ctx.font = '10px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.blue300;
  ctx.letterSpacing = '1px';
  ctx.fillText('SCAN FOR ENTRY', 850, 64);
  ctx.restore();

  // QR Code Box with Brand Blue Border
  const qrSize = 196;
  const qrX = 850 - qrSize / 2;
  const qrY = 86;

  // Outer border with brand color
  drawRoundedRect(ctx, qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 12);
  ctx.fillStyle = BRAND_COLORS.blue;
  ctx.fill();

  // Inner clean white background
  drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 10);
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.fill();

  // Draw the QR Code image if available
  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      ctx.save();
      // Clip to rounded rect so QR corners don't poke out
      drawRoundedRect(ctx, qrX + 2, qrY + 2, qrSize - 4, qrSize - 4, 8);
      ctx.clip();
      ctx.drawImage(qrImg, qrX + 4, qrY + 4, qrSize - 8, qrSize - 8);
      ctx.restore();
    } catch (e) {
      console.error('TicketService: Failed to render QR image into canvas:', e);
    }
  }

  // Stub Serial Code & Footer
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.blue200;
  ctx.letterSpacing = '1.5px';
  ctx.fillText('PASS CODE', 850, 318);

  ctx.font = 'bold 15px "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.letterSpacing = '1px';
  ctx.fillText(passId, 850, 342);

  ctx.font = '9px "myfont", sans-serif';
  ctx.fillStyle = BRAND_COLORS.blue300;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('NON-TRANSFERABLE PASS', 850, 366);
  ctx.restore();

  return canvas;
};

/**
 * Downloads the event ticket as a branded PNG image.
 * @param {Object} options
 * @param {Object} options.ticket - The registration/ticket object
 * @param {string} options.qrDataUrl - Data URL for the QR code
 * @param {Object} [options.user] - The logged in user
 * @param {string} [options.filename] - Optional filename
 * @returns {Promise<string>} - Returns generated data URL
 */
export const downloadTicketImage = async ({ ticket, qrDataUrl, user, filename }) => {
  const canvas = await generateTicketCanvas({ ticket, qrDataUrl, user });
  const dataUrl = canvas.toDataURL('image/png');
  const code = ticket?.qrCode || ticket?._id || ticket?.id || 'pass';
  const downloadName = filename || `CampusNode-Ticket-${code}.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return dataUrl;
};

/**
 * Safely converts an image URL to a base64 Data URL for pdfme embedding.
 * Supports cross-origin images via browser canvas or fetch fallback,
 * with a strict timeout to ensure PDF generation never hangs.
 * @param {string} url - Image URL or data URL
 * @param {number} [timeoutMs=3000] - Maximum wait time
 * @returns {Promise<string>} - Base64 Data URL or empty string
 */
export const convertImageUrlToDataUrl = async (url, timeoutMs = 3000) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;

  const fetchWithTimeout = async () => {
    // 1. In browser environment, try Image + Canvas (handles CDN CORS configs cleanly)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const dataUrlFromImg = await new Promise((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.88));
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = reject;
          img.src = url;
        });
        if (dataUrlFromImg) return dataUrlFromImg;
      } catch {
        // Fall back to fetch below
      }
    }

    // 2. Fetch fallback (works in browser & node)
    try {
      const res = await fetch(url);
      if (!res.ok) return '';
      if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      } else {
        const arrayBuffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
      }
    } catch {
      return '';
    }
  };

  return Promise.race([
    fetchWithTimeout(),
    new Promise((resolve) => setTimeout(() => resolve(''), timeoutMs)),
  ]);
};

/**
 * Generates an official CampusNode Event Entry Pass as a PDF (Uint8Array).
 * Utilizes @pdfme/generator with dynamic code splitting to maintain lightweight client bundle.
 * @param {Object} options
 * @param {Object} options.ticket - The registration/ticket object
 * @param {Object} [options.user] - The logged in user
 * @returns {Promise<Uint8Array>}
 */
const ACRONYMS = new Set([
  'CTF', 'AI', 'ML', 'NITJ', 'NIT', 'IT', 'CSE', 'ECE', 'EE', 'ME', 'CE', 'ICE',
  'IPE', 'TT', 'BT', 'HM', 'IEEE', 'ACM', 'GDSC', 'IEDC', 'ID', 'TBA', 'UI', 'UX',
  'API', 'WEB3', 'DEV'
]);

/**
 * Converts a string to Title Case while preserving short technical/institutional acronyms.
 */
export const toTicketTitleCase = (str) => {
  if (!str) return '';
  return str
    .split(/(\s+|[-/·&:,])/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || /^[-/·&:,]$/.test(part)) return part;
      const upper = part.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      const lower = part.toLowerCase();
      if (['and', 'or', 'the', 'of', 'in', 'at', 'by', 'for', 'with', 'on', 'to'].includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
};

/**
 * Strips the organizer's name from the beginning of the title if already displayed above it.
 */
export const stripOrganizerFromTitle = (title, organizer) => {
  if (!title) return '';
  if (!organizer) return title.trim();
  const org = organizer.trim().toLowerCase();
  let t = title.trim();
  if (t.toLowerCase().startsWith(org)) {
    t = t.slice(org.length).replace(/^[\s\-–—:|]+/, '').trim();
  }
  return t || title.trim();
};

/**
 * Formats time range dropping repeated am/pm, e.g. "2:00 – 5:00 pm".
 */
export const formatTicketTimeRange = (startTime, endTime) => {
  const parseTime = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    let h = dateObj.getHours();
    const min = dateObj.getMinutes().toString().padStart(2, '0');
    const meridiem = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    h = h ? h : 12;
    return { h, min, m: meridiem };
  };

  const s = parseTime(startTime);
  const e = parseTime(endTime);

  if (!s && !e) return 'TBA';
  if (!s) return `${e.h}:${e.min} ${e.m}`;
  if (!e) return `${s.h}:${s.min} ${s.m} onwards`;

  if (s.m === e.m) {
    return `${s.h}:${s.min} – ${e.h}:${e.min} ${s.m}`;
  }
  return `${s.h}:${s.min} ${s.m} – ${e.h}:${e.min} ${e.m}`;
};

/**
 * Generates an official CampusNode Event Entry Pass as a PDF (Uint8Array).
 * Utilizes @pdfme/generator with dynamic code splitting to maintain lightweight client bundle.
 * @param {Object} options
 * @param {Object} options.ticket - The registration/ticket object
 * @param {Object} [options.user] - The logged in user
 * @returns {Promise<Uint8Array>}
 */
export const generateTicketPdf = async ({ ticket, user }) => {
  if (!ticket) throw new Error('Ticket data is required');

  // Dynamic code-splitting: @pdfme, fonts, and template loaded only when generating PDF
  let templateMod;
  try {
    templateMod = await import('../assets/ticketTemplate.json', { with: { type: 'json' } });
  } catch {
    templateMod = await import('../assets/ticketTemplate.json');
  }

  const [
    { generate },
    { text, image, line, rectangle, multiVariableText, barcodes },
    { loadTicketFonts },
  ] = await Promise.all([
    import('@pdfme/generator'),
    import('@pdfme/schemas'),
    import('./ticketFonts.js'),
  ]);

  const template = templateMod.default || templateMod;
  const fonts = await loadTicketFonts();

  const ev = ticket.eventId || ticket.event || {};
  const passId = ticket.qrCode || ticket.id || ticket._id || 'PASS';
  const qrPayload = ticket.qrPayload || ticket.qrCode || passId;

  let rawOrganizer =
    ev.club?.clubName ||
    ev.club?.name ||
    ev.organizers?.[0]?.club?.clubName ||
    ev.centralOrganizer?.name ||
    (ev.organizerType === 'CENTRAL_ORGANIZATION' ? 'Central Student Body' : null) ||
    ev.createdBy?.name ||
    'CampusNode';

  // Strip redundant "Organized by" prefix if already present and convert to title case
  const organizerName = toTicketTitleCase(rawOrganizer.replace(/^organized by\s+/i, '').trim());

  // Event title in title case with acronyms preserved, stripping duplicate organizer name
  const rawTitle = ev.title || 'Event Registration';
  const strippedTitle = stripOrganizerFromTitle(rawTitle, organizerName);
  const eventTitle = toTicketTitleCase(strippedTitle);

  const attendeeName = toTicketTitleCase(
    ticket.student?.name ||
    user?.name ||
    'Participant'
  );

  const attendeeEmail =
    ticket.student?.email ||
    user?.email ||
    '';

  const attendeeRoll =
    ticket.student?.rollNo ||
    user?.rollNo ||
    '';

  const eventDateObj = ev.startTime ? new Date(ev.startTime) : null;
  const eventEndDateObj = ev.endTime ? new Date(ev.endTime) : null;
  const isValidDate = eventDateObj && !isNaN(eventDateObj.getTime());

  // e.g. "16 Sept 2026"
  const formattedDate = isValidDate
    ? eventDateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).replace(/\bSept?\b/, 'Sept')
    : 'TBA';

  // e.g. "2:00 – 5:00 pm"
  const formattedTime = formatTicketTimeRange(eventDateObj, eventEndDateObj);

  const venue = toTicketTitleCase(ev.venue || 'IT Building · Lab 1');

  // Format generation timestamp
  const nowStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).replace(/\bSept?\b/, 'Sept');

  const rollText = attendeeRoll || 'N/A';

  const categoryText = toTicketTitleCase(
    ticket.team?.teamName
      ? ticket.team.teamName
      : (ticket.category || (attendeeRoll ? 'Internal' : 'General Participant'))
  );

  const attendeeDetail = rollText !== 'N/A'
    ? `${rollText} · ${categoryText}`
    : categoryText;

  const feeVal = ticket.amount ?? ticket.fee ?? ticket.registrationFee ?? ev.price ?? ev.fee ?? (ev.isPaid ? 100 : 0);
  const isFree = !feeVal || feeVal === 0 || feeVal === '0' || (typeof feeVal === 'string' && feeVal.toLowerCase().includes('free'));
  const feeValueText = isFree
    ? 'Free'
    : (typeof feeVal === 'number' ? `Rs ${Math.round(feeVal)} paid` : `Rs ${feeVal} paid`);

  const issuedDateObj = (ticket.createdAt || ticket.registeredAt || ticket.issuedAt)
    ? new Date(ticket.createdAt || ticket.registeredAt || ticket.issuedAt)
    : new Date();

  const issuedAtStr = !isNaN(issuedDateObj.getTime())
    ? issuedDateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }).replace(/\bSept?\b/, 'Sept')
    : nowStr;

  // Extract embedded college and platform logo content if available in template
  const collegeLogoContent = template.schemas?.[0]?.find((s) => s.name === 'collegeLogo')?.content || '';
  const campusNodeLogoContent = template.schemas?.[0]?.find((s) => s.name === 'campusNodeLogo')?.content || '';

  // Dynamic auto-shrinking rules to ensure text never overflows
  const clonedTemplate = JSON.parse(JSON.stringify(template));
  const schemaList = clonedTemplate.schemas?.[0] || [];

  // Title: 20 pt, shrink to 13 pt if wraps/long
  const eventNameSchema = schemaList.find((s) => s.name === 'eventName');
  if (eventNameSchema) {
    eventNameSchema.fontSize = eventTitle.length > 28 ? 13 : 20;
  }

  // Venue: 9.5 pt, auto-shrink to 7.5 pt if venue wraps/long
  const venueSchema = schemaList.find((s) => s.name === 'eventVenue');
  if (venueSchema) {
    venueSchema.fontSize = venue.length > 24 ? 7.5 : 9.5;
  }

  // Attendee: 15 pt, shrink to 10 pt if long
  const attendeeSchema = schemaList.find((s) => s.name === 'attendeeName');
  if (attendeeSchema) {
    attendeeSchema.fontSize = attendeeName.length > 20 ? 10 : 15;
  }

  // Registration ID: 8.5 pt, auto-shrink to 6 pt so it always stays on one line
  const regIdSchema = schemaList.find((s) => s.name === 'regId');
  if (regIdSchema) {
    regIdSchema.fontSize = passId.length > 18 ? 6 : 8.5;
  }

  const inputs = [{
    // Branding & Header
    collegeLogo: ev.collegeLogo || collegeLogoContent,
    campusNodeLogo: campusNodeLogoContent,
    headerInstitute: 'Dr. B. R. Ambedkar National Institute of Technology\nJalandhar-144008, Punjab (India)',
    institution: 'Dr. B. R. Ambedkar National Institute of Technology, Jalandhar',

    // Main Card: Left side
    organizerName,
    eventName: eventTitle,
    eventDate: formattedDate,
    eventTime: formattedTime,
    eventVenue: venue,
    feeValue: feeValueText,

    // Attendee
    attendeeName,
    attendeeDetail,
    attendeeSubline: attendeeDetail,
    attendeeEmail: attendeeEmail || 'N/A',

    // Footer
    footerInstruction: 'Must present this receipt with Institute ID card at gate. No physical signature is required.',
    issuedTimestamp: `Issued ${issuedAtStr}`,

    // Stub: Right side
    statusPillText: 'Registered',
    qrCode: qrPayload,
    scanAtGate: 'Scan at the gate',
    regId: passId,
    admitsOne: 'Admits one',

    // Backwards compatibility mappings for older components
    ticketId: passId,
    feeAmount: feeValueText,
    admissionStatus: 'Registered',
    paymentStatus: 'Success',
    registrationStatus: 'Confirmed',
    issuedAt: issuedAtStr,
    venue,
    date: formattedDate,
    time: formattedTime,
  }];

  const plugins = {
    text,
    qrcode: barcodes.qrcode,
    image,
    line,
    rectangle,
    multiVariableText,
  };

  const pdf = await generate({
    template: clonedTemplate,
    inputs,
    plugins,
    options: fonts ? { font: fonts } : undefined,
  });
  return pdf;
};

/**
 * Generates and triggers download of the official CampusNode Event Ticket as a high-fidelity PDF.
 * @param {Object} options
 * @param {Object} options.ticket - The registration/ticket object
 * @param {Object} [options.user] - The logged in user
 * @param {string} [options.filename] - Optional custom filename
 * @returns {Promise<Blob>}
 */
export const downloadTicketPdf = async ({ ticket, user, filename }) => {
  const pdfBytes = await generateTicketPdf({ ticket, user });
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const code = ticket?.qrCode || ticket?._id || ticket?.id || 'pass';
  const downloadName = filename || `Campusnode-Ticket-${code}.pdf`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return blob;
};

export default {
  BRAND_COLORS,
  generateTicketQrUrl,
  generateTicketCanvas,
  downloadTicketImage,
  generateTicketPdf,
  downloadTicketPdf,
};
