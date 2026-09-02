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
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-white dark:bg-[#0c0c0c] border-l border-neutral-200 dark:border-zinc-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="p-5 border-b border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full border ${statusBadge}`}>
                {event.reviewStatus}
              </span>
              <span className="text-xs font-bold text-neutral-400">
                {event.club?.category || "General Event"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {event.club?.clubLogo ? (
                  <img
                    src={event.club.clubLogo}
                    alt={event.club.clubName}
                    className="w-10 h-10 rounded-xl object-cover border border-neutral-200 dark:border-zinc-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black text-sm">
                    {event.club?.clubName?.[0] || "C"}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-black dark:text-white leading-tight">
                    {event.title}
                  </h3>
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                    {event.club?.clubName || "Organized Club"}
                  </p>
                </div>
              </div>
              {event.description && (
                <div
                  className="text-xs text-neutral-600 dark:text-neutral-300 mt-3 line-clamp-3 font-medium [&_*]:!text-inherit [&_*]:!bg-transparent [&>p]:mb-1 [&>p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(event.description)
                  }}
                />
              )}
            </div>

            {/* Event Schedule Info */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-900/60 border border-neutral-200/80 dark:border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <Calendar size={16} className="text-orange-500 shrink-0" />
                <span className="font-bold text-neutral-900 dark:text-white">{dateStr}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Clock size={16} className="text-orange-500 shrink-0" />
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {startStr} - {endStr}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <MapPin size={16} className="text-orange-500 shrink-0" />
                <span className="font-extrabold text-black dark:text-white">{event.venue}</span>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Organizer Contact
              </p>
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-neutral-400" />
                  <div>
                    <p className="font-bold text-black dark:text-white">{event.createdBy?.name || "Student Coordinator"}</p>
                    <p className="text-[11px] text-neutral-400">{event.createdBy?.email || "No email"}</p>
                  </div>
                </div>
                {event.createdBy?.email && (
                  <a
                    href={`mailto:${event.createdBy.email}`}
                    className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
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
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
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
                  : "bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800"
              }`}>
                <div>
                  <p className="text-xs font-semibold text-neutral-500">Expected / Registered</p>
                  <p className="text-xl font-black text-black dark:text-white mt-0.5">
                    {expectedAttendance} <span className="text-xs text-neutral-400 font-normal">students</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-neutral-500">Venue Capacity</p>
                  <p className="text-xl font-black text-black dark:text-white mt-0.5">
                    {venueCapacity > 0 ? venueCapacity : "Unlimited"}
                  </p>
                </div>
              </div>
            </div>

            {/* Allocated Resources Badges */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Resource Requirements
              </p>
              <div className="flex flex-wrap gap-2">
                {resources.map((res, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-lg border border-neutral-200 dark:border-zinc-700 flex items-center gap-1.5"
                  >
                    <Package size={12} className="text-orange-500" />
                    <span>{res}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/60 space-y-2">
          {onOpenPreview && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPreview(event);
              }}
              className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mb-2"
            >
              <ExternalLink size={14} className="text-orange-400 dark:text-orange-600" />
              <span>Full Event &amp; Payment Preview</span>
            </button>
          )}

          {userRole === "facultyCoordinator" && event.reviewStatus === "PENDING" && onApprove && onReject && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => onApprove(event)}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle size={15} />
                <span>Approve Event</span>
              </button>
              <button
                type="button"
                onClick={() => onReject(event)}
                className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="py-2.5 bg-neutral-200 dark:bg-zinc-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
              className="py-2.5 bg-neutral-200 dark:bg-zinc-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-zinc-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
