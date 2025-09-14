'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

// Pilot Pen Design System Input Component
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
        border border-pilot-dark-600 rounded-organic-md
        text-pilot-dark-100 placeholder-pilot-dark-400 font-sans
        focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400
        transition-all duration-300
        ${error ? 'border-pilot-accent-red/50 ring-pilot-accent-red/20 focus:ring-pilot-accent-red focus:border-pilot-accent-red' : ''}
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

// Pilot Pen Design System Button Component
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  onClick,
  className = '' 
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 hover:shadow-organic-lg text-white shadow-organic-sm focus:ring-pilot-purple-400 transform hover:scale-[1.02]',
    secondary: 'bg-pilot-dark-700/50 border border-pilot-dark-600 hover:bg-pilot-dark-600/50 text-pilot-dark-100 shadow-organic-sm focus:ring-pilot-dark-400 transform hover:scale-[1.02]',
    outline: 'border border-pilot-dark-500 text-pilot-dark-300 hover:bg-pilot-dark-600/30 focus:ring-pilot-purple-400 backdrop-blur-sm transform hover:scale-[1.02]'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        ${variants[variant]} ${sizes[size]}
        font-medium font-sans rounded-organic-md transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pilot-dark-900
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      )}
      {children}
    </button>
  );
};

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (session && status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // For now, we'll use OAuth providers only
      // Email/password login can be added later with Supabase Auth
      setErrors({ general: 'Please use Google or GitHub to sign in.' });
    } catch (error) {
      setErrors({ general: 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setLoading(true);
    setErrors({});
    
    try {
      const result = await signIn(provider, { 
        callbackUrl: '/dashboard',
        redirect: false 
      });
      
      if (result?.error) {
        setErrors({ general: `${provider} login failed. Please try again.` });
      } else if (result?.ok) {
        // Redirect will be handled automatically by NextAuth
        router.push('/dashboard');
      }
    } catch (error) {
      setErrors({ general: `Failed to sign in with ${provider}. Please try again.` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pilot-dark-900 relative overflow-hidden flex items-center justify-center p-6">
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

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pilot-purple-500 to-pilot-blue-500 rounded-organic-xl shadow-organic-md mb-6 transform hover:scale-105 transition-all duration-300">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-pilot-dark-100 mb-2 font-sans">
            <span className="bg-gradient-to-r from-pilot-purple-400 to-pilot-blue-400 bg-clip-text text-transparent">
              Sign in to OmniDash
            </span>
          </h1>
          <p className="text-pilot-dark-400 text-lg font-sans">
            Access your multi-brand social media dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl p-8 shadow-organic-lg hover:shadow-organic-lg transition-all duration-300">
          {errors.general && (
            <div className="mb-6 p-4 bg-pilot-accent-red/10 border border-pilot-accent-red/30 rounded-organic-md backdrop-blur-sm">
              <div className="flex">
                <svg className="flex-shrink-0 w-5 h-5 text-pilot-accent-red" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="ml-3 text-sm text-pilot-accent-red font-sans">{errors.general}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <Input
              type="email"
              label="Email address"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-pilot-purple-500 bg-pilot-dark-700/30 border-pilot-dark-600 rounded focus:ring-pilot-purple-400"
                />
                <span className="ml-2 text-sm text-pilot-dark-200 font-sans">Remember me</span>
              </label>
              
              <a 
                href="/auth/forgot-password"
                className="text-sm text-pilot-purple-400 hover:text-pilot-purple-300 font-medium transition-colors font-sans"
              >
                Forgot password?
              </a>
            </div>

            <Button 
              variant="primary" 
              size="lg" 
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 h-px bg-pilot-dark-600" />
            <span className="px-4 text-sm text-pilot-dark-400 font-sans">Or continue with</span>
            <div className="flex-1 h-px bg-pilot-dark-600" />
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              size="md"
              onClick={() => handleSocialLogin('google')}
              loading={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
            
            <Button 
              variant="outline" 
              size="md"
              onClick={() => handleSocialLogin('github')}
              loading={loading}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Button>
          </div>

        </div>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-pilot-dark-400 font-sans">
            Don&apos;t have an account?{' '}
            <button className="font-medium text-pilot-purple-400 hover:text-pilot-purple-300 transition-colors font-sans">
              Create account
            </button>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-pilot-dark-700/30 border border-pilot-dark-600 rounded-organic-sm backdrop-blur-sm">
            <svg className="w-4 h-4 text-pilot-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-medium text-pilot-dark-200 font-sans">Secured with enterprise-grade OAuth</span>
          </div>
        </div>
      </div>
    </div>
  );
}