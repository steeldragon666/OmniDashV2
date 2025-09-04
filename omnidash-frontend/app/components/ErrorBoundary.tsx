'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Add error logging service (Sentry, LogRocket, etc.)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-pilot-dark-900 relative overflow-hidden">
          {/* 3D Gradient Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-pilot-purple-900/20 via-pilot-dark-800 to-pilot-blue-900/20"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-pilot-purple-600/10 via-transparent to-pilot-blue-500/10"></div>
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pilot-purple-500/10 to-pilot-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-gradient-to-r from-pilot-blue-500/10 to-pilot-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute inset-0 opacity-[0.02]">
              <div className="w-full h-full bg-[radial-gradient(circle_at_center,#7C3AED_2px,transparent_2px)] bg-[length:60px_60px]"></div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
            <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl p-8 shadow-organic-lg max-w-2xl w-full text-center">
              <div className="mb-6">
                <svg className="w-16 h-16 text-pilot-accent-red mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h1 className="text-3xl font-bold text-pilot-dark-100 font-sans mb-2">
                  <span className="bg-gradient-to-r from-pilot-accent-red to-pilot-accent-orange bg-clip-text text-transparent">
                    Oops! Something went wrong
                  </span>
                </h1>
                <p className="text-pilot-dark-400 text-lg font-sans">
                  We encountered an unexpected error. Don&apos;t worry, our team has been notified.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 text-left">
                  <details className="bg-pilot-dark-800/50 rounded-organic-md p-4 border border-pilot-dark-600">
                    <summary className="text-pilot-dark-200 font-sans font-medium cursor-pointer mb-2">
                      Error Details (Development)
                    </summary>
                    <div className="text-sm text-pilot-accent-red font-mono">
                      <p className="mb-2">
                        <strong>Error:</strong> {this.state.error.message}
                      </p>
                      <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  </details>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white font-medium font-sans rounded-organic-md transition-all duration-300 transform hover:scale-105 shadow-organic-md hover:shadow-organic-lg focus:outline-none focus:ring-2 focus:ring-pilot-purple-400/50"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 bg-pilot-dark-700/40 backdrop-blur-sm border border-pilot-dark-600 text-pilot-dark-200 font-medium font-sans rounded-organic-md transition-all duration-300 transform hover:scale-105 shadow-organic-sm hover:bg-pilot-dark-600/50 focus:outline-none focus:ring-2 focus:ring-pilot-dark-400/50"
                >
                  Go Home
                </button>
              </div>

              <p className="text-pilot-dark-500 text-sm mt-6 font-sans">
                If this problem persists, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;