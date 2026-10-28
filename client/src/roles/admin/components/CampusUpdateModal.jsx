import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Link,
  FileText,
  Eye,
  CheckCircle,
  AlertCircle,
  Pin,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import UpdatePostCard from "../../../components/updates/UpdatePostCard";
import { uploadUpdateMedia } from "../../../services/campusUpdatesService";

const PRESET_ORGANIZATIONS = [
  "NIT Jalandhar Administration",
  "Training & Placement Cell (CTP)",
  "Office of Dean Academic",
  "Office of Dean Student Welfare",
  "Institute Innovation Council (IIC)",
  "Examination Cell",
];

const CampusUpdateModal = ({ isOpen, onClose, onSave, editingPost = null }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "OFFICIAL",
    organizationName: "NIT Jalandhar Administration",
    organizationAvatar: "/nitjlogo.png",
    images: [],
    attachments: [],
    deadline: "",
    actionLabel: "",
    actionUrl: "",
    sourceReference: "",
    isPinned: false,
    status: "PUBLISHED",
  });

  const [newImageUrl, setNewImageUrl] = useState("");
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingPost) {
      setFormData({
        title: editingPost.title || "",
        description: editingPost.description || "",
        category: editingPost.category || "OFFICIAL",
        organizationName: editingPost.organizationName || "NIT Jalandhar Administration",
        organizationAvatar: editingPost.organizationAvatar || "/nitjlogo.png",
        images: Array.isArray(editingPost.images) ? [...editingPost.images] : [],
        attachments: Array.isArray(editingPost.attachments) ? [...editingPost.attachments] : [],
        deadline: editingPost.deadline ? new Date(editingPost.deadline).toISOString().slice(0, 16) : "",
        actionLabel: editingPost.actionLabel || "",
        actionUrl: editingPost.actionUrl || "",
        sourceReference: editingPost.sourceReference || "",
        isPinned: Boolean(editingPost.isPinned),
        status: editingPost.status || "PUBLISHED",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "OFFICIAL",
        organizationName: "NIT Jalandhar Administration",
        organizationAvatar: "/nitjlogo.png",
        images: [],
        attachments: [],
        deadline: "",
        actionLabel: "",
        actionUrl: "",
        sourceReference: "",
        isPinned: false,
        status: "PUBLISHED",
      });
    }
    setShowPreview(false);
  }, [editingPost, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingImages(true);
      const res = await uploadUpdateMedia(files);
      if (res.success && Array.isArray(res.urls)) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...res.urls],
        }));
        toast.success(`Uploaded ${res.urls.length} image(s)!`);
      } else {
        toast.error("Failed to upload images.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.message || "Error uploading images.");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, newImageUrl.trim()],
    }));
    setNewImageUrl("");
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim() || !newAttachmentUrl.trim()) {
      toast.error("Please enter attachment name and URL.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        { name: newAttachmentName.trim(), url: newAttachmentUrl.trim() },
      ],
    }));
    setNewAttachmentName("");
    setNewAttachmentUrl("");
  };

  const handleRemoveAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (targetStatus) => {
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      toast.error("Title must be at least 3 characters.");
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      toast.error("Description must be at least 5 characters.");
      return;
    }
    if (!formData.organizationName.trim()) {
      toast.error("Organization name is required.");
      return;
    }

    if (formData.actionUrl) {
      try {
        const u = new URL(formData.actionUrl.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          toast.error("Action URL must start with http:// or https://");
          return;
        }
      } catch {
        toast.error("Please enter a valid action URL.");
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        status: targetStatus || formData.status,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      };

      await onSave(payload, editingPost?.id);
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err.response?.data?.message || "Failed to save announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Construct mock preview object
  const previewPost = {
    id: editingPost?.id || "preview-id",
    title: formData.title || "Announcement Title Preview",
    description: formData.description || "Description preview will appear here...",
    category: formData.category,
    organizationName: formData.organizationName,
    organizationAvatar: formData.organizationAvatar,
    images: formData.images,
    attachments: formData.attachments,
    deadline: formData.deadline,
    actionLabel: formData.actionLabel,
    actionUrl: formData.actionUrl,
    sourceReference: formData.sourceReference,
    isPinned: formData.isPinned,
    status: formData.status,
    publishedAt: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-950/60">
          <div>
            <h2 className="text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {editingPost ? "Edit Campus Announcement" : "Create Campus Announcement"}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Publish to NIT Jalandhar Instagram-style feed.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide border transition-all cursor-pointer ${
                showPreview
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100"
              }`}
            >
              <Eye size={14} />
              <span>{showPreview ? "Edit Form" : "Live Preview"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
          {showPreview ? (
            /* Live Preview Screen */
            <div className="max-w-[550px] mx-auto py-2">
              <div className="mb-3 text-center">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Student Feed Live Preview
                </span>
              </div>
              <UpdatePostCard post={previewPost} />
            </div>
          ) : (
            /* Editor Form */
            <div className="space-y-4 text-xs sm:text-sm">
              {/* Category & Pinned Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Feed Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30"
                  >
                    <option value="OFFICIAL">Official (Institute & Academics)</option>
                    <option value="TPO">TPO (Placements & Internships)</option>
                    <option value="IMPORTANT">Important (Scholarships, Competitions)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Pinned Status (Max 3)
                  </label>
                  <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Pin size={13} className="text-amber-500" />
                      Pin to top of feed
                    </span>
                  </label>
                </div>
              </div>

              {/* Organization Name & Preset Pickers */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Publishing Authority / Organization *
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="e.g. Training & Placement Cell, Dean Academic"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_ORGANIZATIONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, organizationName: preset })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Google & Microsoft Recruitment Drive 2026–27"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Description / Announcement Content *
                </label>
                <textarea
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Write the full announcement here. Line breaks, bullet points, and guidelines will be preserved cleanly..."
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30 text-xs sm:text-sm leading-relaxed"
                />
              </div>

              {/* Media / Posters Upload */}
              <div className="p-3.5 rounded-xl bg-neutral-50/80 dark:bg-zinc-950/50 border border-neutral-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Post Posters / Images (Optional carousel)
                  </label>
                  <label className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-neutral-200 dark:bg-zinc-800 hover:bg-neutral-300 text-neutral-800 dark:text-neutral-200 text-xs font-medium cursor-pointer transition-colors">
                    <Upload size={13} />
                    <span>{uploadingImages ? "Uploading..." : "Upload Images"}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploadingImages}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Add Image by URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Or paste an image URL directly..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Thumbnail Previews */}
                {formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formData.images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 dark:border-zinc-700 bg-black group"
                      >
                        <img src={imgUrl} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/60 text-[9px] text-white font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button & URL (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Action Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.actionLabel}
                    onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                    placeholder="e.g. Register on CTP Portal, Apply Now"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Action URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.actionUrl}
                    onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Deadline & Administrative Source Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Deadline (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Internal Verification Ref (Admin Only)
                  </label>
                  <input
                    type="text"
                    value={formData.sourceReference}
                    onChange={(e) => setFormData({ ...formData, sourceReference: e.target.value })}
                    placeholder="e.g. Office Order #NITJ/CTP/2026/041"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Attachments (Optional) */}
              <div className="p-3.5 rounded-xl bg-neutral-50/80 dark:bg-zinc-950/50 border border-neutral-200/80 dark:border-zinc-800 space-y-2.5">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Document Attachments (PDFs, Circulars)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    placeholder="Document Name (e.g. DateSheet_2026.pdf)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-xs"
                  />
                  <input
                    type="url"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    placeholder="URL (https://...)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium cursor-pointer shrink-0"
                  >
                    Add Doc
                  </button>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {formData.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-brand-600 shrink-0" />
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {att.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-neutral-400 hover:text-red-500 cursor-pointer ml-2"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-950/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("DRAFT")}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-neutral-200 dark:bg-zinc-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("PUBLISHED")}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-brand-600 text-white hover:bg-brand-500 shadow-sm shadow-brand-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? "Saving..." : editingPost ? "Update Announcement" : "Publish Announcement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusUpdateModal;
