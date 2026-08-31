import React, { useState } from 'react';
import api from '../../../services/api';
import { createClub, getClubsList } from '../../../services/adminService';
import { Plus, Key, CheckCircle2, Shield, GraduationCap, Mail } from 'lucide-react';
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
        
        try {
            await api.put(`/api/admin/clubs/${editingClub._id || editingClub.id}`, data);
            showNotification('Club updated successfully', 'success');
            setIsEditModalOpen(false);
            setEditingClub(null);
            const clubsRes = await getClubsList();
            setClubHeads(clubsRes.data);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update club', 'error');
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
                    className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
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
                                    <button
                                        onClick={() => { setEditingClub(club); setIsEditModalOpen(true); }}
                                        className="px-3 py-1.5 bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                    >
                                        Edit
                                    </button>
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

                        <div className="p-3.5 border border-orange-500/20 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 space-y-2">
                            <p className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                                <Key size={14} className="shrink-0" /> Automated Provisioning & Credentials
                            </p>
                            <div className="space-y-1.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                                    <p>
                                        <strong className="text-neutral-900 dark:text-neutral-100">Club Organizer:</strong> Logs in at <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">/login</span> using <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;clubEmail&gt;</code> &amp; password <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;slug&gt;@him0148</code>. Account is auto-verified.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0 mt-1.5" />
                                    <p>
                                        <strong className="text-neutral-900 dark:text-neutral-100">Faculty Coordinator:</strong> Logs in at <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">/login</span> using <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;facultyEmail&gt;</code> &amp; password <code className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono font-bold">&lt;slug&gt;@him0148</code> (or existing password).
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

                        <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setIsCreateClubModalOpen(false)}
                                className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Create Club & Users
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
                        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                                <Shield size={14} className="shrink-0" /> 1. Official Club Organizer Account (Auto-Verified)
                            </p>
                            <div className="text-xs space-y-1.5 text-neutral-700 dark:text-neutral-300">
                                <p><strong>Login Portal:</strong> <span className="font-mono text-orange-600 font-bold">/login</span></p>
                                <p><strong>Login Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold">{createdClubCredentials.clubEmail}</code></p>
                                <p><strong>Default Password:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold">{createdClubCredentials.defaultPassword}</code></p>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <CheckCircle2 size={12} className="shrink-0" /> Status: Pre-verified (no email verification barrier on login)
                                </p>
                            </div>
                        </div>

                        {/* Faculty Coordinator Account */}
                        <div className="p-4 bg-neutral-100 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl space-y-2">
                            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                                <GraduationCap size={14} className="shrink-0" /> 2. Faculty Coordinator Account
                            </p>
                            <div className="text-xs space-y-1.5 text-neutral-700 dark:text-neutral-300">
                                <p><strong>Login Portal:</strong> <span className="font-mono text-neutral-900 dark:text-neutral-100 font-bold">/admin-secret-login</span></p>
                                <p><strong>Coordinator Name:</strong> {createdClubCredentials.facultyName}</p>
                                <p><strong>Coordinator Email:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold">{createdClubCredentials.facultyEmail}</code></p>
                                <p><strong>Default Password:</strong> <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-bold">{createdClubCredentials.defaultPassword}</code> <span className="text-neutral-400">(or existing password if already registered)</span></p>
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
                                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Edit Club */}
            {isEditModalOpen && editingClub && (
                <Modal onClose={() => { setIsEditModalOpen(false); setEditingClub(null); }} title="Edit Registered Club">
                    <form onSubmit={handleUpdateClub} className="space-y-4 pt-2">
                        <ModalFormField label="Club Name" name="clubName" defaultValue={editingClub.clubName} required />
                        <ModalFormField label="Faculty Coordinator Name" name="facultyName" defaultValue={editingClub.facultyName || editingClub.facultyCoordinator?.name} required />
                        <ModalFormField label="Faculty Coordinator Email" name="facultyEmail" type="email" defaultValue={editingClub.facultyEmail || editingClub.facultyCoordinator?.email} required />
                        <ModalFormField label="Club Email Account" name="clubEmail" type="email" defaultValue={editingClub.clubEmail || editingClub.memberships?.[0]?.student?.email} required />

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingClub(null); }} className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                Cancel
                            </button>
                            <button type="submit" className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default ClubsTab;
