import React, { useState } from 'react';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../../../services/userService';
import { changePassword } from '../../../services/authService';
import PasswordStrengthChecker from '../../../components/PasswordStrengthChecker';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, KeyRound, Loader2, User } from 'lucide-react';

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
        <div className="max-w-2xl space-y-6">
            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        <CardTitle className="text-base font-bold">Admin Profile</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                        Update your administrator identity and security preferences.
                    </CardDescription>
                </CardHeader>
                
                <form onSubmit={handleUpdateProfile}>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-foreground">
                                Display Name
                            </label>
                            <Input 
                                type="text" 
                                value={profileName} 
                                onChange={(e) => setProfileName(e.target.value)} 
                                required 
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-foreground">
                                Email Address
                            </label>
                            <Input 
                                type="email" 
                                value={profileEmail} 
                                disabled 
                                className="h-9 text-sm bg-muted/50 cursor-not-allowed"
                            />
                        </div>

                        <div className="pt-2 rounded-lg border border-border p-3.5 bg-muted/20">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={profile2FA} 
                                    onChange={(e) => setProfile2FA(e.target.checked)} 
                                    className="mt-0.5 size-4 rounded accent-primary cursor-pointer" 
                                />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <ShieldCheck className="size-3.5 text-primary" />
                                        Enable Two-Factor Authentication (2FA)
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                        Require a secure one-time verification code when accessing administrative panels.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex justify-end border-t border-border mt-4">
                        <Button 
                            type="submit" 
                            disabled={isSavingProfile}
                            className="gap-2 cursor-pointer font-semibold shadow-xs"
                        >
                            {isSavingProfile && <Loader2 className="size-3.5 animate-spin" />}
                            {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <KeyRound className="size-4 text-primary" />
                        <CardTitle className="text-base font-bold">Change Password</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                        Ensure your administrative password is unique, strong, and stored securely.
                    </CardDescription>
                </CardHeader>
                
                <form onSubmit={handleChangePassword}>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-foreground">
                                Current Password
                            </label>
                            <Input 
                                type="password" 
                                value={profilePasswordForm.currentPassword} 
                                onChange={(e) => setProfilePasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))} 
                                required 
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-foreground">
                                    New Password
                                </label>
                                <Input 
                                    type="password" 
                                    value={profilePasswordForm.newPassword} 
                                    onChange={(e) => setProfilePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))} 
                                    required 
                                    className="h-9 text-sm"
                                />
                                <PasswordStrengthChecker 
                                    password={profilePasswordForm.newPassword} 
                                    userInputs={[profileName, profileEmail]} 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-foreground">
                                    Confirm New Password
                                </label>
                                <Input 
                                    type="password" 
                                    value={profilePasswordForm.confirmPassword} 
                                    onChange={(e) => setProfilePasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))} 
                                    required 
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex justify-end border-t border-border mt-4">
                        <Button 
                            type="submit" 
                            disabled={isSavingPassword}
                            className="gap-2 cursor-pointer font-semibold shadow-xs"
                        >
                            {isSavingPassword && <Loader2 className="size-3.5 animate-spin" />}
                            {isSavingPassword ? 'Updating Password...' : 'Update Password'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ProfileTab;
