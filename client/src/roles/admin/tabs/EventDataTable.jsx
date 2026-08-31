import React, { useMemo } from 'react';
import { Search, X, RotateCcw, Download, ExternalLink } from 'lucide-react';
import { DataTable, Th, Td, TypeBadge, EntryBadge, FilterSelect } from '../components/AdminUI';

const EventDataTable = ({
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
    const filteredEventList = useMemo(() => {
        return (events || []).filter(e => {
            const title = e.eventName || e.title || '';
            const club = (e.clubName && e.clubName !== 'Unknown' && e.clubName !== 'Unknown Club')
                ? e.clubName
                : (e.club?.clubName || 'ODSW');
            
            const matchesSearch = !searchQuery || 
                title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                club.toLowerCase().includes(searchQuery.toLowerCase());
            
            const isPaid = (e.entryFee > 0) || (e.eventType === 'Paid');
            const matchesType = !typeFilter || typeFilter === 'all' || 
                (typeFilter === 'paid' && isPaid) || 
                (typeFilter === 'free' && !isPaid);

            let matchesClub = true;
            if (filters?.clubId && filters.clubId !== 'all') {
                if (filters.clubId === 'ODSW' || filters.clubId === 'CENTRAL' || filters.clubId === 'central') {
                    matchesClub = e.organizerType === 'CENTRAL' || !!e.isCentral || !e.clubId || club.toLowerCase().includes('odsw');
                } else {
                    const targetClub = clubHeads.find(c => (c._id || c.id) === filters.clubId);
                    const targetName = targetClub?.clubName?.toLowerCase();
                    matchesClub = e.clubId === filters.clubId || 
                                  e.club?.id === filters.clubId || 
                                  e.creatorId === filters.clubId ||
                                  e.clubHeadId === filters.clubId ||
                                  (targetName && club.toLowerCase() === targetName);
                }
            }

            // Date parsing
            const dateObj = new Date(e.eventDate || e.startTime);
            const isValidDate = !isNaN(dateObj.getTime());

            let matchesMonth = true;
            if (filters?.month && filters.month !== 'all') {
                matchesMonth = isValidDate && (dateObj.getMonth() + 1 === parseInt(filters.month, 10));
            }

            let matchesYear = true;
            if (filters?.year && filters.year !== 'all') {
                matchesYear = isValidDate && (dateObj.getFullYear().toString() === filters.year.toString());
            }

            return matchesSearch && matchesType && matchesClub && matchesMonth && matchesYear;
        });
    }, [events, searchQuery, typeFilter, filters, clubHeads]);

    const isAnyFilterActive = Boolean(
        searchQuery || 
        (filters?.clubId && filters.clubId !== 'all') || 
        (filters?.month && filters.month !== 'all') || 
        (filters?.year && filters.year !== 'all') || 
        (typeFilter && typeFilter !== 'all')
    );

    const handleResetFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
        setFilters({ month: 'all', year: 'all', clubId: 'all' });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return { date: 'N/A', time: '' };
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: 'N/A', time: '' };
        
        const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return { date, time };
    };

    const handleCSVExport = () => {
        if (onDownloadCSV) {
            onDownloadCSV(filteredEventList);
            return;
        }
        if (!filteredEventList.length) return;
        const headers = ['Event Name', 'Organising Club', 'Date', 'Time', 'Registrations', 'Entry Type', 'Event Type', 'Fee (₹)', 'Total Amount Received (₹)'];
        const rows = filteredEventList.map(e => {
            const club = (e.clubName && e.clubName !== 'Unknown' && e.clubName !== 'Unknown Club')
                ? e.clubName
                : (e.club?.clubName || 'ODSW');
            const { date, time } = formatDateTime(e.eventDate || e.startTime);
            const regCount = e.registrationType === 'none' ? 0 : (e.totalRegistrations ?? e.registeredCount ?? e.regCount ?? 0);
            const entryType = e.registrationType === 'none' ? 'Open Entry' : 'Registration Required';
            const eventType = (e.entryFee > 0 || e.eventType === 'Paid') ? 'Paid' : 'Free';
            const fee = e.entryFee || 0;
            const collected = e.totalAmountReceived || e.totalCollected || 0;

            return [
                `"${(e.eventName || e.title || '').replace(/"/g, '""')}"`,
                `"${club.replace(/"/g, '""')}"`,
                `"${date}"`,
                `"${time}"`,
                regCount,
                `"${entryType}"`,
                `"${eventType}"`,
                fee,
                collected,
            ];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campusnode_events_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-[#0c0c0c] p-3.5 sm:p-4 border border-neutral-200/90 dark:border-zinc-800/90 rounded-2xl shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Search by event or club..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-8 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200/90 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500 transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer">
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        <FilterSelect 
                            value={filters?.clubId || 'all'} 
                            onChange={(val) => setFilters(prev => ({ ...prev, clubId: val }))}
                        >
                            <option value="all">All Clubs</option>
                            <option value="ODSW">ODSW (Central Events)</option>
                            {clubHeads.map(c => (
                                <option key={c._id || c.id} value={c._id || c.id}>{c.clubName}</option>
                            ))}
                        </FilterSelect>

                        <FilterSelect 
                            value={typeFilter || 'all'} 
                            onChange={(val) => setTypeFilter(val)}
                        >
                            <option value="all">All Pricing</option>
                            <option value="free">Free Events</option>
                            <option value="paid">Paid Events</option>
                        </FilterSelect>

                        <FilterSelect 
                            value={filters?.month || 'all'} 
                            onChange={(val) => setFilters(prev => ({ ...prev, month: val }))}
                        >
                            <option value="all">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={String(i + 1)}>
                                    {new Date(2026, i, 1).toLocaleString('default', { month: 'short' })}
                                </option>
                            ))}
                        </FilterSelect>

                        <FilterSelect 
                            value={filters?.year || 'all'} 
                            onChange={(val) => setFilters(prev => ({ ...prev, year: val }))}
                        >
                            <option value="all">All Years</option>
                            {['2024', '2025', '2026', '2027'].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </FilterSelect>

                        {isAnyFilterActive && (
                            <button
                                onClick={handleResetFilters}
                                className="h-9 px-2.5 rounded-xl border border-neutral-200 dark:border-zinc-800 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 text-[11px] font-bold tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                title="Reset all filters"
                            >
                                <RotateCcw size={12} />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100 dark:border-zinc-800/80 shrink-0">
                        <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                            Showing <strong className="text-black dark:text-white">{filteredEventList.length}</strong> of {events.length}
                        </span>

                        <button
                            onClick={handleCSVExport}
                            disabled={!filteredEventList.length}
                            className="h-9 px-3 bg-neutral-100 dark:bg-zinc-800/90 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 hover:text-black dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-200/60 dark:border-zinc-700/60 shrink-0"
                            title="Export filtered events to CSV"
                        >
                            <Download size={13} strokeWidth={2.2} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            <DataTable>
                <thead>
                    <tr>
                        <Th className="w-12 text-center">#</Th>
                        <Th>Event Name</Th>
                        <Th>Date & Time</Th>
                        <Th>Organizing Club</Th>
                        <Th className="text-right">Registrations</Th>
                        <Th>Entry Type</Th>
                        <Th>Fee / Type</Th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/50">
                    {filteredEventList.map((item, idx) => {
                        const eventId = item.id || item.eventId;
                        const eventSlug = item.slug || eventId;
                        const eventUrl = `/event/${eventSlug}`;
                        const eventTitle = item.eventName || item.title || 'Untitled Event';
                        const clubName = (item.clubName && item.clubName !== 'Unknown' && item.clubName !== 'Unknown Club')
                            ? item.clubName
                            : (item.club?.clubName || 'ODSW');
                        const isCentral = clubName === 'ODSW' || item.organizerType === 'CENTRAL' || !!item.isCentral;
                        const regCount = item.registrationType === 'none' 
                            ? 0 
                            : (item.totalRegistrations ?? item.registeredCount ?? item.regCount ?? 0);
                        const isPaid = item.eventType === 'Paid' || (item.entryFee && item.entryFee > 0);
                        const fee = item.entryFee || 0;
                        const { date, time } = formatDateTime(item.eventDate || item.startTime);

                        return (
                            <tr key={idx} className="hover:bg-neutral-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                                <Td className="text-center text-neutral-400 dark:text-neutral-500 font-mono text-xs">
                                    {idx + 1}
                                </Td>
                                <Td>
                                    <a
                                        href={eventUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-black dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 group max-w-xs md:max-w-md truncate"
                                        title={eventTitle}
                                    >
                                        <span className="truncate group-hover:underline">{eventTitle}</span>
                                        <ExternalLink size={12} className="text-neutral-300 dark:text-neutral-600 group-hover:text-orange-600 dark:group-hover:text-orange-400 shrink-0 transition-colors opacity-0 group-hover:opacity-100" />
                                    </a>
                                </Td>
                                <Td>
                                    <div className="flex flex-col leading-tight">
                                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                                            {date}
                                        </span>
                                        {time && (
                                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                                                {time}
                                            </span>
                                        )}
                                    </div>
                                </Td>
                                <Td>
                                    <span 
                                        className={`font-semibold text-xs ${
                                            isCentral ? "text-orange-600 dark:text-orange-400 font-bold" : "text-neutral-800 dark:text-neutral-200"
                                        }`}
                                        title={isCentral ? 'Office of DSW (Central)' : clubName}
                                    >
                                        {clubName}
                                    </span>
                                </Td>
                                <Td className="text-right font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100">
                                    {item.registrationType === 'none' ? (
                                        <span className="text-neutral-400 font-normal">—</span>
                                    ) : (
                                        regCount
                                    )}
                                </Td>
                                <Td>
                                    <EntryBadge registrationType={item.registrationType} />
                                </Td>
                                <Td>
                                    <TypeBadge isPaid={isPaid} fee={fee} />
                                </Td>
                            </tr>
                        );
                    })}
                    {filteredEventList.length === 0 && (
                        <tr>
                            <td colSpan="7" className="px-5 py-16 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                                <div className="max-w-xs mx-auto space-y-2">
                                    <p className="font-semibold text-neutral-700 dark:text-neutral-300">No events matched your criteria</p>
                                    <p className="text-[11px]">Try adjusting your search query, club filter, or date range.</p>
                                    {isAnyFilterActive && (
                                        <button
                                            onClick={handleResetFilters}
                                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                                        >
                                            <RotateCcw size={11} />
                                            Reset all filters
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </DataTable>
        </div>
    );
};

export default EventDataTable;

