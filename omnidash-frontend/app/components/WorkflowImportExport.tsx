'use client';

import React, { useState, useRef } from 'react';
import { Workflow } from '@/lib/types/workflow';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (workflow: Workflow) => void;
  onExport?: (workflow: Workflow, format: string) => void;
  currentWorkflow?: Workflow;
  mode: 'import' | 'export' | 'sync';
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodeCount: number;
  tags: string[];
}

export default function WorkflowImportExport({
  isOpen,
  onClose,
  onImport,
  onExport,
  currentWorkflow,
  mode
}: ImportExportDialogProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'n8n' | 'url'>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [n8nWorkflows, setN8nWorkflows] = useState<N8nWorkflow[]>([]);
  const [n8nConnected, setN8nConnected] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'json' | 'yaml' | 'n8n'>('json');
  const [syncMode, setSyncMode] = useState<'import' | 'export' | 'bidirectional'>('import');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importContent, setImportContent] = useState('');

  React.useEffect(() => {
    if (isOpen && (mode === 'sync' || activeTab === 'n8n')) {
      loadN8nWorkflows();
    }
  }, [isOpen, mode, activeTab]);

  const loadN8nWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workflows/import?source=n8n');
      const data = await response.json();
      
      setN8nConnected(data.connected);
      setN8nWorkflows(data.workflows || []);
      
      if (!data.connected) {
        setError('Unable to connect to n8n. Check your n8n configuration.');
      }
    } catch (err) {
      setError('Failed to load n8n workflows');
      setN8nConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      
      const content = await file.text();
      let workflowData;
      
      try {
        workflowData = JSON.parse(content);
      } catch {
        setError('Invalid JSON file');
        return;
      }

      const response = await fetch('/api/workflows/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'auto',
          data: workflowData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Workflow "${result.workflow.name}" imported successfully!`);
        onImport?.(result.workflow);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError(`Import failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(importUrl);
      const workflowData = await response.json();

      const importResponse = await fetch('/api/workflows/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'auto',
          data: workflowData
        })
      });

      const result = await importResponse.json();
      
      if (result.success) {
        setSuccess(`Workflow "${result.workflow.name}" imported successfully!`);
        onImport?.(result.workflow);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError(`Failed to import from URL: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!importContent.trim()) {
      setError('Please enter workflow content');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let workflowData;
      try {
        workflowData = JSON.parse(importContent);
      } catch {
        setError('Invalid JSON content');
        return;
      }

      const response = await fetch('/api/workflows/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'auto',
          data: workflowData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Workflow "${result.workflow.name}" imported successfully!`);
        onImport?.(result.workflow);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError(`Import failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleN8nImport = async () => {
    if (!selectedWorkflow) {
      setError('Please select a workflow to import');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workflows/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'n8n',
          data: { n8nWorkflowId: selectedWorkflow },
          syncMode: 'sync'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Workflow "${result.workflow.name}" imported from n8n!`);
        onImport?.(result.workflow);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError(`n8n import failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentWorkflow) {
      setError('No workflow to export');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workflows/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: currentWorkflow.id,
          target: exportFormat,
          syncMode: exportFormat === 'n8n' ? 'export' : undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        if (exportFormat === 'n8n' && result.synced) {
          setSuccess(`Workflow synchronized to n8n successfully!`);
        } else {
          // Download the exported file
          const blob = new Blob([JSON.stringify(result.data, null, 2)], {
            type: result.mimeType
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          setSuccess(`Workflow exported as ${result.filename}!`);
        }
        
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || 'Export failed');
      }
    } catch (err) {
      setError(`Export failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleN8nSync = async () => {
    if (!currentWorkflow) {
      setError('No workflow to sync');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workflows/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: currentWorkflow.id,
          target: 'n8n',
          syncMode: 'sync'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Workflow synchronized to n8n successfully! ID: ${result.n8nWorkflowId}`);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (err) {
      setError(`Sync failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {mode === 'import' && '📥 Import Workflow'}
              {mode === 'export' && '📤 Export Workflow'}
              {mode === 'sync' && '🔄 Sync with n8n'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {mode === 'import' && (
            <div>
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setActiveTab('file')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'file'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  📁 File
                </button>
                <button
                  onClick={() => setActiveTab('n8n')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'n8n'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  🔧 n8n
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'url'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  🌐 URL/Text
                </button>
              </div>

              {activeTab === 'file' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileImport(file);
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  >
                    {loading ? '⏳ Importing...' : '📁 Choose file to import (JSON, YAML)'}
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Supports n8n, Zapier, Make, Power Automate, and OmniDash formats
                  </p>
                </div>
              )}

              {activeTab === 'n8n' && (
                <div>
                  {n8nConnected ? (
                    <div>
                      <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center gap-2">
                        ✅ Connected to n8n
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select workflow to import:
                        </label>
                        <select
                          value={selectedWorkflow}
                          onChange={(e) => setSelectedWorkflow(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                        >
                          <option value="">Choose a workflow...</option>
                          {n8nWorkflows.map((workflow) => (
                            <option key={workflow.id} value={workflow.id}>
                              {workflow.name} ({workflow.nodeCount} nodes) {workflow.active ? '✅' : '⏸️'}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleN8nImport}
                          disabled={!selectedWorkflow || loading}
                          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-md"
                        >
                          {loading ? '⏳ Importing...' : '📥 Import from n8n'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        ❌ Unable to connect to n8n
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Make sure n8n is running and API access is configured.
                      </p>
                      <button
                        onClick={loadN8nWorkflows}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                      >
                        🔄 Retry Connection
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Import from URL:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://example.com/workflow.json"
                        className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                      />
                      <button
                        onClick={handleUrlImport}
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md"
                      >
                        {loading ? '⏳' : '📥'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Or paste workflow content:
                    </label>
                    <textarea
                      value={importContent}
                      onChange={(e) => setImportContent(e.target.value)}
                      placeholder="Paste JSON or YAML workflow content here..."
                      rows={8}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 font-mono text-sm"
                    />
                    <button
                      onClick={handleTextImport}
                      disabled={loading}
                      className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-md"
                    >
                      {loading ? '⏳ Importing...' : '📥 Import from Text'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'export' && currentWorkflow && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Format:
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value="json">📄 OmniDash JSON</option>
                  <option value="yaml">📝 OmniDash YAML</option>
                  <option value="n8n">🔧 n8n Format</option>
                </select>
              </div>
              
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Workflow Info:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Name:</strong> {currentWorkflow.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Nodes:</strong> {currentWorkflow.definition?.nodes?.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Edges:</strong> {currentWorkflow.definition?.edges?.length || 0}
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-md"
              >
                {loading ? '⏳ Exporting...' : `📤 Export as ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          )}

          {mode === 'sync' && currentWorkflow && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-md">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">🔄 n8n Synchronization</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This will sync your workflow with n8n, creating or updating it there.
                </p>
              </div>

              {n8nConnected ? (
                <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center gap-2">
                  ✅ Connected to n8n
                </div>
              ) : (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
                  ❌ Not connected to n8n
                </div>
              )}

              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Workflow to Sync:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Name:</strong> {currentWorkflow.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Nodes:</strong> {currentWorkflow.definition?.nodes?.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Status:</strong> {currentWorkflow.status}
                </p>
              </div>

              <button
                onClick={handleN8nSync}
                disabled={loading || !n8nConnected}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white p-3 rounded-md"
              >
                {loading ? '⏳ Syncing...' : '🔄 Sync to n8n'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}