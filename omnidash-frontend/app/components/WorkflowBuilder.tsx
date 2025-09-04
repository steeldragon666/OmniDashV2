'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'webhook';
  title: string;
  description: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;
  targetNodeId: string;
  targetHandle: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

interface NodeTemplate {
  type: string;
  category: 'trigger' | 'action' | 'condition' | 'utility';
  title: string;
  description: string;
  icon: string;
  color: string;
  defaultData: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

const nodeTemplates: NodeTemplate[] = [
  {
    type: 'time_trigger',
    category: 'trigger',
    title: 'Schedule Trigger',
    description: 'Trigger workflow at scheduled times',
    icon: '⏰',
    color: 'bg-green-500',
    defaultData: { cron: '0 9 * * *', timezone: 'UTC' },
    inputs: [],
    outputs: ['trigger']
  },
  {
    type: 'webhook_trigger',
    category: 'trigger',
    title: 'Webhook Trigger',
    description: 'Trigger workflow via HTTP webhook',
    icon: '🔗',
    color: 'bg-green-500',
    defaultData: { method: 'POST', path: '/webhook' },
    inputs: [],
    outputs: ['trigger']
  },
  {
    type: 'social_post',
    category: 'action',
    title: 'Social Media Post',
    description: 'Post to social media platforms',
    icon: '📱',
    color: 'bg-blue-500',
    defaultData: { platforms: ['twitter'], content: '' },
    inputs: ['input'],
    outputs: ['success', 'error']
  },
  {
    type: 'send_email',
    category: 'action',
    title: 'Send Email',
    description: 'Send email notifications',
    icon: '📧',
    color: 'bg-blue-500',
    defaultData: { to: '', subject: '', body: '' },
    inputs: ['input'],
    outputs: ['success', 'error']
  },
  {
    type: 'condition',
    category: 'condition',
    title: 'Condition',
    description: 'Branch workflow based on conditions',
    icon: '🔀',
    color: 'bg-yellow-500',
    defaultData: { operator: 'equals', field: '', value: '' },
    inputs: ['input'],
    outputs: ['true', 'false']
  },
  {
    type: 'delay',
    category: 'utility',
    title: 'Delay',
    description: 'Wait for specified time',
    icon: '⏳',
    color: 'bg-gray-500',
    defaultData: { duration: 5000, unit: 'ms' },
    inputs: ['input'],
    outputs: ['output']
  }
];

export default function WorkflowBuilder({ 
  workflow, 
  onSave 
}: { 
  workflow?: Workflow; 
  onSave: (workflow: Workflow) => void; 
}) {
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow>(
    workflow || {
      id: '',
      name: 'New Workflow',
      description: '',
      nodes: [],
      connections: []
    }
  );

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{
    nodeId: string;
    handle: string;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  // const [draggedTemplate, setDraggedTemplate] = useState<NodeTemplate | null>(null);

  const handleNodeTemplateClick = useCallback((template: NodeTemplate, event: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: template.type,
      title: template.title,
      description: template.description,
      position: {
        x: ((event.clientX - canvasRect.left) / scale - canvasOffset.x),
        y: ((event.clientY - canvasRect.top) / scale - canvasOffset.y)
      },
      data: { ...template.defaultData },
      inputs: template.inputs,
      outputs: template.outputs
    };

    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  }, [scale, canvasOffset]);

  const handleNodeSelect = (node: WorkflowNode) => {
    setSelectedNode(node);
  };

  const handleNodeUpdate = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  };

