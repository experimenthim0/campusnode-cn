import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import { 
  downloadCertificate, 
  saveTemplate, 
  uploadTemplateProxy,
  verifyCertificateByToken,
  revokeCertificate,
  getIssuedCertificates
} from "../controllers/certificateController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Only jpeg, png, and webp images are allowed."), false);
  },
});

// ── Public Endpoint: Certificate Verification (No Auth Required) ──
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { message: "Too many verification requests. Please try again later." },
});

router.get("/verify/:token", verifyLimiter, verifyCertificateByToken);

// ── Protected Endpoints (Authentication Required) ──
router.use(verifyToken);

router.post("/:eventId/template", requirePermission(PERMISSIONS.EVENT_CERTIFICATE), saveTemplate);

router.post("/upload-template", requirePermission(PERMISSIONS.EVENT_CERTIFICATE), upload.single("file"), uploadTemplateProxy);

router.get("/:eventId/download", downloadCertificate);

router.patch("/:id/revoke", requirePermission(PERMISSIONS.EVENT_CERTIFICATE), revokeCertificate);

router.get("/:eventId/issued", requirePermission(PERMISSIONS.EVENT_CERTIFICATE), getIssuedCertificates);

export default router;
