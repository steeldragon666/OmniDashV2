'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ReactFlowWorkflowBuilder from '../components/ReactFlowWorkflowBuilder';
import { Workflow } from '@/lib/types/workflow';
import { useSocket } from '../components/SocketProvider';

export default function WorkflowsPage() {
  const { data: session } = useSession();
  const { isConnected } = useSocket();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  // Load workflows
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const response = await fetch('/api/automation/workflows');
        const data = await response.json();
        setWorkflows(data.workflows || []);
      } catch (error) {
        console.error('Failed to load workflows:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      loadWorkflows();
    }
  }, [session]);

  const handleNewWorkflow = () => {
    setSelectedWorkflow(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setSelectedWorkflow(null);
  };

  if (showBuilder) {
    return (
      <div className="h-screen bg-white dark:bg-gray-900">
        {/* Builder Header */}
        <div className="h-16 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCloseBuilder}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-2"
            >
              ← Back to Workflows
            </button>
            <div className="border-l border-gray-300 dark:border-gray-600 pl-4">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedWorkflow ? `Edit: ${selectedWorkflow.name}` : 'New Workflow'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
        
        <div className="h-[calc(100vh-4rem)]">
          <ReactFlowWorkflowBuilder />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Modern Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
              Workflows
            </h1>
            <p className="text-slate-400 text-lg">Design and manage your automation workflows</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleNewWorkflow}
              className="group flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
            >
              <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              New Workflow
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white px-6 py-3 rounded-xl transition-all backdrop-blur-sm border border-slate-600/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`mb-6 p-3 rounded-lg flex items-center gap-3 ${
          isConnected 
            ? 'bg-green-900/50 border border-green-700'
            : 'bg-red-900/50 border border-red-700'
        }`}>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-white text-sm">
            {isConnected ? 'Real-time connection active' : 'Real-time connection inactive'}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-blue-200 mt-4">Loading workflows...</p>
          </div>
        )}

        {/* Modern Workflow Grid */}
        {!loading && workflows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-indigo-400/30 transition-all hover:transform hover:scale-[1.02] shadow-lg hover:shadow-indigo-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white group-hover:text-indigo-300 transition-colors">{workflow.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    workflow.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : workflow.status === 'paused'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                  }`}>
                    <span className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        workflow.status === 'active' ? 'bg-emerald-400' : 
                        workflow.status === 'paused' ? 'bg-amber-400' : 'bg-slate-400'
                      }`}></div>
                      {workflow.status}
                    </span>
                  </span>
                </div>
                
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">{workflow.description}</p>
                
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Nodes:
                    </span>
                    <span className="font-medium text-white">{workflow.definition?.nodes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Triggers:
                    </span>
                    <span className="font-medium text-white">{workflow.triggers?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Updated:
                    </span>
                    <span className="text-white">{new Date(workflow.updatedAt || workflow.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleEditWorkflow(workflow)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 px-4 rounded-xl text-sm font-medium transition-all transform hover:scale-105 shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 px-4 rounded-xl text-sm font-medium transition-all transform hover:scale-105 shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Run
                  </button>
                  <button className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white py-3 px-4 rounded-xl text-sm transition-all backdrop-blur-sm border border-slate-600/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && workflows.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Workflows Yet</h3>
            <p className="text-blue-200 mb-6">Create your first workflow to start automating your tasks</p>
            <button 
              onClick={handleNewWorkflow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              🚀 Create First Workflow
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📥</div>
            <h3 className="text-lg font-semibold text-white mb-2">Import Workflow</h3>
            <p className="text-blue-200 text-sm mb-4">Import from n8n, Zapier, or JSON</p>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Import
            </button>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-white mb-2">Templates</h3>
            <p className="text-blue-200 text-sm mb-4">Browse pre-built workflow templates</p>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Browse
            </button>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📖</div>
            <h3 className="text-lg font-semibold text-white mb-2">Documentation</h3>
            <p className="text-blue-200 text-sm mb-4">Learn how to build workflows</p>
            <button className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Learn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}