'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidToken, setIsValidToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a valid recovery token
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (accessToken && type === 'recovery') {
      setIsValidToken(true);
    } else {
      setMessage({
        type: 'error',
        text: 'Invalid or expired reset link. Please request a new one.'
      });
    }
  }, []);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(pass)) {
      return 'Password must contain at least one special character (!@#$%^&*)';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({
          type: 'success',
          text: 'Password reset successfully! Redirecting to login...'
        });
        
        // Clear the form
        setPassword('');
        setConfirmPassword('');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pilot-dark-900 via-pilot-dark-800 to-pilot-dark-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-pilot-dark-800/50 backdrop-blur-xl rounded-organic-xl p-8 shadow-2xl border border-pilot-dark-700 text-center">
            <h1 className="text-3xl font-bold text-pilot-accent-red mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-pilot-dark-300 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block py-3 px-6 bg-gradient-to-r from-pilot-purple-500 to-pilot-purple-600 text-white rounded-organic-md font-medium hover:from-pilot-purple-600 hover:to-pilot-purple-700 transition-all duration-200"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pilot-dark-900 via-pilot-dark-800 to-pilot-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-pilot-dark-800/50 backdrop-blur-xl rounded-organic-xl p-8 shadow-2xl border border-pilot-dark-700">
          <h1 className="text-3xl font-bold text-pilot-purple-300 mb-2">
            Reset Your Password
          </h1>
          <p className="text-pilot-dark-300 mb-6">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-pilot-dark-200 mb-2 text-sm font-medium">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-pilot-dark-700/50 border border-pilot-dark-600 rounded-organic-md text-pilot-dark-100 placeholder-pilot-dark-400 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-200"
                placeholder="Enter new password"
                disabled={isLoading}
                minLength={8}
              />
              <p className="mt-1 text-xs text-pilot-dark-400">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-pilot-dark-200 mb-2 text-sm font-medium">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-pilot-dark-700/50 border border-pilot-dark-600 rounded-organic-md text-pilot-dark-100 placeholder-pilot-dark-400 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-200"
                placeholder="Confirm new password"
                disabled={isLoading}
                minLength={8}
              />
            </div>

            {message && (
              <div className={`p-3 rounded-organic-md ${
                message.type === 'success' 
                  ? 'bg-pilot-accent-green/20 text-pilot-accent-green border border-pilot-accent-green/30'
                  : 'bg-pilot-accent-red/20 text-pilot-accent-red border border-pilot-accent-red/30'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-pilot-purple-500 to-pilot-purple-600 text-white rounded-organic-md font-medium hover:from-pilot-purple-600 hover:to-pilot-purple-700 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:ring-offset-2 focus:ring-offset-pilot-dark-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/login"
              className="text-pilot-purple-400 hover:text-pilot-purple-300 text-sm font-medium transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}