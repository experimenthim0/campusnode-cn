import React, { useState, useRef, useEffect } from 'react';
import { generateGoogleCalendarLink, downloadICS } from '../utils/calendar';
import { CalendarDays, Download, Calendar, Check,CalendarCheck2 } from 'lucide-react';

const CalendarDropdown = ({ event, btnClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const dropdownRef = useRef(null);

    // Check if already synced on mount
    useEffect(() => {
        const eventId = event?._id || event?.id || event?.slug;
        if (eventId && localStorage.getItem(`calendar_synced_${eventId}`) === 'true') {
            setIsSynced(true);
        }
    }, [event]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!event) return null;

    const calendarEvent = {
        title: event.title || '',
        description: event.description || '',
        location: event.venue || '',
        startTime: event.startTime,
        endTime: event.endTime // might be undefined, handled in utils
    };

    const markSynced = () => {
        setIsSynced(true);
        const eventId = event._id || event.slug;
        if (eventId) {
            localStorage.setItem(`calendar_synced_${eventId}`, 'true');
        }
    };

    const handleGoogle = (e) => {
        e.preventDefault();
        window.open(generateGoogleCalendarLink(calendarEvent), '_blank');
        markSynced();
        setIsOpen(false);
    };

    const handleICS = (e) => {
        e.preventDefault();
        downloadICS(calendarEvent);
        markSynced();
        setIsOpen(false);
    };

    const defaultBtnClass = `flex items-center justify-center p-2 rounded-full transition-all duration-200 border mysans ${
        isSynced 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 cursor-not-allowed pointer-events-none' 
            : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 shadow-2xs'
    }`;

    const activeBtnClass = btnClassName 
        ? `${btnClassName} ${isSynced ? '!bg-emerald-50 dark:!bg-emerald-950/40 !text-emerald-700 dark:!text-emerald-400 !border-emerald-300 dark:!border-emerald-800 pointer-events-none' : ''}`
        : defaultBtnClass;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className={activeBtnClass}
                title={isSynced ? "Added to Calendar" : "Sync to Calendar"}
            >
                {isSynced ? (
                    <CalendarCheck2 className="w-[18px] h-[18px]" />
                ) : (
                    <CalendarDays className="w-[18px] h-[18px] cursor-pointer" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-52 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-800/90 shadow-lg dark:shadow-neutral-950/60 rounded-xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-1.5 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Add to Calendar
                    </div>
                    <button
                        onClick={handleGoogle}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-medium mysans hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                    >
                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                        Google Calendar
                    </button>
                    <button
                        onClick={handleICS}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-medium mysans hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                    >
                        <Download className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
                        Apple / Outlook (.ics)
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalendarDropdown;
