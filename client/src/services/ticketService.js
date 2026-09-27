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

export default {
  BRAND_COLORS,
  generateTicketQrUrl,
  generateTicketCanvas,
  downloadTicketImage,
};
