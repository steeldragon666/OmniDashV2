'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSkeleton, CardSkeleton, MetricCardSkeleton } from '@/app/components/ui/LoadingSkeleton';

interface Agent {
  id: string;
  name: string;
  type: 'content' | 'social' | 'analytics' | 'business' | 'orchestration' | 'integration';
  status: 'running' | 'stopped' | 'error' | 'starting';
  description: string;
  lastActive: string;
  tasksCompleted: number;
  successRate: number;
  config: Record<string, any>;
}

interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  tasksCompleted: number;
  averageSuccessRate: number;
}

const AgentStatusBadge = ({ status }: { status: Agent['status'] }) => {
  const statusConfig = {
    running: { bg: 'bg-pilot-accent-emerald/20', text: 'text-pilot-accent-emerald', dot: 'bg-pilot-accent-emerald' },
    stopped: { bg: 'bg-pilot-dark-600/50', text: 'text-pilot-dark-400', dot: 'bg-pilot-dark-400' },
    error: { bg: 'bg-pilot-accent-red/20', text: 'text-pilot-accent-red', dot: 'bg-pilot-accent-red' },
    starting: { bg: 'bg-pilot-accent-orange/20', text: 'text-pilot-accent-orange', dot: 'bg-pilot-accent-orange' }
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium font-sans ${config.bg} ${config.text}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${config.dot} ${status === 'running' || status === 'starting' ? 'animate-pulse' : ''}`}></div>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );
};

const AgentTypeIcon = ({ type }: { type: Agent['type'] }) => {
  const icons = {
    content: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    social: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 00-9.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    analytics: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    business: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    orchestration: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    integration: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  };

  return icons[type] || icons.content;
};

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  onClick,
  disabled = false,
  className = '' 
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-md hover:shadow-organic-lg focus:ring-pilot-purple-400/50',
    secondary: 'bg-pilot-dark-700/40 backdrop-blur-sm border border-pilot-dark-600 text-pilot-dark-200 shadow-organic-sm hover:bg-pilot-dark-600/50 focus:ring-pilot-dark-400/50',
    outline: 'bg-transparent border-2 border-pilot-purple-500 text-pilot-purple-400 hover:bg-pilot-purple-500/10 focus:ring-pilot-purple-400/50',
    danger: 'bg-gradient-to-r from-pilot-accent-red to-pilot-accent-red/80 text-white shadow-organic-md hover:shadow-organic-lg focus:ring-pilot-accent-red/50'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]} ${sizes[size]}
        font-medium font-sans rounded-organic-md
        transition-all duration-300 transform hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pilot-dark-900
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const mockAgents: Agent[] = [
      {
        id: '1',
        name: 'Content Creator AI',
        type: 'content',
        status: 'running',
        description: 'Generates engaging social media content using Claude and GPT-4',
        lastActive: new Date().toISOString(),
        tasksCompleted: 142,
        successRate: 98.5,
        config: { model: 'claude-3-sonnet', temperature: 0.7 }
      },
      {
        id: '2',
        name: 'Post Scheduler',
        type: 'social',
        status: 'running',
        description: 'Automatically schedules and publishes content across platforms',
        lastActive: new Date(Date.now() - 300000).toISOString(),
        tasksCompleted: 89,
        successRate: 95.2,
        config: { platforms: ['twitter', 'linkedin', 'instagram'] }
      },
      {
        id: '3',
        name: 'ABN Lookup Bot',
        type: 'business',
        status: 'stopped',
        description: 'Searches Australian Business Registry for company information',
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        tasksCompleted: 245,
        successRate: 99.1,
        config: { rateLimitPerMinute: 1000 }
      },
      {
        id: '4',
        name: 'Analytics Processor',
        type: 'analytics',
        status: 'running',
        description: 'Processes social media metrics and generates insights',
        lastActive: new Date(Date.now() - 120000).toISOString(),
        tasksCompleted: 67,
        successRate: 92.8,
        config: { analysisDepth: 'detailed', reportFrequency: 'daily' }
      },
      {
        id: '5',
        name: 'Workflow Coordinator',
        type: 'orchestration',
        status: 'starting',
        description: 'Manages complex multi-agent workflows and task coordination',
        lastActive: new Date(Date.now() - 60000).toISOString(),
        tasksCompleted: 23,
        successRate: 100,
        config: { maxConcurrentTasks: 10, retryAttempts: 3 }
      }
    ];

    const mockMetrics: AgentMetrics = {
      totalAgents: mockAgents.length,
      activeAgents: mockAgents.filter(a => a.status === 'running').length,
      tasksCompleted: mockAgents.reduce((sum, agent) => sum + agent.tasksCompleted, 0),
      averageSuccessRate: mockAgents.reduce((sum, agent) => sum + agent.successRate, 0) / mockAgents.length
    };

    setTimeout(() => {
      setAgents(mockAgents);
      setMetrics(mockMetrics);
      setLoading(false);
    }, 1500);
  }, []);

  const handleStartAgent = async (agentId: string) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'starting' as const }
        : agent
    ));

    // Simulate API call
    setTimeout(() => {
      setAgents(agents.map(agent => 
        agent.id === agentId 
          ? { ...agent, status: 'running' as const, lastActive: new Date().toISOString() }
          : agent
      ));
    }, 2000);
  };

  const handleStopAgent = async (agentId: string) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'stopped' as const }
        : agent
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pilot-dark-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-pilot-purple-900/20 via-pilot-dark-800 to-pilot-blue-900/20"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-pilot-purple-600/10 via-transparent to-pilot-blue-500/10"></div>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pilot-purple-500/10 to-pilot-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-gradient-to-r from-pilot-blue-500/10 to-pilot-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,#7C3AED_2px,transparent_2px)] bg-[length:60px_60px]"></div>
          </div>
        </div>

        <div className="relative z-10 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <LoadingSkeleton className="h-12 w-96 mb-4" />
              <LoadingSkeleton className="h-6 w-64" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <MetricCardSkeleton key={i} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pilot-dark-900 relative overflow-hidden">
      {/* 3D Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pilot-purple-900/20 via-pilot-dark-800 to-pilot-blue-900/20"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-pilot-purple-600/10 via-transparent to-pilot-blue-500/10"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pilot-purple-500/10 to-pilot-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-gradient-to-r from-pilot-blue-500/10 to-pilot-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,#7C3AED_2px,transparent_2px)] bg-[length:60px_60px]"></div>
        </div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-pilot-dark-100 font-sans mb-4">
                  <span className="bg-gradient-to-r from-pilot-purple-400 to-pilot-blue-400 bg-clip-text text-transparent">
                    AI Agents
                  </span>
                </h1>
                <p className="text-pilot-dark-400 text-xl font-sans">
                  Autonomous AI agents powering your automation workflows
                </p>
              </div>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Agent
              </Button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg">
              <div className="text-3xl font-bold text-pilot-blue-400 mb-2 font-sans">{metrics?.totalAgents}</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Total Agents</div>
            </div>
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg">
              <div className="text-3xl font-bold text-pilot-accent-emerald mb-2 font-sans">{metrics?.activeAgents}</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Active Agents</div>
            </div>
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg">
              <div className="text-3xl font-bold text-pilot-purple-400 mb-2 font-sans">{metrics?.tasksCompleted}</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Tasks Completed</div>
            </div>
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg">
              <div className="text-3xl font-bold text-pilot-accent-orange mb-2 font-sans">{metrics?.averageSuccessRate.toFixed(1)}%</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Success Rate</div>
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-pilot-dark-700/50 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-md hover:shadow-organic-lg hover:bg-pilot-dark-700/70 transition-all duration-300 transform hover:scale-[1.02] group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pilot-purple-500 to-pilot-blue-500 rounded-organic-md flex items-center justify-center text-white shadow-organic-sm">
                      <AgentTypeIcon type={agent.type} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-pilot-dark-100 text-lg font-sans">{agent.name}</h3>
                      <p className="text-pilot-dark-400 text-sm font-sans capitalize">{agent.type} Agent</p>
                    </div>
                  </div>
                  <AgentStatusBadge status={agent.status} />
                </div>

                <p className="text-pilot-dark-300 text-sm mb-4 font-sans line-clamp-2">{agent.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-pilot-dark-400 font-sans">Tasks Completed</span>
                    <span className="text-pilot-dark-200 font-sans font-medium">{agent.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pilot-dark-400 font-sans">Success Rate</span>
                    <span className="text-pilot-accent-emerald font-sans font-medium">{agent.successRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pilot-dark-400 font-sans">Last Active</span>
                    <span className="text-pilot-dark-300 font-sans">{new Date(agent.lastActive).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {agent.status === 'stopped' || agent.status === 'error' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartAgent(agent.id)}
                      className="flex-1"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6.4-6.4a4 4 0 015.657 0M12 12h-.01" />
                      </svg>
                      Start
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStopAgent(agent.id)}
                      className="flex-1"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                      </svg>
                      Stop
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {agents.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-8 shadow-organic-md">
                <svg className="w-16 h-16 text-pilot-dark-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-pilot-dark-300 font-sans text-lg mb-2">No agents configured</h3>
                <p className="text-pilot-dark-500 font-sans mb-4">Create your first AI agent to start automating workflows</p>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  Create Your First Agent
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}