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
  Twitter, 
  Linkedin, 
  Facebook, 
  Instagram, 
  Pinterest,
  Send,
  BarChart3,
  Users,
  Heart,
  MessageCircle,
  Share,
  Plus,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Calendar,
  Filter,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface SocialAccount {
  platform: string;
  connected: boolean;
  username: string;
  followers: number;
}

interface SocialPost {
  id: string;
  text: string;
  created_at: string;
  platform: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

interface CrossPlatformAnalytics {
  totalPosts: number;
  totalEngagement: number;
  platformBreakdown: Record<string, {
    posts: number;
    engagement: number;
    followers: number;
  }>;
}

export default function SocialMediaDashboard() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [analytics, setAnalytics] = useState<CrossPlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Post creation form
  const [postForm, setPostForm] = useState({
    text: '',
    imageUrl: '',
    platforms: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, analyticsRes] = await Promise.all([
        fetch('/api/social/accounts'),
        fetch('/api/social/analytics')
      ]);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.data || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.data);
      }
    } catch (error) {
      console.error('Error loading social media data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (platform: string) => {
    try {
      const response = await fetch(`/api/social/${platform}/posts?maxResults=10`);
      if (response.ok) {
        const postsData = await response.json();
        const platformPosts = postsData.data?.map((post: any) => ({
          ...post,
          platform,
          engagement: {
            likes: post.public_metrics?.like_count || post.likes?.summary?.total_count || post.like_count || 0,
            comments: post.public_metrics?.reply_count || post.comments?.summary?.total_count || post.comments_count || 0,
            shares: post.public_metrics?.retweet_count || post.shares?.count || 0
          }
        })) || [];
        setPosts(prev => [...prev, ...platformPosts]);
      }
    } catch (error) {
      console.error(`Error loading ${platform} posts:`, error);
    }
  };

  const postToPlatforms = async () => {
    if (!postForm.text.trim() || postForm.platforms.length === 0) return;

    try {
      const response = await fetch('/api/social/post-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: postForm.text,
          imageUrl: postForm.imageUrl || undefined,
          platforms: postForm.platforms
        })
      });

      if (response.ok) {
        setPostForm({ text: '', imageUrl: '', platforms: [] });
        await loadData();
      }
    } catch (error) {
      console.error('Error posting to platforms:', error);
    }
  };

  const connectPlatform = async (platform: string) => {
    // This would typically redirect to OAuth flow
    console.log(`Connecting to ${platform}...`);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return <Twitter className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'facebook':
        return <Facebook className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'pinterest':
        return <Pinterest className="h-4 w-4" />;
      default:
        return <div className="h-4 w-4 rounded bg-gray-400" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return 'bg-blue-100 text-blue-800';
      case 'linkedin':
        return 'bg-blue-100 text-blue-800';
      case 'facebook':
        return 'bg-blue-100 text-blue-800';
      case 'instagram':
        return 'bg-pink-100 text-pink-800';
      case 'pinterest':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold">Social Media Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your social media presence across all platforms
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
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="create">Create Post</TabsTrigger>
          <TabsTrigger value="posts">Recent Posts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {accounts.filter(acc => acc.connected).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {accounts.length} platforms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(accounts.reduce((sum, acc) => sum + acc.followers, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all platforms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics ? formatNumber(analytics.totalPosts) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time posts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics ? formatNumber(analytics.totalEngagement) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Likes, comments, shares
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>
                Engagement metrics across all connected platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics && (
                <div className="space-y-4">
                  {Object.entries(analytics.platformBreakdown).map(([platform, data]) => (
                    <div key={platform} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getPlatformIcon(platform)}
                        <div>
                          <p className="font-medium capitalize">{platform}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.posts} posts • {formatNumber(data.followers)} followers
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(data.engagement)}</p>
                        <p className="text-sm text-muted-foreground">engagement</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Card key={account.platform}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getPlatformIcon(account.platform)}
                      <CardTitle className="text-lg capitalize">{account.platform}</CardTitle>
                    </div>
                    <Badge className={account.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {account.connected ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </>
                      )}
                    </Badge>
                  </div>
                  <CardDescription>
                    @{account.username}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Followers:</span>
                      <span className="font-medium">{formatNumber(account.followers)}</span>
                    </div>
                    <div className="flex space-x-2">
                      {account.connected ? (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => connectPlatform(account.platform)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => loadPosts(account.platform)}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Post</CardTitle>
              <CardDescription>
                Create and schedule posts across multiple platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Post Content</label>
                <Textarea
                  placeholder="What's on your mind?"
                  value={postForm.text}
                  onChange={(e) => setPostForm({ ...postForm, text: e.target.value })}
                  maxLength={280}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {postForm.text.length}/280 characters
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Image URL (Optional)</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={postForm.imageUrl}
                  onChange={(e) => setPostForm({ ...postForm, imageUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Platforms</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {accounts.filter(acc => acc.connected).map((account) => (
                    <Button
                      key={account.platform}
                      variant={postForm.platforms.includes(account.platform) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const platforms = postForm.platforms.includes(account.platform)
                          ? postForm.platforms.filter(p => p !== account.platform)
                          : [...postForm.platforms, account.platform];
                        setPostForm({ ...postForm, platforms });
                      }}
                    >
                      {getPlatformIcon(account.platform)}
                      <span className="ml-2 capitalize">{account.platform}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={postToPlatforms} 
                className="w-full"
                disabled={!postForm.text.trim() || postForm.platforms.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Post to {postForm.platforms.length} Platform{postForm.platforms.length !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>
                Your latest posts across all platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.slice(0, 10).map((post) => (
                  <div key={`${post.platform}-${post.id}`} className="flex items-start space-x-4 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      <Badge className={getPlatformColor(post.platform)}>
                        {getPlatformIcon(post.platform)}
                        <span className="ml-1 capitalize">{post.platform}</span>
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{post.text}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>{formatNumber(post.engagement.likes)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{formatNumber(post.engagement.comments)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Share className="h-3 w-3" />
                          <span>{formatNumber(post.engagement.shares)}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Analytics</CardTitle>
              <CardDescription>
                Performance metrics across all connected platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{formatNumber(analytics.totalPosts)}</div>
                      <div className="text-sm text-muted-foreground">Total Posts</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{formatNumber(analytics.totalEngagement)}</div>
                      <div className="text-sm text-muted-foreground">Total Engagement</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">
                        {analytics.totalPosts > 0 ? Math.round(analytics.totalEngagement / analytics.totalPosts) : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Engagement/Post</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Platform Breakdown</h3>
                    {Object.entries(analytics.platformBreakdown).map(([platform, data]) => (
                      <div key={platform} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getPlatformIcon(platform)}
                            <span className="font-medium capitalize">{platform}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {data.posts} posts • {formatNumber(data.engagement)} engagement
                          </span>
                        </div>
                        <Progress 
                          value={analytics.totalEngagement > 0 ? (data.engagement / analytics.totalEngagement) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No analytics data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
