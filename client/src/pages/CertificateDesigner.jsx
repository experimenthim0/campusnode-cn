import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { getEventById } from "../services/eventService";
import {
  uploadCertificateTemplate,
  saveCertificateTemplate,
} from "../services/certificateService";
import { useNotification } from "../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Laptop,
  Award,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  QrCode as QrIcon,
  Type,
  Hash,
  Trophy,
  Trash2,
  Sparkles,
  Sliders,
  Move,
  Upload,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import ShimmerText from "../components/ShimmerText";

const FONTS = [
  {
    id: "DancingScript",
    label: "Dancing Script",
    css: "'Dancing Script', cursive",
  },
  { id: "GreatVibes", label: "Great Vibes", css: "'Great Vibes', cursive" },
  { id: "Pacifico", label: "Pacifico", css: "'Pacifico', cursive" },
  { id: "Sacramento", label: "Sacramento", css: "'Sacramento', cursive" },
  { id: "Allura", label: "Allura", css: "'Allura', cursive" },
  {
    id: "PinyonScript",
    label: "Pinyon Script",
    css: "'Pinyon Script', cursive",
  },
  {
    id: "Helvetica-Bold",
    label: "Helvetica Bold",
    css: "sans-serif",
    weight: "700",
  },
  { id: "Helvetica", label: "Helvetica", css: "sans-serif" },
  { id: "Times-Bold", label: "Times Bold", css: "serif", weight: "700" },
  { id: "Times-Roman", label: "Times Roman", css: "serif" },
];

const formatRollNumber = (rollNo, format = "parentheses") => {
  if (!rollNo) return "";
  const cleaned = String(rollNo).trim();
  switch (format) {
    case "plain":
    case "number":
      return cleaned;
    case "dash":
    case "hyphen":
      return `- ${cleaned}`;
    case "prefix":
    case "label":
      return `Roll No. ${cleaned}`;
    case "parentheses":
    case "brackets":
    default:
      return `(${cleaned})`;
  }
};

