'use client';

import {
  User,
  Bell,
  Shield,
  Trash2,
  Mail,
  Camera,
  Smartphone,
  Globe,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Settings,
  Lock,
  Zap,
  Palette
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/hooks/use-translation';
import { type Locale } from '@/lib/language-store';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { uploadAvatar } from '@/lib/teamflow-api';
import { getTwoFactorStatus } from '@/lib/auth-bridge';
import { applyStylePreset, getStoredStylePreset, saveStylePreset, type StylePreset } from '@/lib/style-preset';

type TabType = 'profile' | 'notifications' | 'account' | 'workspace';

export function SettingsView() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const changePassword = useAuthStore(state => state.changePassword);
  const setTwoFactorEnabledAction = useAuthStore(state => state.setTwoFactorEnabled);
  const deleteAccountAction = useAuthStore(state => state.deleteAccount);
  const { addNotification } = useAppStore();
  const { t, locale, setLocale } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [bio, setBio] = useState('Passionate about building great software and collaborative teams.');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [securityBusy, setSecurityBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notification toggles state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [tasksEnabled, setTasksEnabled] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stylePreset, setStylePreset] = useState<StylePreset>('classic');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      addNotification({ type: 'system', title: 'Invalid File', message: 'Please select an image file.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addNotification({ type: 'system', title: 'File Too Large', message: 'Image must be less than 5MB.' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file);
      if (result.success) {
        // Update user state in auth store
        useAuthStore.setState((state) => ({
          user: state.user ? { ...state.user, avatar: result.avatarUrl } : null
        }));
        
        addNotification({
          type: 'system',
          title: 'Avatar Updated',
          message: 'Your profile photo has been updated successfully.'
        });
      }
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Unable to upload profile photo.'
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = () => {
    addNotification({
      type: 'system',
      title: 'Profile Updated',
      message: 'Your profile changes have been saved successfully.'
    });
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      addNotification({ type: 'system', title: 'Validation Error', message: 'Enter your password to confirm deletion.' });
      return;
    }

    setSecurityBusy(true);
    try {
      await deleteAccountAction(deletePassword);
      addNotification({
        type: 'system',
        title: 'Account Deleted',
        message: 'Your account has been permanently deleted. You will be logged out shortly.'
      });
      // Delay logout to show notification
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Deletion Failed',
        message: error instanceof Error ? error.message : 'Unable to delete account. Please check your password.'
      });
    } finally {
      setSecurityBusy(false);
      setDeletePassword('');
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'account') {
      return;
    }

    void getTwoFactorStatus()
      .then(result => setTwoFactorEnabled(result.twoFactorEnabled))
      .catch(() => setTwoFactorEnabled(false));
  }, [activeTab, user]);

  useEffect(() => {
    const preset = getStoredStylePreset();
    setStylePreset(preset);
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      addNotification({ type: 'system', title: 'Validation Error', message: 'Enter your current and new password.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      addNotification({ type: 'system', title: 'Validation Error', message: 'Passwords do not match.' });
      return;
    }

    setSecurityBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      addNotification({ type: 'system', title: 'Password Updated', message: 'Your password was changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      addNotification({ type: 'system', title: 'Password Change Failed', message: error instanceof Error ? error.message : 'Unable to change password.' });
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    if (!twoFactorPassword) {
      addNotification({ type: 'system', title: 'Validation Error', message: 'Confirm your password to update 2FA.' });
      return;
    }

    setSecurityBusy(true);
    try {
      await setTwoFactorEnabledAction(!twoFactorEnabled, twoFactorPassword);
      setTwoFactorEnabled(!twoFactorEnabled);
      setTwoFactorPassword('');
      addNotification({ type: 'system', title: 'Security Updated', message: twoFactorEnabled ? 'Two-factor authentication disabled.' : 'Two-factor authentication enabled.' });
    } catch (error) {
      addNotification({ type: 'system', title: '2FA Update Failed', message: error instanceof Error ? error.message : 'Unable to update 2FA.' });
    } finally {
      setSecurityBusy(false);
    }
  };

  const languages: { id: Locale; name: string; flag: string; native: string }[] = [
    { id: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
    { id: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { id: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
    { id: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    { id: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { id: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
    { id: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  ];

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account Security', icon: Shield },
    { id: 'workspace', label: 'Region & Language', icon: Globe },
  ];

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] shadow-inner">
            <Settings className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--text))]">{t('common.settings')}</h1>
            <p className="text-sm text-[hsl(var(--muted))] mt-1">Manage your global preferences and terminal configuration.</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--danger))/0.2] bg-[hsl(var(--danger)/0.05)] px-5 py-2.5 text-sm font-bold text-[hsl(var(--danger))] shadow-sm transition-all hover:bg-[hsl(var(--danger)/0.1)] hover:scale-105 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          {t('common.logout')}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        {/* Navigation Sidebar */}
        <aside className="flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex w-full items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-[hsl(var(--accent))] text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] font-bold'
                  : 'bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] hover:border-[hsl(var(--border))]'
                }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${activeTab === tab.id ? 'bg-black/10' : 'bg-[hsl(var(--bg-soft))] group-hover:bg-[hsl(var(--bg-panel))]'}`}>
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-black' : ''}`} />
              </div>
              <span className="text-sm">{tab.label}</span>
              <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${activeTab === tab.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="min-h-[50vh] overflow-hidden rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-1 md:min-h-[600px] md:rounded-[32px]">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full rounded-[28px] bg-[hsl(var(--bg-panel)/0.4)] p-8"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
                  <div className="group relative shrink-0">
                    <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.5)] p-1 shadow-xl shadow-[hsl(var(--accent)/0.2)] relative">
                      {uploadingAvatar && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[28px] bg-black/50 backdrop-blur-sm">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--accent))] border-t-transparent" />
                        </div>
                      )}
                      {user?.avatar ? (
                        <img src={user.avatar} className="h-full w-full rounded-[28px] object-cover border-4 border-[hsl(var(--bg-elevated))]" alt={user.name} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-[hsl(var(--bg-elevated))] text-4xl font-black text-[hsl(var(--text))]">
                          {user?.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-[hsl(var(--bg-elevated))] border-2 border-[hsl(var(--border))] text-[hsl(var(--text))] shadow-lg transition-transform hover:scale-110 active:scale-95">
                      <Camera className="h-4 w-4" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[hsl(var(--text))]">Public Profile</h2>
                    <p className="text-sm text-[hsl(var(--muted))] mt-1">This information will be displayed publicly so be careful what you share.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">Full Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-5 py-3.5 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted))]" />
                      <input
                        value={email}
                        readOnly
                        className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-panel))] pl-12 pr-5 py-3.5 text-sm text-[hsl(var(--muted))] outline-none cursor-not-allowed opacity-70"
                      />
                      <Lock className="absolute right-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted))/0.5]" />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">Biography</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      placeholder="Tell the team a little about yourself..."
                      className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-5 py-4 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] transition-all leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-8 mt-4 border-t border-[hsl(var(--border-soft))]">
                  <button
                    onClick={handleSaveProfile}
                    className="rounded-2xl bg-[hsl(var(--accent))] px-8 py-3.5 text-sm font-bold text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition hover:opacity-90 active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full rounded-[28px] bg-[hsl(var(--bg-panel)/0.4)] p-8 flex flex-col"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[hsl(var(--text))]">Notification Preferences</h2>
                  <p className="text-sm text-[hsl(var(--muted))] mt-1">Control how and when you want to be notified about workspace activity.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'push', title: 'Push Notifications', desc: 'Get alerts directly on your device instantly.', icon: Smartphone, state: pushEnabled, setter: setPushEnabled },
                    { id: 'email', title: 'Email Alerts', desc: 'Receive a daily summary of activity and direct mentions.', icon: Mail, state: emailEnabled, setter: setEmailEnabled },
                    { id: 'tasks', title: 'Task Assignments', desc: 'Notify immediately when someone assigns you a task.', icon: CheckCircle2, state: tasksEnabled, setter: setTasksEnabled },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] p-5 transition hover:border-[hsl(var(--border-strong))]">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--bg-elevated))] shadow-sm text-[hsl(var(--text))]">
                           <item.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-[hsl(var(--text))]">{item.title}</p>
                          <p className="text-xs text-[hsl(var(--muted))] mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      
                      {/* Custom Toggle Switch */}
                      <button 
                        onClick={() => item.setter(!item.state)}
                        className={`relative flex h-7 w-12 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none ${item.state ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--bg-panel))] border border-[hsl(var(--border))]'}`}
                      >
                        <div 
                          className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${item.state ? 'translate-x-5' : 'translate-x-0'}`} 
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full rounded-[28px] bg-[hsl(var(--bg-panel)/0.4)] p-8"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[hsl(var(--text))]">Security & Data</h2>
                  <p className="text-sm text-[hsl(var(--muted))] mt-1">Manage your account security and data retention.</p>
                </div>
                
                <div className="space-y-6">
                  <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[hsl(var(--text))] flex items-center gap-2">
                          <Lock className="h-5 w-5 text-[hsl(var(--accent))]" /> Change Password
                        </h3>
                        <p className="mt-1 text-sm text-[hsl(var(--muted))]">Update your password for the current account.</p>
                      </div>
                      <span className="rounded-full border border-[hsl(var(--accent))/0.25] bg-[hsl(var(--accent)/0.08)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--accent))]">
                        Secure
                      </span>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" placeholder="Current password" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-panel))] px-4 py-3 text-sm outline-none focus:border-[hsl(var(--accent)/0.5)]" />
                      <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="New password" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-panel))] px-4 py-3 text-sm outline-none focus:border-[hsl(var(--accent)/0.5)]" />
                      <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm new password" className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-panel))] px-4 py-3 text-sm outline-none focus:border-[hsl(var(--accent)/0.5)]" />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button onClick={handleChangePassword} disabled={securityBusy} className="rounded-2xl bg-[hsl(var(--accent))] px-6 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-60">
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[hsl(var(--text))] flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-[hsl(var(--accent))]" /> Two-Factor Authentication
                        </h3>
                        <p className="mt-1 text-sm text-[hsl(var(--muted))]">Receive a one-time email code when signing in.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${twoFactorEnabled ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-400' : 'border border-[hsl(var(--border))] bg-[hsl(var(--bg-panel))] text-[hsl(var(--muted))]'}`}>
                          {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">Confirm password</label>
                        <input value={twoFactorPassword} onChange={e => setTwoFactorPassword(e.target.value)} type="password" placeholder="Confirm your password" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-panel))] px-4 py-3 text-sm outline-none focus:border-[hsl(var(--accent)/0.5)]" />
                      </div>

                      <button onClick={handleToggleTwoFactor} disabled={securityBusy} className="inline-flex h-fit items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-elevated))] px-5 py-3 text-sm font-bold text-[hsl(var(--text))] transition hover:bg-[hsl(var(--bg-panel))] disabled:opacity-60">
                        {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[hsl(var(--danger))/0.3] bg-[hsl(var(--danger)/0.05)] p-6">
                    <h3 className="text-lg font-bold text-[hsl(var(--danger))] flex items-center gap-2">
                      <Shield className="h-5 w-5" /> Danger Zone
                    </h3>
                    <p className="mt-2 text-sm text-[hsl(var(--text))] opacity-80">These actions are permanent and cannot be undone. Proceed with caution.</p>
  
                    <div className="mt-6 space-y-4">
                      {!showDeleteConfirm ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--danger))/0.2] bg-[hsl(var(--bg-elevated))] p-5 shadow-sm">
                          <div>
                            <p className="font-bold text-[hsl(var(--text))]">Delete Account</p>
                            <p className="text-xs text-[hsl(var(--muted))] mt-1">Permanently remove your account and erase all associated data.</p>
                          </div>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="shrink-0 rounded-xl bg-[hsl(var(--danger))] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[hsl(var(--danger)/0.2)] transition hover:opacity-90 active:scale-95 disabled:opacity-60"
                            disabled={securityBusy}
                          >
                            Delete Account
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[hsl(var(--danger))/0.3] bg-[hsl(var(--danger)/0.05)] p-6 space-y-4">
                          <div>
                            <p className="font-bold text-[hsl(var(--danger))] text-lg mb-4">⚠️ Confirm Account Deletion</p>
                            <p className="text-sm text-[hsl(var(--text))] mb-4">This action cannot be undone. All your data will be permanently deleted, including:</p>
                            <ul className="text-xs text-[hsl(var(--muted))] space-y-1 mb-6 ml-4">
                              <li>• All workspaces and projects</li>
                              <li>• All tasks and documents</li>
                              <li>• All team memberships</li>
                              <li>• All account settings</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">
                              Enter your password to confirm
                            </label>
                            <input
                              type="password"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="Your password"
                              className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-panel))] px-4 py-3 text-sm outline-none focus:border-[hsl(var(--danger))/0.5]"
                              disabled={securityBusy}
                            />
                          </div>
                          <div className="flex gap-3 pt-4 border-t border-[hsl(var(--danger))/0.2)]">
                            <button
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeletePassword('');
                              }}
                              className="flex-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-elevated))] px-4 py-3 text-sm font-bold text-[hsl(var(--text))] transition hover:bg-[hsl(var(--bg-panel))] disabled:opacity-60"
                              disabled={securityBusy}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteAccount}
                              className="flex-1 rounded-2xl bg-[hsl(var(--danger))] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[hsl(var(--danger)/0.2)] transition hover:opacity-90 active:scale-95 disabled:opacity-60"
                              disabled={securityBusy || !deletePassword}
                            >
                              {securityBusy ? 'Deleting...' : 'Permanently Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'workspace' && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full rounded-[28px] bg-[hsl(var(--bg-panel)/0.4)] p-8"
              >
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-[hsl(var(--text))]">Workspace Preferences</h2>
                  <p className="text-sm text-[hsl(var(--muted))] mt-1">Configure app style and language preferences for your account.</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))] px-2">Visual Style Presets</label>
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                        {[
                          {
                            id: 'classic' as const,
                            name: 'Classic PM',
                            description: 'Balanced blue workspace for daily team operations.'
                          },
                          {
                            id: 'graphite' as const,
                            name: 'Graphite Ops',
                            description: 'Neutral, high-focus interface with reduced color noise.'
                          },
                          {
                            id: 'focus' as const,
                            name: 'Focus Green',
                            description: 'Action-driven style optimized for throughput and execution.'
                          }
                        ].map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setStylePreset(preset.id);
                              applyStylePreset(preset.id);
                              saveStylePreset(preset.id);
                              addNotification({
                                type: 'system',
                                title: 'Style Preset Applied',
                                message: `${preset.name} is now active across the app.`
                              });
                            }}
                            className={cn(
                              'rounded-2xl border p-4 text-left transition-all',
                              stylePreset === preset.id
                                ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)] ring-1 ring-[hsl(var(--accent)/0.35)]'
                                : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] hover:border-[hsl(var(--border-soft))]'
                            )}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--bg-panel))] text-[hsl(var(--accent))]">
                                <Palette className="h-4 w-4" />
                              </div>
                              {stylePreset === preset.id && (
                                <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">Active</span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-[hsl(var(--text))]">{preset.name}</p>
                            <p className="mt-1 text-xs text-[hsl(var(--muted))]">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))] px-2">Primary Interface Language</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {languages.map((lang) => (
                           <button
                             key={lang.id}
                             onClick={() => {
                               setLocale(lang.id);
                               addNotification({
                                 type: 'system',
                                 title: 'Interface Updated',
                                 message: `System language changed to ${lang.name}.`
                               });
                             }}
                             className={cn(
                               "flex items-center justify-between rounded-2xl border p-5 transition-all duration-300",
                               locale === lang.id 
                                 ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.05)] ring-1 ring-[hsl(var(--accent)/0.3)] shadow-lg shadow-[hsl(var(--accent)/0.05)]" 
                                 : "border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-elevated))]"
                             )}
                           >
                             <div className="flex items-center gap-4">
                               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--bg-panel))] text-2xl shadow-inner">
                                 {lang.flag}
                               </div>
                               <div className="text-left">
                                 <p className={cn("font-black text-sm transition-colors", locale === lang.id ? "text-white" : "text-[hsl(var(--muted))]")}>{lang.native}</p>
                                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{lang.name}</p>
                               </div>
                             </div>
                             {locale === lang.id && (
                               <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-black shadow-lg">
                                 <CheckCircle2 className="h-3.5 w-3.5" />
                               </div>
                             )}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="mt-8 pt-8 border-t border-[hsl(var(--border-soft))]">
                      <div className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--accent)/0.1)] bg-[hsl(var(--accent)/0.02)] p-5">
                         <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]">
                            <Zap className="h-5 w-5" />
                         </div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--accent))]">Quick Tip</p>
                            <p className="text-xs text-[hsl(var(--muted))]">You can also change language instantly by typing <span className="text-white font-bold underline underline-offset-4 cursor-pointer" onClick={() => addNotification({ type: 'system', title: 'Command Hint', message: 'Press Cmd+K and type "> language"' })}>Cmd+K &gt; language</span> from anywhere.</p>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
