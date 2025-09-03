'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface DriveFile {
  id: string;
  name: string;
  type: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  isFolder: boolean;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  isUnread: boolean;
  isImportant: boolean;
}

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
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white shadow-sm hover:bg-gray-700 focus:ring-gray-500',
    outline: 'bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 focus:ring-blue-500'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]} ${sizes[size]}
        font-medium rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

const DriveFileCard = ({ file }: { file: DriveFile }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (type: string, isFolder: boolean) => {
    if (isFolder) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }

    if (type.includes('image')) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }

    if (type.includes('document') || type.includes('text')) {
      return (
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {file.thumbnailLink ? (
            <img 
              src={file.thumbnailLink} 
              alt={file.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              {getFileIcon(file.type, file.isFolder)}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{file.name}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {file.isFolder ? 'Folder' : formatFileSize(file.size)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Modified: {formatDate(file.modifiedTime)}
          </p>
        </div>
        
        {file.webViewLink && (
          <div className="flex-shrink-0">
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Open
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

const GmailMessageCard = ({ message }: { message: GmailMessage }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 3600);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${message.isUnread ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`text-sm truncate ${message.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
              {message.subject}
            </h3>
            {message.isImportant && (
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate mb-2">{message.from}</p>
          <p className="text-sm text-gray-500 line-clamp-2">{message.snippet}</p>
        </div>
        
        <div className="flex-shrink-0 ml-4">
          <span className="text-xs text-gray-400">
            {formatDate(message.date)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function GooglePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('drive');
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDriveFiles = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/google/drive?pageSize=20');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error);
      }
      
      setDriveFiles(data.files || []);
    } catch (error) {
      console.error('Drive fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch Drive files');
    } finally {
      setLoading(false);
    }
  };

  const fetchGmailMessages = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/google/gmail?maxResults=20');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error);
      }
      
      setGmailMessages(data.messages || []);
    } catch (error) {
      console.error('Gmail fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch Gmail messages');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'drive') {
      fetchDriveFiles();
    } else {
      fetchGmailMessages();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Google Services</h1>
          <p className="text-gray-600">Access your Google Drive and Gmail data</p>
        </div>

        {!session?.user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex">
              <svg className="flex-shrink-0 w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Google Account Not Connected
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Please sign in with Google to access Drive and Gmail features.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('drive')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'drive'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span>Google Drive</span>
              </button>
              <button
                onClick={() => setActiveTab('gmail')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'gmail'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>Gmail</span>
              </button>
            </div>
          </div>
        </div>

        {session?.user && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'drive' ? 'Recent Files' : 'Recent Messages'}
            </h2>
            <Button
              onClick={handleRefresh}
              loading={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex">
              <svg className="flex-shrink-0 w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {session?.user && !loading && (
          <div className="space-y-4">
            {activeTab === 'drive' ? (
              driveFiles.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {driveFiles.map((file) => (
                    <DriveFileCard key={file.id} file={file} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <p className="text-gray-600 text-lg mb-4">No Drive files found</p>
                    <p className="text-gray-500">Your Google Drive files will appear here</p>
                  </div>
                </div>
              )
            ) : (
              gmailMessages.length > 0 ? (
                <div className="space-y-4">
                  {gmailMessages.map((message) => (
                    <GmailMessageCard key={message.id} message={message} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <p className="text-gray-600 text-lg mb-4">No Gmail messages found</p>
                    <p className="text-gray-500">Your recent email messages will appear here</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading {activeTab === 'drive' ? 'Drive files' : 'Gmail messages'}...</p>
          </div>
        )}
      </div>
    </div>
  );
}