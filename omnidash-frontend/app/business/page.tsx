'use client';

import React, { useState } from 'react';

interface Business {
  abn: string;
  acn: string;
  entityName: string;
  entityTypeName: string;
  gstRegistered: boolean;
  abrEntryDate?: string;
  addressState?: string;
  addressPostcode?: string;
  businessNames?: string[];
  score?: number;
  isCurrentIndicator?: boolean;
  statesList?: string;
  postcode?: string;
}

interface SearchResult {
  success: boolean;
  searchTerm: string;
  searchType: string;
  count: number;
  businesses: Business[];
  error?: string;
  message?: string;
}

const Input = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  label,
  error,
  className = '' 
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  error?: string;
  className?: string;
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-pilot-dark-200 font-sans">
      {label}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`
        w-full px-4 py-3 
        bg-pilot-dark-700/30 backdrop-blur-sm 
        border border-pilot-dark-600 
        rounded-organic-md
        text-pilot-dark-200 placeholder-pilot-dark-400
        focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400
        transition-all duration-300
        ${error ? 'border-pilot-accent-red ring-pilot-accent-red/20 focus:ring-pilot-accent-red/50' : ''}
        ${className}
      `}
    />
    {error && (
      <p className="flex items-center text-sm text-pilot-accent-red font-sans">
        <svg className="flex-shrink-0 w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>
    )}
  </div>
);

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
        ${className}
      `}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
          Searching...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

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
  label: string;
  className?: string;
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-pilot-dark-200 font-sans">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        w-full px-4 py-3 
        bg-pilot-dark-700/30 backdrop-blur-sm 
        border border-pilot-dark-600 
        rounded-organic-md
        text-pilot-dark-200
        focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400
        transition-all duration-300
        ${className}
      `}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-pilot-dark-800">
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export default function BusinessRegistryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'abn' | 'acn'>('name');
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchCount, setSearchCount] = useState(0);

  const searchTypeOptions = [
    { value: 'name', label: 'Business Name' },
    { value: 'abn', label: 'ABN' },
    { value: 'acn', label: 'ACN' }
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/abr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: searchTerm.trim(), searchType })
      });

      const data: SearchResult = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        setResults(data.businesses || []);
        setSearchCount(data.count || 0);
      } else {
        throw new Error(data.message || data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSearchCount(0);
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

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
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-pilot-dark-100 font-sans mb-4">
              <span className="bg-gradient-to-r from-pilot-purple-400 to-pilot-blue-400 bg-clip-text text-transparent">
                Australian Business Registry
              </span>
            </h1>
            <p className="text-pilot-dark-400 text-xl font-sans">
              Search for businesses using ABN, ACN, or business name with real-time data
            </p>
          </div>

          {/* Search Section */}
          <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl p-8 shadow-organic-lg mb-8">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <Input
                    label="Search Term"
                    placeholder="Enter business name, ABN, or ACN"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setError('');
                    }}
                    error={error}
                  />
                </div>
                
                <div className="md:w-48">
                  <Select
                    label="Search Type"
                    value={searchType}
                    onChange={(value) => setSearchType(value as 'name' | 'abn' | 'acn')}
                    options={searchTypeOptions}
                  />
                </div>
                
                <Button
                  variant="primary"
                  size="md"
                  loading={loading}
                  onClick={handleSearch}
                  className="md:mb-0"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search ABR
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          {searchCount > 0 && (
            <div className="mb-6">
              <p className="text-pilot-dark-300 font-sans">
                Found <span className="text-pilot-purple-400 font-semibold">{searchCount}</span> results for &quot;{searchTerm}&quot;
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((business, index) => (
                <div
                  key={`${business.abn}-${index}`}
                  className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-md hover:shadow-organic-lg transition-all duration-300 transform hover:scale-[1.02]"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xl font-bold text-pilot-dark-100 font-sans mb-2">
                        {business.entityName}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <span className="text-pilot-dark-400 w-20 font-sans">ABN:</span>
                          <span className="text-pilot-purple-400 font-mono font-medium">{business.abn}</span>
                        </div>
                        {business.acn && (
                          <div className="flex items-center">
                            <span className="text-pilot-dark-400 w-20 font-sans">ACN:</span>
                            <span className="text-pilot-blue-400 font-mono font-medium">{business.acn}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="text-pilot-dark-400 w-20 font-sans">Type:</span>
                          <span className="text-pilot-dark-200 font-sans">{business.entityTypeName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <span className="text-pilot-dark-400 w-20 font-sans">GST:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            business.gstRegistered 
                              ? 'bg-pilot-accent-emerald/20 text-pilot-accent-emerald' 
                              : 'bg-pilot-accent-red/20 text-pilot-accent-red'
                          }`}>
                            {business.gstRegistered ? 'Registered' : 'Not Registered'}
                          </span>
                        </div>
                        {business.addressState && (
                          <div className="flex items-center">
                            <span className="text-pilot-dark-400 w-20 font-sans">State:</span>
                            <span className="text-pilot-dark-200 font-sans">{business.addressState}</span>
                          </div>
                        )}
                        {business.addressPostcode && (
                          <div className="flex items-center">
                            <span className="text-pilot-dark-400 w-20 font-sans">Postcode:</span>
                            <span className="text-pilot-dark-200 font-mono">{business.addressPostcode}</span>
                          </div>
                        )}
                        {business.abrEntryDate && (
                          <div className="flex items-center">
                            <span className="text-pilot-dark-400 w-20 font-sans">Registered:</span>
                            <span className="text-pilot-dark-300 font-sans">{new Date(business.abrEntryDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {business.businessNames && business.businessNames.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-pilot-dark-600">
                      <span className="text-pilot-dark-400 font-sans text-sm">Business Names:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {business.businessNames.map((name, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-pilot-purple-500/20 text-pilot-purple-300 rounded-full text-xs font-medium border border-pilot-purple-500/30"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !loading && searchCount === 0 && searchTerm && !error && (
            <div className="text-center py-12">
              <div className="text-pilot-dark-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-pilot-dark-300 font-sans text-lg">No businesses found</h3>
              <p className="text-pilot-dark-500 font-sans">Try adjusting your search terms or search type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}