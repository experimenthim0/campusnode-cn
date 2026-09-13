import React, { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { toast } from "react-hot-toast";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Upload,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import getCroppedImg from "../utils/cropImage";

/**
 * ImageCropModal
 * Universal interactive image cropper powered by react-easy-crop.
 * Supports rectangular (banners) and circular (avatars/profile photos) cropping.
 */
const ImageCropModal = ({
  isOpen,
  onClose,
  imageSrc: initialImageSrc,
  aspect = 1,
  cropShape = "rect", // "rect" | "round"
  title = "Crop & Adjust Image",
  subtitle = "Drag to reposition and zoom to fit",
  onCropComplete: onCropFinish, // (blob, fileUrl) => Promise<void> | void
  isUploading = false,
  acceptNewFiles = true,
}) => {
  const [imageSrc, setImageSrc] = useState(initialImageSrc);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showGrid, setShowGrid] = useState(cropShape !== "round");

  const fileInputRef = useRef(null);

  // Sync initial image if it changes
  React.useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    }
  }, [initialImageSrc, isOpen]);

  const onCropChange = useCallback((newCrop) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
  }, []);

  const handleCropComplete = useCallback((croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

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
      setImageSrc(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Please select an image to crop.");
      return;
    }

    setProcessing(true);
    try {
      const { blob, fileUrl } = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        "image/webp",
        0.90
      );

      if (onCropFinish) {
        await onCropFinish(blob, fileUrl);
      }
    } catch (err) {
      console.error("Error cropping image:", err);
      toast.error(err.message || "Failed to process cropped image.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const busy = isUploading || processing;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-base shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropper Viewport */}
        <div className="relative w-full h-72 sm:h-96 md:h-[420px] bg-neutral-950 overflow-hidden select-none">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={showGrid}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onRotationChange={setRotation}
              onCropComplete={handleCropComplete}
              minZoom={1}
              maxZoom={3}
              zoomSpeed={0.8}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 text-neutral-400">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40 text-neutral-500" />
              <p className="text-sm font-medium mb-2">No image selected</p>
              <p className="text-xs text-neutral-500 max-w-xs mb-4">
                Choose a photo to position, zoom, and crop.
              </p>
              {acceptNewFiles && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-xs rounded-xl"
                >
                  <Upload className="w-3.5 h-3.5" /> Select Image
                </Button>
              )}
            </div>
          )}

          {busy && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs text-white gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <span className="text-xs font-semibold tracking-wide">
                Processing & Uploading…
              </span>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-t border-border bg-card space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-sm">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                disabled={zoom <= 1 || busy}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.05}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={busy || !imageSrc}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-brand-600 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                disabled={zoom >= 3 || busy}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-muted-foreground w-11 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotate}
                disabled={busy || !imageSrc}
                className="h-8 gap-1.5 text-xs rounded-xl"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={busy || !imageSrc}
                className="h-8 gap-1.5 text-xs rounded-xl"
                title="Reset crop and zoom"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>

              {acceptNewFiles && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="h-8 gap-1.5 text-xs rounded-xl"
                    title="Choose a different image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Change File</span>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={busy}
              className="h-9 px-4 rounded-xl text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={busy || !imageSrc}
              className="h-9 px-5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-xs gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {busy ? "Saving…" : "Save & Apply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
