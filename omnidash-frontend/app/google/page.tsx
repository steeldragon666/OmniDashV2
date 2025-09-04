'use client';

import React from 'react';

export default function GooglePage() {
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
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-pilot-dark-100 font-sans mb-2">
              <span className="bg-gradient-to-r from-pilot-purple-400 to-pilot-blue-400 bg-clip-text text-transparent">
                Google Services
              </span>
            </h1>
            <p className="text-pilot-dark-400 text-xl font-sans">Access your Google Drive and Gmail data</p>
          </div>

          <div className="bg-pilot-accent-yellow/10 border border-pilot-accent-yellow/30 rounded-organic-xl p-6 mb-8 backdrop-blur-sm">
            <div className="flex">
              <svg className="flex-shrink-0 w-5 h-5 text-pilot-accent-yellow" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-pilot-accent-yellow font-sans">
                  Authentication Required
                </h3>
                <div className="mt-2 text-sm text-pilot-dark-300 font-sans">
                  <p>Please sign in to access your Google Drive files and Gmail messages.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center py-12">
            <div className="bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-xl p-8">
              <h2 className="text-2xl font-bold text-pilot-dark-100 font-sans mb-4">Google Integration</h2>
              <p className="text-pilot-dark-400 font-sans mb-6">
                Connect your Google account to access Drive files and Gmail messages directly from OmniDash.
              </p>
              <button className="bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white font-bold font-sans py-3 px-8 rounded-organic-md shadow-organic-lg hover:shadow-organic-xl transition-all duration-300 transform hover:scale-105">
                Connect Google Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}