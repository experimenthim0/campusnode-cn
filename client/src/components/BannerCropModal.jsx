import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { uploadClubBanner } from "../services/clubService";

/**
 * BannerCropModal
 * Direct Canvas WYSIWYG LinkedIn-Style Banner Upload & Crop/Position Editor
 *
 * Features:
 * - 100% WYSIWYG Canvas Rendering (no preview vs export mismatch)
 * - Mouse & Touch Click-and-Drag repositioning
 * - Smooth Zoom Slider (100% to 300%) with +/- buttons & mouse wheel support
 * - 90-degree Rotation support
 * - Reset position & zoom
 * - Visual Rule-of-Thirds Grid during repositioning
 * - Direct 1400x450 High-DPI JPEG Export (92% quality)
 */
const BannerCropModal = ({
  isOpen,
  onClose,
  clubId,
  currentBannerUrl,
  onSuccess,
}) => {
  const [imageObj, setImageObj] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // High-DPI standard banner dimensions
  const CANVAS_WIDTH = 1400;
  const CANVAS_HEIGHT = 450;
  const CANVAS_ASPECT = CANVAS_WIDTH / CANVAS_HEIGHT; // 3.111 : 1

  // Reset or load current banner when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsUploading(false);

      if (
        currentBannerUrl &&
        !currentBannerUrl.includes("mainbuilding") &&
        !currentBannerUrl.includes("collegeimg")
      ) {
        loadImage(currentBannerUrl);
      } else {
        setImageObj(null);
        setImageLoaded(false);
      }
    }
  }, [isOpen, currentBannerUrl]);

  // Load an image from URL or dataURL into an Image object
  const loadImage = (src) => {
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImageObj(img);
      setImageLoaded(true);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };
    img.onerror = () => {
      toast.error("Failed to load image. Please select another file.");
      setImageObj(null);
      setImageLoaded(false);
    };
    img.src = src;
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be less than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Drag & Drop handlers for file drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        loadImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Translate to center + user drag offset
    ctx.translate(width / 2 + position.x, height / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Natural image aspect ratio
    const naturalW = imageObj.naturalWidth || imageObj.width;
    const naturalH = imageObj.naturalHeight || imageObj.height;
    const imgAspect = naturalW / naturalH;

    const isRotatedSideways = rotation === 90 || rotation === 270;
    const effectiveAspect = isRotatedSideways ? 1 / imgAspect : imgAspect;

    let drawW, drawH;
    if (effectiveAspect > CANVAS_ASPECT) {
      // Image is wider than canvas aspect -> match height, calculate width
      if (isRotatedSideways) {
        drawH = width;
        drawW = width * imgAspect;
      } else {
        drawH = height;
        drawW = height * imgAspect;
      }
    } else {
      // Image is taller than canvas aspect -> match width, calculate height
      if (isRotatedSideways) {
        drawW = height;
        drawH = height / imgAspect;
      } else {
        drawW = width;
        drawH = width / imgAspect;
      }
    }

    // High quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw image centered at (0, 0)
    ctx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();
  }, [imageObj, imageLoaded, position, zoom, rotation]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Mouse Drag to Reposition
  const handleMouseDown = (e) => {
    if (!imageLoaded) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleFactor = CANVAS_WIDTH / rect.width;

    setIsDragging(true);
    setDragStart({
      x: e.clientX * scaleFactor - position.x,
      y: e.clientY * scaleFactor - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scaleFactor = CANVAS_WIDTH / rect.width;

      setPosition({
        x: e.clientX * scaleFactor - dragStart.x,
        y: e.clientY * scaleFactor - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag for Mobile
  const handleTouchStart = (e) => {
    if (!imageLoaded || e.touches.length !== 1) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleFactor = CANVAS_WIDTH / rect.width;
    const touch = e.touches[0];

    setIsDragging(true);
    setDragStart({
      x: touch.clientX * scaleFactor - position.x,
      y: touch.clientY * scaleFactor - position.y,
    });
  };

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scaleFactor = CANVAS_WIDTH / rect.width;
      const touch = e.touches[0];

      setPosition({
        x: touch.clientX * scaleFactor - dragStart.x,
        y: touch.clientY * scaleFactor - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e) => {
    if (!imageLoaded) return;
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 1), 3));
  };

  // Rotate image by 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset positioning and zoom
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Save & Upload directly from the active Canvas
  const handleSaveAndUpload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !clubId) return;

    setIsUploading(true);
    const loadingToast = toast.loading("Uploading and applying banner...");

    try {
      // 1. Export current canvas pixels as compressed WebP blob (fallback to JPEG if unsupported)
      let blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/webp", 0.85);
      });

      if (!blob) {
        blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.90);
        });
      }

      if (!blob) {
        throw new Error("Failed to capture cropped banner canvas.");
      }

      const fileExt = blob.type === "image/webp" ? "webp" : "jpg";
      const formData = new FormData();
      formData.append("banner", blob, `club-banner-${clubId}.${fileExt}`);

      const response = await uploadClubBanner(clubId, formData);
      const newBannerUrl =
        response.data?.bannerImage || response.data?.club?.bannerImage;

      toast.success("Club banner updated successfully!", { id: loadingToast });
      if (onSuccess) {
        onSuccess(newBannerUrl);
      }
      onClose();
    } catch (error) {
      console.error("Banner upload failed:", error);
      toast.error(
        error.response?.data?.message || error.message || "Failed to upload banner.",
        { id: loadingToast }
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-base">
              <i className="ri-image-edit-line" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Club Cover Banner
              </h2>
              <p className="text-xs text-neutral-400">
                Resize, reposition and upload your club's header banner
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition cursor-pointer"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Dropzone if No Image Selected */}
          {!imageObj || !imageLoaded ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-orange-500 dark:hover:border-orange-500 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-neutral-50/50 dark:bg-neutral-950/40 hover:bg-orange-500/5 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform">
                <i className="ri-upload-cloud-2-line" />
              </div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                Choose a banner photo
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mb-4">
                Drag and drop your image here, or browse from your device. Recommended: 1400×450px (JPG, PNG, WebP)
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Browse Files
              </button>
            </div>
          ) : (
            /* Live Canvas Crop / Drag Viewport */
            <div className="space-y-4">
              {/* Canvas Container */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onWheel={handleWheel}
                className="relative w-full aspect-[1400/450] bg-neutral-950 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border-2 border-neutral-300 dark:border-neutral-700 shadow-inner select-none"
              >
                {/* Active WYSIWYG Canvas */}
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Grid Overlay during repositioning */}
                <div
                  className={`absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none transition-opacity duration-200 ${
                    isDragging ? "opacity-40" : "opacity-0"
                  }`}
                >
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div />
                </div>

                {/* Instruction Badge */}
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white/90 pointer-events-none flex items-center gap-1.5 shadow-sm">
                  <i className="ri-drag-move-line text-xs text-orange-400" />
                  Drag to reposition image
                </div>
              </div>

              {/* Toolbar: Zoom Slider, Rotate, Reset, Change File */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                {/* Zoom Controls */}
                <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((prev) => Math.max(Number((prev - 0.1).toFixed(2)), 1))
                    }
                    title="Zoom Out"
                    className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-200 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-600 transition text-xs"
                  >
                    <i className="ri-zoom-out-line" />
                  </button>

                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-orange-600 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setZoom((prev) => Math.min(Number((prev + 0.1).toFixed(2)), 3))
                    }
                    title="Zoom In"
                    className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-200 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-600 transition text-xs"
                  >
                    <i className="ri-zoom-in-line" />
                  </button>

                  <span className="text-[11px] font-mono text-neutral-500 w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Transform Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRotate}
                    title="Rotate 90°"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition text-xs font-semibold cursor-pointer"
                  >
                    <i className="ri-anticlockwise-line" /> Rotate
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    title="Reset Alignment"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition text-xs font-semibold cursor-pointer"
                  >
                    <i className="ri-refresh-line" /> Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition text-xs font-semibold cursor-pointer"
                  >
                    <i className="ri-image-line" /> Change Photo
                  </button>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAndUpload}
            disabled={!imageLoaded || isUploading}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition shadow-sm ${
              !imageLoaded || isUploading
                ? "bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700 cursor-pointer shadow-orange-500/20"
            }`}
          >
            {isUploading ? (
              <>
                <i className="ri-loader-4-line animate-spin text-sm" /> Saving & Uploading...
              </>
            ) : (
              <>
                <i className="ri-check-line text-sm" /> Apply & Save Banner
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BannerCropModal;
