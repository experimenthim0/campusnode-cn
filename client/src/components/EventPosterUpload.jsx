import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

/**
 * EventPosterUpload
 * 
 * Industry & SaaS-standard file upload component for event posters.
 * Clean, minimal, and fully theme-integrated (light/dark mode).
 * Free of AI gimmicks, laser beams, or unwanted gradients.
 */
const EventPosterUpload = ({
  imageUrl = '',
  onImageChange,
  onUploadingChange,
  title = '',
  eventId = '',
  disabled = false,
  maxSizeMB = 5,
  className = '',
}) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'error'
  const [uploadingFile, setUploadingFile] = useState(null); // { file, name, size, previewUrl }
  const [errorMessage, setErrorMessage] = useState('');

  // Notify parent of uploading state changes
  useEffect(() => {
    if (onUploadingChange) {
      onUploadingChange(isUploading);
    }
  }, [isUploading, onUploadingChange]);

  // Cleanup on component unmount ONLY
  useEffect(() => {
    return () => {
      if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${Math.round(kb)} KB`;
  };

  const resetUploadState = () => {
    if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadPhase('idle');
    setUploadingFile(null);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetUploadState();
    showNotification('Upload canceled.', 'info');
  };

  const startUpload = async (file) => {
    if (!file) return;

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      const msg = 'Please select a valid image file (PNG, JPG, WEBP, or GIF).';
      showNotification(msg, 'error');
      setErrorMessage(msg);
      setUploadPhase('error');
      return;
    }

    // Validate size limit
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const msg = `File size (${formatFileSize(file.size)}) exceeds the ${maxSizeMB} MB limit.`;
      showNotification(msg, 'error');
      setErrorMessage(msg);
      setUploadPhase('error');
      return;
    }

    // Revoke previous blob if any
    if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const localUrl = URL.createObjectURL(file);
    previewUrlRef.current = localUrl;

    const fileInfo = {
      file,
      name: file.name,
      size: formatFileSize(file.size),
      previewUrl: localUrl,
    };

    setUploadingFile(fileInfo);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadPhase('uploading');
    setErrorMessage('');

    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append('image', file);
    if (title) formData.append('title', title);
    if (eventId) formData.append('eventId', eventId);

    try {
      const response = await api.post('/api/events/upload', formData, {
        signal: abortControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.min(90, Math.round((progressEvent.loaded / progressEvent.total) * 90));
            setUploadProgress(percent);

            if (progressEvent.loaded >= progressEvent.total) {
              setUploadPhase('processing');
              if (!progressIntervalRef.current) {
                progressIntervalRef.current = setInterval(() => {
                  setUploadProgress((prev) => (prev < 96 ? prev + 1 : prev));
                }, 200);
              }
            }
          }
        },
      });

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const secureUrl = response.data?.secure_url;
      if (secureUrl) {
        setUploadProgress(100);

        setTimeout(() => {
          if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
          }
          onImageChange(secureUrl);
          setIsUploading(false);
          setUploadPhase('idle');
          setUploadingFile(null);
          showNotification('Poster uploaded successfully.', 'success');
        }, 300);
      } else {
        throw new Error('Server did not return an image URL');
      }
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        resetUploadState();
        return;
      }

      const msg = err.response?.data?.message || err.message || 'Upload failed. Please try again.';
      setErrorMessage(msg);
      setUploadPhase('error');
      setIsUploading(false);
      showNotification(msg, 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      startUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      startUpload(file);
    }
  };

  const handleRemoveImage = () => {
    if (onImageChange) {
      onImageChange('');
    }
    resetUploadState();
  };

  const triggerBrowse = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  // 1. Uploading state (Standard SaaS file progress card)
  if (isUploading && uploadingFile) {
    return (
      <div className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs ${className}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 overflow-hidden shrink-0 flex items-center justify-center">
            {uploadingFile.previewUrl ? (
              <img src={uploadingFile.previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-neutral-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {uploadingFile.name}
              </p>
              <span className="text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400 shrink-0">
                {uploadProgress}%
              </span>
            </div>

            {/* Standard solid SaaS progress bar */}
            <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 dark:bg-brand-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {uploadingFile.size} · {uploadPhase === 'processing' ? 'Processing...' : 'Uploading...'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelUpload}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            title="Cancel upload"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Error state (Standard SaaS alert box with retry)
  if (uploadPhase === 'error') {
    return (
      <div className={`p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-rose-900 dark:text-rose-200">
              Upload failed
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              {errorMessage || 'An error occurred while uploading. Please try again.'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {uploadingFile?.file && (
                <button
                  type="button"
                  onClick={() => startUpload(uploadingFile.file)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={resetUploadState}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Choose another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Completed preview state (Clean SaaS poster view)
  if (imageUrl) {
    return (
      <div className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs ${className}`}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {/* Poster frame */}
        <div className="relative bg-neutral-900 dark:bg-neutral-950 flex items-center justify-center min-h-[200px] max-h-80 overflow-hidden">
          <img
            src={imageUrl}
            alt="Event poster"
            className="w-full max-h-80 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Action bar */}
        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Poster uploaded
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerBrowse}
              disabled={disabled}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Idle dropzone state (Clean, minimal SaaS dropzone)
  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        id="poster-upload-input"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={triggerBrowse}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerBrowse();
          }
        }}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-10 border border-dashed rounded-xl text-center cursor-pointer transition-colors duration-150 outline-none ${
          isDragActive
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
            : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 hover:border-neutral-400 dark:hover:border-neutral-600'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 flex items-center justify-center mb-3">
          <Upload className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          <span className="text-brand-600 dark:text-brand-400 hover:underline">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          PNG, JPG, WEBP or GIF (up to {maxSizeMB} MB)
        </p>
      </div>
    </div>
  );
};

export default EventPosterUpload;
