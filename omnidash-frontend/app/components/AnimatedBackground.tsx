'use client';

import React, { useEffect, useState } from 'react';

const AnimatedBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient background layers */}
      <div className="absolute inset-0 opacity-60">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-nature-forest-50/40 via-white/60 to-nature-emerald-50/40 transition-all duration-1000 animate-gradient-shift"
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`
          }}
        />
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-blue-50/20 via-transparent to-purple-50/20 transition-all duration-1500 animate-gradient-shift"
          style={{
            transform: `translate(-${mousePosition.x * 0.015}px, -${mousePosition.y * 0.015}px)`,
            animationDelay: '2s'
          }}
        />
        <div 
          className="absolute inset-0 bg-gradient-to-bl from-nature-golden-50/15 via-transparent to-nature-sage-50/15 transition-all duration-2000 animate-gradient-shift"
          style={{
            transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
            animationDelay: '4s'
          }}
        />
      </div>

      {/* Floating organic shapes */}
      <div className="absolute inset-0">
        {/* Large floating circles */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-nature-forest-200/8 to-transparent rounded-full blur-3xl animate-pulse-slow"
          style={{
            animationDelay: '0s',
            transform: `translate(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px)`
          }}
        />
        <div 
          className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-radial from-nature-emerald-200/8 to-transparent rounded-full blur-3xl animate-pulse-slow"
          style={{
            animationDelay: '2s',
            transform: `translate(-${mousePosition.x * 0.025}px, -${mousePosition.y * 0.025}px)`
          }}
        />
        <div 
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-radial from-blue-200/6 to-transparent rounded-full blur-3xl animate-pulse-slow"
          style={{
            animationDelay: '4s',
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`
          }}
        />
        
        {/* Medium floating shapes */}
        <div 
          className="absolute top-1/5 right-1/2 w-48 h-48 bg-gradient-to-br from-nature-sage-200/6 to-transparent rounded-full blur-2xl animate-float-up"
          style={{
            animationDelay: '1s',
            transform: `translate(${mousePosition.x * 0.015}px, ${mousePosition.y * 0.015}px)`
          }}
        />
        <div 
          className="absolute bottom-1/3 left-1/3 w-56 h-56 bg-gradient-to-tr from-purple-200/5 to-transparent rounded-full blur-2xl animate-float-across"
          style={{
            animationDelay: '3s',
            transform: `translate(-${mousePosition.x * 0.02}px, ${mousePosition.y * 0.01}px)`
          }}
        />
        
        {/* Small animated particles */}
        <div 
          className="absolute top-2/3 left-1/5 w-32 h-32 bg-nature-golden-300/4 rounded-full blur-xl animate-particle-float"
          style={{
            animationDelay: '2s',
            transform: `translate(${mousePosition.x * 0.025}px, -${mousePosition.y * 0.02}px)`
          }}
        />
        <div 
          className="absolute top-1/3 right-1/5 w-40 h-40 bg-nature-forest-300/4 rounded-full blur-xl animate-particle-float"
          style={{
            animationDelay: '5s',
            transform: `translate(-${mousePosition.x * 0.03}px, ${mousePosition.y * 0.025}px)`
          }}
        />
      </div>

      {/* Geometric floating elements */}
      <div className="absolute inset-0">
        {/* Floating squares */}
        <div 
          className="absolute top-1/6 left-1/6 w-20 h-20 bg-nature-emerald-200/6 rounded-2xl animate-morph-shape blur-sm"
          style={{
            animationDelay: '1s',
            transform: `translate(${mousePosition.x * 0.04}px, ${mousePosition.y * 0.03}px)`
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/6 w-16 h-16 bg-blue-200/5 rounded-xl animate-morph-shape blur-sm"
          style={{
            animationDelay: '3s',
            transform: `translate(-${mousePosition.x * 0.035}px, -${mousePosition.y * 0.025}px)`
          }}
        />
        
        {/* Floating triangular shapes */}
        <div 
          className="absolute top-1/2 left-1/6 w-12 h-12 bg-nature-sage-300/5 transform rotate-45 animate-float-across blur-sm"
          style={{
            animationDelay: '4s',
            transform: `rotate(45deg) translate(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.04}px)`
          }}
        />
        <div 
          className="absolute bottom-1/3 left-2/3 w-14 h-14 bg-purple-300/4 transform rotate-12 animate-float-up blur-sm"
          style={{
            animationDelay: '6s',
            transform: `rotate(12deg) translate(-${mousePosition.x * 0.025}px, ${mousePosition.y * 0.035}px)`
          }}
        />
      </div>

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div 
          className="w-full h-full bg-dashboard-grid"
          style={{
            transform: `translate(${mousePosition.x * 0.005}px, ${mousePosition.y * 0.005}px)`
          }}
        />
      </div>

      {/* Lens flare effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-conic from-transparent via-nature-golden-300/3 to-transparent rounded-full blur-3xl animate-spin opacity-30"
          style={{ animationDuration: '45s' }}
        />
        <div 
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-conic from-transparent via-nature-emerald-300/3 to-transparent rounded-full blur-3xl animate-spin opacity-20"
          style={{ animationDuration: '60s', animationDirection: 'reverse' }}
        />
      </div>

      {/* Ripple effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-1/4 left-3/4 w-24 h-24 border border-nature-forest-300/8 rounded-full animate-ripple"
          style={{
            animationDelay: '0s',
            transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.015}px)`
          }}
        />
        <div 
          className="absolute bottom-1/4 left-1/4 w-32 h-32 border border-nature-emerald-300/6 rounded-full animate-ripple"
          style={{
            animationDelay: '2s',
            transform: `translate(-${mousePosition.x * 0.015}px, -${mousePosition.y * 0.02}px)`
          }}
        />
        <div 
          className="absolute top-2/3 right-1/3 w-20 h-20 border border-blue-300/7 rounded-full animate-ripple"
          style={{
            animationDelay: '4s',
            transform: `translate(${mousePosition.x * 0.025}px, ${mousePosition.y * 0.02}px)`
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedBackground;