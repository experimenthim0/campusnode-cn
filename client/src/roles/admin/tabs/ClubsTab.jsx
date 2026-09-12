import React, { useState } from 'react';
import { 
    createClub, 
    updateClub, 
    deleteClub, 
    getClubsList, 
    assignClubHead, 
    removeClubHead, 
    searchStudents 
} from '../../../services/adminService';
import { 
    Plus, 
    Key, 
    CheckCircle2, 
    GraduationCap, 
    Mail, 
    Trash2, 
    AlertTriangle, 
    Loader2, 
    Crown, 
    UserCheck, 
    UserPlus, 
    UserX, 
    Search, 
    X,
    Sparkles,
    Shield
} from 'lucide-react';
import { DataTable, Th, Td, Modal, ModalFormField } from '../components/AdminUI';
import { useNotification } from '../../../context/NotificationContext';

const ClubsTab = ({
    clubHeads = [],
    setClubHeads,
    refreshStats,
    isCreateClubModalOpen,
    setIsCreateClubModalOpen
}) => {
    const { showNotification } = useNotification();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClub, setEditingClub] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clubToDelete, setClubToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [createdClubCredentials, setCreatedClubCredentials] = useState(null);

    // Club Head (Student Lead) Assignment State
    const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
    const [selectedClubForHead, setSelectedClubForHead] = useState(null);
    const [studentQuery, setStudentQuery] = useState('');
    const [studentSearchResults, setStudentSearchResults] = useState([]);
    const [isSearchingStudents, setIsSearchingStudents] = useState(false);
    const [selectedStudentToAssign, setSelectedStudentToAssign] = useState(null);
    const [isSubmittingHead, setIsSubmittingHead] = useState(false);
    const [isRevokingHead, setIsRevokingHead] = useState(false);

    const handleCreateClub = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const res = await createClub(data);
            showNotification('Club and faculty coordinator created successfully!', 'success');
            e.target.reset();
            setIsCreateClubModalOpen(false);
            const slug = res.data?.club?.slug || data.clubName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const createdClub = res.data?.club || {};
            setCreatedClubCredentials({
                clubId: createdClub._id || createdClub.id,
                clubName: data.clubName,
                slug,
                clubEmail: data.clubEmail,
                facultyEmail: data.facultyEmail,
                facultyName: data.facultyName,
                defaultPassword: `${slug}@him0148`,
                rawClub: createdClub,
            });
            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
            if (refreshStats) refreshStats();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to create club', 'error');
        }
    };

    const handleUpdateClub = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        setIsUpdating(true);
        
        try {
            await updateClub(editingClub._id || editingClub.id, data);
            showNotification('Club updated successfully', 'success');
            setIsEditModalOpen(false);
            setEditingClub(null);
            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
            if (refreshStats) refreshStats();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update club', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteClub = async () => {
        if (!clubToDelete) return;
        setIsDeleting(true);
        try {
            await deleteClub(clubToDelete._id || clubToDelete.id);
            showNotification(`Club "${clubToDelete.clubName}" deleted successfully`, 'success');
            setIsDeleteModalOpen(false);
            setClubToDelete(null);
            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
            if (refreshStats) refreshStats();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to delete club', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // Open the Club Head Assignment Modal
    const openManageHeadModal = (club) => {
        setSelectedClubForHead(club);
        setStudentQuery('');
        setStudentSearchResults([]);
        setSelectedStudentToAssign(null);
        setIsHeadModalOpen(true);
    };

    // Search students for Club Head assignment
    const handleSearchStudents = async (q) => {
        setStudentQuery(q);
        if (!q || q.trim().length < 2) {
            setStudentSearchResults([]);
            return;
        }
        setIsSearchingStudents(true);
        try {
            const res = await searchStudents(q.trim());
            setStudentSearchResults(res.data?.students || []);
        } catch (err) {
            console.error('Student search failed:', err);
        } finally {
            setIsSearchingStudents(false);
        }
    };

    // Assign selected student as Club Head
    const handleAssignHead = async () => {
        if (!selectedClubForHead || !selectedStudentToAssign) return;
        setIsSubmittingHead(true);
        const clubId = selectedClubForHead._id || selectedClubForHead.id;
        try {
            const res = await assignClubHead(clubId, { studentId: selectedStudentToAssign.id });
            showNotification(res.data?.message || `Assigned ${selectedStudentToAssign.name} as Club Head`, 'success');
            
            // Refresh table list
            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
            if (refreshStats) refreshStats();

            // Update currently selected club in modal view
            const updatedClub = clubsRes.data.find(c => (c._id || c.id) === clubId);
            if (updatedClub) {
                setSelectedClubForHead(updatedClub);
            }
            setSelectedStudentToAssign(null);
            setStudentQuery('');
            setStudentSearchResults([]);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to assign club head', 'error');
        } finally {
            setIsSubmittingHead(false);
        }
    };

    // Revoke current Club Head
    const handleRevokeHead = async () => {
        if (!selectedClubForHead) return;
        const currentHead = selectedClubForHead.memberships?.[0]?.student;
        const headName = currentHead?.name || 'current student';
        if (!window.confirm(`Revoke Club Head role from ${headName}? They will be reverted to a normal club member.`)) {
            return;
        }
        setIsRevokingHead(true);
        const clubId = selectedClubForHead._id || selectedClubForHead.id;
        try {
            const res = await removeClubHead(clubId);
            showNotification(res.data?.message || 'Club Head revoked successfully', 'success');

            // Refresh table list
            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
            if (refreshStats) refreshStats();

            // Update currently selected club in modal view
            const updatedClub = clubsRes.data.find(c => (c._id || c.id) === clubId);
            if (updatedClub) {
                setSelectedClubForHead(updatedClub);
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to revoke club head', 'error');
        } finally {
            setIsRevokingHead(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-cn-surface border border-cn-border">
                <div>
                    <h2 className="text-base font-black text-cn-text tracking-wide">Registered Clubs</h2>
                    <p className="text-xs text-neutral-400 font-medium">Manage registered student clubs, faculty coordinators, and designated student club heads.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsCreateClubModalOpen(true)}
                    className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
                >
                    <Plus size={16} />
                    <span>Add New Club</span>
                </button>
            </div>

            {/* List: Existing Clubs */}
            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th>#</Th>
                        <Th>Club Name</Th>
                        <Th>Faculty Coordinator</Th>
                        <Th>Club Head / Student Lead</Th>
                        <Th align="right">Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {clubHeads.map((club, idx) => {
                        const headUser = club.memberships?.[0]?.student;
                        const fc = club.facultyCoordinator;
                        return (
                            <tr key={club._id || club.id || idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <Td className="text-neutral-300 dark:text-neutral-600 font-mono text-xs">{idx + 1}</Td>
                                <Td>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-black dark:text-white">{club.clubName}</p>
                                        <p className="text-[11px] text-neutral-400 font-mono">{club.clubEmail || `${club.slug}@nitj.ac.in`}</p>
                                    </div>
                                </Td>
                                <Td>
                                    <div className="space-y-0.5">
                                        <p className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                                            
                                            <span>{fc?.name || club.facultyName || 'N/A'}</span>
                                        </p>
                                        <p className="text-[11px] text-neutral-400 font-mono">{fc?.email || club.facultyEmail || ''}</p>
                                    </div>
                                </Td>
                                <Td>
                                    {headUser ? (
                                        <div className="flex items-center gap-3">
                                            {/* <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-xs flex items-center justify-center border border-brand-500/20 shrink-0 overflow-hidden">
                                                {headUser.profileImage ? (
                                                    <img src={headUser.profileImage} alt={headUser.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    headUser.name?.charAt(0).toUpperCase()
                                                )}
                                            </div> */}
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold text-black dark:text-white text-xs truncate">{headUser.name}</p>
                                                    {/* <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                                                        <Crown size={9} /> Lead
                                                    </span> */}
                                                </div>
                                                <p className="text-[11px] text-neutral-400 font-mono truncate">
                                                    {headUser.rollNo || ''}{headUser.branch ? ` • ${headUser.branch}` : ''}
                                                </p>
                                                <p className="text-[10.5px] text-neutral-400 truncate">{headUser.email}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                                <AlertTriangle size={12} className="shrink-0" />
                                                <span>No Lead Assigned</span>
                                            </span>
                                            {/* <button
                                                type="button"
                                                onClick={() => openManageHeadModal(club)}
                                                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                                            >
                                                + Assign
                                            </button> */}
                                        </div>
                                    )}
                                </Td>
                                <Td align="right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openManageHeadModal(club)}
                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                                                headUser
                                                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/70 dark:border-brand-900/40 hover:bg-brand-100 dark:hover:bg-brand-900/60'
                                                    : 'bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black shadow-xs'
                                            }`}
                                            title="Manage Club Student Lead"
                                        >
                                            {headUser ? <Crown size={12} /> : <UserPlus size={12} />}
                                            <span>{headUser ? 'Lead' : 'Assign Lead'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingClub(club); setIsEditModalOpen(true); }}
                                            className="px-3 py-1.5 bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setClubToDelete(club); setIsDeleteModalOpen(true); }}
                                            className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                            title="Delete Club"
                                        >
                                            <Trash2 size={12} />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </Td>
                            </tr>
                        );
                    })}
                    {clubHeads.length === 0 && (
                        <tr><td colSpan="5" className="px-5 py-16 text-center text-neutral-400 text-sm">No clubs found.</td></tr>
                    )}
                </tbody>
            </DataTable>

            {/* Modal: Manage Club Student Lead */}
            {isHeadModalOpen && selectedClubForHead && (
                <Modal
                    onClose={() => {
                        if (!isSubmittingHead && !isRevokingHead) {
                            setIsHeadModalOpen(false);
                            setSelectedClubForHead(null);
                        }
                    }}
                    title={`Student Lead: ${selectedClubForHead.clubName}`}
                    subtitle="Assign or change the Club Head for this club."
                >
                    <div className="space-y-5 pt-1">
                        {/* Current Club Head Display */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-cn-text-muted mb-2">
                                Current Active Student Lead
                            </label>
                            {selectedClubForHead.memberships?.[0]?.student ? (
                                (() => {
                                    const head = selectedClubForHead.memberships[0].student;
                                    return (
                                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center border border-emerald-500/20 shrink-0 overflow-hidden">
                                                        {head.profileImage ? (
                                                            <img src={head.profileImage} alt={head.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            head.name?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-sm text-cn-text truncate">{head.name}</h4>
                                                            {/* <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                                                <Crown size={10} /> Active Lead
                                                            </span> */}
                                                        </div>
                                                        <p className="text-xs text-cn-text-muted font-mono">{head.rollNo} • {head.branch || head.program || 'Student'}</p>
                                                        <p className="text-xs text-cn-text-secondary">{head.email}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isRevokingHead || isSubmittingHead}
                                                    onClick={handleRevokeHead}
                                                    className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors border border-red-200 dark:border-red-900/50 cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto disabled:opacity-50"
                                                    title="Revoke Student Lead role"
                                                >
                                                    {isRevokingHead ? (
                                                        <>
                                                            <Loader2 size={12} className="animate-spin" />
                                                            <span>Revoking...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserX size={12} />
                                                            <span>Revoke Lead</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                           
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                                        No student lead is currently assigned to <strong>{selectedClubForHead.clubName}</strong>. Search and select an active student below to grant them executive club management permissions.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Search & Select New Student Section */}
                        <div className="space-y-3 pt-2 border-t border-cn-border-subtle">
                            <label className="block text-xs font-bold uppercase tracking-wider text-cn-text-muted">
                                {selectedClubForHead.memberships?.[0]?.student ? 'Transfer / Assign New Student Lead' : 'Search & Assign Student Lead'}
                            </label>

                            {/* Search Input */}
                            <div className="relative">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    value={studentQuery}
                                    onChange={(e) => handleSearchStudents(e.target.value)}
                                    placeholder="Search by Name, Roll No (e.g. 22101001), or Email..."
                                    className="w-full pl-9 pr-9 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border rounded-xl text-xs sm:text-[13px] text-cn-text placeholder:text-cn-text-muted focus:border-brand-500 dark:focus:border-brand-400 outline-none transition-colors"
                                />
                                {studentQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setStudentQuery(''); setStudentSearchResults([]); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown / List */}
                            {isSearchingStudents ? (
                                <div className="py-4 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Searching registered students...</span>
                                </div>
                            ) : studentSearchResults.length > 0 ? (
                                <div className="max-h-52 overflow-y-auto space-y-1.5 border border-cn-border rounded-xl p-2 bg-cn-surface-muted/50">
                                    {studentSearchResults.map((student) => {
                                        const isSelected = selectedStudentToAssign?.id === student.id;
                                        return (
                                            <div
                                                key={student.id}
                                                onClick={() => setSelectedStudentToAssign(student)}
                                                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                    isSelected
                                                        ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500/60'
                                                        : 'bg-cn-surface hover:bg-neutral-50 dark:hover:bg-zinc-800/60 border-cn-border'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/20 shrink-0">
                                                        {student.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-xs text-cn-text truncate">{student.name}</p>
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300">
                                                                {student.rollNo}
                                                            </span>
                                                            {student.currentHeadClub && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                                                                    Lead: {student.currentHeadClub.clubName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-neutral-400 truncate">
                                                            {student.branch || student.program || ''}{student.year ? ` • ${student.year}` : ''}
                                                        </p>
                                                        <p className="text-[10.5px] text-neutral-400 truncate">{student.email}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedStudentToAssign(student); }}
                                                    className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                                                        isSelected
                                                            ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-black'
                                                            : 'bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-cn-text'
                                                    }`}
                                                >
                                                    {isSelected ? 'Selected' : 'Select'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : studentQuery.trim().length >= 2 ? (
                                <p className="text-xs text-neutral-400 text-center py-3">
                                    No students found matching "{studentQuery}".
                                </p>
                            ) : null}

                            {/* Candidate Selection Confirmation Box */}
                            {selectedStudentToAssign && (
                                <div className="p-4 rounded-xl border border-brand-500/40 bg-brand-50/50 dark:bg-brand-950/30 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                            <Sparkles size={12} /> Designated Candidate
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedStudentToAssign(null)}
                                            className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer font-medium"
                                        >
                                            Change Selection
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-sm flex items-center justify-center border border-brand-500/20 shrink-0">
                                            {selectedStudentToAssign.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs sm:text-sm text-cn-text truncate">{selectedStudentToAssign.name}</p>
                                            <p className="text-xs text-cn-text-muted font-mono">{selectedStudentToAssign.rollNo} • {selectedStudentToAssign.branch || selectedStudentToAssign.program || 'Student'}</p>
                                            <p className="text-xs text-cn-text-secondary">{selectedStudentToAssign.email}</p>
                                        </div>
                                    </div>
                                    {selectedStudentToAssign.currentHeadClub && String(selectedStudentToAssign.currentHeadClub.id) !== String(selectedClubForHead._id || selectedClubForHead.id) && (
                                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-700 dark:text-red-400 flex items-start gap-1.5">
                                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Cannot Assign:</strong> {selectedStudentToAssign.name} is already the active Club Head of <strong>{selectedStudentToAssign.currentHeadClub.clubName}</strong>. A student can lead only one club at a time.
                                            </span>
                                        </div>
                                    )}
                                    {selectedClubForHead.memberships?.[0]?.student && (!selectedStudentToAssign.currentHeadClub || String(selectedStudentToAssign.currentHeadClub.id) === String(selectedClubForHead._id || selectedClubForHead.id)) && (
                                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                            <span>
                                                Assigning will demote <strong>{selectedClubForHead.memberships[0].student.name}</strong> to member status and transfer Club Head leadership to <strong>{selectedStudentToAssign.name}</strong>.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="pt-3 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                disabled={isSubmittingHead || isRevokingHead}
                                onClick={() => {
                                    setIsHeadModalOpen(false);
                                    setSelectedClubForHead(null);
                                }}
                                className="px-4 py-2 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Close
                            </button>
                            {selectedStudentToAssign && (
                                <button
                                    type="button"
                                    disabled={
                                        isSubmittingHead ||
                                        isRevokingHead ||
                                        Boolean(selectedStudentToAssign.currentHeadClub && String(selectedStudentToAssign.currentHeadClub.id) !== String(selectedClubForHead._id || selectedClubForHead.id))
                                    }
                                    onClick={handleAssignHead}
                                    className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                                >
                                    {isSubmittingHead ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span>Assigning...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck size={14} />
                                            <span>Confirm &amp; Assign Lead</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Create Club */}
            {isCreateClubModalOpen && (
                <Modal
                    onClose={() => setIsCreateClubModalOpen(false)}
                    title="Create New Club"
                    subtitle="Create a registered club with a faculty coordinator. Assign a Student Lead afterwards."
                >
                    <form onSubmit={handleCreateClub} className="space-y-4 pt-2">
                        <ModalFormField label="Club Name" name="clubName" placeholder="e.g. CodeX Society" required />
                        <ModalFormField label="Faculty Coordinator Name" name="facultyName" placeholder="Dr. Full Name" required />
                        <ModalFormField label="Faculty Coordinator Email" name="facultyEmail" type="email" placeholder="faculty@nitj.ac.in" required />
                        <ModalFormField label="Club Official Contact Email" name="clubEmail" type="email" placeholder="club@nitj.ac.in" required />

                        <div className="p-3.5 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 space-y-2">
                            <p className="font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                <Key size={14} className="shrink-0" /> Club Provisioning &amp; Architecture
                            </p>
                            <div className="space-y-1.5 text-[11px] leading-relaxed text-cn-text-secondary">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                                    <p>
                                        <strong className="text-cn-text">Faculty Coordinator:</strong> Receives administrative coordinator access at <span className="font-mono font-semibold text-cn-text">/admin-secret-login</span> using <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;facultyEmail&gt;</code>.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0 mt-1.5" />
                                    <p>
                                        <strong className="text-cn-text">Student Lead / Club Head:</strong> Delegated to an active student account. You can designate the student lead immediately after club creation using the "Assign Lead" button.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                onClick={() => setIsCreateClubModalOpen(false)}
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Create Club
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal: Created Club Summary & Next Steps */}
            {createdClubCredentials && (
                <Modal
                    onClose={() => setCreatedClubCredentials(null)}
                    title="Club Registered Successfully"
                    subtitle="Faculty Coordinator has been provisioned. You can now assign a Student Lead."
                >
                    <div className="space-y-4 pt-2">
                        {/* Club Summary */}
                        <div className="p-4 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                <Shield size={14} className="shrink-0" /> Registered Club Information
                            </p>
                            <div className="text-xs space-y-1.5 text-cn-text-secondary">
                                <p><strong className="text-cn-text">Club Name:</strong> {createdClubCredentials.clubName}</p>
                                <p><strong className="text-cn-text">Club Identifier:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-cn-text">{createdClubCredentials.slug}</code></p>
                                <p><strong className="text-cn-text">Official Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-cn-text">{createdClubCredentials.clubEmail}</code></p>
                            </div>
                        </div>

                        {/* Faculty Coordinator Account */}
                        <div className="p-4 bg-cn-surface-muted border border-cn-border rounded-xl space-y-2">
                            <p className="text-xs font-bold text-cn-text flex items-center gap-1.5">
                                <GraduationCap size={14} className="shrink-0" /> Faculty Coordinator Account
                            </p>
                            <div className="text-xs space-y-1.5 text-cn-text-secondary">
                                <p><strong className="text-cn-text">Login Portal:</strong> <span className="font-mono text-cn-text font-bold">/admin-secret-login</span></p>
                                <p><strong className="text-cn-text">Coordinator Name:</strong> {createdClubCredentials.facultyName}</p>
                                <p><strong className="text-cn-text">Coordinator Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-cn-text">{createdClubCredentials.facultyEmail}</code></p>
                                <p><strong className="text-cn-text">Initial Password:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-cn-text">{createdClubCredentials.defaultPassword}</code></p>
                            </div>
                        </div>

                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-start gap-2.5">
                            <Mail size={15} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                An onboarding email with instructions has been dispatched to <span className="font-bold">{createdClubCredentials.facultyEmail}</span>.
                            </p>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const clubObj = clubHeads.find(c => (c._id || c.id) === createdClubCredentials.clubId) || createdClubCredentials.rawClub;
                                    setCreatedClubCredentials(null);
                                    if (clubObj) {
                                        openManageHeadModal(clubObj);
                                    }
                                }}
                                className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                                <UserPlus size={14} />
                                <span>Assign Student Lead Now</span>
                            </button>
                            <button
                                onClick={() => setCreatedClubCredentials(null)}
                                className="px-5 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Edit Club */}
            {isEditModalOpen && editingClub && (
                <Modal onClose={() => { if (!isUpdating) { setIsEditModalOpen(false); setEditingClub(null); } }} title="Edit Registered Club" subtitle="Update club name, faculty coordinator assignment, or club contact email.">
                    <form onSubmit={handleUpdateClub} className="space-y-4 pt-2">
                        <ModalFormField label="Club Name" name="clubName" defaultValue={editingClub.clubName} required />
                        <ModalFormField label="Faculty Coordinator Name" name="facultyName" defaultValue={editingClub.facultyName || editingClub.facultyCoordinator?.name} required />
                        <ModalFormField label="Faculty Coordinator Email" name="facultyEmail" type="email" defaultValue={editingClub.facultyEmail || editingClub.facultyCoordinator?.email} required />
                        <ModalFormField label="Club Contact Email" name="clubEmail" type="email" defaultValue={editingClub.clubEmail} required />

                        <div className="p-3 bg-cn-surface-muted border border-cn-border rounded-xl text-xs text-cn-text-secondary space-y-1">
                            <p className="font-semibold text-cn-text flex items-center gap-1.5">
                                <GraduationCap size={13} className="text-brand-600 dark:text-brand-400" /> Faculty Coordinator Note
                            </p>
                            <p>
                                Changing the faculty coordinator email will automatically reassign governance permissions or provision a new coordinator account. Student accounts cannot be assigned as faculty coordinators.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => { setIsEditModalOpen(false); setEditingClub(null); }}
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Changes</span>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal: Delete Club Confirmation */}
            {isDeleteModalOpen && clubToDelete && (
                <Modal
                    onClose={() => { if (!isDeleting) { setIsDeleteModalOpen(false); setClubToDelete(null); } }}
                    title="Delete Club"
                    subtitle="This action is permanent and cannot be undone."
                >
                    <div className="space-y-4 pt-2">
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl space-y-2">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                                <AlertTriangle size={18} className="shrink-0" />
                                <span>Warning: Permanent Deletion</span>
                            </div>
                            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                You are about to permanently delete <strong className="text-cn-text">"{clubToDelete.clubName}"</strong>.
                            </p>
                            <ul className="text-xs text-cn-text-secondary space-y-1 list-disc list-inside">
                                <li>All events organized by this club will lose this club association</li>
                                <li>Club memberships and student lead assignments will be removed</li>
                                <li>Announcements, achievements, gallery media, and social links will be deleted</li>
                            </ul>
                        </div>

                        <div className="pt-2 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => { setIsDeleteModalOpen(false); setClubToDelete(null); }}
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDeleteClub}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-xs"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        <span>Confirm Delete</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ClubsTab;
