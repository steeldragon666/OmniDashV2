/**
 * Design System Tokens for OmniDash Frontend
 * Inspired by Nature and Colors Behance gallery analysis
 * Implements SuperDesign principles with organic, nature-inspired aesthetics
 */

// Color tokens inspired by the nature gallery
export const colors = {
  // Brand colors (from existing backend system)
  brand: {
    primary: '#3B82F6',
    secondary: '#8B5CF6', 
    accent: '#10B981',
    success: '#059669',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Nature-inspired palette extracted from gallery
  nature: {
    forest: {
      50: '#F0F7ED',
      100: '#E1EFDB', 
      200: '#C3DFB7',
      300: '#A5CF93',
      400: '#87BF6F',
      500: '#4A7B2A', // Primary forest green
      600: '#3A6B1F',
      700: '#2D5016',
      800: '#1F350F',
      900: '#121A08',
    },
    emerald: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0', 
      300: '#6EE7B7',
      400: '#34D399',
      500: '#2D8B5F', // Primary emerald
      600: '#1A6B4F',
      700: '#0F4C3A',
      800: '#0A3429',
      900: '#061B17',
    },
    sage: {
      50: '#F7F9F5',
      100: '#EFF3EB',
      200: '#DFE7D7',
      300: '#CFDCC3',
      400: '#BFD0AF',
      500: '#8FAE83', // Primary sage
      600: '#7B9B6F',
      700: '#67885B',
      800: '#537547',
      900: '#3F6233',
    },
    earth: {
      50: '#FBF8F3',
      100: '#F7F1E7',
      200: '#EFE3CF',
      300: '#E7D5B7',
      400: '#DFC79F',
      500: '#CD853F', // Primary earth tone
      600: '#A0522D',
      700: '#8B4513',
      800: '#6B350F', 
      900: '#4B250B',
    },
    golden: {
      50: '#FFFEF0',
      100: '#FFFDE1',
      200: '#FFFBC3',
      300: '#FFF9A5',
      400: '#FFF787',
      500: '#FFD700', // Primary golden
      600: '#FFA500',
      700: '#FF8C00',
      800: '#E67300',
      900: '#CC5A00',
    },
  },

  // Neutral grays for balance
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic colors
  semantic: {
    success: '#059669',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Glass morphism and transparency
  glass: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.25)',
    heavy: 'rgba(255, 255, 255, 0.4)',
    dark: 'rgba(0, 0, 0, 0.1)',
  },
};

export default designTokens;

// Typography scale inspired by nature's proportions
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
    serif: ['Crimson Text', 'serif'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1.2' }],
    '6xl': ['3.75rem', { lineHeight: '1.1' }],
    '7xl': ['4.5rem', { lineHeight: '1.05' }],
    '8xl': ['6rem', { lineHeight: '1' }],
    '9xl': ['8rem', { lineHeight: '1' }],
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Spacing based on organic proportions
export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  18: '4.5rem',    // 72px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
  36: '9rem',      // 144px
  40: '10rem',     // 160px
  44: '11rem',     // 176px
  48: '12rem',     // 192px
  52: '13rem',     // 208px
  56: '14rem',     // 224px
  60: '15rem',     // 240px
  64: '16rem',     // 256px
  72: '18rem',     // 288px
  80: '20rem',     // 320px
  96: '24rem',     // 384px
  128: '32rem',    // 512px
};

// Organic border radius inspired by nature
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',     // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',
  
  // Organic, nature-inspired radius
  'organic-xs': '2px 4px 2px 4px',
  'organic-sm': '4px 8px 4px 8px',
  'organic-md': '8px 16px 8px 16px',
  'organic-lg': '12px 24px 12px 24px',
  'organic-xl': '16px 32px 16px 32px',
};

// Elevation and shadows for depth
export const boxShadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  none: '0 0 #0000',
  
  // Organic shadows
  'organic-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.1), 0 1px 4px -1px rgba(0, 0, 0, 0.06)',
  'organic-md': '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
  'organic-lg': '0 8px 24px -4px rgba(0, 0, 0, 0.1), 0 4px 16px -4px rgba(0, 0, 0, 0.06)',
  
  // Glass morphism effect
  'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  
  // Glow effects
  'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
  'nature-glow': '0 0 20px rgba(74, 123, 42, 0.3)',
  'golden-glow': '0 0 20px rgba(255, 215, 0, 0.4)',
};

// Animation and transitions
export const animation = {
  duration: {
    fastest: '150ms',
    faster: '200ms', 
    fast: '250ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
    slowest: '1000ms',
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'organic': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Nature-inspired easing
  },
};

// Breakpoints for responsive design
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Z-index scale for layering
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

// Component-specific tokens
export const components = {
  card: {
    padding: {
      sm: spacing[4],
      md: spacing[6],
      lg: spacing[8],
    },
    borderRadius: borderRadius.lg,
    shadow: boxShadow['organic-md'],
  },
  
  button: {
    height: {
      sm: '2rem',    // 32px
      md: '2.5rem',  // 40px 
      lg: '3rem',    // 48px
      xl: '3.5rem',  // 56px
    },
    padding: {
      sm: `${spacing[2]} ${spacing[3]}`,
      md: `${spacing[2.5]} ${spacing[4]}`,
      lg: `${spacing[3]} ${spacing[6]}`,
      xl: `${spacing[4]} ${spacing[8]}`,
    },
    borderRadius: borderRadius['organic-md'],
  },
  
  input: {
    height: {
      sm: '2rem',
      md: '2.5rem',
      lg: '3rem',
    },
    padding: {
      sm: spacing[2],
      md: spacing[3],
      lg: spacing[4],
    },
    borderRadius: borderRadius['organic-sm'],
  },
};

const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  boxShadow,
  animation,
  breakpoints,
  zIndex,
  components,
};