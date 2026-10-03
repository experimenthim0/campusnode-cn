/**
 * Ticket Typography & Font Loader
 * Provides custom TrueType fonts (Instrument Sans & JetBrains Mono)
 * for @pdfme/generator ticket rendering.
 */

let cachedFonts = null;

export const loadTicketFonts = async () => {
  if (cachedFonts) return cachedFonts;

  // 1. In Node environment (tests / script execution)
  if (typeof window === 'undefined' || (typeof process !== 'undefined' && process?.versions?.node)) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      let fontDir;
      try {
        fontDir = fileURLToPath(new URL('../assets/fonts', import.meta.url));
      } catch {
        fontDir = path.resolve(process.cwd(), 'src/assets/fonts');
        if (!fs.existsSync(fontDir)) {
          fontDir = path.resolve(process.cwd(), 'client/src/assets/fonts');
        }
      }

      if (fs.existsSync(fontDir)) {
        cachedFonts = {
          'InstrumentSans-Regular': {
            data: fs.readFileSync(path.join(fontDir, 'InstrumentSans-Regular.ttf')),
            fallback: true,
          },
          'InstrumentSans-Medium': {
            data: fs.readFileSync(path.join(fontDir, 'InstrumentSans-Medium.ttf')),
          },
          'InstrumentSans-SemiBold': {
            data: fs.readFileSync(path.join(fontDir, 'InstrumentSans-SemiBold.ttf')),
          },
          'InstrumentSans-Bold': {
            data: fs.readFileSync(path.join(fontDir, 'InstrumentSans-Bold.ttf')),
          },
          'JetBrainsMono-Medium': {
            data: fs.readFileSync(path.join(fontDir, 'JetBrainsMono-Medium.ttf')),
          },
        };
        return cachedFonts;
      }
    } catch (nodeErr) {
      console.warn('[ticketFonts] Node font load error:', nodeErr);
    }
  }

  // 2. In browser environment: load from /fonts/ (Vite public directory)
  const fontDefinitions = [
    { name: 'InstrumentSans-Regular', file: 'InstrumentSans-Regular.ttf', fallback: true },
    { name: 'InstrumentSans-Medium', file: 'InstrumentSans-Medium.ttf' },
    { name: 'InstrumentSans-SemiBold', file: 'InstrumentSans-SemiBold.ttf' },
    { name: 'InstrumentSans-Bold', file: 'InstrumentSans-Bold.ttf' },
    { name: 'JetBrainsMono-Medium', file: 'JetBrainsMono-Medium.ttf' },
  ];

  try {
    const results = await Promise.all(
      fontDefinitions.map(async ({ name, file, fallback }) => {
        try {
          const res = await fetch(`/fonts/${file}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          return [name, { data: new Uint8Array(buf), fallback: !!fallback }];
        } catch (err) {
          console.warn(`[ticketFonts] Failed to load /fonts/${file}:`, err);
          return null;
        }
      })
    );

    const fontMap = {};
    for (const item of results) {
      if (item) fontMap[item[0]] = item[1];
    }

    if (Object.keys(fontMap).length > 0) {
      cachedFonts = fontMap;
      return cachedFonts;
    }
  } catch (err) {
    console.warn('[ticketFonts] Error loading ticket fonts in browser:', err);
  }

  return undefined;
};
