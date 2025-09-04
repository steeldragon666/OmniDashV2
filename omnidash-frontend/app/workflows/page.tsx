'use client';

import React, { useState, useCallback, useRef } from 'react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  service: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  connections: string[];
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  isActive: boolean;
  lastRun?: string;
  runs: number;
}

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  onClick,
  disabled = false,
  className = '' 
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-md hover:shadow-organic-lg focus:ring-pilot-purple-400/50',
    secondary: 'bg-pilot-dark-700/40 backdrop-blur-sm border border-pilot-dark-600 text-pilot-dark-200 shadow-organic-sm hover:bg-pilot-dark-600/50 focus:ring-pilot-dark-400/50',
    outline: 'bg-transparent border-2 border-pilot-purple-500 text-pilot-purple-400 hover:bg-pilot-purple-500/10 focus:ring-pilot-purple-400/50'
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]} 
        ${sizes[size]}
        font-medium font-sans rounded-organic-md
        transition-all duration-300 transform hover:scale-105
        focus:outline-none focus:ring-4
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      )}
      {children}
    </button>
  );
};

const NodeTemplate = ({ 
  type, 
  service, 
  name, 
  description, 
  onDragStart 
}: {
  type: 'trigger' | 'action' | 'condition';
  service: string;
  name: string;
  description: string;
  onDragStart: (nodeData: Partial<WorkflowNode>) => void;
}) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-gradient-to-br from-pilot-accent-emerald/20 to-pilot-accent-emerald/10 border-pilot-accent-emerald/30 text-pilot-accent-emerald';
      case 'action': return 'bg-gradient-to-br from-pilot-blue-500/20 to-pilot-blue-500/10 border-pilot-blue-500/30 text-pilot-blue-400';
      case 'condition': return 'bg-gradient-to-br from-pilot-accent-yellow/20 to-pilot-accent-yellow/10 border-pilot-accent-yellow/30 text-pilot-accent-yellow';
      default: return 'bg-gradient-to-br from-pilot-dark-700/20 to-pilot-dark-700/10 border-pilot-dark-600 text-pilot-dark-200';
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'instagram': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
      'twitter': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>,
      'linkedin': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
      'facebook': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      'gmail': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>,
      'drive': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.26 9.37L7.33 7.1h9.34l1.07 2.27H6.26zM14.69 0L8.52 11.9h15.05L16.4 0h-1.71zM.43 12.21l2.89 5.99c.36.74 1.12 1.2 1.96 1.2h5.77L7.6 12.21H.43z"/></svg>,
      'openai': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>,
      'webhook': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.5 12c0 1.93-1.57 3.5-3.5 3.5S3.5 13.93 3.5 12 5.07 8.5 7 8.5s3.5 1.57 3.5 3.5zm6.5 0c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5S11.07 8.5 13 8.5s3.5 1.57 3.5 3.5z"/><path d="M7 15.5c-1.93 0-3.5 1.57-3.5 3.5S5.07 22.5 7 22.5s3.5-1.57 3.5-3.5S8.93 15.5 7 15.5z"/></svg>,
      'schedule': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>,
      'filter': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>,
      'delay': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
      'email': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
    };
    return icons[service] || <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>;
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart({ type, service, name, description });
      }}
      className={`
        ${getNodeColor(type)}
        p-4 rounded-organic-lg border-2 cursor-grab active:cursor-grabbing backdrop-blur-sm
        hover:shadow-organic-md transition-all duration-300 transform hover:scale-[1.02]
        min-w-[200px] max-w-[200px]
      `}
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className="text-2xl">{getServiceIcon(service)}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm font-sans">{name}</h4>
          <span className="text-xs opacity-75 capitalize font-sans">{type}</span>
        </div>
      </div>
      <p className="text-xs opacity-75 font-sans">{description}</p>
    </div>
  );
};

