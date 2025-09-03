'use client';

import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  engagement: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  reach: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  followers: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  posts: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

const Select = ({ 
  value, 
  onChange, 
  options, 
  label,
  className = ''
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  className?: string;
}) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-nature-forest-400 focus:border-transparent transition-all duration-300 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon 
}: {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6 hover:bg-white/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-nature-forest-500 to-nature-emerald-500 rounded-2xl flex items-center justify-center text-white">
          {icon}
        </div>
        <div className={`flex items-center space-x-1 text-sm font-medium ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 
          'text-gray-600'
        }`}>
          {trend === 'up' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          )}
          {trend === 'down' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7h10v10" />
            </svg>
          )}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-800 mb-1">
          {formatNumber(value)}
        </div>
        <div className="text-gray-600 text-sm">{title}</div>
      </div>
    </div>
  );
};

const SimpleChart = ({ 
  data, 
  title, 
  height = 300 
}: {
  data: ChartData;
  title: string;
  height?: number;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(...data.datasets[0].data);
  const minValue = Math.min(...data.datasets[0].data);
  const range = maxValue - minValue;

  const getY = (value: number) => {
    if (range === 0) return height / 2;
    return height - ((value - minValue) / range) * height;
  };

  const points = data.datasets[0].data.map((value, index) => ({
    x: (index / (data.labels.length - 1)) * 100,
    y: getY(value)
  }));

  const pathData = points.map((point, index) => 
    index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">{title}</h3>
      <div className="relative" style={{ height }}>
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 100 ${height}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A7B2A" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#4A7B2A" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <path
            d={`${pathData} L 100 ${height} L 0 ${height} Z`}
            fill="url(#gradient)"
          />
          
          <path
            d={pathData}
            stroke="#4A7B2A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 6 : 4}
              fill="#2D8B5F"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
          
          {hoveredIndex !== null && (
            <g>
              <rect
                x={points[hoveredIndex].x - 20}
                y={points[hoveredIndex].y - 35}
                width="40"
                height="25"
                rx="6"
                fill="rgba(0,0,0,0.8)"
              />
              <text
                x={points[hoveredIndex].x}
                y={points[hoveredIndex].y - 18}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="500"
              >
                {data.datasets[0].data[hoveredIndex].toLocaleString()}
              </text>
            </g>
          )}
        </svg>
        
        <div className="flex justify-between mt-4 text-sm text-gray-600">
          {data.labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const PlatformMetrics = ({ 
  platforms 
}: {
  platforms: Array<{
    name: string;
    followers: number;
    engagement: number;
    posts: number;
    color: string;
  }>;
}) => (
  <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6">
    <h3 className="text-xl font-bold text-gray-800 mb-6">Platform Performance</h3>
    <div className="space-y-4">
      {platforms.map((platform, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-white/10 rounded-2xl">
          <div className="flex items-center space-x-4">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: platform.color }}
            >
              {platform.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-800">{platform.name}</div>
              <div className="text-sm text-gray-600">{platform.posts} posts</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">{platform.followers.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{platform.engagement}% engagement</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TopPosts = ({ 
  posts 
}: {
  posts: Array<{
    id: string;
    platform: string;
    content: string;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    date: string;
  }>;
}) => (
  <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6">
    <h3 className="text-xl font-bold text-gray-800 mb-6">Top Performing Posts</h3>
    <div className="space-y-4">
      {posts.map((post, index) => (
        <div key={post.id} className="p-4 bg-white/10 rounded-2xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-nature-forest-500 to-nature-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-gray-800 capitalize">{post.platform}</div>
                <div className="text-xs text-gray-500">
                  {new Date(post.date).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-nature-forest-600">{post.engagement}%</div>
              <div className="text-xs text-gray-500">engagement</div>
            </div>
          </div>
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">{post.content}</p>
          <div className="flex space-x-4 text-xs text-gray-500">
            <span>❤️ {post.likes.toLocaleString()}</span>
            <span>💬 {post.comments}</span>
            <span>🔄 {post.shares}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const GrowthChart = ({ 
  data, 
  title 
}: {
  data: ChartData;
  title: string;
}) => {
  const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
  const chartHeight = 250;
  
  return (
    <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">{title}</h3>
      <div className="relative" style={{ height: chartHeight }}>
        <svg width="100%" height="100%" viewBox={`0 0 100 ${chartHeight}`}>
          <defs>
            {data.datasets.map((dataset, index) => (
              <linearGradient key={index} id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={dataset.borderColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={dataset.borderColor} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          
          {data.datasets.map((dataset, datasetIndex) => {
            const points = dataset.data.map((value, index) => ({
              x: (index / (data.labels.length - 1)) * 100,
              y: chartHeight - (value / maxValue) * chartHeight
            }));
            
            const pathData = points.map((point, index) => 
              index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
            ).join(' ');
            
            return (
              <g key={datasetIndex}>
                <path
                  d={pathData}
                  stroke={dataset.borderColor}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((point, pointIndex) => (
                  <circle
                    key={pointIndex}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={dataset.borderColor}
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}
        </svg>
        
        <div className="flex justify-between mt-4 text-sm text-gray-600">
          {data.labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mt-4">
        {data.datasets.map((dataset, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dataset.borderColor }}
            ></div>
            <span className="text-sm text-gray-600">{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    engagement: { total: 0, change: 0, trend: 'stable' },
    reach: { total: 0, change: 0, trend: 'stable' },
    followers: { total: 0, change: 0, trend: 'stable' },
    posts: { total: 0, change: 0, trend: 'stable' }
  });

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/analytics?brand=${selectedBrand}&period=${selectedPeriod}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        setAnalytics({
          engagement: { total: 24800, change: 12.5, trend: 'up' },
          reach: { total: 156000, change: 8.3, trend: 'up' },
          followers: { total: 12400, change: 5.2, trend: 'up' },
          posts: { total: 47, change: -2.1, trend: 'down' }
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedBrand, selectedPeriod]);

  const engagementData: ChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Engagement',
      data: [2800, 3200, 2900, 3800, 4100, 3600, 3900],
      borderColor: '#4A7B2A',
      backgroundColor: 'rgba(74, 123, 42, 0.1)',
      tension: 0.4
    }]
  };

  const growthData: ChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Followers',
        data: [11800, 12000, 12200, 12400],
        borderColor: '#2D8B5F',
        backgroundColor: 'rgba(45, 139, 95, 0.1)',
        tension: 0.4
      },
      {
        label: 'Reach',
        data: [140000, 145000, 152000, 156000],
        borderColor: '#8FAE83',
        backgroundColor: 'rgba(143, 174, 131, 0.1)',
        tension: 0.4
      }
    ]
  };

  const platformData = [
    { name: 'Instagram', followers: 8200, engagement: 4.2, posts: 18, color: '#E1306C' },
    { name: 'Twitter', followers: 2400, engagement: 2.8, posts: 15, color: '#1DA1F2' },
    { name: 'LinkedIn', followers: 1500, engagement: 6.1, posts: 8, color: '#0077B5' },
    { name: 'Facebook', followers: 300, engagement: 1.9, posts: 6, color: '#1877F2' }
  ];

  const topPosts = [
    {
      id: '1',
      platform: 'instagram',
      content: '🌱 Exciting developments in sustainable technology are reshaping how we work and live! From AI-powered energy optimization to eco-friendly materials...',
      engagement: 6.8,
      likes: 847,
      comments: 23,
      shares: 15,
      date: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      platform: 'linkedin',
      content: 'Remote work success starts with intentional communication and smart tools. Our latest study shows that teams using AI-powered project management...',
      engagement: 5.4,
      likes: 124,
      comments: 18,
      shares: 32,
      date: '2024-01-14T14:30:00Z'
    },
    {
      id: '3',
      platform: 'twitter',
      content: 'The future of work is here, and it is more flexible than ever. Companies embracing hybrid models are seeing 40% better retention rates...',
      engagement: 4.9,
      likes: 89,
      comments: 12,
      shares: 28,
      date: '2024-01-13T09:15:00Z'
    }
  ];

  const brandOptions = [
    { value: 'all', label: 'All Brands' },
    { value: 'omnidash', label: 'OmniDash' },
    { value: 'ecotech', label: 'EcoTech Solutions' },
    { value: 'wellness', label: 'Urban Wellness' }
  ];

  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nature-forest-50 to-nature-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nature-forest-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nature-forest-50 to-nature-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
              <p className="text-gray-600">Track your social media performance and growth</p>
            </div>
            
            <div className="flex space-x-4">
              <Select
                value={selectedBrand}
                onChange={setSelectedBrand}
                options={brandOptions}
                className="min-w-[160px]"
              />
              <Select
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                options={periodOptions}
                className="min-w-[140px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Engagement"
              value={analytics.engagement.total}
              change={analytics.engagement.change}
              trend={analytics.engagement.trend}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Total Reach"
              value={analytics.reach.total}
              change={analytics.reach.change}
              trend={analytics.reach.trend}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Total Followers"
              value={analytics.followers.total}
              change={analytics.followers.change}
              trend={analytics.followers.trend}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            
            <MetricCard
              title="Posts Published"
              value={analytics.posts.total}
              change={analytics.posts.change}
              trend={analytics.posts.trend}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SimpleChart data={engagementData} title="Daily Engagement" />
          <GrowthChart data={growthData} title="Growth Trends" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PlatformMetrics platforms={platformData} />
          </div>
          <div className="lg:col-span-2">
            <TopPosts posts={topPosts} />
          </div>
        </div>
      </div>
    </div>
  );
}