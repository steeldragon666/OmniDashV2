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
  Play, 
  Users, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Share, 
  Upload, 
  Search,
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  Tag,
  Settings,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  ExternalLink,
  Download,
  Filter
} from 'lucide-react';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  categoryId: string;
  privacyStatus: string;
  channelId: string;
  channelTitle: string;
}

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
  country: string;
  customUrl: string;
}

interface YouTubeAnalytics {
  totalViews: number;
  totalMinutesWatched: number;
  averageViewDuration: number;
  totalSubscribersGained: number;
  totalSubscribersLost: number;
  totalLikes: number;
  totalDislikes: number;
  totalComments: number;
  totalShares: number;
  dailyData: Array<{
    date: string;
    views: number;
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    subscribersGained: number;
    subscribersLost: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
  }>;
}

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
  publishedAt: string;
  privacyStatus: string;
  channelId: string;
  channelTitle: string;
}

export default function YouTubeDashboard() {
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [analytics, setAnalytics] = useState<YouTubeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    categoryId: '',
    privacyStatus: 'private' as 'private' | 'public' | 'unlisted',
    videoFile: null as File | null
  });

  // Analytics date range
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [channelRes, videosRes, playlistsRes] = await Promise.all([
        fetch('/api/youtube/channel'),
        fetch('/api/youtube/videos?maxResults=20'),
        fetch('/api/youtube/playlists?maxResults=20')
      ]);

      if (channelRes.ok) {
        const channelData = await channelRes.json();
        setChannel(channelData.data);
      }

      if (videosRes.ok) {
        const videosData = await videosRes.json();
        setVideos(videosData.data || []);
      }

      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        setPlaylists(playlistsData.data || []);
      }
    } catch (error) {
      console.error('Error loading YouTube data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/youtube/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (response.ok) {
        const analyticsData = await response.json();
        setAnalytics(analyticsData.data);
      }
    } catch (error) {
      console.error('Error loading YouTube analytics:', error);
    }
  };

  const searchVideos = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}&maxResults=25`);
      if (response.ok) {
        const searchData = await response.json();
        setSearchResults(searchData.data || []);
      }
    } catch (error) {
      console.error('Error searching YouTube videos:', error);
    }
  };

  const uploadVideo = async () => {
    if (!uploadForm.videoFile || !uploadForm.title) return;

    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('tags', JSON.stringify(uploadForm.tags));
      formData.append('categoryId', uploadForm.categoryId);
      formData.append('privacyStatus', uploadForm.privacyStatus);
      formData.append('videoFile', uploadForm.videoFile);

      const response = await fetch('/api/youtube/videos/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await loadData();
        setUploadForm({
          title: '',
          description: '',
          tags: [],
          categoryId: '',
          privacyStatus: 'private',
          videoFile: null
        });
      }
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/youtube/videos/${videoId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDuration = (duration: string): string => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
          <h1 className="text-3xl font-bold">YouTube Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your YouTube channel, videos, and analytics
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {channel && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <img
                src={channel.thumbnail}
                alt={channel.title}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <CardTitle>{channel.title}</CardTitle>
                <CardDescription>{channel.description}</CardDescription>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{formatNumber(channel.subscriberCount)} subscribers</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Play className="h-4 w-4" />
                    <span className="text-sm">{formatNumber(channel.videoCount)} videos</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{formatNumber(channel.viewCount)} views</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {channel ? formatNumber(channel.viewCount) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time views
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {channel ? formatNumber(channel.subscriberCount) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Channel subscribers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Videos</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {channel ? formatNumber(channel.videoCount) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total videos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Playlists</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {playlists.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total playlists
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Videos</CardTitle>
              <CardDescription>
                Your latest uploaded videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videos.slice(0, 5).map((video) => (
                  <div key={video.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-24 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{video.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span className="text-xs">{formatNumber(video.viewCount)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span className="text-xs">{formatNumber(video.likeCount)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-3 w-3" />
                          <span className="text-xs">{formatNumber(video.commentCount)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteVideo(video.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <Card key={video.id}>
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    {video.privacyStatus}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-sm line-clamp-2">{video.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{formatNumber(video.viewCount)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{formatNumber(video.likeCount)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{formatNumber(video.commentCount)}</span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteVideo(video.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Channel performance and video analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
                <Button onClick={loadAnalytics}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Load Analytics
                </Button>
              </div>

              {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Views</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(analytics.totalViews)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Watch Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(analytics.totalMinutesWatched)} min</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Subscribers Gained</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatNumber(analytics.totalSubscribersGained)}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playlists" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <Card key={playlist.id}>
                <img
                  src={playlist.thumbnail}
                  alt={playlist.title}
                  className="w-full h-32 object-cover rounded-t-lg"
                />
                <CardHeader>
                  <CardTitle className="text-sm">{playlist.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {playlist.itemCount} videos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <a href={`https://youtube.com/playlist?list=${playlist.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </a>
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Video</CardTitle>
              <CardDescription>
                Upload a new video to your YouTube channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Video File</label>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadForm({ ...uploadForm, videoFile: e.target.files?.[0] || null })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Video title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Video description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Privacy</label>
                  <Select
                    value={uploadForm.privacyStatus}
                    onValueChange={(value: 'private' | 'public' | 'unlisted') => 
                      setUploadForm({ ...uploadForm, privacyStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    placeholder="Category ID"
                    value={uploadForm.categoryId}
                    onChange={(e) => setUploadForm({ ...uploadForm, categoryId: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={uploadVideo} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Videos</CardTitle>
              <CardDescription>
                Search for videos on YouTube
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search for videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchVideos()}
                />
                <Button onClick={searchVideos}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((video) => (
                    <Card key={video.id}>
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                      <CardHeader>
                        <CardTitle className="text-sm line-clamp-2">{video.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {video.channelTitle}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{formatNumber(video.viewCount)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{formatNumber(video.likeCount)}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="w-full" asChild>
                          <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Watch
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
