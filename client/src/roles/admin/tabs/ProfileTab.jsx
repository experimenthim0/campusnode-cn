import React, { useState } from 'react';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../../../services/userService';
import { changePassword } from '../../../services/authService';
import PasswordStrengthChecker from '../../../components/PasswordStrengthChecker';

const ProfileTab = ({
    profileName,
    setProfileName,
    profileEmail,
    profile2FA,
    setProfile2FA
}) => {
    const { user: admin, role, setSession } = useAuth();
    const { showNotification } = useNotification();
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [profilePasswordForm, setProfilePasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const updateRes = await updateProfile(role, admin.id || admin._id, {
                name: profileName,
                isTwoStepEnabled: profile2FA
            });
            
            const updatedAdmin = {
                ...admin,
                name: updateRes.data.user.name,
                isTwoStepEnabled: updateRes.data.user.isTwoStepEnabled
            };
            setSession(updatedAdmin, role);
            
            showNotification('Profile updated successfully', 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (profilePasswordForm.newPassword !== profilePasswordForm.confirmPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }
        if (profilePasswordForm.newPassword.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error');
            return;
        }
        setIsSavingPassword(true);
        try {
            await changePassword(profilePasswordForm.currentPassword, profilePasswordForm.newPassword);
            showNotification('Password changed successfully', 'success');
            setProfilePasswordForm({
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

    return (
        <div className="max-w-2xl space-y-8">
            <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 bg-cn-surface">
                <h2 className="text-base font-black text-black dark:text-white tracking-wide mb-1">Admin Profile</h2>
                <p className="text-neutral-400 text-xs mb-6">Update display name and security preferences.</p>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Display Name</label>
                        <input 
                            type="text" 
                            value={profileName} 
                            onChange={(e) => setProfileName(e.target.value)} 
                            required 
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] focus:border-brand-600 dark:focus:border-brand-500 outline-none transition-colors" 
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Email Address</label>
                        <input 
                            type="email" 
                            value={profileEmail} 
                            disabled 
                            className="w-full px-3 py-2.5 bg-neutral-100 dark:bg-zinc-800/50 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] text-neutral-400 cursor-not-allowed" 
                        />
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={profile2FA} 
                                onChange={(e) => setProfile2FA(e.target.checked)} 
                                className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" 
                            />
                            <div>
                                <p className="text-xs font-bold text-black dark:text-white">Enable Two-Factor Authentication (2FA)</p>
                                <p className="text-[11px] text-neutral-400">Require an email OTP code whenever logging into admin tools.</p>
                            </div>
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSavingProfile} 
                            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 bg-cn-surface">
                <h2 className="text-base font-black text-black dark:text-white tracking-wide mb-1">Change Password</h2>
                <p className="text-neutral-400 text-xs mb-6">Ensure your administrative password is strong and secure.</p>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Current Password</label>
                        <input 
                            type="password" 
                            value={profilePasswordForm.currentPassword} 
                            onChange={(e) => setProfilePasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} 
                            required 
                            className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] focus:border-brand-600 dark:focus:border-brand-500 outline-none transition-colors" 
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">New Password</label>
                            <input 
                                type="password" 
                                value={profilePasswordForm.newPassword} 
                                onChange={(e) => setProfilePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} 
                                required 
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] focus:border-brand-600 dark:focus:border-brand-500 outline-none transition-colors" 
                            />
                            <PasswordStrengthChecker 
                                password={profilePasswordForm.newPassword} 
                                userInputs={[profileName, profileEmail]} 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Confirm New Password</label>
                            <input 
                                type="password" 
                                value={profilePasswordForm.confirmPassword} 
                                onChange={(e) => setProfilePasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))} 
                                required 
                                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[13px] focus:border-brand-600 dark:focus:border-brand-500 outline-none transition-colors" 
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSavingPassword} 
                            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {isSavingPassword ? 'Updating Password...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileTab;
