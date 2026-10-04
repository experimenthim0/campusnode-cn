import React, { useState } from 'react';
import { 
    createClub, 
    updateClub, 
    deleteClub, 
    getClubsList, 
    assignClubHead, 
    removeClubHead, 
    searchStudents,
    searchFaculty,
    addClubFacultyCoordinator,
    removeClubFacultyCoordinator
} from '../../../services/adminService';
import { 
    Plus, 
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
    Shield,
    Phone
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
    const [headPosition, setHeadPosition] = useState('President');

    // Faculty Coordinator Assignment State
    const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
    const [selectedClubForCoordinator, setSelectedClubForCoordinator] = useState(null);
    const [facultyQuery, setFacultyQuery] = useState('');
    const [facultySearchResults, setFacultySearchResults] = useState([]);
    const [isSearchingFaculty, setIsSearchingFaculty] = useState(false);
    const [selectedFacultyToAssign, setSelectedFacultyToAssign] = useState(null);
    const [isSubmittingCoordinator, setIsSubmittingCoordinator] = useState(false);
    const [removingCoordinatorId, setRemovingCoordinatorId] = useState(null);

    // Live search in Create Club
    const [createFacultyQuery, setCreateFacultyQuery] = useState('');
    const [createFacultyResults, setCreateFacultyResults] = useState([]);
    const [isSearchingCreateFaculty, setIsSearchingCreateFaculty] = useState(false);
    const [selectedCreateFaculty, setSelectedCreateFaculty] = useState(null);
    const [createFacultyName, setCreateFacultyName] = useState('');
    const [createFacultyEmail, setCreateFacultyEmail] = useState('');

    // Live search in Edit Club
    const [editFacultyQuery, setEditFacultyQuery] = useState('');
    const [editFacultyResults, setEditFacultyResults] = useState([]);
    const [isSearchingEditFaculty, setIsSearchingEditFaculty] = useState(false);
    const [selectedEditFaculty, setSelectedEditFaculty] = useState(null);
    const [editFacultyName, setEditFacultyName] = useState('');
    const [editFacultyEmail, setEditFacultyEmail] = useState('');

    const handleCreateClub = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const res = await createClub(data);
            showNotification(res.data?.message || 'Club registered successfully!', 'success');
            e.target.reset();
            setIsCreateClubModalOpen(false);
            const createdClub = res.data?.club || {};
            const slug = createdClub.slug || data.clubName.toLowerCase().replace(/[^a-z0-9]/g, '');
            setCreatedClubCredentials({
                clubId: createdClub._id || createdClub.id,
                clubName: createdClub.clubName || data.clubName,
                slug,
                clubEmail: createdClub.clubEmail || data.clubEmail,
                facultyEmail: createdClub.facultyEmail || selectedCreateFaculty?.email || null,
                facultyName: createdClub.facultyName || selectedCreateFaculty?.name || null,
                rawClub: createdClub,
            });
            setSelectedCreateFaculty(null);
            setCreateFacultyName('');
            setCreateFacultyEmail('');
            setCreateFacultyQuery('');
            setCreateFacultyResults([]);
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
            const res = await assignClubHead(clubId, {
                studentId: selectedStudentToAssign.id,
                position: headPosition.trim() || undefined,
            });
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
            setHeadPosition('President');
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

    // Search faculty for Coordinator assignment
    const handleSearchFaculty = async (q) => {
        setFacultyQuery(q);
        if (!q || q.trim().length < 2) {
            setFacultySearchResults([]);
            return;
        }
        setIsSearchingFaculty(true);
        try {
            const res = await searchFaculty(q.trim());
            setFacultySearchResults(res.data?.faculty || []);
        } catch (err) {
            console.error('Faculty search failed:', err);
        } finally {
            setIsSearchingFaculty(false);
        }
    };

    const handleSearchCreateFaculty = async (q) => {
        setCreateFacultyQuery(q);
        if (!q || q.trim().length < 2) {
            setCreateFacultyResults([]);
            return;
        }
        setIsSearchingCreateFaculty(true);
        try {
            const res = await searchFaculty(q.trim());
            setCreateFacultyResults(res.data?.faculty || []);
        } catch (err) {
            console.error('Faculty search in create club failed:', err);
        } finally {
            setIsSearchingCreateFaculty(false);
        }
    };

    const handleSearchEditFaculty = async (q) => {
        setEditFacultyQuery(q);
        if (!q || q.trim().length < 2) {
            setEditFacultyResults([]);
            return;
        }
        setIsSearchingEditFaculty(true);
        try {
            const res = await searchFaculty(q.trim());
            setEditFacultyResults(res.data?.faculty || []);
        } catch (err) {
            console.error('Faculty search in edit club failed:', err);
        } finally {
            setIsSearchingEditFaculty(false);
        }
    };

    const openManageCoordinatorModal = (club) => {
        setSelectedClubForCoordinator(club);
        setFacultyQuery('');
        setFacultySearchResults([]);
        setSelectedFacultyToAssign(null);
        setIsCoordinatorModalOpen(true);
    };

    const handleAssignCoordinator = async () => {
        if (!selectedClubForCoordinator || !selectedFacultyToAssign) return;
        setIsSubmittingCoordinator(true);
        const clubId = selectedClubForCoordinator._id || selectedClubForCoordinator.id;
        try {
            const res = await addClubFacultyCoordinator(clubId, {
                facultyId: selectedFacultyToAssign.id,
                facultyEmail: selectedFacultyToAssign.email,
                facultyName: selectedFacultyToAssign.name,
                department: selectedFacultyToAssign.department,
            });
            showNotification(res.data?.message || `Assigned ${selectedFacultyToAssign.name} as Faculty Coordinator`, 'success');

            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
            if (refreshStats) refreshStats();

            const updatedClub = clubsRes.data.find(c => (c._id || c.id) === clubId);
            if (updatedClub) {
                setSelectedClubForCoordinator(updatedClub);
            }
            setSelectedFacultyToAssign(null);
            setFacultyQuery('');
            setFacultySearchResults([]);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to assign faculty coordinator', 'error');
        } finally {
            setIsSubmittingCoordinator(false);
        }
    };

    const handleRemoveCoordinator = async (facultyId, facultyName) => {
        if (!selectedClubForCoordinator || !facultyId) return;
        if (!window.confirm(`Remove ${facultyName || 'this coordinator'} from ${selectedClubForCoordinator.clubName}?`)) {
            return;
        }
        setRemovingCoordinatorId(facultyId);
        const clubId = selectedClubForCoordinator._id || selectedClubForCoordinator.id;
        try {
            const res = await removeClubFacultyCoordinator(clubId, facultyId);
            showNotification(res.data?.message || 'Faculty coordinator removed successfully', 'success');

            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
            if (refreshStats) refreshStats();

            const updatedClub = clubsRes.data.find(c => (c._id || c.id) === clubId);
            if (updatedClub) {
                setSelectedClubForCoordinator(updatedClub);
            }
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to remove faculty coordinator', 'error');
        } finally {
            setRemovingCoordinatorId(null);
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
                    className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
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
                                <Td className="text-neutral-300 dark:text-neutral-600 text-xs">{idx + 1}</Td>
                                <Td>
                                    <div className="space-y-0.5">
                                        <p className="font-semibold text-black dark:text-white">{club.clubName}</p>
                                        <p className="text-[11px] text-neutral-400">{club.clubEmail || `${club.slug}@nitj.ac.in`}</p>
                                    </div>
                                </Td>
                                <Td>
                                    {(() => {
                                        const coordinators = (club.facultyCoordinators && club.facultyCoordinators.length > 0)
                                            ? club.facultyCoordinators
                                            : (fc ? [{ ...fc, _id: fc.id }] : (club.facultyName ? [{ name: club.facultyName, email: club.facultyEmail }] : []));
                                        
                                        return (
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1.5 min-w-0">
                                                    {coordinators.length > 0 ? (
                                                        coordinators.map((c, cIdx) => (
                                                            <div key={c.id || c._id || cIdx} className="space-y-0.5 border-b border-neutral-100 dark:border-zinc-800/60 pb-1 last:border-0 last:pb-0">
                                                                <p className="font-medium text-black dark:text-white flex items-center gap-1.5 text-xs truncate">
                                                                    <span>{c.name}</span>
                                                                    {coordinators.length > 1 && (
                                                                        <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold shrink-0">
                                                                            #{cIdx + 1}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-[11px] text-neutral-400  truncate">{c.email}</p>
                                                                {c.department && (
                                                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{c.department}</p>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-neutral-400 italic">No Coordinator Assigned</p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => openManageCoordinatorModal(club)}
                                                    className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0 border border-brand-200/70 dark:border-brand-900/40 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-100 dark:hover:bg-brand-900/60"
                                                    title="Manage Club Faculty Coordinators"
                                                >
                                                    {coordinators.length > 0 ? (coordinators.length > 1 ? `Manage (${coordinators.length})` : 'Manage') : 'Assign'}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </Td>
                                <Td>
                                    {headUser ? (
                                        <div className="flex items-center gap-3">
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-semibold text-black dark:text-white text-xs truncate">{headUser.name}</p>
                                                </div>
                                                <p className="text-[11px] text-neutral-400 truncate">
                                                    {headUser.rollNo || ''}{headUser.branch ? ` • ${headUser.branch}` : ''}
                                                </p>
                                                <p className="text-[10.5px] text-neutral-400 truncate">{headUser.email}</p>
                                                {headUser.phone && (
                                                    <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                                                        <Phone size={10} className="shrink-0" />
                                                        <span>{headUser.phone}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                                <AlertTriangle size={12} className="shrink-0" />
                                                <span>No Lead Assigned</span>
                                            </span>
                                        </div>
                                    )}
                                </Td>
                                <Td align="right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openManageHeadModal(club)}
                                            className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
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
                                            onClick={() => {
                                                setEditingClub(club);
                                                setEditFacultyName(club.facultyName || club.facultyCoordinator?.name || '');
                                                setEditFacultyEmail(club.facultyEmail || club.facultyCoordinator?.email || '');
                                                setEditFacultyQuery('');
                                                setEditFacultyResults([]);
                                                setSelectedEditFaculty(null);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setClubToDelete(club); setIsDeleteModalOpen(true); }}
                                            className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1"
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
                            <label className="block text-xs font-semibold uppercase tracking-wider text-cn-text-muted mb-2">
                                Current Active Student Lead
                            </label>
                            {selectedClubForHead.memberships?.[0]?.student ? (
                                (() => {
                                    const head = selectedClubForHead.memberships[0].student;
                                    return (
                                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold text-sm flex items-center justify-center border border-emerald-500/20 shrink-0 overflow-hidden">
                                                        {head.profileImage ? (
                                                            <img src={head.profileImage} alt={head.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            head.name?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-sm text-cn-text truncate">{head.name}</h4>
                                                            {selectedClubForHead.memberships?.[0]?.position && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30 shrink-0">
                                                                    {selectedClubForHead.memberships[0].position}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-cn-text-muted">{head.rollNo} • {head.branch || head.program || 'Student'}</p>
                                                        <p className="text-xs text-cn-text-secondary">{head.email}</p>
                                                        {head.phone && (
                                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                                                <Phone size={11} className="shrink-0" />
                                                                <span>{head.phone}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isRevokingHead || isSubmittingHead}
                                                    onClick={handleRevokeHead}
                                                    className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-200 dark:border-red-900/50 cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto disabled:opacity-50"
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
                        {!selectedStudentToAssign ? (
                            <div className="space-y-3 pt-2 border-t border-cn-border-subtle">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-cn-text-muted">
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
                                                    onClick={() => {
                                                        setSelectedStudentToAssign(student);
                                                        setStudentSearchResults([]);
                                                        setStudentQuery('');
                                                    }}
                                                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                                        isSelected
                                                            ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500/60'
                                                            : 'bg-cn-surface hover:bg-neutral-50 dark:hover:bg-zinc-800/60 border-cn-border'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold text-xs flex items-center justify-center border border-brand-500/20 shrink-0">
                                                            {student.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-xs text-cn-text truncate">{student.name}</p>
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300">
                                                                    {student.rollNo}
                                                                </span>
                                                                {student.currentHeadClub && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                                                                        Lead: {student.currentHeadClub.clubName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-neutral-400 truncate">
                                                                {student.branch || student.program || ''}{student.year ? ` • ${student.year}` : ''}
                                                            </p>
                                                            <p className="text-[10.5px] text-neutral-400 truncate">{student.email}</p>
                                                            {student.phone && (
                                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                                                    <Phone size={10} className="shrink-0" />
                                                                    <span>{student.phone}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedStudentToAssign(student);
                                                            setStudentSearchResults([]);
                                                            setStudentQuery('');
                                                        }}
                                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
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
                            </div>
                        ) : (
                            /* Candidate Selection Confirmation Box */
                            <div className="p-4 rounded-xl border border-brand-500/40 bg-brand-50/50 dark:bg-brand-950/30 space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                        <Sparkles size={12} /> Designated Candidate
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedStudentToAssign(null);
                                            setStudentQuery('');
                                            setStudentSearchResults([]);
                                        }}
                                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium"
                                    >
                                        Change Selection
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-sm flex items-center justify-center border border-brand-500/20 shrink-0">
                                        {selectedStudentToAssign.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-xs sm:text-sm text-cn-text truncate">{selectedStudentToAssign.name}</p>
                                        <p className="text-xs text-cn-text-muted font-mono">{selectedStudentToAssign.rollNo} • {selectedStudentToAssign.branch || selectedStudentToAssign.program || 'Student'}</p>
                                        <p className="text-xs text-cn-text-secondary">{selectedStudentToAssign.email}</p>
                                        {selectedStudentToAssign.phone && (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                                <Phone size={11} className="shrink-0" />
                                                <span>{selectedStudentToAssign.phone}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Position / Designation Input */}
                                <div className="space-y-1 pt-1">
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-cn-text-muted">
                                        Designation / Position (Display Only)
                                    </label>
                                    <input
                                        type="text"
                                        value={headPosition}
                                        onChange={(e) => setHeadPosition(e.target.value)}
                                        placeholder="e.g. President, Student Lead, Convenor"
                                        className="w-full px-3 py-2 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border rounded-xl text-xs text-cn-text placeholder:text-cn-text-muted outline-none focus:border-brand-500 transition-colors"
                                        maxLength={100}
                                    />
                                    <p className="text-[10px] text-cn-text-muted">
                                        Organizational title for frontend display. Does not alter backend permissions.
                                    </p>
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

                        {/* Modal Footer Actions */}
                        <div className="pt-3 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                disabled={isSubmittingHead || isRevokingHead}
                                onClick={() => {
                                    setIsHeadModalOpen(false);
                                    setSelectedClubForHead(null);
                                }}
                                className="px-4 py-2 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
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
                                    className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
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

            {/* Modal: Manage Faculty Coordinator */}
            {isCoordinatorModalOpen && selectedClubForCoordinator && (
                <Modal
                    onClose={() => {
                        if (!isSubmittingCoordinator && !removingCoordinatorId) {
                            setIsCoordinatorModalOpen(false);
                            setSelectedClubForCoordinator(null);
                        }
                    }}
                    title={`Faculty Coordinators: ${selectedClubForCoordinator.clubName}`}
                    subtitle="Manage multiple faculty coordinators and add new coordinators from the database."
                >
                    <div className="space-y-5 pt-1">
                        {/* Current Faculty Coordinators Display (Multiple) */}
                        <div>
                            {(() => {
                                const activeCoordinators = (selectedClubForCoordinator.facultyCoordinators && selectedClubForCoordinator.facultyCoordinators.length > 0)
                                    ? selectedClubForCoordinator.facultyCoordinators
                                    : (selectedClubForCoordinator.facultyCoordinator
                                        ? [{ ...selectedClubForCoordinator.facultyCoordinator, _id: selectedClubForCoordinator.facultyCoordinator.id }]
                                        : (selectedClubForCoordinator.facultyName ? [{ name: selectedClubForCoordinator.facultyName, email: selectedClubForCoordinator.facultyEmail }] : []));

                                return (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-cn-text-muted">
                                                Assigned Faculty Coordinators ({activeCoordinators.length})
                                            </label>
                                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                                Multiple Coordinators Supported
                                            </span>
                                        </div>

                                        {activeCoordinators.length > 0 ? (
                                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                                {activeCoordinators.map((fc, idx) => {
                                                    const facId = fc.id || fc._id;
                                                    const isRemoving = removingCoordinatorId === facId;
                                                    return (
                                                        <div key={facId || idx} className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold text-sm flex items-center justify-center border border-purple-500/20 shrink-0">
                                                                    {fc.name?.charAt(0).toUpperCase() || 'F'}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-semibold text-sm text-cn-text truncate">{fc.name}</h4>
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0">
                                                                            <GraduationCap size={11} /> #{idx + 1}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-cn-text-muted font-medium truncate">
                                                                        {fc.department || 'Faculty Member'}{fc.designation ? ` • ${fc.designation}` : ''}
                                                                    </p>
                                                                    <p className="text-xs text-cn-text-secondary font-mono truncate">{fc.email}</p>
                                                                </div>
                                                            </div>
                                                            {facId && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isRemoving || isSubmittingCoordinator}
                                                                    onClick={() => handleRemoveCoordinator(facId, fc.name)}
                                                                    className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/40 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 disabled:opacity-50"
                                                                    title="Remove coordinator from this club"
                                                                >
                                                                    {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                                    <span>Remove</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-3.5 rounded-xl border border-dashed border-neutral-300 dark:border-zinc-800 text-center">
                                                <p className="text-xs text-neutral-400">No faculty coordinators currently assigned to this club.</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Search & Add Another Faculty Coordinator Section */}
                        {!selectedFacultyToAssign ? (
                            <div className="space-y-3 pt-2 border-t border-cn-border-subtle">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-cn-text-muted">
                                    Add Another Faculty Coordinator
                                </label>
                                <div className="relative">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="text"
                                        value={facultyQuery}
                                        onChange={(e) => handleSearchFaculty(e.target.value)}
                                        placeholder="Search by faculty name, email, or department..."
                                        className="w-full pl-9 pr-9 py-2.5 bg-cn-surface dark:bg-cn-surface-elevated border border-cn-border rounded-xl text-xs sm:text-[13px] text-cn-text placeholder:text-cn-text-muted focus:border-brand-500 dark:focus:border-brand-400 outline-none transition-colors"
                                    />
                                    {facultyQuery && (
                                        <button
                                            type="button"
                                            onClick={() => { setFacultyQuery(''); setFacultySearchResults([]); }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Search Results Dropdown / List */}
                                {isSearchingFaculty ? (
                                    <div className="py-4 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Searching registered faculty table...</span>
                                    </div>
                                ) : facultySearchResults.length > 0 ? (
                                    <div className="max-h-52 overflow-y-auto space-y-1.5 border border-cn-border rounded-xl p-2 bg-cn-surface-muted/50">
                                        {facultySearchResults.map((fac) => {
                                            const isSelected = selectedFacultyToAssign?.id === fac.id;
                                            const otherClubs = (fac.coordinatedClubs || []).filter(
                                                c => String(c.id || c._id) !== String(selectedClubForCoordinator._id || selectedClubForCoordinator.id)
                                            );
                                            const isAlreadyCoordinatingOther = otherClubs.length > 0;
                                            return (
                                                <div
                                                    key={fac.id}
                                                    onClick={() => {
                                                        if (isAlreadyCoordinatingOther) return;
                                                        setSelectedFacultyToAssign(fac);
                                                        setFacultySearchResults([]);
                                                        setFacultyQuery('');
                                                    }}
                                                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                                                        isAlreadyCoordinatingOther
                                                            ? 'opacity-65 bg-neutral-50 dark:bg-zinc-800/40 border-cn-border cursor-not-allowed'
                                                            : isSelected
                                                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500/60 cursor-pointer'
                                                            : 'bg-cn-surface hover:bg-neutral-50 dark:hover:bg-zinc-800/60 border-cn-border cursor-pointer'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-xs flex items-center justify-center border border-purple-500/20 shrink-0">
                                                            {fac.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-xs text-cn-text truncate">{fac.name}</p>
                                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                                                    {fac.department}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-neutral-400 font-mono truncate">{fac.email}</p>
                                                            {isAlreadyCoordinatingOther ? (
                                                                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                                                                    Already Coordinates: {otherClubs.map(c => c.clubName).join(', ')}
                                                                </p>
                                                            ) : fac.coordinatedClubs?.length > 0 ? (
                                                                <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                                                                    Already coordinator for this club
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={isAlreadyCoordinatingOther}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isAlreadyCoordinatingOther) return;
                                                            setSelectedFacultyToAssign(fac);
                                                            setFacultySearchResults([]);
                                                            setFacultyQuery('');
                                                        }}
                                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors shrink-0 ${
                                                            isAlreadyCoordinatingOther
                                                                ? 'bg-neutral-100 dark:bg-zinc-800 text-neutral-400 cursor-not-allowed border border-neutral-200 dark:border-zinc-700'
                                                                : isSelected
                                                                ? 'bg-purple-600 text-white cursor-pointer'
                                                                : 'bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-cn-text cursor-pointer'
                                                        }`}
                                                    >
                                                        {isAlreadyCoordinatingOther ? 'Unavailable' : isSelected ? 'Selected' : 'Select'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : facultyQuery.trim().length >= 2 ? (
                                    <p className="text-xs text-neutral-400 text-center py-3">
                                        No faculty members found matching "{facultyQuery}".
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            /* Candidate Selection Confirmation Box */
                            <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-50/50 dark:bg-purple-950/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                        <Sparkles size={12} /> Selected Coordinator Candidate
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFacultyToAssign(null);
                                            setFacultyQuery('');
                                            setFacultySearchResults([]);
                                        }}
                                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline cursor-pointer font-medium"
                                    >
                                        Change Selection
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-sm flex items-center justify-center border border-purple-500/20 shrink-0">
                                        {selectedFacultyToAssign.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-xs sm:text-sm text-cn-text truncate">{selectedFacultyToAssign.name}</p>
                                        <p className="text-xs text-cn-text-muted">{selectedFacultyToAssign.department}{selectedFacultyToAssign.designation ? ` • ${selectedFacultyToAssign.designation}` : ''}</p>
                                        <p className="text-xs text-cn-text-secondary font-mono">{selectedFacultyToAssign.email}</p>
                                    </div>
                                </div>
                                {(() => {
                                    const otherClubs = (selectedFacultyToAssign.coordinatedClubs || []).filter(
                                        c => String(c.id || c._id) !== String(selectedClubForCoordinator._id || selectedClubForCoordinator.id)
                                    );
                                    if (otherClubs.length > 0) {
                                        return (
                                            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-700 dark:text-red-400 flex items-start gap-1.5">
                                                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Cannot Assign:</strong> {selectedFacultyToAssign.name} is already the Faculty Coordinator for <strong>{otherClubs[0].clubName}</strong>. A faculty member can only coordinate one club at a time.
                                                </span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-800 dark:text-purple-300 flex items-start gap-1.5">
                                            <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                                            <span>
                                                Assigning will add <strong>{selectedFacultyToAssign.name}</strong> as a faculty coordinator with review and management rights for <strong>{selectedClubForCoordinator.clubName}</strong>.
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Modal Footer Actions */}
                        <div className="pt-3 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                disabled={isSubmittingCoordinator || !!removingCoordinatorId}
                                onClick={() => {
                                    setIsCoordinatorModalOpen(false);
                                    setSelectedClubForCoordinator(null);
                                    setSelectedFacultyToAssign(null);
                                    setFacultyQuery('');
                                    setFacultySearchResults([]);
                                }}
                                className="px-4 py-2 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Close
                            </button>
                            {selectedFacultyToAssign && (
                                <button
                                    type="button"
                                    disabled={
                                        isSubmittingCoordinator ||
                                        !!removingCoordinatorId ||
                                        (selectedFacultyToAssign.coordinatedClubs || []).some(
                                            c => String(c.id || c._id) !== String(selectedClubForCoordinator._id || selectedClubForCoordinator.id)
                                        )
                                    }
                                    onClick={handleAssignCoordinator}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                                >
                                    {isSubmittingCoordinator ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            <span>Adding Coordinator...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck size={14} />
                                            <span>Confirm &amp; Add Coordinator</span>
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
                    onClose={() => {
                        setIsCreateClubModalOpen(false);
                        setCreateFacultyName('');
                        setCreateFacultyEmail('');
                        setSelectedCreateFaculty(null);
                        setCreateFacultyQuery('');
                        setCreateFacultyResults([]);
                    }}
                    title="Create New Club"
                >
                    <form onSubmit={handleCreateClub} className="space-y-4 pt-2">
                        <ModalFormField label="Club Name" name="clubName" placeholder="e.g. CodeX Society" required />
                        <ModalFormField label="Club Official Contact Email" name="clubEmail" type="email" placeholder="club@nitj.ac.in" required />

                        {/* Assign Existing Faculty Coordinator (Optional) */}
                        {selectedCreateFaculty ? (
                            <div className="p-3.5 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200/70 dark:border-brand-900/40 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                        <GraduationCap size={13} /> Selected Faculty Coordinator
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCreateFaculty(null);
                                            setCreateFacultyName('');
                                            setCreateFacultyEmail('');
                                        }}
                                        className="text-[11px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                                    >
                                        Remove / Change
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/20 shrink-0">
                                        {selectedCreateFaculty.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-xs text-cn-text truncate">{selectedCreateFaculty.name}</p>
                                        <p className="text-[11px] text-cn-text-muted truncate">{selectedCreateFaculty.department}</p>
                                        <p className="text-[11px] text-cn-text-secondary font-mono truncate">{selectedCreateFaculty.email}</p>
                                    </div>
                                </div>
                                <input type="hidden" name="facultyName" value={selectedCreateFaculty.name} />
                                <input type="hidden" name="facultyEmail" value={selectedCreateFaculty.email} />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-cn-text flex items-center gap-1.5">
                                    <GraduationCap size={14} className="text-brand-600 dark:text-brand-400" /> Faculty Coordinator <span className="text-cn-text-muted font-normal">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="text"
                                        value={createFacultyQuery}
                                        onChange={(e) => handleSearchCreateFaculty(e.target.value)}
                                        placeholder="Search registered faculty by name, email, or department..."
                                        className="w-full pl-8 pr-8 py-2 bg-white dark:bg-zinc-900 border border-cn-border rounded-lg text-xs text-cn-text placeholder:text-cn-text-muted outline-none focus:border-brand-500"
                                    />
                                    {createFacultyQuery && (
                                        <button
                                            type="button"
                                            onClick={() => { setCreateFacultyQuery(''); setCreateFacultyResults([]); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                {isSearchingCreateFaculty && (
                                    <p className="text-[11px] text-neutral-400 py-1 text-center flex items-center justify-center gap-1.5">
                                        <Loader2 size={12} className="animate-spin" /> Searching registered faculty...
                                    </p>
                                )}

                                {createFacultyResults.length > 0 && (
                                    <div className="max-h-36 overflow-y-auto space-y-1 border border-cn-border rounded-lg p-1.5 bg-white dark:bg-zinc-900">
                                        {createFacultyResults.map((fac) => {
                                            const isAlreadyCoordinating = fac.coordinatedClubs?.length > 0;
                                            return (
                                                <div
                                                    key={fac.id}
                                                    onClick={() => {
                                                        if (isAlreadyCoordinating) return;
                                                        setSelectedCreateFaculty(fac);
                                                        setCreateFacultyName(fac.name);
                                                        setCreateFacultyEmail(fac.email);
                                                        setCreateFacultyQuery('');
                                                        setCreateFacultyResults([]);
                                                    }}
                                                    className={`p-1.5 rounded flex items-center justify-between text-xs transition-colors ${
                                                        isAlreadyCoordinating
                                                            ? 'opacity-65 bg-neutral-50 dark:bg-zinc-800/40 cursor-not-allowed'
                                                            : 'hover:bg-neutral-100 dark:hover:bg-zinc-800 cursor-pointer'
                                                    }`}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-cn-text truncate">{fac.name} <span className="text-[10px] text-neutral-400">({fac.department})</span></p>
                                                        <p className="text-[10.5px] text-neutral-400 truncate">{fac.email}</p>
                                                        {isAlreadyCoordinating && (
                                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                                                Already coordinates: {fac.coordinatedClubs.map(c => c.clubName).join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-semibold shrink-0 ml-2 ${
                                                        isAlreadyCoordinating ? 'text-neutral-400' : 'text-brand-600 dark:text-brand-400'
                                                    }`}>
                                                        {isAlreadyCoordinating ? 'Unavailable' : 'Select'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                onClick={() => setIsCreateClubModalOpen(false)}
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
                >
                    <div className="space-y-4 pt-2">
                        {/* Club Summary */}
                        <div className="p-4 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 rounded-xl space-y-2">
                            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                <Shield size={14} className="shrink-0" /> Registered Club Information
                            </p>
                            <div className="text-xs space-y-1.5 text-cn-text-secondary">
                                <p><strong className="text-cn-text">Club Name:</strong> {createdClubCredentials.clubName}</p>
                                <p><strong className="text-cn-text">Club Identifier:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-semibold text-cn-text">{createdClubCredentials.slug}</code></p>
                                <p><strong className="text-cn-text">Official Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-semibold text-cn-text">{createdClubCredentials.clubEmail}</code></p>
                            </div>
                        </div>

                        {/* Assigned Faculty Coordinator */}
                        {createdClubCredentials.facultyEmail ? (
                            <>
                                <div className="p-4 bg-cn-surface-muted border border-cn-border rounded-xl space-y-2">
                                    <p className="text-xs font-semibold text-cn-text flex items-center gap-1.5">
                                        <GraduationCap size={14} className="shrink-0" /> Assigned Faculty Coordinator
                                    </p>
                                    <div className="text-xs space-y-1.5 text-cn-text-secondary">
                                        <p><strong className="text-cn-text">Coordinator:</strong> {createdClubCredentials.facultyName}</p>
                                        <p><strong className="text-cn-text">Faculty Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-semibold text-cn-text">{createdClubCredentials.facultyEmail}</code></p>
                                        <p className="text-[11px] text-cn-text-muted pt-1">
                                            Coordinator governance privileges are linked directly to their existing faculty account (<span className="font-mono text-cn-text font-semibold">/login</span>). No new account or separate password is required.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-start gap-2.5">
                                    <Mail size={15} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                        An official appointment email has been dispatched to <span className="font-semibold">{createdClubCredentials.facultyEmail}</span> with club coordinator access details.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="p-4 bg-cn-surface-muted border border-cn-border rounded-xl space-y-1.5">
                                <p className="text-xs font-semibold text-cn-text flex items-center gap-1.5">
                                    <GraduationCap size={14} className="shrink-0" /> Faculty Coordinator
                                </p>
                                <p className="text-xs text-cn-text-secondary">
                                    No Faculty Coordinator assigned yet. You can assign an existing registered faculty member anytime from the clubs table.
                                </p>
                            </div>
                        )}

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {!createdClubCredentials.facultyEmail && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const clubObj = clubHeads.find(c => (c._id || c.id) === createdClubCredentials.clubId) || createdClubCredentials.rawClub;
                                            setCreatedClubCredentials(null);
                                            if (clubObj) {
                                                openManageCoordinatorModal(clubObj);
                                            }
                                        }}
                                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                                    >
                                        <GraduationCap size={14} />
                                        <span>Assign Coordinator</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const clubObj = clubHeads.find(c => (c._id || c.id) === createdClubCredentials.clubId) || createdClubCredentials.rawClub;
                                        setCreatedClubCredentials(null);
                                        if (clubObj) {
                                            openManageHeadModal(clubObj);
                                        }
                                    }}
                                    className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                                >
                                    <UserPlus size={14} />
                                    <span>Assign Student Lead</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setCreatedClubCredentials(null)}
                                className="px-5 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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

                        {/* Quick Live Search from FacultyUser table */}
                        <div className="p-3 bg-cn-surface-muted border border-cn-border rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-cn-text flex items-center gap-1.5">
                                    <Search size={13} className="text-brand-600 dark:text-brand-400" /> Search Faculty Table to Reassign
                                </label>
                                {selectedEditFaculty && (
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 size={11} /> Reassigned
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    value={editFacultyQuery}
                                    onChange={(e) => handleSearchEditFaculty(e.target.value)}
                                    placeholder="Type to search faculty by name, email, or department..."
                                    className="w-full pl-8 pr-8 py-2 bg-white dark:bg-zinc-900 border border-cn-border rounded-lg text-xs text-cn-text placeholder:text-cn-text-muted outline-none focus:border-brand-500"
                                />
                                {editFacultyQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditFacultyQuery(''); setEditFacultyResults([]); }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {isSearchingEditFaculty ? (
                                <p className="text-[11px] text-neutral-400 py-1 text-center flex items-center justify-center gap-1.5">
                                    <Loader2 size={12} className="animate-spin" /> Searching faculty table...
                                </p>
                            ) : editFacultyResults.length > 0 ? (
                                <div className="max-h-36 overflow-y-auto space-y-1 border border-cn-border rounded-lg p-1.5 bg-white dark:bg-zinc-900">
                                    {editFacultyResults.map((fac) => {
                                        const otherClubs = (fac.coordinatedClubs || []).filter(
                                            (c) => c.id !== (editingClub._id || editingClub.id)
                                        );
                                        const isAlreadyCoordinatingOther = otherClubs.length > 0;
                                        return (
                                            <div
                                                key={fac.id}
                                                onClick={() => {
                                                    if (isAlreadyCoordinatingOther) return;
                                                    setSelectedEditFaculty(fac);
                                                    setEditFacultyName(fac.name);
                                                    setEditFacultyEmail(fac.email);
                                                    setEditFacultyQuery('');
                                                    setEditFacultyResults([]);
                                                }}
                                                className={`p-1.5 rounded flex items-center justify-between text-xs transition-colors ${
                                                    isAlreadyCoordinatingOther
                                                        ? 'opacity-65 bg-neutral-50 dark:bg-zinc-800/40 cursor-not-allowed'
                                                        : 'hover:bg-neutral-100 dark:hover:bg-zinc-800 cursor-pointer'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-medium text-cn-text truncate">{fac.name} <span className="text-[10px] text-neutral-400">({fac.department})</span></p>
                                                    <p className="text-[10.5px] text-neutral-400 truncate">{fac.email}</p>
                                                    {isAlreadyCoordinatingOther && (
                                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                                            Already coordinates: {otherClubs.map(c => c.clubName).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-semibold shrink-0 ml-2 ${
                                                    isAlreadyCoordinatingOther ? 'text-neutral-400' : 'text-brand-600 dark:text-brand-400'
                                                }`}>
                                                    {isAlreadyCoordinatingOther ? 'Unavailable' : 'Select'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>

                        <ModalFormField
                            label="Faculty Coordinator Name"
                            name="facultyName"
                            value={editFacultyName}
                            onChange={(e) => setEditFacultyName(e.target.value)}
                            required
                        />
                        <ModalFormField
                            label="Faculty Coordinator Email"
                            name="facultyEmail"
                            type="email"
                            value={editFacultyEmail}
                            onChange={(e) => setEditFacultyEmail(e.target.value)}
                            required
                        />
                        <ModalFormField label="Club Contact Email" name="clubEmail" type="email" defaultValue={editingClub.clubEmail} required />

                        <div className="p-3 bg-cn-surface-muted border border-cn-border rounded-xl text-xs text-cn-text-secondary space-y-1">
                            <p className="font-medium text-cn-text flex items-center gap-1.5">
                                <GraduationCap size={13} className="text-brand-600 dark:text-brand-400" /> Faculty Coordinator Note
                            </p>
                            <p>
                                Changing the faculty coordinator will reassign governance permissions to their existing faculty account (<span className="font-mono text-cn-text font-semibold">/login</span>). Faculty members must already have an account on CampusNode.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => { setIsEditModalOpen(false); setEditingClub(null); }}
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
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
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDeleteClub}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-xs"
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
