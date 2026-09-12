import React, { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, ShieldCheck, ArrowLeft, Check } from 'lucide-react';
import { invalidateCache } from '../lib/cacheManager';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import { updateProfile } from '../services/userService';
import ProfilePhotoUpload from '../components/ProfilePhotoUpload';
import ShimmerText from '../components/ShimmerText';
import { calculateAcademicProgress } from '../utils/academicProgress';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

const EditProfile = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'security' ? 'security' : 'profile';

    const { user: authUser, role: authRole, setSession } = useAuth();
    const [user, setUser] = useState(authUser);
    const [role, setRole] = useState(authRole);

    // Saving states separated
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isSaving2FA, setIsSaving2FA] = useState(false);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        year: '',
        category: '',
        motto: '',
        githubProfile: '',
        linkedinProfile: '',
        xProfile: '',
        portfolioUrl: '',
        instagramProfile: '',
        whatsappNumber: '',
        isTwoStepEnabled: false
    });

    useEffect(() => {
        if (authUser) {
            setUser(authUser);
            setRole(authRole);

            const isExternalAcc = Boolean(
                authRole === 'external' ||
                authUser?.role === 'external' ||
                authUser?.isExternal ||
                authUser?.principalType === 'EXTERNAL' ||
                localStorage.getItem('role') === 'external'
            );
            const isFacultyAcc = !isExternalAcc && Boolean(
                authRole === 'facultyCoordinator' ||
                authUser?.role === 'facultyCoordinator' ||
                authUser?.principalType === 'FACULTY' ||
                localStorage.getItem('role') === 'facultyCoordinator'
            );
            const isStudentAcc = !isFacultyAcc && !isExternalAcc && Boolean(
                authUser?.rollNo ||
                authUser?.branch ||
                authUser?.expectedGraduationYear ||
                authUser?.academicYear ||
                authUser?.year ||
                authRole === 'student' ||
                authRole === 'member' ||
                localStorage.getItem('role') === 'member' ||
                localStorage.getItem('role') === 'student'
            );
            const isClubAcc = !isFacultyAcc && !isExternalAcc && !isStudentAcc && (authRole === 'club' || authUser?.principalType === 'CLUB');

            const socialMap = {};
            const rawLinks = !isClubAcc && Array.isArray(authUser.socialLinks) ? authUser.socialLinks : [];

            rawLinks.forEach((l) => {
                const plat = (l.platform || '').toLowerCase();
                if (plat === 'instagram') socialMap.instagramProfile = l.url;
                if (plat === 'linkedin') socialMap.linkedinProfile = l.url;
                if (plat === 'x' || plat === 'twitter') socialMap.xProfile = l.url;
                if (plat === 'whatsapp') socialMap.whatsappNumber = l.url;
                if (plat === 'website') socialMap.portfolioUrl = l.url;
                if (plat === 'github') socialMap.githubProfile = l.url;
            });

            if (isClubAcc) {
                setFormData({
                    name: authUser.clubName || authUser.club?.clubName || authUser.name || '',
                    phone: '',
                    year: '',
                    category: '',
                    motto: '',
                    githubProfile: '',
                    linkedinProfile: '',
                    xProfile: '',
                    portfolioUrl: '',
                    instagramProfile: '',
                    whatsappNumber: '',
                    isTwoStepEnabled: authUser.isTwoStepEnabled || false
                });
            } else if (isFacultyAcc) {
                setFormData({
                    name: authUser.name || '',
                    phone: '',
                    year: '',
                    category: authUser.category || '',
                    motto: '',
                    githubProfile: authUser.githubProfile || socialMap.githubProfile || '',
                    linkedinProfile: authUser.linkedinProfile || socialMap.linkedinProfile || '',
                    xProfile: authUser.xProfile || socialMap.xProfile || '',
                    portfolioUrl: authUser.portfolioUrl || socialMap.portfolioUrl || '',
                    instagramProfile: authUser.instagramProfile || socialMap.instagramProfile || '',
                    whatsappNumber: authUser.whatsappNumber || socialMap.whatsappNumber || '',
                    isTwoStepEnabled: authUser.isTwoStepEnabled || false
                });
            } else if (isExternalAcc) {
                setFormData({
                    name: authUser.name || '',
                    phone: authUser.phone || '',
                    year: authUser.graduationYear || '',
                    category: '',
                    motto: '',
                    githubProfile: authUser.githubProfile || socialMap.githubProfile || '',
                    linkedinProfile: authUser.linkedinProfile || socialMap.linkedinProfile || '',
                    xProfile: authUser.xProfile || socialMap.xProfile || '',
                    portfolioUrl: authUser.portfolioUrl || socialMap.portfolioUrl || '',
                    instagramProfile: authUser.instagramProfile || socialMap.instagramProfile || '',
                    whatsappNumber: authUser.whatsappNumber || socialMap.whatsappNumber || '',
                    isTwoStepEnabled: authUser.isTwoStepEnabled || false
                });
            } else {
                setFormData({
                    name: authUser.name || '',
                    phone: authUser.phone || '',
                    year: authUser.academicYearLabel || authUser.year || '',
                    category: '',
                    motto: '',
                    githubProfile: authUser.githubProfile || socialMap.githubProfile || '',
                    linkedinProfile: authUser.linkedinProfile || socialMap.linkedinProfile || '',
                    xProfile: authUser.xProfile || socialMap.xProfile || '',
                    portfolioUrl: authUser.portfolioUrl || socialMap.portfolioUrl || '',
                    instagramProfile: authUser.instagramProfile || socialMap.instagramProfile || '',
                    whatsappNumber: authUser.whatsappNumber || socialMap.whatsappNumber || '',
                    isTwoStepEnabled: authUser.isTwoStepEnabled || false
                });
            }
        }
    }, [authUser, authRole]);

    const isExternalAccount = Boolean(
        role === 'external' ||
        authRole === 'external' ||
        user?.role === 'external' ||
        user?.isExternal ||
        user?.principalType === 'EXTERNAL' ||
        localStorage.getItem('role') === 'external'
    );
    const isFacultyAccount = !isExternalAccount && Boolean(
        role === 'facultyCoordinator' ||
        authRole === 'facultyCoordinator' ||
        user?.role === 'facultyCoordinator' ||
        user?.principalType === 'FACULTY' ||
        localStorage.getItem('role') === 'facultyCoordinator'
    );
    const isStudentAccount = !isFacultyAccount && !isExternalAccount && Boolean(
        user?.rollNo ||
        user?.branch ||
        user?.expectedGraduationYear ||
        user?.academicYear ||
        user?.year ||
        role === 'student' ||
        role === 'member' ||
        authRole === 'student' ||
        authRole === 'member' ||
        localStorage.getItem('role') === 'member' ||
        localStorage.getItem('role') === 'student'
    );
    const isClubAccount = !isFacultyAccount && !isExternalAccount && !isStudentAccount && (role === 'club' || authRole === 'club' || user?.principalType === 'CLUB');

    // Dynamic Academic Progress for Students / Student Leads
    const studentProgress = isStudentAccount ? calculateAcademicProgress(user) : null;
    const displayAcademicYear = user?.academicYearLabel || studentProgress?.academicYearLabel || user?.year;
    const displaySemester = user?.semesterLabel || studentProgress?.semesterLabel;
    const displayAcademicStanding = [displayAcademicYear, displaySemester].filter(Boolean).join(" • ");

    const handleProfileChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const updateData = { ...formData };
            // Ensure no password properties are included
            delete updateData.currentPassword;
            delete updateData.newPassword;
            delete updateData.confirmPassword;

            // For club accounts, strictly strip out club-specific fields to enforce Club Settings as single source of truth
            if (isClubAccount) {
                delete updateData.name;
                delete updateData.clubName;
                delete updateData.motto;
                delete updateData.category;
                delete updateData.githubProfile;
                delete updateData.linkedinProfile;
                delete updateData.xProfile;
                delete updateData.portfolioUrl;
                delete updateData.instagramProfile;
                delete updateData.whatsappNumber;
                delete updateData.clubInstagram;
                delete updateData.clubLinkedin;
                delete updateData.clubX;
                delete updateData.clubWebsite;
                delete updateData.clubWhatsapp;
                delete updateData.clubGithub;
                delete updateData.socialLinks;
            }

            // For personal student/external accounts, strip out club fields
            if (!isClubAccount) {
                delete updateData.category;
                delete updateData.motto;
            }

            const targetRole = isClubAccount ? 'club' : (isExternalAccount ? 'external' : 'student');
            const res = await updateProfile(targetRole, user.id || user._id, updateData);
            setSession(res.data.user, authRole || role);

            // Invalidate user and club profile caches locally & broadcast to other tabs
            await invalidateCache(['/api/users/*', '/api/auth/me', '/api/clubs/*']);

            showNotification('Profile information updated successfully', 'success');
            navigate('/profile');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Profile update failed', 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!passwordData.currentPassword) {
            return showNotification('Please enter your current password', 'error');
        }
        if (!passwordData.newPassword) {
            return showNotification('Please enter a new password', 'error');
        }
        if (passwordData.newPassword.length < 6) {
            return showNotification('New password must be at least 6 characters long', 'error');
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return showNotification('New password and confirm password do not match', 'error');
        }

        setIsSavingPassword(true);
        try {
            await changePassword(passwordData.currentPassword, passwordData.newPassword);
            showNotification('Password changed successfully', 'success');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to change password', 'error');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleToggle2FA = async (newVal) => {
        setIsSaving2FA(true);
        try {
            setFormData(prev => ({ ...prev, isTwoStepEnabled: newVal }));
            const targetRole = isClubAccount ? 'club' : (isExternalAccount ? 'external' : (isFacultyAccount ? 'facultyCoordinator' : (authRole === 'admin' || role === 'admin' ? 'admin' : 'student')));
            const res = await updateProfile(targetRole, user.id || user._id, { isTwoStepEnabled: newVal });
            setSession(res.data.user, authRole || role);
            await invalidateCache(['/api/users/*', '/api/auth/me']);
            showNotification(`2-Step Verification ${newVal ? 'enabled' : 'disabled'}`, 'success');
        } catch (err) {
            setFormData(prev => ({ ...prev, isTwoStepEnabled: !newVal }));
            showNotification(err.response?.data?.message || 'Failed to update 2FA setting', 'error');
        } finally {
            setIsSaving2FA(false);
        }
    };

    if (!user) return (
        <div className="text-center py-20">
            <ShimmerText text="Loading profile..." className="text-sm font-semibold tracking-wide" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                        Account Settings
                    </h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your personal profile details and security credentials.
                    </p>
                </div>
                <Link
                    to="/profile"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors shadow-2xs"
                >
                    <ArrowLeft size={14} /> Back to Profile
                </Link>
            </div>

            {/* Navigation Tabs (Profile vs Security) */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-8">
                <button
                    type="button"
                    onClick={() => setSearchParams({ tab: 'profile' })}
                    className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'profile'
                            ? 'border-brand-600 text-brand-600 dark:text-brand-500'
                            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                >
                    <User size={16} />
                    Profile Details
                </button>
                <button
                    type="button"
                    onClick={() => setSearchParams({ tab: 'security' })}
                    className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'security'
                            ? 'border-brand-600 text-brand-600 dark:text-brand-500'
                            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                >
                    <Lock size={16} />
                    Security & Password
                </button>
            </div>

            {/* TAB 1: PROFILE DETAILS FORM */}
            {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-neutral-900 p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-6 shadow-xs">

                    {/* Profile Photo Upload */}
                    <div className="flex justify-center pb-6 border-b border-neutral-100 dark:border-neutral-800">
                        <ProfilePhotoUpload
                            user={user}
                            onPhotoUpdate={async (newUrl) => {
                                const updatedUser = {
                                    ...user,
                                    profileImage: newUrl,
                                    clubLogo: newUrl,
                                    club: user?.club ? { ...user.club, clubLogo: newUrl } : user?.club
                                };
                                setUser(updatedUser);
                                setSession(updatedUser, role);
                                await invalidateCache(['/api/clubs/*', '/api/users/*']);
                            }}
                        />
                    </div>

                    {/* Read Only Academic & Core Fields (Immutability enforced) */}
                    {isFacultyAccount ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 border border-neutral-200/80 dark:border-neutral-700/80 rounded-xl">
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Faculty Name</label>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate">{user.name || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Official Email</label>
                                <p className="font-mono text-neutral-800 dark:text-neutral-100 font-semibold text-xs truncate" title={user.email}>{user.email}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Role Designation</label>
                                <p className="font-semibold text-brand-600 dark:text-brand-400 text-xs truncate">Faculty Coordinator</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Assigned Club</label>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate">
                                    {user.clubName || user.club?.clubName || user.memberships?.[0]?.clubName || user.clubId || 'Assigned Club'}
                                </p>
                            </div>
                        </div>
                    ) : isExternalAccount ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 border border-neutral-200/80 dark:border-neutral-700/80 rounded-xl">
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Participant Name</label>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate">{user.name || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Official Email</label>
                                <p className="font-mono text-neutral-800 dark:text-neutral-100 font-semibold text-xs truncate" title={user.email}>{user.email}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">College / Institution</label>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate" title={user.collegeName || user.college || 'External Institution'}>
                                    {user.collegeName || user.college || user.institution || 'External Institution'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Program & Graduation</label>
                                <p className="font-semibold text-brand-600 dark:text-brand-400 text-xs truncate">
                                    {[user.program || user.branch, user.graduationYear || user.expectedGraduationYear].filter(Boolean).join(" • ") || 'External Participant'}
                                </p>
                            </div>
                        </div>
                    ) : isClubAccount ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 border border-neutral-200/80 dark:border-neutral-700/80 rounded-xl">
                                <div>
                                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Club Name</label>
                                    <p className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate">{user.clubName || user.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Official Email</label>
                                    <p className="font-mono text-neutral-800 dark:text-neutral-100 font-semibold text-xs truncate" title={user.email}>{user.email}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Category</label>
                                    <p className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate">
                                        {user.category || user.club?.category || 'General'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Club ID / Slug</label>
                                    <p className="font-mono font-semibold text-brand-600 dark:text-brand-400 text-xs truncate">{user.slug || user.clubId || 'N/A'}</p>
                                </div>
                            </div>
                            {(user.motto || user.club?.motto) && (
                                <div className="bg-neutral-50/40 dark:bg-neutral-800/20 px-4 py-2.5 border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider shrink-0">Club Motto:</span>
                                    <span className="text-xs italic text-neutral-700 dark:text-neutral-300 truncate">"{user.motto || user.club?.motto}"</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 border border-neutral-200/80 dark:border-neutral-700/80 rounded-xl">
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Roll No</label>
                                <p className="font-mono text-neutral-800 dark:text-neutral-100 font-semibold text-xs truncate">{user.rollNo || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Email</label>
                                <p className="font-mono text-neutral-800 dark:text-neutral-100 font-semibold text-xs truncate" title={user.email}>{user.email}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Program & Branch</label>
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100 text-xs truncate">
                                    {user.program || 'N/A'}{user.branch ? ` • ${user.branch}` : ''}
                                </p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Academic Standing</label>
                                <p className="font-semibold text-brand-600 dark:text-brand-400 text-xs truncate">{displayAcademicStanding || 'N/A'}</p>
                            </div>
                        </div>
                    )}

                    {/* Editable Profile Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isClubAccount ? (
                            <div className="md:col-span-2 p-5 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200/60 dark:border-brand-800/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-brand-900 dark:text-brand-300">Club Details & Public Information</p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                        Official club details — including <strong>Club Name</strong>, <strong>Club Motto / Slogan</strong>, Category, Description, and <strong>Social Media links</strong> — are managed exclusively via Club Settings.
                                    </p>
                                </div>
                                <Link
                                    to={`/club/edit/${user?.clubId || user?.club?.id || user?.id}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs"
                                >
                                    Edit in Club Settings →
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleProfileChange}
                                        className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">Instagram URL</label>
                                    <input
                                        type="url"
                                        name="instagramProfile"
                                        value={formData.instagramProfile}
                                        onChange={handleProfileChange}
                                        placeholder="https://instagram.com/handle"
                                        className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">LinkedIn URL</label>
                                    <input
                                        type="url"
                                        name="linkedinProfile"
                                        value={formData.linkedinProfile}
                                        onChange={handleProfileChange}
                                        placeholder="https://linkedin.com/in/handle"
                                        className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">X (Twitter) URL</label>
                                    <input
                                        type="url"
                                        name="xProfile"
                                        value={formData.xProfile}
                                        onChange={handleProfileChange}
                                        placeholder="https://x.com/handle"
                                        className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">
                                        Portfolio Website
                                    </label>
                                    <input
                                        type="url"
                                        name="portfolioUrl"
                                        value={formData.portfolioUrl}
                                        onChange={handleProfileChange}
                                        placeholder="https://yourportfolio.com"
                                        className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">WhatsApp Number / Group</label>
                                    <input
                                        type="tel"
                                        name="whatsappNumber"
                                        value={formData.whatsappNumber}
                                        onChange={handleProfileChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">GitHub URL</label>
                                    <input
                                        type="url"
                                        name="githubProfile"
                                        value={formData.githubProfile}
                                        onChange={handleProfileChange}
                                        placeholder="https://github.com/username"
                                        className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                    />
                                </div>
                            </>
                        )}
                    </div>


                    {isClubAccount ? (
                        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-neutral-100 dark:border-neutral-800">
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                                Need to update club name, motto, description, or social links?
                            </span>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile')}
                                    className="flex-1 sm:flex-none py-2.5 px-6 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer shadow-2xs text-center"
                                >
                                    Back to Profile
                                </button>
                                <Link
                                    to={`/club/edit/${user?.clubId || user?.club?.id || user?.id}`}
                                    className="flex-1 sm:flex-none py-2.5 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all text-center"
                                >
                                    Open Club Settings →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="py-2.5 px-6 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer shadow-2xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingProfile}
                                className={`py-2.5 px-7 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer ${isSavingProfile
                                        ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed shadow-none'
                                        : 'bg-brand-600 hover:bg-brand-700'
                                    }`}
                            >
                                {isSavingProfile ? 'Saving Changes…' : 'Save Profile Details'}
                            </button>
                        </div>
                    )}
                </form>
            )}

            {/* TAB 2: SECURITY & PASSWORD FORM */}
            {activeTab === 'security' && (
                <div className="space-y-6">

                    <form onSubmit={handlePasswordSubmit} className="bg-white dark:bg-neutral-900 p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-6 shadow-xs">
                        <div className="flex items-center gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/30 text-brand-600 flex items-center justify-center shrink-0">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-neutral-900 dark:text-white">Change Account Password</h2>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose a secure password that you haven't used elsewhere.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">
                                    Current Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter your current password"
                                        className="w-full px-4 py-2.5 pr-10 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer focus:outline-none"
                                    >
                                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">
                                        New Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            name="newPassword"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="At least 6 characters"
                                            className="w-full px-4 py-2.5 pr-10 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer focus:outline-none"
                                        >
                                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <PasswordStrengthChecker
                                        password={passwordData.newPassword}
                                        userInputs={[formData.name, user?.name, user?.email]}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-wider mb-2">
                                        Confirm New Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Re-enter new password"
                                            className="w-full px-4 py-2.5 pr-10 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all text-sm font-medium text-neutral-900 dark:text-white"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer focus:outline-none"
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">
                                * Rate Limit: Maximum 2 password updates per 24 hours.
                            </p>
                            <button
                                type="submit"
                                disabled={isSavingPassword}
                                className={`py-2.5 px-6 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer w-full sm:w-auto ${isSavingPassword
                                        ? 'bg-neutral-300 dark:bg-neutral-700 cursor-not-allowed shadow-none'
                                        : 'bg-brand-600 hover:bg-brand-700'
                                    }`}
                            >
                                {isSavingPassword ? 'Updating Password…' : 'Update Password'}
                            </button>
                        </div>
                    </form>

                    {/* 2-Step Verification Card (Available for all accounts) */}
                    <div className="bg-white dark:bg-neutral-900 p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
                        <label className="flex items-center justify-between p-4 bg-brand-50/40 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 rounded-xl cursor-pointer group hover:border-brand-500 transition-colors">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Two-Factor Authentication (2FA)</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Requires a secure email OTP code whenever you log in.</p>
                                </div>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isTwoStepEnabled}
                                    disabled={isSaving2FA}
                                    onChange={(e) => handleToggle2FA(e.target.checked)}
                                    className="sr-only peer"
                                    id="isTwoStepEnabledToggle"
                                />
                                <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                            </div>
                        </label>
                    </div>

                </div>
            )}

        </div>
    );
};

export default EditProfile;
