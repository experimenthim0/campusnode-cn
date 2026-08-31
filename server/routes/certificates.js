import express from "express";
import multer from "multer";
import { verifyToken, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "../utils/rbac.js";
import { 
  downloadCertificate, 
  saveTemplate, 
  uploadTemplateProxy 
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

router.use(verifyToken);

router.post("/:eventId/template", requirePermission(PERMISSIONS.EVENT_CERTIFICATE), saveTemplate);

router.post("/upload-template", requirePermission(PERMISSIONS.EVENT_CERTIFICATE), upload.single("file"), uploadTemplateProxy);

router.get("/:eventId/download", downloadCertificate);

export default router;
