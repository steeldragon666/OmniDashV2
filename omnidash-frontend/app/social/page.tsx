'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
// import Link from 'next/link';
// import { useSocket } from '../components/SocketProvider';

interface SocialAccount {
  id: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube';
  username: string;
  displayName: string;
  isConnected: boolean;
  lastSync: string;
  followers: number;
  posts: number;
  engagement: number;
  profileImage?: string;
}

interface PostSchedule {
  id: string;
  content: string;
  platforms: string[];
  scheduledTime: string;
  status: 'scheduled' | 'published' | 'failed';
  mediaUrl?: string;
  hashtags: string[];
}

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  loading = false,
  className = ''
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) => {
  const baseClasses = "font-medium font-sans rounded-organic-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 hover:shadow-organic-lg text-white shadow-organic-sm focus:ring-pilot-purple-400",
    secondary: "bg-pilot-dark-700/50 border border-pilot-dark-600 hover:bg-pilot-dark-600/50 text-pilot-dark-100 shadow-organic-sm focus:ring-pilot-dark-400",
    outline: "border border-pilot-dark-500 text-pilot-dark-300 hover:bg-pilot-dark-600/30 focus:ring-pilot-purple-400",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm focus:ring-green-500"
  };
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      )}
      {children}
    </button>
  );
};

const Textarea = ({ 
  placeholder, 
  value, 
  onChange, 
  label,
  error,
  rows = 4,
  className = ''
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  rows?: number;
  className?: string;
}) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-medium text-pilot-dark-200 font-sans">
        {label}
      </label>
    )}
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={`w-full bg-pilot-dark-700/50 border border-pilot-dark-600 rounded-organic-md px-4 py-3 text-pilot-dark-100 placeholder-pilot-dark-400 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-200 resize-none font-sans ${error ? 'border-pilot-accent-red focus:ring-pilot-accent-red focus:border-pilot-accent-red' : ''} ${className}`}
    />
    {error && (
      <p className="text-pilot-accent-red text-sm font-sans">{error}</p>
    )}
  </div>
);

