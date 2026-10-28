import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Calendar, ArrowUpRight, Handshake } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { prefetchEventDetail } from '../lib/prefetchManager';

import { useImageBlob } from '../hooks/useImageBlob';

/**
 * CompactEventCard - Modern horizontal event card design
 * Inspired by mobile event discovery feeds (poster thumbnail on left with heart, 
 * details and pill badges on right).
 */
const CompactEventCard = ({ event, onRegister, isRegistered }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification() || {};

  const {
    _id,
    slug,
    title,
    venue,
    startTime,
    entryFee,
    registrationFee,
    imageUrl,
    category,
    club,
    createdBy,
    status
  } = event || {};

  const eventId = String(slug || _id || '');
  const DEFAULT_IMAGE = '/fallback-img.jpg';
  const displayImage = imageUrl || DEFAULT_IMAGE;
  const { displayUrl } = useImageBlob(displayImage);

  // Favorite / Saved state synced with localStorage
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    try {
      const saved = JSON.parse(localStorage.getItem('cn_favorite_events') || '[]');
      setIsFavorited(saved.includes(eventId));
    } catch {
      setIsFavorited(false);
    }

    const handleSync = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('cn_favorite_events') || '[]');
        setIsFavorited(saved.includes(eventId));
      } catch {
        // no-op
      }
    };

    window.addEventListener('cn_favorites_updated', handleSync);
    return () => window.removeEventListener('cn_favorites_updated', handleSync);
  }, [eventId]);

  // Idle prefetch details
  useEffect(() => {
    if (slug || _id) {
      prefetchEventDetail(slug || _id);
    }
  }, [slug, _id]);

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!eventId) return;

    try {
      const saved = JSON.parse(localStorage.getItem('cn_favorite_events') || '[]');
      let updated;
      if (saved.includes(eventId)) {
        updated = saved.filter((id) => id !== eventId);
        setIsFavorited(false);
        if (showNotification) {
          showNotification('Event removed from saved items', 'info');
        }
      } else {
        updated = [...saved, eventId];
        setIsFavorited(true);
        if (showNotification) {
          showNotification('Event saved to favorites!', 'success');
        }
      }
      localStorage.setItem('cn_favorite_events', JSON.stringify(updated));
      window.dispatchEvent(new Event('cn_favorites_updated'));
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    navigate(`/event/${slug || _id}`);
  };

  // Format date & time in IST with 12-hour AM/PM: e.g. "24 Aug - 8:00 PM"
  const formattedDateTime = (() => {
    if (!startTime) return 'Date TBA';
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return 'Date TBA';

    const day = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'Asia/Kolkata' });
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' });
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    return `${day} ${month} - ${time}`;
  })();

  // Price format: Only displayed when event is paid (do not show when free)
  const feeNum = Number(entryFee ?? registrationFee ?? 0);
  const isPaid = !isNaN(feeNum) && feeNum > 0;
  const priceLabel = isPaid ? `From ₹${feeNum}` : null;

  // Organizing clubs & joint event resolution
  const organizers = Array.isArray(event?.organizers) ? event.organizers : [];
  const organizingClubs = organizers.map((o) => o?.club).filter(Boolean);
  if (organizingClubs.length === 0 && club) {
    organizingClubs.push(club);
  }

  const isJoint = organizingClubs.length > 1;
  const primaryClubName = organizingClubs[0]?.clubName || club?.clubName || createdBy?.clubName || null;
  const secondClubName = organizingClubs[1]?.clubName || (organizers[1]?.club?.clubName) || null;
  const jointClubNames = isJoint ? organizingClubs.map((c) => c?.clubName).filter(Boolean).join(' × ') : null;

  // Tag / Category
  const categoryLabel = category || (!isJoint ? (club?.clubName || createdBy?.clubName) : null) || 'Campus Event';

  const isLive = status === 'LIVE';

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-cn-surface dark:bg-cn-surface-card border border-cn-border rounded-2xl sm:rounded-3xl px-1 py-2 sm:p-3.5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05),0_2px_6px_-1px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)] hover:shadow-[0_10px_24px_-4px_rgba(0,0,0,0.08),0_4px_10px_-2px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_10px_28px_-4px_rgba(0,0,0,0.45)] hover:border-brand-500/50 transition-all duration-200 cursor-pointer flex items-center gap-2.5 sm:gap-3 overflow-hidden"
    >
      {/* Left: Square Poster with Heart Button */}
      <div className="relative w-24 h-28 sm:w-32 sm:h-32 shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-100 dark:border-cn-border">
        <img
          src={displayUrl || DEFAULT_IMAGE}
          alt={title || 'Event poster'}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_IMAGE;
          }}
        />

        {/* Optional Live pulse dot */}
        {isLive && (
          <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 bg-red-600/90 backdrop-blur-xs text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Live
          </div>
        )}
      </div>

      {/* Right: Event Information */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 self-stretch">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm sm:text-base text-cn-text line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
              {title || 'Untitled Event'}
            </h3>
            {isRegistered && (
              <span className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 mt-0.5">
                Registered
              </span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-metadata text-cn-text-secondary mt-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-cn-text-muted shrink-0" />
            <span className="truncate">{venue || 'NIT Jalandhar'}</span>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-1.5 text-metadata text-cn-text-secondary mt-1 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-cn-text-muted shrink-0" />
            <span className="truncate">{formattedDateTime}</span>
          </div>
        </div>

        {/* Badges row: Price Pill + Category Pill + Joint Club Pill + Upward inclined arrow (visit) */}
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
            {isPaid && (
              <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-label font-medium bg-brand-600 dark:bg-brand-500 text-white shadow-2xs shrink-0">
                {priceLabel}
              </span>
            )}
            {category && (
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-label font-medium bg-cn-surface-muted text-cn-text-secondary border border-cn-border truncate max-w-[110px] sm:max-w-[180px]">
                {category}
              </span>
            )}
            {isJoint && secondClubName ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-label font-medium bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40 max-w-[190px] sm:max-w-[270px] min-w-0"
                title={jointClubNames || `${primaryClubName} & ${secondClubName}`}
              >
                <span className="truncate max-w-[80px] sm:max-w-[115px]">{primaryClubName}</span>
                <Handshake className="w-3.5 h-3.5 shrink-0 text-brand-500" />
                <span className="truncate max-w-[80px] sm:max-w-[115px]">{secondClubName}</span>
                {organizingClubs.length > 2 && (
                  <span className="text-[10px] text-brand-500 font-normal shrink-0">+{organizingClubs.length - 2}</span>
                )}
              </span>
            ) : (
              !category && categoryLabel && (
                <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-label font-medium bg-cn-surface-muted text-cn-text-secondary border border-cn-border truncate max-w-[110px] sm:max-w-[180px]">
                  {categoryLabel}
                </span>
              )
            )}
          </div>

          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neutral-100 dark:bg-cn-surface-elevated group-hover:bg-brand-600 group-hover:dark:bg-brand-500 text-neutral-500 dark:text-neutral-400 group-hover:text-white flex items-center justify-center transition-all duration-200 shrink-0 shadow-2xs mr-1 sm:mr-0"
            title="Visit event"
            aria-label="Visit event"
          >
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactEventCard;
