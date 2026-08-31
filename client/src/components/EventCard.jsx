import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CalendarDropdown from './CalendarDropdown';
import { getColorSync } from 'colorthief';
import { useImageBlob } from '../hooks/useImageBlob';
import { useTheme } from '../context/ThemeContext';
import { prefetchEventDetail } from '../lib/prefetchManager';

const EventCard = ({ event, onRegister, isRegistered }) => {
    const { title, description, venue, startTime, totalSeats, registeredCount, status, _id, entryFee, registrationDeadline, slug, showWinner } = event;

    const DEFAULT_IMAGE = '/CLUBSETU.png';
    const displayImage = event.imageUrl || DEFAULT_IMAGE;

    const { displayUrl, isBlobLoaded } = useImageBlob(displayImage);
    const { isDark } = useTheme();

    // Color extraction states
    const [rgb, setRgb] = useState(null);
    const [isColorLoaded, setIsColorLoaded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const imgRef = useRef(null);


    const fallbackLogo = isDark ? "/darkthemelogo.png" : "/lightthemelogo.png";
    const rawClubLogo = event.club?.clubLogo || event.createdBy?.clubLogo;
    const [clubLogoSrc, setClubLogoSrc] = useState(fallbackLogo);

    useEffect(() => {
        if (!rawClubLogo) {
            setClubLogoSrc(fallbackLogo);
            return;
        }
        setClubLogoSrc(fallbackLogo);
        const img = new Image();
        img.src = rawClubLogo;
        img.onload = () => setClubLogoSrc(rawClubLogo);
        img.onerror = () => setClubLogoSrc(fallbackLogo);
    }, [rawClubLogo, fallbackLogo]);

    // Idle prefetch event details on mount/visibility
    useEffect(() => {
        if (slug || _id) {
            prefetchEventDetail(slug || _id);
        }
    }, [slug, _id]);


    const handleImageLoad = () => {
        const imageEl = imgRef.current;
        if (!imageEl) return;
        try {
            if (imageEl.complete && isBlobLoaded) {
                // Use the synchronous getColorSync from ColorThief v3
                const color = getColorSync(imageEl);
                if (color) {
                    const rgbArray = color.array();
                    if (Array.isArray(rgbArray) && rgbArray.length === 3) {
                        setRgb(rgbArray);
                        setIsColorLoaded(true);
                    }
                }
            }
        } catch (error) {
            // Keep console warning clean and minimal to not spam logs
            console.warn('Could not extract color from event image:', error.message);
        }
    };

    useEffect(() => {
        // Reset colors when image changes
        setRgb(null);
        setIsColorLoaded(false);
    }, [event.imageUrl]);

    useEffect(() => {
        const imageEl = imgRef.current;
        if (imageEl && imageEl.complete && isBlobLoaded) {
            handleImageLoad();
        }
    }, [displayUrl, isBlobLoaded]);

    const formattedTime = new Date(startTime).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const eventDate = new Date(startTime);
    const isValidDate = !isNaN(eventDate.getTime());
    const monthName = isValidDate
        ? eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()
        : '';
    const dayNumber = isValidDate
        ? eventDate.getDate()
        : '';

    const getDeadlineText = () => {
        const dl = new Date(registrationDeadline || startTime);
        const ev = new Date(startTime);

        const timeOptions = { hour: '2-digit', minute: '2-digit' };
        const dateOptions = { month: 'short', day: 'numeric' };

        const isSameDay = dl.toDateString() === ev.toDateString();

        if (isSameDay) {
            return `Reg. by ${dl.toLocaleTimeString('en-US', timeOptions)}`;
        } else {
            return `Reg. by ${dl.toLocaleDateString('en-US', dateOptions)}, ${dl.toLocaleTimeString('en-US', timeOptions)}`;
        }
    };

    const isLive = status === 'LIVE';
    const isEnded = status === 'ENDED';
    const isUpcoming = !isLive && status === 'UPCOMING';
    const isUnlimited = !totalSeats || totalSeats === 0;
    const isFull = !isUnlimited && registeredCount >= totalSeats;
    const seatsText = isUnlimited
        ? ` `
        : `${totalSeats - registeredCount} left`;

    // Construct premium card styles dynamically
    const customStyles = (isHovered && rgb)
        ? {
            backgroundColor: isDark
                ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`
                : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.08)`,
            boxShadow: isDark
                ? `0 20px 40px -15px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`
                : `0 20px 40px -15px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`,
            borderColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`,
        }
        : {
            backgroundColor: isDark ? 'rgb(13, 13, 13)' : 'rgb(255, 255, 255)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgb(229, 231, 235)', // border-gray-200
        };

    const navigate = useNavigate();

    const handleCardClick = (e) => {
        // Prevent navigation if the user is clicking on nested buttons, links, or dropdowns
        if (e.target.closest('button') || e.target.closest('.calendar-dropdown') || e.target.closest('a')) {
            return;
        }
        navigate(`/event/${slug || _id}`);
    };

    return (
        <div
            style={customStyles}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleCardClick}
            className="border border-neutral-200 dark:border-neutral-800/80 rounded-xl overflow-hidden transition-all duration-500 ease-out hover:-translate-y-1 flex flex-col h-full shadow-sm group cursor-pointer"
        >

            {/* Image */}
            <div className="relative w-full aspect-[21/9] overflow-hidden bg-slate-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800/80">
                <img
                    ref={imgRef}
                    src={displayUrl}
                    alt={title}
                    crossOrigin={isBlobLoaded ? "anonymous" : undefined}
                    onLoad={handleImageLoad}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        e.target.onerror = null; // prevent infinite loop
                        e.target.src = "/CLUBSETU.png"; // fallback image
                    }}
                />

                {/* Status Badge */}
                <div className="absolute top-1 left-1.5">
                    {isLive && (
                        <span className="inline-flex items-center gap-1.5 bg-orange-600 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md animate-pulse">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            Live
                        </span>
                    )}
                    {!isLive && status === 'UPCOMING' && (
                        <span className="inline-flex items-center border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-neutral-100 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs backdrop-blur-xs">
                            Upcoming
                        </span>
                    )}
                    {isEnded && (
                        <span className="inline-flex items-center bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-xs">
                            Ended
                        </span>
                    )}
                </div>
            </div>

            <div className="px-4 pt-2 flex flex-auto flex-col">
                {(event.club?.clubName || event.createdBy?.clubName) && (
                    <div className="flex items-center min-w-0">
                        <div className="w-6 h-6 rounded-full overflow-hidden mr-2 border border-neutral-300 dark:border-neutral-700">
                            <img
                                src={clubLogoSrc}
                                alt={event.club?.clubName || event.createdBy?.clubName || 'Club Logo'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = fallbackLogo;
                                }}
                            />
                        </div>
                        <span className="truncate  text-orange-600  text-[12px] font-semibold">
                            {event.club?.clubName || event.createdBy?.clubName}
                        </span>
                    </div>
                )}
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white tracking-wide mb-2 line-clamp-2">{title}</h3>

                {/* Info row */}
                {isEnded ? (
                    showWinner ? (
                        /* ONLY SHOW WINNERS WHEN ENDED AND showWinner is TRUE */
                        <div className="flex gap-2 mb-2 ">
                            {event.winners && event.winners.length > 0 ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 flex items-center justify-center shrink-0">
                                            <i className="ri-time-line text-orange-600 text-sm" />
                                        </div>
                                        <span className="font-medium text-neutral-500 dark:text-neutral-200 text-xs">{formattedTime}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 flex items-center justify-center shrink-0">
                                            <i className="ri-trophy-fill text-orange-600 text-sm" />
                                        </div>
                                        <span className="text-[11px] font-bold tracking-wider text-orange-600 uppercase">Winners</span>
                                    </div>
                                    {/* Winner Rows */}
                                    {event.winners.map((winner, index) => (
                                        <div key={index} className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/40 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${winner.rank === 1 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60' :
                                                        winner.rank === 2 ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700' :
                                                            'bg-orange-100 dark:bg-orange-950/40 text-orange-855 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60'
                                                    }`}>
                                                    #{winner.rank}
                                                </span>
                                                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{winner.name}</span>
                                            </div>
                                            {winner.rank === 1 && <i className="ri-medal-fill text-amber-500" />}
                                            {winner.rank === 2 && <i className="ri-medal-fill text-neutral-400" />}
                                            {winner.rank === 3 && <i className="ri-medal-fill text-[#CD7F32]" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Results not yet declared */
                                <div className="flex gap-2 py-2 flex-col text-neutral-600 dark:text-neutral-400">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 flex items-center justify-center shrink-0">
                                            <i className="ri-time-line text-orange-600 text-sm" />
                                        </div>
                                        <span className="font-medium text-xs text-neutral-600 dark:text-neutral-350">{formattedTime}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 flex items-center justify-center shrink-0">
                                            <i className="ri-map-pin-line text-orange-600 text-sm" />
                                        </div>
                                        <span className="font-medium text-xs text-neutral-600 dark:text-neutral-350">{venue}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 flex items-center justify-center shrink-0">
                                            <i className="ri-trophy-fill text-orange-600 text-sm" />
                                        </div>
                                        <p className="text-sm text-neutral-400 dark:text-neutral-550 italic">Results being finalized...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Ended event without winners */
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <div className="col-span-2 flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                                <i className="ri-time-line text-neutral-400 dark:text-neutral-500 text-sm shrink-0" />
                                <span className="truncate">
                                    {formattedTime} (Ended)
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0">
                                <i className="ri-map-pin-line text-neutral-400 dark:text-neutral-500 text-sm shrink-0" />
                                <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">{venue}</span>
                            </div>

                            <div className="flex items-center gap-1.5 col-span-2 min-w-0">
                                <i className="ri-group-line text-neutral-400 dark:text-neutral-500 text-sm shrink-0" />
                                <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                                    {event.registrationType === 'none' ? 'Open Entry • No Registration' : (isUnlimited ? 'Unlimited Seats' : seatsText)}
                                </span>
                            </div>
                        </div>
                    )
                ) : (
                    /* Live or Upcoming: Divided into Left Info + Right Big Calendar Date Badge */
                    <div className="flex items-center justify-between gap-2.5 mb-1">
                        {/* Left Information Section */}
                        <div className="flex-1 min-w-0 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                            <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300 min-w-0">
                                <i className="ri-time-line text-neutral-400 dark:text-neutral-500 text-sm shrink-0" />
                                <span className="truncate">
                                    {formattedTime} {`(${getDeadlineText()})`}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0">
                                <i className="ri-map-pin-line text-neutral-400 dark:text-neutral-500 text-sm shrink-0" />
                                <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">{venue}</span>
                            </div>

                            <div className="flex items-center gap-1.5 min-w-0">
                                <i className="ri-group-line text-neutral-400 dark:text-neutral-500 text-sm shrink-0" />
                                <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
                                    {event.registrationType === 'none' ? 'Open Entry • No Registration' : (isUnlimited ? 'Unlimited Seats' : seatsText)}
                                </span>
                            </div>
                        </div>

                        {/* Right Section: Big Calendar Date Badge */}
                        <div className="shrink-0 self-center pl-1">
                            <div className="relative flex flex-col items-center justify-center min-w-[50px] sm:min-w-[54px] bg-white dark:bg-neutral-900 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700/80 shadow-xs group-hover:scale-105 transition-transform duration-300">
                                {/* Top Binder Rings */}
                                {/* <div className="absolute -top-1 left-2.5 w-1.5 h-2.5 bg-neutral-800 dark:bg-neutral-300 rounded-full z-10 shadow-2xs" />
                                <div className="absolute -top-1 right-2.5 w-1.5 h-2.5 bg-neutral-800 dark:bg-neutral-300 rounded-full z-10 shadow-2xs" /> */}

                                <div className="w-full bg-red-500 dark:bg-red-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center pt-1.5 pb-0.5 px-1.5 leading-none">
                                    {monthName}
                                </div>

                                {/* Big Day Number */}
                                <div className="w-full flex items-center justify-center py-1 sm:py-1.5 bg-neutral-50 dark:bg-neutral-900/90">
                                    <span className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-none">
                                        {dayNumber}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

          
            <div className="px-5 pb-4 mt-auto">
                <div className="flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
               
                    {entryFee !== 0 && (
                        <span
                            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-2 rounded-lg border shrink-0 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/60"
                        >
                            <i className="ri-money-rupee-circle-line" /> ₹{entryFee}
                        </span>
                    )}

               
                    {isRegistered ? (
                        <Link
                            to={`/event/${slug || _id}`}
                            className="flex-1 block text-center py-2 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-950/80 transition-colors"
                        >
                            View Event
                        </Link>
                    ) : (
                        <Link
                            to={`/event/${slug || _id}`}
                            className={`flex-1 block text-center py-2 rounded-full text-xs font-bold tracking-wider border transition-all cursor-pointer shadow-xs ${(isEnded || isLive)
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                    : event.registrationType === 'none'
                                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                        : isFull
                                            ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                                            : 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:border-neutral-800 dark:hover:border-neutral-200'
                                }`}
                        >
                            {(isEnded || isLive) ? 'View Event' : event.registrationType === 'none' ? 'Open Event' : isFull ? 'Join Waitlist' : 'Register Now'}
                        </Link>
                    )}

                    {isUpcoming && (
                        <CalendarDropdown
                            event={event}
                            btnClassName="p-2 border rounded-lg shadow-sm hover:bg-neutral-150 dark:hover:bg-neutral-900 transition-colors duration-200 shrink-0 flex items-center justify-center border-neutral-200 dark:border-neutral-800/80 h-9 w-9 text-neutral-600 dark:text-neutral-450 cursor-pointer"
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(EventCard);