  const handleNodeDelete = (nodeId: string) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(
        conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      )
    }));
    setSelectedNode(null);
  };

  const startConnection = (nodeId: string, handle: string) => {
    setIsConnecting(true);
    setConnectionStart({ nodeId, handle });
  };

  const completeConnection = (targetNodeId: string, targetHandle: string) => {
    if (!connectionStart) return;

    const newConnection: WorkflowConnection = {
      id: `conn_${Date.now()}`,
      sourceNodeId: connectionStart.nodeId,
      sourceHandle: connectionStart.handle,
      targetNodeId,
      targetHandle
    };

    setCurrentWorkflow(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection]
    }));

    setIsConnecting(false);
    setConnectionStart(null);
  };

  const handleSave = () => {
    onSave(currentWorkflow);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.metaKey)) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setCanvasOffset(prev => ({
        x: prev.x + deltaX / scale,
        y: prev.y + deltaY / scale
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.1, scale + delta), 3);
    setScale(newScale);
  };

  return (
    <div className="h-screen flex bg-pilot-dark-900">
      {/* Node Palette */}
      <div className="w-80 bg-pilot-dark-800 border-r border-pilot-dark-700 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-pilot-dark-100 mb-4">Node Palette</h3>
          
          <div className="space-y-2">
            {nodeTemplates.map((template) => (
              <div
                key={template.type}
                onClick={(e) => handleNodeTemplateClick(template, e)}
                className="p-3 rounded-lg border border-pilot-dark-600 bg-pilot-dark-700/50 hover:bg-pilot-dark-600/50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${template.color} flex items-center justify-center text-white text-lg`}>
                    {template.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-pilot-dark-100 text-sm">{template.title}</h4>
                    <p className="text-xs text-pilot-dark-400 mt-1">{template.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Canvas Header */}
        <div className="bg-pilot-dark-800 border-b border-pilot-dark-700 p-4 flex items-center justify-between">
          <div>
            <input
              type="text"
              value={currentWorkflow.name}
              onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, name: e.target.value }))}
              className="text-xl font-semibold bg-transparent text-pilot-dark-100 border-none outline-none"
            />
            <p className="text-sm text-pilot-dark-400">Design your automation workflow</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-pilot-dark-400">
              Scale: {Math.round(scale * 100)}%
            </div>
            <button
              onClick={() => setScale(1)}
              className="px-3 py-1 text-xs bg-pilot-dark-700 hover:bg-pilot-dark-600 text-pilot-dark-200 rounded-md transition-colors"
            >
              Reset View
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-pilot-purple-500 to-pilot-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Save Workflow
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative w-full h-full bg-pilot-dark-900 overflow-hidden cursor-move"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${scale}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: '0 0'
            }}
          >
            {/* Grid Background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />

            {/* Render Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {currentWorkflow.connections.map(connection => {
                const sourceNode = currentWorkflow.nodes.find(n => n.id === connection.sourceNodeId);
                const targetNode = currentWorkflow.nodes.find(n => n.id === connection.targetNodeId);
                
                if (!sourceNode || !targetNode) return null;

                const sourceX = sourceNode.position.x + 150;
                const sourceY = sourceNode.position.y + 50;
                const targetX = targetNode.position.x;
                const targetY = targetNode.position.y + 50;

                return (
                  <path
                    key={connection.id}
                    d={`M${sourceX},${sourceY} C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`}
                    stroke="rgba(139, 92, 246, 0.6)"
                    strokeWidth="2"
                    fill="none"
                    className="drop-shadow-sm"
                  />
                );
              })}
            </svg>

            {/* Render Nodes */}
            {currentWorkflow.nodes.map(node => (
              <WorkflowNodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                isConnecting={isConnecting}
                onSelect={() => handleNodeSelect(node)}
                onUpdate={(updates) => handleNodeUpdate(node.id, updates)}
                onDelete={() => handleNodeDelete(node.id)}
                onStartConnection={(handle) => startConnection(node.id, handle)}
                onCompleteConnection={(handle) => completeConnection(node.id, handle)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-80 bg-pilot-dark-800 border-l border-pilot-dark-700 p-4 overflow-y-auto">
          <NodePropertiesPanel
            node={selectedNode}
            onUpdate={(updates) => handleNodeUpdate(selectedNode.id, updates)}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}

// Workflow Node Component
function WorkflowNodeComponent({
  node,
  isSelected,
  isConnecting,
  onSelect,
  onUpdate,
  onDelete,
  onStartConnection,
  onCompleteConnection
}: {
  node: WorkflowNode;
  isSelected: boolean;
  isConnecting: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
  onDelete: () => void;
  onStartConnection: (handle: string) => void;
  onCompleteConnection: (handle: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const template = nodeTemplates.find(t => t.type === node.type);
  if (!template) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
      });
      onSelect();
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      onUpdate({
        position: {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        }
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, onUpdate]);

  return (
    <div
      className={`
        absolute w-64 bg-pilot-dark-700 rounded-lg border-2 shadow-lg cursor-pointer
        ${isSelected ? 'border-pilot-purple-500' : 'border-pilot-dark-600'}
        hover:shadow-xl transition-all duration-200
      `}
      style={{
        left: node.position.x,
        top: node.position.y
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Node Header */}
      <div className={`px-4 py-3 ${template.color} rounded-t-lg text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{template.icon}</span>
            <span className="font-medium text-sm">{node.title}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-white/70 hover:text-white text-sm"
          >
            ×
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3">
        <p className="text-xs text-pilot-dark-300 mb-3">{node.description}</p>
        
        {/* Input Handles */}
        {node.inputs.length > 0 && (
          <div className="mb-3">
            {node.inputs.map(input => (
              <div
                key={input}
                className="relative -ml-6 mb-2 flex items-center cursor-pointer"
                onClick={() => isConnecting && onCompleteConnection(input)}
              >
                <div className="w-4 h-4 bg-pilot-blue-500 rounded-full border-2 border-pilot-dark-700" />
                <span className="ml-2 text-xs text-pilot-dark-400">{input}</span>
              </div>
            ))}
          </div>
        )}

        {/* Output Handles */}
        {node.outputs.length > 0 && (
          <div className="text-right">
            {node.outputs.map(output => (
              <div
                key={output}
                className="relative -mr-6 mb-2 flex items-center justify-end cursor-pointer"
                onClick={() => !isConnecting && onStartConnection(output)}
              >
                <span className="mr-2 text-xs text-pilot-dark-400">{output}</span>
                <div className="w-4 h-4 bg-pilot-green-500 rounded-full border-2 border-pilot-dark-700" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Node Properties Panel
function NodePropertiesPanel({
  node,
  onUpdate,
  onClose
}: {
  node: WorkflowNode;
  onUpdate: (updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-pilot-dark-100">Node Properties</h3>
        <button
          onClick={onClose}
          className="text-pilot-dark-400 hover:text-pilot-dark-200"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-pilot-dark-200 mb-2">
            Title
          </label>
          <input
            type="text"
            value={node.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full px-3 py-2 bg-pilot-dark-700 border border-pilot-dark-600 rounded-lg text-pilot-dark-100 focus:border-pilot-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-pilot-dark-200 mb-2">
            Description
          </label>
          <textarea
            value={node.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-pilot-dark-700 border border-pilot-dark-600 rounded-lg text-pilot-dark-100 focus:border-pilot-purple-500 focus:outline-none"
          />
        </div>

        {/* Node-specific configuration */}
        {node.type === 'social_post' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-pilot-dark-200 mb-2">
                Content
              </label>
              <textarea
                value={node.data.content || ''}
                onChange={(e) => onUpdate({ 
                  data: { ...node.data, content: e.target.value }
                })}
                rows={4}
                placeholder="Enter your post content..."
                className="w-full px-3 py-2 bg-pilot-dark-700 border border-pilot-dark-600 rounded-lg text-pilot-dark-100 focus:border-pilot-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-pilot-dark-200 mb-2">
                Platforms
              </label>
              <div className="space-y-2">
                {['twitter', 'facebook', 'instagram', 'linkedin'].map(platform => (
                  <label key={platform} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={node.data.platforms?.includes(platform)}
                      onChange={(e) => {
                        const platforms = node.data.platforms || [];
                        const updated = e.target.checked
                          ? [...platforms, platform]
                          : platforms.filter((p: string) => p !== platform);
                        onUpdate({
                          data: { ...node.data, platforms: updated }
                        });
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-pilot-dark-200 capitalize">{platform}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {node.type === 'time_trigger' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-pilot-dark-200 mb-2">
                Schedule (Cron Expression)
              </label>
              <input
                type="text"
                value={node.data.cron || ''}
                onChange={(e) => onUpdate({ 
                  data: { ...node.data, cron: e.target.value }
                })}
                placeholder="0 9 * * * (Daily at 9 AM)"
                className="w-full px-3 py-2 bg-pilot-dark-700 border border-pilot-dark-600 rounded-lg text-pilot-dark-100 focus:border-pilot-purple-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}