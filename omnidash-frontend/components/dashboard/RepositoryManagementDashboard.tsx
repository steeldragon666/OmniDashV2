'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  GitBranch, 
  Play, 
  Settings, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Plus,
  Activity,
  Code,
  Cloud,
  AlertTriangle
} from 'lucide-react';

interface Repository {
  name: string;
  description: string;
  size: string;
  url: string;
}

interface DeploymentStatus {
  serviceName: string;
  region: string;
  status: 'deployed' | 'deploying' | 'failed' | 'unknown';
  url?: string;
  lastDeployed?: string;
  revision?: string;
}

interface BuildHistory {
  id: string;
  status: string;
  startTime: string;
  finishTime?: string;
  logsUrl: string;
  substitutions: Record<string, string>;
}

export default function RepositoryManagementDashboard() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [deploymentStatuses, setDeploymentStatuses] = useState<DeploymentStatus[]>([]);
  const [buildHistory, setBuildHistory] = useState<BuildHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  // New repository form state
  const [newRepo, setNewRepo] = useState({
    name: '',
    description: '',
    visibility: 'private',
    defaultBranch: 'main',
    autoBuild: true,
    deploymentTargets: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reposRes, statusRes] = await Promise.all([
        fetch('/api/repository/list'),
        fetch('/api/repository/status')
      ]);

      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setRepositories(reposData.data || []);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDeploymentStatuses(statusData.data || []);
      }
    } catch (error) {
      console.error('Error loading repository data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildHistory = async (repoName: string) => {
    try {
      const response = await fetch(`/api/repository/${repoName}/builds?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setBuildHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error loading build history:', error);
    }
  };

  const createRepository = async () => {
    try {
      const response = await fetch('/api/repository/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRepo)
      });

      if (response.ok) {
        await loadData();
        setNewRepo({
          name: '',
          description: '',
          visibility: 'private',
          defaultBranch: 'main',
          autoBuild: true,
          deploymentTargets: []
        });
      }
    } catch (error) {
      console.error('Error creating repository:', error);
    }
  };

  const triggerDeployment = async (repoName: string, branch: string = 'main') => {
    try {
      const response = await fetch(`/api/repository/${repoName}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch })
      });

      if (response.ok) {
        await loadData();
        await loadBuildHistory(repoName);
      }
    } catch (error) {
      console.error('Error triggering deployment:', error);
    }
  };

  const deleteRepository = async (repoName: string) => {
    if (!confirm(`Are you sure you want to delete repository "${repoName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/repository/${repoName}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting repository:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'deploying':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-100 text-green-800';
      case 'deploying':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repository Management</h1>
          <p className="text-muted-foreground">
            Manage your Google Cloud Source Repositories and CI/CD pipelines
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Repositories</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{repositories.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active repositories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deployed Services</CardTitle>
                <Cloud className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {deploymentStatuses.filter(s => s.status === 'deployed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {deploymentStatuses.length} total services
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {deploymentStatuses.length > 0 
                    ? Math.round((deploymentStatuses.filter(s => s.status === 'deployed').length / deploymentStatuses.length) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Services healthy
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Build Activity</CardTitle>
              <CardDescription>
                Latest build and deployment activity across all repositories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buildHistory.slice(0, 5).map((build) => (
                  <div key={build.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(build.status)}
                      <div>
                        <p className="font-medium">Build #{build.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(build.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(build.status)}>
                        {build.status}
                      </Badge>
                      <Button size="sm" variant="outline" asChild>
                        <a href={build.logsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repositories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.map((repo) => (
              <Card key={repo.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{repo.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerDeployment(repo.name)}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRepo(repo.name);
                          loadBuildHistory(repo.name);
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteRepository(repo.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{repo.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Size:</span>
                      <span>{repo.size}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>URL:</span>
                      <Button size="sm" variant="link" asChild>
                        <a href={repo.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Status</CardTitle>
              <CardDescription>
                Current status of all deployed services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deploymentStatuses.map((status) => (
                  <div key={status.serviceName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status.status)}
                      <div>
                        <p className="font-medium">{status.serviceName}</p>
                        <p className="text-sm text-muted-foreground">
                          {status.region} • {status.revision}
                        </p>
                        {status.lastDeployed && (
                          <p className="text-xs text-muted-foreground">
                            Last deployed: {new Date(status.lastDeployed).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(status.status)}>
                        {status.status}
                      </Badge>
                      {status.url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={status.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Repository</CardTitle>
              <CardDescription>
                Set up a new repository with automated CI/CD pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repository Name</label>
                  <Input
                    placeholder="my-new-repo"
                    value={newRepo.name}
                    onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Branch</label>
                  <Input
                    placeholder="main"
                    value={newRepo.defaultBranch}
                    onChange={(e) => setNewRepo({ ...newRepo, defaultBranch: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Repository description..."
                  value={newRepo.description}
                  onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <Select
                    value={newRepo.visibility}
                    onValueChange={(value) => setNewRepo({ ...newRepo, visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto Build</label>
                  <Select
                    value={newRepo.autoBuild.toString()}
                    onValueChange={(value) => setNewRepo({ ...newRepo, autoBuild: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Enabled</SelectItem>
                      <SelectItem value="false">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={createRepository} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Repository
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
