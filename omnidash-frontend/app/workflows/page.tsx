'use client';

import React, { useState, useCallback, useRef } from 'react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  service: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  data: any;
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
    primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white shadow-sm hover:bg-gray-700 focus:ring-gray-500',
    outline: 'bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 focus:ring-blue-500'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]} ${sizes[size]}
        font-medium rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
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
      case 'trigger': return 'bg-green-100 border-green-300 text-green-800';
      case 'action': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'condition': return 'bg-orange-100 border-orange-300 text-orange-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: string } = {
      'instagram': '📷',
      'twitter': '🐦',
      'linkedin': '💼',
      'facebook': '👥',
      'gmail': '📧',
      'drive': '💾',
      'openai': '🤖',
      'webhook': '🔗',
      'schedule': '⏰',
      'filter': '🔍',
      'delay': '⏱️',
      'email': '📨'
    };
    return icons[service] || '⚙️';
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
        p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing
        hover:shadow-md transition-all duration-200
        min-w-[200px] max-w-[200px]
      `}
    >
      <div className="flex items-center space-x-3 mb-2">
        <span className="text-2xl">{getServiceIcon(service)}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{name}</h4>
          <span className="text-xs opacity-75 capitalize">{type}</span>
        </div>
      </div>
      <p className="text-xs opacity-75">{description}</p>
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
      case 'trigger': return 'bg-green-50 border-green-300 text-green-800';
      case 'action': return 'bg-blue-50 border-blue-300 text-blue-800';
      case 'condition': return 'bg-orange-50 border-orange-300 text-orange-800';
      default: return 'bg-gray-50 border-gray-300 text-gray-800';
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: string } = {
      'instagram': '📷',
      'twitter': '🐦',
      'linkedin': '💼',
      'facebook': '👥',
      'gmail': '📧',
      'drive': '💾',
      'openai': '🤖',
      'webhook': '🔗',
      'schedule': '⏰',
      'filter': '🔍',
      'delay': '⏱️',
      'email': '📨'
    };
    return icons[service] || '⚙️';
  };

  return (
    <div
      onClick={() => onSelect(node)}
      className={`
        ${getNodeColor(node.type)}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        p-4 rounded-xl border-2 cursor-pointer
        hover:shadow-md transition-all duration-200
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
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
      >
        ×
      </button>
      
      <div className="flex items-center space-x-3 mb-2">
        <span className="text-xl">{getServiceIcon(node.service)}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{node.name}</h4>
          <span className="text-xs opacity-75 capitalize">{node.type}</span>
        </div>
      </div>
      <p className="text-xs opacity-75 line-clamp-2">{node.description}</p>
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
  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{workflow.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
        
        <div className="flex items-center space-x-4 text-sm text-gray-500">
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
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {workflow.isActive ? 'Active' : 'Inactive'}
        </div>
      </div>
    </div>
    
    <div className="flex items-center justify-between">
      <div className="flex space-x-2">
        <Button
          onClick={() => onEdit(workflow)}
          variant="outline"
          size="sm"
        >
          Edit
        </Button>
        <Button
          onClick={() => onToggle(workflow.id)}
          variant={workflow.isActive ? 'secondary' : 'primary'}
          size="sm"
        >
          {workflow.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
      
      <button
        onClick={() => onDelete(workflow.id)}
        className="text-red-600 hover:text-red-700 p-2"
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Workflow Automation</h1>
              <p className="text-gray-600">Create powerful automations with drag-and-drop workflow builder</p>
            </div>
            
            {activeTab === 'workflows' && (
              <Button onClick={handleNewWorkflow}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  Cancel
                </Button>
                <Button onClick={handleSaveWorkflow}>
                  Save Workflow
                </Button>
              </div>
            )}
          </div>

          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'workflows'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Workflows
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'editor'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Workflow Editor
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
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
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflows Yet</h3>
                <p className="text-gray-500 mb-6">Create your first automation workflow to get started</p>
                <Button onClick={handleNewWorkflow}>
                  Create Workflow
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Node Palette */}
            <div className="col-span-3">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Node Palette</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Triggers</h4>
                    <div className="space-y-2">
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Actions</h4>
                    <div className="space-y-2">
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Conditions</h4>
                    <div className="space-y-2">
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <input
                        type="text"
                        value={currentWorkflow?.name || ''}
                        onChange={(e) => setCurrentWorkflow(prev => prev ? {...prev, name: e.target.value} : null)}
                        className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                        placeholder="Workflow Name"
                      />
                      <input
                        type="text"
                        value={currentWorkflow?.description || ''}
                        onChange={(e) => setCurrentWorkflow(prev => prev ? {...prev, description: e.target.value} : null)}
                        className="block text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 p-0 mt-1"
                        placeholder="Workflow Description"
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      {nodes.length} nodes
                    </div>
                  </div>
                </div>
                
                <div
                  ref={canvasRef}
                  className="relative min-h-[600px] bg-gray-50 bg-[radial-gradient(circle_at_center,#e5e7eb_1px,transparent_1px)] bg-[length:20px_20px] overflow-hidden"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p className="text-gray-500">Drag nodes from the palette to start building your workflow</p>
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