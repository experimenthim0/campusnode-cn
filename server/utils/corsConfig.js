const defaultOrigins = [
  "https://clubsetu.vercel.app",
  "https://www.clubsetu.vercel.app",
  "https://clubsetu.nikhim.me",
  "https://www.clubsetu.nikhim.me",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://campusnode.vercel.app",
  "https://campusnode-stagging.vercel.app"
];

const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const allowedOrigins = [...new Set([
  ...defaultOrigins,
  ...configuredOrigins,
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
])];

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

    if (isAllowed) {
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
    "Expires",
    "expires",
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

