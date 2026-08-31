export const allowedOrigins = [
  "https://clubsetu.vercel.app",
  "https://www.clubsetu.vercel.app",
  "https://clubsetu.nikhim.me",
  "https://www.clubsetu.nikhim.me",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

export const getClientUrl = (origin) => {
  return allowedOrigins.includes(origin) ? origin : (process.env.CLIENT_URL || "https://clubsetu.nikhim.me");
};

export const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin);
    
    const isPreview = origin && (
      /\.nikhim\.me$/.test(origin) ||
      /\.vercel\.app$/.test(origin) ||
      origin.startsWith("http://192.168.") // typical local network IPs
    );
    
    if (isAllowed || isPreview) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin missing from allowed list: ${origin}`);
      callback(new Error(`Not allowed by CORS origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "If-Modified-Since",
    "If-None-Match",
    "If-Match",
    "If-Unmodified-Since",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Request-Id",
    "Cache-Control",
    "Pragma",
    "Range"
  ],
  exposedHeaders: [
    "ETag",
    "Last-Modified",
    "Content-Length",
    "Content-Range",
    "X-Request-Id",
    "X-Response-Time"
  ],
  maxAge: 86400,
};
