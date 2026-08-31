import React, { useState } from 'react';
import { Users, User, Search, X } from 'lucide-react';
import { StatCard, DataTable, Th, Td, FilterSelect } from '../components/AdminUI';

const ManualPaymentsTab = ({
    manualPayments = [],
    manualPaymentsSummary,
    paymentsSearch,
    setPaymentsSearch
}) => {
    const [formatFilter, setFormatFilter] = useState('all'); // all | team | individual
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = manualPayments.filter(p => {
        if (paymentsSearch) {
            const q = paymentsSearch.toLowerCase();
            const matchesMember = (p.teamMembers || []).some(m => 
                (m.name || '').toLowerCase().includes(q) || 
                (m.email || '').toLowerCase().includes(q) || 
                (m.rollNo || '').toLowerCase().includes(q)
            );
            const matchesGeneral = (
                (p.studentName || '').toLowerCase().includes(q) ||
                (p.studentRollNo || '').toLowerCase().includes(q) ||
                (p.studentEmail || '').toLowerCase().includes(q) ||
                (p.eventName || '').toLowerCase().includes(q) ||
                (p.clubName || '').toLowerCase().includes(q) ||
                (p.transactionId || '').toLowerCase().includes(q) ||
                (p.payerName || '').toLowerCase().includes(q) ||
                (p.teamName || '').toLowerCase().includes(q) ||
                matchesMember
            );
            if (!matchesGeneral) return false;
        }

        const isTeamEvent = p.isTeam || p.eventRegistrationType === 'team';
        if (formatFilter === 'team' && !isTeamEvent) return false;
        if (formatFilter === 'individual' && isTeamEvent) return false;

        if (statusFilter !== 'all') {
            if (statusFilter === 'approved' && !['APPROVED', 'SUCCESS'].includes(p.paymentStatus)) return false;
            if (statusFilter === 'pending' && p.paymentStatus !== 'PENDING') return false;
            if (statusFilter === 'rejected' && p.paymentStatus !== 'REJECTED') return false;
            if (statusFilter === 'need_details' && p.paymentStatus !== 'NEED_MORE_DETAILS') return false;
        }

        return true;
    });

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            {manualPaymentsSummary && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard label="Total Payments" value={manualPaymentsSummary.total} />
                    <div className="p-5 rounded-2xl border bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-zinc-800 transition-colors">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">Pending Approvals</p>
                        <p className="text-2xl font-black mt-1 text-amber-500">{manualPaymentsSummary.pending}</p>
                    </div>
                    <div className="p-5 rounded-2xl border bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-zinc-800 transition-colors">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">Approved</p>
                        <p className="text-2xl font-black mt-1 text-emerald-500">{manualPaymentsSummary.approved}</p>
                    </div>
                    <div className="p-5 rounded-2xl border bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-zinc-800 transition-colors">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">Rejected</p>
                        <p className="text-2xl font-black mt-1 text-rose-500">{manualPaymentsSummary.rejected}</p>
                    </div>
                    <div className="p-5 rounded-2xl border bg-white dark:bg-[#0a0a0a] border-neutral-200 dark:border-zinc-800 transition-colors">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 dark:text-neutral-500">Need Details</p>
                        <p className="text-2xl font-black mt-1 text-orange-500">{manualPaymentsSummary.needMoreDetails}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50/80 dark:bg-neutral-900/50 p-3.5 border border-neutral-200 dark:border-zinc-800 rounded-2xl">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search student, team, event, roll no or UTR..."
                            value={paymentsSearch}
                            onChange={(e) => setPaymentsSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500 transition-colors"
                        />
                        {paymentsSearch && (
                            <button onClick={() => setPaymentsSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <FilterSelect value={formatFilter} onChange={(val) => setFormatFilter(val)}>
                        <option value="all">All Formats (Team & Solo)</option>
                        <option value="team">Team Events Only</option>
                        <option value="individual">Solo / Individual Only</option>
                    </FilterSelect>

                    <FilterSelect value={statusFilter} onChange={(val) => setStatusFilter(val)}>
                        <option value="all">All Payment Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="need_details">Need Details</option>
                    </FilterSelect>
                </div>

                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium px-2 shrink-0">
                    {filtered.length} transactions
                </span>
            </div>

            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th>#</Th>
                        <Th>Event & Format</Th>
                        <Th>Participant / Team Details</Th>
                        <Th>Payer & UTR Info</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                        <Th align="right">Date</Th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map((p, idx) => {
                        const displayClubName = (p.clubName && p.clubName !== 'Unknown' && p.clubName !== 'Unknown Club')
                            ? p.clubName
                            : (p.club?.clubName || 'ODSW');
                        const isTeam = p.isTeam || p.eventRegistrationType === 'team';

                        return (
                            <tr key={p.id || idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <Td className="text-neutral-300 dark:text-neutral-600">{idx + 1}</Td>
                                
                                <Td>
                                    <p className="font-bold text-black dark:text-white text-sm">{p.eventName}</p>
                                    <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mt-0.5" title={displayClubName === 'ODSW' ? 'Office of DSW' : displayClubName}>
                                        {displayClubName}
                                    </p>
                                    {/* <div className="mt-1.5 flex items-center gap-1.5">
                                        {isTeam ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/40 uppercase tracking-wider">
                                                <Users size={10} /> Team Event {p.eventMinTeamSize > 1 ? `(${p.eventMinTeamSize}-${p.eventMaxTeamSize})` : ''}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/40 uppercase tracking-wider">
                                                <User size={10} /> Individual
                                            </span>
                                        )}
                                    </div> */}
                                </Td>

                                <Td>
                                    {isTeam ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-black dark:text-white truncate">
                                                   Team {p.teamName || 'Team'}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-[10px] uppercase tracking-wider border border-orange-200/60 dark:border-orange-900/40">
                                                    <Users size={11} /> {p.teamMemberCount || p.teamMembers?.length || 2}
                                                </span>
                                                
                                            </div>
                                            <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                                                Leader: <span className="font-semibold text-black dark:text-white">{p.studentName}</span>
                                            </p>
                                            <p className='text-xs text-neutral-400 dark:text-neutral-500 '>
                                            {p.studentEmail !== 'N/A' && <span className=" text-black dark:text-white"> {p.studentEmail}</span>}
                                                
                                            </p>
                                            {/* {p.teamMembers && p.teamMembers.length > 0 && (
                                                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-tight">
                                                    <span className="font-semibold">Teammates: </span>
                                                    {p.teamMembers.map(m => m.name).filter(Boolean).join(', ')}
                                                </p>
                                            )} */}
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                                                
                                                {p.studentName}
                                            </p>
                                            <p className="text-[11px] text-neutral-400">
                                                {p.studentEmail} 
                                                {/* {p.studentRollNo !== 'N/A' && `• Roll: ${p.studentRollNo}`} */}
                                            </p>
                                        </div>
                                    )}
                                </Td>

                                <Td>
                                    {p.transactionId ? (
                                        <span className="font-mono text-xs font-bold text-black dark:text-white">{p.transactionId}</span>
                                    ) : (
                                        <span className="text-neutral-400 text-xs italic">No UTR submitted</span>
                                    )}
                                    {p.payerName && <p className="text-[11px] text-neutral-400">Payer: {p.payerName}</p>}
                                    {p.paymentRemarks && <p className="text-[10px] text-neutral-400 dark:text-neutral-500 italic mt-0.5">"{p.paymentRemarks}"</p>}
                                </Td>

                                <Td className="font-mono font-black text-orange-600 dark:text-orange-400 text-base">₹{p.amountPaid}</Td>

                                <Td>
                                    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${
                                        ['APPROVED', 'SUCCESS'].includes(p.paymentStatus)
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                            : p.paymentStatus === 'REJECTED'
                                            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                                            : p.paymentStatus === 'NEED_MORE_DETAILS'
                                            ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                                            : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                    }`}>
                                        {p.paymentStatus}
                                    </span>
                                </Td>

                                <Td align="right" className="text-[11px] text-neutral-400 uppercase tracking-wide">
                                    {new Date(p.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                </Td>
                            </tr>
                        );
                    })}
                    {filtered.length === 0 && (
                        <tr><td colSpan="7" className="px-5 py-16 text-center text-neutral-400 text-sm">No transaction registrations found.</td></tr>
                    )}
                </tbody>
            </DataTable>
        </div>
    );
};

export default ManualPaymentsTab;
