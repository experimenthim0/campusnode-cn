import React, { useState } from 'react';
import api from '../../../services/api';
import { createClub, updateClub, deleteClub, getClubsList } from '../../../services/adminService';
import { Plus, Key, CheckCircle2, Shield, GraduationCap, Mail, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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

    const handleCreateClub = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const res = await createClub(data);
            showNotification('Club and users created successfully!', 'success');
            e.target.reset();
            setIsCreateClubModalOpen(false);
            const slug = res.data?.club?.slug || data.clubName.toLowerCase().replace(/[^a-z0-9]/g, '');
            setCreatedClubCredentials({
                clubName: data.clubName,
                slug,
                clubEmail: data.clubEmail,
                facultyEmail: data.facultyEmail,
                facultyName: data.facultyName,
                defaultPassword: `${slug}@him0148`,
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

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-zinc-800">
                <div>
                    <h2 className="text-base font-black text-black dark:text-white tracking-wide">Registered Clubs</h2>
                    <p className="text-xs text-neutral-400 font-medium">Manage registered student clubs, faculty coordinators, and club head accounts.</p>
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
                        <Th>Club Head Account</Th>
                        <Th align="right">Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {clubHeads.map((club, idx) => {
                        const headUser = club.memberships?.[0]?.student;
                        const fc = club.facultyCoordinator;
                        return (
                            <tr key={club._id || club.id || idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <Td className="text-neutral-300 dark:text-neutral-600">{idx + 1}</Td>
                                <Td className="font-bold text-black dark:text-white">{club.clubName}</Td>
                                <Td>
                                    <p className="font-semibold text-black dark:text-white">{fc?.name || club.facultyName || 'N/A'}</p>
                                    <p className="text-[11px] text-neutral-400">{fc?.email || club.facultyEmail || ''}</p>
                                </Td>
                                <Td>
                                    <p className="font-semibold text-black dark:text-white">{headUser?.name || club.clubName.toUpperCase()}</p>
                                    <p className="text-[11px] text-neutral-400">{headUser?.email || club.clubEmail || ''}</p>
                                </Td>
                                <Td align="right">
                                    <div className="flex items-center justify-end gap-2">
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

            {/* Modal: Create Club */}
            {isCreateClubModalOpen && (
                <Modal
                    onClose={() => setIsCreateClubModalOpen(false)}
                    title="Create New Club"
                    subtitle="Will automatically generate head user and faculty coordinator credentials."
                >
                    <form onSubmit={handleCreateClub} className="space-y-4 pt-2">
                        <ModalFormField label="Club Name" name="clubName" placeholder="e.g. CodeX" required />
                        <ModalFormField label="Faculty Coordinator Name" name="facultyName" placeholder="Faculty Name" required />
                        <ModalFormField label="Faculty Coordinator Email" name="facultyEmail" type="email" placeholder="Faculty Email" required />
                        <ModalFormField label="Club Email Account" name="clubEmail" type="email" placeholder="Club Email" required />

                        <div className="p-3.5 bg-[#FFF7ED] dark:bg-[#2A1A0F] border border-brand-200/60 dark:border-brand-900/40 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 space-y-2">
                            <p className="font-bold text-[#F97316] dark:text-[#FB923C] flex items-center gap-1.5">
                                <Key size={14} className="shrink-0" /> Automated Provisioning &amp; Credentials
                            </p>
                            <div className="space-y-1.5 text-[11px] leading-relaxed text-[#555555] dark:text-[#B5B5B5]">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0 mt-1.5" />
                                    <p>
                                        <strong className="text-[#111111] dark:text-[#F5F5F5]">Club Organizer:</strong> Logs in at <span className="font-mono font-semibold text-[#F97316] dark:text-[#FB923C]">/login</span> using <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;clubEmail&gt;</code> &amp; password <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;slug&gt;@him0148</code>. Account is auto-verified.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0 mt-1.5" />
                                    <p>
                                        <strong className="text-[#111111] dark:text-[#F5F5F5]">Faculty Coordinator:</strong> Logs in at <span className="font-mono font-semibold text-[#111111] dark:text-[#F5F5F5]">/login</span> using <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;facultyEmail&gt;</code> &amp; password <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;slug&gt;@him0148</code> (or existing password).
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 pt-0.5">
                                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        Welcome &amp; credential emails will be dispatched to both email addresses automatically.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                            <button
                                type="button"
                                onClick={() => setIsCreateClubModalOpen(false)}
                                className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] text-[#111111] border border-[#E5E5E5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] dark:text-[#F5F5F5] dark:border-[#303030] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Create Club &amp; Users
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal: Created Club Credentials Summary */}
            {createdClubCredentials && (
                <Modal
                    onClose={() => setCreatedClubCredentials(null)}
                    title="Club Created & Accounts Provisioned"
                    subtitle="Account credentials and portal URLs for both roles are ready."
                >
                    <div className="space-y-4 pt-2">
                        {/* Club Head Account */}
                        <div className="p-4 bg-[#FFF7ED] dark:bg-[#2A1A0F] border border-brand-200/60 dark:border-brand-900/40 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-[#F97316] dark:text-[#FB923C] flex items-center gap-1.5">
                                <Shield size={14} className="shrink-0" /> 1. Official Club Organizer Account (Auto-Verified)
                            </p>
                            <div className="text-xs space-y-1.5 text-[#555555] dark:text-[#B5B5B5]">
                                <p><strong className="text-[#111111] dark:text-[#F5F5F5]">Login Portal:</strong> <span className="font-mono text-[#F97316] dark:text-[#FB923C] font-bold">/login</span></p>
                                <p><strong className="text-[#111111] dark:text-[#F5F5F5]">Login Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-[#111111] dark:text-[#F5F5F5]">{createdClubCredentials.clubEmail}</code></p>
                                <p><strong className="text-[#111111] dark:text-[#F5F5F5]">Default Password:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-[#111111] dark:text-[#F5F5F5]">{createdClubCredentials.defaultPassword}</code></p>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 size={12} className="shrink-0" /> Status: Pre-verified (no email verification barrier on login)
                                </p>
                            </div>
                        </div>

                        {/* Faculty Coordinator Account */}
                        <div className="p-4 bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl space-y-2">
                            <p className="text-xs font-bold text-[#111111] dark:text-[#F5F5F5] flex items-center gap-1.5">
                                <GraduationCap size={14} className="shrink-0" /> 2. Faculty Coordinator Account
                            </p>
                            <div className="text-xs space-y-1.5 text-[#555555] dark:text-[#B5B5B5]">
                                <p><strong className="text-[#111111] dark:text-[#F5F5F5]">Login Portal:</strong> <span className="font-mono text-[#111111] dark:text-[#F5F5F5] font-bold">/admin-secret-login</span></p>
                                <p><strong className="text-[#111111] dark:text-[#F5F5F5]">Coordinator Name:</strong> {createdClubCredentials.facultyName}</p>
                                <p><strong className="text-[#111111] dark:text-[#F5F5F5]">Coordinator Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-[#111111] dark:text-[#F5F5F5]">{createdClubCredentials.facultyEmail}</code></p>
                                <p><strong className="text-[#111111] dark:text-[#F5F5F5]">Default Password:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold text-[#111111] dark:text-[#F5F5F5]">{createdClubCredentials.defaultPassword}</code> <span className="text-[#888888] dark:text-[#808080]">(or existing password if already registered)</span></p>
                            </div>
                        </div>

                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-start gap-2.5">
                            <Mail size={15} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                Onboarding emails with direct login buttons have been dispatched to both <span className="font-bold">{createdClubCredentials.clubEmail}</span> and <span className="font-bold">{createdClubCredentials.facultyEmail}</span>.
                            </p>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setCreatedClubCredentials(null)}
                                className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Edit Club */}
            {isEditModalOpen && editingClub && (
                <Modal onClose={() => { if (!isUpdating) { setIsEditModalOpen(false); setEditingClub(null); } }} title="Edit Registered Club" subtitle="Update club name, faculty coordinator assignment, or club login email.">
                    <form onSubmit={handleUpdateClub} className="space-y-4 pt-2">
                        <ModalFormField label="Club Name" name="clubName" defaultValue={editingClub.clubName} required />
                        <ModalFormField label="Faculty Coordinator Name" name="facultyName" defaultValue={editingClub.facultyName || editingClub.facultyCoordinator?.name} required />
                        <ModalFormField label="Faculty Coordinator Email" name="facultyEmail" type="email" defaultValue={editingClub.facultyEmail || editingClub.facultyCoordinator?.email} required />
                        <ModalFormField label="Club Email Account" name="clubEmail" type="email" defaultValue={editingClub.clubEmail || editingClub.memberships?.[0]?.student?.email} required />

                        <div className="p-3 bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl text-xs text-[#555555] dark:text-[#B5B5B5] space-y-1">
                            <p className="font-semibold text-[#111111] dark:text-[#F5F5F5] flex items-center gap-1.5">
                                <GraduationCap size={13} className="text-[#F97316] dark:text-[#FB923C]" /> Faculty Coordinator Note
                            </p>
                            <p>
                                Changing the faculty coordinator email will automatically reassign governance permissions or provision a new coordinator account. Student accounts cannot be assigned as faculty coordinators.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => { setIsEditModalOpen(false); setEditingClub(null); }}
                                className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] text-[#111111] border border-[#E5E5E5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] dark:text-[#F5F5F5] dark:border-[#303030] text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                                You are about to permanently delete <strong className="text-[#111111] dark:text-[#F5F5F5]">"{clubToDelete.clubName}"</strong>.
                            </p>
                            <ul className="text-xs text-[#555555] dark:text-[#B5B5B5] space-y-1 list-disc list-inside">
                                <li>All events, registrations, and attendances under this club will be removed</li>
                                <li>Official club login account (<code className="font-mono font-bold text-[#111111] dark:text-[#F5F5F5]">{clubToDelete.clubEmail || clubToDelete.account?.email || 'N/A'}</code>) will be deleted</li>
                                <li>Announcements, achievements, gallery media, and member roles will be deleted</li>
                            </ul>
                        </div>

                        <div className="pt-2 flex justify-end gap-3 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => { setIsDeleteModalOpen(false); setClubToDelete(null); }}
                                className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] text-[#111111] border border-[#E5E5E5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] dark:text-[#F5F5F5] dark:border-[#303030] text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
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