const WorkflowNodeComponent = ({ 
  node, 
  onSelect, 
  onDelete,
  isSelected = false 
}: {
  node: WorkflowNode;
  onSelect: (node: WorkflowNode) => void;
  onDelete: (nodeId: string) => void;
  isSelected?: boolean;
}) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-gradient-to-br from-pilot-accent-emerald/20 to-pilot-accent-emerald/10 border-pilot-accent-emerald/30 text-pilot-accent-emerald';
      case 'action': return 'bg-gradient-to-br from-pilot-blue-500/20 to-pilot-blue-500/10 border-pilot-blue-500/30 text-pilot-blue-400';
      case 'condition': return 'bg-gradient-to-br from-pilot-accent-yellow/20 to-pilot-accent-yellow/10 border-pilot-accent-yellow/30 text-pilot-accent-yellow';
      default: return 'bg-gradient-to-br from-pilot-dark-700/20 to-pilot-dark-700/10 border-pilot-dark-600 text-pilot-dark-200';
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: JSX.Element } = {
      'instagram': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
      'twitter': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>,
      'linkedin': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
      'facebook': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      'gmail': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>,
      'drive': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.26 9.37L7.33 7.1h9.34l1.07 2.27H6.26zM14.69 0L8.52 11.9h15.05L16.4 0h-1.71zM.43 12.21l2.89 5.99c.36.74 1.12 1.2 1.96 1.2h5.77L7.6 12.21H.43z"/></svg>,
      'openai': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>,
      'webhook': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.5 12c0 1.93-1.57 3.5-3.5 3.5S3.5 13.93 3.5 12 5.07 8.5 7 8.5s3.5 1.57 3.5 3.5zm6.5 0c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5S11.07 8.5 13 8.5s3.5 1.57 3.5 3.5z"/><path d="M7 15.5c-1.93 0-3.5 1.57-3.5 3.5S5.07 22.5 7 22.5s3.5-1.57 3.5-3.5S8.93 15.5 7 15.5z"/></svg>,
      'schedule': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>,
      'filter': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>,
      'delay': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
      'email': <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
    };
    return icons[service] || <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>;
  };

  return (
    <div
      onClick={() => onSelect(node)}
      className={`
        ${getNodeColor(node.type)}
        ${isSelected ? 'ring-2 ring-pilot-purple-500 ring-offset-2' : ''}
        p-4 rounded-organic-lg border-2 cursor-pointer backdrop-blur-sm
        hover:shadow-organic-md transition-all duration-300 transform hover:scale-[1.02]
        min-w-[180px] max-w-[180px] relative
        group
      `}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(node.id);
        }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-pilot-accent-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-organic-sm"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <div className="flex items-center space-x-3 mb-2">
        <div className="text-xl">{getServiceIcon(node.service)}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm font-sans">{node.name}</h4>
          <span className="text-xs opacity-75 capitalize font-sans">{node.type}</span>
        </div>
      </div>
      <p className="text-xs opacity-75 line-clamp-2 font-sans">{node.description}</p>
    </div>
  );
};

