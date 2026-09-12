import React, { useState } from 'react';
import api from '../../../services/api';
import { assignCoordinator, getCoordinators } from '../../../services/adminService';
import { Plus } from 'lucide-react';
import { DataTable, Th, Td, Modal, ModalFormField } from '../components/AdminUI';
import { useNotification } from '../../../context/NotificationContext';

const CoordinatorsTab = ({
    coordinators = [],
    setCoordinators,
    isAddCoordModalOpen,
    setIsAddCoordModalOpen
}) => {
    const { showNotification } = useNotification();
    const [isCoordModalOpen, setIsCoordModalOpen] = useState(false);
    const [editingCoord, setEditingCoord] = useState(null);

    const handleCreateCoord = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await assignCoordinator(data);
            showNotification('Coordinator created successfully', 'success');
            e.target.reset();
            setIsAddCoordModalOpen(false);
            const coordsRes = await getCoordinators();
            setCoordinators(coordsRes.data);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to create coordinator', 'error');
        }
    };

    const handleUpdateCoord = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await api.put(`/api/admin/coordinators/${editingCoord._id || editingCoord.id}`, data);
            showNotification('Coordinator updated successfully', 'success');
            setIsCoordModalOpen(false);
            setEditingCoord(null);
            const coordsRes = await getCoordinators();
            setCoordinators(coordsRes.data);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update coordinator', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-cn-surface border border-cn-border">
                <div>
                    <h2 className="text-base font-black text-cn-text tracking-wide">Faculty Coordinators</h2>
                    <p className="text-xs text-cn-text-muted font-medium">Manage faculty coordinator accounts overseeing campus clubs and approving events.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsAddCoordModalOpen(true)}
                    className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
                >
                    <Plus size={16} />
                    <span>Add New Coordinator</span>
                </button>
            </div>

            {/* List: Existing Coordinators */}
            <DataTable>
                <thead>
                    <tr className="border-b border-cn-border">
                        <Th>#</Th>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th align="right">Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {coordinators.map((c, idx) => (
                        <tr key={c._id || c.id || idx} className="border-b border-cn-border-subtle hover:bg-cn-surface-muted transition-colors">
                            <Td className="text-cn-text-muted">{idx + 1}</Td>
                            <Td className="font-bold text-cn-text">{c.name}</Td>
                            <Td className="text-cn-text-muted">{c.email}</Td>
                            <Td align="right">
                                <button
                                    onClick={() => { setEditingCoord(c); setIsCoordModalOpen(true); }}
                                    className="px-3 py-1.5 bg-cn-surface-muted text-cn-text text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-cn-surface-elevated transition-colors cursor-pointer"
                                >
                                    Edit
                                </button>
                            </Td>
                        </tr>
                    ))}
                    {coordinators.length === 0 && (
                        <tr><td colSpan="4" className="px-5 py-16 text-center text-cn-text-muted text-sm">No coordinators found.</td></tr>
                    )}
                </tbody>
            </DataTable>

            {/* Modal: Create Coordinator */}
            {isAddCoordModalOpen && (
                <Modal
                    onClose={() => setIsAddCoordModalOpen(false)}
                    title="Create Coordinator"
                    subtitle="Add faculty coordinator accounts to oversee club activities."
                >
                    <form onSubmit={handleCreateCoord} className="space-y-4 pt-2">
                        <ModalFormField label="Full Name" name="name" placeholder="Full Name" required />
                        <ModalFormField label="Email Address" name="email" type="email" placeholder="Email Address" required />
                        <ModalFormField label="Password" name="password" type="password" placeholder="Password (default: coordinator123)" />

                        <div className="pt-4 flex justify-end gap-3 border-t border-cn-border-subtle">
                            <button
                                type="button"
                                onClick={() => setIsAddCoordModalOpen(false)}
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Create Coordinator
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {isCoordModalOpen && editingCoord && (
                <Modal
                    onClose={() => { setIsCoordModalOpen(false); setEditingCoord(null); }}
                    title="Edit Coordinator"
                    subtitle={`Editing details for ${editingCoord.name}`}
                >
                    <form onSubmit={handleUpdateCoord} className="space-y-4 pt-2">
                        <ModalFormField label="Full Name" name="name" defaultValue={editingCoord.name} required />
                        <ModalFormField label="Email Address" name="email" type="email" defaultValue={editingCoord.email} required />
                        <ModalFormField label="New Password (optional)" name="password" type="password" placeholder="Leave blank to keep current" />
                        <div className="flex justify-end gap-3 pt-3 border-t border-cn-border-subtle">
                            <button 
                                type="button" 
                                onClick={() => { setIsCoordModalOpen(false); setEditingCoord(null); }} 
                                className="px-4 py-2.5 bg-transparent hover:bg-cn-surface-muted text-cn-text border border-cn-border text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default CoordinatorsTab;
