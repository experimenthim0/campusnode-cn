import React from 'react';
import { Bell, Inbox, ExternalLink, Calendar, User } from 'lucide-react';

const NotificationsTab = ({
    adminNotifications = [],
    loadingNotifications
}) => {
    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-start gap-3">
                <Inbox size={20} className="shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Incoming Notifications & Alerts</h4>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                        Real-time incoming alerts, proposals, and notification logs received from clubs, coordinators, and campus system events.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {adminNotifications.map((n, idx) => {
                    const d = new Date(n.createdAt);
                    const dateStr = !isNaN(d.getTime())
                        ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                        : "N/A";
                    const timeStr = !isNaN(d.getTime())
                        ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
                        : "";
                    const senderName = n.sender?.name || n.sender?.clubName || 'Campus System';

                    return (
                        <div 
                            key={n._id || n.id || idx}
                            className="p-5 rounded-2xl border border-neutral-200/90 dark:border-zinc-800/90 bg-white dark:bg-[#0c0c0c] flex items-start gap-4 transition-all hover:border-neutral-300 dark:hover:border-zinc-700 shadow-xs"
                        >
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                                <Bell size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="font-bold text-black dark:text-white text-sm">{n.title}</h4>
                                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                                        {dateStr} • {timeStr}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 leading-relaxed">{n.message}</p>
                                
                                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-100 dark:border-zinc-800/60 text-xs">
                                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                                        <User size={13} className="text-neutral-400" />
                                        <span className="text-[11px] font-bold">
                                            From: <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{senderName}</span>
                                        </span>
                                    </div>

                                    {n.eventId && (
                                        <a
                                            href={`/event/${n.eventId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                                        >
                                            <Calendar size={12} />
                                            <span>View Event</span>
                                            <ExternalLink size={10} />
                                        </a>
                                    )}
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
