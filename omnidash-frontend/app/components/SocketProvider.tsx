'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  latency: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  subscribeToWorkflow: (workflowId: string) => void;
  unsubscribeFromWorkflow: (workflowId: string) => void;
  subscribeToExecution: (executionId: string) => void;
  testWorkflow: (workflowId: string, data?: any) => void;
  sendWorkflowAction: (action: string, workflowId: string, payload?: any) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  latency: 0,
  connectionStatus: 'disconnected',
  subscribeToWorkflow: () => {},
  unsubscribeFromWorkflow: () => {},
  subscribeToExecution: () => {},
  testWorkflow: () => {},
  sendWorkflowAction: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
  on: () => {},
  off: () => {},
  emit: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  // Connection logic
  const connect = useCallback(() => {
    if (!session?.userId) return;
    
    if (socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    setConnectionStatus('connecting');
    console.log('🔌 Connecting to Socket.IO server...');

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: {
        token: `user:${session.userId}`
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectDelay
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setIsConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from server: ${reason}`);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      setConnectionStatus('error');
      setIsConnected(false);
      
      if (reconnectAttempts < maxReconnectAttempts) {
        setReconnectAttempts(prev => prev + 1);
        setTimeout(() => {
          console.log(`🔄 Reconnecting... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          newSocket.connect();
        }, reconnectDelay * Math.pow(2, reconnectAttempts));
      }
    });

    newSocket.on('auth_error', (error) => {
      console.error('🔐 Authentication error:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('🎉 Successfully authenticated:', data);
      setConnectionStatus('connected');
      setIsConnected(true);
    });

    // Latency monitoring
    newSocket.on('pong', (data) => {
      const currentLatency = Date.now() - data.timestamp;
      setLatency(currentLatency);
    });

    // Ping every 30 seconds to monitor latency
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000);

    // Cleanup function for ping interval
    newSocket.on('disconnect', () => {
      clearInterval(pingInterval);
    });

    setSocket(newSocket);

    return () => {
      clearInterval(pingInterval);
      newSocket.close();
    };
  }, [session?.userId, reconnectAttempts, socket?.connected]);

  // Auto-connect when session is available
  useEffect(() => {
    if (session?.userId && !socket) {
      connect();
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [session?.userId, connect, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    };
  }, [socket]);

  // Socket methods
  const subscribeToWorkflow = useCallback((workflowId: string) => {
    socket?.emit('subscribe_workflow', workflowId);
  }, [socket]);

  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    socket?.emit('unsubscribe_workflow', workflowId);
  }, [socket]);

  const subscribeToExecution = useCallback((executionId: string) => {
    socket?.emit('subscribe_execution', executionId);
  }, [socket]);

  const testWorkflow = useCallback((workflowId: string, data?: any) => {
    socket?.emit('test_workflow', { workflowId, ...data });
  }, [socket]);

  const sendWorkflowAction = useCallback((action: string, workflowId: string, payload?: any) => {
    socket?.emit('workflow_action', { action, workflowId, payload });
  }, [socket]);

  const joinRoom = useCallback((roomId: string) => {
    socket?.emit('join_room', roomId);
  }, [socket]);

  const leaveRoom = useCallback((roomId: string) => {
    socket?.emit('leave_room', roomId);
  }, [socket]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socket?.on(event, handler);
  }, [socket]);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socket?.off(event, handler);
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    socket?.emit(event, data);
  }, [socket]);

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    latency,
    connectionStatus,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    subscribeToExecution,
    testWorkflow,
    sendWorkflowAction,
    joinRoom,
    leaveRoom,
    on,
    off,
    emit,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
      
      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
          connectionStatus === 'connected' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            : connectionStatus === 'error'
            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-green-500 animate-pulse' 
                : connectionStatus === 'connecting'
                ? 'bg-yellow-500 animate-spin'
                : connectionStatus === 'error'
                ? 'bg-red-500'
                : 'bg-gray-400'
            }`}></div>
            <span>
              {connectionStatus === 'connected' && `Connected ${latency > 0 ? `(${latency}ms)` : ''}`}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'error' && 'Connection Error'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </SocketContext.Provider>
  );
}

// Hook for real-time workflow updates
export function useWorkflowUpdates(workflowId?: string) {
  const { subscribeToWorkflow, unsubscribeFromWorkflow, on, off } = useSocket();
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!workflowId) return;

    const handleUpdate = (data: any) => {
      setUpdates(prev => [...prev, data]);
    };

    const handleStarted = (data: any) => {
      setUpdates(prev => [...prev, { type: 'started', ...data }]);
    };

    const handleCompleted = (data: any) => {
      setUpdates(prev => [...prev, { type: 'completed', ...data }]);
    };

    const handleFailed = (data: any) => {
      setUpdates(prev => [...prev, { type: 'failed', ...data }]);
    };

    const handleTestResult = (data: any) => {
      setUpdates(prev => [...prev, { type: 'test_result', ...data }]);
    };

    // Subscribe to workflow events
    subscribeToWorkflow(workflowId);
    on('workflow_update', handleUpdate);
    on('workflow_started', handleStarted);
    on('workflow_completed', handleCompleted);
    on('workflow_failed', handleFailed);
    on('workflow_test_result', handleTestResult);

    return () => {
      unsubscribeFromWorkflow(workflowId);
      off('workflow_update', handleUpdate);
      off('workflow_started', handleStarted);
      off('workflow_completed', handleCompleted);
      off('workflow_failed', handleFailed);
      off('workflow_test_result', handleTestResult);
    };
  }, [workflowId, subscribeToWorkflow, unsubscribeFromWorkflow, on, off]);

  return updates;
}

// Hook for real-time execution updates
export function useExecutionUpdates(executionId?: string) {
  const { subscribeToExecution, on, off } = useSocket();
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (!executionId) return;

    const handleProgress = (data: any) => {
      setProgress(data.progress || 0);
      setStatus(data.status || 'running');
    };

    const handleLog = (data: any) => {
      setLogs(prev => [...prev, data]);
    };

    subscribeToExecution(executionId);
    on('execution_progress', handleProgress);
    on('execution_log', handleLog);

    return () => {
      off('execution_progress', handleProgress);
      off('execution_log', handleLog);
    };
  }, [executionId, subscribeToExecution, on, off]);

  return { progress, logs, status };
}