import React, { useState, useRef, useEffect } from 'react';
import { generateGoogleCalendarLink, downloadICS } from '../utils/calendar';
import { CalendarDays, Download, Calendar, Check,CalendarCheck2 } from 'lucide-react';

const CalendarDropdown = ({ event, btnClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const dropdownRef = useRef(null);

    // Check if already synced on mount
    useEffect(() => {
        const eventId = event._id || event.slug;
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

    const calendarEvent = {
        title: event.title,
        description: event.description,
        location: event.venue,
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

    const defaultBtnClass = `flex items-center justify-center p-2 rounded-sm transition-colors border-2 ${
        isSynced 
            ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-300 cursor-not-allowed pointer-events-none' 
            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200'
    }`;

    const activeBtnClass = btnClassName 
        ? `${btnClassName} ${isSynced ? 'bg-green-50 text-green-700 border-green-350 pointer-events-none' : ''}`
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
                    <CalendarCheck2 className="w-[18px] h-[18px] " />
                ) : (
                    <CalendarDays className="w-[18px] h-[18px] cursor-pointer" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-neutral-200 shadow-xl rounded-md z-50 overflow-hidden py-1">
                    <div className="px-3 py-2 border-b border-neutral-100 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Add to Calendar
                    </div>
                    <button
                        onClick={handleGoogle}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 flex items-center gap-2 text-neutral-700"
                    >
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Google Calendar
                    </button>
                    <button
                        onClick={handleICS}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 flex items-center gap-2 text-neutral-700"
                    >
                        <Download className="w-4 h-4 text-orange-500" />
                        Apple / Outlook (.ics)
                    </button>
                </div>
            )}
        </div>
    );
};

export default CalendarDropdown;
