import React, { useState, useMemo } from 'react';
import { Search, X, IndianRupee, Calendar, Users, Wallet, ArrowUpDown } from 'lucide-react';
import { StatCard, DataTable, Th, Td, FilterSelect, TablePagination } from '../components/AdminUI';

const PaymentsOverviewTab = ({
    eventStats = [],
    allEvents = [],
    totalRevenue
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('paid'); // 'paid' | 'with_collections' | 'all'
    const [sortBy, setSortBy] = useState('collected_desc'); // 'collected_desc' | 'collected_asc' | 'regs_desc' | 'fee_desc' | 'date_desc'
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Normalize raw events from either stats.eventStats or allEvents
    const normalizedEvents = useMemo(() => {
        const source = (eventStats && eventStats.length > 0) ? eventStats : allEvents;
        if (!Array.isArray(source)) return [];

        return source.map((item) => {
            const title = item.title || item.eventName || 'Untitled Event';
            const rawClub = (item.clubName && item.clubName !== 'Unknown' && item.clubName !== 'Unknown Club')
                ? item.clubName
                : (item.club?.clubName || 'ODSW');
            const clubName = rawClub === 'ODSW' ? 'ODSW' : rawClub;
            const fee = Number(item.entryFee ?? item.registrationFee ?? 0);
            const regCount = Number(item.regCount ?? item.registeredCount ?? item.totalRegistrations ?? 0);
            const collected = Number(item.totalCollected ?? item.totalAmountReceived ?? 0);
            const eventDate = item.startTime || item.eventDate || item.createdAt;

            return {
                id: item.eventId || item.id || title,
                title,
                clubName,
                fee,
                regCount,
                collected,
                eventDate,
                registrationType: item.registrationType || 'individual',
            };
        });
    }, [eventStats, allEvents]);

    // High level summary metrics across all events
    const summary = useMemo(() => {
        const paidEvents = normalizedEvents.filter(e => e.fee > 0);
        const totalCollected = normalizedEvents.reduce((acc, curr) => acc + curr.collected, 0);
        const resolvedTotalRevenue = totalRevenue !== undefined ? totalRevenue : totalCollected;
        const totalPaidRegistrations = paidEvents.reduce((acc, curr) => acc + curr.regCount, 0);
        const avgPerEvent = paidEvents.length > 0 ? Math.round(resolvedTotalRevenue / paidEvents.length) : 0;

        return {
            totalRevenue: resolvedTotalRevenue,
            paidEventsCount: paidEvents.length,
            totalPaidRegistrations,
            avgPerEvent,
        };
    }, [normalizedEvents, totalRevenue]);

    // Filter and search
    const filteredEvents = useMemo(() => {
        return normalizedEvents.filter((event) => {
            // Filter by pricing / collections
            if (filterType === 'paid' && event.fee <= 0) return false;
            if (filterType === 'with_collections' && event.collected <= 0) return false;

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesTitle = event.title.toLowerCase().includes(q);
                const matchesClub = event.clubName.toLowerCase().includes(q);
                if (!matchesTitle && !matchesClub) return false;
            }

            return true;
        });
    }, [normalizedEvents, filterType, searchQuery]);

    // Sorting
    const sortedEvents = useMemo(() => {
        const list = [...filteredEvents];
        switch (sortBy) {
            case 'collected_desc':
                return list.sort((a, b) => b.collected - a.collected);
            case 'collected_asc':
                return list.sort((a, b) => a.collected - b.collected);
            case 'regs_desc':
                return list.sort((a, b) => b.regCount - a.regCount);
            case 'fee_desc':
                return list.sort((a, b) => b.fee - a.fee);
            case 'date_desc':
                return list.sort((a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0));
            default:
                return list;
        }
    }, [filteredEvents, sortBy]);

    // Pagination
    const totalItems = sortedEvents.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             
                <StatCard
                    label="Paid Events"
                    value={summary.paidEventsCount}
                    subtext="Events with a registration fee"
                    icon={Calendar}
                />
                <StatCard
                    label="Total Registrations"
                    value={summary.totalPaidRegistrations.toLocaleString('en-IN')}
                    subtext="Participants in paid events"
                    icon={Users}
                />
              
            </div>

            {/* Filter, Search & Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50/80 dark:bg-neutral-900/50 p-3.5 border border-cn-border rounded-2xl">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
                    {/* Search by Event Title or Club */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search event title or club name..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-8 py-2 bg-cn-surface border border-cn-border rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-brand-500 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setCurrentPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white"
                                title="Clear search"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Filter Type */}
                    <FilterSelect
                        value={filterType}
                        onChange={(val) => {
                            setFilterType(val);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="paid">Paid Events Only</option>
                        <option value="with_collections">Events With Collections (₹ &gt; 0)</option>
                        <option value="all">All Events (Paid & Free)</option>
                    </FilterSelect>

                    {/* Sort Options */}
                    <FilterSelect
                        value={sortBy}
                        onChange={(val) => setSortBy(val)}
                    >
                        <option value="collected_desc">Highest Collection First</option>
                        <option value="collected_asc">Lowest Collection First</option>
                        <option value="regs_desc">Most Registrations</option>
                        <option value="fee_desc">Highest Registration Fee</option>
                        <option value="date_desc">Newest Events</option>
                    </FilterSelect>
                </div>

                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium px-2 shrink-0">
                    {totalItems} {totalItems === 1 ? 'event' : 'events'}
                </span>
            </div>

            {/* Event Collection Overview Table */}
            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th className="w-12">#</Th>
                        <Th>Club Name</Th>
                        <Th>Event Title</Th>
                        <Th align="center">Registration Fee</Th>
                        <Th align="center">Total Registration</Th>
                        <Th align="right">Total Collected Amount</Th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedEvents.map((item, idx) => {
                        const displayClubName = item.clubName === 'ODSW' ? 'Office of DSW' : item.clubName;
                        const isPaid = item.fee > 0;

                        return (
                            <tr
                                key={item.id || idx}
                                className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                            >
                                {/* # Index */}
                                <Td className="text-neutral-400 dark:text-neutral-600 text-xs w-12 font-mono">
                                    {startIndex + idx + 1}
                                </Td>

                                {/* Club Name */}
                                <Td className="font-semibold text-black dark:text-white" title={displayClubName}>
                                    <span className="truncate max-w-[200px] block">
                                        {displayClubName}
                                    </span>
                                </Td>

                                {/* Event Title */}
                                <Td>
                                    <div className="space-y-0.5">
                                        <p className="font-semibold text-black dark:text-white text-sm">
                                            {item.title}
                                        </p>
                                        {item.eventDate && (
                                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                                {new Date(item.eventDate).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </Td>

                                {/* Registration Fee */}
                                <Td align="center">
                                    {isPaid ? (
                                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            ₹{item.fee}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-zinc-700">
                                            Free
                                        </span>
                                    )}
                                </Td>

                                {/* Total Registration */}
                                <Td align="center">
                                    <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                                        {item.regCount.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 ml-1">
                                        {item.regCount === 1 ? 'student' : 'students'}
                                    </span>
                                </Td>

                                {/* Total Collected Amount */}
                                <Td align="right">
                                    <div className="flex flex-col items-end">
                                        <span className={`font-mono font-black text-base ${
                                            item.collected > 0
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-neutral-400 dark:text-neutral-500'
                                        }`}>
                                            ₹{item.collected.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </Td>
                            </tr>
                        );
                    })}

                    {paginatedEvents.length === 0 && (
                        <tr>
                            <td colSpan="6" className="px-5 py-16 text-center text-neutral-400 dark:text-neutral-500 text-sm">
                                <div className="max-w-xs mx-auto space-y-2">
                                    <Wallet size={28} className="mx-auto text-neutral-300 dark:text-neutral-700" />
                                    <p className="font-semibold text-neutral-600 dark:text-neutral-300">
                                        No event collections found
                                    </p>
                                    <p className="text-xs text-neutral-400">
                                        {searchQuery
                                            ? `No events matching "${searchQuery}".`
                                            : 'No events meet the current filter criteria.'}
                                    </p>
                                    {(searchQuery || filterType !== 'paid') && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setFilterType('paid');
                                                setCurrentPage(1);
                                            }}
                                            className="mt-3 px-3 py-1.5 text-xs font-semibold bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 rounded-lg text-black dark:text-white transition-colors"
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </DataTable>

            {/* Pagination Controls */}
            {totalItems > pageSize && (
                <TablePagination
                    currentPage={safePage}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    itemName="events"
                />
            )}
        </div>
    );
};

export default PaymentsOverviewTab;