const PlatformCard = ({ 
  account, 
  onConnect, 
  onDisconnect, 
  onSync 
}: {
  account: SocialAccount;
  onConnect: (platform: string) => void;
  onDisconnect: (accountId: string) => void;
  onSync: (accountId: string) => void;
}) => {
  const platformConfig = {
    instagram: { 
      gradient: 'from-pink-500 via-red-500 to-yellow-500', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    twitter: { 
      gradient: 'from-sky-400 to-blue-500', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    linkedin: { 
      gradient: 'from-blue-600 to-blue-700', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    },
    facebook: { 
      gradient: 'from-blue-600 to-indigo-700', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    tiktok: { 
      gradient: 'from-gray-900 via-red-500 to-blue-500', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      )
    },
    youtube: { 
      gradient: 'from-red-500 to-red-600', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    }
  };

  const config = platformConfig[account.platform];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="bg-pilot-dark-700/50 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-md hover:shadow-organic-lg hover:bg-pilot-dark-700/70 transition-all duration-300 transform hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className={`w-14 h-14 rounded-organic-md bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-organic-sm`}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-bold text-pilot-dark-100 text-xl capitalize font-sans">{account.platform}</h3>
            {account.isConnected ? (
              <p className="text-pilot-dark-300 text-sm font-sans">@{account.username}</p>
            ) : (
              <p className="text-pilot-dark-400 text-sm font-sans">Not connected</p>
            )}
          </div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium font-sans ${
          account.isConnected ? 'bg-pilot-accent-emerald/20 text-pilot-accent-emerald' : 'bg-pilot-dark-600/50 text-pilot-dark-400'
        }`}>
          {account.isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {account.isConnected ? (
        <>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-xl font-bold text-pilot-dark-100 font-sans">{formatNumber(account.followers)}</div>
              <div className="text-xs text-pilot-dark-400 font-sans mt-1">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-pilot-dark-100 font-sans">{account.posts}</div>
              <div className="text-xs text-pilot-dark-400 font-sans mt-1">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-pilot-dark-100 font-sans">{account.engagement}%</div>
              <div className="text-xs text-pilot-dark-400 font-sans mt-1">Engagement</div>
            </div>
          </div>
          
          <div className="text-xs text-pilot-dark-400 mb-4 font-sans">
            <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Last sync: {new Date(account.lastSync).toLocaleString()}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onSync(account.id)}
              className="flex-1"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => onDisconnect(account.id)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </>
      ) : (
        <Button 
          variant="primary" 
          onClick={() => onConnect(account.platform)}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Connect {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
        </Button>
      )}
    </div>
  );
};

const ScheduledPostCard = ({ 
  post, 
  onEdit, 
  onDelete, 
  onPublish 
}: {
  post: PostSchedule;
  onEdit: (post: PostSchedule) => void;
  onDelete: (postId: string) => void;
  onPublish: (postId: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-pilot-blue-400/20 text-pilot-blue-400';
      case 'published': return 'bg-pilot-accent-emerald/20 text-pilot-accent-emerald';
      case 'failed': return 'bg-pilot-accent-red/20 text-pilot-accent-red';
      default: return 'bg-pilot-dark-600/50 text-pilot-dark-300';
    }
  };

  return (
    <div className="bg-pilot-dark-700/50 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-md hover:shadow-organic-lg transition-all duration-300 transform hover:scale-[1.02] group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </div>
            <span className="text-xs text-pilot-dark-400 font-sans">
              {new Date(post.scheduledTime).toLocaleString()}
            </span>
          </div>
          <p className="text-pilot-dark-200 text-sm line-clamp-3 font-sans">{post.content}</p>
        </div>
        
        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ml-4">
          {post.status === 'scheduled' && (
            <button
              onClick={() => onPublish(post.id)}
              className="p-2 bg-pilot-accent-emerald/20 hover:bg-pilot-accent-emerald/30 text-pilot-accent-emerald rounded-organic-md transition-all duration-300"
              title="Publish now"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onEdit(post)}
            className="p-2 bg-pilot-accent-orange/20 hover:bg-pilot-accent-orange/30 text-pilot-accent-orange rounded-organic-md transition-all duration-300"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="p-2 bg-pilot-accent-red/20 hover:bg-pilot-accent-red/30 text-pilot-accent-red rounded-organic-md transition-all duration-300"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-3">
        {post.platforms.map((platform, index) => (
          <span key={index} className="px-2 py-1 bg-pilot-purple-500/20 text-pilot-purple-300 rounded-full text-xs capitalize border border-pilot-purple-500/30">
            {platform}
          </span>
        ))}
      </div>
      
      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {post.hashtags.slice(0, 5).map((hashtag, index) => (
            <span key={index} className="text-xs text-pilot-blue-400 font-sans">#{hashtag}</span>
          ))}
          {post.hashtags.length > 5 && (
            <span className="text-xs text-pilot-dark-400 font-sans">+{post.hashtags.length - 5} more</span>
          )}
        </div>
      )}
    </div>
  );
};

const PostComposer = ({ 
  onSchedule 
}: {
  onSchedule: (postData: Partial<PostSchedule>) => void;
}) => {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [hashtags, setHashtags] = useState('');

  const platforms = [
    { id: 'instagram', name: 'Instagram', color: '#E1306C' },
    { id: 'twitter', name: 'Twitter', color: '#1DA1F2' },
    { id: 'linkedin', name: 'LinkedIn', color: '#0077B5' },
    { id: 'facebook', name: 'Facebook', color: '#1877F2' },
    { id: 'tiktok', name: 'TikTok', color: '#000000' },
    { id: 'youtube', name: 'YouTube', color: '#FF0000' }
  ];

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSchedule = () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    
    onSchedule({
      content,
      platforms: selectedPlatforms,
      scheduledTime: scheduledTime || new Date(Date.now() + 3600000).toISOString(),
      hashtags: hashtags.split(' ').filter(tag => tag.startsWith('#')).map(tag => tag.slice(1))
    });

    setContent('');
    setSelectedPlatforms([]);
    setScheduledTime('');
    setHashtags('');
  };

  return (
    <div className="bg-pilot-dark-700/50 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-md">
      <h2 className="text-2xl font-bold text-pilot-dark-100 mb-6 font-sans">Schedule Post</h2>
      
      <div className="space-y-6">
        <Textarea
          label="Post Content"
          placeholder="What do you want to share?"
          value={content}
          onChange={setContent}
          rows={4}
        />
        
        <div className="space-y-3">
          <label className="block text-sm font-medium text-pilot-dark-200 font-sans">Select Platforms</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.map(platform => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`p-3 rounded-organic-md border-2 transition-all duration-300 flex items-center space-x-2 transform hover:scale-105 ${
                  selectedPlatforms.includes(platform.id)
                    ? 'border-pilot-purple-400 bg-pilot-purple-500/20 text-pilot-purple-300 shadow-organic-sm'
                    : 'border-pilot-dark-600 hover:border-pilot-dark-500 text-pilot-dark-300 hover:bg-pilot-dark-600/30'
                }`}
              >
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: platform.color }}
                ></div>
                <span className="text-sm font-medium font-sans">{platform.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-pilot-dark-200 font-sans">Schedule Time (optional)</label>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-md px-4 py-3 text-pilot-dark-200 placeholder-pilot-dark-400 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-300"
          />
        </div>
        
        <Textarea
          label="Hashtags (optional)"
          placeholder="#innovation #tech #socialmedia"
          value={hashtags}
          onChange={setHashtags}
          rows={2}
        />
        
        <Button
          variant="primary"
          onClick={handleSchedule}
          disabled={!content.trim() || selectedPlatforms.length === 0}
          className="w-full"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {scheduledTime ? 'Schedule Post' : 'Publish Now'}
        </Button>
      </div>
    </div>
  );
};

export default function SocialPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<PostSchedule[]>([]);
  // const [campaigns, setCampaigns] = useState<any[]>([]); // Currently unused
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accounts');

  const fetchData = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const [accountsRes, postsRes, campaignsRes] = await Promise.all([
        fetch('/api/social/accounts'),
        fetch('/api/social/posts'),
        fetch('/api/social/campaigns')
      ]);
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.accounts || []);
      } else {
        console.error('Failed to fetch accounts:', accountsRes.statusText);
        setAccounts([]);
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        // Transform posts to match the scheduled posts format
        const transformedPosts = postsData.posts?.map((post: any) => ({
          id: post.id,
          content: post.content,
          platforms: [post.platform],
          scheduledTime: post.scheduled_for || post.published_at,
          status: post.status === 'published' ? 'published' : 
                  post.status === 'scheduled' ? 'scheduled' :
                  post.status === 'failed' ? 'failed' : 'scheduled',
          mediaUrl: post.media_urls?.[0],
          hashtags: post.content.match(/#\w+/g)?.map(tag => tag.slice(1)) || []
        })) || [];
        setScheduledPosts(transformedPosts);
      } else {
        console.error('Failed to fetch posts:', postsRes.statusText);
        setScheduledPosts([]);
      }

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
      } else {
        console.error('Failed to fetch campaigns:', campaignsRes.statusText);
        setCampaigns([]);
      }

    } catch (error) {
      console.error('Failed to fetch social data:', error);
      setAccounts([]);
      setScheduledPosts([]);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [session, fetchData]);

  const handleConnect = async (platform: string) => {
    try {
      // Redirect to OAuth provider for authentication
      const authUrl = `/api/auth/signin/${platform}?callbackUrl=${encodeURIComponent(window.location.href)}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error(`Failed to connect to ${platform}:`, error);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    
    try {
      const response = await fetch('/api/social/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });

      if (response.ok) {
        // Refresh data
        await fetchData();
      } else {
        const error = await response.json();
        console.error('Failed to disconnect account:', error);
        alert('Failed to disconnect account. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Failed to disconnect account. Please try again.');
    }
  };

  const handleSync = async (accountId: string) => {
    try {
      const response = await fetch('/api/social/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action: 'sync' })
      });

      if (response.ok) {
        // Update the account's last sync time in local state
        setAccounts(accounts.map(account => 
          account.id === accountId 
            ? { ...account, lastSync: new Date().toISOString() }
            : account
        ));
      } else {
        console.error('Failed to sync account');
      }
    } catch (error) {
      console.error('Error syncing account:', error);
    }
  };

  const handleSchedulePost = async (postData: Partial<PostSchedule>) => {
    try {
      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postData.content,
          platforms: postData.platforms,
          scheduled_for: postData.scheduledTime,
          hashtags: postData.hashtags
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Posts created:', result);
        // Refresh posts data
        await fetchData();
      } else {
        const error = await response.json();
        console.error('Failed to create post:', error);
        alert(error.error || 'Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  const handlePublishNow = async (postId: string) => {
    try {
      const response = await fetch('/api/social/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'publish_now' })
      });

      if (response.ok) {
        // Update local state
        setScheduledPosts(scheduledPosts.map(post => 
          post.id === postId 
            ? { ...post, status: 'published' as const }
            : post
        ));
      } else {
        const error = await response.json();
        console.error('Failed to publish post:', error);
        alert('Failed to publish post. Please try again.');
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      alert('Failed to publish post. Please try again.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const response = await fetch(`/api/social/posts?postId=${postId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setScheduledPosts(scheduledPosts.filter(post => post.id !== postId));
      } else {
        const error = await response.json();
        console.error('Failed to delete post:', error);
        alert('Failed to delete post. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const connectedAccounts = accounts.filter(account => account.isConnected);
  const totalFollowers = connectedAccounts.reduce((sum, account) => sum + account.followers, 0);
  const totalPosts = connectedAccounts.reduce((sum, account) => sum + account.posts, 0);
  const avgEngagement = connectedAccounts.length > 0 
    ? connectedAccounts.reduce((sum, account) => sum + account.engagement, 0) / connectedAccounts.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-pilot-dark-900 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-pilot-purple-900/20 via-pilot-dark-900 to-pilot-blue-900/20"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-pilot-purple-600/10 via-transparent to-pilot-blue-500/10"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pilot-purple-500/10 to-pilot-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-gradient-to-r from-pilot-blue-500/10 to-pilot-purple-500/10 rounded-full blur-3xl"></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pilot-purple-500/20 border-t-pilot-purple-400 mx-auto mb-6"></div>
          <p className="text-pilot-dark-300 font-sans text-lg">Loading social media data...</p>
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
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-pilot-dark-100 mb-4 font-sans">Social Media Management</h1>
          <p className="text-pilot-dark-400 text-lg font-sans">Connect and manage your social media accounts with professional analytics</p>
        </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg hover:shadow-organic-xl transition-all duration-300 transform hover:scale-[1.02]">
              <div className="text-3xl font-bold text-pilot-blue-400 mb-2 font-sans">{connectedAccounts.length}</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Connected Accounts</div>
            </div>
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg hover:shadow-organic-xl transition-all duration-300 transform hover:scale-[1.02]">
              <div className="text-3xl font-bold text-pilot-accent-emerald mb-2 font-sans">{totalFollowers.toLocaleString()}</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Total Followers</div>
            </div>
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg hover:shadow-organic-xl transition-all duration-300 transform hover:scale-[1.02]">
              <div className="text-3xl font-bold text-pilot-purple-400 mb-2 font-sans">{totalPosts}</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Total Posts</div>
            </div>
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg hover:shadow-organic-xl transition-all duration-300 transform hover:scale-[1.02]">
              <div className="text-3xl font-bold text-pilot-accent-orange mb-2 font-sans">{avgEngagement.toFixed(1)}%</div>
              <div className="text-pilot-dark-300 text-sm font-sans">Avg Engagement</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl p-2 shadow-organic-lg">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`flex-1 py-3 px-6 rounded-organic-lg font-medium font-sans transition-all duration-300 ${
                    activeTab === 'accounts'
                      ? 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-lg transform scale-[1.02]'
                      : 'text-pilot-dark-300 hover:bg-pilot-dark-600/30'
                  }`}
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Social Accounts
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 py-3 px-6 rounded-organic-lg font-medium font-sans transition-all duration-300 ${
                    activeTab === 'schedule'
                      ? 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-lg transform scale-[1.02]'
                      : 'text-pilot-dark-300 hover:bg-pilot-dark-600/30'
                  }`}
                >
                  <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Content Scheduler
                </button>
              </div>
            </div>
          </div>

        {activeTab === 'accounts' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => (
              <PlatformCard
                key={account.id}
                account={account}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <PostComposer onSchedule={handleSchedulePost} />
            </div>
            
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-pilot-dark-100 mb-4 font-sans">Scheduled Posts</h2>
              </div>
              
              <div className="space-y-4">
                {scheduledPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-8 shadow-organic-md">
                      <svg className="w-16 h-16 text-pilot-dark-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-pilot-dark-300 text-lg mb-4 font-sans">No scheduled posts</p>
                      <p className="text-pilot-dark-500 font-sans">Create your first scheduled post using the composer on the left</p>
                    </div>
                  </div>
                ) : (
                  scheduledPosts.map(post => (
                    <ScheduledPostCard
                      key={post.id}
                      post={post}
                      onEdit={(post) => console.log('Edit post:', post)}
                      onDelete={handleDeletePost}
                      onPublish={handlePublishNow}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}