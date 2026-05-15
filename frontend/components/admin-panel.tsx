'use client';

import { 
  Users, 
  Shield, 
  Settings, 
  FolderLock, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck,
  UserPlus,
  TrendingUp,
  BarChart3,
  History as HistoryIcon,
  Info,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
  Activity,
  Zap,
  Search,
  Cpu,
  Layers,
  Globe,
  Fingerprint,
  Target,
  LayoutGrid,
  Layers3,
  Users2,
  Settings2
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from '@/hooks/use-translation';
import { ROLE_PERMISSIONS, TIER_LIMITS, type MemberRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InviteDialog } from './invite-dialog';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { HistoryView } from './history-view';

type AdminTab = 'members' | 'roles' | 'workspace' | 'projects' | 'billing' | 'history' | 'danger';

export function AdminPanel() {
  const { 
    members, 
    projects, 
    tasks, 
    workspaces, 
    activeWorkspaceId, 
    updateMember, 
    removeMember, 
    addMember, 
    updateWorkspace,
    resetAllData,
    activeAdminTab,
    setActiveAdminTab,
    setActiveProject,
    deleteProject,
    setActiveView
  } = useAppStore();

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string; projectName: string } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const currentUser = useAuthStore(state => state.user);
  const { t } = useTranslation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<'pro' | 'enterprise' | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<'pro' | 'enterprise' | null>(null);

  useEffect(() => setIsMounted(true), []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const workspaceProjects = projects.filter(p => p.workspaceId === activeWorkspaceId && !p.isDeleted);

  const stats = useMemo(() => ({
    members: members.length,
    projects: workspaceProjects.length,
    tasks: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    velocity: Math.round((tasks.filter(t => t.status === 'done').length / (tasks.length || 1)) * 100)
  }), [members, workspaceProjects, tasks]);
  
  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'members', label: 'Members', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'workspace', label: 'Workspace', icon: Settings },
    { id: 'projects', label: 'Projects', icon: FolderLock },
    { id: 'billing', label: 'Billing & Usage', icon: Zap },
    { id: 'history', label: 'Trash History', icon: HistoryIcon },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic moved to InviteDialog
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'admin':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'manager':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'developer':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!confirmPlan) return;

    setUpgradingPlan(confirmPlan);
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_AUTH_PROVIDER_URL || '').trim().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v1/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({ planId: confirmPlan }),
      });

      const rawBody = await response.text();
      let data: { error?: string; checkoutUrl?: string; sessionId?: string } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        throw new Error(`Unexpected server response (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Upgrade failed');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.sessionId) {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
        if (!stripe) {
          throw new Error('Stripe is not initialized. Check publishable key.');
        }
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (result.error) {
          throw new Error(result.error.message || 'Stripe redirect failed');
        }
        return;
      }

      throw new Error('Invalid checkout response from server');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      alert(message);
    } finally {
      setUpgradingPlan(null);
      setConfirmPlan(null);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gray-950 text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Settings</h1>
          <p className="text-sm text-gray-400">Manage your workspace, members, and permissions</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm px-8">
        <nav className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-all",
                activeAdminTab === tab.id 
                  ? "border-blue-500 text-white" 
                  : "border-transparent text-gray-400 hover:text-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <AnimatePresence mode="wait">
            {activeAdminTab === 'members' && (
              <motion.section
                key="members"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {/* Members Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Team Members ({members.length})</h2>
                  </div>
                  <button 
                    onClick={() => setInviteOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors w-full sm:w-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                  </button>
                </div>

                {/* Members List */}
                <div className="space-y-2">
                  {members.map((member) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm">
                          {member.avatar || (member.name || '??').substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate">{member.name}</p>
                          <span className={cn(
                            "flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full border",
                            getRoleBadgeColor(member.role)
                          )}>
                            {member.role === 'owner' ? '👑 Owner' : (member.role || 'Member').charAt(0).toUpperCase() + (member.role || 'Member').slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{member.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {tasks.filter(t => t.assigneeId === member.id).length} tasks · Joined Jan 2026
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {member.role !== 'owner' ? (
                          <>
                            <select 
                              value={member.role} 
                              onChange={(e) => updateMember(member.id, { role: e.target.value as MemberRole })}
                              className="px-3 py-2 bg-gray-800 border border-gray-700 text-sm text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {['admin', 'developer', 'viewer'].map(r => (
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                              ))}
                            </select>
                            <button 
                              onClick={() => {
                                if (confirm(`Remove ${member.name} from workspace?`)) {
                                  removeMember(member.id);
                                }
                              }}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Workspace owner</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {activeAdminTab === 'roles' && (
              <motion.section
                key="roles"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-white">Role Permissions</h2>

                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 font-bold text-gray-300">Permission</th>
                        {Object.keys(ROLE_PERMISSIONS).map(role => (
                          <th key={role} className="px-6 py-4 font-bold text-gray-300 text-center capitalize">{role}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(ROLE_PERMISSIONS.owner).map((permission, i) => (
                        <tr key={permission} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-6 py-4 font-medium text-gray-300 capitalize">
                            {permission.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </td>
                          {Object.keys(ROLE_PERMISSIONS).map(role => (
                            <td key={role} className="px-6 py-4 text-center">
                              {ROLE_PERMISSIONS[role as MemberRole][permission as keyof typeof ROLE_PERMISSIONS.owner] ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-gray-600 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}

            {activeAdminTab === 'workspace' && (
              <motion.section
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Workspaces</h2>
                    <p className="text-sm text-gray-400 mt-1">You have {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {workspaces.map((workspace) => {
                    const workspaceProjects = projects.filter(p => p.workspaceId === workspace.id);
                    const workspaceTasks = tasks.filter(t => workspaceProjects.some(p => p.id === t.projectId));
                    const isActive = workspace.id === activeWorkspaceId;

                    return (
                      <div
                        key={workspace.id}
                        className={cn(
                          "bg-white/5 border rounded-lg p-6 transition-all duration-200",
                          isActive
                            ? "border-blue-500/50 bg-blue-500/5"
                            : "border-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-white">{workspace.name}</h3>
                                {isActive && (
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/50">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400">{workspace.description || 'No description'}</p>
                            </div>
                            <div className="text-xs text-gray-500">
                              <p>ID: {workspace.id}</p>
                              <p>Members: {workspace.memberIds.length}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                              <p className="text-xs text-gray-400 mb-1">Projects</p>
                              <p className="text-2xl font-bold text-white">{workspaceProjects.length}</p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                              <p className="text-xs text-gray-400 mb-1">Tasks</p>
                              <p className="text-2xl font-bold text-white">{workspaceTasks.length}</p>
                            </div>
                          </div>

                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                              <p className="text-xs text-gray-400 mb-1">Members</p>
                              <p className="text-2xl font-bold text-white">{workspace.memberIds.length}</p>
                            </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeWorkspace && (
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4">Active Workspace Settings</h3>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Workspace Name</label>
                        <input 
                          defaultValue={activeWorkspace?.name}
                          onBlur={(e) => activeWorkspace && updateWorkspace(activeWorkspace.id, { name: e.target.value })}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea 
                          defaultValue={activeWorkspace?.description}
                          onBlur={(e) => activeWorkspace && updateWorkspace(activeWorkspace.id, { description: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.section>
            )}

            {activeAdminTab === 'projects' && (
              <motion.section
                key="projects"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Projects Management</h2>
                    <p className="text-sm text-[hsl(var(--muted))] mt-1">Govern the workspace entities and their configurations.</p>
                  </div>
                  <button 
                    onClick={() => setActiveView('dashboard')} 
                    className="flex items-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-6 py-3 text-sm font-black text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    Initialize Node
                  </button>
                </div>

                <div className="grid gap-4">
                  {workspaceProjects.map(project => (
                    <div key={project.id} className="group relative flex items-center justify-between rounded-[32px] border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/[0.08] hover:border-white/20">
                      <div className="flex items-center gap-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.5)] text-2xl font-black text-black shadow-lg">
                          {project.key}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{project.name}</h3>
                          <div className="mt-2 flex items-center gap-4">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">
                              <Layers3 className="h-3.5 w-3.5" />
                              {project.type} Framework
                            </span>
                            <span className="h-1 w-1 rounded-full bg-white/20" />
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">
                              <Users2 className="h-3.5 w-3.5" />
                              {project.memberIds?.length || 0} Operators
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 opacity-0 transition-all group-hover:opacity-100">
                        <button 
                          onClick={() => {
                            setActiveProject(project.id);
                            setActiveView('project-settings');
                          }}
                          className="flex h-11 items-center gap-2 rounded-xl bg-white/5 px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                        >
                          <Settings2 className="h-4 w-4" />
                          Configure
                        </button>
                        <button 
                          onClick={() => {
                            setDeleteConfirm({
                              isOpen: true,
                              projectId: project.id,
                              projectName: project.name
                            });
                          }}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {workspaceProjects.length === 0 && (
                    <div className="rounded-[40px] border border-dashed border-white/10 bg-white/[0.02] py-24 text-center">
                      <LayoutGrid className="mx-auto h-16 w-16 text-white/10" />
                      <h3 className="mt-6 text-xl font-black text-white uppercase tracking-widest">Workspace Void</h3>
                      <p className="mt-2 text-sm text-[hsl(var(--muted))]">No project nodes have been initialized in this sector.</p>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {activeAdminTab === 'billing' && (
              <motion.section
                key="billing"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Subscription & Pulse</h2>
                    <p className="text-sm text-[hsl(var(--muted))] mt-1">Monitor resource allocation and system limits.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400 border border-blue-500/20">
                    <Zap className="h-3.5 w-3.5 animate-pulse" />
                    Live System Status
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-10 shadow-2xl">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
                    
                    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8 cursor-pointer group" onClick={() => setActiveAdminTab('billing')}>
                      <div className="transition-transform group-hover:translate-x-1">
                        <span className="inline-block rounded-full bg-blue-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">Current Core</span>
                        <h3 className="mt-4 text-5xl font-black text-white tracking-tighter">FREE PLAN</h3>
                        <p className="mt-2 text-[hsl(var(--muted))]">Fundamental infrastructure for autonomous teams.</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAdminTab('billing');
                          // Scroll to pricing plans after tab change
                          setTimeout(() => {
                            const element = document.getElementById('pricing-plans');
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 300);
                        }}
                        className="rounded-2xl bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-[hsl(var(--accent))] hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
                      >
                        Upgrade Core
                      </button>
                    </div>

                    <div className="mt-12 grid gap-8 sm:grid-cols-3">
                      {(() => {
                        const subscriptionTier = currentUser?.subscriptionTier || 'free';
                        const limits = TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free;
                        const ownedWorkspacesCount = workspaces.filter(w => w.ownerId === currentUser?.id).length;
                        
                        return [
                          { label: 'Workspaces', current: ownedWorkspacesCount, max: limits.workspaces, icon: Globe },
                          { label: 'Project Nodes', current: workspaceProjects.length, max: limits.projectsPerWorkspace, icon: LayoutGrid },
                          { label: 'Unit Operators', current: members.length, max: limits.teamMembers, icon: Users2 },
                        ];
                      })().map(stat => {
                        const progress = Math.min((stat.current / stat.max) * 100, 100);
                        return (
                          <div key={stat.label} className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))]">
                                <stat.icon className="h-3 w-3" />
                                {stat.label}
                              </div>
                              <span className="text-xs font-black text-white">{stat.current}/{stat.max}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000 shadow-[0_0_8px]",
                                  progress > 90 ? "bg-red-500 shadow-red-500/50" : "bg-blue-500 shadow-blue-500/50"
                                )} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {[
                      { label: 'Storage Cluster', value: '0.4 GB', limit: '1 GB', icon: Database, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                      { label: 'API Stream', value: '1.2k', limit: '10k', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                      { label: 'Network Pulse', value: 'Optimal', limit: '99.9%', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    ].map(metric => (
                      <div key={metric.label} className="flex items-center gap-5 rounded-[32px] border border-white/10 bg-white/5 p-6 transition hover:bg-white/[0.08]">
                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", metric.bg, metric.color)}>
                          <metric.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">{metric.label}</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-lg font-bold text-white">{metric.value}</span>
                            <span className="text-[10px] font-bold text-[hsl(var(--muted))]">/ {metric.limit}</span>
                          </div>
                        </div>
                      </div>
                    ))}  
                  </div>
                </div>

                {/* Upgrade Options */}
                <div id="pricing-plans" className="mt-12 space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase mb-6">Upgrade Your Core</h3>
                    <p className="text-sm text-[hsl(var(--muted))] mb-8">Scale your team with enhanced limits and premium features.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pro Plan */}
                    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-8 hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/[0.08] transition">
                      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
                      <div className="relative">
                        <span className="inline-block rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-300 mb-4">Recommended</span>
                        <h4 className="text-2xl font-black text-white tracking-tighter">PRO PLAN</h4>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))]">For growing teams</p>
                        <p className="mt-4 text-2xl font-black text-white">$99<span className="text-sm text-[hsl(var(--muted))]">/month</span></p>
                        
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-white font-semibold">Up to 10 workspaces</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <LayoutGrid className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-white font-semibold">Up to 50 projects per workspace</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Users2 className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-white font-semibold">Up to 50 team members</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Database className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-white font-semibold">100 GB storage</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setConfirmPlan('pro')}
                          className="mt-8 w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition"
                        >
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-8 hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/[0.08] transition">
                      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
                      <div className="relative">
                        <span className="inline-block rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-300 mb-4">Premium</span>
                        <h4 className="text-2xl font-black text-white tracking-tighter">ENTERPRISE</h4>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))]">For large organizations</p>
                        <p className="mt-4 text-2xl font-black text-white">$299<span className="text-sm text-[hsl(var(--muted))]">/month</span></p>
                        
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-purple-400" />
                            <span className="text-sm text-white font-semibold">Unlimited workspaces</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <LayoutGrid className="h-4 w-4 text-purple-400" />
                            <span className="text-sm text-white font-semibold">Unlimited projects</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Users2 className="h-4 w-4 text-purple-400" />
                            <span className="text-sm text-white font-semibold">Unlimited team members</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Database className="h-4 w-4 text-purple-400" />
                            <span className="text-sm text-white font-semibold">1 TB storage</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setConfirmPlan('enterprise')}
                          className="mt-8 w-full rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition"
                        >
                          Buy Enterprise
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {activeAdminTab === 'history' && (
              <motion.section
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <HistoryView />
              </motion.section>
            )}

            {activeAdminTab === 'danger' && (
              <motion.section
                key="danger"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-red-500">Danger Zone</h2>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-white mb-2">Reset All Data</h3>
                    <p className="text-sm text-gray-400 mb-4">This action cannot be undone. All workspace data will be permanently deleted.</p>
                    <button 
                      onClick={() => setResetConfirmOpen(true)}
                      className="px-6 py-3 bg-red-600/10 border border-red-500/20 hover:bg-red-600 text-red-500 hover:text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all"
                    >
                      Reset All Data
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      <InviteDialog 
        isOpen={inviteOpen} 
        onClose={() => setInviteOpen(false)} 
        projectId={projects[0]?.id || ''} 
      />

      <DeleteConfirmationDialog 
        isOpen={!!deleteConfirm?.isOpen}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteProject(deleteConfirm.projectId);
            setDeleteConfirm(null);
          }
        }}
        title="Terminate Project Node?"
        description={`Are you sure you want to move ${deleteConfirm?.projectName} to the workspace history? You can restore it later from the Trash tab.`}
        confirmLabel="Deactivate Node"
      />

      <DeleteConfirmationDialog 
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={resetAllData}
        title="Wipe Workspace Core?"
        description="CRITICAL WARNING: This will permanently erase all projects, tasks, members, and configuration data from this workspace. This action cannot be reversed."
        confirmLabel="Initialize Full Reset"
        isPermanent={true}
      />

      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[hsl(var(--bg-elevated))] p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase tracking-wider">Confirm Purchase</h3>
            <p className="mt-3 text-sm text-[hsl(var(--muted))]">
              Confirm upgrade to <span className="font-bold text-white">{confirmPlan === 'pro' ? 'Pro' : 'Enterprise'}</span> plan for
              <span className="font-bold text-white"> {confirmPlan === 'pro' ? '$99/month' : '$299/month'}</span>.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmPlan(null)}
                className="flex-1 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={upgradingPlan === confirmPlan}
                className="flex-1 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-60 transition"
              >
                {upgradingPlan === confirmPlan ? 'Processing...' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
