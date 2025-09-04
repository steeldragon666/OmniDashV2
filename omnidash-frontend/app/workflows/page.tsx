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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Workflows</h1>
            <p className="text-blue-200">Design and manage your automation workflows</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleNewWorkflow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              ⚡ New Workflow
            </button>
            <Link href="/" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors">
              ← Back to Dashboard
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

        {/* Workflow Grid */}
        {!loading && workflows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/15 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">{workflow.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    workflow.status === 'active' 
                      ? 'bg-green-500/20 text-green-300' 
                      : workflow.status === 'paused'
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {workflow.status}
                  </span>
                </div>
                
                <p className="text-blue-200 mb-4 text-sm">{workflow.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-blue-200">
                    <span>Nodes:</span>
                    <span className="font-medium">{workflow.definition?.nodes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-blue-200">
                    <span>Triggers:</span>
                    <span className="font-medium">{workflow.triggers?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-blue-200">
                    <span>Updated:</span>
                    <span>{new Date(workflow.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={() => handleEditWorkflow(workflow)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm transition-colors">
                    ▶️ Run
                  </button>
                  <button className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm transition-colors">
                    📊
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