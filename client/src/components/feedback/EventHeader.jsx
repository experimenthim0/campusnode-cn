import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, RefreshCw, Users } from 'lucide-react';

const EventHeader = ({ eventData, isCompleted, refreshing, onRefresh, eventId }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            to={eventData?.clubId ? `/club-events/${eventData.clubId}` : '/my-events'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded-md"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">•</span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Feedback Analytics
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          {eventData?.title || 'Event Feedback Analytics'}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-600 dark:text-slate-300">
          {eventData?.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span>{eventData.venue}</span>
            </span>
          )}
          {eventData?.startTime && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span>{new Date(eventData.startTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </span>
          )}
          {isCompleted ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              Event Completed
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
              Upcoming / In Progress
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
        <Link
          to="/feedback-questions"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200 font-semibold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs"
          title="Preview questions shown to students"
        >
          <span>Survey Preview</span>
        </Link>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 text-slate-700 dark:text-slate-200 font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-xs disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          aria-label="Refresh feedback analytics data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-500' : 'text-slate-500 dark:text-slate-400'}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
        <Link
          to={`/event/${eventId}/registrations`}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 dark:hover:bg-neutral-100 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          aria-label="View Event Registrations"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Registrations</span>
        </Link>
      </div>
    </header>
  );
};

export default EventHeader;
