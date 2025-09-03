'use client';

import React, { useState, useEffect } from 'react';

interface Brand {
  id: string;
  name: string;
  description: string;
  industry: string;
  website: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  status: 'active' | 'inactive' | 'draft';
  socialProfiles: {
    platform: string;
    handle: string;
    profileUrl: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = ''
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) => {
  const baseClasses = "font-medium rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-nature-forest-500 to-nature-emerald-500 hover:from-nature-forest-600 hover:to-nature-emerald-600 text-white focus:ring-nature-forest-400",
    secondary: "bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-gray-700 focus:ring-nature-sage-400",
    outline: "border-2 border-nature-forest-500 text-nature-forest-500 hover:bg-nature-forest-500 hover:text-white focus:ring-nature-forest-400",
    danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white focus:ring-red-400"
  };
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

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
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  className?: string;
}) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nature-forest-400 focus:border-transparent transition-all duration-300 ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
    />
    {error && (
      <p className="text-red-500 text-sm">{error}</p>
    )}
  </div>
);

const Select = ({ 
  value, 
  onChange, 
  options, 
  label,
  error,
  placeholder = "Select option..."
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  error?: string;
  placeholder?: string;
}) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-nature-forest-400 focus:border-transparent transition-all duration-300 ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && (
      <p className="text-red-500 text-sm">{error}</p>
    )}
  </div>
);

const BrandCard = ({ 
  brand, 
  onEdit, 
  onDelete, 
  onView 
}: {
  brand: Brand;
  onEdit: (brand: Brand) => void;
  onDelete: (brandId: string) => void;
  onView: (brand: Brand) => void;
}) => (
  <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6 hover:bg-white/30 transition-all duration-300 group">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: brand.primaryColor }}
        >
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            brand.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-lg">{brand.name}</h3>
          <p className="text-gray-600 text-sm">{brand.industry}</p>
        </div>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        brand.status === 'active' 
          ? 'bg-green-100 text-green-800' 
          : brand.status === 'inactive'
          ? 'bg-gray-100 text-gray-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        {brand.status.charAt(0).toUpperCase() + brand.status.slice(1)}
      </div>
    </div>
    
    <p className="text-gray-600 mb-4 line-clamp-2">{brand.description}</p>
    
    <div className="flex items-center justify-between">
      <div className="flex space-x-2">
        {brand.socialProfiles.slice(0, 3).map((profile, index) => (
          <div key={index} className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-xs font-medium">
              {profile.platform.charAt(0).toUpperCase()}
            </span>
          </div>
        ))}
        {brand.socialProfiles.length > 3 && (
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-xs text-gray-500">+{brand.socialProfiles.length - 3}</span>
          </div>
        )}
      </div>
      
      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button
          onClick={() => onView(brand)}
          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          onClick={() => onEdit(brand)}
          className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(brand.id)}
          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
);

