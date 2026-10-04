import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    X,
    Filter,
    Download,
    User,
    Mail,
    Phone,
    GraduationCap,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Copy,
    Check,
    Calendar,
    Award,
    Users,
    ShieldCheck,
    Eye,
    RefreshCw,
    Building2,
    Globe,
    Github,
    Linkedin,
    BadgeAlert,
    ChevronRight,
    Sparkles,
    RotateCcw
} from 'lucide-react';
import { DataTable, Th, Td, FilterSelect, Modal } from '../components/AdminUI';
import TablePagination from '../../../components/TablePagination';
import { getAdminStudents, getAdminStudentDetails, toggleStudentVerification } from '../../../services/adminService';
import { useNotification } from '../../../context/NotificationContext';
import {
    PROGRAM_OPTIONS,
    PROGRAM_LABELS,
    ALL_BRANCH_CODES,
} from '../../../constants/academicConstants';

const ALL_GRAD_YEARS = [2024, 2025, 2026, 2027, 2028, 2029];

export default function StudentsTab() {
    const { showNotification } = useNotification();

    // Query states
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('all');
    const [programFilter, setProgramFilter] = useState('all');
    const [gradYearFilter, setGradYearFilter] = useState('all');
    const [verifiedFilter, setVerifiedFilter] = useState('all');
    const [clubRoleFilter, setClubRoleFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Search activation state: students are only loaded when search is performed
    const [hasSearched, setHasSearched] = useState(false);

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);

    // Data states
    const [students, setStudents] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
    const [filterOptions, setFilterOptions] = useState({ branches: [], programs: [], graduationYears: [] });
    const [loading, setLoading] = useState(false);

    // Detail modal states
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState('overview');

    // Copy indicator state
    const [copiedField, setCopiedField] = useState(null);

    // Load filter dropdown metadata on mount without querying student rows
    useEffect(() => {
        let isMounted = true;
        const loadFilterMetadata = async () => {
            try {
                const res = await getAdminStudents({ metaOnly: 'true' });
                if (isMounted && res.data?.success && res.data.filterOptions) {
                    setFilterOptions(res.data.filterOptions);
                }
            } catch (err) {
                console.error('Failed to load filter metadata:', err);
            }
        };
        loadFilterMetadata();
        return () => { isMounted = false; };
    }, []);

    // Short branch codes strictly taken from academicConstants.js only
    const availableBranchCodes = ALL_BRANCH_CODES;

    const availableYears = Array.from(
        new Set([...ALL_GRAD_YEARS, ...(filterOptions.graduationYears || []).map(Number)])
    ).filter(Boolean).sort((a, b) => b - a);

    // Execute student search (queries the database with applied criteria)
    const executeSearch = useCallback(async (pageToFetch = 1, currentLimit = limit) => {
        const queryTerm = search.trim();
        const hasCriteria = Boolean(
            queryTerm ||
            branchFilter !== 'all' ||
            programFilter !== 'all' ||
            gradYearFilter !== 'all' ||
            verifiedFilter !== 'all' ||
            clubRoleFilter !== 'all'
        );

        if (!hasCriteria) {
            showNotification('Please enter a search term or select a branch/year to search.', 'warning');
            return;
        }

        setLoading(true);
        setHasSearched(true);
        setPage(pageToFetch);

        try {
            const params = {
                page: pageToFetch,
                limit: currentLimit,
                search: queryTerm || undefined,
                branch: branchFilter !== 'all' ? branchFilter : undefined,
                program: programFilter !== 'all' ? programFilter : undefined,
                gradYear: gradYearFilter !== 'all' ? gradYearFilter : undefined,
                verified: verifiedFilter !== 'all' ? verifiedFilter : undefined,
                clubRole: clubRoleFilter !== 'all' ? clubRoleFilter : undefined,
                sortBy,
                sortOrder,
            };

            const res = await getAdminStudents(params);
            if (res.data?.success) {
                setStudents(res.data.students || []);
                setPagination(res.data.pagination || { total: 0, page: pageToFetch, limit: currentLimit, totalPages: 1 });
                if (res.data.filterOptions) {
                    setFilterOptions(res.data.filterOptions);
                }
            }
        } catch (err) {
            console.error('Failed to search students:', err);
            showNotification('Failed to search student directory records', 'error');
        } finally {
            setLoading(false);
        }
    }, [search, branchFilter, programFilter, gradYearFilter, verifiedFilter, clubRoleFilter, sortBy, sortOrder, limit, showNotification]);

    // Handle form submit on search input
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        executeSearch(1);
    };

    // Quick filter shortcut handler (e.g. click a branch or batch year pill)
    const handleQuickFilter = (type, value) => {
        let newBranch = branchFilter;
        let newYear = gradYearFilter;

        if (type === 'branch') {
            newBranch = value;
            setBranchFilter(value);
        } else if (type === 'year') {
            newYear = String(value);
            setGradYearFilter(String(value));
        }

        // Set search state and trigger query
        setHasSearched(true);
        setLoading(true);
        setPage(1);

        const params = {
            page: 1,
            limit,
            search: search.trim() || undefined,
            branch: newBranch !== 'all' ? newBranch : undefined,
            gradYear: newYear !== 'all' ? newYear : undefined,
            program: programFilter !== 'all' ? programFilter : undefined,
            verified: verifiedFilter !== 'all' ? verifiedFilter : undefined,
            clubRole: clubRoleFilter !== 'all' ? clubRoleFilter : undefined,
            sortBy,
            sortOrder,
        };

        getAdminStudents(params)
            .then(res => {
                if (res.data?.success) {
                    setStudents(res.data.students || []);
                    setPagination(res.data.pagination || { total: 0, page: 1, limit, totalPages: 1 });
                }
            })
            .catch(err => {
                console.error('Failed to search students:', err);
                showNotification('Failed to search student records', 'error');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // Reset all filters and return to initial pre-search state
    const handleResetSearch = () => {
        setSearch('');
        setBranchFilter('all');
        setProgramFilter('all');
        setGradYearFilter('all');
        setVerifiedFilter('all');
        setClubRoleFilter('all');
        setSortBy('createdAt');
        setSortOrder('desc');
        setPage(1);
        setStudents([]);
        setHasSearched(false);
    };

    // Fetch detailed profile for inspection modal
    const handleOpenStudentDetail = async (id) => {
        setSelectedStudentId(id);
        setStudentDetail(null);
        setDetailLoading(true);
        setActiveDetailTab('overview');

        try {
            const res = await getAdminStudentDetails(id);
            if (res.data?.success) {
                setStudentDetail(res.data.student);
            } else {
                showNotification('Could not load student profile', 'error');
            }
        } catch (err) {
            console.error('Error fetching student details:', err);
            showNotification(err.response?.data?.message || 'Error loading student profile details', 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    // Toggle verification handler
    const handleToggleVerification = async (id) => {
        try {
            const res = await toggleStudentVerification(id);
            if (res.data?.success) {
                const newStatus = res.data.isVerified;
                setStudents(prev => prev.map(s => s.id === id ? { ...s, isVerified: newStatus } : s));
                if (studentDetail && studentDetail.id === id) {
                    setStudentDetail(prev => ({ ...prev, isVerified: newStatus }));
                }
                showNotification(`Student ${newStatus ? 'marked as Verified' : 'unverified'}`, 'success');
            }
        } catch (err) {
            console.error('Failed to toggle verification:', err);
            showNotification('Failed to update verification status', 'error');
        }
    };

    // Copy to clipboard helper
    const handleCopy = (text, fieldKey) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Export current search results to CSV
    const handleExportCSV = () => {
        if (students.length === 0) {
            showNotification('No search results to export', 'error');
            return;
        }

        const headers = [
            'Roll Number',
            'Full Name',
            'Email',
            'Phone',
            'Program',
            'Branch',
            'Graduation Year',
            'Academic Year',
            'Semester',
            'Verified',
            'Club Roles',
            'Events Participated',
            'Certificates Earned',
            'Registered At'
        ];

        const rows = students.map(s => [
            `"${s.rollNo || ''}"`,
            `"${(s.name || '').replace(/"/g, '""')}"`,
            `"${s.email || ''}"`,
            `"${s.phone || ''}"`,
            `"${PROGRAM_LABELS[s.program] || s.program || ''}"`,
            `"${s.branch || ''}"`,
            `"${s.expectedGraduationYear || ''}"`,
            `"${s.academicYearLabel || ''}"`,
            `"${s.semesterLabel || ''}"`,
            s.isVerified ? 'Yes' : 'No',
            `"${(s.memberships || []).map(m => `${m.club?.clubName || 'Club'} (${m.role})`).join('; ')}"`,
            s._count?.participations || 0,
            s._count?.certificates || 0,
            `"${new Date(s.createdAt).toLocaleDateString()}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `campusnode_students_search_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification(`Exported ${students.length} student records to CSV`, 'success');
    };

    // Format active filter badges for results header
    const activeFiltersList = [];
    if (search.trim()) activeFiltersList.push({ label: `Query: "${search.trim()}"`, clear: () => setSearch('') });
    if (branchFilter !== 'all') activeFiltersList.push({ label: `Branch: ${branchFilter}`, clear: () => setBranchFilter('all') });
    if (gradYearFilter !== 'all') activeFiltersList.push({ label: `Graduation Year: ${gradYearFilter}`, clear: () => setGradYearFilter('all') });
    if (programFilter !== 'all') activeFiltersList.push({ label: `Program: ${PROGRAM_LABELS[programFilter] || programFilter}`, clear: () => setProgramFilter('all') });
    if (verifiedFilter !== 'all') activeFiltersList.push({ label: verifiedFilter === 'true' ? 'Verified Only' : 'Unverified Only', clear: () => setVerifiedFilter('all') });
    if (clubRoleFilter !== 'all') activeFiltersList.push({ label: `Role: ${clubRoleFilter}`, clear: () => setClubRoleFilter('all') });

    return (
        <div className="space-y-6">
            {/* 1. Main Search & Filter Console Card */}
            <div className="bg-cn-surface p-5 sm:p-6 border border-cn-border rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-cn-text flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            <span>Student Information Search</span>
                        </h2>
                        <p className="text-xs text-cn-text-muted mt-0.5">
                            Search any student by Name, Roll Number, Email, or filter branch-wise and batch year-wise
                        </p>
                    </div>

                    {hasSearched && (
                        <button
                            onClick={handleResetSearch}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer self-start sm:self-auto rounded-lg hover:bg-cn-surface-muted"
                        >
                            <RotateCcw size={13} />
                            <span>Reset Search</span>
                        </button>
                    )}
                </div>

                {/* Primary Search Input Row */}
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Enter student name, roll number, college email, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-9 py-3 bg-cn-surface-muted/70 hover:bg-cn-surface-muted focus:bg-cn-surface border border-cn-border rounded-xl text-sm font-medium text-cn-text placeholder:text-cn-text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all duration-200"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                title="Clear query"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-brand-600 hover:bg-brand-500 active:scale-[0.99] text-white text-sm font-semibold tracking-wide rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 cursor-pointer disabled:opacity-60 shrink-0"
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                <span>Searching...</span>
                            </>
                        ) : (
                            <>
                                <Search size={16} />
                                <span>Search Students</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Filter Controls Row (Branch Wise, Year Wise, Program Wise) */}
                <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cn-text uppercase tracking-wider shrink-0 mr-1">
                        <Filter size={14} className="text-brand-600 dark:text-brand-400" />
                        <span>Filter By:</span>
                    </div>

                    {/* Branch-Wise Filter (Uses short code only) */}
                    <div className="min-w-[140px] flex-1 sm:flex-initial">
                        <FilterSelect
                            value={branchFilter}
                            onChange={(val) => setBranchFilter(val)}
                            className="w-full"
                        >
                            <option value="all">All Branches</option>
                            {availableBranchCodes.map((code) => (
                                <option key={code} value={code}>
                                    {code}
                                </option>
                            ))}
                        </FilterSelect>
                    </div>

                    {/* Year-Wise / Graduation Year Filter */}
                    <div className="min-w-[170px] flex-1 sm:flex-initial">
                        <FilterSelect
                            value={gradYearFilter}
                            onChange={(val) => setGradYearFilter(val)}
                            className="w-full"
                        >
                            <option value="all">All Graduation Years</option>
                            {availableYears.map((y) => (
                                <option key={y} value={String(y)}>Graduation Year {y}</option>
                            ))}
                        </FilterSelect>
                    </div>

                    {/* Degree Program Filter */}
                    <div className="min-w-[140px] flex-1 sm:flex-initial">
                        <FilterSelect
                            value={programFilter}
                            onChange={(val) => setProgramFilter(val)}
                            className="w-full"
                        >
                            <option value="all">All Programs</option>
                            {PROGRAM_OPTIONS.map((prog) => (
                                <option key={prog} value={prog}>
                                    {PROGRAM_LABELS[prog] || prog}
                                </option>
                            ))}
                        </FilterSelect>
                    </div>


                    {/* Club Leadership Filter */}
                    <div className="min-w-[150px] flex-1 sm:flex-initial">
                        <FilterSelect
                            value={clubRoleFilter}
                            onChange={(val) => setClubRoleFilter(val)}
                            className="w-full"
                        >
                            <option value="all">All Campus Roles</option>
                            <option value="CLUB_HEAD">Club Heads / Leads</option>
                            <option value="COORDINATOR">Coordinators</option>
                            <option value="MEMBER">Club Members</option>
                        </FilterSelect>
                    </div>

                    {/* Sort Order Selector */}
                    <div className="min-w-[180px] flex-1 sm:flex-initial sm:ml-auto">
                        <FilterSelect
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(val) => {
                                const [field, order] = (val || 'createdAt-desc').split('-');
                                setSortBy(field);
                                setSortOrder(order);
                                if (hasSearched) {
                                    setTimeout(() => executeSearch(1), 50);
                                }
                            }}
                            className="w-full"
                        >
                            {/* <option value="createdAt-desc">Sort: Newest First</option>
                            <option value="createdAt-asc">Sort: Oldest First</option> */}
                            <option value="name-desc">Sort: Name (A to Z)</option>
                            <option value="name-asc">Sort: Name (Z to A)</option>
                            <option value="rollNo-asc">Sort: Roll No (Asc)</option>
                            <option value="expectedGraduationYear-asc">Sort: Graduation Year (Asc)</option>
                            <option value="expectedGraduationYear-desc">Sort: Graduation Year (Desc)</option>
                        </FilterSelect>
                    </div>
                </div>
            </div>

            {/* 2. PRE-SEARCH IDLE STATE: Shown BEFORE searching (Prevents loading all students at once) */}
            {!hasSearched && (
                <div className="bg-cn-surface border border-cn-border rounded-2xl p-8 sm:p-12 text-center shadow-2xs space-y-6">
                    <div className="max-w-md mx-auto space-y-3">
                        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-500/20 shadow-xs">
                            <Search size={28} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-lg font-bold text-cn-text">Search for Student Records</h3>
                        <p className="text-xs sm:text-sm text-cn-text-muted leading-relaxed">
                            To protect system performance, student records are not loaded all at once. Use the search box above with a name, roll number, or email, or pick a branch and batch year to display results.
                        </p>
                    </div>

                    {/* Quick Search Shortcut Badges */}
                    <div className="pt-4 border-t border-neutral-100 dark:border-zinc-800/80 max-w-2xl mx-auto space-y-4">
                        {/* Branch Wise Quick Search (Short codes) */}
                        {availableBranchCodes.length > 0 && (
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-cn-text-muted mb-2 text-center">
                                    Quick Search by Branch
                                </p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {availableBranchCodes.slice(0, 10).map((code) => (
                                        <button
                                            key={code}
                                            onClick={() => handleQuickFilter('branch', code)}
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cn-surface-muted hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-cn-text border border-cn-border transition-colors cursor-pointer"
                                        >
                                            {code}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Graduation Year Quick Search */}
                        {availableYears.length > 0 && (
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-cn-text-muted mb-2 text-center">
                                    Quick Search by Graduation Year
                                </p>
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {availableYears.map((y) => (
                                        <button
                                            key={y}
                                            onClick={() => handleQuickFilter('year', y)}
                                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-zinc-800 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 text-cn-text transition-colors cursor-pointer border border-transparent hover:border-brand-500/20"
                                        >
                                            Graduation {y}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. POST-SEARCH STATE: Tabular Results when search is executed */}
            {hasSearched && (
                <div className="space-y-4">
                    {/* Results Top Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-cn-surface px-4 py-3 rounded-xl border border-cn-border">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-cn-text">
                                {loading ? 'Searching records...' : `Found ${pagination.total} matching student${pagination.total !== 1 ? 's' : ''}`}
                            </span>
                            {pagination.total > 0 && (
                                <span className="text-[11px] text-cn-text-muted font-medium hidden sm:inline">
                                    (Page {pagination.page} of {pagination.totalPages})
                                </span>
                            )}

                            {/* Active filter badges */}
                            {activeFiltersList.map((f, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20"
                                >
                                    <span>{f.label}</span>
                                    <button
                                        onClick={() => {
                                            f.clear();
                                            setTimeout(() => executeSearch(1), 50);
                                        }}
                                        className="hover:text-red-500 transition-colors cursor-pointer"
                                        title="Remove filter"
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Rows per page dropdown */}
                            <div className="flex items-center gap-1.5 text-xs text-cn-text-muted">
                                <span className="hidden md:inline">Show:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        const newLimit = Number(e.target.value);
                                        setLimit(newLimit);
                                        executeSearch(1, newLimit);
                                    }}
                                    className="h-8 pl-2 pr-6 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-cn-text outline-none cursor-pointer hover:border-neutral-300 dark:hover:border-zinc-700 transition-colors"
                                    title="Students per page"
                                >
                                    <option value={10}>10 / page</option>
                                    <option value={25}>25 / page</option>
                                    <option value={50}>50 / page</option>
                                    <option value={100}>100 / page</option>
                                </select>
                            </div>

                            <button
                                onClick={handleExportCSV}
                                disabled={students.length === 0 || loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-cn-surface border border-cn-border hover:border-neutral-300 dark:hover:border-zinc-700 rounded-xl text-xs font-medium text-cn-text transition-all cursor-pointer disabled:opacity-40 shadow-2xs"
                                title="Export search results to CSV"
                            >
                                <Download size={13} className="text-brand-500" />
                                <span className="hidden sm:inline">Export CSV</span>
                            </button>

                            <button
                                onClick={() => executeSearch(pagination.page, limit)}
                                disabled={loading}
                                className="p-1.5 rounded-xl border border-cn-border bg-cn-surface text-cn-text-muted hover:text-cn-text hover:bg-cn-surface-muted transition-all cursor-pointer"
                                title="Refresh results"
                            >
                                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Tabular Form of Results */}
                    <DataTable>
                        <thead>
                            <tr>
                                <Th>Student / Roll No</Th>
                                <Th>Academic Information</Th>
                                <Th>Contact Information</Th>
                                <Th>Campus Involvements</Th>
                                <Th>Participation & Records</Th>
                                <Th align="center">Actions</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/60">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <Td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-zinc-800 shrink-0" />
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="h-4 w-32 bg-neutral-200 dark:bg-zinc-800 rounded" />
                                                    <div className="h-3 w-20 bg-neutral-100 dark:bg-zinc-800/60 rounded" />
                                                </div>
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="space-y-1.5">
                                                <div className="h-3.5 w-24 bg-neutral-200 dark:bg-zinc-800 rounded" />
                                                <div className="h-3 w-32 bg-neutral-100 dark:bg-zinc-800/60 rounded" />
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="space-y-1.5">
                                                <div className="h-3.5 w-36 bg-neutral-200 dark:bg-zinc-800 rounded" />
                                                <div className="h-3 w-24 bg-neutral-100 dark:bg-zinc-800/60 rounded" />
                                            </div>
                                        </Td>
                                        <Td>
                                            <div className="h-6 w-24 bg-neutral-200 dark:bg-zinc-800 rounded-full" />
                                        </Td>
                                        <Td>
                                            <div className="h-4 w-20 bg-neutral-200 dark:bg-zinc-800 rounded" />
                                        </Td>
                                        <Td align="center">
                                            <div className="h-8 w-16 bg-neutral-200 dark:bg-zinc-800 rounded-lg mx-auto" />
                                        </Td>
                                    </tr>
                                ))
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 px-4">
                                        <div className="max-w-md mx-auto space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-neutral-400">
                                                <Search size={22} />
                                            </div>
                                            <p className="text-base font-bold text-cn-text">No students found matching your search</p>
                                            <p className="text-xs text-cn-text-muted leading-relaxed">
                                                No student records matched your current query or filters. Check your roll number spelling or try broadening your branch or batch criteria.
                                            </p>
                                            <button
                                                onClick={handleResetSearch}
                                                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-500 transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5 mt-1"
                                            >
                                                <RotateCcw size={13} />
                                                <span>Clear & Try New Search</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => {
                                    const initials = (student.name || 'S')
                                        .split(' ')
                                        .map(n => n[0])
                                        .slice(0, 2)
                                        .join('')
                                        .toUpperCase();

                                    const branchCode = student.branch || '';

                                    return (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-neutral-50/70 dark:hover:bg-zinc-900/40 transition-colors"
                                        >
                                            {/* Student Name & Roll No */}
                                            <Td>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-brand-500/20">
                                                        {student.profileImage ? (
                                                            <img
                                                                src={student.profileImage}
                                                                alt={student.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{initials}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-cn-text text-sm truncate max-w-[180px]">
                                                                {student.name}
                                                            </span>
                                                            {student.isVerified ? (
                                                                <span title="Verified Student">
                                                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                                                </span>
                                                            ) : (
                                                                <span title="Unverified Account">
                                                                    <XCircle size={14} className="text-neutral-400 dark:text-neutral-600 shrink-0" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 tracking-wide">
                                                                {student.rollNo}
                                                            </span>
                                                            <span className="text-[10px] text-cn-text-muted font-medium">
                                                                Grad: {student.expectedGraduationYear || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Td>

                                            {/* Academic Info */}
                                            <Td>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-neutral-100 dark:bg-zinc-800 text-cn-text">
                                                            {PROGRAM_LABELS[student.program] || student.program || 'B.Tech'}
                                                        </span>
                                                        <span className="text-xs font-bold text-cn-text">
                                                            {branchCode}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-cn-text-muted font-medium">
                                                        {student.academicYearLabel || 'N/A'} • {student.semesterLabel || 'Current Term'}
                                                    </div>
                                                    <div className="text-[10.5px] font-semibold text-brand-600 dark:text-brand-400">
                                                        Class of {student.expectedGraduationYear || 'N/A'}
                                                    </div>
                                                </div>
                                            </Td>

                                            {/* Contact Information */}
                                            <Td>
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex items-center gap-1.5 text-cn-text-secondary group/email">
                                                        <Mail size={12} className="text-neutral-400 shrink-0" />
                                                        <a
                                                            href={`mailto:${student.email}`}
                                                            className="hover:underline hover:text-brand-600 dark:hover:text-brand-400 truncate max-w-[170px]"
                                                            title={student.email}
                                                        >
                                                            {student.email}
                                                        </a>
                                                        <button
                                                            onClick={() => handleCopy(student.email, `email-${student.id}`)}
                                                            className="opacity-0 group-hover/email:opacity-100 text-neutral-400 hover:text-black dark:hover:text-white transition-opacity cursor-pointer ml-0.5"
                                                            title="Copy email address"
                                                        >
                                                            {copiedField === `email-${student.id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                                        </button>
                                                    </div>

                                                    {student.phone ? (
                                                        <div className="flex items-center gap-1.5 text-cn-text-muted group/phone">
                                                            <Phone size={12} className="text-neutral-400 shrink-0" />
                                                            <a
                                                                href={`tel:${student.phone}`}
                                                                className="hover:underline hover:text-brand-600 dark:hover:text-brand-400 font-mono text-[11px]"
                                                            >
                                                                {student.phone}
                                                            </a>
                                                            <button
                                                                onClick={() => handleCopy(student.phone, `phone-${student.id}`)}
                                                                className="opacity-0 group-hover/phone:opacity-100 text-neutral-400 hover:text-black dark:hover:text-white transition-opacity cursor-pointer ml-0.5"
                                                                title="Copy phone number"
                                                            >
                                                                {copiedField === `phone-${student.id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-neutral-400 italic">No phone added</span>
                                                    )}
                                                </div>
                                            </Td>

                                            {/* Campus Involvements / Club Roles */}
                                            <Td>
                                                <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                                                    {student.isClubLead && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                            <Sparkles size={10} />
                                                            <span>Club Head</span>
                                                        </span>
                                                    )}

                                                    {student.isCoordinator && !student.isClubLead && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                            <span>Coordinator</span>
                                                        </span>
                                                    )}

                                                    {(student.memberships || []).length > 0 ? (
                                                        <span className="text-[11px] text-cn-text-muted font-medium">
                                                            {student.memberships.map(m => m.club?.clubName).filter(Boolean).slice(0, 2).join(', ')}
                                                            {student.memberships.length > 2 ? ` +${student.memberships.length - 2}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-neutral-400 italic">No club memberships</span>
                                                    )}
                                                </div>
                                            </Td>

                                            {/* Registrations & Certificates stats */}
                                            <Td>
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex items-center gap-1.5 text-cn-text font-medium">
                                                        <Calendar size={12} className="text-neutral-400" />
                                                        <span>{student._count?.participations || 0} events</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-cn-text-muted text-[11px]">
                                                        <Award size={12} className="text-amber-500" />
                                                        <span>{student._count?.certificates || 0} certificates</span>
                                                    </div>
                                                </div>
                                            </Td>

                                            {/* Action Buttons */}
                                            <Td align="center">
                                                <button
                                                    onClick={() => handleOpenStudentDetail(student.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cn-border bg-cn-surface text-cn-text text-xs font-semibold hover:bg-cn-surface-muted hover:border-neutral-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                                                >
                                                    <Eye size={13} className="text-brand-500" />
                                                    <span>Inspect</span>
                                                </button>
                                            </Td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </DataTable>


                    {/* Pagination Controls */}
                    {!loading && pagination.total > 0 && (
                        <div className="pt-2">
                            <TablePagination
                                currentPage={pagination.page}
                                totalItems={pagination.total}
                                pageSize={pagination.limit}
                                onPageChange={(newPage) => executeSearch(newPage, limit)}
                                onPageSizeChange={(newLimit) => {
                                    setLimit(newLimit);
                                    executeSearch(1, newLimit);
                                }}
                                pageSizeOptions={[10, 25, 50, 100]}
                                itemName="students"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 4. Detailed Student Dossier Modal */}
            {selectedStudentId && (
                <Modal
                    isOpen={Boolean(selectedStudentId)}
                    onClose={() => {
                        setSelectedStudentId(null);
                        setStudentDetail(null);
                    }}
                    title="Student Academic Dossier"
                    maxWidth="max-w-3xl"
                >
                    {detailLoading ? (
                        <div className="p-8 space-y-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-zinc-800" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 w-40 bg-neutral-200 dark:bg-zinc-800 rounded" />
                                    <div className="h-3 w-28 bg-neutral-100 dark:bg-zinc-800/60 rounded" />
                                </div>
                            </div>
                            <div className="h-24 bg-neutral-100 dark:bg-zinc-800/40 rounded-xl" />
                        </div>
                    ) : !studentDetail ? (
                        <div className="p-8 text-center text-xs text-cn-text-muted">
                            Unable to load student profile details.
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {/* Profile Header Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800">
                                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-lg flex items-center justify-center overflow-hidden shrink-0 border border-brand-500/20">
                                        {studentDetail.profileImage ? (
                                            <img
                                                src={studentDetail.profileImage}
                                                alt={studentDetail.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span>
                                                {(studentDetail.name || 'S')
                                                    .split(' ')
                                                    .map(n => n[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base sm:text-lg font-bold text-cn-text truncate">
                                                {studentDetail.name}
                                            </h3>
                                            {studentDetail.isVerified ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                                    <CheckCircle2 size={11} />
                                                    <span>Verified Student</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                                    <BadgeAlert size={11} />
                                                    <span>Unverified Account</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-cn-text-muted mt-1.5">
                                            <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
                                                {studentDetail.rollNo}
                                            </span>
                                            <span>•</span>
                                            <span className="font-semibold text-cn-text">{studentDetail.branch}</span>
                                            <span>•</span>
                                            <span>{PROGRAM_LABELS[studentDetail.program] || studentDetail.program || 'B.Tech'}</span>
                                            <span>•</span>
                                            <span className="font-medium text-brand-600 dark:text-brand-400">
                                                Class of {studentDetail.expectedGraduationYear || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                    <span className="px-3 py-1.5 rounded-xl bg-cn-surface border border-cn-border text-xs font-medium text-cn-text-muted">
                                        {studentDetail.academicStatus === 'GRADUATED' ? 'Alumni' : 'Enrolled Student'}
                                    </span>
                                </div>
                            </div>

                            {/* Dossier Tabs */}
                            <div className="flex border-b border-neutral-200 dark:border-zinc-800 gap-2 sm:gap-6 text-xs font-semibold overflow-x-auto pb-px">
                                {[
                                    { id: 'overview', label: 'Academic & Contact' },
                                    { id: 'clubs', label: `Clubs (${(studentDetail.memberships || []).length})` },
                                    { id: 'events', label: `Events (${(studentDetail.participations || []).length})` },
                                    { id: 'certificates', label: `Certificates (${(studentDetail.certificates || []).length})` }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveDetailTab(tab.id)}
                                        className={`pb-2.5 px-1 whitespace-nowrap transition-all cursor-pointer ${activeDetailTab === tab.id
                                                ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                                                : 'text-cn-text-muted hover:text-cn-text'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab 1: Academic & Contact Profile */}
                            {activeDetailTab === 'overview' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {/* Roll Number */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Roll Number
                                            </p>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-mono font-bold text-brand-600 dark:text-brand-400">
                                                    {studentDetail.rollNo}
                                                </p>
                                                <button
                                                    onClick={() => handleCopy(studentDetail.rollNo, 'modal-roll')}
                                                    className="text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                                                    title="Copy Roll Number"
                                                >
                                                    {copiedField === 'modal-roll' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expected Graduation Year */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Graduation Year
                                            </p>
                                            <p className="text-sm font-semibold text-cn-text">
                                                {studentDetail.expectedGraduationYear ? `Class of ${studentDetail.expectedGraduationYear}` : 'Not specified'}
                                            </p>
                                        </div>

                                        {/* Academic Status / Progress */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Academic Status / Progress
                                            </p>
                                            <p className="text-sm font-semibold text-cn-text">
                                                {studentDetail.academicYearLabel || 'N/A'} • {studentDetail.semesterLabel || 'Current Term'}
                                            </p>
                                        </div>

                                        {/* Branch / Department */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Branch / Department
                                            </p>
                                            <p className="text-sm font-semibold text-cn-text">
                                                {studentDetail.branch || 'N/A'}
                                            </p>
                                        </div>

                                        {/* Degree Program */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Degree Program
                                            </p>
                                            <p className="text-sm font-semibold text-cn-text">
                                                {PROGRAM_LABELS[studentDetail.program] || studentDetail.program || 'B.Tech'}
                                            </p>
                                        </div>

                                        {/* Verification Status */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Verification Status
                                            </p>
                                            <p className="text-sm font-semibold text-cn-text flex items-center gap-1.5">
                                                {studentDetail.isVerified ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
                                                ) : (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Verification</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Email Address */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1 sm:col-span-2">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Email Address
                                            </p>
                                            <div className="flex items-center justify-between gap-2">
                                                <a
                                                    href={`mailto:${studentDetail.email}`}
                                                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline truncate"
                                                >
                                                    {studentDetail.email}
                                                </a>
                                                <button
                                                    onClick={() => handleCopy(studentDetail.email, 'modal-email')}
                                                    className="text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer shrink-0"
                                                    title="Copy Email"
                                                >
                                                    {copiedField === 'modal-email' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Contact Phone Number */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Contact Phone Number
                                            </p>
                                            {studentDetail.phone ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <a
                                                        href={`tel:${studentDetail.phone}`}
                                                        className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                                                    >
                                                        {studentDetail.phone}
                                                    </a>
                                                    <button
                                                        onClick={() => handleCopy(studentDetail.phone, 'modal-phone')}
                                                        className="text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer shrink-0"
                                                        title="Copy Phone"
                                                    >
                                                        {copiedField === 'modal-phone' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-neutral-400 italic">Not provided</p>
                                            )}
                                        </div>

                                        {/* Two-Step Verification */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Two-Step Verification (2FA)
                                            </p>
                                            <p className="text-xs font-semibold text-cn-text">
                                                {studentDetail.isTwoStepEnabled ? 'Enabled' : 'Disabled'}
                                            </p>
                                        </div>

                                        {/* Account Registered On */}
                                        <div className="p-3.5 rounded-xl border border-cn-border bg-cn-surface space-y-1 sm:col-span-2">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted">
                                                Account Registered On
                                            </p>
                                            <p className="text-xs font-semibold text-cn-text">
                                                {new Date(studentDetail.createdAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Social Links */}
                                    {(studentDetail.socialLinks || []).length > 0 && (
                                        <div className="p-4 rounded-xl border border-cn-border bg-cn-surface">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-cn-text-muted mb-2">
                                                Public Profiles & Links
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {studentDetail.socialLinks.map((link) => (
                                                    <a
                                                        key={link.id}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cn-surface-muted hover:bg-neutral-200 dark:hover:bg-zinc-800 text-cn-text transition-colors"
                                                    >
                                                        {link.platform.toLowerCase().includes('github') ? (
                                                            <Github size={13} />
                                                        ) : link.platform.toLowerCase().includes('linkedin') ? (
                                                            <Linkedin size={13} />
                                                        ) : (
                                                            <Globe size={13} />
                                                        )}
                                                        <span className="capitalize">{link.platform}</span>
                                                        <ExternalLink size={10} className="text-neutral-400" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 2: Clubs Affiliations */}
                            {activeDetailTab === 'clubs' && (
                                <div className="space-y-3">
                                    {(studentDetail.memberships || []).length === 0 ? (
                                        <div className="text-center py-8 text-xs text-cn-text-muted">
                                            This student is not currently enrolled in any campus clubs.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {studentDetail.memberships.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className="p-3.5 rounded-xl border border-cn-border bg-cn-surface flex items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-cn-border">
                                                            {m.club?.clubLogo ? (
                                                                <img
                                                                    src={m.club.clubLogo}
                                                                    alt={m.club.clubName}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Users size={16} className="text-neutral-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-cn-text truncate">
                                                                {m.club?.clubName}
                                                            </p>
                                                            <p className="text-[11px] text-cn-text-muted capitalize">
                                                                {m.club?.category || 'Student Club'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${m.role === 'CLUB_HEAD'
                                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                            : m.role === 'COORDINATOR'
                                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                                                : 'bg-neutral-100 dark:bg-zinc-800 text-cn-text-muted'
                                                        }`}>
                                                        {m.role === 'CLUB_HEAD' ? 'Lead' : m.role}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: Events Participations */}
                            {activeDetailTab === 'events' && (
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                    {(studentDetail.participations || []).length === 0 ? (
                                        <div className="text-center py-8 text-xs text-cn-text-muted">
                                            No event registrations recorded for this student.
                                        </div>
                                    ) : (
                                        studentDetail.participations.map((p) => (
                                            <div
                                                key={p.id}
                                                className="p-3.5 rounded-xl border border-cn-border bg-cn-surface flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-cn-text truncate">
                                                        {p.event?.title || 'Campus Event'}
                                                    </p>
                                                    <p className="text-[11px] text-cn-text-muted mt-0.5">
                                                        {p.event?.startTime
                                                            ? new Date(p.event.startTime).toLocaleDateString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })
                                                            : 'Date not set'}
                                                        {p.event?.venue ? ` • ${p.event.venue}` : ''}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${p.attendedAt || p.status === 'ATTENDED'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-neutral-100 dark:bg-zinc-800 text-cn-text-muted'
                                                        }`}>
                                                        {p.attendedAt || p.status === 'ATTENDED' ? 'Attended' : p.status || 'Registered'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Tab 4: Issued Certificates */}
                            {activeDetailTab === 'certificates' && (
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                    {(studentDetail.certificates || []).length === 0 ? (
                                        <div className="text-center py-8 text-xs text-cn-text-muted">
                                            No verified certificates issued for this student yet.
                                        </div>
                                    ) : (
                                        studentDetail.certificates.map((cert) => (
                                            <div
                                                key={cert.id}
                                                className="p-3.5 rounded-xl border border-cn-border bg-cn-surface flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                                        <Award size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-cn-text truncate">
                                                            {cert.event?.title || cert.clubName || 'Achievement Certificate'}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-cn-text-muted">
                                                            ID: {cert.certificateNumber || cert.verificationToken || cert.id}
                                                        </p>
                                                    </div>
                                                </div>

                                                {(cert.verificationToken || cert.certificateNumber || cert.id) && (
                                                    <a
                                                        href={`/verify-certificate/${cert.verificationToken || cert.certificateNumber || cert.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cn-surface-muted hover:bg-neutral-200 dark:hover:bg-zinc-800 text-cn-text flex items-center gap-1 transition-colors"
                                                    >
                                                        <span>View</span>
                                                        <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}