const WorkflowCard = ({ 
  workflow, 
  onEdit, 
  onToggle, 
  onDelete 
}: {
  workflow: Workflow;
  onEdit: (workflow: Workflow) => void;
  onToggle: (workflowId: string) => void;
  onDelete: (workflowId: string) => void;
}) => (
  <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl p-6 shadow-organic-md hover:shadow-organic-lg transition-all duration-300 transform hover:scale-[1.02]">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-xl font-bold text-pilot-dark-100 mb-2 font-sans">{workflow.name}</h3>
        <p className="text-sm text-pilot-dark-300 mb-4 font-sans">{workflow.description}</p>
        
        <div className="flex items-center space-x-4 text-sm text-pilot-dark-400 font-sans">
          <span>{workflow.nodes.length} nodes</span>
          <span>•</span>
          <span>{workflow.runs} runs</span>
          {workflow.lastRun && (
            <>
              <span>•</span>
              <span>Last run: {new Date(workflow.lastRun).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className={`px-3 py-1 rounded-full text-xs font-medium font-sans ${
          workflow.isActive 
            ? 'bg-pilot-accent-emerald/20 text-pilot-accent-emerald border border-pilot-accent-emerald/30' 
            : 'bg-pilot-dark-600/50 text-pilot-dark-300 border border-pilot-dark-600'
        }`}>
          {workflow.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
    </div>
    
    <div className="flex items-center justify-between">
      <div className="flex space-x-3">
        <Button
          onClick={() => onEdit(workflow)}
          variant="outline"
          size="sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </Button>
        <Button
          onClick={() => onToggle(workflow.id)}
          variant={workflow.isActive ? 'secondary' : 'primary'}
          size="sm"
        >
          {workflow.isActive ? (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {workflow.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
      
      <button
        onClick={() => onDelete(workflow.id)}
        className="text-pilot-accent-red hover:text-pilot-accent-red/80 p-2 rounded-organic-sm transition-colors"
        title="Delete workflow"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
);

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'editor'>('workflows');
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: '1',
      name: 'Social Media Content Pipeline',
      description: 'Automatically post content across social platforms when new content is created',
      nodes: [],
      isActive: true,
      lastRun: new Date(Date.now() - 86400000).toISOString(),
      runs: 24
    },
    {
      id: '2',
      name: 'Email Marketing Integration',
      description: 'Sync social media engagement data with email marketing campaigns',
      nodes: [],
      isActive: false,
      lastRun: new Date(Date.now() - 172800000).toISOString(),
      runs: 8
    }
  ]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNodeTemplate, setDraggedNodeTemplate] = useState<Partial<WorkflowNode> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodeTemplates = [
    // Triggers
    { type: 'trigger' as const, service: 'schedule', name: 'Schedule', description: 'Trigger workflow at specific times' },
    { type: 'trigger' as const, service: 'webhook', name: 'Webhook', description: 'Trigger from external HTTP requests' },
    { type: 'trigger' as const, service: 'gmail', name: 'New Email', description: 'Trigger when new email received' },
    
    // Actions
    { type: 'action' as const, service: 'instagram', name: 'Post to Instagram', description: 'Create Instagram post' },
    { type: 'action' as const, service: 'twitter', name: 'Post to Twitter', description: 'Create Twitter post' },
    { type: 'action' as const, service: 'linkedin', name: 'Post to LinkedIn', description: 'Create LinkedIn post' },
    { type: 'action' as const, service: 'gmail', name: 'Send Email', description: 'Send email via Gmail' },
    { type: 'action' as const, service: 'drive', name: 'Save to Drive', description: 'Save file to Google Drive' },
    { type: 'action' as const, service: 'openai', name: 'Generate Content', description: 'Generate content with AI' },
    
    // Conditions
    { type: 'condition' as const, service: 'filter', name: 'Filter Data', description: 'Filter data based on conditions' },
    { type: 'condition' as const, service: 'delay', name: 'Delay', description: 'Add delay between actions' },
  ];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedNodeTemplate || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newNode: WorkflowNode = {
      id: Date.now().toString(),
      type: draggedNodeTemplate.type!,
      service: draggedNodeTemplate.service!,
      name: draggedNodeTemplate.name!,
      description: draggedNodeTemplate.description!,
      position: { x, y },
      data: {},
      connections: []
    };
    
    setNodes(prev => [...prev, newNode]);
    setDraggedNodeTemplate(null);
  }, [draggedNodeTemplate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleEditWorkflow = (workflow: Workflow) => {
    setCurrentWorkflow(workflow);
    setNodes(workflow.nodes);
    setActiveTab('editor');
  };

  const handleNewWorkflow = () => {
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: 'New Workflow',
      description: 'Describe your automation workflow',
      nodes: [],
      isActive: false,
      runs: 0
    };
    setCurrentWorkflow(newWorkflow);
    setNodes([]);
    setActiveTab('editor');
  };

  const handleSaveWorkflow = () => {
    if (!currentWorkflow) return;
    
    const updatedWorkflow = {
      ...currentWorkflow,
      nodes
    };
    
    setWorkflows(prev => {
      const existing = prev.find(w => w.id === currentWorkflow.id);
      if (existing) {
        return prev.map(w => w.id === currentWorkflow.id ? updatedWorkflow : w);
      } else {
        return [...prev, updatedWorkflow];
      }
    });
    
    setActiveTab('workflows');
    setCurrentWorkflow(null);
    setNodes([]);
  };

  const handleToggleWorkflow = (workflowId: string) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === workflowId ? { ...w, isActive: !w.isActive } : w
      )
    );
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

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

      <div className="relative z-10 bg-pilot-dark-700/20 backdrop-blur-xl border-b border-pilot-dark-600 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-pilot-dark-100 font-sans mb-2">
                <span className="bg-gradient-to-r from-pilot-purple-400 to-pilot-blue-400 bg-clip-text text-transparent">
                  Workflow Automation
                </span>
              </h1>
              <p className="text-pilot-dark-400 text-xl font-sans">Create powerful automations with drag-and-drop workflow builder</p>
            </div>
            
            {activeTab === 'workflows' && (
              <Button onClick={handleNewWorkflow}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Workflow
              </Button>
            )}
            
            {activeTab === 'editor' && (
              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setActiveTab('workflows');
                    setCurrentWorkflow(null);
                    setNodes([]);
                  }}
                  variant="outline"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </Button>
                <Button onClick={handleSaveWorkflow}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Workflow
                </Button>
              </div>
            )}
          </div>

          <div className="flex space-x-2 bg-pilot-dark-700/30 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg p-1">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex-1 py-3 px-6 rounded-organic-md font-medium font-sans transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'workflows'
                  ? 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-md'
                  : 'text-pilot-dark-300 hover:text-pilot-dark-100 hover:bg-pilot-dark-700/30'
              }`}
            >
              My Workflows
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 py-3 px-6 rounded-organic-md font-medium font-sans transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'editor'
                  ? 'bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white shadow-organic-md'
                  : 'text-pilot-dark-300 hover:text-pilot-dark-100 hover:bg-pilot-dark-700/30'
              }`}
            >
              Workflow Editor
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {activeTab === 'workflows' ? (
          <div className="space-y-6">
            {workflows.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {workflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onEdit={handleEditWorkflow}
                    onToggle={handleToggleWorkflow}
                    onDelete={handleDeleteWorkflow}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-pilot-purple-500/20 to-pilot-blue-500/20 backdrop-blur-sm border border-pilot-dark-600 rounded-organic-lg flex items-center justify-center mx-auto mb-6 shadow-organic-md">
                  <svg className="w-10 h-10 text-pilot-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-pilot-dark-100 mb-2 font-sans">No Workflows Yet</h3>
                <p className="text-pilot-dark-400 mb-8 font-sans text-lg">Create your first automation workflow to get started</p>
                <Button onClick={handleNewWorkflow}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Workflow
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Node Palette */}
            <div className="col-span-3">
              <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl shadow-organic-sm p-4">
                <h3 className="font-bold text-pilot-dark-100 mb-6 font-sans text-lg">Node Palette</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-pilot-dark-200 mb-3 font-sans">Triggers</h4>
                    <div className="space-y-3">
                      {nodeTemplates.filter(t => t.type === 'trigger').map((template, index) => (
                        <NodeTemplate
                          key={index}
                          {...template}
                          onDragStart={setDraggedNodeTemplate}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-pilot-dark-200 mb-3 font-sans">Actions</h4>
                    <div className="space-y-3">
                      {nodeTemplates.filter(t => t.type === 'action').map((template, index) => (
                        <NodeTemplate
                          key={index}
                          {...template}
                          onDragStart={setDraggedNodeTemplate}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-pilot-dark-200 mb-3 font-sans">Conditions</h4>
                    <div className="space-y-3">
                      {nodeTemplates.filter(t => t.type === 'condition').map((template, index) => (
                        <NodeTemplate
                          key={index}
                          {...template}
                          onDragStart={setDraggedNodeTemplate}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="col-span-9">
              <div className="bg-pilot-dark-700/20 backdrop-blur-xl border border-pilot-dark-600 rounded-organic-xl shadow-organic-sm">
                <div className="p-6 border-b border-pilot-dark-600">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={currentWorkflow?.name || ''}
                        onChange={(e) => setCurrentWorkflow(prev => prev ? {...prev, name: e.target.value} : null)}
                        className="text-xl font-bold text-pilot-dark-100 bg-transparent border-none focus:outline-none focus:ring-0 p-0 font-sans placeholder-pilot-dark-400 w-full"
                        placeholder="Workflow Name"
                      />
                      <input
                        type="text"
                        value={currentWorkflow?.description || ''}
                        onChange={(e) => setCurrentWorkflow(prev => prev ? {...prev, description: e.target.value} : null)}
                        className="block text-sm text-pilot-dark-300 bg-transparent border-none focus:outline-none focus:ring-0 p-0 mt-2 font-sans placeholder-pilot-dark-500 w-full"
                        placeholder="Workflow Description"
                      />
                    </div>
                    <div className="text-sm text-pilot-dark-400 font-sans bg-pilot-dark-700/30 px-3 py-1 rounded-organic-sm border border-pilot-dark-600">
                      {nodes.length} nodes
                    </div>
                  </div>
                </div>
                
                <div
                  ref={canvasRef}
                  className="relative min-h-[600px] bg-gradient-to-br from-pilot-dark-800/50 to-pilot-dark-900/50 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1)_1px,transparent_1px)] bg-[length:20px_20px] overflow-hidden rounded-b-organic-xl"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-r from-pilot-purple-500/10 to-pilot-blue-500/10 border border-pilot-dark-600 rounded-organic-lg flex items-center justify-center mx-auto mb-6">
                          <svg className="w-10 h-10 text-pilot-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p className="text-pilot-dark-400 font-sans text-lg">Drag nodes from the palette to start building your workflow</p>
                      </div>
                    </div>
                  ) : (
                    nodes.map((node) => (
                      <WorkflowNodeComponent
                        key={node.id}
                        node={node}
                        onSelect={setSelectedNode}
                        onDelete={handleDeleteNode}
                        isSelected={selectedNode?.id === node.id}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}