'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

import { NodeTemplate, WorkflowNode, WorkflowEdge, Workflow } from '@/lib/types/workflow';
import { useSocket } from './SocketProvider';

// Node templates for the palette
const nodeTemplates: NodeTemplate[] = [
  // Triggers
  {
    type: 'webhook-trigger',
    category: 'trigger',
    label: 'Webhook',
    description: 'Trigger workflow via HTTP webhook',
    icon: '🔗',
    color: '#10b981',
    defaultData: {
      label: 'Webhook Trigger',
      config: {
        method: 'POST',
        path: '/webhook',
        headers: {},
        authentication: { type: 'none' }
      }
    },
    inputs: [],
    outputs: [{ id: 'trigger', label: 'Trigger', type: 'trigger', required: false }]
  },
  {
    type: 'schedule-trigger',
    category: 'trigger', 
    label: 'Schedule',
    description: 'Trigger workflow on a schedule',
    icon: '⏰',
    color: '#10b981',
    defaultData: {
      label: 'Schedule Trigger',
      config: {
        cron: '0 9 * * *',
        timezone: 'UTC'
      }
    },
    inputs: [],
    outputs: [{ id: 'trigger', label: 'Trigger', type: 'trigger', required: false }]
  },
  {
    type: 'manual-trigger',
    category: 'trigger',
    label: 'Manual',
    description: 'Manually trigger workflow',
    icon: '▶️',
    color: '#10b981',
    defaultData: {
      label: 'Manual Trigger',
      config: {}
    },
    inputs: [],
    outputs: [{ id: 'trigger', label: 'Trigger', type: 'trigger', required: false }]
  },

  // Actions
  {
    type: 'http-action',
    category: 'action',
    label: 'HTTP Request',
    description: 'Make HTTP requests to APIs',
    icon: '🌐',
    color: '#3b82f6',
    defaultData: {
      label: 'HTTP Request',
      config: {
        method: 'GET',
        url: 'https://api.example.com',
        headers: {},
        body: ''
      }
    },
    inputs: [{ id: 'input', label: 'Input', type: 'data', required: false }],
    outputs: [
      { id: 'success', label: 'Success', type: 'success', required: false },
      { id: 'error', label: 'Error', type: 'error', required: false }
    ]
  },
  {
    type: 'social-action',
    category: 'action',
    label: 'Social Post',
    description: 'Post to social media platforms',
    icon: '📱',
    color: '#3b82f6',
    defaultData: {
      label: 'Social Media Post',
      config: {
        platforms: ['twitter'],
        content: '',
        hashtags: [],
        mentions: []
      }
    },
    inputs: [{ id: 'input', label: 'Input', type: 'data', required: false }],
    outputs: [
      { id: 'success', label: 'Success', type: 'success', required: false },
      { id: 'error', label: 'Error', type: 'error', required: false }
    ]
  },
  {
    type: 'email-action',
    category: 'action',
    label: 'Send Email',
    description: 'Send email notifications',
    icon: '📧',
    color: '#3b82f6',
    defaultData: {
      label: 'Send Email',
      config: {
        to: '',
        subject: '',
        body: '',
        template: 'default'
      }
    },
    inputs: [{ id: 'input', label: 'Input', type: 'data', required: false }],
    outputs: [
      { id: 'success', label: 'Success', type: 'success', required: false },
      { id: 'error', label: 'Error', type: 'error', required: false }
    ]
  },

  // Conditions
  {
    type: 'condition',
    category: 'condition',
    label: 'If/Else',
    description: 'Branch workflow based on conditions',
    icon: '🔀',
    color: '#f59e0b',
    defaultData: {
      label: 'Condition',
      config: {
        operator: 'equals',
        field: '',
        value: ''
      }
    },
    inputs: [{ id: 'input', label: 'Input', type: 'data', required: true }],
    outputs: [
      { id: 'true', label: 'True', type: 'condition', required: false },
      { id: 'false', label: 'False', type: 'condition', required: false }
    ]
  },

  // Utilities
  {
    type: 'delay',
    category: 'utility',
    label: 'Delay',
    description: 'Add delay between actions',
    icon: '⏱️',
    color: '#8b5cf6',
    defaultData: {
      label: 'Delay',
      config: {
        duration: 1000,
        unit: 'ms'
      }
    },
    inputs: [{ id: 'input', label: 'Input', type: 'data', required: false }],
    outputs: [{ id: 'output', label: 'Output', type: 'data', required: false }]
  },
  {
    type: 'javascript-action',
    category: 'utility',
    label: 'JavaScript',
    description: 'Execute JavaScript code',
    icon: '⚡',
    color: '#8b5cf6',
    defaultData: {
      label: 'JavaScript',
      config: {
        code: 'return { result: "Hello World" };'
      }
    },
    inputs: [{ id: 'input', label: 'Input', type: 'data', required: false }],
    outputs: [{ id: 'output', label: 'Output', type: 'data', required: false }]
  }
];

