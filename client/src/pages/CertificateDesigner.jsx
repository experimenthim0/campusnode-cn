import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById } from "../services/eventService";
import { uploadCertificateTemplate, saveCertificateTemplate } from "../services/certificateService";
import { useNotification } from "../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";

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

const CertificateDesigner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Canvas
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rect, setRect] = useState(null);

  // Template config
  const [imageUrl, setImageUrl] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState("#1a1a1a");
  const [font, setFont] = useState("DancingScript");
  const [align, setAlign] = useState("center");
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [previewName, setPreviewName] = useState("Himanshu Yadav");

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
      if (res.data.certificateTemplate) {
        const t = res.data.certificateTemplate;
        setImageUrl(t.imageUrl || "");
        setFontSize(t.fontSize || 32);
        setColor(t.color || "#1a1a1a");
        setFont(t.font || "DancingScript");
        setAlign(t.align || "center");
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
      if (template && template.nameWidth) {
        const containerWidth =
          canvasRef.current?.parentElement?.clientWidth || img.naturalWidth;
        const scale = Math.min(1, containerWidth / img.naturalWidth);
        const r = {
          x: template.nameX * scale,
          y: template.nameY * scale,
          w: template.nameWidth * scale,
          h: template.nameHeight * scale,
        };
        setRect(r);
      }
    };
    img.src = url;
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    const containerWidth =
      canvas.parentElement?.clientWidth || image.naturalWidth;
    const scale = Math.min(1, containerWidth / image.naturalWidth);

    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (rect && rect.w > 2 && rect.h > 2) {
      // Selection box
      ctx.save();
      ctx.strokeStyle = "rgba(90, 110, 210, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = "rgba(90, 110, 210, 0.07)";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();

      // Live name preview
      const currentFont = FONTS.find((f) => f.id === font) || FONTS[0];
      const fontWeight = currentFont.weight || "400";
      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${currentFont.css}`;
      ctx.fillStyle = color;
      ctx.textBaseline = "middle";
      const midY = rect.y + rect.h / 2;
      const name = previewName || "Sample Name";

      if (align === "center") {
        ctx.textAlign = "center";
        ctx.fillText(name, rect.x + rect.w / 2, midY, rect.w);
      } else if (align === "left") {
        ctx.textAlign = "left";
        ctx.fillText(name, rect.x + 6, midY, rect.w - 6);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(name, rect.x + rect.w - 6, midY, rect.w - 6);
      }
      ctx.restore();
    }
  }, [image, rect, font, fontSize, color, align, previewName]);

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
      console.error(err);
      showNotification(
        `Upload error: ${err.response?.data?.message || err.message}`,
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const handleMouseDown = (e) => {
    if (!image) return;
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setRect(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !image) return;
    e.preventDefault();
    const pos = getPos(e);
    setRect({
      x: Math.min(pos.x, startPos.x),
      y: Math.min(pos.y, startPos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !image) return;
    setIsDrawing(false);
    const pos = getPos(e);
    const finalRect = {
      x: Math.min(pos.x, startPos.x),
      y: Math.min(pos.y, startPos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    };
    if (finalRect.w < 10 || finalRect.h < 10) {
      setRect(null);
    } else {
      setRect(finalRect);
    }
  };

  const handleSave = async () => {
    if (!imageUrl)
      return showNotification("Please upload a template first", "warning");
    if (!rect)
      return showNotification(
        "Please draw the name area on the canvas",
        "warning",
      );

    setSaving(true);
    const canvas = canvasRef.current;
    const scaleX = image.naturalWidth / canvas.width;
    const scaleY = image.naturalHeight / canvas.height;

    const payload = {
      imageUrl,
      nameX: Math.round(rect.x * scaleX),
      nameY: Math.round(rect.y * scaleY),
      nameWidth: Math.round(rect.w * scaleX),
      nameHeight: Math.round(rect.h * scaleY),
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      fontSize,
      color,
      font,
      align,
    };

    try {
      await saveCertificateTemplate(id, payload);
      showNotification("Template saved!", "success");
      navigate(`/profile`);
    } catch (err) {
      console.error(err);
      showNotification(
        err.response?.data?.message || "Failed to save template",
        "error",
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
        <div className="flex items-center gap-3 text-neutral-400">
          <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading designer…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 md:px-0">
      {/* Top bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/my-events")}
              className="text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="w-px h-5 bg-neutral-200" />
            <div>
              <span className="text-sm font-semibold text-neutral-800">
                Certificate designer
              </span>
              {event?.title && (
                <span className="text-xs text-neutral-400 ml-2">
                  {event.title}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/my-events")}
              className="px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                canSave && !saving
                  ? "bg-neutral-900 text-white hover:bg-neutral-700"
                  : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
              }`}
            >
              {saving ? "Saving…" : "Save template"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-5 items-start">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-64 flex-shrink-0 space-y-4"
          >
            {/* Upload */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">
                1 · Template
              </p>
              <label
                className={`
                flex flex-col items-center justify-center gap-2 p-5 rounded-lg cursor-pointer transition-all
                border-2 border-dashed
                ${
                  imageUrl
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-100 text-neutral-400"
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
                    <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                    <span className="text-xs font-medium">Uploading…</span>
                  </>
                ) : imageUrl ? (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs font-medium">
                      Template uploaded
                    </span>
                    <span className="text-[10px] opacity-60">
                      Click to replace
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                    <span className="text-xs font-medium">Upload image</span>
                    <span className="text-[10px] opacity-60">PNG or JPG</span>
                  </>
                )}
              </label>
            </div>

            {/* Text style */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
                2 · Text style
              </p>

              {/* Font picker */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 font-medium">
                  Font
                </label>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setFontMenuOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-all"
                    style={{ fontFamily: currentFontObj.css }}
                  >
                    <span className="text-sm text-neutral-800">
                      {currentFontObj.label}
                    </span>
                    <motion.svg
                      animate={{ rotate: fontMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </motion.svg>
                  </button>

                  <AnimatePresence>
                    {fontMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-neutral-200 rounded-xl overflow-hidden z-40"
                        style={{ maxHeight: 240, overflowY: "auto" }}
                      >
                        {FONTS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setFont(f.id);
                              setFontMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left text-sm hover:bg-neutral-50 transition-all border-b border-neutral-100 last:border-0 ${font === f.id ? "bg-blue-50 text-blue-700" : "text-neutral-700"}`}
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
                  <label className="text-xs text-neutral-500 font-medium">
                    Size
                  </label>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value) || 32)}
                    min={8}
                    max={120}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 font-medium">
                    Color
                  </label>
                  <div className="relative">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div
                      className="w-full h-9 rounded-lg border border-neutral-200 flex items-center gap-2 px-3 cursor-pointer"
                      style={{ backgroundColor: color + "22" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-mono text-neutral-500">
                        {color}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alignment */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 font-medium">
                  Alignment
                </label>
                <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
                  {[
                    { value: "left", icon: "M3 6h18M3 12h12M3 18h15" },
                    { value: "center", icon: "M3 6h18M6 12h12M4 18h16" },
                    { value: "right", icon: "M3 6h18M9 12h12M6 18h15" },
                  ].map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAlign(a.value)}
                      className={`flex-1 py-2 flex items-center justify-center transition-all ${
                        align === a.value
                          ? "bg-neutral-900 text-white"
                          : "bg-white text-neutral-400 hover:bg-neutral-50"
                      }`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        {a.icon
                          .split("M")
                          .filter(Boolean)
                          .map((d, i) => (
                            <path key={i} d={"M" + d} />
                          ))}
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-1.5">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
                3 · Preview name
              </p>
              <input
                type="text"
                value={previewName}
                onChange={(e) => setPreviewName(e.target.value)}
                placeholder="Type any name…"
                className="w-full px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 transition-all"
              />
              {/* <p className="text-[10px] text-neutral-400 leading-snug">
                This is only for preview — the actual student's name will be inserted on generation.
              </p> */}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex-1 min-w-0"
          >
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              {/* Canvas toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  {!imageUrl ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                      Upload a template to begin
                    </>
                  ) : !rect ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Click and drag on the certificate to place the name area
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Name area placed · {Math.round(rect.w)} ×{" "}
                      {Math.round(rect.h)} px
                    </>
                  )}
                </div>
                {rect && (
                  <button
                    onClick={() => setRect(null)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                  >
                    Clear box
                  </button>
                )}
              </div>

              {/* Canvas */}
              <div className="bg-neutral-100 flex items-center justify-center min-h-96 relative overflow-auto p-4">
                {!imageUrl ? (
                  <div className="text-center py-16 px-8">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-200 flex items-center justify-center mx-auto mb-4">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-neutral-400">
                      No template yet
                    </p>
                    <p className="text-xs text-neutral-300 mt-1">
                      Upload a certificate background image to start
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
                    className="cursor-crosshair block rounded"
                    style={{ maxWidth: "100%" }}
                  />
                )}
              </div>

              {/* Bottom meta bar */}
              <div className="px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[13px] text-neutral-400 font-mono">
                  {rect
                    ? `x: ${Math.round(rect.x)}  y: ${Math.round(rect.y)}  w: ${Math.round(rect.w)}  h: ${Math.round(rect.h)}`
                    : "No selection"}
                </span>

                <AnimatePresence>
                  {rect && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-[14px] text-neutral-400">
                        Live preview active — name shown in{" "}
                        <span
                          style={{ fontFamily: currentFontObj.css }}
                          className="text-neutral-600"
                        >
                          {currentFontObj.label}
                        </span>
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Info callout */}
            <AnimatePresence>
              {!imageUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3"
                >
                  <svg
                    className="mt-0.5 flex-shrink-0 text-blue-400"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Upload a certificate background (PNG or JPG), then drag a
                    box where you want the student's name to appear. You can
                    preview different names and font styles before saving.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CertificateDesigner;
