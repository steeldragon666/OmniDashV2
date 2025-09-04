'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface DashboardStats {
  workflows: {
    total: number;
    active: number;
    draft: number;
    paused: number;
  };
  executions: {
    total: number;
    running: number;
    completed: number;
    failed: number;
    successRate: number;
  };
  socialAccounts: {
    total: number;
    byPlatform: Record<string, number>;
    active: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'workflow_created' | 'workflow_executed' | 'social_posted' | 'account_connected';
    title: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }>;
}

export default function DashboardStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${(session as any)?.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardStatsSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-pilot-dark-800/50 rounded-xl border border-pilot-dark-700">
        <div className="text-center">
          <div className="text-pilot-dark-400 mb-2">⚠️</div>
          <h3 className="text-pilot-dark-200 mb-2">Unable to load stats</h3>
          <p className="text-sm text-pilot-dark-400 mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-pilot-purple-500 hover:bg-pilot-purple-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Workflows Stats */}
        <StatCard
          title="Workflows"
          icon="⚙️"
          value={stats.workflows.total}
          subtitle={`${stats.workflows.active} active`}
          change={stats.workflows.total > 0 ? '+12%' : undefined}
          trend="up"
        />

        {/* Executions Stats */}
        <StatCard
          title="Executions"
          icon="🚀"
          value={stats.executions.total}
          subtitle={`${Math.round(stats.executions.successRate)}% success rate`}
          change={stats.executions.successRate > 90 ? 'Excellent' : stats.executions.successRate > 70 ? 'Good' : 'Needs attention'}
          trend={stats.executions.successRate > 90 ? 'up' : stats.executions.successRate < 70 ? 'down' : 'neutral'}
        />

        {/* Running Executions */}
        <StatCard
          title="Running Now"
          icon="⏳"
          value={stats.executions.running}
          subtitle={stats.executions.running > 0 ? 'Active workflows' : 'All quiet'}
          pulse={stats.executions.running > 0}
        />

        {/* Social Accounts */}
        <StatCard
          title="Social Accounts"
          icon="📱"
          value={stats.socialAccounts.total}
          subtitle={`${stats.socialAccounts.active} connected`}
          change={stats.socialAccounts.active === stats.socialAccounts.total ? 'All connected' : 'Some disconnected'}
          trend={stats.socialAccounts.active === stats.socialAccounts.total ? 'up' : 'down'}
        />
      </div>

      {/* Detailed Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Status Breakdown */}
        <div className="bg-pilot-dark-800/50 rounded-xl border border-pilot-dark-700 p-6">
          <h3 className="text-lg font-semibold text-pilot-dark-100 mb-4">Workflow Status</h3>
          <div className="space-y-4">
            <StatusBar
              label="Active"
              value={stats.workflows.active}
              total={stats.workflows.total}
              color="bg-green-500"
              icon="🟢"
            />
            <StatusBar
              label="Draft"
              value={stats.workflows.draft}
              total={stats.workflows.total}
              color="bg-yellow-500"
              icon="📝"
            />
            <StatusBar
              label="Paused"
              value={stats.workflows.paused}
              total={stats.workflows.total}
              color="bg-orange-500"
              icon="⏸️"
            />
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-pilot-dark-800/50 rounded-xl border border-pilot-dark-700 p-6">
          <h3 className="text-lg font-semibold text-pilot-dark-100 mb-4">Connected Platforms</h3>
          <div className="space-y-4">
            {Object.entries(stats.socialAccounts.byPlatform).map(([platform, count]) => (
              <div key={platform} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getPlatformIcon(platform)}</span>
                  <span className="text-pilot-dark-200 capitalize">{platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pilot-dark-100 font-medium">{count}</span>
                  <div className={`w-2 h-2 rounded-full ${count > 0 ? 'bg-green-500' : 'bg-pilot-dark-600'}`} />
                </div>
              </div>
            ))}
            {Object.keys(stats.socialAccounts.byPlatform).length === 0 && (
              <div className="text-center py-4">
                <p className="text-pilot-dark-400">No social accounts connected</p>
                <button className="mt-2 text-sm text-pilot-purple-400 hover:text-pilot-purple-300">
                  Connect your first account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-pilot-dark-800/50 rounded-xl border border-pilot-dark-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-pilot-dark-100">Recent Activity</h3>
          <button className="text-sm text-pilot-purple-400 hover:text-pilot-purple-300">
            View all
          </button>
        </div>
        
        {stats.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🌟</div>
            <p className="text-pilot-dark-300 mb-2">No recent activity</p>
            <p className="text-sm text-pilot-dark-400">Create your first workflow to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  icon,
  value,
  subtitle,
  change,
  trend,
  pulse = false
}: {
  title: string;
  icon: string;
  value: number;
  subtitle: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  pulse?: boolean;
}) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-yellow-500'
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '→'
  };

  return (
    <div className={`bg-pilot-dark-800/50 rounded-xl border border-pilot-dark-700 p-6 ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xl">{icon}</div>
        {trend && change && (
          <div className={`text-sm ${trendColors[trend]} flex items-center gap-1`}>
            <span>{trendIcons[trend]}</span>
            <span>{change}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-pilot-dark-300">{title}</h3>
        <div className="text-2xl font-bold text-pilot-dark-100">
          {value.toLocaleString()}
        </div>
        <p className="text-sm text-pilot-dark-400">{subtitle}</p>
      </div>
    </div>
  );
}

// Status Bar Component
function StatusBar({
  label,
  value,
  total,
  color,
  icon
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-pilot-dark-200">{label}</span>
          <span className="text-sm text-pilot-dark-300">{value}</span>
        </div>
        <div className="w-full bg-pilot-dark-700 rounded-full h-2">
          <div
            className={`${color} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ 
  activity 
}: { 
  activity: DashboardStats['recentActivity'][0] 
}) {
  const statusColors = {
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    error: 'text-red-500 bg-red-500/10',
    info: 'text-blue-500 bg-blue-500/10'
  };

  const statusIcons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };

  const activityIcons = {
    workflow_created: '⚙️',
    workflow_executed: '🚀',
    social_posted: '📱',
    account_connected: '🔗'
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-pilot-dark-700/30 transition-colors">
      <div className="text-lg">{activityIcons[activity.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-pilot-dark-100 truncate">{activity.title}</h4>
          <div className={`px-2 py-1 rounded-full text-xs ${statusColors[activity.status]}`}>
            {statusIcons[activity.status]}
          </div>
        </div>
        <p className="text-xs text-pilot-dark-400 mt-1">{activity.description}</p>
        <p className="text-xs text-pilot-dark-500 mt-1">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// Platform Icons Helper
function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: '🐦',
    facebook: '👤',
    instagram: '📷',
    linkedin: '💼',
    tiktok: '🎵',
    youtube: '📺',
    google: '🔍'
  };
  return icons[platform] || '📱';
}

// Loading Skeleton
function DashboardStatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-pilot-dark-800/50 rounded-xl border border-pilot-dark-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-pilot-dark-600 rounded"></div>
              <div className="w-12 h-4 bg-pilot-dark-600 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="w-16 h-4 bg-pilot-dark-600 rounded"></div>
              <div className="w-12 h-8 bg-pilot-dark-600 rounded"></div>
              <div className="w-24 h-3 bg-pilot-dark-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-pilot-dark-800/50 rounded-xl border border-pilot-dark-700 p-6">
            <div className="w-32 h-6 bg-pilot-dark-600 rounded mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-pilot-dark-600 rounded"></div>
                  <div className="flex-1">
                    <div className="w-full h-2 bg-pilot-dark-600 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}