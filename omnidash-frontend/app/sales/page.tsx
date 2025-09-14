'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Icons
const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const DollarSignIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  score: number;
  stage: string;
  value: number;
  probability: number;
  lastActivity: string;
  source: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
  account: string;
  owner: string;
}

interface DashboardStats {
  totalLeads: number;
  qualifiedLeads: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  avgDealSize: number;
  winRate: number;
  salesCycleLength: number;
  monthlyTarget: number;
  monthlyProgress: number;
}

export default function SalesIntelligencePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('30d');
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    qualifiedLeads: 0,
    totalPipelineValue: 0,
    weightedPipelineValue: 0,
    avgDealSize: 0,
    winRate: 0,
    salesCycleLength: 0,
    monthlyTarget: 0,
    monthlyProgress: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    const fetchSalesData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        // Fetch sales intelligence data
        const [statsRes, leadsRes, dealsRes] = await Promise.all([
          fetch('/api/sales/stats'),
          fetch('/api/sales/leads'),
          fetch('/api/sales/deals'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats || generateMockStats());
        } else {
          setStats(generateMockStats());
        }

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData.leads || generateMockLeads());
        } else {
          setLeads(generateMockLeads());
        }

        if (dealsRes.ok) {
          const dealsData = await dealsRes.json();
          setDeals(dealsData.deals || generateMockDeals());
        } else {
          setDeals(generateMockDeals());
        }
      } catch (error) {
        console.error('Failed to fetch sales data:', error);
        // Set mock data for demo
        setStats(generateMockStats());
        setLeads(generateMockLeads());
        setDeals(generateMockDeals());
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [session, timeRange]);

  const generateMockStats = (): DashboardStats => ({
    totalLeads: 1247,
    qualifiedLeads: 356,
    totalPipelineValue: 2450000,
    weightedPipelineValue: 980000,
    avgDealSize: 15750,
    winRate: 24.5,
    salesCycleLength: 42,
    monthlyTarget: 500000,
    monthlyProgress: 67.8,
  });

  const generateMockLeads = (): Lead[] => [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@techcorp.com',
      company: 'TechCorp Solutions',
      score: 92,
      stage: 'Qualified',
      value: 45000,
      probability: 85,
      lastActivity: '2 hours ago',
      source: 'Website',
      grade: 'A',
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'mchen@innovate.co',
      company: 'Innovate Co',
      score: 78,
      stage: 'Demo Scheduled',
      value: 28000,
      probability: 65,
      lastActivity: '1 day ago',
      source: 'Referral',
      grade: 'B',
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      email: 'emily.r@startup.io',
      company: 'Startup Inc',
      score: 85,
      stage: 'Proposal Sent',
      value: 35000,
      probability: 75,
      lastActivity: '3 hours ago',
      source: 'LinkedIn',
      grade: 'A',
    },
  ];

  const generateMockDeals = (): Deal[] => [
    {
      id: '1',
      name: 'Enterprise Software License',
      value: 125000,
      stage: 'Negotiation',
      probability: 80,
      closeDate: '2024-02-15',
      account: 'Global Corp',
      owner: 'John Smith',
    },
    {
      id: '2',
      name: 'Cloud Migration Project',
      value: 85000,
      stage: 'Proposal',
      probability: 60,
      closeDate: '2024-02-28',
      account: 'Mid Corp',
      owner: 'Jane Doe',
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-400/10';
    if (score >= 60) return 'text-blue-400 bg-blue-400/10';
    if (score >= 40) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pilot-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pilot-purple-500/20 border-t-pilot-purple-400 mx-auto mb-6"></div>
          <p className="text-pilot-dark-300 font-sans text-lg">Loading sales intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pilot-dark-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pilot-purple-900/20 via-pilot-dark-800 to-pilot-blue-900/20"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-pilot-purple-600/10 via-transparent to-pilot-blue-500/10"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pilot-purple-500/10 to-pilot-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-gradient-to-r from-pilot-blue-500/10 to-pilot-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-pilot-dark-100 mb-4 font-sans">Sales Intelligence</h1>
            <p className="text-pilot-dark-400 text-lg font-sans">AI-powered insights to accelerate your sales performance</p>
          </div>

          {/* Time Range Selector */}
          <div className="mb-6">
            <div className="flex space-x-2">
              {['7d', '30d', '90d', '1y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    timeRange === range
                      ? 'bg-pilot-purple-500 text-white'
                      : 'bg-pilot-dark-700/50 text-pilot-dark-300 hover:bg-pilot-dark-600/50'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg hover:shadow-organic-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-organic-md">
                  <TrendingUpIcon />
                </div>
                <span className="text-green-400 text-sm font-medium">+12.5%</span>
              </div>
              <h3 className="text-2xl font-bold text-pilot-dark-100 mb-1">{stats.totalLeads.toLocaleString()}</h3>
              <p className="text-pilot-dark-400 text-sm">Total Leads</p>
            </div>

            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg hover:shadow-organic-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-organic-md">
                  <UsersIcon />
                </div>
                <span className="text-blue-400 text-sm font-medium">+8.3%</span>
              </div>
              <h3 className="text-2xl font-bold text-pilot-dark-100 mb-1">{stats.qualifiedLeads.toLocaleString()}</h3>
              <p className="text-pilot-dark-400 text-sm">Qualified Leads</p>
            </div>

            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg hover:shadow-organic-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-organic-md">
                  <DollarSignIcon />
                </div>
                <span className="text-purple-400 text-sm font-medium">+15.7%</span>
              </div>
              <h3 className="text-2xl font-bold text-pilot-dark-100 mb-1">{formatCurrency(stats.totalPipelineValue)}</h3>
              <p className="text-pilot-dark-400 text-sm">Pipeline Value</p>
            </div>

            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg hover:shadow-organic-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-organic-md">
                  <TargetIcon />
                </div>
                <span className="text-orange-400 text-sm font-medium">{stats.winRate}%</span>
              </div>
              <h3 className="text-2xl font-bold text-pilot-dark-100 mb-1">{formatCurrency(stats.avgDealSize)}</h3>
              <p className="text-pilot-dark-400 text-sm">Avg Deal Size</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl p-2 shadow-organic-lg">
              <div className="flex space-x-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: TrendingUpIcon },
                  { id: 'leads', label: 'Lead Scoring', icon: UsersIcon },
                  { id: 'pipeline', label: 'Pipeline Forecast', icon: DollarSignIcon },
                  { id: 'sequences', label: 'Follow-up Sequences', icon: TargetIcon },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-3 px-6 rounded-organic-lg font-medium font-sans transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-lg transform scale-[1.02]'
                        : 'text-pilot-dark-300 hover:bg-pilot-dark-600/30'
                    }`}
                  >
                    <tab.icon />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pipeline Performance Chart */}
              <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                <h3 className="text-xl font-bold text-pilot-dark-100 mb-4">Pipeline Performance</h3>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-pilot-dark-400">Pipeline visualization would go here</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                <h3 className="text-xl font-bold text-pilot-dark-100 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-pilot-dark-600/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-pilot-dark-200 text-sm">New lead scored 92/100</p>
                      <p className="text-pilot-dark-400 text-xs">Sarah Johnson • TechCorp Solutions</p>
                    </div>
                    <span className="text-pilot-dark-400 text-xs">2h ago</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-pilot-dark-600/20 rounded-lg">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-pilot-dark-200 text-sm">Deal moved to Negotiation</p>
                      <p className="text-pilot-dark-400 text-xs">Enterprise Software License • $125k</p>
                    </div>
                    <span className="text-pilot-dark-400 text-xs">4h ago</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-pilot-dark-600/20 rounded-lg">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-pilot-dark-200 text-sm">Follow-up sequence completed</p>
                      <p className="text-pilot-dark-400 text-xs">Michael Chen • 85% engagement rate</p>
                    </div>
                    <span className="text-pilot-dark-400 text-xs">6h ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-pilot-dark-100">High-Priority Leads</h3>
                <button className="bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300">
                  Score All Leads
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-pilot-dark-600">
                      <th className="text-left py-3 px-4 text-pilot-dark-300 font-medium">Lead</th>
                      <th className="text-left py-3 px-4 text-pilot-dark-300 font-medium">Company</th>
                      <th className="text-left py-3 px-4 text-pilot-dark-300 font-medium">Score</th>
                      <th className="text-left py-3 px-4 text-pilot-dark-300 font-medium">Stage</th>
                      <th className="text-left py-3 px-4 text-pilot-dark-300 font-medium">Value</th>
                      <th className="text-left py-3 px-4 text-pilot-dark-300 font-medium">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-pilot-dark-700/50 hover:bg-pilot-dark-600/20 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getGradeColor(lead.grade)}`}>
                              {lead.grade}
                            </div>
                            <div>
                              <p className="text-pilot-dark-100 font-medium">{lead.name}</p>
                              <p className="text-pilot-dark-400 text-sm">{lead.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-pilot-dark-200">{lead.company}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(lead.score)}`}>
                            {lead.score}/100
                          </span>
                        </td>
                        <td className="py-4 px-4 text-pilot-dark-200">{lead.stage}</td>
                        <td className="py-4 px-4 text-pilot-dark-200">{formatCurrency(lead.value)}</td>
                        <td className="py-4 px-4 text-pilot-dark-400 text-sm">{lead.lastActivity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                  <h4 className="text-lg font-bold text-pilot-dark-100 mb-2">This Month</h4>
                  <p className="text-3xl font-bold text-green-400 mb-1">{formatCurrency(stats.weightedPipelineValue)}</p>
                  <p className="text-pilot-dark-400 text-sm">Weighted Forecast</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-pilot-dark-400">Progress</span>
                      <span className="text-pilot-dark-300">{stats.monthlyProgress}%</span>
                    </div>
                    <div className="w-full bg-pilot-dark-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stats.monthlyProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                  <h4 className="text-lg font-bold text-pilot-dark-100 mb-2">Next Quarter</h4>
                  <p className="text-3xl font-bold text-blue-400 mb-1">{formatCurrency(stats.totalPipelineValue * 0.75)}</p>
                  <p className="text-pilot-dark-400 text-sm">Projected Revenue</p>
                  <p className="text-green-400 text-sm mt-2">↑ 18% vs last quarter</p>
                </div>
                
                <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                  <h4 className="text-lg font-bold text-pilot-dark-100 mb-2">Win Rate</h4>
                  <p className="text-3xl font-bold text-purple-400 mb-1">{stats.winRate}%</p>
                  <p className="text-pilot-dark-400 text-sm">Current Performance</p>
                  <p className="text-green-400 text-sm mt-2">↑ 3.2% vs last month</p>
                </div>
              </div>

              <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                <h3 className="text-xl font-bold text-pilot-dark-100 mb-4">Pipeline by Stage</h3>
                <div className="space-y-4">
                  {[
                    { stage: 'Prospecting', deals: 45, value: 675000, color: 'bg-gray-500' },
                    { stage: 'Qualification', deals: 28, value: 420000, color: 'bg-blue-500' },
                    { stage: 'Proposal', deals: 18, value: 540000, color: 'bg-purple-500' },
                    { stage: 'Negotiation', deals: 12, value: 480000, color: 'bg-orange-500' },
                    { stage: 'Closed Won', deals: 8, value: 320000, color: 'bg-green-500' },
                  ].map((item) => (
                    <div key={item.stage} className="flex items-center justify-between p-4 bg-pilot-dark-600/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className="text-pilot-dark-200 font-medium">{item.stage}</span>
                      </div>
                      <div className="flex items-center space-x-6">
                        <span className="text-pilot-dark-400 text-sm">{item.deals} deals</span>
                        <span className="text-pilot-dark-100 font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sequences' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-pilot-dark-100">Active Follow-up Sequences</h3>
                <button className="bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300">
                  Create Sequence
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-pilot-dark-100">New Lead Nurture</h4>
                      <p className="text-pilot-dark-400 text-sm">5-step email sequence</p>
                    </div>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">Active</span>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Enrolled</span>
                      <span className="text-pilot-dark-200">127 leads</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Open Rate</span>
                      <span className="text-pilot-dark-200">68.5%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Reply Rate</span>
                      <span className="text-pilot-dark-200">12.3%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Conversion</span>
                      <span className="text-green-400">8.7%</span>
                    </div>
                  </div>
                  <button className="w-full bg-pilot-dark-600/30 hover:bg-pilot-dark-600/50 text-pilot-dark-200 py-2 rounded-lg transition-colors">
                    View Details
                  </button>
                </div>

                <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-pilot-dark-100">Demo Follow-up</h4>
                      <p className="text-pilot-dark-400 text-sm">3-step mixed sequence</p>
                    </div>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">Active</span>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Enrolled</span>
                      <span className="text-pilot-dark-200">43 leads</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Engagement</span>
                      <span className="text-pilot-dark-200">82.1%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Response Rate</span>
                      <span className="text-pilot-dark-200">34.9%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-pilot-dark-400">Conversion</span>
                      <span className="text-green-400">23.3%</span>
                    </div>
                  </div>
                  <button className="w-full bg-pilot-dark-600/30 hover:bg-pilot-dark-600/50 text-pilot-dark-200 py-2 rounded-lg transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}