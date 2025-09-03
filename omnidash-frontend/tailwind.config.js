const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Pilot Pen Design System Colors
        pilot: {
          // Dark base colors
          dark: {
            900: '#0D0D0D', // Deepest black
            800: '#1A1A1A', // Main background
            700: '#2D2D2D', // Card backgrounds
            600: '#404040', // Borders
            500: '#525252', // Muted text
            400: '#737373', // Secondary text
            300: '#A3A3A3', // Primary text on dark
            200: '#D4D4D4', // Light text
            100: '#F5F5F5', // Lightest
            50: '#FAFAFA',  // Pure white
          },
          // Purple gradient system
          purple: {
            900: '#1E1B4B', // Deep purple
            800: '#2E1065', 
            700: '#4C1D95',
            600: '#5B21B6', // Main purple
            500: '#7C3AED', // Primary purple
            400: '#8B5CF6', // Light purple
            300: '#A78BFA', // Lighter
            200: '#C4B5FD', // Very light
            100: '#DDD6FE', // Subtle
            50: '#F3F4F6',  // Background tint
          },
          // Blue gradient system
          blue: {
            900: '#0C1631', // Deep blue
            800: '#1E293B',
            700: '#334155',
            600: '#475569', // Main blue
            500: '#3B82F6', // Primary blue
            400: '#60A5FA', // Light blue
            300: '#93C5FD', // Lighter
            200: '#BFDBFE', // Very light
            100: '#DBEAFE', // Subtle
            50: '#EFF6FF',  // Background tint
          },
          // Accent colors
          accent: {
            cyan: '#06B6D4',
            teal: '#14B8A6',
            emerald: '#10B981',
            yellow: '#F59E0B',
            orange: '#F97316',
            red: '#EF4444',
          }
        },

        // Extended design system colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        'organic-xs': '2px 4px 2px 4px',
        'organic-sm': '4px 8px 4px 8px', 
        'organic-md': '8px 16px 8px 16px',
        'organic-lg': '12px 24px 12px 24px',
        'organic-xl': '16px 32px 16px 32px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-sans)', ...fontFamily.sans],
        mono: ['JetBrains Mono', 'var(--font-mono)', ...fontFamily.mono],
        serif: ['Crimson Text', 'var(--font-serif)', ...fontFamily.serif],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'gradient-x': 'gradient-x 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(-5px)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'nature-gradient': 'linear-gradient(135deg, #4A7B2A 0%, #2D8B5F 50%, #8FAE83 100%)',
        'golden-gradient': 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
        'earth-gradient': 'linear-gradient(135deg, #CD853F 0%, #A0522D 50%, #8B4513 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'organic-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.1), 0 1px 4px -1px rgba(0, 0, 0, 0.06)',
        'organic-md': '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
        'organic-lg': '0 8px 24px -4px rgba(0, 0, 0, 0.1), 0 4px 16px -4px rgba(0, 0, 0, 0.06)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
        'nature-glow': '0 0 20px rgba(74, 123, 42, 0.3)',
      },
      backgroundSize: {
        'auto': 'auto',
        'cover': 'cover',
        'contain': 'contain',
        '50%': '50%',
        '16': '4rem',
        '300%': '300%',
      }
    },
  },
  plugins: [],
};