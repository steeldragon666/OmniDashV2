'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  model?: string;
  loading?: boolean;
}

interface AIModel {
  id: string;
  name: string;
  description?: string;
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
    primary: 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-md hover:shadow-organic-lg focus:ring-pilot-purple-400/50',
    secondary: 'bg-pilot-dark-700/40 backdrop-blur-sm border border-pilot-dark-600 text-pilot-dark-200 shadow-organic-sm hover:bg-pilot-dark-600/50 focus:ring-pilot-dark-400/50',
    outline: 'bg-transparent border-2 border-pilot-purple-500 text-pilot-purple-400 hover:bg-pilot-purple-500/10 focus:ring-pilot-purple-400/50'
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
        ${variants[variant]} 
        ${sizes[size]}
        font-medium font-sans rounded-organic-md
        transition-all duration-300 transform hover:scale-105
        focus:outline-none focus:ring-4
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      )}
      {children}
    </button>
  );
};

const MessageBubble = ({ message }: { message: Message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
        <div className={`
          px-6 py-4 rounded-organic-lg shadow-organic-md backdrop-blur-sm
          ${message.type === 'user' 
            ? 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white ml-12 shadow-organic-lg' 
            : 'bg-pilot-dark-700/30 border border-pilot-dark-600 text-pilot-dark-200 mr-12'
          }
        `}>
          {message.loading ? (
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-pilot-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-pilot-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-pilot-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-pilot-dark-300 font-sans text-sm">AI is thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{message.content}</div>
          )}
        </div>
        
        <div className={`text-xs text-pilot-dark-400 mt-2 flex items-center space-x-2 font-sans ${
          message.type === 'user' ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.timestamp)}</span>
          {message.model && (
            <>
              <span>•</span>
              <span className="px-2 py-1 bg-pilot-dark-700/50 border border-pilot-dark-600 text-pilot-purple-300 rounded-full text-xs font-medium">
                {message.model}
              </span>
            </>
          )}
        </div>
      </div>
      
      <div className={`w-10 h-10 rounded-organic-md flex items-center justify-center text-xs font-medium font-sans shadow-organic-sm ${
        message.type === 'user' 
          ? 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white order-1 ml-3' 
          : 'bg-pilot-dark-700/50 border border-pilot-dark-600 text-pilot-dark-200 order-2 mr-3'
      }`}>
        {message.type === 'user' ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        )}
      </div>
    </div>
  );
};

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'claude'>('openai');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<{openai: AIModel[], claude: AIModel[]}>({
    openai: [],
    claude: []
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchModels = async () => {
    try {
      const [openaiResponse, claudeResponse] = await Promise.all([
        fetch('/api/ai/openai').then(res => res.json()),
        fetch('/api/ai/claude').then(res => res.json())
      ]);

      setModels({
        openai: openaiResponse.success ? openaiResponse.models : [],
        claude: claudeResponse.success ? claudeResponse.models : []
      });

      if (openaiResponse.success && openaiResponse.models.length > 0) {
        setSelectedModel('gpt-3.5-turbo');
      } else if (claudeResponse.success && claudeResponse.models.length > 0) {
        setSelectedProvider('claude');
        setSelectedModel('claude-3-haiku-20240307');
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      loading: true,
      model: selectedProvider === 'openai' ? 'OpenAI' : 'Claude'
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`/api/ai/${selectedProvider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: input.trim(),
          model: selectedModel || (selectedProvider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-haiku-20240307')
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: data.response || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        model: selectedProvider === 'openai' ? 'OpenAI' : 'Claude'
      };

      setMessages(prev => [...prev.slice(0, -1), aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        model: 'Error'
      };

      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const currentModels = models[selectedProvider];
  const hasApiKeys = currentModels.length > 0;

  return (
    <div className="min-h-screen bg-pilot-dark-900 relative overflow-hidden flex flex-col">
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

      <div className="relative z-10 bg-pilot-dark-700/20 backdrop-blur-xl border-b border-pilot-dark-600 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-pilot-dark-100 font-sans mb-2">
                <span className="bg-gradient-to-r from-pilot-purple-400 to-pilot-blue-400 bg-clip-text text-transparent">
                  AI Assistant
                </span>
              </h1>
              <p className="text-pilot-dark-400 text-xl font-sans">Get help with content creation, analytics, and social media strategy</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-pilot-dark-200 font-sans">Provider:</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const provider = e.target.value as 'openai' | 'claude';
                    setSelectedProvider(provider);
                    const availableModels = models[provider];
                    if (availableModels.length > 0) {
                      setSelectedModel(availableModels[0].id);
                    }
                  }}
                  className="px-4 py-2 bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-md text-pilot-dark-200 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-300 font-sans"
                >
                  <option value="openai" className="bg-pilot-dark-800">OpenAI</option>
                  <option value="claude" className="bg-pilot-dark-800">Claude</option>
                </select>
              </div>
              
              {currentModels.length > 0 && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-pilot-dark-200 font-sans">Model:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-4 py-2 bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-md text-pilot-dark-200 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-300 font-sans"
                  >
                    {currentModels.map((model) => (
                      <option key={model.id} value={model.id} className="bg-pilot-dark-800">
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {messages.length > 0 && (
                <Button
                  onClick={clearChat}
                  variant="outline"
                  size="sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Chat
                </Button>
              )}
            </div>
          </div>
          
          {!hasApiKeys && (
            <div className="bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg p-4">
              <div className="flex">
                <svg className="flex-shrink-0 w-5 h-5 text-pilot-accent-yellow" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-pilot-accent-yellow font-sans">
                    AI APIs Not Configured
                  </h3>
                  <div className="mt-2 text-sm text-pilot-dark-300 font-sans">
                    <p>Please configure OPENAI_API_KEY and/or CLAUDE_API_KEY environment variables to use AI features.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-hidden flex flex-col max-w-6xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-r from-pilot-purple-500/20 to-pilot-blue-500/20 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg flex items-center justify-center mx-auto mb-6 shadow-organic-md">
                <svg className="w-10 h-10 text-pilot-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-pilot-dark-100 mb-2 font-sans">Start a Conversation</h3>
              <p className="text-pilot-dark-400 mb-8 font-sans text-lg">Ask me anything about social media strategy, content creation, or analytics!</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <button
                  onClick={() => setInput("Create a social media content calendar for a tech startup launching a new product")}
                  className="p-6 text-left bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl shadow-organic-md hover:shadow-organic-lg transition-all duration-300 transform hover:scale-[1.02] group"
                >
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-pilot-purple-400 mr-3 group-hover:text-pilot-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="font-semibold text-pilot-dark-100 font-sans">Content Planning</div>
                  </div>
                  <div className="text-sm text-pilot-dark-300 font-sans">Get help with content calendars and strategy</div>
                </button>
                
                <button
                  onClick={() => setInput("Analyze the engagement metrics for Instagram posts and suggest improvements")}
                  className="p-6 text-left bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl shadow-organic-md hover:shadow-organic-lg transition-all duration-300 transform hover:scale-[1.02] group"
                >
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-pilot-blue-400 mr-3 group-hover:text-pilot-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div className="font-semibold text-pilot-dark-100 font-sans">Analytics Insights</div>
                  </div>
                  <div className="text-sm text-pilot-dark-300 font-sans">Understand your performance data</div>
                </button>
                
                <button
                  onClick={() => setInput("Write engaging captions for a B2B LinkedIn post about digital transformation")}
                  className="p-6 text-left bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl shadow-organic-md hover:shadow-organic-lg transition-all duration-300 transform hover:scale-[1.02] group"
                >
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-pilot-purple-400 mr-3 group-hover:text-pilot-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <div className="font-semibold text-pilot-dark-100 font-sans">Content Creation</div>
                  </div>
                  <div className="text-sm text-pilot-dark-300 font-sans">Generate posts, captions, and copy</div>
                </button>
                
                <button
                  onClick={() => setInput("What are the best times to post on different social media platforms in 2024?")}
                  className="p-6 text-left bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl shadow-organic-md hover:shadow-organic-lg transition-all duration-300 transform hover:scale-[1.02] group"
                >
                  <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-pilot-blue-400 mr-3 group-hover:text-pilot-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div className="font-semibold text-pilot-dark-100 font-sans">Best Practices</div>
                  </div>
                  <div className="text-sm text-pilot-dark-300 font-sans">Learn platform-specific strategies</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {hasApiKeys && (
          <div className="relative z-10 border-t border-pilot-dark-600 p-6 bg-pilot-dark-700/20 backdrop-blur-xl">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about social media management..."
                  rows={3}
                  className="w-full px-4 py-3 bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-md text-pilot-dark-200 placeholder-pilot-dark-400 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-300 resize-none font-sans"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                loading={loading}
                size="lg"
                className="px-8"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}