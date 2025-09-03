import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './components/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'OmniDash - Multi-Brand Social Media Management',
  description: 'World-class dashboard for managing multiple social media brands with AI-powered content generation and analytics.',
  keywords: ['social media', 'brand management', 'analytics', 'AI content', 'dashboard'],
  authors: [{ name: 'OmniDash Team' }],
  creator: 'OmniDash',
  publisher: 'OmniDash',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('http://localhost:3001'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'http://localhost:3001',
    title: 'OmniDash - Multi-Brand Social Media Management',
    description: 'World-class dashboard for managing multiple social media brands',
    siteName: 'OmniDash',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OmniDash - Multi-Brand Social Media Management',
    description: 'World-class dashboard for managing multiple social media brands',
  },
  robots: {
    index: false, // Don't index localhost
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`font-sans antialiased min-h-screen bg-gradient-to-br from-nature-sage-50 via-white to-nature-forest-50`}>
        <AuthProvider>
          <div id="root">
            {children}
          </div>
        </AuthProvider>
        <div id="modal-root" />
        <div id="tooltip-root" />
      </body>
    </html>
  );
}