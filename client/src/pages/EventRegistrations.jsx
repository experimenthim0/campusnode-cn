import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEventRegistrations, getEventById } from '../services/eventService';
import { getPaymentStats, reviewPayment } from '../services/paymentService';
import { toast } from 'react-hot-toast';
import { ParticipationStatus } from '../types/index';
import ShimmerText from '../components/ShimmerText';

const EventRegistrations = () => {
    const { id } = useParams();
    const [registrations, setRegistrations] = useState([]);
    const [stats, setStats] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('individual');
    const [expandedTeams, setExpandedTeams] = useState({});
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [selectedExportColumns, setSelectedExportColumns] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const exportModalRef = useRef(null);

    // Review Payment States
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedReg, setSelectedReg] = useState(null);
    const [reviewStatus, setReviewStatus] = useState(''); // 'APPROVED' | 'REJECTED' | 'NEED_MORE_DETAILS'
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    const openReviewModal = (reg, status) => {
        setSelectedReg(reg);
        setReviewStatus(status);
        setReviewComment('');
        setReviewModalOpen(true);
    };

    const submitReview = async () => {
        if (!selectedReg) return;
        setSubmittingReview(true);
        try {
            await reviewPayment(
                selectedReg.id || selectedReg._id,
                { status: reviewStatus, message: reviewComment }
            );
            toast.success(`Payment ${reviewStatus.toLowerCase()} successfully!`);
            setReviewModalOpen(false);
            const regRes = await getEventRegistrations(id);
            const data = regRes.data;
            setRegistrations(data.participations || (Array.isArray(data) ? data : []));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update review status.');
        } finally {
            setSubmittingReview(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [regRes, eventRes] = await Promise.all([
                    getEventRegistrations(id),
                    getEventById(id),
                ]);
                const data = regRes.data;
                setRegistrations(data.participations || (Array.isArray(data) ? data : []));
                setEventData(eventRes.data);

                try {
                    const statsRes = await getPaymentStats(id);
                    if (statsRes?.data) setStats(statsRes.data);
                } catch (statsErr) {
                    console.warn("Payment stats unavailable or restricted:", statsErr?.message);
                }
                setLoading(false);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to fetch registration data');
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const customFields = eventData?.customFields || [];

    const isTeamEvent = eventData?.registrationType === 'team' || eventData?.registrationType === 'both';
    const exportColumns = [
        { key: 'registrationId', label: 'Registration ID', description: 'Unique participation record ID', getValue: row => row.reg.id || row.reg._id },
        ...(isTeamEvent ? [
            { key: 'registrationType', label: 'Registration Type', getValue: row => row.type },
            { key: 'teamName', label: 'Team Name', getValue: row => row.team?.teamName },
            { key: 'teamRole', label: 'Role in Team', getValue: row => row.role },
        ] : []),
        { key: 'name', label: 'Name', getValue: row => row.reg.student?.name || row.reg.externalName },
        { key: 'rollNo', label: 'Roll Number', getValue: row => row.reg.student?.rollNo },
        { key: 'email', label: 'Email', getValue: row => row.reg.student?.email || row.reg.externalEmail },
        { key: 'branch', label: 'Branch', getValue: row => row.reg.student?.branch },
        { key: 'year', label: 'Year', getValue: row => row.reg.student?.year || row.reg.student?.academicYearLabel || '' },
        { key: 'program', label: 'Program', getValue: row => row.reg.student?.program },
        { key: 'externalName', label: 'External Name', getValue: row => row.reg.externalName },
        { key: 'externalEmail', label: 'External Email', getValue: row => row.reg.externalEmail },
        { key: 'eventName', label: 'Event Name', getValue: () => eventData?.title },
        { key: 'status', label: 'Registration Status', getValue: row => row.reg.status },
        { key: 'attendanceStatus', label: 'Attendance Status', getValue: row => row.reg.attendedAt || row.reg.status === 'ATTENDED' ? 'Attended' : 'Not attended' },
        { key: 'registeredAt', label: 'Registration Date', getValue: row => row.reg.createdAt || row.reg.timestamp },
        { key: 'amountPaid', label: 'Amount Paid (₹)', getValue: row => row.reg.amountPaid },
        { key: 'paymentStatus', label: 'Payment Status', getValue: row => row.reg.paymentStatus },
        { key: 'transactionId', label: 'UTR / Transaction ID', getValue: row => row.reg.transactionId },
        { key: 'payerName', label: 'Payer Name', getValue: row => row.reg.payerName },
        { key: 'paymentRemarks', label: 'Payment Remarks', getValue: row => row.reg.paymentRemarks },
        { key: 'paymentReviewMessage', label: 'Payment Review Message', getValue: row => row.reg.paymentReviewMessage },
        { key: 'attendedAt', label: 'Attended At', getValue: row => row.reg.attendedAt },
        ...customFields.map(field => ({
            key: `custom:${field.label}`,
            label: field.label,
            description: 'Custom registration response',
            getValue: row => getFormResponse(row.reg, field.label),
        })),
    ];

    const defaultExportColumns = exportColumns
        .filter(column => ['registrationId', 'registrationType', 'teamName', 'teamRole', 'name', 'rollNo', 'email', 'branch', 'year', 'eventName', 'status', 'registeredAt', 'paymentStatus'].includes(column.key))
        .map(column => column.key);

    useEffect(() => {
        if (!exportModalOpen) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape' && !isExporting) setExportModalOpen(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        exportModalRef.current?.focus();
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [exportModalOpen, isExporting]);

    const getFormResponse = (reg, label) => {
        const responses = reg.formResponses || {};
        return responses instanceof Map ? responses.get(label) : responses[label];
    };

    const filteredRegistrations = (Array.isArray(registrations) ? registrations : []).filter(reg => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const name = (reg.student?.name || reg.externalName || '').toLowerCase();
        const rollNo = (reg.student?.rollNo || '').toLowerCase();
        const email = (reg.student?.email || reg.externalEmail || '').toLowerCase();
        const branch = (reg.student?.branch || '').toLowerCase();
        const externalEmail = (reg.externalEmail || '').toLowerCase();
        const externalName = (reg.externalName || '').toLowerCase();
        // Also match team name and team leader name for team registrations
        const teamName = (reg.team?.teamName || '').toLowerCase();
        const leaderName = (reg.team?.leader?.name || '').toLowerCase();
        return name.includes(q) || rollNo.includes(q) || email.includes(q) || branch.includes(q)
            || externalEmail.includes(q) || externalName.includes(q)
            || teamName.includes(q) || leaderName.includes(q);
    });

    // Individual registrations: only entries with no teamId
    const individualRegs = filteredRegistrations.filter(r => !r.teamId);

    // Build teamMap from ALL registrations (not filtered) so member lists are always complete,
    // then filter teams by the search query matching team name, leader name, or any member's details.
    const allRegsArr = Array.isArray(registrations) ? registrations : [];
    const fullTeamMap = {};
    allRegsArr.forEach(r => {
        if (r.teamId && r.team) {
            if (!fullTeamMap[r.teamId]) {
                fullTeamMap[r.teamId] = {
                    id: r.teamId,
                    teamName: r.team.teamName,
                    leader: r.team.leader,
                    createdAt: r.createdAt || r.timestamp,
                    status: r.status,
                    members: []
                };
            }
            fullTeamMap[r.teamId].members.push(r);
        }
    });

    // Filter teams: a team passes if the query matches team name, leader, or any member
    const teamRegs = Object.values(fullTeamMap).filter(team => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        if ((team.teamName || '').toLowerCase().includes(q)) return true;
        if ((team.leader?.name || '').toLowerCase().includes(q)) return true;
        return team.members.some(m =>
            (m.student?.name || m.externalName || '').toLowerCase().includes(q) ||
            (m.student?.rollNo || '').toLowerCase().includes(q) ||
            (m.student?.email || m.externalEmail || '').toLowerCase().includes(q) ||
            (m.student?.branch || '').toLowerCase().includes(q)
        );
    });

    const toggleTeam = (teamId) => {
        setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    };

    const handleExportExcel = () => {
        if (!registrations.length) return;
        setExportError('');
        setSelectedExportColumns(defaultExportColumns);
        setExportModalOpen(true);
    };

    const exportSelectedRegistrations = async () => {
        if (!selectedExportColumns.length) {
            setExportError('Select at least one column to export.');
            return;
        }
        setIsExporting(true);
        setExportError('');
        try {
            const rows = [];
            const allRegsForExport = Array.isArray(registrations) ? registrations : [];
            allRegsForExport.filter(reg => !reg.teamId).forEach(reg => rows.push({ reg, type: 'Individual', team: null, role: 'N/A' }));
            if (isTeamEvent) {
                Object.values(fullTeamMap).forEach(team => team.members.forEach(reg => rows.push({
                    reg,
                    type: 'Team',
                    team,
                    role: reg.studentId === team.leader?.id ? 'Leader' : 'Member',
                })));
            }

            const selectedColumns = exportColumns.filter(column => selectedExportColumns.includes(column.key));
            const formatCell = (value, key) => {
                if (value === null || value === undefined || value === '') return '';
                if (key === 'registeredAt' || key === 'attendedAt') {
                    const date = new Date(value);
                    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
                }
                if (Array.isArray(value)) return value.map(item => formatCell(item, key)).join(', ');
                if (typeof value === 'object') return Object.entries(value).map(([k, v]) => `${k}: ${formatCell(v, key)}`).join('; ');
                return String(value);
            };
            const escapeCell = value => {
                const str = formatCell(value.value, value.key).replace(/"/g, '""');
                return /[,"\n]/.test(str) ? `"${str}"` : str;
            };
            const csvContent = [
                selectedColumns.map(column => escapeCell({ value: column.label, key: column.key })).join(','),
                ...rows.map(row => selectedColumns.map(column => escapeCell({ value: column.getValue(row), key: column.key })).join(',')),
            ].join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const eventTitle = (eventData?.title || 'event').replace(/[^a-zA-Z0-9]/g, '_');
            link.download = `${eventTitle}_registrations.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setExportModalOpen(false);
        } catch (err) {
            console.error('Registration export failed:', err);
            setExportError('Unable to generate the export. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
            <ShimmerText text="Loading registrations..." className="text-sm font-semibold tracking-wide" />
        </div>
    );
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-6 rounded-2xl text-center text-red-600 dark:text-red-400 font-bold max-w-md">
                <i className="ri-error-warning-line text-3xl block mb-2" />
                {error}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] transition-colors duration-300">
            <div className="max-w-[95vw] xl:max-w-[1400px] mx-auto px-4 md:px-6 py-10">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight">
                            {eventData?.title || 'Event Registrations'}
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                            Manage event participants and monitor check-ins
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleExportExcel}
                            disabled={registrations.length === 0}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <i className="ri-file-excel-2-line text-sm" /> Export Excel
                        </button>
                        <Link
                            to="/my-events"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200 dark:border-neutral-800 font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                        >
                            <i className="ri-arrow-left-line text-sm" /> Back
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                {eventData && (() => {
                    const eventHasStarted = eventData.startTime && new Date(eventData.startTime) < new Date();
                    const isTeamEvent = eventData?.registrationType === 'team' || eventData?.registrationType === 'both';
                    const indivCount = (Array.isArray(registrations) ? registrations : []).filter(r => !r.teamId).length;
                    const teamCount = Object.keys(fullTeamMap).length;
                    const registeredCount = isTeamEvent ? indivCount + teamCount : registrations.length;
                    const attendedCount = eventHasStarted
                        ? (Array.isArray(registrations) ? registrations : []).filter(r => r.status === 'ATTENDED').length
                        : 0;
                    const entryFee = eventData.entryFee ?? 0;
                    const totalCollected = stats?.totalCollected ?? stats?.totalMoneyCollected ?? 0;
                    const paidRegistrations = stats?.paidRegistrations ?? registrations.filter(r => r.amountPaid > 0).length;

                    return (
                        <div className={`grid grid-cols-1 ${entryFee > 0 ? 'sm:grid-cols-2 lg:grid-cols-4' : (eventHasStarted ? 'sm:grid-cols-2' : 'grid-cols-1')} gap-5 mb-8`}>
                            <div className="bg-white dark:bg-neutral-900 p-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">
                                    Total Registered
                                </p>
                                <p className="text-3xl font-black text-black dark:text-white">{registeredCount}</p>
                                <p className="text-[11px] text-neutral-500 mt-2">
                                    {isTeamEvent
                                        ? `${teamCount} team${teamCount !== 1 ? 's' : ''} · ${indivCount} individual${indivCount !== 1 ? 's' : ''}`
                                        : `out of ${eventData.totalSeats || 'unlimited'} seats`
                                    }
                                </p>
                            </div>

                            {eventHasStarted && (
                                <div className="bg-white dark:bg-neutral-900 p-6 border border-green-200 dark:border-green-900/40 rounded-2xl shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-1">
                                        Attended
                                    </p>
                                    <p className="text-3xl font-black text-green-600">{attendedCount}</p>
                                    <p className="text-[11px] text-neutral-500 mt-2">
                                        {registeredCount > 0 ? Math.round((attendedCount / registeredCount) * 100) : 0}% check-in rate
                                    </p>
                                </div>
                            )}

                            {entryFee > 0 && (
                                <>
                                    <div className="bg-white dark:bg-neutral-900 p-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">
                                            Money Collected
                                        </p>
                                        <p className="text-3xl font-black text-orange-600">
                                            ₹{totalCollected}
                                        </p>
                                        <p className="text-[11px] text-neutral-500 mt-2">
                                            from {paidRegistrations} paid entries
                                        </p>
                                    </div>

                                    <div className="bg-orange-600 p-6 rounded-2xl text-white shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
                                            Entry Fee
                                        </p>
                                        <p className="text-3xl font-black">₹{entryFee}</p>
                                        <p className="text-[11px] opacity-80 mt-2">per student</p>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })()}

                {/* Settlement Info */}
                {stats && stats.entryFee > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 p-4 rounded-xl flex gap-3 items-start mb-8">
                        <i className="ri-information-fill text-yellow-600 dark:text-yellow-500 text-lg mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-400">Payment Settlement Information</p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1 leading-relaxed">
                                Total money collected will be credited to your linked bank account within 7 working days of event completion.
                                For payout queries, contact <a href="mailto:contact.nikhim@gmail.com" className="underline font-bold">contact.nikhim@gmail.com</a>.
                            </p>
                        </div>
                    </div>
                )}

                {registrations.length > 0 && (
                    <div className="mb-6">
                        <div className="relative">
                            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 text-base" />
                            <input
                                type="text"
                                placeholder={activeTab === 'team' ? 'Search by team name, leader, member name, roll no…' : 'Search by name, roll no, email, or branch…'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-10 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer">
                                    <i className="ri-close-line text-lg" />
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 font-medium">
                            {activeTab === 'team'
                                ? `Showing ${teamRegs.length} of ${Object.keys(fullTeamMap).length} teams`
                                : `Showing ${individualRegs.length} of ${allRegsArr.filter(r => !r.teamId).length} individual registrations`
                            }
                        </p>
                    </div>
                )}

                {/* Tabs selection if event supports team registration */}
                {(eventData?.registrationType === 'team' || eventData?.registrationType === 'both') && (
                    <div className="flex border-b border-neutral-200 dark:border-neutral-850 mb-6">
                        <button
                            onClick={() => setActiveTab('individual')}
                            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                                activeTab === 'individual'
                                    ? 'border-orange-600 text-orange-600 font-extrabold'
                                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'
                            } bg-transparent border-0 outline-none`}
                        >
                            Individual Registrations ({individualRegs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                                activeTab === 'team'
                                    ? 'border-orange-600 text-orange-600 font-extrabold'
                                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'
                            } bg-transparent border-0 outline-none`}
                        >
                            Team Registrations ({teamRegs.length})
                        </button>
                    </div>
                )}

                {registrations.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-2xl text-center text-neutral-500">
                        No students registered yet.
                    </div>
                                ) : activeTab === 'team' && (eventData?.registrationType === 'team' || eventData?.registrationType === 'both') ? (
                    <div className="space-y-4">
                        {teamRegs.map((team) => {
                            const isExpanded = !!expandedTeams[team.id];
                            return (
                                <div key={team.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                                    <div
                                        onClick={() => toggleTeam(team.id)}
                                        className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-850/40 transition-colors cursor-pointer"
                                    >
                                        <div className="text-left">
                                            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                                Team: <span className="text-orange-600 font-extrabold">{team.teamName}</span>
                                            </h4>
                                            <p className="text-[11px] text-neutral-500 mt-1">
                                                Leader: <span className="font-semibold">{team.leader?.name}</span> • {team.members.length} members
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[11px] text-neutral-400 font-mono">
                                                Registered: {new Date(team.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg ${
                                                team.status === 'CONFIRMED' || team.status === 'REGISTERED'
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-450'
                                                    : 'bg-orange-50 text-orange-700 dark:bg-orange-950/25 dark:text-orange-450'
                                            }`}>
                                                {team.status}
                                            </span>
                                            <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-xl text-neutral-400`} />
                                        </div>
                                    </div>

                                    {/* Expandable Table */}
                                    {isExpanded && (
                                        <div className="border-t border-neutral-100 dark:border-neutral-800 overflow-x-auto">
                                            {eventData?.paymentMethod && eventData?.paymentMethod !== 'FREE' && (() => {
                                                const leaderPart = team.members.find(m => m.studentId === team.leader?.id) || team.members[0];
                                                if (!leaderPart) return null;
                                                return (
                                                    <div className="p-4 bg-orange-50/20 dark:bg-neutral-900 border-b border-neutral-150 dark:border-neutral-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="text-xs space-y-1 text-left">
                                                            <p className="font-bold text-neutral-800 dark:text-neutral-200">
                                                                Payment Status: <span className={`uppercase font-black ${
                                                                    leaderPart.paymentStatus === 'APPROVED' ? 'text-emerald-600' :
                                                                    leaderPart.paymentStatus === 'REJECTED' ? 'text-rose-600' : 'text-amber-600 animate-pulse'
                                                                }`}>{leaderPart.paymentStatus}</span>
                                                            </p>
                                                            {leaderPart.transactionId && (
                                                                <p className="text-neutral-500 dark:text-neutral-400">
                                                                    UTR/Transaction ID: <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{leaderPart.transactionId}</span>
                                                                </p>
                                                            )}
                                                            {leaderPart.payerName && (
                                                                <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                                                                    Payer Name: <span className="text-neutral-700 dark:text-neutral-300">{leaderPart.payerName}</span>
                                                                </p>
                                                            )}
                                                            {leaderPart.paymentRemarks && (
                                                                <p className="text-neutral-500 dark:text-neutral-400 italic">
                                                                    Remarks: {leaderPart.paymentRemarks}
                                                                </p>
                                                            )}
                                                            {leaderPart.paymentReviewMessage && (
                                                                <p className="text-rose-600 dark:text-rose-450 font-bold">
                                                                    Comment: {leaderPart.paymentReviewMessage}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {leaderPart.paymentStatus !== 'APPROVED' && (
                                                            <div className="flex gap-2 shrink-0">
                                                                <button
                                                                    onClick={() => openReviewModal(leaderPart, 'APPROVED')}
                                                                    className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition cursor-pointer border-0 outline-none"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => openReviewModal(leaderPart, 'REJECTED')}
                                                                    className="px-3.5 py-1.5 bg-rose-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-rose-700 transition cursor-pointer border-0 outline-none"
                                                                >
                                                                    Reject
                                                                </button>
                                                                <button
                                                                    onClick={() => openReviewModal(leaderPart, 'NEED_MORE_DETAILS')}
                                                                    className="px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-805 text-neutral-705 dark:text-neutral-305 border border-neutral-300 dark:border-neutral-700 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-neutral-200 transition cursor-pointer border-0 outline-none"
                                                                >
                                                                    Need Info
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <table className="min-w-full divide-y divide-neutral-100 dark:divide-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20">
                                                <thead className="bg-neutral-50/80 dark:bg-neutral-950/80">
                                                    <tr>
                                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-neutral-500 dark:text-neutral-405 uppercase tracking-wider">Role</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-neutral-500 dark:text-neutral-405 uppercase tracking-wider">Name</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-neutral-500 dark:text-neutral-405 uppercase tracking-wider">Roll No</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-neutral-500 dark:text-neutral-405 uppercase tracking-wider">Acaedmic Info</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-neutral-500 dark:text-neutral-405 uppercase tracking-wider">Status</th>
                                                        {customFields.map((cf, i) => (
                                                            <th key={`team-cf-${i}`} className="px-5 py-3 text-left text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                                                                {cf.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                                                    {team.members.map((m) => {
                                                        const isLeader = m.studentId === team.leader?.id;
                                                        return (
                                                            <tr key={m.id} className="hover:bg-neutral-100/30 dark:hover:bg-neutral-800/50 transition-colors">
                                                                <td className="px-5 py-3 font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider text-[10px] text-left">
                                                                    {isLeader ? (
                                                                        <span className="text-orange-600 font-extrabold bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 rounded px-1.5 py-0.5">Leader</span>
                                                                    ) : (
                                                                        <span className="text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">Member</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-5 py-3 text-left">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-neutral-800 dark:text-neutral-200">{m.student?.name}</span>
                                                                        <span className="text-neutral-400 dark:text-neutral-500 text-[10px] font-mono mt-0.5">{m.student?.email}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-3 font-mono text-left">{m.student?.rollNo || '-'}</td>
                                                                <td className="px-5 py-3 text-neutral-550 dark:text-neutral-400 text-left">
                                                                    {m.student?.program || '-'} • {m.student?.branch || '-'} ({m.student?.year || m.student?.academicYearLabel || '-'})
                                                                </td>
                                                                <td className="px-5 py-3 text-left">
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-405 border-0">
                                                                        {m.status}
                                                                    </span>
                                                                </td>
                                                                {customFields.map((cf, i) => {
                                                                    const val = getFormResponse(m, cf.label);
                                                                    return (
                                                                        <td key={`team-cf-val-${i}`} className="px-5 py-3 text-neutral-600 dark:text-neutral-350 text-left">
                                                                            {cf.type === 'url' && val ? (
                                                                                <a href={val} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline font-semibold">Link</a>
                                                                            ) : val || '-'}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-100 dark:divide-neutral-800">
                                <thead className="bg-neutral-50 dark:bg-neutral-950">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">#</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Student Details</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Roll No</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Program / Academics</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                                        {eventData?.paymentMethod && eventData?.paymentMethod !== 'FREE' && (
                                            <>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Payment Info</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                                            </>
                                        )}
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Registered At</th>
                                        {customFields.map((cf, i) => (
                                            <th key={`cf-${i}`} className="px-5 py-3.5 text-left text-xs font-semibold text-orange-600 uppercase tracking-wider">
                                                {cf.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {individualRegs.map((reg, idx) => {
                                        const isInternal = !!reg.student;
                                        const studentName = reg.student?.name || reg.externalName || 'Unknown';
                                        const studentEmail = reg.student?.email || reg.externalEmail || '-';
                                        const rollNo = reg.student?.rollNo || '-';
                                        const programInfo = isInternal
                                            ? `${reg.student.program || '-'} • ${reg.student.branch || '-'} (${reg.student.year || reg.student.academicYearLabel || '-'})`
                                            : 'External Participant';

                                        return (
                                            <tr key={reg.id || reg._id} className="hover:bg-neutral-100/80 dark:hover:bg-neutral-900/40 transition-colors">
                                                <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-neutral-400">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                                                            {studentName}
                                                        </span>
                                                        <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                                            {studentEmail}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap font-mono text-sm text-neutral-600 dark:text-neutral-300">
                                                    {rollNo}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
                                                    {programInfo}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                                                        {
                                                            [ParticipationStatus.REGISTERED]: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-200/50 dark:border-blue-900/40',
                                                            [ParticipationStatus.ATTENDED]:   'bg-green-50 dark:bg-green-950/20 text-green-600 border border-green-200/50 dark:border-green-900/40',
                                                            [ParticipationStatus.WAITLISTED]: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 border border-yellow-200/50 dark:border-yellow-900/40',
                                                            [ParticipationStatus.CANCELLED]:  'bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-200/50 dark:border-red-900/40',
                                                        }[reg.status] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
                                                    }`}>
                                                        {reg.status}
                                                    </span>
                                                </td>
                                                {eventData?.paymentMethod && eventData?.paymentMethod !== 'FREE' && (
                                                    <>
                                                        <td className="px-5 py-4 text-left">
                                                            <div className="flex flex-col gap-1 text-xs">
                                                                <span className={`px-2 py-0.5 inline-flex text-[9px] font-bold uppercase tracking-wider rounded-md border w-fit ${
                                                                    reg.paymentStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' :
                                                                    reg.paymentStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50' :
                                                                    'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/50 animate-pulse-slow'
                                                                }`}>
                                                                    {reg.paymentStatus}
                                                                </span>
                                                                {reg.transactionId && (
                                                                    <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-350">
                                                                        UTR: <strong className="select-all">{reg.transactionId}</strong>
                                                                    </span>
                                                                )}
                                                                {reg.payerName && (
                                                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-450">
                                                                        Payer: {reg.payerName}
                                                                    </span>
                                                                )}
                                                                {reg.paymentReviewMessage && (
                                                                    <span className="text-[10px] text-rose-600 dark:text-rose-450 font-bold">
                                                                        Msg: {reg.paymentReviewMessage}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap text-left">
                                                            {reg.paymentStatus !== 'APPROVED' ? (
                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        onClick={() => openReviewModal(reg, 'APPROVED')}
                                                                        className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider rounded hover:bg-emerald-700 transition cursor-pointer border-0 outline-none"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openReviewModal(reg, 'REJECTED')}
                                                                        className="px-2.5 py-1 bg-rose-600 text-white font-bold text-[9px] uppercase tracking-wider rounded hover:bg-rose-700 transition cursor-pointer border-0 outline-none"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openReviewModal(reg, 'NEED_MORE_DETAILS')}
                                                                        className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-350 dark:border-neutral-700 font-bold text-[9px] uppercase tracking-wider rounded hover:bg-neutral-200 transition cursor-pointer border-0 outline-none"
                                                                        title="Need Info"
                                                                    >
                                                                        Info
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-neutral-400">-</span>
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-5 py-4 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                                                    {reg.timestamp ? new Date(reg.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                                </td>
                                                {customFields.map((cf, i) => {
                                                    const val = getFormResponse(reg, cf.label);
                                                    return (
                                                        <td key={`cf-${i}`} className="px-5 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
                                                            {cf.type === 'url' && val ? (
                                                                <a href={val} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline font-semibold">
                                                                    Link
                                                                </a>
                                                            ) : val || <span className="text-neutral-300 dark:text-neutral-700">-</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {exportModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-3 py-4 backdrop-blur-sm sm:px-4" role="presentation">
                        <div ref={exportModalRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="export-registrations-title" className="flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl outline-none dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:px-6">
                                <div>
                                    <h2 id="export-registrations-title" className="text-lg font-black text-neutral-900 dark:text-white">Export Registrations</h2>
                                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Choose the information you want to include in your Excel file.</p>
                                </div>
                                <button type="button" aria-label="Close export dialog" onClick={() => !isExporting && setExportModalOpen(false)} disabled={isExporting} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-white"><i className="ri-close-line text-lg" /></button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800 sm:px-6">
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setSelectedExportColumns(exportColumns.map(column => column.key))} className="rounded-lg border border-neutral-300 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Select All</button>
                                    <button type="button" onClick={() => setSelectedExportColumns([])} className="rounded-lg border border-neutral-300 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Clear All</button>
                                </div>
                                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{selectedExportColumns.length} of {exportColumns.length} columns selected</span>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 sm:px-6">
                                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                    {exportColumns.map(column => {
                                        const checked = selectedExportColumns.includes(column.key);
                                        return (
                                            <label key={column.key} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-orange-200 hover:bg-orange-50/60 dark:hover:border-orange-900/50 dark:hover:bg-orange-950/20">
                                                <input type="checkbox" checked={checked} onChange={() => setSelectedExportColumns(current => checked ? current.filter(key => key !== column.key) : [...current, column.key])} className="mt-1 h-4 w-4 accent-orange-600" />
                                                <span><span className="block text-sm font-semibold text-neutral-800 dark:text-neutral-100">{column.label}</span>{column.description && <span className="mt-0.5 block text-[11px] text-neutral-500 dark:text-neutral-400">{column.description}</span>}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            {exportError && <p role="alert" className="px-5 pb-2 text-xs font-semibold text-rose-600 sm:px-6">{exportError}</p>}
                            <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-neutral-800">
                                <button type="button" onClick={() => setExportModalOpen(false)} disabled={isExporting} className="rounded-xl border border-neutral-300 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Cancel</button>
                                <button type="button" onClick={exportSelectedRegistrations} disabled={isExporting || selectedExportColumns.length === 0} className="rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"><i className={`${isExporting ? 'ri-loader-4-line animate-spin' : 'ri-file-excel-2-line'} mr-1`} />{isExporting ? 'Exporting...' : 'Export Excel'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {reviewModalOpen && selectedReg && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                        <div className="bg-white dark:bg-neutral-900 border-2 border-black dark:border-neutral-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="bg-orange-600 px-6 py-4 border-b-2 border-black dark:border-neutral-700">
                                <h3 className="font-black text-white text-lg flex items-center gap-2">
                                    <i className="ri-shield-check-line" /> Review Registration Payment
                                </h3>
                                <p className="text-white/80 text-xs mt-1">Review student transaction reference details</p>
                            </div>
                            
                            <div className="p-6 space-y-4 text-left">
                                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800 p-4 rounded-xl space-y-2 text-xs text-neutral-800 dark:text-neutral-100">
                                    <p><span className="font-bold text-neutral-400">Student:</span> {selectedReg.student?.name || selectedReg.externalName}</p>
                                    {selectedReg.student?.rollNo && <p><span className="font-bold text-neutral-400">Roll No:</span> {selectedReg.student.rollNo}</p>}
                                    <p><span className="font-bold text-neutral-400">Registration Fee:</span> ₹{eventData?.registrationFee || eventData?.entryFee}</p>
                                    <p><span className="font-bold text-neutral-400">UTR / Transaction ID:</span> <span className="font-mono font-bold select-all text-neutral-900 dark:text-neutral-100">{selectedReg.transactionId}</span></p>
                                    <p><span className="font-bold text-neutral-400">Payer Name:</span> {selectedReg.payerName || 'N/A'}</p>
                                    {selectedReg.paymentRemarks && <p><span className="font-bold text-neutral-400">Payer Remarks:</span> {selectedReg.paymentRemarks}</p>}
                                    <p><span className="font-bold text-neutral-400">Action:</span> <span className={`font-black ${reviewStatus === 'APPROVED' ? 'text-emerald-600' : reviewStatus === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'}`}>{reviewStatus}</span></p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                                        Review Comment / Message (Optional for approval, highly recommended for rejection/need details)
                                    </label>
                                    <textarea
                                        rows="3"
                                        className="w-full px-3 py-2 border border-neutral-350 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:border-orange-600"
                                        placeholder={reviewStatus === 'REJECTED' ? 'Please specify why the transaction was rejected (e.g. UTR mismatch/incorrect amount paid)...' : 'Add any review comments here...'}
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setReviewModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-neutral-750 dark:text-neutral-350 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer border-0 outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitReview}
                                    disabled={submittingReview}
                                    className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-orange-600 hover:border-orange-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0 outline-none"
                                >
                                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventRegistrations;
