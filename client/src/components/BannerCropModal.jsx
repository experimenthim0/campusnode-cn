import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { uploadClubBanner } from "../services/clubService";
import ImageCropModal from "./ImageCropModal";

/**
 * BannerCropModal
 * Modern WYSIWYG Club Banner Editor powered by react-easy-crop.
 * Maintains complete backwards compatibility with ClubDetails and EditClub.
 */
const BannerCropModal = ({
  isOpen,
  onClose,
  clubId,
  currentBannerUrl,
  initialImageSrc,
  onSuccess,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setIsUploading(false);
      if (initialImageSrc) {
        setImageSrc(initialImageSrc);
      } else if (
        currentBannerUrl &&
        !currentBannerUrl.includes("mainbuilding") &&
        !currentBannerUrl.includes("collegeimg")
      ) {
        setImageSrc(currentBannerUrl);
      } else {
        setImageSrc(null);
      }
    }
  }, [isOpen, currentBannerUrl, initialImageSrc]);

  const handleCropComplete = async (blob) => {
    if (!blob || !clubId) return;

    setIsUploading(true);
    const loadingToast = toast.loading("Uploading and applying banner...");

    try {
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

  return (
    <ImageCropModal
      isOpen={isOpen}
      onClose={onClose}
      imageSrc={imageSrc}
      aspect={1400 / 450}
      cropShape="rect"
      title="Club Cover Banner"
      subtitle="Reposition, zoom, and rotate club cover banner (1400×450 ratio)"
      onCropComplete={handleCropComplete}
      isUploading={isUploading}
      acceptNewFiles={true}
    />
  );
};

export default BannerCropModal;
