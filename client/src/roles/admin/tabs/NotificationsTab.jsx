import React from 'react';
import { Bell, Inbox, ExternalLink, Calendar, User, RefreshCw, Megaphone } from 'lucide-react';

const NotificationsTab = ({
    adminNotifications = [],
    loadingNotifications,
    onRefresh
}) => {
    return (
        <div className="space-y-6">
            {/* <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <Inbox size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">Incoming Notifications & Alerts</h4>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">
                            Real-time incoming broadcasts, alerts, proposals, and notification logs dispatched by student clubs and coordinators across campus.
                        </p>
                    </div>
                </div>
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loadingNotifications}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-semibold transition cursor-pointer shrink-0 disabled:opacity-50"
                        title="Refresh notifications"
                    >
                        <RefreshCw size={13} className={loadingNotifications ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                )}
            </div> */}

            <div className="space-y-3">
                {loadingNotifications && adminNotifications.length === 0 ? (
                    <div className="p-16 text-center border border-neutral-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
                        <RefreshCw size={28} className="mx-auto text-brand-600 animate-spin mb-3" />
                        <p className="text-xs font-semibold text-neutral-400">Loading incoming notifications...</p>
                    </div>
                ) : adminNotifications.map((n, idx) => {
                    const d = new Date(n.createdAt);
                    const dateStr = !isNaN(d.getTime())
                        ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "N/A";
                    const timeStr = !isNaN(d.getTime())
                        ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
                        : "";
                    
                    const senderName = n.sender?.clubName || n.club?.clubName || (n.sender?.name && !n.sender.name.includes('@') ? n.sender.name : null) || 'Campus System';
                    const senderLogo = n.sender?.clubLogo || n.club?.clubLogo || null;
                    const isClubBroadcast = Boolean(n.clubId || n.sender?.clubName || n.sender?.clubLogo || n.type === 'BROADCAST');
                    const clubSlug = n.sender?.slug || n.club?.slug || null;

                    return (
                        <div 
                            key={n._id || n.id || idx}
                            className="p-5 rounded-2xl border border-cn-border bg-cn-surface flex items-start gap-4 transition-all hover:border-neutral-300 dark:hover:border-zinc-700 shadow-xs"
                        >
                            {/* <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20 overflow-hidden shadow-2xs">
                                {senderLogo ? (
                                    <img src={senderLogo} alt={senderName} className="w-full h-full object-cover" />
                                ) : isClubBroadcast ? (
                                    <Megaphone size={18} />
                                ) : (
                                    <Bell size={18} />
                                )}
                            </div> */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-black dark:text-white text-sm">{n.title}</h4>
                                        {isClubBroadcast && (
                                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-900/40">
                                                Club Broadcast
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                                        {dateStr} • {timeStr}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">{n.message}</p>
                                
                                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-zinc-800/60 text-xs">
                                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                                        <User size={13} className="text-neutral-400" />
                                        <span className="text-[11px] font-bold">
                                            From: <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{senderName}</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {clubSlug && (
                                            <a
                                                href={`/club/${clubSlug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
                                            >
                                                <span>View Club</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        )}
                                        {n.eventId && (
                                            <a
                                                href={`/event/${n.eventId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                                            >
                                                <Calendar size={12} />
                                                <span>View Event</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {adminNotifications.length === 0 && !loadingNotifications && (
                    <div className="p-16 text-center border border-dashed border-neutral-200 dark:border-zinc-800 rounded-2xl bg-neutral-50/50 dark:bg-zinc-900/20">
                        <Inbox size={36} className="mx-auto text-neutral-300 dark:text-zinc-700 mb-3" />
                        <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">No Incoming Notifications</h5>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 max-w-sm mx-auto">
                            Incoming alerts, announcements, and requests sent by student clubs or coordinators will appear in this feed.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsTab;
