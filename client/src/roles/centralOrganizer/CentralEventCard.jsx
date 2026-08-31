import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  DoorOpen,
  Users,
  User,
  MapPin,
  Clock,
  GraduationCap,
  Shield,
  Building2,
  MoreVertical,
  Edit,
  QrCode,
  FileText,
  Trash2,
} from "lucide-react";
import { PROGRAM_LABELS } from "../../constants/academicConstants";

const CentralEventCard = ({
  event,
  activeMenuId,
  setActiveMenuId,
  onEdit,
  onTogglePublish,
  onDelete,
  onManageStaff,
  onManageClubs,
}) => {
  const isMenuOpen = activeMenuId === event.id;
  const [menuPlacement, setMenuPlacement] = useState({ openUpward: false, alignRight: true });

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between">
      <div>
        {/* Card Header: Type + Registration Badges & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-md">
                <Sparkles size={11} className="text-orange-600 dark:text-orange-400" />
                College-Wide
              </span>

              {event.registrationType === "none" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-md">
                  <DoorOpen size={11} className="text-orange-600 dark:text-orange-400" />
                  Open Walk-in
                </span>
              ) : event.registrationType === "team" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-md">
                  <Users size={11} className="text-orange-600 dark:text-orange-400" />
                  Team ({event.minTeamSize || 1}-{event.maxTeamSize || 1})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-md">
                  <User size={11} className="text-orange-600 dark:text-orange-400" />
                  Individual Pass
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">
              {event.title}
            </h3>
          </div>

          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              event.reviewStatus === "PUBLISHED"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                event.reviewStatus === "PUBLISHED" ? "bg-emerald-500" : "bg-neutral-400"
              }`}
            />
            {event.reviewStatus === "PUBLISHED" ? "Live" : "Draft"}
          </span>
        </div>

        <div className="mt-3.5 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          <p className="flex items-center gap-2">
            <MapPin size={14} className="text-orange-600 dark:text-orange-500 shrink-0" />
            <span>{event.venue}</span>
          </p>
          <p className="flex items-center gap-2">
            <Clock size={14} className="text-orange-600 dark:text-orange-500 shrink-0" />
            <span>
              {new Date(event.startTime).toLocaleDateString()} &bull;{" "}
              {new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Users size={14} className="text-orange-600 dark:text-orange-500 shrink-0" />
            <span>
              {event.registrationType === "none"
                ? `${event._count?.attendanceRecords || 0} Attended (Open Walk-in)`
                : `${event._count?.participations || 0} Registered • ${event._count?.attendanceRecords || 0} Present`}
            </span>
          </p>
        </div>

        {/* Eligibility & Restrictions Badge Preview */}
        {(event.allowedPrograms?.length > 0 || event.allowedYears?.length > 0 || event.allowedBranches?.length > 0) && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] text-neutral-500 dark:text-neutral-400">
            <GraduationCap size={13} className="text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="font-medium">
              {event.allowedPrograms?.length > 0 && event.allowedPrograms.length < 6
                ? event.allowedPrograms.map((p) => PROGRAM_LABELS[p] || p).join(", ")
                : "All Programs"}
              {" • "}
              {event.allowedYears?.length > 0 ? event.allowedYears.join(", ") : "All Years"}
              {" • "}
              {event.allowedBranches?.length > 0 ? `${event.allowedBranches.length} Branches` : "All Branches"}
            </span>
          </div>
        )}

        {/* Participating Clubs Preview */}
        {event.participatingClubs?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-neutral-400">Clubs:</span>
            {event.participatingClubs.map((pc) => (
              <span
                key={pc.id}
                className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md"
              >
                {pc.club?.clubName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons bar */}
      <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onManageStaff(event)}
            className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-950/70 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Shield size={13} className="text-orange-600 dark:text-orange-400" />
            Staff ({event._count?.eventStaff || 0})
          </button>
          <button
            onClick={() => onManageClubs(event)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Building2 size={13} className="text-orange-600 dark:text-orange-400" />
            Clubs ({event.participatingClubs?.length || 0})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Live / Draft Switch Toggle */}
          <button
            type="button"
            onClick={() => onTogglePublish(event.id, event.reviewStatus)}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              event.reviewStatus === "PUBLISHED"
                ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
            }`}
            title={event.reviewStatus === "PUBLISHED" ? "Published (Click to unpublish & set to draft)" : "Draft (Click to publish live)"}
          >
            <span
              className={`w-4 h-2.5 rounded-full p-0.5 flex items-center transition-colors ${
                event.reviewStatus === "PUBLISHED" ? "bg-emerald-500 justify-end" : "bg-neutral-400 justify-start"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white block shadow-xs" />
            </span>
            <span>{event.reviewStatus === "PUBLISHED" ? "Live" : "Draft"}</span>
          </button>

          {/* Three-dots Menu Dropdown */}
          <div className="relative event-card-menu">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMenuOpen) {
                  setActiveMenuId(null);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
                  const alignRight = rect.right > 180;
                  setMenuPlacement({ openUpward, alignRight });
                  setActiveMenuId(event.id);
                }
              }}
              className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-orange-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>

            {isMenuOpen && (
              <div 
                className={`absolute ${menuPlacement.alignRight ? 'right-0' : 'left-0'} ${
                  menuPlacement.openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                } w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-50 py-1 text-xs max-h-[calc(100dvh-60px)] overflow-y-auto`}
              >
                <button
                  onClick={() => {
                    setActiveMenuId(null);
                    onEdit(event);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 transition-colors text-left cursor-pointer"
                >
                  <Edit size={14} className="text-orange-600 dark:text-orange-400" />
                  <span>Edit Event</span>
                </button>

                {event.registrationType !== "none" && (
                  <>
                    <Link
                      to={`/event/${event.slug || event.id}/check-in`}
                      onClick={() => setActiveMenuId(null)}
                      className="w-full px-3 py-2 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 transition-colors text-left"
                    >
                      <QrCode size={14} className="text-orange-600 dark:text-orange-400" />
                      <span>Scan Attendance</span>
                    </Link>

                    <Link
                      to={`/event/${event.id}/registrations`}
                      onClick={() => setActiveMenuId(null)}
                      className="w-full px-3 py-2 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 transition-colors text-left"
                    >
                      <FileText size={14} className="text-orange-600 dark:text-orange-400" />
                      <span>Registrations</span>
                    </Link>
                  </>
                )}

                <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                <button
                  onClick={() => {
                    setActiveMenuId(null);
                    onDelete(event.id, event.title);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Event</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CentralEventCard;
