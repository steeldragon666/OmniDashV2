'use client';

import { useState, useEffect } from 'react';

export default function TestDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('Loading...');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try the test endpoint
      const testResponse = await fetch('/api/test-stats');
      const testData = await testResponse.json();
      
      if (testResponse.ok) {
        setStats(testData.stats);
        setDataSource(testData.stats.source || 'Test API');
        setLoading(false);
        return;
      }

      // Fallback to main API with test bypass
      const mainResponse = await fetch('/api/dashboard/stats?test=true');
      const mainData = await mainResponse.json();
      
      if (mainResponse.ok) {
        setStats(mainData.stats);
        setDataSource('Main API (Test Mode)');
      } else {
        setError('Failed to fetch dashboard data');
        setDataSource('Error');
      }
    } catch (err) {
      setError('Network error while fetching data');
      setDataSource('Error');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchStats} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">🧪 Test Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                dataSource.includes('Database') ? 
                'bg-green-100 text-green-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {dataSource}
              </span>
              <button 
                onClick={fetchStats} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            Testing OmniDash application functionality and data connections
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Total Workflows</div>
            <div className="text-3xl font-bold text-gray-900">{stats?.workflows?.total || 0}</div>
            <div className="text-sm text-green-600 mt-1">
              {stats?.workflows?.active || 0} active
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Total Executions</div>
            <div className="text-3xl font-bold text-gray-900">{stats?.executions?.total || 0}</div>
            <div className="text-sm text-green-600 mt-1">
              {stats?.executions?.success_rate || 0}% success rate
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Social Posts</div>
            <div className="text-3xl font-bold text-gray-900">{stats?.social?.total_posts || 0}</div>
            <div className="text-sm text-blue-600 mt-1">
              {stats?.social?.scheduled_posts || 0} scheduled
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 mb-1">System Uptime</div>
            <div className="text-3xl font-bold text-gray-900">
              {Math.floor((stats?.system?.uptime || 0) / 86400)}d
            </div>
            <div className="text-sm text-green-600 mt-1">
              CPU: {stats?.system?.cpu_usage || 0}%
            </div>
          </div>
        </div>

        {/* Workflow Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm text-green-600">Active</div>
                <div className="text-2xl font-bold text-green-900">{stats?.workflows?.active || 0}</div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div>
                <div className="text-sm text-yellow-600">Draft</div>
                <div className="text-2xl font-bold text-yellow-900">{stats?.workflows?.draft || 0}</div>
              </div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Paused</div>
                <div className="text-2xl font-bold text-gray-900">{stats?.workflows?.paused || 0}</div>
              </div>
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Execution Results */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Execution Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">Completed</div>
              <div className="text-2xl font-bold text-green-900">{stats?.executions?.completed || 0}</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600">Failed</div>
              <div className="text-2xl font-bold text-red-900">{stats?.executions?.failed || 0}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">Running</div>
              <div className="text-2xl font-bold text-blue-900">{stats?.executions?.running || 0}</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {stats?.recent_activity?.map((activity: any, index: number) => (
              <div key={activity.id || index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'workflow_completed' ? 'bg-green-500' :
                  activity.type === 'social_post' ? 'bg-blue-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <p className="font-medium">{activity.message}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full capitalize">
                  {activity.type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600">Queue Jobs</div>
              <div className="text-2xl font-bold text-blue-900">{stats?.system?.queue_jobs || 0}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600">Memory Usage</div>
              <div className="text-2xl font-bold text-purple-900">{stats?.system?.memory_usage || 0}%</div>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="text-sm text-indigo-600">CPU Usage</div>
              <div className="text-2xl font-bold text-indigo-900">{stats?.system?.cpu_usage || 0}%</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600">Connected Accounts</div>
              <div className="text-2xl font-bold text-green-900">{stats?.social?.connected_accounts || 0}</div>
            </div>
          </div>
        </div>

        {/* API Testing Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔧 API Testing & Debug</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Connection Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Data Source:</span>
                  <span className="font-mono">{dataSource}</span>
                </div>
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span className="font-mono">development</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-mono">{new Date().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>API Status:</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Connected</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Test Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => window.open('/api/test-stats', '_blank')}
                  className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-sm"
                >
                  → Test Direct API Call
                </button>
                <button 
                  onClick={() => window.open('/api/dashboard/stats?test=true', '_blank')}
                  className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 rounded-md text-sm"
                >
                  → Test Main API (Bypass Auth)
                </button>
                <button 
                  onClick={() => console.log('Current stats:', stats)}
                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm"
                >
                  → Log Stats to Console
                </button>
              </div>
            </div>
          </div>
          
          {stats && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                📊 Raw API Response Data
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto max-h-96">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}