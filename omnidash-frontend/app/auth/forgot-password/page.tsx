'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({
          type: 'success',
          text: 'Check your email for a password reset link'
        });
        setEmail('');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pilot-dark-900 via-pilot-dark-800 to-pilot-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-pilot-dark-800/50 backdrop-blur-xl rounded-organic-xl p-8 shadow-2xl border border-pilot-dark-700">
          <h1 className="text-3xl font-bold text-pilot-purple-300 mb-2">
            Forgot Password?
          </h1>
          <p className="text-pilot-dark-300 mb-6">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-pilot-dark-200 mb-2 text-sm font-medium">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-pilot-dark-700/50 border border-pilot-dark-600 rounded-organic-md text-pilot-dark-100 placeholder-pilot-dark-400 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400 focus:border-pilot-purple-400 transition-all duration-200"
                placeholder="you@example.com"
                disabled={isLoading}
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
              {isLoading ? 'Sending...' : 'Send Reset Link'}
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