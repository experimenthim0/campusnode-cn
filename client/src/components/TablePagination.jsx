import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable, clean, modern table pagination bar.
 * Inspired by industry standards: sleek, minimal, not overloaded.
 * 
 * Props:
 * - currentPage: current active page (1-indexed)
 * - totalItems: total count of filtered/available items
 * - pageSize: number of items per page
 * - onPageChange: (newPage: number) => void
 * - onPageSizeChange: (newPageSize: number) => void (optional)
 * - pageSizeOptions: number[] (default: [10, 25, 50, 100])
 * - itemName: label for items (e.g. "events", "transactions", "registrations")
 * - className: custom wrapper classes
 */
const TablePagination = ({
    currentPage = 1,
    totalItems = 0,
    pageSize = 50,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    itemName = 'items',
    className = ''
}) => {
    if (totalItems <= 0) return null;

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startRecord = (safePage - 1) * pageSize + 1;
    const endRecord = Math.min(safePage * pageSize, totalItems);

    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (safePage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (safePage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
    }, [safePage, totalPages]);

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-cn-surface border border-cn-border rounded-2xl shadow-xs text-xs text-neutral-500 dark:text-neutral-400 select-none ${className}`}>
            {/* Left: Summary text */}
            <div className="font-medium">
                Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100">{startRecord}</span> to{' '}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{endRecord}</span> of{' '}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{totalItems.toLocaleString()}</span> {itemName}
            </div>

            {/* Right: Page controls and per-page selector */}
            <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end">
                {/* Per-page selector */}
                {onPageSizeChange && (
                    <div className="relative inline-flex items-center">
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                onPageSizeChange(Number(e.target.value));
                                if (onPageChange) onPageChange(1);
                            }}
                            className="h-8 pl-2.5 pr-6 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer hover:border-neutral-300 dark:hover:border-zinc-700 transition-colors appearance-none"
                            title="Rows per page"
                        >
                            {pageSizeOptions.map(opt => (
                                <option key={opt} value={opt} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                                    {opt} / page
                                </option>
                            ))}
                        </select>
                        <span className="pointer-events-none absolute right-2 text-neutral-400 text-[9px]">▼</span>
                    </div>
                )}

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                    {/* Previous Button */}
                    <button
                        type="button"
                        onClick={() => onPageChange(Math.max(1, safePage - 1))}
                        disabled={safePage <= 1}
                        className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={14} />
                    </button>

                    {/* Number buttons */}
                    {pageNumbers.map((p, idx) => (
                        p === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-1 text-neutral-400 text-xs select-none">
                                …
                            </span>
                        ) : (
                            <button
                                key={p}
                                type="button"
                                onClick={() => onPageChange(p)}
                                className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                    safePage === p
                                        ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                                        : "border-neutral-200 dark:border-zinc-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800"
                                }`}
                                title={`Page ${p}`}
                            >
                                {p}
                            </button>
                        )
                    ))}

                    {/* Next Button */}
                    <button
                        type="button"
                        onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                        disabled={safePage >= totalPages}
                        className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-zinc-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                        aria-label="Next page"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TablePagination;
