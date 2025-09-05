import { NextResponse } from 'next/server';

// Mock branded icons from backend system
const mockIcons = {
  dashboard: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>`,
  brand: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  social: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 4c0-1.11-.89-2-2-2s-2 .89-2 2 .89 2 2 2 2-.89 2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.5 8H16c-.8 0-1.54.37-2 1l-3.58 5.07c-.14.2-.22.45-.22.71 0 .68.55 1.22 1.22 1.22.28 0 .55-.11.75-.31L16 13v9h4z"/></svg>`,
  content: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`,
  workflow: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  ai: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 7c0-2.21-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4 4-1.79 4-4zm-4 6c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`,
  posts: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`,
  engagement: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  revenue: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`,
  omnidash: `<svg viewBox="0 0 120 120" fill="currentColor"><circle cx="60" cy="60" r="50" fill="#4A7B2A"/><path d="M40 45h40v30H40z" fill="white"/></svg>`,
};

const mockCategories = {
  brand: ['omnidash', 'brand'],
  social: ['social', 'users', 'engagement'],
  features: ['dashboard', 'analytics', 'ai'],
  navigation: ['content', 'workflow'],
  actions: ['posts', 'revenue'],
  status: [],
  utility: [],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const _format = searchParams.get('format') || 'svg';

  try {
    let icons: Record<string, string> = mockIcons;
    
    if (category && mockCategories[category as keyof typeof mockCategories]) {
      const categoryIcons = mockCategories[category as keyof typeof mockCategories];
      const filteredIcons: Record<string, string> = {};
      categoryIcons.forEach((iconName) => {
        if (mockIcons[iconName as keyof typeof mockIcons]) {
          filteredIcons[iconName] = mockIcons[iconName as keyof typeof mockIcons];
        }
      });
      icons = filteredIcons;
    }

    return NextResponse.json({
      success: true,
      icons,
      categories: mockCategories,
      totalIcons: Object.keys(mockIcons).length,
    });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch icons' },
      { status: 500 }
    );
  }
}