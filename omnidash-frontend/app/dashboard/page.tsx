'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-blue-200 mb-6">Please sign in to access the dashboard</p>
          <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-blue-200">Welcome back! Here's your automation overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Workflows</h3>
              <div className="text-2xl">⚡</div>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">12</div>
            <div className="text-sm text-blue-200">5 active, 7 draft</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Executions</h3>
              <div className="text-2xl">🚀</div>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">248</div>
            <div className="text-sm text-blue-200">96.2% success rate</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Social Posts</h3>
              <div className="text-2xl">📱</div>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-2">89</div>
            <div className="text-sm text-blue-200">15 scheduled</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Uptime</h3>
              <div className="text-2xl">⏱️</div>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
            <div className="text-sm text-blue-200">Last 30 days</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/workflows" className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
                ⚡ Create Workflow
              </Link>
              <Link href="/social" className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
                📱 Manage Social Media
              </Link>
              <Link href="/analytics" className="block w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
                📊 View Analytics
              </Link>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm">✓</div>
                  <div>
                    <div className="text-white text-sm">Content Generation completed</div>
                    <div className="text-blue-200 text-xs">2 minutes ago</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm">📱</div>
                  <div>
                    <div className="text-white text-sm">Social post scheduled</div>
                    <div className="text-blue-200 text-xs">15 minutes ago</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm">⚡</div>
                  <div>
                    <div className="text-white text-sm">New workflow created</div>
                    <div className="text-blue-200 text-xs">1 hour ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}