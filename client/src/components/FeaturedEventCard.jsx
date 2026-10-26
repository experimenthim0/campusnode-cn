import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { formatFeaturedEventDateTime } from "../utils/formatFeaturedEventDate";

/**
 * Reusable Featured Event Card
 *
 * Strict requirements:
 * - NO event poster image
 * - NO registration count or heavy metadata
 * - Displays: FEATURED tag, Title (highest weight), Date · Time, Hosted by, Sponsor info (if any), Arrow affordance
 * - Entire card is clickable to /event/:slug or /event/:id
 * - Shared across Homepage, Event Feed, /featured-events page, and Admin Preview
 */
const FeaturedEventCard = ({ event, isPreview = false, className = "" }) => {
  if (!event) return null;

  const { combinedStr } = formatFeaturedEventDateTime(event.startTime);
  const hostName = event.hostName || event.club?.clubName || (event.organizerType === "CENTRAL" ? "Office of DSW" : "College Community");
  const eventLink = `/event/${event.slug || event.eventId || event.id}`;

  const CardContent = (
    <div
      className={`group relative flex flex-col justify-between h-full p-4 sm:p-4 bg-cn-surface dark:bg-cn-surface-card border border-cn-border rounded-2xl transition-all duration-200 hover:border-brand-500/50 hover:-translate-y-1 hover:shadow-md active:scale-[0.99] touch-manipulation cursor-pointer select-none text-left ${className}`}
    >
      {/* Top Bar: Badge & Arrow */}
      <div>
        {/* Title: Strongest visual weight */}
        <h3 className="text-card-title text-cn-text group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors line-clamp-2">
          {event.title || "Untitled Event"}
        </h3>

        {/* Date & Time */}
        <div className="mt-3 text-body font-medium text-cn-text-secondary">
          {combinedStr || "Date & Time TBA"}
        </div>

        {/* Hosted By */}
        <div className="flex items-center justify-between gap-2">
          <div className="mt-1 text-metadata text-cn-text-muted truncate">
            Hosted by <span className="font-medium text-cn-text">{hostName}</span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-cn-text-muted group-hover:text-brand-600 dark:group-hover:text-brand-300 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/50 transition-all">
            <ArrowUpRight
              size={18}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </div>
        </div>
      </div>

      {/* Sponsor info: Rendered ONLY if sponsor exists on event. If no sponsor, omit sponsor text entirely */}
      {Boolean(
        (event.sponsors && event.sponsors.length > 0) ||
        event.sponsor?.logoUrl ||
        (event.sponsorName && event.sponsorName.trim())
      ) && (
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 min-w-0">
            <span className="shrink-0 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">Sponsored by</span>
            <div className="flex items-center gap-2.5 overflow-hidden flex-wrap">
              {event.sponsors && event.sponsors.length > 0 ? (
                event.sponsors.map((s, idx) => (
                  <span key={s.id || idx} className="inline-flex items-center font-medium text-neutral-700 dark:text-neutral-300">
                    {/* {s.name?.trim()} */}
                    {s.logoUrl ? (
                      <img
                        src={s.logoUrl}
                        alt={s.name || "Sponsor"}
                        className="h-5 w-auto max-w-[80px] object-contain rounded-xs"
                      />
                    ) : null}
                  </span>
                ))
              ) : (
                <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate flex items-center">
                  {/* {event.sponsorName?.trim()} */}
                  {event.sponsor?.logoUrl && (
                    <img
                      src={event.sponsor.logoUrl}
                      alt={event.sponsor?.name || "Sponsor"}
                      className="h-5 w-auto max-w-[80px] object-contain rounded-xs"
                    />
                  )}
                </span>
              )}
            </div>
          </div>
        )}
    </div>
  );

  if (isPreview) {
    return CardContent;
  }

  return (
    <Link to={eventLink} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl">
      {CardContent}
    </Link>
  );
};

export default FeaturedEventCard;
