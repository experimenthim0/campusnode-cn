import React, { useState, useRef, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';
import { uploadProfilePhoto, deleteProfilePhoto } from '../services/userService';
import ImageCropModal from './ImageCropModal';
import { Crop } from 'lucide-react';

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT_STRING = '.jpg,.jpeg,.png,.webp';

/**
 * ProfilePhotoUpload — full-featured avatar upload with react-easy-crop,
 * circular crop preview, zoom, rotation, drag-drop, and delete support.
 */
const ProfilePhotoUpload = ({ user, onPhotoUpdate }) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Crop modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);

  const currentPhoto = user?.profileImage || user?.clubLogo || user?.club?.clubLogo || null;

  // Generate initials for fallback avatar
  const initials = (user?.name || user?.clubName || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Client-side validation
  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showNotification('Image must be JPG, PNG or WEBP.', 'error');
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showNotification(`Maximum file size is ${MAX_SIZE_MB} MB.`, 'error');
      return false;
    }
    return true;
  };

  // When a file is chosen, open the crop modal first
  const handleFile = useCallback((file) => {
    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setIsCropModalOpen(true);
    };
    reader.onerror = () => {
      showNotification('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  }, []);

  // Upload the cropped blob
  const uploadPhotoBlob = async (blob) => {
    setUploading(true);
    setUploadProgress(0);

    const fileExt = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const formData = new FormData();
    formData.append('profilePhoto', blob, `avatar-${Date.now()}.${fileExt}`);

    try {
      const res = await uploadProfilePhoto(formData, {
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        },
      });

      if (res.data?.success) {
        showNotification(res.data.message || 'Profile photo updated successfully', 'success');

        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.profileImage = res.data.imageUrl;
        storedUser.clubLogo = res.data.imageUrl;
        if (storedUser.club) {
          storedUser.club.clubLogo = res.data.imageUrl;
        }
        localStorage.setItem('user', JSON.stringify(storedUser));

        setPreview(res.data.imageUrl);

        // Notify parent
        if (onPhotoUpdate) onPhotoUpdate(res.data.imageUrl);
        setIsCropModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed. Please try again.';
      showNotification(msg, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!currentPhoto || deleting) return;
    setDeleting(true);

    try {
      const res = await deleteProfilePhoto();
      if (res.data?.success) {
        showNotification(res.data.message || 'Profile photo removed', 'success');
        setPreview(null);

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        delete storedUser.profileImage;
        delete storedUser.clubLogo;
        if (storedUser.club) {
          storedUser.club.clubLogo = null;
        }
        localStorage.setItem('user', JSON.stringify(storedUser));

        if (onPhotoUpdate) onPhotoUpdate(null);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to remove photo.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // Open cropper for existing photo
  const handleCropExisting = () => {
    if (currentPhoto) {
      setCropImageSrc(currentPhoto);
      setIsCropModalOpen(true);
    }
  };

  // Drag & Drop handlers
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const displayImage = preview || currentPhoto;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar + Upload Zone */}
      <div
        className={`relative group cursor-pointer ${dragActive ? 'scale-105' : ''} transition-transform duration-200`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload profile photo"
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        {/* Avatar circle */}
        <div
          className={`w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-[3px] transition-all duration-300 flex items-center justify-center bg-muted ${
            dragActive
              ? 'border-brand-500 shadow-lg shadow-brand-500/20 ring-4 ring-brand-100'
              : displayImage
              ? 'border-neutral-200 dark:border-neutral-700 group-hover:border-brand-400'
              : 'border-neutral-300 dark:border-neutral-700'
          }`}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt={user?.name || 'Profile'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-3xl md:text-4xl font-bold text-foreground select-none">
              {initials}
            </span>
          )}

          {/* Overlay on hover */}
          {!uploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="text-center">
                <i className="ri-camera-line text-white text-2xl" />
                <p className="text-white text-[10px] font-semibold mt-0.5">
                  {displayImage ? 'Change' : 'Upload'}
                </p>
              </div>
            </div>
          )}

          {/* Upload spinner overlay */}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center">
              <div className="w-7 h-7 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white text-[10px] font-bold mt-1.5">{uploadProgress}%</p>
            </div>
          )}
        </div>

        {/* Small camera badge */}
        {!uploading && (
          <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center shadow-md border-2 border-background group-hover:bg-brand-700 transition-colors">
            <i className="ri-camera-fill text-white text-sm" />
          </div>
        )}
      </div>

      {/* Progress bar (visible during upload) */}
      {uploading && (
        <div className="w-40 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={uploading}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            uploading
              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
              : 'bg-muted text-foreground hover:bg-muted/80 hover:text-brand-600 border border-border'
          }`}
        >
          <i className="ri-upload-2-line text-sm" />
          {currentPhoto ? 'Change Photo' : 'Upload Photo'}
        </button>

        {currentPhoto && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCropExisting();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-muted text-foreground hover:bg-muted/80 hover:text-brand-600 border border-border transition-all cursor-pointer"
            title="Re-crop and adjust current avatar"
          >
            <Crop className="w-3.5 h-3.5" />
            Adjust
          </button>
        )}

        {currentPhoto && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
            ) : (
              <i className="ri-delete-bin-6-line text-sm" />
            )}
            Remove
          </button>
        )}
      </div>

      {/* Drag & Drop hint */}
      <p className="text-[10px] text-muted-foreground font-medium text-center">
        JPG, PNG or WEBP · Max {MAX_SIZE_MB} MB · Drag & drop, click, or crop
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={onFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Circular Avatar Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageSrc={cropImageSrc}
        aspect={1}
        cropShape="round"
        title="Crop Profile Photo"
        subtitle="Reposition, zoom, and rotate your avatar"
        onCropComplete={uploadPhotoBlob}
        isUploading={uploading}
        acceptNewFiles={true}
      />
    </div>
  );
};

export default ProfilePhotoUpload;
