import React from 'react';
import { Search, X, ExternalLink } from 'lucide-react';
import { DataTable, Th, Td, TypeBadge, FilterSelect } from '../components/AdminUI';

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
    /* Filter Event List */
    const filteredEventList = events.filter(e => {
        const title = e.eventName || e.title || '';
        const club = (e.clubName && e.clubName !== 'Unknown' && e.clubName !== 'Unknown Club')
            ? e.clubName
            : (e.club?.clubName || 'ODSW');
        const matchesSearch = !searchQuery || 
            title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            club.toLowerCase().includes(searchQuery.toLowerCase());
        
        const isPaid = (e.entryFee > 0) || (e.eventType === 'Paid');
        const matchesType = typeFilter === 'all' || 
            (typeFilter === 'paid' && isPaid) || 
            (typeFilter === 'free' && !isPaid);

        return matchesSearch && matchesType;
    });

    const handleCSVExport = () => {
        if (onDownloadCSV) {
            onDownloadCSV(filteredEventList);
            return;
        }
        if (!filteredEventList.length) return;
        const headers = ['Event Name', 'Organising Club', 'Total Registrations', 'Event Type', 'Event Date', 'Total Amount Received (₹)'];
        const rows = filteredEventList.map(e => {
            const club = (e.clubName && e.clubName !== 'Unknown' && e.clubName !== 'Unknown Club')
                ? e.clubName
                : (e.club?.clubName || 'ODSW');
            return [
                `"${e.eventName || e.title || ''}"`,
                `"${club}"`,
                e.registrationType === 'none' ? 'Open Entry (No Reg)' : (e.totalRegistrations ?? e.registeredCount ?? e.regCount ?? 0),
                e.eventType || (e.entryFee > 0 ? 'Paid' : 'Free'),
                new Date(e.eventDate || e.startTime).toLocaleDateString(),
                e.totalAmountReceived || e.totalCollected || 0,
            ];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `event_data_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Filter Controls Toolbar */}
            <div className="bg-neutral-50/80 dark:bg-neutral-900/50 p-4 border border-neutral-200 dark:border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search by event name or club..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500 transition-colors"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Club Filter */}
                    <FilterSelect value={filters.clubId} onChange={(val) => setFilters(prev => ({ ...prev, clubId: val }))}>
                        <option value="all">All Clubs</option>
                        <option value="ODSW">ODSW (Central Events)</option>
                        {clubHeads.map(c => (
                            <option key={c._id || c.id} value={c._id || c.id}>{c.clubName}</option>
                        ))}
                    </FilterSelect>

                    {/* Type Filter */}
                    <FilterSelect value={typeFilter} onChange={(val) => setTypeFilter(val)}>
                        <option value="all">All Types (Paid & Free)</option>
                        <option value="paid">Paid Events</option>
                        <option value="free">Free Events</option>
                    </FilterSelect>

                    {/* Month Filter */}
                    <FilterSelect value={filters.month} onChange={(val) => setFilters(prev => ({ ...prev, month: val }))}>
                        <option value="all">All Months</option>
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={String(i + 1)}>
                                {new Date(2026, i, 1).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </FilterSelect>

                    {/* Year Filter */}
                    <FilterSelect value={filters.year} onChange={(val) => setFilters(prev => ({ ...prev, year: val }))}>
                        <option value="all">All Years</option>
                        {['2024', '2025', '2026', '2027'].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </FilterSelect>
                </div>

                {/* Download Button */}
                <button
                    onClick={handleCSVExport}
                    className="px-3.5 py-2 bg-black dark:bg-white text-white dark:text-black text-[11px] font-bold tracking-wide rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                    <i className="ri-download-line text-sm" />
                    Export CSV
                </button>
            </div>

            {/* Event Data Table */}
            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th>S.No</Th>
                        <Th>Name of Event</Th>
                        <Th>Date</Th>
                        <Th>Club Name</Th>
                        <Th>Registration</Th>
                        <Th>Paid or Free</Th>
                    </tr>
                </thead>
                <tbody>
                    {filteredEventList.map((item, idx) => {
                        const eventId = item.id || item.eventId;
                        const eventSlug = item.slug || eventId;
                        const eventUrl = `/event/${eventSlug}`;
                        const eventTitle = item.eventName || item.title || 'Untitled Event';
                        const clubName = (item.clubName && item.clubName !== 'Unknown' && item.clubName !== 'Unknown Club')
                            ? item.clubName
                            : (item.club?.clubName || 'ODSW');
                        const regCount = item.totalRegistrations ?? item.registeredCount ?? item.regCount ?? 0;
                        const isPaid = item.eventType === 'Paid' || (item.entryFee && item.entryFee > 0);
                        const fee = item.entryFee || 0;
                        const dateStr = item.eventDate || item.startTime;

                        return (
                            <tr key={idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <Td className="text-neutral-400 dark:text-neutral-600 font-mono font-medium">{idx + 1}</Td>
                                <Td>
                                    <a
                                        href={eventUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-black dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 group"
                                    >
                                        <span className="group-hover:underline">{eventTitle}</span>
                                        {/* <ExternalLink size={13} className="text-neutral-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 shrink-0 transition-colors" /> */}
                                    </a>
                                </Td>
                                <Td className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                                    {dateStr ? new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                                </Td>
                                <Td className="text-orange-600 dark:text-orange-400 font-semibold" title={clubName === 'ODSW' ? 'Office of DSW' : clubName}>{clubName}</Td>
                                <Td className="font-semibold text-black dark:text-white">
                                    {item.registrationType === 'none' ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                                            Open Entry (No Reg.)
                                        </span>
                                    ) : (
                                        `${regCount} students`
                                    )}
                                </Td>
                                <Td>
                                    <TypeBadge isPaid={isPaid} fee={fee} />
                                </Td>
                            </tr>
                        );
                    })}
                    {filteredEventList.length === 0 && (
                        <tr>
                            <td colSpan="6" className="px-5 py-16 text-center text-neutral-400 text-sm">
                                No events found matching your search and filter criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </DataTable>
        </div>
    );
};

export default EventDataTable;
