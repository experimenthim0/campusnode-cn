import React, { useState } from 'react';
import { assignCentralOrganizer, removeCentralOrganizer, searchStudentsForCO } from '../../../services/adminService';
import { Search, Shield, Building2, UserCheck, Calendar, CheckSquare, DollarSign, Users } from 'lucide-react';
import { useNotification } from '../../../context/NotificationContext';

const CentralOrganizerTab = ({
    centralOrganizer,
    loadingCO,
    fetchCentralOrganizer
}) => {
    const { showNotification } = useNotification();
    const [studentQuery, setStudentQuery] = useState('');
    const [studentSearchResults, setStudentSearchResults] = useState([]);
    const [searchingStudents, setSearchingStudents] = useState(false);
    const [assigningCO, setAssigningCO] = useState(false);

    // Selected student and capability flags for assignment modal/form
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedRole, setSelectedRole] = useState('CENTRAL_EVENT_ORGANISER');
    const [canManageEvents, setCanManageEvents] = useState(true);
    const [canTakeAttendance, setCanTakeAttendance] = useState(true);
    const [canVerifyPayments, setCanVerifyPayments] = useState(false);
    const [canDelegateStaff, setCanDelegateStaff] = useState(false);

    const handleSearchStudents = async (q) => {
        setStudentQuery(q);
        if (!q || q.trim().length < 2) {
            setStudentSearchResults([]);
            return;
        }
        setSearchingStudents(true);
        try {
            const res = await searchStudentsForCO(q.trim());
            setStudentSearchResults(res.data.students || []);
        } catch (err) {
            console.error('Student search failed:', err);
        } finally {
            setSearchingStudents(false);
        }
    };

    const handleOpenAssignModal = (student) => {
        setSelectedStudent(student);
        setSelectedRole('CENTRAL_EVENT_ORGANISER');
        setCanManageEvents(true);
        setCanTakeAttendance(true);
        setCanVerifyPayments(false);
        setCanDelegateStaff(false);
    };

    const handleRoleChange = (role) => {
        setSelectedRole(role);
        if (role === 'CENTRAL_EVENT_ORGANISER') {
            setCanManageEvents(true);
            setCanTakeAttendance(true);
            setCanVerifyPayments(true);
            setCanDelegateStaff(true);
        } else if (role === 'EVENT_COORDINATOR') {
            setCanManageEvents(true);
            setCanTakeAttendance(true);
            setCanVerifyPayments(false);
            setCanDelegateStaff(false);
        } else if (role === 'ATTENDANCE_COORDINATOR') {
            setCanManageEvents(false);
            setCanTakeAttendance(true);
            setCanVerifyPayments(false);
            setCanDelegateStaff(false);
        } else if (role === 'PAYMENT_COORDINATOR') {
            setCanManageEvents(false);
            setCanTakeAttendance(false);
            setCanVerifyPayments(true);
            setCanDelegateStaff(false);
        }
    };

    const handleConfirmAssign = async () => {
        if (!selectedStudent) return;
        setAssigningCO(true);
        try {
            const res = await assignCentralOrganizer({
                studentId: selectedStudent.id,
                role: selectedRole,
                canManageEvents,
                canTakeAttendance,
                canVerifyPayments,
                canDelegateStaff,
            });
            showNotification(res.data.message || 'Institutional role assigned successfully!', 'success');
            setSelectedStudent(null);
            setStudentQuery('');
            setStudentSearchResults([]);
            fetchCentralOrganizer();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to assign role', 'error');
        } finally {
            setAssigningCO(false);
        }
    };

    const handleRevokeCO = async (studentId, studentName) => {
        if (!window.confirm(`Revoke DSW Institutional role from ${studentName}?`)) {
            return;
        }
        try {
            const res = await removeCentralOrganizer(studentId);
            showNotification(res.data.message || 'Institutional role revoked', 'success');
            fetchCentralOrganizer();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to revoke role', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a]">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-zinc-800">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-md">
                                Institutional Account (DSW)
                            </span>
                            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-md">
                                System Account
                            </span>
                        </div>
                        <h2 className="text-base font-black text-black dark:text-white tracking-wide mt-1.5 flex items-center gap-2">
                            <Building2 size={18} className="text-orange-500" />
                            Dean Student Welfare & Central Events
                        </h2>
                        <p className="text-neutral-400 text-xs mt-0.5 max-w-2xl">
                            Institutional account (odsw@nitj.ac.in) for college-wide events (Fresher Party, cultural fests, central events). Students assigned below operate with capability-scoped permissions without overriding their normal student profile.
                        </p>
                    </div>
                </div>

                {/* Active Lead Organiser Display */}
                {loadingCO ? (
                    <div className="py-12 text-center text-xs text-neutral-400">Loading institutional assignments...</div>
                ) : centralOrganizer ? (
                    <div className="mt-5 p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-black text-lg flex items-center justify-center overflow-hidden">
                                {centralOrganizer.profileImage ? (
                                    <img 
                                        src={centralOrganizer.profileImage} 
                                        alt={centralOrganizer.name} 
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <span>{centralOrganizer.name?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{centralOrganizer.name}</h3>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
                                        {centralOrganizer.assignment?.role || 'Lead Organiser'}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-500">{centralOrganizer.email}</p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">
                                    {centralOrganizer.branch || "Branch N/A"} &bull; Year {centralOrganizer.year || "N/A"} &bull; {centralOrganizer.program || "Student"}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {centralOrganizer.assignment?.canManageEvents && (
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded">
                                            Events
                                        </span>
                                    )}
                                    {centralOrganizer.assignment?.canTakeAttendance && (
                                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-semibold rounded">
                                            Attendance
                                        </span>
                                    )}
                                    {centralOrganizer.assignment?.canVerifyPayments && (
                                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold rounded">
                                            Payments
                                        </span>
                                    )}
                                    {centralOrganizer.assignment?.canDelegateStaff && (
                                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-[10px] font-semibold rounded">
                                            Staff Delegation
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleRevokeCO(centralOrganizer.id, centralOrganizer.name)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                            Revoke Role
                        </button>
                    </div>
                ) : (
                    <div className="mt-5 p-6 rounded-xl border border-dashed border-neutral-300 dark:border-zinc-800 text-center space-y-2">
                        <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Lead Central Event Organiser Currently Assigned</p>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                            Search an existing registered student below to assign them institutional responsibilities under DSW.
                        </p>
                    </div>
                )}
            </div>

            {/* Assignment Configuration Modal / Panel */}
            {selectedStudent && (
                <div className="border-2 border-orange-500/50 rounded-2xl p-6 bg-white dark:bg-[#0c0c0c] shadow-lg space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black text-black dark:text-white">
                                Configure DSW Role & Capabilities
                            </h3>
                            <p className="text-xs text-neutral-500">
                                Assigning capabilities to <span className="font-bold text-neutral-900 dark:text-white">{selectedStudent.name}</span> ({selectedStudent.email})
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedStudent(null)}
                            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                                Institutional Role
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => handleRoleChange(e.target.value)}
                                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500"
                            >
                                <option value="CENTRAL_EVENT_ORGANISER">Central Event Organiser (Full Lead)</option>
                                <option value="EVENT_COORDINATOR">Event Coordinator (Manage Events)</option>
                                <option value="ATTENDANCE_COORDINATOR">Attendance Coordinator (Check-in & Badges)</option>
                                <option value="PAYMENT_COORDINATOR">Payment Coordinator (Verify Fees)</option>
                                <option value="MEMBER">Member (Custom Delegated Permissions)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                                Specific Capability Toggles
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={canManageEvents}
                                        onChange={(e) => setCanManageEvents(e.target.checked)}
                                        className="rounded text-orange-600 focus:ring-orange-500"
                                    />
                                    Manage Events
                                </label>
                                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={canTakeAttendance}
                                        onChange={(e) => setCanTakeAttendance(e.target.checked)}
                                        className="rounded text-orange-600 focus:ring-orange-500"
                                    />
                                    Take Attendance
                                </label>
                                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={canVerifyPayments}
                                        onChange={(e) => setCanVerifyPayments(e.target.checked)}
                                        className="rounded text-orange-600 focus:ring-orange-500"
                                    />
                                    Verify Payments
                                </label>
                                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={canDelegateStaff}
                                        onChange={(e) => setCanDelegateStaff(e.target.checked)}
                                        className="rounded text-orange-600 focus:ring-orange-500"
                                    />
                                    Delegate Staff
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setSelectedStudent(null)}
                            className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={assigningCO}
                            onClick={handleConfirmAssign}
                            className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                        >
                            {assigningCO ? 'Assigning...' : 'Save & Assign'}
                        </button>
                    </div>
                </div>
            )}

            <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] space-y-4">
                <h3 className="text-sm font-black text-black dark:text-white tracking-wide">
                    Assign Institutional Roles to Students
                </h3>
                <p className="text-neutral-400 text-xs">
                    Search registered students by name, email, or roll number. Club organizational accounts and faculty/administrative accounts are strictly excluded from lookup.
                </p>

                <div className="relative max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search by student name, email, or roll no..."
                        value={studentQuery}
                        onChange={(e) => handleSearchStudents(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-black dark:text-white outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                {searchingStudents && (
                    <p className="text-xs text-neutral-400">Searching students...</p>
                )}

                {studentSearchResults.length > 0 && (
                    <div className="border border-neutral-200 dark:border-zinc-800 rounded-xl divide-y divide-neutral-100 dark:divide-zinc-800 overflow-hidden">
                        {studentSearchResults.map((st) => (
                            <div key={st.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <div>
                                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{st.name}</p>
                                    <p className="text-[11px] text-neutral-400">{st.email} {st.rollNo ? `• ${st.rollNo}` : ''}</p>
                                    <p className="text-[10px] text-neutral-500">{st.branch} • Year {st.year}</p>
                                </div>

                                {st.accessLevel === 'central_organizer' ? (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold rounded-lg">
                                        Current Lead
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenAssignModal(st)}
                                        className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                        Configure & Assign
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CentralOrganizerTab;
