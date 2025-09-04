'use client';

import React, { useEffect, useState } from 'react';

// Skip to main content component
export const SkipToMain = () => (
  <a 
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-pilot-purple-500 text-white font-medium rounded-organic-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pilot-purple-400/50"
  >
    Skip to main content
  </a>
);

// Screen reader only text
export const ScreenReaderOnly = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
);

// Live region for announcements
export const LiveRegion = ({ 
  children, 
  level = 'polite' 
}: { 
  children: React.ReactNode; 
  level?: 'polite' | 'assertive' | 'off';
}) => (
  <div 
    aria-live={level} 
    aria-atomic="true" 
    className="sr-only"
  >
    {children}
  </div>
);

// Focus trap for modals and dialogs
export const FocusTrap = ({ 
  children, 
  active = true 
}: { 
  children: React.ReactNode; 
  active?: boolean;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    setFocusableElements(elements);

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
};

// High contrast mode detector and styles
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion detector
export const useReducedMotion = () => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isReducedMotion;
};

// Accessible button component
export const AccessibleButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  ariaLabel,
  ariaDescribedBy,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  [key: string]: any;
}) => {
  const baseClasses = "font-medium font-sans rounded-organic-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pilot-dark-900 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  
  const variants = {
    primary: 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-md hover:shadow-organic-lg focus:ring-pilot-purple-400/50',
    secondary: 'bg-pilot-dark-700/40 backdrop-blur-sm border border-pilot-dark-600 text-pilot-dark-200 shadow-organic-sm hover:bg-pilot-dark-600/50 focus:ring-pilot-dark-400/50',
    danger: 'bg-gradient-to-r from-pilot-accent-red to-pilot-accent-red/80 text-white shadow-organic-md hover:shadow-organic-lg focus:ring-pilot-accent-red/50'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Accessible form field with proper labeling
export const AccessibleField = ({
  label,
  children,
  error,
  help,
  required = false,
  id,
  className = ''
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  help?: string;
  required?: boolean;
  id: string;
  className?: string;
}) => {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-pilot-dark-200 font-sans"
      >
        {label}
        {required && (
          <span className="text-pilot-accent-red ml-1" aria-label="required">*</span>
        )}
      </label>
      
      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : 'false',
        'aria-required': required
      })}
      
      {help && (
        <p id={helpId} className="text-sm text-pilot-dark-400 font-sans">
          {help}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-pilot-accent-red font-sans flex items-center">
          <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

// Accessible modal/dialog
export const AccessibleModal = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const [titleId] = useState(`modal-title-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <FocusTrap active={isOpen}>
        <div className={`bg-pilot-dark-800/95 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-organic-2xl ${className}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 id={titleId} className="text-2xl font-bold text-pilot-dark-100 font-sans">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-pilot-dark-700/50 text-pilot-dark-300 hover:text-pilot-dark-100 rounded-organic-md transition-colors focus:outline-none focus:ring-2 focus:ring-pilot-purple-400/50"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );
};

// Keyboard navigation announcer
export const KeyboardNavigationAnnouncer = () => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const direction = e.shiftKey ? 'previous' : 'next';
        setAnnouncement(`Navigating to ${direction} element`);
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setAnnouncement(''), 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <LiveRegion level="polite">
      {announcement}
    </LiveRegion>
  );
};

// Color contrast checker utility
export const checkColorContrast = (foreground: string, background: string): number => {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd use a proper color contrast library
  const getLuminance = (color: string) => {
    // This is a simplified implementation
    // In production, use a proper color parsing library
    return 0.5; // Placeholder
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return ratio;
};