const CertificateDesigner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Canvas ref and loaded background image
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);

  // Active element tab: 'name' | 'rollNo' | 'position' | 'qr'
  const [activeElement, setActiveElement] = useState("name");

  // Interaction mode: 'none' | 'drawing' | 'moving' | 'resizing'
  const [dragMode, setDragMode] = useState("none");
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState(null);

  // 1. Name Element State
  const [rect, setRect] = useState(null);
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState("#1a1a1a");
  const [font, setFont] = useState("DancingScript");
  const [align, setAlign] = useState("center");
  const [previewName, setPreviewName] = useState("Himanshu Yadav");

  // 2. Roll Number Element State
  const [showRollNo, setShowRollNo] = useState(false);
  const [rollNoRect, setRollNoRect] = useState(null);
  const [rollNoFontSize, setRollNoFontSize] = useState(20);
  const [rollNoColor, setRollNoColor] = useState("#2a2a2a");
  const [rollNoFont, setRollNoFont] = useState("Helvetica");
  const [rollNoAlign, setRollNoAlign] = useState("center");
  const [rollNoFormat, setRollNoFormat] = useState("parentheses");
  const [previewRollNo, setPreviewRollNo] = useState("24103042");

  // 3. Position / Award Element State
  const [showPosition, setShowPosition] = useState(false);
  const [positionRect, setPositionRect] = useState(null);
  const [positionFontSize, setPositionFontSize] = useState(24);
  const [positionColor, setPositionColor] = useState("#1a1a1a");
  const [positionFont, setPositionFont] = useState("Helvetica-Bold");
  const [positionAlign, setPositionAlign] = useState("center");
  const [previewPosition, setPreviewPosition] = useState("Winner");

  // 4. QR Verification Code State
  const [showQr, setShowQr] = useState(false);
  const [qrRect, setQrRect] = useState(null);
  const [qrErrorCorrectionLevel, setQrErrorCorrectionLevel] = useState("M");
  const [qrImageObj, setQrImageObj] = useState(null);

  // UI state
  const [imageUrl, setImageUrl] = useState("");
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [allowMobileView, setAllowMobileView] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      showNotification(
        "Page link copied! Open it on your laptop or desktop.",
        "success"
      );
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      showNotification("Could not copy link to clipboard.", "error");
    }
  };

  // Generate preview QR code
  useEffect(() => {
    const generatePreviewQr = async () => {
      try {
        const previewUrl = `${window.location.origin}/verify/certificate/preview-sample`;
        const dataUrl = await QRCode.toDataURL(previewUrl, {
          margin: 1,
          errorCorrectionLevel: qrErrorCorrectionLevel,
          color: { dark: "#000000", light: "#ffffff" },
        });
        const img = new Image();
        img.onload = () => setQrImageObj(img);
        img.src = dataUrl;
      } catch (err) {
        console.error("Failed to generate preview QR code", err);
      }
    };
    generatePreviewQr();
  }, [qrErrorCorrectionLevel]);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  // Close font menu on outside click
  useEffect(() => {
    const handler = () => setFontMenuOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const fetchEvent = async () => {
    try {
      const res = await getEventById(id);
      setEvent(res.data);
      if (!res.data?.provideCertificate && !res.data?.certificateTemplate) {
        showNotification("Certificate designer is not enabled for this event. You can enable it in Edit Event (Step 4).", "warning");
        navigate("/profile");
        return;
      }
      if (res.data.certificateTemplate) {
        const t = res.data.certificateTemplate;
        setImageUrl(t.imageUrl || "");

        // Name
        setFontSize(t.fontSize || 32);
        setColor(t.color || "#1a1a1a");
        setFont(t.font || "DancingScript");
        setAlign(t.align || "center");

        // Roll No
        setShowRollNo(!!t.showRollNo);
        setRollNoFontSize(t.rollNoFontSize || 20);
        setRollNoColor(t.rollNoColor || "#2a2a2a");
        setRollNoFont(t.rollNoFont || "Helvetica");
        setRollNoAlign(t.rollNoAlign || "center");
        setRollNoFormat(t.rollNoFormat || "parentheses");

        // Position
        setShowPosition(!!t.showPosition);
        setPositionFontSize(t.positionFontSize || 24);
        setPositionColor(t.positionColor || "#1a1a1a");
        setPositionFont(t.positionFont || "Helvetica-Bold");
        setPositionAlign(t.positionAlign || "center");

        // QR
        setShowQr(t.showQr !== undefined ? !!t.showQr : false);
        setQrErrorCorrectionLevel(t.qrErrorCorrectionLevel || "M");

        if (t.imageUrl) loadBackgroundImage(t.imageUrl, t);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      showNotification("Failed to load event details", "error");
      setLoading(false);
    }
  };

  const loadBackgroundImage = (url, template = null) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      const container = canvasRef.current?.parentElement;
      let availableWidth = img.naturalWidth;
      if (container) {
        const comp = window.getComputedStyle(container);
        const padLeft = parseFloat(comp.paddingLeft) || 0;
        const padRight = parseFloat(comp.paddingRight) || 0;
        availableWidth = Math.max(200, container.clientWidth - padLeft - padRight);
      }
      const scale = Math.min(1, availableWidth / img.naturalWidth);

      if (template) {
        if (template.nameWidth) {
          setRect({
            x: template.nameX * scale,
            y: template.nameY * scale,
            w: template.nameWidth * scale,
            h: template.nameHeight * scale,
          });
        }
        if (template.rollNoWidth) {
          setRollNoRect({
            x: (template.rollNoX || 0) * scale,
            y: (template.rollNoY || 0) * scale,
            w: template.rollNoWidth * scale,
            h: template.rollNoHeight * scale,
          });
        }
        if (template.positionWidth) {
          setPositionRect({
            x: (template.positionX || 0) * scale,
            y: (template.positionY || 0) * scale,
            w: template.positionWidth * scale,
            h: template.positionHeight * scale,
          });
        }
        if (template.qrWidth) {
          setQrRect({
            x: (template.qrX || 0) * scale,
            y: (template.qrY || 0) * scale,
            w: template.qrWidth * scale,
            h: (template.qrHeight || template.qrWidth) * scale,
          });
        }
      }
    };
    img.src = url;
  };

  // Quick placement helpers
  const handleQuickPlaceRollNo = () => {
    if (!rect) {
      return showNotification(
        "Please position the Student Name first",
        "warning"
      );
    }
    setShowRollNo(true);
    setRollNoRect({
      x: rect.x,
      y: rect.y + rect.h + 12,
      w: rect.w,
      h: Math.max(30, rect.h * 0.65),
    });
    setActiveElement("rollNo");
  };

  const handleQuickPlacePosition = () => {
    if (!rect) {
      return showNotification(
        "Please position the Student Name first",
        "warning"
      );
    }
    setShowPosition(true);
    const yOffset = rollNoRect ? rollNoRect.y + rollNoRect.h + 12 : rect.y + rect.h + 12;
    setPositionRect({
      x: rect.x,
      y: yOffset,
      w: rect.w,
      h: Math.max(35, rect.h * 0.75),
    });
    setActiveElement("position");
  };

  const handleQuickPlaceQr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setShowQr(true);
    const size = Math.min(100, canvas.width * 0.15);
    setQrRect({
      x: canvas.width - size - 24,
      y: canvas.height - size - 24,
      w: size,
      h: size,
    });
    setActiveElement("qr");
  };

  // ── Render Canvas with All Elements ──
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    const container = canvas.parentElement;
    let availableWidth = image.naturalWidth;
    if (container) {
      const comp = window.getComputedStyle(container);
      const padLeft = parseFloat(comp.paddingLeft) || 0;
      const padRight = parseFloat(comp.paddingRight) || 0;
      availableWidth = Math.max(200, container.clientWidth - padLeft - padRight);
    }
    const scale = Math.min(1, availableWidth / image.naturalWidth);

    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Helper: draw bounding box with handles
    const drawBox = (r, label, isSelected, colorRgba = "90, 110, 210") => {
      if (!r || r.w < 2 || r.h < 2) return;
      ctx.save();
      if (isSelected) {
        ctx.strokeStyle = `rgba(${colorRgba}, 0.9)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = `rgba(${colorRgba}, 0.08)`;
        ctx.fillRect(r.x, r.y, r.w, r.h);

        // Corner Resize Handle at bottom right
        const handleSize = 8;
        ctx.fillStyle = `rgba(${colorRgba}, 1)`;
        ctx.fillRect(
          r.x + r.w - handleSize / 2,
          r.y + r.h - handleSize / 2,
          handleSize,
          handleSize
        );

        // Badge tag
        ctx.font = "bold 10px sans-serif";
        const tagText = ` ${label} `;
        const textMetrics = ctx.measureText(tagText);
        ctx.fillStyle = `rgba(${colorRgba}, 0.95)`;
        ctx.fillRect(r.x, Math.max(0, r.y - 18), textMetrics.width + 6, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(tagText, r.x + 3, Math.max(12, r.y - 6));
      } else {
        ctx.strokeStyle = `rgba(160, 160, 160, 0.4)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
    };

    // Helper: draw text element
    const drawTextElement = (text, r, fontId, size, textColor, textAlignment) => {
      if (!r || r.w < 2 || r.h < 2) return;
      const fontObj = FONTS.find((f) => f.id === fontId) || FONTS[0];
      const fontWeight = fontObj.weight || "400";
      ctx.save();
      ctx.font = `${fontWeight} ${size * scale}px ${fontObj.css}`;
      ctx.fillStyle = textColor;
      ctx.textBaseline = "middle";
      const midY = r.y + r.h / 2;

      if (textAlignment === "center") {
        ctx.textAlign = "center";
        ctx.fillText(text, r.x + r.w / 2, midY, r.w);
      } else if (textAlignment === "left") {
        ctx.textAlign = "left";
        ctx.fillText(text, r.x + 6, midY, r.w - 6);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(text, r.x + r.w - 6, midY, r.w - 6);
      }
      ctx.restore();
    };

    // 1. Draw Student Name Element
    if (rect) {
      drawTextElement(
        previewName || "Student Name",
        rect,
        font,
        fontSize,
        color,
        align
      );
      drawBox(rect, "Student Name", activeElement === "name", "59, 130, 246");
    }

    // 2. Draw Roll Number Element
    if (showRollNo && rollNoRect) {
      const rollFormatted = formatRollNumber(previewRollNo || "24103042", rollNoFormat);
      drawTextElement(
        rollFormatted,
        rollNoRect,
        rollNoFont,
        rollNoFontSize,
        rollNoColor,
        rollNoAlign
      );
      drawBox(
        rollNoRect,
        "Roll Number",
        activeElement === "rollNo",
        "16, 185, 129"
      );
    }

    // 3. Draw Position / Award Element
    if (showPosition && positionRect) {
      drawTextElement(
        previewPosition || "Winner",
        positionRect,
        positionFont,
        positionFontSize,
        positionColor,
        positionAlign
      );
      drawBox(
        positionRect,
        "Award Standing",
        activeElement === "position",
        "245, 158, 11"
      );
    }

    // 4. Draw QR Code Element
    if (showQr && qrRect) {
      if (qrImageObj) {
        ctx.save();
        ctx.drawImage(qrImageObj, qrRect.x, qrRect.y, qrRect.w, qrRect.h);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrRect.x, qrRect.y, qrRect.w, qrRect.h);
        ctx.strokeStyle = "#333333";
        ctx.strokeRect(qrRect.x, qrRect.y, qrRect.w, qrRect.h);
        ctx.fillStyle = "#111111";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("QR Code", qrRect.x + qrRect.w / 2, qrRect.y + qrRect.h / 2);
        ctx.restore();
      }
      drawBox(qrRect, "Verification QR", activeElement === "qr", "168, 85, 247");
    }
  }, [
    image,
    activeElement,
    rect,
    font,
    fontSize,
    color,
    align,
    previewName,
    showRollNo,
    rollNoRect,
    rollNoFont,
    rollNoFontSize,
    rollNoColor,
    rollNoAlign,
    rollNoFormat,
    previewRollNo,
    showPosition,
    positionRect,
    positionFont,
    positionFontSize,
    positionColor,
    positionAlign,
    previewPosition,
    showQr,
    qrRect,
    qrImageObj,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await uploadCertificateTemplate(formData);
      const { secure_url } = res.data;
      setImageUrl(secure_url);
      loadBackgroundImage(secure_url);
      showNotification("Template uploaded successfully!", "success");
    } catch (err) {
      console.error("Certificate upload error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Upload failed. Please try again.";
      showNotification(`Upload error: ${errMsg}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = r.width > 0 ? canvas.width / r.width : 1;
    const scaleY = r.height > 0 ? canvas.height / r.height : 1;
    return {
      x: (clientX - r.left) * scaleX,
      y: (clientY - r.top) * scaleY,
    };
  };

  // Helper: check if point is inside a rect
  const isInside = (pos, r) =>
    r &&
    pos.x >= r.x &&
    pos.x <= r.x + r.w &&
    pos.y >= r.y &&
    pos.y <= r.y + r.h;

  // Helper: check if point is on bottom-right resize handle
  const isResizeHandle = (pos, r) => {
    if (!r) return false;
    const handleSize = 14;
    return (
      pos.x >= r.x + r.w - handleSize &&
      pos.x <= r.x + r.w + handleSize &&
      pos.y >= r.y + r.h - handleSize &&
      pos.y <= r.y + r.h + handleSize
    );
  };

  // Get active rect helper
  const getActiveRect = () => {
    switch (activeElement) {
      case "name":
        return rect;
      case "rollNo":
        return rollNoRect;
      case "position":
        return positionRect;
      case "qr":
        return qrRect;
      default:
        return rect;
    }
  };

  const setActiveRect = (newR) => {
    switch (activeElement) {
      case "name":
        setRect(newR);
        break;
      case "rollNo":
        setRollNoRect(newR);
        setShowRollNo(true);
        break;
      case "position":
        setPositionRect(newR);
        setShowPosition(true);
        break;
      case "qr":
        setQrRect(newR);
        setShowQr(true);
        break;
      default:
        setRect(newR);
    }
  };

  const handleMouseDown = (e) => {
    if (!image) return;
    e.preventDefault();
    const pos = getPos(e);

    // 1. Check if clicking on active element's resize handle
    const currentActiveRect = getActiveRect();
    if (isResizeHandle(pos, currentActiveRect)) {
      setDragMode("resizing");
      setDragStart(pos);
      setInitialRect({ ...currentActiveRect });
      return;
    }

    // 2. Check if clicking on any placed element to select it
    if (showQr && isInside(pos, qrRect)) {
      setActiveElement("qr");
      setDragMode("moving");
      setDragStart(pos);
      setInitialRect({ ...qrRect });
      return;
    }
    if (showPosition && isInside(pos, positionRect)) {
      setActiveElement("position");
      setDragMode("moving");
      setDragStart(pos);
      setInitialRect({ ...positionRect });
      return;
    }
    if (showRollNo && isInside(pos, rollNoRect)) {
      setActiveElement("rollNo");
      setDragMode("moving");
      setDragStart(pos);
      setInitialRect({ ...rollNoRect });
      return;
    }
    if (isInside(pos, rect)) {
      setActiveElement("name");
      setDragMode("moving");
      setDragStart(pos);
      setInitialRect({ ...rect });
      return;
    }

    // 3. Clicked empty canvas space -> start drawing new box for active element
    setDragMode("drawing");
    setDragStart(pos);
  };

  const handleMouseMove = (e) => {
    if (dragMode === "none" || !image) return;
    e.preventDefault();
    const pos = getPos(e);

    if (dragMode === "drawing") {
      const w = Math.abs(pos.x - dragStart.x);
      const h =
        activeElement === "qr"
          ? w // maintain square aspect ratio for QR
          : Math.abs(pos.y - dragStart.y);

      setActiveRect({
        x: Math.min(pos.x, dragStart.x),
        y: Math.min(pos.y, dragStart.y),
        w,
        h,
      });
    } else if (dragMode === "moving" && initialRect) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      setActiveRect({
        ...initialRect,
        x: Math.max(0, initialRect.x + dx),
        y: Math.max(0, initialRect.y + dy),
      });
    } else if (dragMode === "resizing" && initialRect) {
      const dw = pos.x - dragStart.x;
      const dh =
        activeElement === "qr"
          ? dw // maintain square ratio for QR
          : pos.y - dragStart.y;

      const newW = Math.max(20, initialRect.w + dw);
      const newH = Math.max(20, initialRect.h + dh);

      setActiveRect({
        ...initialRect,
        w: newW,
        h: newH,
      });
    }
  };

  const handleMouseUp = (e) => {
    if (dragMode === "none" || !image) return;
    const currentR = getActiveRect();
    if (dragMode === "drawing" && currentR) {
      if (currentR.w < 15 || currentR.h < 15) {
        // Ignored tiny accidental click
        setActiveRect(initialRect);
      }
    }
    setDragMode("none");
    setInitialRect(null);
  };

  const handleSave = async () => {
    if (!imageUrl) {
      return showNotification("Please upload a template first", "warning");
    }
    if (!rect) {
      return showNotification(
        "Please position the Student Name on the canvas",
        "warning"
      );
    }

    setSaving(true);
    const canvas = canvasRef.current;
    const scaleX = image.naturalWidth / canvas.width;
    const scaleY = image.naturalHeight / canvas.height;

    const payload = {
      imageUrl,
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,

      // 1. Student Name
      nameX: Math.round(rect.x * scaleX),
      nameY: Math.round(rect.y * scaleY),
      nameWidth: Math.round(rect.w * scaleX),
      nameHeight: Math.round(rect.h * scaleY),
      fontSize,
      color,
      font,
      align,

      // 2. Roll Number
      showRollNo: !!showRollNo && !!rollNoRect,
      rollNoX: rollNoRect ? Math.round(rollNoRect.x * scaleX) : 0,
      rollNoY: rollNoRect ? Math.round(rollNoRect.y * scaleY) : 0,
      rollNoWidth: rollNoRect ? Math.round(rollNoRect.w * scaleX) : 0,
      rollNoHeight: rollNoRect ? Math.round(rollNoRect.h * scaleY) : 0,
      rollNoFontSize,
      rollNoColor,
      rollNoFont,
      rollNoAlign,
      rollNoFormat,

      // 3. Position / Award
      showPosition: !!showPosition && !!positionRect,
      positionX: positionRect ? Math.round(positionRect.x * scaleX) : 0,
      positionY: positionRect ? Math.round(positionRect.y * scaleY) : 0,
      positionWidth: positionRect ? Math.round(positionRect.w * scaleX) : 0,
      positionHeight: positionRect ? Math.round(positionRect.h * scaleY) : 0,
      positionFontSize,
      positionColor,
      positionFont,
      positionAlign,

      // 4. QR Verification Code
      showQr: !!showQr && !!qrRect,
      qrX: qrRect ? Math.round(qrRect.x * scaleX) : 0,
      qrY: qrRect ? Math.round(qrRect.y * scaleY) : 0,
      qrWidth: qrRect ? Math.round(qrRect.w * scaleX) : 0,
      qrHeight: qrRect ? Math.round(qrRect.h * scaleY) : 0,
      qrErrorCorrectionLevel,
    };

    try {
      await saveCertificateTemplate(id, payload);
      showNotification("Certificate template saved successfully!", "success");
      navigate(`/profile`);
    } catch (err) {
      console.error(err);
      showNotification(
        err.response?.data?.message || "Failed to save template",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const currentFontObj = FONTS.find((f) => f.id === font) || FONTS[0];
  const canSave = !!imageUrl && !!rect;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ShimmerText text="Loading certificate designer..." className="text-sm font-semibold tracking-wide" />
      </div>
    );
  }

  return (
    <>
      {/* Small Screen / Mobile Fallback Notice */}
      {!allowMobileView && (
        <div className="lg:hidden min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
          <Card className="w-full max-w-md shadow-lg border-border bg-card">
            <CardContent className="p-6 sm:p-8">
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                <Monitor className="w-8 h-8" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-card border border-border flex items-center justify-center text-primary shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>

              <Badge variant="outline" className="gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 mb-3">
                <Laptop className="w-3 h-3" /> Desktop or Laptop Recommended
              </Badge>

              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-2">
                Precision Studio Workspace
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                The <strong>Certificate Designer</strong> provides real-time drag-and-drop
                positioning for student names, roll numbers, awards, and cryptographic QR codes.
                A desktop viewport offers pixel-perfect alignment.
              </p>

              <div className="space-y-2.5">
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full gap-2 shadow-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Link Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link for Laptop
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="w-full gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Go Back
                </Button>
              </div>

              <div className="mt-5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAllowMobileView(true)}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Continue on mobile display anyway →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Designer Workspace */}
      <div
        className={`${allowMobileView ? "block" : "hidden lg:block"} min-h-screen bg-muted/20 pb-12 transition-colors`}
      >
        {allowMobileView && (
          <div className="lg:hidden bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              Mobile editing active — touch and drag to position boxes
            </span>
            <button
              onClick={() => setAllowMobileView(false)}
              className="text-amber-900 dark:text-amber-200 font-semibold underline cursor-pointer ml-2 shrink-0"
            >
              Exit
            </button>
          </div>
        )}

        {/* Top Sticky Navbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md transition-colors shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profile")}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Back to events"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  Certificate Designer
                </span>
                {event?.title && (
                  <Badge variant="secondary" className="font-normal text-xs truncate max-w-[160px] sm:max-w-xs">
                    {event.title}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="h-8 text-xs font-semibold"
              >
                {saving ? "Saving…" : "Save Template"}
              </Button>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Sidebar Controls */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full lg:w-84 flex-shrink-0 space-y-4"
            >
              {/* 1. Background Template Upload */}
              <Card className="border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      1 · Background Canvas
                    </CardTitle>
                    {imageUrl && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                        Loaded
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <label
                    className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all border-2 border-dashed
                    ${
                      imageUrl
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                        : "border-border bg-muted/30 hover:border-primary/50 text-muted-foreground"
                    }
                  `}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium text-foreground">Uploading template…</span>
                      </>
                    ) : imageUrl ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-semibold text-foreground">
                          Replace Template Artwork
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          High-res PNG or JPG
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">
                          Upload Certificate Artwork
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          PNG or JPG (e.g. 1920x1080)
                        </span>
                      </>
                    )}
                  </label>
                </CardContent>
              </Card>

              {/* 2. Designer Elements Selector */}
              <Card className="border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      2 · Active Element
                    </CardTitle>
                    <span className="text-[11px] text-muted-foreground">
                      Click to configure
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Name Element Pill */}
                    <button
                      type="button"
                      onClick={() => setActiveElement("name")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeElement === "name"
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30 shadow-xs"
                          : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeElement === "name"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Type className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">Name</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {rect ? "Placed" : "Draw box"}
                        </p>
                      </div>
                    </button>

                    {/* Roll Number Pill */}
                    <button
                      type="button"
                      onClick={() => setActiveElement("rollNo")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeElement === "rollNo"
                          ? "border-emerald-500 bg-emerald-500/5 text-foreground ring-1 ring-emerald-500/30 shadow-xs"
                          : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeElement === "rollNo"
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Hash className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">Roll No</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {showRollNo ? (rollNoRect ? "Active" : "Enabled") : "Off"}
                        </p>
                      </div>
                    </button>

                    {/* Award Position Pill */}
                    <button
                      type="button"
                      onClick={() => setActiveElement("position")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeElement === "position"
                          ? "border-amber-500 bg-amber-500/5 text-foreground ring-1 ring-amber-500/30 shadow-xs"
                          : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeElement === "position"
                            ? "bg-amber-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">Award</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {showPosition ? (positionRect ? "Active" : "Enabled") : "Off"}
                        </p>
                      </div>
                    </button>

                    {/* QR Code Pill */}
                    <button
                      type="button"
                      onClick={() => setActiveElement("qr")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activeElement === "qr"
                          ? "border-purple-500 bg-purple-500/5 text-foreground ring-1 ring-purple-500/30 shadow-xs"
                          : "border-border bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeElement === "qr"
                            ? "bg-purple-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <QrIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">QR Code</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {showQr ? (qrRect ? "Active" : "Enabled") : "Off"}
                        </p>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Contextual Element Customization Panel */}
              <Card className="border-border shadow-xs bg-card">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        {activeElement === "name" && "Student Name Settings"}
                        {activeElement === "rollNo" && "Roll Number Settings"}
                        {activeElement === "position" && "Award Position Settings"}
                        {activeElement === "qr" && "QR Verification Settings"}
                      </span>
                    </div>

                    {/* Enable/Disable Toggle for Optional Elements */}
                    {activeElement === "rollNo" && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showRollNo}
                          onChange={(e) => setShowRollNo(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600" />
                      </label>
                    )}
                    {activeElement === "position" && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPosition}
                          onChange={(e) => setShowPosition(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-600" />
                      </label>
                    )}
                    {activeElement === "qr" && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showQr}
                          onChange={(e) => setShowQr(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600" />
                      </label>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 space-y-4">
                  {/* NAME SETTINGS */}
                  {activeElement === "name" && (
                    <div className="space-y-4">
                      {/* Font */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-medium">
                          Font Typography
                        </label>
                        <div
                          className="relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setFontMenuOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 border border-input rounded-md hover:bg-muted/50 transition-all text-foreground text-left"
                            style={{ fontFamily: currentFontObj.css }}
                          >
                            <span className="text-sm">
                              {currentFontObj.label}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>

                          <AnimatePresence>
                            {fontMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full mt-1.5 left-0 right-0 bg-popover border border-border rounded-lg overflow-hidden z-40 shadow-md max-h-56 overflow-y-auto"
                              >
                                {FONTS.map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => {
                                      setFont(f.id);
                                      setFontMenuOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted/60 transition-all border-b border-border/50 last:border-0 ${
                                      font === f.id
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-foreground"
                                    }`}
                                    style={{
                                      fontFamily: f.css,
                                      fontWeight: f.weight || "400",
                                    }}
                                  >
                                    {f.label}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Size + Color */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">
                            Font Size (px)
                          </label>
                          <Input
                            type="number"
                            value={fontSize}
                            onChange={(e) =>
                              setFontSize(Number(e.target.value) || 32)
                            }
                            min={12}
                            max={120}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground font-medium">
                            Text Color
                          </label>
                          <div className="relative">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => setColor(e.target.value)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            <div className="w-full h-9 rounded-md border border-input flex items-center gap-2 px-2.5 bg-background cursor-pointer">
                              <div
                                className="w-4 h-4 rounded-full border border-border shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs font-mono text-muted-foreground truncate">
                                {color}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alignment */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-medium">
                          Alignment
                        </label>
                        <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                          {["left", "center", "right"].map((a) => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => setAlign(a)}
                              className={`py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                                align === a
                                  ? "bg-card text-foreground shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preview Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-medium">
                          Preview Name
                        </label>
                        <Input
                          type="text"
                          value={previewName}
                          onChange={(e) => setPreviewName(e.target.value)}
                          placeholder="e.g. Himanshu Yadav"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* ROLL NUMBER SETTINGS */}
                  {activeElement === "rollNo" && (
                    <div className="space-y-4">
                      {!showRollNo ? (
                        <div className="p-3 bg-muted/30 border border-dashed border-border rounded-lg text-center space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Roll number is currently hidden on this certificate.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setShowRollNo(true);
                              if (!rollNoRect) handleQuickPlaceRollNo();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                          >
                            Enable Roll Number
                          </Button>
                        </div>
                      ) : (
                        <>
                          {!rollNoRect && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleQuickPlaceRollNo}
                              className="w-full gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 h-8"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Place Below Name
                            </Button>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">
                                Font Size (px)
                              </label>
                              <Input
                                type="number"
                                value={rollNoFontSize}
                                onChange={(e) =>
                                  setRollNoFontSize(
                                    Number(e.target.value) || 20
                                  )
                                }
                                min={10}
                                max={60}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">
                                Color
                              </label>
                              <div className="relative">
                                <input
                                  type="color"
                                  value={rollNoColor}
                                  onChange={(e) => setRollNoColor(e.target.value)}
                                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                                <div className="w-full h-9 rounded-md border border-input flex items-center gap-2 px-2.5 bg-background cursor-pointer">
                                  <div
                                    className="w-4 h-4 rounded-full border border-border shrink-0"
                                    style={{ backgroundColor: rollNoColor }}
                                  />
                                  <span className="text-xs font-mono text-muted-foreground truncate">
                                    {rollNoColor}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Font */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Font Typography
                            </label>
                            <select
                              value={rollNoFont}
                              onChange={(e) => setRollNoFont(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-md text-foreground cursor-pointer"
                            >
                              <option value="Helvetica">Helvetica</option>
                              <option value="Helvetica-Bold">Helvetica Bold</option>
                              <option value="Times-Roman">Times Roman</option>
                              <option value="Times-Bold">Times Bold</option>
                              <option value="DancingScript">Dancing Script</option>
                            </select>
                          </div>

                          {/* Alignment */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Alignment
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                              {["left", "center", "right"].map((a) => (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() => setRollNoAlign(a)}
                                  className={`py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                                    rollNoAlign === a
                                      ? "bg-card text-foreground shadow-xs font-semibold"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {a}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Display Format Style */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-muted-foreground font-medium">
                                Format Style
                              </label>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatRollNumber(previewRollNo || "24103042", rollNoFormat)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: "parentheses", label: `(${previewRollNo || "24103042"})`, name: "Parentheses" },
                                { id: "plain", label: `${previewRollNo || "24103042"}`, name: "Plain Number" },
                                { id: "dash", label: `- ${previewRollNo || "24103042"}`, name: "Hyphen Prefix" },
                                { id: "prefix", label: `Roll No. ${previewRollNo || "24103042"}`, name: "Text Prefix" },
                              ].map((fmt) => (
                                <button
                                  key={fmt.id}
                                  type="button"
                                  onClick={() => setRollNoFormat(fmt.id)}
                                  className={`p-2 text-left rounded-lg border transition-all cursor-pointer ${
                                    rollNoFormat === fmt.id
                                      ? "border-emerald-500 bg-emerald-500/10 text-foreground font-medium shadow-xs ring-1 ring-emerald-500/20"
                                      : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                                  }`}
                                >
                                  <div className="text-[11px] font-mono truncate">{fmt.label}</div>
                                  <div className="text-[9px] text-muted-foreground mt-0.5">{fmt.name}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Preview Roll No */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Sample Roll Number
                            </label>
                            <Input
                              type="text"
                              value={previewRollNo}
                              onChange={(e) => setPreviewRollNo(e.target.value)}
                              placeholder="e.g. 21103042"
                              className="h-9 text-xs"
                            />
                          </div>

                          {rollNoRect && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setRollNoRect(null)}
                              className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Roll Box
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* AWARD POSITION SETTINGS */}
                  {activeElement === "position" && (
                    <div className="space-y-4">
                      {!showPosition ? (
                        <div className="p-3 bg-muted/30 border border-dashed border-border rounded-lg text-center space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Standing / Position is hidden on this certificate.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setShowPosition(true);
                              if (!positionRect) handleQuickPlacePosition();
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                          >
                            Enable Award Field
                          </Button>
                        </div>
                      ) : (
                        <>
                          {!positionRect && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleQuickPlacePosition}
                              className="w-full gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 h-8"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Place Below Name
                            </Button>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">
                                Font Size (px)
                              </label>
                              <Input
                                type="number"
                                value={positionFontSize}
                                onChange={(e) =>
                                  setPositionFontSize(
                                    Number(e.target.value) || 24
                                  )
                                }
                                min={12}
                                max={60}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground font-medium">
                                Color
                              </label>
                              <div className="relative">
                                <input
                                  type="color"
                                  value={positionColor}
                                  onChange={(e) =>
                                    setPositionColor(e.target.value)
                                  }
                                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                                <div className="w-full h-9 rounded-md border border-input flex items-center gap-2 px-2.5 bg-background cursor-pointer">
                                  <div
                                    className="w-4 h-4 rounded-full border border-border shrink-0"
                                    style={{ backgroundColor: positionColor }}
                                  />
                                  <span className="text-xs font-mono text-muted-foreground truncate">
                                    {positionColor}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Font */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Font Typography
                            </label>
                            <select
                              value={positionFont}
                              onChange={(e) => setPositionFont(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-md text-foreground cursor-pointer"
                            >
                              <option value="Helvetica-Bold">Helvetica Bold</option>
                              <option value="Helvetica">Helvetica</option>
                              <option value="Times-Bold">Times Bold</option>
                              <option value="Times-Roman">Times Roman</option>
                              <option value="GreatVibes">Great Vibes</option>
                            </select>
                          </div>

                          {/* Alignment */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Alignment
                            </label>
                            <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                              {["left", "center", "right"].map((a) => (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() => setPositionAlign(a)}
                                  className={`py-1 text-xs font-medium rounded-md capitalize transition-all cursor-pointer ${
                                    positionAlign === a
                                      ? "bg-card text-foreground shadow-xs font-semibold"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {a}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Preview Standing */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Preview Standing Value
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {["Winner", "Runner-Up", "Participant"].map(
                                (pos) => (
                                  <button
                                    key={pos}
                                    type="button"
                                    onClick={() => setPreviewPosition(pos)}
                                    className={`py-1.5 px-2 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                                      previewPosition === pos
                                        ? "border-amber-500 bg-amber-500/10 text-foreground font-semibold"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {pos}
                                  </button>
                                )
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              *Automatically mapped from event winner records on issuance.
                            </p>
                          </div>

                          {positionRect && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setPositionRect(null)}
                              className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Award Box
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* QR VERIFICATION SETTINGS */}
                  {activeElement === "qr" && (
                    <div className="space-y-4">
                      {!showQr ? (
                        <div className="p-3 bg-muted/30 border border-dashed border-border rounded-lg text-center space-y-2">
                          <p className="text-xs text-muted-foreground">
                            QR verification code is currently disabled.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setShowQr(true);
                              if (!qrRect) handleQuickPlaceQr();
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                          >
                            Enable QR Verification
                          </Button>
                        </div>
                      ) : (
                        <>
                          {!qrRect && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleQuickPlaceQr}
                              className="w-full gap-1.5 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 h-8"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Place at Bottom Right
                            </Button>
                          )}

                          {/* Size Presets */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Dimensions Preset
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { label: "Compact", size: 70 },
                                { label: "Standard", size: 100 },
                                { label: "Prominent", size: 130 },
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    if (qrRect) {
                                      setQrRect({
                                        ...qrRect,
                                        w: preset.size,
                                        h: preset.size,
                                      });
                                    } else {
                                      handleQuickPlaceQr();
                                    }
                                  }}
                                  className="py-1.5 px-2 text-[11px] font-medium rounded-md border border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Error Correction Level */}
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground font-medium">
                              Error Correction Level
                            </label>
                            <select
                              value={qrErrorCorrectionLevel}
                              onChange={(e) =>
                                setQrErrorCorrectionLevel(e.target.value)
                              }
                              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-md text-foreground cursor-pointer"
                            >
                              <option value="L">L — 7% Recovery (Crisp)</option>
                              <option value="M">M — 15% Recovery (Recommended)</option>
                              <option value="Q">Q — 25% Recovery (High)</option>
                              <option value="H">H — 30% Recovery (Max)</option>
                            </select>
                          </div>

                          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed space-y-1">
                            <p className="font-semibold flex items-center gap-1.5">
                              <QrIcon className="w-3.5 h-3.5 shrink-0" />
                              Cryptographic Verification
                            </p>
                            <p className="text-muted-foreground">
                              Upon issuance, this QR code embeds an unguessable 256-bit slug pointing directly to CampusNode's public verification engine.
                            </p>
                          </div>

                          {qrRect && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setQrRect(null)}
                              className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove QR Code
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Canvas Workspace */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="flex-1 min-w-0 w-full"
            >
              <Card className="border-border shadow-xs bg-card overflow-hidden">
                {/* Canvas Toolbar */}
                <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-border gap-2 bg-card">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {!imageUrl ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        <span>Upload a certificate template image to begin</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>
                          Editing:{" "}
                          <strong className="text-foreground capitalize font-semibold">
                            {activeElement === "name" && "Student Name"}
                            {activeElement === "rollNo" && "Roll Number"}
                            {activeElement === "position" && "Award Position"}
                            {activeElement === "qr" && "QR Verification Code"}
                          </strong>
                        </span>
                        <span className="text-muted-foreground/60 hidden sm:inline">· Drag box or bottom-right handle to adjust</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getActiveRect() && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveRect(null)}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                      >
                        Clear active box
                      </Button>
                    )}
                  </div>
                </div>

                {/* Canvas Area */}
                <div className="bg-muted/30 flex items-center justify-center min-h-[520px] relative overflow-auto p-4 sm:p-6">
                  {!imageUrl ? (
                    <div className="text-center py-20 px-8 max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-card shadow-xs border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                        <Award className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        No Template Uploaded
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Upload your high-resolution certificate artwork on the left to activate the placement canvas.
                      </p>
                    </div>
                  ) : (
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onTouchStart={handleMouseDown}
                      onTouchMove={handleMouseMove}
                      onTouchEnd={handleMouseUp}
                      className="cursor-crosshair block rounded-lg shadow-sm border border-border"
                      style={{ maxWidth: "100%" }}
                    />
                  )}
                </div>

                {/* Bottom Status Bar */}
                <div className="px-4 py-2.5 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground bg-card">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px]">
                      {getActiveRect()
                        ? `X: ${Math.round(getActiveRect().x)}  Y: ${Math.round(getActiveRect().y)}  W: ${Math.round(getActiveRect().w)}  H: ${Math.round(getActiveRect().h)}`
                        : "Click and drag to position selected element"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${rect ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      Name
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${showRollNo && rollNoRect ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                      Roll No
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${showPosition && positionRect ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
                      Award
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${showQr && qrRect ? "bg-purple-500" : "bg-muted-foreground/30"}`} />
                      QR
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CertificateDesigner;
