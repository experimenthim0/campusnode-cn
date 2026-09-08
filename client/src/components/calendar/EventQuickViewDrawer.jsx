import React from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Edit2,
  AlertTriangle,
  Mail,
  User,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { markdownToHtml } from "../../utils/htmlMarkdownConverter";

const STATUS_BADGES = {
  PUBLISHED: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
  PENDING: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  DRAFT: "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-zinc-700",
  REJECTED: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
};

const EventQuickViewDrawer = ({
  event,
  isOpen,
  onClose,
  onOpenPreview,
  onApprove,
  onReject,
  onOpenReschedule,
  userRole = "admin"
}) => {
  const navigate = useNavigate();
  if (!isOpen || !event) return null;

  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;

  const dateStr = start
    ? start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "N/A";
  const startStr = start
    ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const endStr = end
    ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const expectedAttendance = event.registeredCount || 0;
  const venueCapacity = event.totalSeats || 0;
  const isCapacityWarning = venueCapacity > 0 && expectedAttendance >= venueCapacity;

  const resources = event.customFields?.resources || ["Projector", "Sound System", "Chairs"];

  const statusBadge = STATUS_BADGES[event.reviewStatus] || STATUS_BADGES.PENDING;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end modal-backdrop-blur transition-opacity">
      <div className="w-full max-w-md bg-cn-surface border-l border-cn-border shadow-2xl h-full flex flex-col justify-between overflow-y-auto transition-colors">
        <div>
          <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${statusBadge}`}>
                {event.reviewStatus}
              </span>
              <span className="text-xs font-semibold text-cn-text-muted">
                {event.club?.category || "General Event"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 text-cn-text-secondary">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {event.club?.clubLogo ? (
                  <img
                    src={event.club.clubLogo}
                    alt={event.club.clubName}
                    className="w-10 h-10 rounded-xl object-cover border border-cn-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                    {event.club?.clubName?.[0] || "C"}
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-cn-text leading-tight">
                    {event.title}
                  </h3>
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-bold">
                    {event.club?.clubName || "Organized Club"}
                  </p>
                </div>
              </div>
              {event.description && (
                <div
                  className="text-xs text-cn-text-secondary mt-3 line-clamp-3 font-medium [&_*]:!text-inherit [&_*]:!bg-transparent [&>p]:mb-1 [&>p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(event.description)
                  }}
                />
              )}
            </div>

            {/* Event Schedule Info */}
            <div className="p-4 rounded-xl bg-cn-surface-muted border border-cn-border space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <Calendar size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="font-bold text-cn-text">{dateStr}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Clock size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="font-semibold text-cn-text-secondary">
                  {startStr} - {endStr}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <MapPin size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="font-bold text-cn-text">{event.venue}</span>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted">
                Organizer Contact
              </p>
              <div className="p-3 rounded-xl border border-cn-border bg-cn-surface-muted flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-cn-text-muted" />
                  <div>
                    <p className="font-bold text-cn-text">{event.createdBy?.name || "Student Coordinator"}</p>
                    <p className="text-[11px] text-cn-text-muted">{event.createdBy?.email || "No email"}</p>
                  </div>
                </div>
                {event.createdBy?.email && (
                  <a
                    href={`mailto:${event.createdBy.email}`}
                    className="p-1.5 text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted rounded-lg transition-colors"
                    title="Contact Organizer"
                  >
                    <Mail size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Attendance & Capacity Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted">
                  Capacity & Attendance
                </p>
                {isCapacityWarning && (
                  <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={12} /> Capacity Reached
                  </span>
                )}
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isCapacityWarning
                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40"
                  : "bg-cn-surface-muted border-cn-border"
              }`}>
                <div>
                  <p className="text-xs font-semibold text-cn-text-muted">Expected / Registered</p>
                  <p className="text-xl font-bold text-cn-text mt-0.5">
                    {expectedAttendance} <span className="text-xs text-cn-text-muted font-normal">students</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-cn-text-muted">Venue Capacity</p>
                  <p className="text-xl font-bold text-cn-text mt-0.5">
                    {venueCapacity > 0 ? venueCapacity : "Unlimited"}
                  </p>
                </div>
              </div>
            </div>

            {/* Allocated Resources Badges */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted">
                Resource Requirements
              </p>
              <div className="flex flex-wrap gap-2">
                {resources.map((res, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-cn-surface text-cn-text text-xs font-bold rounded-lg border border-cn-border flex items-center gap-1.5"
                  >
                    <Package size={12} className="text-brand-600 dark:text-brand-400" />
                    <span>{res}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-cn-border-subtle bg-transparent dark:bg-cn-surface space-y-2">
          {onOpenPreview && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPreview(event);
              }}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-cn-bg text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mb-2"
            >
              <ExternalLink size={14} />
              <span>Full Event &amp; Payment Preview</span>
            </button>
          )}

          {userRole === "facultyCoordinator" && event.reviewStatus === "PENDING" && onApprove && onReject && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => onApprove(event)}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle size={15} />
                <span>Approve Event</span>
              </button>
              <button
                type="button"
                onClick={() => onReject(event)}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <XCircle size={15} />
                <span>Reject</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {onOpenReschedule && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReschedule(event);
                }}
                className="py-2.5 bg-transparent hover:bg-cn-surface-muted dark:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock size={14} />
                <span>Reschedule</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/events/edit/${event.id || event._id}`);
              }}
              className="py-2.5 bg-transparent hover:bg-cn-surface-muted dark:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Edit2 size={14} />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventQuickViewDrawer;
