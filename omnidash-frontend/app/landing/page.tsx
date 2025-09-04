'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LandingPage = () => {
  const [showLoginWall, setShowLoginWall] = useState(false);
  const [logoAnimated, setLogoAnimated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Start logo animation immediately
    setTimeout(() => setLogoAnimated(true), 500);
    
    // Show login wall after 4 seconds
    setTimeout(() => setShowLoginWall(true), 4000);
  }, []);

  const handleGetStarted = () => {
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-pilot-dark-900">
      {/* 3D Gradient Background */}
      <div className="absolute inset-0">
        {/* Primary gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-pilot-purple-900 via-pilot-dark-800 to-pilot-blue-900"></div>
        
        {/* Secondary gradient layer for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-pilot-purple-600/20 via-transparent to-pilot-blue-500/20"></div>
        
        {/* Radial gradient overlay for 3D effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-pilot-purple-500/30 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-pilot-blue-500/30 via-transparent to-transparent"></div>
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-pilot-purple-500/20 to-pilot-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pilot-blue-500/20 to-pilot-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,#7C3AED_2px,transparent_2px)] bg-[length:60px_60px]"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Animated Logo */}
          <div className={`mb-8 transform transition-all duration-2000 ease-out ${logoAnimated ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-16'}`}>
            <div className="relative inline-block">
              {/* Logo Glow Effect */}
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-pilot-purple-400 to-pilot-blue-400 rounded-full opacity-60 animate-pulse-slow"></div>
              
              {/* Main Logo */}
              <div className="relative bg-gradient-to-br from-pilot-purple-500 to-pilot-blue-500 p-8 rounded-organic-xl shadow-organic-lg">
                <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              
              {/* Logo Ring Animation */}
              <div className={`absolute inset-0 border-4 border-pilot-purple-400/30 rounded-full transition-all duration-3000 ${logoAnimated ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`}></div>
              <div className={`absolute inset-0 border-2 border-pilot-blue-400/30 rounded-full transition-all duration-3000 ${logoAnimated ? 'scale-200 opacity-0' : 'scale-100 opacity-100'}`} style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>

          {/* Animated Title */}
          <div className={`mb-6 transform transition-all duration-2000 ease-out ${logoAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.5s' }}>
            <h1 className="text-6xl md:text-8xl font-bold font-sans mb-4">
              <span className="bg-gradient-to-r from-pilot-purple-300 via-pilot-blue-300 to-pilot-purple-300 bg-clip-text text-transparent bg-300% animate-gradient-x">
                OmniDash
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-pilot-dark-300 font-sans leading-relaxed">
              The Future of Multi-Brand Social Media Management
            </p>
          </div>

          {/* Animated Subtitle */}
          <div className={`mb-12 transform transition-all duration-2000 ease-out ${logoAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '1s' }}>
            <p className="text-lg text-pilot-dark-400 font-sans max-w-2xl mx-auto">
              Harness the power of AI-driven analytics, seamless integrations, and professional automation 
              to transform your digital presence across all platforms.
            </p>
          </div>

          {/* Feature Pills */}
          <div className={`flex flex-wrap justify-center gap-4 mb-12 transform transition-all duration-2000 ease-out ${logoAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '1.5s' }}>
            {['AI-Powered Analytics', 'Multi-Platform Sync', 'Professional Automation', 'Real-time Insights'].map((feature) => (
              <div key={feature} className="px-6 py-3 bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-full text-pilot-dark-200 font-sans text-sm hover:bg-pilot-dark-600/40 transition-all duration-300 transform hover:scale-105">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login Wall Overlay */}
      <div className={`fixed inset-0 z-50 bg-pilot-dark-900/95 backdrop-blur-xl flex items-center justify-center transition-all duration-1000 ${showLoginWall ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-pilot-dark-700/50 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-xl p-12 max-w-md w-full mx-4 shadow-organic-lg transform transition-all duration-1000 ${showLoginWall ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pilot-purple-500 to-pilot-blue-500 rounded-organic-md mx-auto mb-6 flex items-center justify-center shadow-organic-sm">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-pilot-dark-100 font-sans mb-4">
              Ready to Transform?
            </h2>
            <p className="text-pilot-dark-400 font-sans mb-8 leading-relaxed">
              Join thousands of professionals who&apos;ve revolutionized their social media strategy with OmniDash.
            </p>
            
            <button 
              onClick={handleGetStarted}
              className="w-full py-4 px-8 bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white font-bold font-sans rounded-organic-md shadow-organic-lg hover:shadow-organic-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pilot-purple-400/50"
            >
              Get Started Free
            </button>
            
            <p className="text-pilot-dark-500 text-sm font-sans mt-4">
              No credit card required • Start in 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;