'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton = ({ className }: LoadingSkeletonProps) => (
  <div
    className={cn(
      'animate-pulse bg-gradient-to-r from-pilot-dark-700/30 via-pilot-dark-600/50 to-pilot-dark-700/30 rounded-organic-md',
      className
    )}
    style={{
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s infinite linear',
    }}
  />
);

export const CardSkeleton = () => (
  <div className="bg-pilot-dark-700/50 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-md">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-4">
        <LoadingSkeleton className="w-12 h-12 rounded-organic-md" />
        <div className="space-y-2">
          <LoadingSkeleton className="h-5 w-32" />
          <LoadingSkeleton className="h-4 w-24" />
        </div>
      </div>
      <LoadingSkeleton className="h-6 w-16 rounded-full" />
    </div>
    <LoadingSkeleton className="h-4 w-full mb-2" />
    <LoadingSkeleton className="h-4 w-3/4 mb-4" />
    <div className="flex items-center justify-between">
      <div className="flex space-x-2">
        <LoadingSkeleton className="w-8 h-8 rounded-organic-md" />
        <LoadingSkeleton className="w-8 h-8 rounded-organic-md" />
        <LoadingSkeleton className="w-8 h-8 rounded-organic-md" />
      </div>
      <div className="flex space-x-2">
        <LoadingSkeleton className="w-8 h-8 rounded-organic-md" />
        <LoadingSkeleton className="w-8 h-8 rounded-organic-md" />
      </div>
    </div>
  </div>
);

export const MetricCardSkeleton = () => (
  <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 text-center shadow-organic-lg">
    <LoadingSkeleton className="h-8 w-16 mx-auto mb-2" />
    <LoadingSkeleton className="h-4 w-24 mx-auto" />
  </div>
);

export const ChartSkeleton = ({ height = "h-64" }: { height?: string }) => (
  <div className={cn("bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg p-6 shadow-organic-lg", height)}>
    <div className="flex items-center justify-between mb-4">
      <LoadingSkeleton className="h-6 w-32" />
      <LoadingSkeleton className="h-4 w-20" />
    </div>
    <div className="relative h-full">
      <LoadingSkeleton className="absolute inset-0 rounded-organic-md" />
      <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end h-3/4">
        {[...Array(7)].map((_, i) => (
          <LoadingSkeleton 
            key={i} 
            className={`w-8 rounded-t-organic-sm`}
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg shadow-organic-lg overflow-hidden">
    <div className="border-b border-pilot-dark-600 p-4">
      <div className="flex space-x-4">
        <LoadingSkeleton className="h-5 w-24" />
        <LoadingSkeleton className="h-5 w-32" />
        <LoadingSkeleton className="h-5 w-20" />
        <LoadingSkeleton className="h-5 w-28" />
      </div>
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="border-b border-pilot-dark-600/50 p-4 last:border-b-0">
        <div className="flex space-x-4">
          <LoadingSkeleton className="h-4 w-20" />
          <LoadingSkeleton className="h-4 w-28" />
          <LoadingSkeleton className="h-4 w-16" />
          <LoadingSkeleton className="h-4 w-24" />
        </div>
      </div>
    ))}
  </div>
);

export const ProfileSkeleton = () => (
  <div className="flex items-center space-x-4 p-4 bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-lg shadow-organic-md">
    <LoadingSkeleton className="w-16 h-16 rounded-full" />
    <div className="space-y-2">
      <LoadingSkeleton className="h-5 w-32" />
      <LoadingSkeleton className="h-4 w-24" />
      <LoadingSkeleton className="h-3 w-40" />
    </div>
  </div>
);

export const MessageSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs p-4 rounded-organic-lg ${
          i % 2 === 0 
            ? 'bg-pilot-purple-500/20 border border-pilot-purple-500/30' 
            : 'bg-pilot-dark-700/50 border border-pilot-dark-600'
        }`}>
          <LoadingSkeleton className="h-4 w-full mb-2" />
          <LoadingSkeleton className="h-4 w-3/4 mb-1" />
          <LoadingSkeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// Add shimmer animation to global CSS
export const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;