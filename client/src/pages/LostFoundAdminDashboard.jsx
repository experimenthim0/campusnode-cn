import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import {
  getLostFoundStats,
  getAllLostFoundAdmin,
  toggleFraud,
  deleteLostFoundItem,
  blockLostFoundUser
} from '../services/adminService';
import { hasPermission, PERMISSIONS } from '../utils/rbac';

const LostFoundAdminDashboard = () => {
    const [stats, setStats] = useState({ total: 0, active: 0, reunited: 0, fraud: 0 });
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const { user, role } = useAuth();

    const handlePasswordChange = (e) => {
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("New passwords do not match!");
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long!");
            return;
        }
        setIsChangingPassword(true);
        try {
            const res = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            toast.success(res.data.message || "Password changed successfully!");
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change password.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    

    useEffect(() => {
        if (!hasPermission(user, PERMISSIONS.LOST_FOUND_MODERATE)) {
            navigate('/login');
            return;
        }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [statsRes, itemsRes] = await Promise.all([
                getLostFoundStats(),
                getAllLostFoundAdmin()
            ]);
            setStats(statsRes.data);
            setItems(itemsRes.data);
        } catch (error) {
            toast.error('Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFraud = async (id) => {
        try {
            const res = await toggleFraud(id);
            toast.success(res.data.message);
            fetchDashboardData();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this item?')) return;
        try {
            await deleteLostFoundItem(id);
            toast.success('Item deleted');
            fetchDashboardData();
        } catch (error) {
            toast.error('Deletion failed');
        }
    };

    const handleToggleBlock = async (userId) => {
        if (!window.confirm('Toggle block status for this user?')) return;
        try {
            const res = await blockLostFoundUser(userId);
            toast.success(res.data.message);
            fetchDashboardData();
        } catch (error) {
            toast.error('Block action failed');
        }
    };

    const filteredItems = items.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0a0a0a] animate-pulse">
            <div className="bg-white text-black py-12 px-6 border-b border-neutral-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-neutral-100 dark:bg-zinc-800 rounded-lg" />
                        <div className="h-4 w-48 bg-neutral-50 dark:bg-zinc-900 rounded-lg" />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-8">
                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-neutral-200 dark:border-zinc-800 space-y-3">
                            <div className="w-10 h-10 bg-neutral-100 dark:bg-zinc-800 rounded-xl" />
                            <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-800 rounded" />
                            <div className="h-7 w-20 bg-neutral-200 dark:bg-zinc-800 rounded-lg" />
                        </div>
                    ))}
                </div>

                {/* Content Table Skeleton */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-zinc-800 overflow-hidden p-6 space-y-6">
                    <div className="h-6 w-32 bg-neutral-200 dark:bg-zinc-800 rounded-lg" />
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex gap-4 items-center border-b border-neutral-100 dark:border-zinc-800/30 pb-4 last:border-0 last:pb-0">
                                <div className="w-10 h-10 bg-neutral-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-48 bg-neutral-100 dark:bg-zinc-800 rounded animate-pulse" />
                                    <div className="h-3 w-72 bg-neutral-100 dark:bg-zinc-800 rounded animate-pulse" />
                                </div>
                                <div className="h-4 w-16 bg-neutral-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                                <div className="h-4 w-24 bg-neutral-100 dark:bg-zinc-800 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0a0a0a] pb-20">
            <Toaster position="top-right" />
            
            <div className="bg-white text-black py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">L&F Moderation Portal</h1>
                        <p className="text-gray-400 text-sm mt-1">Manage reported items and user restrictions</p>
                    </div>
                    <div className="flex gap-3">
                        {(role === 'admin' || role === 'superAdmin') && (
                            <button onClick={() => navigate('/admin-dashboard')} className="px-5 py-2 bg-white/10  rounded-lg text-sm font-semibold transition-colors border border-gray-300  hover:bg-gray-300 cursor-pointer">
                                Main Dashboard
                            </button>
                        )}
                        <button onClick={() => navigate('/lost-found')} className="px-5 py-2 bg-white/10  rounded-lg text-sm font-semibold transition-colors border border-gray-300  hover:bg-gray-300 cursor-pointer">
                            View Public Feed
                        </button>
                        <button onClick={() => setShowPasswordModal(true)} className="px-5 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer">
                            <i className="ri-key-2-line"></i> Change Password
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Items" value={stats.total} icon="ri-list-check" color="blue" />
                    <StatCard label="Active Items" value={stats.active} icon="ri-search-eye-line" color="green" />
                    <StatCard label="Reunited" value={stats.reunited} icon="ri-heart-fill" color="orange" />
                    <StatCard label="Fraud Flagged" value={stats.fraud} icon="ri-error-warning-fill" color="red" />
                </div>

                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm border border-neutral-200 dark:border-zinc-800 overflow-hidden">
                    <div className="p-6 border-b border-neutral-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Items</h2>
                        <div className="relative w-full md:w-80">
                            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500"></i>
                            <input 
                                type="text" 
                                placeholder="Search title, user, or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 focus:scale-[1.01] focus:-translate-y-0.5 focus:shadow-[0_4px_20px_rgba(234,88,12,0.08)]"
                            />
                        </div>
                    </div>
 
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500">Item</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500">Reporter</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody key={searchTerm} className="divide-y divide-neutral-100 dark:divide-zinc-800/50">
                                {filteredItems.map((item, idx) => (
                                    <tr 
                                        key={item.id} 
                                        className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors table-row-animate"
                                        style={{ animationDelay: `${idx * 0.03}s` }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-neutral-200 dark:border-zinc-800" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-400 dark:text-neutral-600">
                                                        <i className="ri-image-line"></i>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
                                                    <p className="text-[11px] text-gray-500 dark:text-neutral-400 line-clamp-1">{item.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                                                    item.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'
                                                }`}>
                                                    {item.status}
                                                </span>
                                                {item.isFraud && (
                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 w-fit">
                                                        FRAUD FLAG
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.user?.name}</p>
                                                <p className="text-[11px] text-gray-500 dark:text-neutral-400">{item.user?.email}</p>
                                                {item.user?.isBlocked && (
                                                    <span className="text-[10px] text-red-500 font-bold mt-0.5">Blocked User</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleToggleFraud(item.id)}
                                                    className={`p-2 rounded-lg transition-colors ${item.isFraud ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 hover:text-orange-500'}`}
                                                    title={item.isFraud ? "Unmark Fraud" : "Mark as Fraud"}
                                                >
                                                    <i className="ri-error-warning-line"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleBlock(item.userId)}
                                                    className={`p-2 rounded-lg transition-colors ${item.user?.isBlocked ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 hover:text-red-500'}`}
                                                    title={item.user?.isBlocked ? "Unblock User" : "Block User"}
                                                >
                                                    <i className="ri-user-forbid-line"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                                    title="Delete Permanently"
                                                >
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center text-gray-400">
                                            <i className="ri-inbox-line text-4xl mb-2 block"></i>
                                            No items found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-2xl border border-neutral-200 dark:border-zinc-800 p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowPasswordModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                        >
                            <i className="ri-close-line text-xl"></i>
                        </button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                                <i className="ri-lock-password-line text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
                                <p className="text-xs text-gray-400 dark:text-neutral-500">Update your dashboard credentials</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-1.5">Current Password</label>
                                <input 
                                    type="password"
                                    name="currentPassword"
                                    required
                                    value={passwordForm.currentPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter current password"
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors text-black dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-1.5">New Password</label>
                                <input 
                                    type="password"
                                    name="newPassword"
                                    required
                                    value={passwordForm.newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter new password (min. 6 chars)"
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors text-black dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-1.5">Confirm New Password</label>
                                <input 
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    value={passwordForm.confirmPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Confirm new password"
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors text-black dark:text-white"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="px-4 py-2 border border-neutral-200 dark:border-zinc-800 rounded-xl text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                    {isChangingPassword ? "Saving..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    };
    return (
        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm border border-neutral-200 dark:border-zinc-800">
            <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center mb-4`}>
                <i className={`${icon} text-xl`}></i>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-1">{label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
        </div>
    );
};

export default LostFoundAdminDashboard;
