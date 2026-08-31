import React, { useState, useMemo } from 'react';
import { 
    Calendar, 
    Layers, 
    Users, 
    UserCheck, 
    Ticket, 
    TrendingUp, 
    AlertCircle, 
    Clock, 
    Wallet, 
    CheckCircle2, 
    Building2, 
    ChevronRight,
    Sparkles,
    BarChart3
} from 'lucide-react';
import { StatCard } from '../components/AdminUI';
import EventDataTable from './EventDataTable';

const OverviewTab = ({
    stats,
    role,
    events = [],
    clubHeads = [],
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    typeFilter,
    setTypeFilter,
    onDownloadCSV
}) => {
    const [analyticsView, setAnalyticsView] = useState('monthly'); // 'monthly' | 'yearly'

    const now = useMemo(() => new Date(), []);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' });

    const totalRegistrations = useMemo(() => {
        return (events || []).reduce((sum, e) => {
            if (e.registrationType === 'none') return sum;
            const count = e.totalRegistrations ?? e.registeredCount ?? e.regCount ?? 0;
            return sum + (Number(count) || 0);
        }, 0);
    }, [events]);

    const eventsThisMonth = useMemo(() => {
        return (events || []).filter(e => {
            const d = new Date(e.eventDate || e.startTime);
            return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;
    }, [events, currentMonth, currentYear]);

    const attentionItems = useMemo(() => {
        const items = [];
        const threeDaysFromNow = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        (events || []).forEach(e => {
            const startDate = new Date(e.eventDate || e.startTime);
            const deadlineDate = new Date(e.registrationDeadline || e.startTime);
            const isValidStart = !isNaN(startDate.getTime());
            const regCount = e.registrationType === 'none' ? 0 : (e.totalRegistrations ?? e.registeredCount ?? e.regCount ?? 0);
            const collected = e.totalAmountReceived || e.totalCollected || 0;
            const title = e.eventName || e.title || 'Untitled Event';
            const club = (e.clubName && e.clubName !== 'Unknown' && e.clubName !== 'Unknown Club')
                ? e.clubName
                : (e.club?.clubName || 'ODSW');

            if (isValidStart && startDate > now && startDate <= threeDaysFromNow) {
                const hoursLeft = Math.max(1, Math.round((startDate - now) / (1000 * 60 * 60)));
                items.push({
                    id: `soon-${e.id || e.eventId}`,
                    type: 'urgent',
                    icon: Clock,
                    badge: 'Starts Soon',
                    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    title,
                    club,
                    detail: `Starts in ~${hoursLeft}h (${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`,
                    link: `/event/${e.slug || e.id || e.eventId}`
                });
            }

            if (e.payoutStatus === 'PENDING' && collected > 0 && ((isValidStart && startDate < now) || (deadlineDate && deadlineDate < now))) {
                items.push({
                    id: `payout-${e.id || e.eventId}`,
                    type: 'financial',
                    icon: Wallet,
                    badge: 'Pending Payout',
                    badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
                    title,
                    club,
                    detail: `₹${collected.toLocaleString('en-IN')} revenue • Awaiting settlement`,
                    link: `/admin-dashboard?tab=payouts`
                });
            }

            if (isValidStart && startDate > now && startDate <= sevenDaysFromNow && e.registrationType !== 'none' && regCount < 5) {
                items.push({
                    id: `low-reg-${e.id || e.eventId}`,
                    type: 'warning',
                    icon: AlertCircle,
                    badge: 'Low Participation',
                    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    title,
                    club,
                    detail: `${regCount} registered • Starts ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
                    link: `/event/${e.slug || e.id || e.eventId}`
                });
            }
        });

        return items.slice(0, 4); // Keep concise and clean
    }, [events, now]);

    const monthlyTrends = useMemo(() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            const label = d.toLocaleString('en-US', { month: 'short' });
            
            const count = (events || []).filter(e => {
                const ed = new Date(e.eventDate || e.startTime);
                return !isNaN(ed.getTime()) && ed.getMonth() === m && ed.getFullYear() === y;
            }).length;

            months.push({ label, year: y, count });
        }
        const maxCount = Math.max(...months.map(m => m.count), 1);
        return months.map(m => ({ ...m, percent: Math.max(12, Math.round((m.count / maxCount) * 100)) }));
    }, [events, now]);

    const topClubs = useMemo(() => {
        const clubMap = new Map();
        (events || []).forEach(e => {
            const club = (e.clubName && e.clubName !== 'Unknown' && e.clubName !== 'Unknown Club')
                ? e.clubName
                : (e.club?.clubName || 'ODSW');
            const regCount = e.registrationType === 'none' ? 0 : (e.totalRegistrations ?? e.registeredCount ?? e.regCount ?? 0);
            
            const current = clubMap.get(club) || { name: club, events: 0, registrations: 0 };
            current.events += 1;
            current.registrations += Number(regCount) || 0;
            clubMap.set(club, current);
        });

        const list = Array.from(clubMap.values())
            .sort((a, b) => b.events - a.events || b.registrations - a.registrations)
            .slice(0, 4);
        
        const maxEvents = Math.max(...list.map(c => c.events), 1);
        return list.map(c => ({ ...c, percent: Math.max(15, Math.round((c.events / maxEvents) * 100)) }));
    }, [events]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard 
                    label="Active Events" 
                    value={stats?.totalEvents ?? 0}
                    subtext="Currently published & live"
                    icon={Calendar}
                />
                <StatCard 
                    label="Total Events" 
                    value={stats?.totalEventsTillNow ?? events.length ?? 0}
                    subtext="All-time created events"
                    icon={Layers}
                />
                <StatCard 
                    label="Registrations" 
                    value={totalRegistrations}
                    subtext="Total student enrollments"
                    icon={Ticket}
                />
                <StatCard 
                    label="This Month" 
                    value={eventsThisMonth}
                    subtext={`Scheduled in ${currentMonthName}`}
                    icon={TrendingUp}
                />
                <StatCard 
                    label="Active Clubs" 
                    value={stats?.totalClubs ?? clubHeads.length ?? 0}
                    subtext="Registered campus clubs"
                    icon={Building2}
                />
                <StatCard 
                    label="Total Students" 
                    value={stats?.totalStudents ?? 0}
                    subtext="Registered campus accounts"
                    icon={UserCheck}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                <div className="lg:col-span-7 bg-white dark:bg-[#0c0c0c] border border-neutral-200/90 dark:border-zinc-800/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-neutral-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-500 flex items-center justify-center">
                                    <BarChart3 size={14} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                                    Activity & Trends
                                </h3>
                            </div>

                            {/* View Switcher */}
                            <div className="inline-flex p-0.5 rounded-lg bg-neutral-100 dark:bg-zinc-900 border border-neutral-200/60 dark:border-zinc-800 text-[11px] font-bold">
                                <button
                                    onClick={() => setAnalyticsView('monthly')}
                                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                        analyticsView === 'monthly'
                                            ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs font-bold'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                                    }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setAnalyticsView('yearly')}
                                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                        analyticsView === 'yearly'
                                            ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-xs font-bold'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                                    }`}
                                >
                                    Yearly
                                </button>
                            </div>
                        </div>

                        {/* Analytics Content */}
                        <div className="pt-4">
                            {analyticsView === 'monthly' && (
                                <div>
                                    <div className="flex justify-between items-end mb-3">
                                        <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                                            Events Distribution (Past 6 Months)
                                        </p>
                                        <span className="text-[10px] font-mono text-neutral-400">
                                            {currentYear}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-6 gap-2 pt-2 items-end h-28">
                                        {monthlyTrends.map((m, idx) => (
                                            <div key={idx} className="flex flex-col items-center h-full justify-end group">
                                                <span className="text-[11px] font-bold text-black dark:text-white mb-1 group-hover:text-orange-600 transition-colors">
                                                    {m.count}
                                                </span>
                                                <div className="w-full max-w-[36px] bg-neutral-100 dark:bg-zinc-900 rounded-t-md relative overflow-hidden flex items-end h-16">
                                                    <div 
                                                        className="w-full bg-neutral-900 dark:bg-white group-hover:bg-orange-600 dark:group-hover:bg-orange-500 transition-all rounded-t-md"
                                                        style={{ height: `${m.percent}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mt-2 truncate">
                                                    {m.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analyticsView === 'yearly' && (
                                <div>
                                    <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 mb-3">
                                        Year-over-Year Total Events
                                    </p>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                                        {(stats?.yearWiseEvents || []).map(y => (
                                            <div key={y._id} className="p-3 bg-neutral-50 dark:bg-zinc-900/80 border border-neutral-200/60 dark:border-zinc-800 rounded-xl text-center">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block">
                                                    {y._id}
                                                </span>
                                                <span className="text-xl font-black text-black dark:text-white mt-0.5 block">
                                                    {y.count}
                                                </span>
                                                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 block mt-0.5">
                                                    events organized
                                                </span>
                                            </div>
                                        ))}
                                        {(!stats?.yearWiseEvents || stats.yearWiseEvents.length === 0) && (
                                            <div className="col-span-full py-6 text-center text-xs text-neutral-400">
                                                No yearly historical data available.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compact Top Organizers Row */}
                    <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-zinc-800/80">
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2.5">
                            Most Active Clubs & Organizers
                        </p>
                        <div className="space-y-2">
                            {topClubs.map((club, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-xs">
                                    <span className="w-24 sm:w-28 font-semibold truncate text-neutral-800 dark:text-neutral-200 shrink-0" title={club.name}>
                                        {club.name}
                                    </span>
                                    <div className="flex-1 bg-neutral-100 dark:bg-zinc-900 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-orange-500 h-full rounded-full transition-all" 
                                            style={{ width: `${club.percent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                                        <span className="font-bold text-neutral-900 dark:text-neutral-100">{club.events} events</span>
                                        <span className="text-neutral-400 text-[10px]">({club.registrations} reg)</span>
                                    </div>
                                </div>
                            ))}
                            {topClubs.length === 0 && (
                                <p className="text-xs text-neutral-400">No active club events found.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 bg-white dark:bg-[#0c0c0c] border border-neutral-200/90 dark:border-zinc-800/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-zinc-800/80">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-red-500/10 text-red-600 dark:text-red-500 flex items-center justify-center">
                                    <AlertCircle size={14} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                                    Attention Required
                                </h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-400">
                                {attentionItems.length} {attentionItems.length === 1 ? 'item' : 'items'}
                            </span>
                        </div>

                        <div className="pt-3 space-y-2.5">
                            {attentionItems.map((item) => {
                                const ItemIcon = item.icon || AlertCircle;
                                return (
                                    <a
                                        key={item.id}
                                        href={item.link}
                                        className="block p-3 rounded-xl bg-neutral-50/80 dark:bg-zinc-900/60 border border-neutral-200/60 dark:border-zinc-800/60 hover:border-neutral-300 dark:hover:border-zinc-700 transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded border ${item.badgeColor}`}>
                                                        {item.badge}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-neutral-400 truncate">
                                                        {item.club}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                                    {item.title}
                                                </p>
                                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                    {item.detail}
                                                </p>
                                            </div>
                                            <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0 mt-2" />
                                        </div>
                                    </a>
                                );
                            })}

                            {attentionItems.length === 0 && (
                                <div className="py-8 px-4 text-center rounded-xl bg-neutral-50/50 dark:bg-zinc-900/30 border border-dashed border-neutral-200 dark:border-zinc-800 space-y-2">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                        <CheckCircle2 size={16} strokeWidth={2.2} />
                                    </div>
                                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                        All Systems Operational
                                    </p>
                                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-xs mx-auto">
                                        No pending payouts, low registration alerts, or imminent event start deadlocks.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
                        <Sparkles size={13} className="text-orange-500 shrink-0" />
                        <span className="truncate">Alerts update dynamically with registration deadlines & start times.</span>
                    </div>
                </div>

            </div>

            <div className="pt-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-black dark:text-white">
                            All Campus Events
                        </h2>
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                            Search, filter, and review details across all event registrations
                        </p>
                    </div>
                </div>

                <EventDataTable
                    events={events}
                    clubHeads={clubHeads}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filters={filters}
                    setFilters={setFilters}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    onDownloadCSV={onDownloadCSV}
                />
            </div>
        </div>
    );
};

export default OverviewTab;

