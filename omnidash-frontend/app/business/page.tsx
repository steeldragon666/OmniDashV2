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
    <label className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`
        w-full px-4 py-3 
        bg-white border border-gray-300 rounded-lg
        text-gray-900 placeholder-gray-500
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        transition-all duration-200
        ${error ? 'border-red-300 ring-red-100 focus:ring-red-500 focus:border-red-500' : ''}
        ${className}
      `}
    />
    {error && (
      <p className="flex items-center text-sm text-red-600">
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

const BusinessCard = ({ business }: { business: Business }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{business.entityName}</h3>
        <p className="text-sm text-gray-600 mb-3">{business.entityTypeName}</p>
      </div>
      
      <div className="flex flex-col space-y-2">
        {business.gstRegistered && (
          <div className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            GST Registered
          </div>
        )}
        {business.isCurrentIndicator && (
          <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Current
          </div>
        )}
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 text-sm">
      {business.abn && (
        <div>
          <span className="font-medium text-gray-700">ABN:</span>
          <p className="text-gray-900 font-mono">{business.abn}</p>
        </div>
      )}
      {business.acn && (
        <div>
          <span className="font-medium text-gray-700">ACN:</span>
          <p className="text-gray-900 font-mono">{business.acn}</p>
        </div>
      )}
      {(business.addressState || business.statesList) && (
        <div>
          <span className="font-medium text-gray-700">State:</span>
          <p className="text-gray-900">{business.addressState || business.statesList}</p>
        </div>
      )}
      {(business.addressPostcode || business.postcode) && (
        <div>
          <span className="font-medium text-gray-700">Postcode:</span>
          <p className="text-gray-900">{business.addressPostcode || business.postcode}</p>
        </div>
      )}
    </div>
    
    {business.businessNames && business.businessNames.length > 0 && (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <span className="font-medium text-gray-700 text-sm">Business Names:</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {business.businessNames.map((name, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
              {name}
            </span>
          ))}
        </div>
      </div>
    )}
    
    {business.score !== undefined && (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Match Score:</span>
          <div className="flex items-center">
            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(business.score / 100 * 100, 100)}%` }}
              ></div>
            </div>
            <span className="text-gray-900 font-medium">{business.score}%</span>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default function BusinessPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'abn' | 'acn'>('name');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/abr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: searchTerm.trim(),
          searchType
        }),
      });

      const data: SearchResult = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Search failed');
      }

      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Australian Business Registry</h1>
          <p className="text-gray-600">Search for businesses using ABN, ACN, or business name</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm mb-8">
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
                  onKeyPress={handleKeyPress}
                  error={error}
                />
              </div>
              
              <div className="md:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Type
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'name' | 'abn' | 'acn')}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="name">Business Name</option>
                  <option value="abn">ABN</option>
                  <option value="acn">ACN</option>
                </select>
              </div>
              
              <Button
                onClick={handleSearch}
                loading={loading}
                disabled={!searchTerm.trim()}
                size="lg"
                className="md:w-32"
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        {results && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                Search Results
              </h2>
              <div className="text-sm text-gray-600">
                {results.count} business{results.count !== 1 ? 'es' : ''} found for "{results.searchTerm}"
              </div>
            </div>

            {results.businesses.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.businesses.map((business, index) => (
                  <BusinessCard key={business.abn || index} business={business} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg mb-4">No businesses found</p>
                  <p className="text-gray-500">Try searching with different terms or check your spelling</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex">
            <svg className="flex-shrink-0 w-5 h-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                About ABR Search
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Search the Australian Business Register to verify business details, ABNs, and ACNs. 
                  This tool connects directly to the official ABR database maintained by the Australian Government.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}