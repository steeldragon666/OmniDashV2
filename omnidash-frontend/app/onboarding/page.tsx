'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  color: string;
}

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    { id: 'twitter', name: 'Twitter/X', icon: '𝕏', connected: false, color: 'bg-black' },
    { id: 'facebook', name: 'Facebook', icon: '📘', connected: false, color: 'bg-blue-600' },
    { id: 'instagram', name: 'Instagram', icon: '📷', connected: false, color: 'bg-pink-500' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', connected: false, color: 'bg-blue-700' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', connected: false, color: 'bg-black' },
    { id: 'youtube', name: 'YouTube', icon: '📺', connected: false, color: 'bg-red-600' },
  ]);
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');

  const connectPlatform = async (platformId: string) => {
    try {
      // This would typically redirect to OAuth flow
      // For now, we'll simulate connection
      setPlatforms(prev => prev.map(p => 
        p.id === platformId ? { ...p, connected: true } : p
      ));
      
      // Here you would typically:
      // 1. Redirect to platform OAuth
      // 2. Handle callback
      // 3. Save tokens to database
    } catch (error) {
      console.error('Failed to connect platform:', error);
    }
  };

  const disconnectPlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, connected: false } : p
    ));
  };

  const createBrand = async () => {
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: brandName,
          description: brandDescription,
          connectedPlatforms: platforms.filter(p => p.connected).map(p => p.id),
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to create brand:', error);
    }
  };

  const skipOnboarding = () => {
    router.push('/dashboard');
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/auth/login" className="px-6 py-2 bg-pilot-purple-500 text-white rounded-lg">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pilot-dark-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-pilot-purple-500 to-pilot-blue-500 rounded-xl mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pilot-purple-300 to-pilot-blue-300 bg-clip-text text-transparent">
              Welcome to OmniDash
            </h1>
            <p className="text-xl text-pilot-dark-300">
              Let&apos;s get your social media management set up
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-pilot-purple-500 text-white' : 'bg-pilot-dark-700 text-pilot-dark-400'}`}>
                1
              </div>
              <div className={`h-1 w-16 ${step >= 2 ? 'bg-pilot-purple-500' : 'bg-pilot-dark-700'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-pilot-purple-500 text-white' : 'bg-pilot-dark-700 text-pilot-dark-400'}`}>
                2
              </div>
            </div>
          </div>

          {step === 1 && (
            <div className="bg-pilot-dark-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6">Connect Your Social Platforms</h2>
              <p className="text-pilot-dark-300 mb-8">
                Connect your social media accounts to start managing all your content in one place.
                You can always add more platforms later.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {platforms.map((platform) => (
                  <div key={platform.id} className="bg-pilot-dark-700 rounded-lg p-6 border border-pilot-dark-600">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-white text-lg`}>
                          {platform.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{platform.name}</h3>
                          <p className="text-sm text-pilot-dark-400">
                            {platform.connected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      {platform.connected && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {platform.connected ? (
                      <button
                        onClick={() => disconnectPlatform(platform.id)}
                        className="w-full px-4 py-2 bg-pilot-dark-600 hover:bg-pilot-dark-500 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectPlatform(platform.id)}
                        className="w-full px-4 py-2 bg-pilot-purple-500 hover:bg-pilot-purple-600 rounded-lg transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={skipOnboarding}
                  className="px-6 py-2 text-pilot-dark-400 hover:text-pilot-dark-200 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-pilot-purple-500 hover:bg-pilot-purple-600 rounded-lg transition-colors"
                  disabled={platforms.filter(p => p.connected).length === 0}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-pilot-dark-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6">Create Your First Brand</h2>
              <p className="text-pilot-dark-300 mb-8">
                Set up your brand profile to organize your social media content and campaigns.
              </p>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-2">Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Enter your brand name"
                    className="w-full px-4 py-3 bg-pilot-dark-700 border border-pilot-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pilot-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={brandDescription}
                    onChange={(e) => setBrandDescription(e.target.value)}
                    placeholder="Brief description of your brand"
                    rows={4}
                    className="w-full px-4 py-3 bg-pilot-dark-700 border border-pilot-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pilot-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Connected Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {platforms.filter(p => p.connected).map((platform) => (
                      <div key={platform.id} className="flex items-center space-x-2 bg-pilot-dark-700 px-3 py-1 rounded-full">
                        <span className="text-lg">{platform.icon}</span>
                        <span className="text-sm">{platform.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 bg-pilot-dark-600 hover:bg-pilot-dark-500 rounded-lg transition-colors"
                >
                  Back
                </button>
                <div className="flex space-x-4">
                  <button
                    onClick={skipOnboarding}
                    className="px-6 py-2 text-pilot-dark-400 hover:text-pilot-dark-200 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={createBrand}
                    className="px-6 py-2 bg-pilot-purple-500 hover:bg-pilot-purple-600 rounded-lg transition-colors"
                    disabled={!brandName.trim()}
                  >
                    Complete Setup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}