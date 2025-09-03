/**
 * Iconography Integration System
 * Connects frontend components with backend branded icon system
 * Integrates OmniDash brand assets with nature-inspired design tokens
 */

// Backend API endpoints for fetching branded icons
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Icon categories from backend assets system
export type IconCategory = 
  | 'brand'
  | 'social' 
  | 'features'
  | 'navigation'
  | 'actions'
  | 'status'
  | 'utility';

// Icon format options from backend
export type IconFormat = 'svg' | 'dataurl' | 'json';

// Icon configuration interface
export interface IconConfig {
  size?: number;
  color?: string;
  format?: IconFormat;
  className?: string;
}

// API response interfaces matching backend system
interface IconResponse {
  success: boolean;
  icon: string;
  name: string;
  format: IconFormat;
}

interface IconsResponse {
  success: boolean;
  icons: Record<string, string>;
  categories: Record<IconCategory, string[]>;
  totalIcons: number;
}

interface BrandManifestResponse {
  success: boolean;
  manifest: {
    name: string;
    brand: {
      colors: Record<string, string>;
      gradients: Record<string, string>;
      fonts: {
        primary: string;
        secondary: string;
      };
    };
    icons: {
      categories: Record<IconCategory, string[]>;
      total: number;
    };
    designSystem: {
      borderRadius: Record<string, string>;
      spacing: Record<string, string>;
      shadows: Record<string, string>;
      typography: {
        sizes: Record<string, string>;
        weights: Record<string, string>;
      };
    };
  };
}

// Cache for icon data to improve performance
const iconCache = new Map<string, string>();
const manifestCache = new Map<string, any>();

/**
 * Fetch a specific icon from the backend assets system
 */
export async function fetchIcon(
  iconName: string, 
  config: IconConfig = {}
): Promise<string> {
  const { size, color, format = 'svg' } = config;
  const cacheKey = `${iconName}-${size}-${color}-${format}`;
  
  // Return cached icon if available
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }
  
  try {
    const params = new URLSearchParams({
      format,
      ...(size && { size: size.toString() }),
      ...(color && { color }),
    });
    
    const response = await fetch(
      `${BACKEND_URL}/api/assets/icons/${iconName}?${params}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${response.statusText}`);
    }
    
    if (format === 'svg') {
      const svgData = await response.text();
      iconCache.set(cacheKey, svgData);
      return svgData;
    } else {
      const data: IconResponse = await response.json();
      iconCache.set(cacheKey, data.icon);
      return data.icon;
    }
  } catch (error) {
    console.error(`Error fetching icon ${iconName}:`, error);
    return getFallbackIcon(iconName);
  }
}

/**
 * Fetch all icons by category from the backend
 */
export async function fetchIconsByCategory(
  category?: IconCategory,
  format: IconFormat = 'svg'
): Promise<Record<string, string>> {
  try {
    const params = new URLSearchParams({
      format,
      ...(category && { category }),
    });
    
    const response = await fetch(
      `${BACKEND_URL}/api/assets/icons?${params}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch icons: ${response.statusText}`);
    }
    
    const data: IconsResponse = await response.json();
    return data.icons;
  } catch (error) {
    console.error('Error fetching icons by category:', error);
    return {};
  }
}

/**
 * Fetch the complete brand manifest from backend
 */
export async function fetchBrandManifest(): Promise<BrandManifestResponse['manifest'] | null> {
  const cacheKey = 'brand-manifest';
  
  if (manifestCache.has(cacheKey)) {
    return manifestCache.get(cacheKey);
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/assets/manifest`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch brand manifest: ${response.statusText}`);
    }
    
    const data: BrandManifestResponse = await response.json();
    manifestCache.set(cacheKey, data.manifest);
    return data.manifest;
  } catch (error) {
    console.error('Error fetching brand manifest:', error);
    return null;
  }
}

/**
 * Generate social media profile assets
 */
export async function fetchSocialAssets(platform: string) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/assets/social/${platform}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch social assets: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching social assets for ${platform}:`, error);
    return null;
  }
}

/**
 * Generate platform-specific icons (web, iOS, Android, PWA)
 */
export async function generatePlatformIcons(
  platform: 'web' | 'ios' | 'android' | 'pwa',
  sizes?: number[]
) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/assets/icons/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        ...(sizes && { sizes }),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate platform icons: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error generating platform icons for ${platform}:`, error);
    return null;
  }
}

/**
 * Fallback SVG icons for when backend is unavailable
 */
function getFallbackIcon(iconName: string): string {
  const fallbackIcons: Record<string, string> = {
    dashboard: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>`,
    
    brand: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>`,
    
    social: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 4c0-1.11-.89-2-2-2s-2 .89-2 2 .89 2 2 2 2-.89 2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.5 8H16c-.8 0-1.54.37-2 1l-3.58 5.07c-.14.2-.22.45-.22.71 0 .68.55 1.22 1.22 1.22.28 0 .55-.11.75-.31L16 13v9h4z"/>
    </svg>`,
    
    content: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
    </svg>`,
    
    analytics: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
    </svg>`,
    
    workflow: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`,
    
    ai: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
    </svg>`,
  };
  
  return fallbackIcons[iconName] || fallbackIcons.dashboard;
}

/**
 * React hook for fetching and managing icons
 */
import { useState, useEffect } from 'react';

export function useIcon(iconName: string, config: IconConfig = {}) {
  const [icon, setIcon] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const loadIcon = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const iconData = await fetchIcon(iconName, config);
        
        if (mounted) {
          setIcon(iconData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load icon');
          setIcon(getFallbackIcon(iconName));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadIcon();
    
    return () => {
      mounted = false;
    };
  }, [iconName, config.size, config.color, config.format]);
  
  return { icon, loading, error };
}

/**
 * React hook for fetching brand manifest
 */
export function useBrandManifest() {
  const [manifest, setManifest] = useState<BrandManifestResponse['manifest'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const loadManifest = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const manifestData = await fetchBrandManifest();
        
        if (mounted) {
          setManifest(manifestData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load brand manifest');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadManifest();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  return { manifest, loading, error };
}

/**
 * Utility to apply nature-inspired colors to icons
 */
export function applyNatureColor(iconSvg: string, color: string): string {
  return iconSvg.replace(/fill="[^"]*"/g, `fill="${color}"`);
}

/**
 * Icon size presets matching design system tokens
 */
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

export type IconSize = keyof typeof iconSizes;