const BrandModal = ({ 
  brand, 
  isOpen, 
  onClose, 
  onSave 
}: {
  brand?: Brand;
  isOpen: boolean;
  onClose: () => void;
  onSave: (brandData: Partial<Brand>) => void;
}) => {
  const [formData, setFormData] = useState({
    name: brand?.name || '',
    description: brand?.description || '',
    industry: brand?.industry || '',
    website: brand?.website || '',
    primaryColor: brand?.primaryColor || '#4A7B2A',
    secondaryColor: brand?.secondaryColor || '#2D8B5F',
    status: brand?.status || 'draft'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const industries = [
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'retail', label: 'Retail' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'food', label: 'Food & Beverage' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'real-estate', label: 'Real Estate' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Brand name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.industry) newErrors.industry = 'Industry is required';
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {brand ? 'Edit Brand' : 'Create New Brand'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Brand Name"
                placeholder="Enter brand name"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                error={errors.name}
              />
              
              <Select
                label="Industry"
                value={formData.industry}
                onChange={(value) => setFormData({ ...formData, industry: value })}
                options={industries}
                error={errors.industry}
              />
            </div>

            <Input
              label="Description"
              placeholder="Brief description of the brand"
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              error={errors.description}
            />

            <Input
              label="Website (optional)"
              placeholder="https://example.com"
              value={formData.website}
              onChange={(value) => setFormData({ ...formData, website: value })}
              error={errors.website}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-12 rounded-2xl border border-white/20 cursor-pointer"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(value) => setFormData({ ...formData, primaryColor: value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-12 h-12 rounded-2xl border border-white/20 cursor-pointer"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(value) => setFormData({ ...formData, secondaryColor: value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <Select
                label="Status"
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'draft' })}
                options={statusOptions}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {brand ? 'Update Brand' : 'Create Brand'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState<Brand | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBrands = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/brands', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
      } else {
        setBrands([
          {
            id: '1',
            name: 'OmniDash',
            description: 'Multi-brand social media management platform with AI-powered content generation.',
            industry: 'technology',
            website: 'https://omnidash.com',
            primaryColor: '#4A7B2A',
            secondaryColor: '#2D8B5F',
            status: 'active',
            socialProfiles: [
              { platform: 'twitter', handle: '@omnidash', profileUrl: 'https://twitter.com/omnidash' },
              { platform: 'linkedin', handle: 'omnidash', profileUrl: 'https://linkedin.com/company/omnidash' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            name: 'EcoTech Solutions',
            description: 'Sustainable technology solutions for modern businesses.',
            industry: 'technology',
            website: 'https://ecotech.com',
            primaryColor: '#059669',
            secondaryColor: '#10B981',
            status: 'active',
            socialProfiles: [
              { platform: 'instagram', handle: '@ecotech', profileUrl: 'https://instagram.com/ecotech' },
              { platform: 'facebook', handle: 'EcoTech', profileUrl: 'https://facebook.com/ecotech' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '3',
            name: 'Urban Wellness',
            description: 'Modern wellness brand focused on urban lifestyle and mindfulness.',
            industry: 'healthcare',
            website: 'https://urbanwellness.com',
            primaryColor: '#8FAE83',
            secondaryColor: '#CD853F',
            status: 'draft',
            socialProfiles: [
              { platform: 'tiktok', handle: '@urbanwellness', profileUrl: 'https://tiktok.com/@urbanwellness' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         brand.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || brand.status === filterStatus;
    const matchesIndustry = filterIndustry === 'all' || brand.industry === filterIndustry;
    
    return matchesSearch && matchesStatus && matchesIndustry;
  });

  const handleCreateBrand = () => {
    setSelectedBrand(undefined);
    setIsModalOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsModalOpen(true);
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/brands/${brandId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setBrands(brands.filter(brand => brand.id !== brandId));
      }
    } catch (error) {
      console.error('Failed to delete brand:', error);
    }
  };

  const handleSaveBrand = async (brandData: Partial<Brand>) => {
    try {
      const url = selectedBrand 
        ? `http://localhost:3000/api/brands/${selectedBrand.id}`
        : 'http://localhost:3000/api/brands';
      
      const method = selectedBrand ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(brandData)
      });
      
      if (response.ok) {
        const savedBrand = await response.json();
        if (selectedBrand) {
          setBrands(brands.map(brand => 
            brand.id === selectedBrand.id ? { ...brand, ...savedBrand } : brand
          ));
        } else {
          setBrands([...brands, savedBrand]);
        }
      }
    } catch (error) {
      console.error('Failed to save brand:', error);
    }
    
    setIsModalOpen(false);
    setSelectedBrand(undefined);
  };

  const uniqueIndustries = Array.from(new Set(brands.map(brand => brand.industry)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nature-forest-50 to-nature-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nature-forest-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nature-forest-50 to-nature-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Brand Management</h1>
              <p className="text-gray-600">Manage your brands and their social media presence</p>
            </div>
            <Button variant="primary" onClick={handleCreateBrand}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Brand
            </Button>
          </div>

          <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search brands..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
              </div>
              
              <Select
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'draft', label: 'Draft' }
                ]}
                placeholder="Filter by status"
              />
              
              <Select
                value={filterIndustry}
                onChange={setFilterIndustry}
                options={[
                  { value: 'all', label: 'All Industries' },
                  ...uniqueIndustries.map(industry => ({
                    value: industry,
                    label: industry.charAt(0).toUpperCase() + industry.slice(1)
                  }))
                ]}
                placeholder="Filter by industry"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-600 text-lg mb-4">No brands found</p>
                <Button variant="primary" onClick={handleCreateBrand}>
                  Create Your First Brand
                </Button>
              </div>
            </div>
          ) : (
            filteredBrands.map(brand => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onEdit={handleEditBrand}
                onDelete={handleDeleteBrand}
                onView={(brand) => console.log('View brand:', brand)}
              />
            ))
          )}
        </div>

        <BrandModal
          brand={selectedBrand}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBrand(undefined);
          }}
          onSave={handleSaveBrand}
        />
      </div>
    </div>
  );
}