// Custom node component
function CustomNode({ data, selected }: { data: any; selected: boolean }) {
  const template = nodeTemplates.find(t => t.type === data.nodeType);
  
  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[150px] ${
        selected ? 'border-blue-500' : 'border-gray-300'
      }`}
      style={{
        backgroundColor: template?.color || '#f3f4f6',
        color: 'white'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{template?.icon || '⚙️'}</span>
        <div className="font-bold text-sm">{data.label}</div>
      </div>
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="text-xs mt-1 opacity-80">
          Configured
        </div>
      )}
    </div>
  );
}

// Node types
const nodeTypes = {
  custom: CustomNode,
};

// Sidebar with node palette
function NodePalette({ onDragStart }: { onDragStart: (event: React.DragEvent, nodeType: NodeTemplate) => void }) {
  const categories = ['trigger', 'action', 'condition', 'utility'] as const;
  
  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Node Palette</h3>
      
      {categories.map(category => (
        <div key={category} className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
            {category}s
          </h4>
          <div className="space-y-2">
            {nodeTemplates
              .filter(template => template.category === category)
              .map(template => (
                <div
                  key={template.type}
                  draggable
                  onDragStart={(event) => onDragStart(event, template)}
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-move hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{template.icon}</span>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {template.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main workflow builder component
function WorkflowBuilderInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<NodeTemplate | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { isConnected, testWorkflow } = useSocket();
  const reactFlowInstance = useReactFlow();

  // Handle node drag from palette
  const onDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    setDraggedTemplate(template);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drop onto canvas
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    if (!draggedTemplate) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode: Node = {
      id: `${draggedTemplate.type}-${Date.now()}`,
      type: 'custom',
      position,
      data: {
        ...draggedTemplate.defaultData,
        nodeType: draggedTemplate.type,
        template: draggedTemplate
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };

    setNodes((nds) => nds.concat(newNode));
    setDraggedTemplate(null);
  }, [draggedTemplate, reactFlowInstance, setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle connection creation
  const onConnect = useCallback((params: Connection) => {
    const edge: Edge = {
      ...params,
      id: `edge-${params.source}-${params.target}`,
      type: 'default',
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    };
    
    setEdges((eds) => addEdge(edge, eds));
  }, [setEdges]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Validate workflow
  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];
    
    // Check for triggers
    const triggerNodes = nodes.filter(node => 
      nodeTemplates.find(t => t.type === node.data.nodeType)?.category === 'trigger'
    );
    
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger');
    }

    // Check for orphaned nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const orphanedNodes = nodes.filter(node => 
      !connectedNodeIds.has(node.id) && 
      nodeTemplates.find(t => t.type === node.data.nodeType)?.category !== 'trigger'
    );

    if (orphanedNodes.length > 0) {
      errors.push(`${orphanedNodes.length} node(s) are not connected`);
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
    
    return errors.length === 0;
  }, [nodes, edges]);

  // Test workflow
  const handleTestWorkflow = useCallback(() => {
    if (!validateWorkflow()) {
      return;
    }

    const workflowData = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.nodeType,
        position: node.position,
        data: node.data
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }))
    };

    testWorkflow('test-workflow', { definition: workflowData });
  }, [nodes, edges, validateWorkflow, testWorkflow]);

  // Save workflow
  const handleSaveWorkflow = useCallback(async () => {
    if (!validateWorkflow()) {
      return;
    }

    const workflow: Partial<Workflow> = {
      name: 'My Workflow',
      description: 'Created with visual builder',
      definition: {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.data.nodeType,
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        })),
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      triggers: nodes
        .filter(node => nodeTemplates.find(t => t.type === node.data.nodeType)?.category === 'trigger')
        .map(node => node.id),
      variables: {},
      settings: {
        errorHandling: 'stop',
        timeout: 300000,
        retryOnFailure: false,
        maxRetries: 3
      },
      tags: ['visual-builder'],
      status: 'draft'
    };

    try {
      const response = await fetch('/api/automation/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });

      if (response.ok) {
        alert('Workflow saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save workflow: ${error.message}`);
      }
    } catch (error) {
      alert(`Error saving workflow: ${error}`);
    }
  }, [nodes, edges, validateWorkflow]);

  // Validate on changes
  useEffect(() => {
    validateWorkflow();
  }, [nodes, edges, validateWorkflow]);

  return (
    <div className="flex h-full">
      <NodePalette onDragStart={onDragStart} />
      
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
          
          {/* Top toolbar */}
          <Panel position="top-left">
            <div className="flex gap-2">
              <button
                onClick={handleTestWorkflow}
                disabled={!isValid || !isConnected}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-md text-sm"
              >
                🧪 Test
              </button>
              <button
                onClick={handleSaveWorkflow}
                disabled={!isValid}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-md text-sm"
              >
                💾 Save
              </button>
            </div>
          </Panel>

          {/* Validation status */}
          <Panel position="top-right">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {isValid ? 'Valid' : `${validationErrors.length} Error(s)`}
              </span>
            </div>
          </Panel>

          {/* Connection status */}
          <Panel position="bottom-right">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </Panel>
        </ReactFlow>

        {/* Property panel for selected node */}
        {selectedNode && (
          <div className="absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Node Properties
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, label: e.target.value } }
                          : node
                      )
                    );
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Configuration
                </label>
                <textarea
                  value={JSON.stringify(selectedNode.data.config || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === selectedNode.id
                            ? { ...node, data: { ...node.data, config } }
                            : node
                        )
                      );
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={8}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 font-mono text-sm"
                />
              </div>

              <button
                onClick={() => {
                  setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
                  setEdges((eds) => eds.filter((edge) => 
                    edge.source !== selectedNode.id && edge.target !== selectedNode.id
                  ));
                  setSelectedNode(null);
                }}
                className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
              >
                🗑️ Delete Node
              </button>
            </div>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded max-w-md">
            <h4 className="font-bold">Validation Errors:</h4>
            <ul className="mt-2 list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReactFlowWorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <div className="h-screen">
        <WorkflowBuilderInner />
      </div>
    </ReactFlowProvider>
  );
}