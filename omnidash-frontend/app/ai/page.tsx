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

const MessageBubble = ({ message }: { message: Message }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
        <div className={`
          px-4 py-3 rounded-2xl shadow-sm
          ${message.type === 'user' 
            ? 'bg-blue-600 text-white ml-12' 
            : 'bg-white border border-gray-200 mr-12'
          }
        `}>
          {message.loading ? (
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-gray-500 text-sm">AI is thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
          )}
        </div>
        
        <div className={`text-xs text-gray-500 mt-1 flex items-center space-x-2 ${
          message.type === 'user' ? 'justify-end' : 'justify-start'
        }`}>
          <span>{formatTime(message.timestamp)}</span>
          {message.model && (
            <>
              <span>•</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium">
                {message.model}
              </span>
            </>
          )}
        </div>
      </div>
      
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        message.type === 'user' 
          ? 'bg-blue-600 text-white order-1 ml-3' 
          : 'bg-gray-200 text-gray-600 order-2 mr-3'
      }`}>
        {message.type === 'user' ? 'You' : 'AI'}
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Assistant</h1>
              <p className="text-gray-600">Get help with content creation, analytics, and social media strategy</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Provider:</label>
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
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                </select>
              </div>
              
              {currentModels.length > 0 && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Model:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {currentModels.map((model) => (
                      <option key={model.id} value={model.id}>
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
                  Clear Chat
                </Button>
              )}
            </div>
          </div>
          
          {!hasApiKeys && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="flex-shrink-0 w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    AI APIs Not Configured
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Please configure OPENAI_API_KEY and/or CLAUDE_API_KEY environment variables to use AI features.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a Conversation</h3>
              <p className="text-gray-500 mb-6">Ask me anything about social media strategy, content creation, or analytics!</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => setInput("Create a social media content calendar for a tech startup launching a new product")}
                  className="p-4 text-left bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-gray-900 mb-1">Content Planning</div>
                  <div className="text-sm text-gray-500">Get help with content calendars and strategy</div>
                </button>
                
                <button
                  onClick={() => setInput("Analyze the engagement metrics for Instagram posts and suggest improvements")}
                  className="p-4 text-left bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-gray-900 mb-1">Analytics Insights</div>
                  <div className="text-sm text-gray-500">Understand your performance data</div>
                </button>
                
                <button
                  onClick={() => setInput("Write engaging captions for a B2B LinkedIn post about digital transformation")}
                  className="p-4 text-left bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-gray-900 mb-1">Content Creation</div>
                  <div className="text-sm text-gray-500">Generate posts, captions, and copy</div>
                </button>
                
                <button
                  onClick={() => setInput("What are the best times to post on different social media platforms in 2024?")}
                  className="p-4 text-left bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-gray-900 mb-1">Best Practices</div>
                  <div className="text-sm text-gray-500">Learn platform-specific strategies</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {hasApiKeys && (
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about social media management..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                loading={loading}
                size="lg"
                className="px-8"
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}