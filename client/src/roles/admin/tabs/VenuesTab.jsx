import React, { useState } from 'react';
import { createVenue, toggleVenueStatus, updateVenue, deleteVenue } from '../../../services/adminService';
import { Search, Building2, Edit2, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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

    // Create Venue State
    const [newVenueName, setNewVenueName] = useState('');
    const [newVenueIsOpen, setNewVenueIsOpen] = useState(true);
    const [isCreatingVenue, setIsCreatingVenue] = useState(false);

    // Edit Venue State
    const [editingVenue, setEditingVenue] = useState(null);
    const [isEditVenueModalOpen, setIsEditVenueModalOpen] = useState(false);
    const [isUpdatingVenue, setIsUpdatingVenue] = useState(false);

    // Toggling in-progress map to prevent rapid spamming
    const [togglingVenueIds, setTogglingVenueIds] = useState({});

    const handleCreateVenue = async (e) => {
        e.preventDefault();
        const trimmedName = newVenueName.trim();
        if (!trimmedName) {
            showNotification('Please enter a venue name', 'warning');
            return;
        }

        setIsCreatingVenue(true);
        try {
            const res = await createVenue({
                name: trimmedName,
                isOpen: newVenueIsOpen,
            });
            const created = res.data;
            showNotification(`Venue "${created.name}" created successfully`, 'success');
            
            // Optimistically append and sort
            setVenues(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setNewVenueName('');
            setNewVenueIsOpen(true);
            setIsAddVenueModalOpen(false);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to create venue', 'error');
        } finally {
            setIsCreatingVenue(false);
        }
    };

    const handleToggleVenueStatus = async (venue) => {
        if (togglingVenueIds[venue.id]) return;

        const nextIsOpen = !venue.isOpen;
        const prevVenues = [...venues];

        // 1. Instant Optimistic UI Update
        setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, isOpen: nextIsOpen } : v));
        setTogglingVenueIds(prev => ({ ...prev, [venue.id]: true }));

        try {
            const res = await toggleVenueStatus(venue.id);
            const statusStr = res.data.isOpen ? 'Open for Events' : 'Closed / Unavailable';
            showNotification(`Venue "${venue.name}" is now ${statusStr}`, 'success');
            
            // Ensure synced with server response
            setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, ...res.data } : v));
        } catch (err) {
            // Revert optimistic update on failure
            setVenues(prevVenues);
            showNotification(err.response?.data?.message || 'Failed to update venue status', 'error');
        } finally {
            setTogglingVenueIds(prev => {
                const next = { ...prev };
                delete next[venue.id];
                return next;
            });
        }
    };

    const handleOpenEditModal = (venue) => {
        setEditingVenue({
            id: venue.id,
            name: venue.name,
            isOpen: Boolean(venue.isOpen),
        });
        setIsEditVenueModalOpen(true);
    };

    const handleUpdateVenue = async (e) => {
        e.preventDefault();
        if (!editingVenue || !editingVenue.name.trim()) {
            showNotification('Venue name cannot be empty', 'warning');
            return;
        }

        const trimmedName = editingVenue.name.trim();
        setIsUpdatingVenue(true);

        try {
            const res = await updateVenue(editingVenue.id, {
                name: trimmedName,
                isOpen: editingVenue.isOpen,
            });
            const updated = res.data;
            showNotification(`Venue "${updated.name}" updated successfully`, 'success');
            
            // Optimistically update venue in-place
            setVenues(prev =>
                prev.map(v => (v.id === updated.id ? { ...v, ...updated } : v))
                    .sort((a, b) => a.name.localeCompare(b.name))
            );

            setIsEditVenueModalOpen(false);
            setEditingVenue(null);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update venue', 'error');
        } finally {
            setIsUpdatingVenue(false);
        }
    };

    const handleDeleteVenue = async (venue) => {
        if (!window.confirm(`Are you sure you want to delete venue "${venue.name}"?`)) return;
        
        const prevVenues = [...venues];
        setVenues(prev => prev.filter(v => v.id !== venue.id));

        try {
            await deleteVenue(venue.id);
            showNotification(`Venue "${venue.name}" deleted successfully`, 'success');
        } catch (err) {
            setVenues(prevVenues);
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

    const openCount = venues.filter(v => v.isOpen).length;
    const closedCount = venues.filter(v => !v.isOpen).length;

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0c] flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total Campus Venues</p>
                        <p className="text-xl font-black text-black dark:text-white mt-0.5">{venues.length}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-zinc-800/70 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                        <Building2 size={16} />
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Open for Events</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{openCount}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0c] flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Closed / Unavailable</p>
                        <p className="text-xl font-black text-neutral-600 dark:text-neutral-400 mt-0.5">{closedCount}</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-zinc-800/70 flex items-center justify-center text-neutral-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
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
                <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium px-2">
                        {filteredVenues.length} of {venues.length} venues
                    </span>
                    <button
                        type="button"
                        onClick={fetchVenues}
                        disabled={venuesLoading}
                        className="text-xs text-neutral-500 hover:text-orange-600 dark:hover:text-orange-400 font-semibold px-2 py-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Refresh venue list"
                    >
                        {venuesLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th>Venue Name</Th>
                        <Th>Availability Status</Th>
                        <Th align="right">Actions</Th>
                    </tr>
                </thead>
                <tbody>
                    {filteredVenues.map((v, idx) => (
                        <tr key={v.id || idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors">
                            {/* Column 1: Venue Name */}
                            <Td className="py-3.5 font-semibold text-sm text-neutral-900 dark:text-white">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 shrink-0">
                                        <Building2 size={14} />
                                    </div>
                                    <span>{v.name}</span>
                                </div>
                            </Td>

                            {/* Column 2: Status Badge + Instant iOS Switch */}
                            <Td className="py-3.5">
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wide rounded-full ${
                                        v.isOpen
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20'
                                            : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-zinc-700'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${v.isOpen ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                                        {v.isOpen ? 'Open' : 'Closed'}
                                    </span>

                                    {/* Instant Switch */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleVenueStatus(v)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            v.isOpen ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-zinc-700'
                                        }`}
                                        title={v.isOpen ? 'Click to Close Venue' : 'Click to Open Venue'}
                                        aria-label={`Toggle status for ${v.name}`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                v.isOpen ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </Td>

                            {/* Column 3: Direct Action Buttons */}
                            <Td align="right" className="py-3.5">
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(v)}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white bg-neutral-100/80 hover:bg-neutral-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                                        title="Edit venue details"
                                    >
                                        <Edit2 size={13} className="text-neutral-500 dark:text-neutral-400" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteVenue(v)}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                        title="Delete venue"
                                        aria-label={`Delete ${v.name}`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </Td>
                        </tr>
                    ))}
                    {filteredVenues.length === 0 && (
                        <tr>
                            <td colSpan="3" className="px-5 py-12 text-center text-neutral-400 text-sm">
                                {venuesLoading ? (
                                    <div className="flex items-center justify-center gap-2 text-neutral-400">
                                        <Loader2 size={16} className="animate-spin text-orange-500" />
                                        <span>Loading campus venues...</span>
                                    </div>
                                ) : venueSearch ? (
                                    <span>No venues matching "{venueSearch}".</span>
                                ) : (
                                    <span>No venues found.</span>
                                )}
                            </td>
                        </tr>
                    )}
                </tbody>
            </DataTable>

            {/* Edit Venue Modal */}
            {isEditVenueModalOpen && editingVenue && (
                <Modal
                    onClose={() => {
                        if (!isUpdatingVenue) {
                            setIsEditVenueModalOpen(false);
                            setEditingVenue(null);
                        }
                    }}
                    title="Edit Campus Venue"
                    subtitle="Update venue name and event booking availability"
                >
                    <form onSubmit={handleUpdateVenue} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                                Venue Name <span className="text-orange-600">*</span>
                            </label>
                            <input
                                type="text"
                                value={editingVenue.name}
                                onChange={(e) => setEditingVenue(prev => ({ ...prev, name: e.target.value }))}
                                required
                                autoFocus
                                placeholder="e.g. Student Activity Centre"
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] text-neutral-900 dark:text-white focus:border-orange-600 outline-none transition-colors"
                            />
                        </div>

                        {/* Availability Radio / Pill Selectors */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                Booking Availability Status
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setEditingVenue(prev => ({ ...prev, isOpen: true }))}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                        editingVenue.isOpen
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 shadow-sm'
                                            : 'border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Open for Events
                                        </span>
                                        {editingVenue.isOpen && <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />}
                                    </div>
                                    <span className="text-[10.5px] opacity-75 font-medium leading-tight">Clubs can select and book this venue</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditingVenue(prev => ({ ...prev, isOpen: false }))}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                        !editingVenue.isOpen
                                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 shadow-sm'
                                            : 'border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            Closed / In Maintenance
                                        </span>
                                        {!editingVenue.isOpen && <XCircle size={15} className="text-amber-600 dark:text-amber-400" />}
                                    </div>
                                    <span className="text-[10.5px] opacity-75 font-medium leading-tight">Temporarily locked for event booking</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                            <button
                                type="button"
                                disabled={isUpdatingVenue}
                                onClick={() => {
                                    setIsEditVenueModalOpen(false);
                                    setEditingVenue(null);
                                }}
                                className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdatingVenue}
                                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isUpdatingVenue && <Loader2 size={13} className="animate-spin" />}
                                <span>{isUpdatingVenue ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Add Venue Modal */}
            {isAddVenueModalOpen && (
                <Modal
                    onClose={() => {
                        if (!isCreatingVenue) setIsAddVenueModalOpen(false);
                    }}
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
                                autoFocus
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] focus:border-orange-600 outline-none transition-colors text-neutral-900 dark:text-white"
                            />
                        </div>

                        {/* Availability Radio / Pill Selectors */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                                Initial Availability Status
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setNewVenueIsOpen(true)}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                        newVenueIsOpen
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 shadow-sm'
                                            : 'border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Open for Events
                                        </span>
                                        {newVenueIsOpen && <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />}
                                    </div>
                                    <span className="text-[10.5px] opacity-75 font-medium leading-tight">Clubs can select and book this venue</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setNewVenueIsOpen(false)}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                        !newVenueIsOpen
                                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 shadow-sm'
                                            : 'border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            Closed / In Maintenance
                                        </span>
                                        {!newVenueIsOpen && <XCircle size={15} className="text-amber-600 dark:text-amber-400" />}
                                    </div>
                                    <span className="text-[10.5px] opacity-75 font-medium leading-tight">Temporarily locked for event booking</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                            <button
                                type="button"
                                disabled={isCreatingVenue}
                                onClick={() => setIsAddVenueModalOpen(false)}
                                className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreatingVenue}
                                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isCreatingVenue && <Loader2 size={13} className="animate-spin" />}
                                <span>{isCreatingVenue ? 'Adding...' : 'Add Venue'}</span>
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default VenuesTab;

