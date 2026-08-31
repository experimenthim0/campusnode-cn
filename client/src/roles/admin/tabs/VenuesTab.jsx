import React, { useState } from 'react';
import { createVenue, toggleVenueStatus, updateVenue, deleteVenue } from '../../../services/adminService';
import { Search, Building2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { DataTable, Th, Td, FilterSelect, Modal } from '../components/AdminUI';
import { useNotification } from '../../../context/NotificationContext';

const VenuesTab = ({
    venues = [],
    setVenues,
    venuesLoading,
    fetchVenues,
    isAddVenueModalOpen,
    setIsAddVenueModalOpen
}) => {
    const { showNotification } = useNotification();
    const [venueSearch, setVenueSearch] = useState('');
    const [venueStatusFilter, setVenueStatusFilter] = useState('all');
    const [openMenuVenueId, setOpenMenuVenueId] = useState(null);

    const [newVenueName, setNewVenueName] = useState('');
    const [newVenueIsOpen, setNewVenueIsOpen] = useState(true);
    const [isCreatingVenue, setIsCreatingVenue] = useState(false);

    const [editingVenue, setEditingVenue] = useState(null);
    const [isEditVenueModalOpen, setIsEditVenueModalOpen] = useState(false);

    const handleCreateVenue = async (e) => {
        e.preventDefault();
        if (!newVenueName.trim()) {
            showNotification('Please enter a venue name', 'warning');
            return;
        }
        setIsCreatingVenue(true);
        try {
            const res = await createVenue({
                name: newVenueName.trim(),
                isOpen: newVenueIsOpen,
            });
            showNotification(`Venue "${res.data.name}" created successfully`, 'success');
            setNewVenueName('');
            setNewVenueIsOpen(true);
            setIsAddVenueModalOpen(false);
            fetchVenues();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to create venue', 'error');
        } finally {
            setIsCreatingVenue(false);
        }
    };

    const handleToggleVenueStatus = async (venue) => {
        try {
            const res = await toggleVenueStatus(venue.id);
            const statusStr = res.data.isOpen ? 'Open for Event' : 'Closed / Unavailable';
            showNotification(`Venue "${venue.name}" is now ${statusStr}`, 'success');
            setVenues(prev => prev.map(v => v.id === venue.id ? res.data : v));
        } catch (err) {
            showNotification('Failed to update venue status', 'error');
        }
    };

    const handleUpdateVenue = async (e) => {
        e.preventDefault();
        if (!editingVenue || !editingVenue.name.trim()) return;
        try {
            const res = await updateVenue(editingVenue.id, {
                name: editingVenue.name.trim(),
                isOpen: editingVenue.isOpen,
            });
            showNotification(`Venue "${res.data.name}" updated successfully`, 'success');
            setIsEditVenueModalOpen(false);
            setEditingVenue(null);
            fetchVenues();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update venue', 'error');
        }
    };

    const handleDeleteVenue = async (venue) => {
        if (!window.confirm(`Are you sure you want to delete venue "${venue.name}"?`)) return;
        try {
            await deleteVenue(venue.id);
            showNotification(`Venue "${venue.name}" deleted successfully`, 'success');
            setVenues(prev => prev.filter(v => v.id !== venue.id));
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to delete venue', 'error');
        }
    };

    const filteredVenues = venues.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(venueSearch.toLowerCase());
        const matchesStatus = venueStatusFilter === 'all' ||
            (venueStatusFilter === 'open' && v.isOpen) ||
            (venueStatusFilter === 'closed' && !v.isOpen);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0c] flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total Venues</p>
                        <p className="text-xl font-black text-black dark:text-white mt-0.5">{venues.length}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-zinc-800/70 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                        <Building2 size={16} />
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Open for Events</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{venues.filter(v => v.isOpen).length}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0c] flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Closed / Unavailable</p>
                        <p className="text-xl font-black text-neutral-600 dark:text-neutral-400 mt-0.5">{venues.filter(v => !v.isOpen).length}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-zinc-800/70 flex items-center justify-center text-neutral-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0a0a0a] p-2.5 border border-neutral-200 dark:border-zinc-800 rounded-2xl">
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            value={venueSearch}
                            onChange={(e) => setVenueSearch(e.target.value)}
                            placeholder="Search venue by name..."
                            className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange-600 dark:focus:border-orange-500 transition-colors text-neutral-900 dark:text-white"
                        />
                    </div>
                    <FilterSelect value={venueStatusFilter} onChange={(val) => setVenueStatusFilter(val)}>
                        <option value="all">All Availability Status</option>
                        <option value="open">Open Only</option>
                        <option value="closed">Closed Only</option>
                    </FilterSelect>
                </div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium px-2">
                    {filteredVenues.length} venues shown
                </span>
            </div>

            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th>Venue Name</Th>
                        <Th>Status</Th>
                        <Th align="right">Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {filteredVenues.map((v, idx) => (
                        <tr key={v.id || idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                            {/* Column 1: Venue Name */}
                            <Td className="py-4 font-semibold text-sm text-neutral-900 dark:text-white">
                                {v.name}
                            </Td>

                            {/* Column 2: Status (Badge + iOS Toggle Switch) */}
                            <Td className="py-4">
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wide rounded-full ${
                                        v.isOpen
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20'
                                            : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-zinc-700'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${v.isOpen ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                                        {v.isOpen ? 'Open' : 'Closed'}
                                    </span>

                                    {/* iOS Switch */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleVenueStatus(v)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            v.isOpen ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-zinc-700'
                                        }`}
                                        title={v.isOpen ? 'Click to Close Venue' : 'Click to Open Venue'}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                v.isOpen ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </Td>

                            {/* Column 3: Actions (Kebab Context Menu) */}
                            <Td align="right" className="py-4">
                                <div className="relative inline-block text-left">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuVenueId(openMenuVenueId === v.id ? null : v.id);
                                        }}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                        title="More actions"
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {openMenuVenueId === v.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setOpenMenuVenueId(null)}
                                            />
                                            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#141414] border border-neutral-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuVenueId(null);
                                                        setEditingVenue({ ...v });
                                                        setIsEditVenueModalOpen(true);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800/80 flex items-center gap-2 transition-colors cursor-pointer"
                                                >
                                                    <Edit2 size={13} className="text-neutral-400" />
                                                    <span>Edit Venue</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuVenueId(null);
                                                        handleDeleteVenue(v);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100 dark:border-zinc-800/80"
                                                >
                                                    <Trash2 size={13} className="text-red-500" />
                                                    <span>Delete Venue</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Td>
                        </tr>
                    ))}
                    {venues.length === 0 && (
                        <tr>
                            <td colSpan="3" className="px-5 py-16 text-center text-neutral-400 text-sm">
                                {venuesLoading ? 'Loading campus venues...' : 'No venues found.'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </DataTable>

            {isEditVenueModalOpen && editingVenue && (
                <Modal
                    onClose={() => { setIsEditVenueModalOpen(false); setEditingVenue(null); }}
                    title="Edit Campus Venue"
                    subtitle="Update venue name and availability status"
                >
                    <form onSubmit={handleUpdateVenue} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                                Venue Name <span className="text-orange-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={editingVenue.name}
                                onChange={(e) => setEditingVenue({ ...editingVenue, name: e.target.value })}
                                required
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] focus:border-orange-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                                Event Booking Status
                            </label>
                            <select
                                value={editingVenue.isOpen ? 'open' : 'closed'}
                                onChange={(e) => setEditingVenue({ ...editingVenue, isOpen: e.target.value === 'open' })}
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] font-semibold focus:border-orange-600 outline-none cursor-pointer"
                            >
                                <option value="open">Open for Event Booking</option>
                                <option value="closed">Closed / Unavailable</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => { setIsEditVenueModalOpen(false); setEditingVenue(null); }}
                                className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {isAddVenueModalOpen && (
                <Modal
                    onClose={() => setIsAddVenueModalOpen(false)}
                    title="Add New Campus Venue"
                    subtitle="Create a new venue and set its booking availability"
                >
                    <form onSubmit={handleCreateVenue} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                                Venue Name <span className="text-orange-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={newVenueName}
                                onChange={(e) => setNewVenueName(e.target.value)}
                                placeholder="e.g. Main Auditorium / SAC Ground"
                                required
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] focus:border-orange-600 outline-none transition-colors text-neutral-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                                Initial Availability Status
                            </label>
                            <select
                                value={newVenueIsOpen ? 'open' : 'closed'}
                                onChange={(e) => setNewVenueIsOpen(e.target.value === 'open')}
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] font-semibold focus:border-orange-600 outline-none cursor-pointer text-neutral-900 dark:text-white"
                            >
                                <option value="open">Open for Event Booking</option>
                                <option value="closed">Closed / Unavailable</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setIsAddVenueModalOpen(false)}
                                className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreatingVenue}
                                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-colors disabled:opacity-50"
                            >
                                {isCreatingVenue ? 'Adding...' : 'Add Venue'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default VenuesTab;
