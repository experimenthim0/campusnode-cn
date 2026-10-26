import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  Pin,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  FileText,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminCampusUpdates,
  createCampusUpdate,
  updateCampusUpdate,
  togglePinCampusUpdate,
  toggleStatusCampusUpdate,
  deleteCampusUpdate,
} from "../../../services/campusUpdatesService";
import CampusUpdateModal from "../components/CampusUpdateModal";
import { formatRelativeTime } from "../../../components/updates/UpdatePostCard";

const CampusUpdatesTab = () => {
  const [updates, setUpdates] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    publishedCount: 0,
    draftCount: 0,
    pinnedCount: 0,
    maxPinned: 3,
  });

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminCampusUpdates({
        status: statusFilter,
        category: categoryFilter,
        search: debouncedSearch,
        page: 1,
        limit: 50,
      });

      if (res.success) {
        setUpdates(res.updates || []);
        if (res.stats) setStats(res.stats);
      } else {
        toast.error(res.message || "Failed to load updates.");
      }
    } catch (err) {
      console.error("Admin fetch updates error:", err);
      toast.error("Error fetching administrative updates.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, debouncedSearch]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const handleSavePost = async (formData, id) => {
    if (id) {
      const res = await updateCampusUpdate(id, formData);
      toast.success("Announcement updated successfully!");
    } else {
      const res = await createCampusUpdate(formData);
      toast.success("Announcement created successfully!");
    }
    fetchUpdates();
  };

  const handleTogglePin = async (id) => {
    try {
      const res = await togglePinCampusUpdate(id);
      if (res.success) {
        toast.success(res.message);
        fetchUpdates();
      }
    } catch (err) {
      console.error("Pin toggle error:", err);
      toast.error(err.response?.data?.message || "Could not toggle pin.");
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await toggleStatusCampusUpdate(id);
      if (res.success) {
        toast.success(res.message);
        fetchUpdates();
      }
    } catch (err) {
      console.error("Status toggle error:", err);
      toast.error(err.response?.data?.message || "Could not change status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      const res = await deleteCampusUpdate(deleteConfirmId);
      if (res.success) {
        toast.success("Announcement permanently deleted.");
        setDeleteConfirmId(null);
        fetchUpdates();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete post.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. TOP STATS CARDS                                             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-2xs">
          <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            Total Updates
          </p>
          <p className="text-2xl font-medium text-neutral-900 dark:text-neutral-100 mt-1">
            {stats.total}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-2xs">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Published Live
          </p>
          <p className="text-2xl font-medium text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.publishedCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-2xs">
          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Drafts
          </p>
          <p className="text-2xl font-medium text-neutral-700 dark:text-neutral-300 mt-1">
            {stats.draftCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-2xs">
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pinned (Top)</span>
            <span className="text-[10px] lowercase text-neutral-400">max 3</span>
          </p>
          <p className="text-2xl font-medium text-amber-600 dark:text-amber-400 mt-1">
            {stats.pinnedCount} / 3
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. FILTER & ACTION CONTROLS                                    */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, department, or circular ref..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {/* Status & Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex rounded-xl bg-neutral-100 dark:bg-zinc-800 p-0.5 text-xs font-medium">
            {["ALL", "PUBLISHED", "DRAFT"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {st === "ALL" ? "All Status" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="OFFICIAL">Official</option>
            <option value="TPO">TPO</option>
            <option value="IMPORTANT">Important</option>
          </select>

          {/* New Post Button */}
          <button
            type="button"
            onClick={() => {
              setEditingPost(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium tracking-wide shadow-sm shadow-brand-600/20 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. POSTS TABLE / LIST VIEW                                     */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-xs font-medium text-neutral-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand-600" />
            <span>Loading announcements...</span>
          </div>
        ) : updates.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
              No campus announcements found
            </p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
              Get started by creating your first official announcement for NIT Jalandhar students.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingPost(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-medium"
            >
              <Plus size={14} />
              <span>Create Announcement</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-zinc-950/60 border-b border-neutral-200/80 dark:border-zinc-800 text-neutral-400 uppercase tracking-wider font-medium">
                <tr>
                  <th className="px-4 py-3">Announcement</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Authority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/60">
                {updates.map((post) => {
                  const hasImage = Array.isArray(post.images) && post.images.length > 0;
                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Post Title & Thumbnail */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-100 dark:bg-zinc-800 shrink-0 border border-neutral-200/60 dark:border-zinc-700/60 flex items-center justify-center">
                            {hasImage ? (
                              <img
                                src={post.images[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileText size={18} className="text-neutral-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {post.isPinned && (
                                <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                              )}
                              <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                {post.title}
                              </p>
                            </div>
                            {post.sourceReference && (
                              <p className="text-[10px] text-neutral-400 font-mono truncate">
                                {post.sourceReference}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${
                            post.category === "OFFICIAL"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200"
                              : post.category === "TPO"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200"
                          }`}
                        >
                          {post.category}
                        </span>
                      </td>

                      {/* Authority */}
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 font-medium truncate max-w-[150px]">
                        {post.organizationName}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                            post.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                              : "bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-neutral-400"
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                        {formatRelativeTime(post.publishedAt || post.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pin Toggle */}
                          <button
                            type="button"
                            onClick={() => handleTogglePin(post.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              post.isPinned
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                                : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800"
                            }`}
                            title={post.isPinned ? "Unpin Post" : "Pin Post to top (Max 3)"}
                          >
                            <Pin size={14} />
                          </button>

                          {/* Publish / Draft Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(post.id)}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            {post.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPost(post);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 cursor-pointer"
                            title="Edit announcement"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(post.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                            title="Delete announcement"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. MODALS                                                      */}
      {/* ============================================================== */}
      <CampusUpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePost}
        editingPost={editingPost}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle size={22} />
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
              Are you sure you want to delete this campus announcement? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusUpdatesTab;
