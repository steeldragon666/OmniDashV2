/**
 * Dashboard Layout - World-class responsive layout with SuperDesign principles
 * Integrates nature-inspired design with OmniDash branded iconography
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Interface for dashboard metrics (connects to backend analytics)
interface DashboardMetrics {
  totalFollowers: number;
  totalPosts: number;
  engagement: number;
  revenue: number;
  brands: Array<{
    id: string;
    name: string;
    followers: number;
    posts: number;
  }>;
}

// Interface for dashboard props
interface DashboardLayoutProps {
  children?: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  metrics?: DashboardMetrics;
  className?: string;
}

// Sidebar navigation items with backend icon integration
const sidebarItems = [
  {
    id: 'overview',
    name: 'Overview',
    icon: 'dashboard', // Maps to backend BrandIcons.dashboard
    href: '/dashboard',
    color: 'nature-forest-500',
  },
  {
    id: 'brands',
    name: 'Brand Management',
    icon: 'brand', // Maps to backend BrandIcons.brand
    href: '/brands',
    color: 'nature-emerald-500',
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: 'social', // Maps to backend BrandIcons.social
    href: '/social',
    color: 'nature-sage-500',
  },
  {
    id: 'content',
    name: 'Content Queue',
    icon: 'content', // Maps to backend BrandIcons.content
    href: '/content',
    color: 'nature-earth-500',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: 'analytics', // Maps to backend BrandIcons.analytics
    href: '/analytics',
    color: 'nature-golden-500',
  },
  {
    id: 'workflows',
    name: 'Workflows',
    icon: 'workflow', // Maps to backend BrandIcons.workflow
    href: '/workflows',
    color: 'brand-secondary',
  },
  {
    id: 'ai',
    name: 'AI Assistant',
    icon: 'ai', // Maps to backend BrandIcons.ai
    href: '/ai',
    color: 'brand-accent',
  },
];

// Quick stats component
const QuickStats: React.FC<{ metrics?: DashboardMetrics }> = ({ metrics }) => {
  const stats = [
    {
      name: 'Total Followers',
      value: metrics?.totalFollowers || 0,
      icon: 'users',
      color: 'nature-forest-500',
      change: '+12%',
    },
    {
      name: 'Posts This Month',
      value: metrics?.totalPosts || 0,
      icon: 'posts',
      color: 'nature-emerald-500',
      change: '+8%',
    },
    {
      name: 'Engagement Rate',
      value: `${metrics?.engagement || 0}%`,
      icon: 'engagement',
      color: 'nature-sage-500',
      change: '+15%',
    },
    {
      name: 'Revenue',
      value: `$${(metrics?.revenue || 0).toLocaleString()}`,
      icon: 'revenue',
      color: 'nature-golden-500',
      change: '+23%',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card variant="elevated" size="md" interactive>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-nature-forest-900 dark:text-nature-sage-100">
                  {stat.value}
                </p>
                <p className="text-sm text-green-600 font-medium">
                  {stat.change} from last month
                </p>
              </div>
              <div className={`w-12 h-12 rounded-organic-md bg-${stat.color}/10 flex items-center justify-center`}>
                {/* Icon will be rendered using backend icon system */}
                <div className={`w-6 h-6 text-${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Sidebar component with nature-inspired design
const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.aside
            className={cn(
              'fixed left-0 top-0 z-50 h-screen w-72 transform overflow-y-auto',
              'bg-glass-heavy backdrop-blur-xl border-r border-white/20',
              'lg:static lg:z-0 lg:translate-x-0'
            )}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            {/* Logo and brand */}
            <div className="flex items-center gap-3 px-6 py-8 border-b border-white/10">
              <div className="w-10 h-10 rounded-organic-md bg-nature-gradient flex items-center justify-center">
                {/* OmniDash logo from backend icon system */}
                <div className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">OmniDash</h2>
                <p className="text-sm text-white/70">Multi-Brand Dashboard</p>
              </div>
            </div>

            {/* Navigation items */}
            <nav className="flex-1 px-4 py-6">
              <ul className="space-y-2">
                {sidebarItems.map((item) => (
                  <li key={item.id}>
                    <motion.a
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-organic-md',
                        'text-white/80 hover:text-white hover:bg-white/10',
                        'transition-all duration-200 group'
                      )}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`w-5 h-5 text-${item.color} group-hover:scale-110 transition-transform`} />
                      <span className="font-medium">{item.name}</span>
                    </motion.a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* User profile section */}
            <div className="px-4 py-6 border-t border-white/10">
              <div className="flex items-center gap-3 px-4 py-3 rounded-organic-md bg-white/5">
                <div className="w-8 h-8 rounded-full bg-nature-golden-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">JD</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">John Doe</p>
                  <p className="text-xs text-white/70 truncate">john@example.com</p>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// Main dashboard layout component
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  metrics,
  className,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-nature-sage-50 via-white to-nature-forest-50', className)}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content area */}
      <div className="lg:ml-72 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                {/* Hamburger menu icon */}
                <div className="w-5 h-5" />
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-nature-forest-900">
                  Good morning, {user?.name || 'User'}
                </h1>
                <p className="text-sm text-neutral-600">
                  Here&apos;s what&apos;s happening with your brands today
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <div className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              
              <Button variant="golden" size="sm">
                <div className="w-4 h-4 mr-2" />
                Upgrade Pro
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Quick stats */}
          <QuickStats metrics={metrics} />
          
          {/* Dashboard content */}
          <div className="space-y-8">
            {children || (
              <Card variant="glass" size="lg">
                <CardHeader>
                  <CardTitle>Welcome to OmniDash</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80">
                    Your world-class multi-brand social media management platform is ready.
                    Explore the features using the navigation sidebar.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
export type { DashboardLayoutProps, DashboardMetrics };