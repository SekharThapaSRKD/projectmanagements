'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { TIER_LIMITS } from '@/lib/types';
import { Zap, Users, FolderOpen, Database } from 'lucide-react';

export function UsageDashboard() {
  const { workspaces, projects, members } = useAppStore();
  const { user } = useAuthStore();

  const subscriptionTier = user?.subscriptionTier || 'free';
  const limits = TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free;

  // Count user's owned workspaces
  const ownedWorkspaces = workspaces.filter(w => w.ownerId === user?.id);
  const workspaceCount = ownedWorkspaces.length;

  // Calculate project usage per workspace
  const projectsByWorkspace = ownedWorkspaces.map(ws => ({
    workspaceName: ws.name,
    count: projects.filter(p => p.workspaceId === ws.id).length
  }));

  // Total members in current workspace
  const currentWorkspace = workspaces.find(w => w.ownerId === user?.id);
  const memberCount = currentWorkspace?.memberIds?.length || 0;

  // Usage percentages for progress bars
  const workspaceUsage = (workspaceCount / limits.workspaces) * 100;
  const memberUsage = (memberCount / limits.teamMembers) * 100;

  const getStatusColor = (usage: number) => {
    if (usage >= 100) return 'from-red-500 to-red-600';
    if (usage >= 80) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const UsageCard = ({ icon: Icon, label, current, max, usage, isStorage }: any) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[hsl(var(--accent))]/20 p-3">
            <Icon className="h-5 w-5 text-[hsl(var(--accent))]" />
          </div>
          <span className="text-sm font-medium text-[hsl(var(--muted))]">{label}</span>
        </div>
        <span className="text-lg font-bold text-white">
          {isStorage ? current : `${current}/${max}`}
        </span>
      </div>

      {!isStorage && (
        <>
          <div className="h-2 w-full rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getStatusColor(usage)}`}
              style={{ width: `${Math.min(usage, 100)}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-[hsl(var(--muted))]">
            {Math.round(usage)}% of limit used
          </p>
        </>
      )}
      
      {isStorage && (
        <p className="mt-2 text-xs text-[hsl(var(--muted))]">
          {max}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Usage Overview</h3>
        <p className="mb-6 text-sm text-[hsl(var(--muted))]">
          {subscriptionTier === 'free' ? (
            <>You're on the <span className="font-semibold text-white">Free Plan</span>. See your current usage below and upgrade to access unlimited resources.</>
          ) : (
            <>You're on the <span className="font-semibold text-white capitalize">{subscriptionTier} Plan</span>. Monitor your resource usage below.</>
          )}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UsageCard
            icon={Zap}
            label="Workspaces"
            current={workspaceCount}
            max={limits.workspaces}
            usage={workspaceUsage}
          />

          <UsageCard
            icon={Users}
            label="Team Members"
            current={memberCount}
            max={limits.teamMembers}
            usage={memberUsage}
          />

          <UsageCard
            icon={Database}
            label="Storage"
            current={`0 / ${limits.storage}`}
            max={`${limits.storage} GB`}
            usage={0}
            isStorage={true}
          />

          <UsageCard
            icon={FolderOpen}
            label="API Calls"
            current={`0 / ${(limits.monthlyApiCalls / 1000000).toFixed(1)}M`}
            max={`${(limits.monthlyApiCalls / 1000000).toFixed(1)}M`}
            usage={0}
            isStorage={true}
          />
        </div>
      </div>

      {/* Projects per workspace breakdown */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Projects by Workspace</h3>
        <div className="space-y-3">
          {projectsByWorkspace.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-[hsl(var(--muted))]">
              No workspaces yet
            </div>
          ) : (
            projectsByWorkspace.map((ws) => {
              const projectUsage = (ws.count / limits.projectsPerWorkspace) * 100;
              const isLimitReached = subscriptionTier === 'free' && ws.count >= limits.projectsPerWorkspace;

              return (
                <div
                  key={ws.workspaceName}
                  className={`rounded-xl border ${
                    isLimitReached
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-white/10 bg-white/5'
                  } p-4 backdrop-blur-md`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-white">{ws.workspaceName}</span>
                    <span className={`text-sm font-semibold ${isLimitReached ? 'text-red-300' : 'text-green-300'}`}>
                      {ws.count}/{limits.projectsPerWorkspace}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${
                        isLimitReached
                          ? 'from-red-500 to-red-600'
                          : projectUsage >= 80
                            ? 'from-yellow-500 to-yellow-600'
                            : 'from-green-500 to-green-600'
                      }`}
                      style={{ width: `${Math.min(projectUsage, 100)}%` }}
                    />
                  </div>

                  {isLimitReached && (
                    <p className="mt-2 text-xs text-red-300">
                      Project limit reached for this workspace
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Plan comparison */}
      {subscriptionTier === 'free' && (
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6">
          <h3 className="mb-3 text-lg font-semibold text-white">Ready to scale?</h3>
          <p className="mb-4 text-sm text-blue-100/70">
            Upgrade to Premium or Enterprise to unlock unlimited workspaces, projects, team members, and more.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-blue-300">Free</p>
              <ul className="mt-2 space-y-1 text-blue-100/70">
                <li>✓ 1 Workspace</li>
                <li>✓ 2 Projects/workspace</li>
                <li>✓ 5 Team Members</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-blue-300">Premium</p>
              <ul className="mt-2 space-y-1 text-blue-100/70">
                <li>✓ 10 Workspaces</li>
                <li>✓ 50 Projects/workspace</li>
                <li>✓ 50 Team Members</li>
              </ul>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50">
            View Upgrade Plans
          </button>
        </div>
      )}
    </div>
  );
}
