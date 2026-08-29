import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    getDashboardStats,
    getClubsList,
    getCoordinators,
    getUserInfo,
    completePayout,
    getVenues
} from '../services/adminService';
import {
    getSentNotifications,
    getNotifications,
    sendNotification,
    markAllAsRead
} from '../services/notificationService';
import ExportCenter from './ExportCenter';
import EventCalendarPage from './EventCalendarPage';
import { Plus, CheckCheck } from 'lucide-react';

import {
    OverviewTab,
    EventDataTable,
    VenuesTab,
    ClubsTab,
    CoordinatorsTab,
    ManualPaymentsTab,
    PayoutsTab,
    BroadcastsTab,
    NotificationsTab,
    ProfileTab
} from '../roles/admin';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [clubHeads, setClubHeads] = useState([]);
    const [eventData, setEventData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [role, setRole] = useState(null);

    // Filters for Events
    const [filters, setFilters] = useState({ month: 'all', year: 'all', clubId: 'all' });
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [showYearWise, setShowYearWise] = useState(false);

    // Payout modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedClub, setSelectedClub] = useState(null);
    const [selectedEventId, setSelectedEventId] = useState(null);

    // Clubs & Coordinators states
    const [coordinators, setCoordinators] = useState([]);
    const [isCreateClubModalOpen, setIsCreateClubModalOpen] = useState(false);
    const [isAddCoordModalOpen, setIsAddCoordModalOpen] = useState(false);

    // Payments Management States
    const [manualPayments, setManualPayments] = useState([]);
    const [manualPaymentsSummary, setManualPaymentsSummary] = useState(null);
    const [paymentsSearch, setPaymentsSearch] = useState('');

    // Venue Management States
    const [venues, setVenues] = useState([]);
    const [venuesLoading, setVenuesLoading] = useState(false);
    const [isAddVenueModalOpen, setIsAddVenueModalOpen] = useState(false);


    // Communication States
    const [broadcasts, setBroadcasts] = useState([]);
    const [adminNotifications, setAdminNotifications] = useState([]);
    const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [broadcastForm, setBroadcastForm] = useState({
        targetType: 'ALL_STUDENTS',
        eventId: '',
        title: '',
        message: ''
    });
    const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    // Profile Management States
    const [profileName, setProfileName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [profile2FA, setProfile2FA] = useState(false);

    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');

    // Sync tab param with activeTab state
    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        } else if (role) {
            if (role === 'paymentAdmin') {
                setActiveTab('payouts');
            } else {
                setActiveTab('overview');
            }
        }
    }, [tabParam, role]);

    const { user: adminUser, role: authRole } = useAuth();

    useEffect(() => {
        if (adminUser) {
            setRole(authRole);
            setProfileName(adminUser.name || '');
            setProfileEmail(adminUser.email || '');
            setProfile2FA(adminUser.isTwoStepEnabled || false);

            if (authRole === 'lostFoundAdmin') {
                navigate('/admin/lost-found');
                return;
            }
            if (authRole === 'facultyCoordinator') {
                navigate('/');
                return;
            }

            const fetchData = async () => {
                try {
                    const statsRes = await getDashboardStats();
                    setStats(statsRes.data);

                    const clubsRes = await getClubsList();
                    setClubHeads(clubsRes.data);

                    const coordsRes = await getCoordinators();
                    setCoordinators(coordsRes.data);

                    await fetchManualPayments();

                    fetchFilteredEventData();
                    setLoading(false);
                } catch (err) {
                    showNotification('Failed to fetch admin data', 'error');
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [adminUser, authRole, navigate, showNotification]);

    // Fetch tab-specific data on tab changes
    useEffect(() => {
        if (activeTab === 'broadcasts') fetchBroadcasts();
        if (activeTab === 'notifications') fetchAdminNotifications();
        if (activeTab === 'venues') fetchVenues();
    }, [activeTab]);

    const fetchBroadcasts = async () => {
        setLoadingBroadcasts(true);
        try {
            const res = await getSentNotifications();
            setBroadcasts(res.data || []);
        } catch (err) {
            console.error('Failed to fetch sent broadcasts:', err);
        } finally {
            setLoadingBroadcasts(false);
        }
    };

    const fetchAdminNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const res = await getNotifications();
            setAdminNotifications(res.data || []);
        } catch (err) {
            console.error('Failed to fetch admin notifications:', err);
        } finally {
            setLoadingNotifications(false);
        }
    };

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastForm.title || !broadcastForm.message) {
            showNotification('Please fill in title and message', 'error');
            return;
        }
        if (broadcastForm.targetType === 'REGISTERED_STUDENTS' && !broadcastForm.eventId) {
            showNotification('Please select an event for participant broadcast', 'error');
            return;
        }
        setSendingBroadcast(true);
        try {
            await sendNotification({
                targetType: broadcastForm.targetType,
                eventId: broadcastForm.targetType === 'REGISTERED_STUDENTS' ? broadcastForm.eventId : undefined,
                title: broadcastForm.title,
                message: broadcastForm.message
            });
            showNotification('Broadcast message sent successfully!', 'success');
            setBroadcastModalOpen(false);
            setBroadcastForm({ targetType: 'ALL_STUDENTS', eventId: '', title: '', message: '' });
            fetchBroadcasts();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to send broadcast', 'error');
        } finally {
            setSendingBroadcast(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            showNotification('All notifications marked as read', 'success');
            fetchAdminNotifications();
        } catch (err) {
            showNotification('Failed to mark notifications as read', 'error');
        }
    };

    const fetchManualPayments = async () => {
        try {
            const res = await api.get('/api/admin/manual-payments');
            setManualPayments(res.data.participations || []);
            setManualPaymentsSummary(res.data.summary || null);
        } catch (err) {
            console.error('Failed to fetch manual payments overview:', err);
        }
    };

    const fetchFilteredEventData = async () => {
        try {
            const query = new URLSearchParams(filters).toString();
            const res = await api.get(`/api/admin/event-data-export?${query}`);
            setEventData(res.data.events || []);
        } catch (err) {
            console.error('Failed to fetch filtered event data');
        }
    };

    useEffect(() => {
        if (!loading) fetchFilteredEventData();
    }, [filters]);

    const refreshStats = async () => {
        try {
            const statsRes = await getDashboardStats();
            setStats(statsRes.data);
            await fetchManualPayments();
        } catch (err) {
            console.error('Failed to refresh stats');
        }
    };

    const handleFetchPayoutInfo = async (clubHeadId, eventId) => {
        try {
            const res = await getUserInfo(clubHeadId);
            setSelectedClub(res.data);
            setSelectedEventId(eventId);
            setModalOpen(true);
        } catch (err) {
            showNotification('Error fetching payout info', 'error');
        }
    };

    const handleConfirmPayout = async () => {
        try {
            const res = await completePayout(selectedEventId);
            if (res.data.success) {
                showNotification('Payout marked as complete!', 'success');
                setModalOpen(false);
                refreshStats();
            }
        } catch (err) {
            showNotification('Failed to update payout status', 'error');
        }
    };

    const fetchVenues = async () => {
        setVenuesLoading(true);
        try {
            const res = await getVenues();
            setVenues(res.data || []);
        } catch (err) {
            console.error('Failed to fetch venues');
        } finally {
            setVenuesLoading(false);
        }
    };

    /* ─── Tab Titles Mapping ─────────────────────────────────────────────────── */
    const tabTitles = {
        overview: { title: 'Overview', subtitle: 'All events and system metrics at a glance' },
        'event-data': { title: 'All Events', subtitle: 'View, filter, and access all event details and direct page links' },
        calendar: { title: 'Event Calendar & Venue Scheduling', subtitle: 'Interactive month, week, day, and venue timeline scheduling grid' },
        'calendar-schedule': { title: 'Event Calendar & Venue Scheduling', subtitle: 'Interactive month, week, day, and venue timeline scheduling grid' },
        venues: { title: 'Venues Management', subtitle: 'Manage campus event venues and configure their event booking availability' },
        'central-organizer': { title: 'Central Organizer Management', subtitle: 'Assign, view, or revoke the college-wide Central Organizer student account' },
        'club-heads': { title: 'Clubs Management', subtitle: 'Create, edit, and configure registered student clubs' },
        coordinators: { title: 'Coordinators Management', subtitle: 'Manage faculty coordinator accounts' },
        'payments-overview': { title: 'Transactions Management', subtitle: 'Overview of manual transaction registrations and UTR verifications' },
        payouts: { title: 'Financial Payouts', subtitle: 'Manage revenue settlements and payouts for club heads' },
        broadcasts: { title: 'Outgoing Broadcasts', subtitle: 'Dispatch real-time broadcast announcements to all students or event participants' },
        notifications: { title: 'Incoming Notifications & Alerts', subtitle: 'View real-time alerts, proposals, and notification logs received from clubs and coordinators' },
        'export-center': { title: 'Export Center', subtitle: 'Export & download structured administrative data' },
        profile: { title: 'Settings & Profile', subtitle: 'Update display name, password, and two-step verification' },
    };

    if (loading) return (
        <div className="min-h-full bg-white dark:bg-[#0a0a0a] myfont animate-pulse">
            <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
                {/* Page Header Skeleton */}
                <div className="mb-8 space-y-2">
                    <div className="h-7 w-48 bg-neutral-100 dark:bg-zinc-900 rounded-lg" />
                    <div className="h-4 w-72 bg-neutral-50 dark:bg-zinc-900/50 rounded-lg" />
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-5 rounded-2xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-[#0c0c0c] space-y-3">
                            <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-800 rounded" />
                            <div className="h-8 w-24 bg-neutral-200 dark:bg-zinc-800 rounded-lg" />
                        </div>
                    ))}
                </div>

                {/* Table Box Skeleton */}
                <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] space-y-4">
                    <div className="h-4 w-32 bg-neutral-200 dark:bg-zinc-800 rounded" />
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-4 items-center border-b border-neutral-100 dark:border-zinc-900 pb-4 last:border-0 last:pb-0">
                                <div className="h-4 w-6 bg-neutral-100 dark:bg-zinc-800 rounded" />
                                <div className="h-4 flex-1 bg-neutral-100 dark:bg-zinc-800 rounded" />
                                <div className="h-4 w-28 bg-neutral-100 dark:bg-zinc-800 rounded" />
                                <div className="h-4 w-20 bg-neutral-100 dark:bg-zinc-800 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const allEvents = eventData.length > 0 ? eventData : (stats?.eventStats || []);
    const currentTabInfo = tabTitles[activeTab] || tabTitles.overview;

    return (
        <div className="min-h-full bg-white dark:bg-[#0a0a0a] myfont">
            <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">

                {/* ── Page Header ───────────────────────────────────────── */}
                <div className="mb-8 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-black dark:text-white tracking-wide">
                            {currentTabInfo.title}
                        </h1>
                        <p className="text-neutral-400 dark:text-neutral-500 text-[12px] mt-0.5 tracking-wide font-medium">
                            {currentTabInfo.subtitle}
                        </p>
                    </div>

                    {/* Header Actions */}
                    {activeTab === 'broadcasts' && (
                        <button
                            onClick={() => setBroadcastModalOpen(true)}
                            className="px-4 py-2.5 bg-orange-600 text-white text-[12px] font-bold tracking-wide rounded-xl hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20 cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>New Broadcast</span>
                        </button>
                    )}

                    {activeTab === 'notifications' && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="px-3.5 py-2 bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white text-[11px] font-bold tracking-wide rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <CheckCheck size={14} className="text-orange-500" />
                            <span>Mark All Read</span>
                        </button>
                    )}

                    {activeTab === 'venues' && (
                        <button
                            onClick={() => setIsAddVenueModalOpen(true)}
                            className="px-4 py-2.5 bg-orange-600 text-white text-[12px] font-bold tracking-wide rounded-xl hover:bg-orange-500 transition-all flex items-center gap-2 shadow-lg shadow-orange-600/20 cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>Add Venue</span>
                        </button>
                    )}
                </div>

                {/* ── TAB VIEWS ─────────────────────────────────────────── */}
                {activeTab === 'overview' && (
                    <OverviewTab
                        stats={stats}
                        role={role}
                        events={allEvents}
                        clubHeads={clubHeads}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        filters={filters}
                        setFilters={setFilters}
                        typeFilter={typeFilter}
                        setTypeFilter={setTypeFilter}
                    />
                )}

                {activeTab === 'event-data' && (
                    <EventDataTable
                        events={allEvents}
                        clubHeads={clubHeads}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        filters={filters}
                        setFilters={setFilters}
                        typeFilter={typeFilter}
                        setTypeFilter={setTypeFilter}
                    />
                )}

                {(activeTab === 'calendar' || activeTab === 'calendar-schedule') && <EventCalendarPage />}

                {activeTab === 'venues' && (
                    <VenuesTab
                        venues={venues}
                        setVenues={setVenues}
                        venuesLoading={venuesLoading}
                        fetchVenues={fetchVenues}
                        isAddVenueModalOpen={isAddVenueModalOpen}
                        setIsAddVenueModalOpen={setIsAddVenueModalOpen}
                    />
                )}

                {activeTab === 'club-heads' && (
                    <ClubsTab
                        clubHeads={clubHeads}
                        setClubHeads={setClubHeads}
                        refreshStats={refreshStats}
                        isCreateClubModalOpen={isCreateClubModalOpen}
                        setIsCreateClubModalOpen={setIsCreateClubModalOpen}
                    />
                )}

                {activeTab === 'coordinators' && (
                    <CoordinatorsTab
                        coordinators={coordinators}
                        setCoordinators={setCoordinators}
                        isAddCoordModalOpen={isAddCoordModalOpen}
                        setIsAddCoordModalOpen={setIsAddCoordModalOpen}
                    />
                )}


                {activeTab === 'payments-overview' && (
                    <ManualPaymentsTab
                        manualPayments={manualPayments}
                        manualPaymentsSummary={manualPaymentsSummary}
                        paymentsSearch={paymentsSearch}
                        setPaymentsSearch={setPaymentsSearch}
                    />
                )}

                {activeTab === 'payouts' && (
                    <PayoutsTab
                        eventStats={stats?.eventStats || []}
                        modalOpen={modalOpen}
                        setModalOpen={setModalOpen}
                        selectedClub={selectedClub}
                        handleFetchPayoutInfo={handleFetchPayoutInfo}
                        handleConfirmPayout={handleConfirmPayout}
                    />
                )}

                {activeTab === 'broadcasts' && (
                    <BroadcastsTab
                        broadcasts={broadcasts}
                        loadingBroadcasts={loadingBroadcasts}
                        events={eventData.length > 0 ? eventData : stats?.eventStats || []}
                        broadcastModalOpen={broadcastModalOpen}
                        setBroadcastModalOpen={setBroadcastModalOpen}
                        broadcastForm={broadcastForm}
                        setBroadcastForm={setBroadcastForm}
                        sendingBroadcast={sendingBroadcast}
                        handleSendBroadcast={handleSendBroadcast}
                    />
                )}

                {activeTab === 'notifications' && (
                    <NotificationsTab
                        adminNotifications={adminNotifications}
                        loadingNotifications={loadingNotifications}
                    />
                )}

                {activeTab === 'export-center' && (
                    <ExportCenter />
                )}

                {activeTab === 'profile' && (
                    <ProfileTab
                        profileName={profileName}
                        setProfileName={setProfileName}
                        profileEmail={profileEmail}
                        profile2FA={profile2FA}
                        setProfile2FA={setProfile2FA}
                    />
                )}

            </div>
        </div>
    );
};

export default AdminDashboard;
