/**
 * Intelligent Load Balancer for Maximum Parallel Computing
 * Implements advanced load balancing strategies and auto-scaling
 */

import { EventEmitter } from 'events';

export interface LoadBalancingStrategy {
  name: string;
  description: string;
  algorithm: (nodes: ComputeNode[], job: Job) => ComputeNode | null;
}

export interface ComputeNode {
  id: string;
  name: string;
  cpuCores: number;
  memory: number;
  gpuCount: number;
  gpuType: string;
  networkBandwidth: number;
  currentLoad: number;
  queueLength: number;
  responseTime: number;
  costPerHour: number;
  region: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  lastHealthCheck: Date;
  metrics: NodeMetrics;
}

export interface Job {
  id: string;
  name: string;
  type: 'training' | 'inference' | 'data-processing' | 'model-optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  resourceRequirements: {
    cpuCores: number;
    memory: number;
    gpuCount: number;
    gpuType?: string;
    networkBandwidth?: number;
  };
  estimatedDuration: number;
  deadline?: Date;
  costBudget?: number;
  constraints: {
    preferredRegions?: string[];
    preferredProviders?: string[];
    maxLatency?: number;
    dataLocality?: boolean;
  };
}

export interface NodeMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  gpuUtilization: number;
  networkUtilization: number;
  diskUtilization: number;
  temperature: number;
  powerConsumption: number;
  errorRate: number;
  throughput: number;
  latency: number;
}

export interface LoadBalancerConfig {
  strategy: string;
  healthCheckInterval: number;
  autoScalingEnabled: boolean;
  scalingThreshold: number;
  maxNodes: number;
  minNodes: number;
  costOptimization: boolean;
  latencyOptimization: boolean;
  dataLocalityWeight: number;
  performanceWeight: number;
  costWeight: number;
}

export class IntelligentLoadBalancer extends EventEmitter {
  private nodes: Map<string, ComputeNode> = new Map();
  private strategies: Map<string, LoadBalancingStrategy> = new Map();
  private config: LoadBalancerConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private autoScalingInterval: NodeJS.Timeout | null = null;
  private jobQueue: Job[] = [];
  private assignedJobs: Map<string, string> = new Map(); // jobId -> nodeId

  constructor(config: LoadBalancerConfig) {
    super();
    this.config = config;
    this.initializeStrategies();
    this.startHealthChecks();
    this.startAutoScaling();
  }

  /**
   * Initialize load balancing strategies
   */
  private initializeStrategies(): void {
    // Round Robin Strategy
    this.strategies.set('round-robin', {
      name: 'Round Robin',
      description: 'Distributes jobs evenly across all available nodes',
      algorithm: (nodes, job) => {
        const availableNodes = this.getAvailableNodes(nodes, job);
        if (availableNodes.length === 0) return null;
        
        const index = Math.floor(Math.random() * availableNodes.length);
        return availableNodes[index];
      }
    });

    // Least Loaded Strategy
    this.strategies.set('least-loaded', {
      name: 'Least Loaded',
      description: 'Assigns jobs to nodes with the lowest current load',
      algorithm: (nodes, job) => {
        const availableNodes = this.getAvailableNodes(nodes, job);
        if (availableNodes.length === 0) return null;
        
        return availableNodes.reduce((best, current) => {
          const bestScore = this.calculateLoadScore(best);
          const currentScore = this.calculateLoadScore(current);
          return currentScore < bestScore ? current : best;
        });
      }
    });

    // Performance-Based Strategy
    this.strategies.set('performance-based', {
      name: 'Performance Based',
      description: 'Selects nodes based on performance metrics and capabilities',
      algorithm: (nodes, job) => {
        const availableNodes = this.getAvailableNodes(nodes, job);
        if (availableNodes.length === 0) return null;
        
        return availableNodes.reduce((best, current) => {
          const bestScore = this.calculatePerformanceScore(best, job);
          const currentScore = this.calculatePerformanceScore(current, job);
          return currentScore > bestScore ? current : best;
        });
      }
    });

    // Cost-Optimized Strategy
    this.strategies.set('cost-optimized', {
      name: 'Cost Optimized',
      description: 'Minimizes cost while meeting performance requirements',
      algorithm: (nodes, job) => {
        const availableNodes = this.getAvailableNodes(nodes, job);
        if (availableNodes.length === 0) return null;
        
        return availableNodes.reduce((best, current) => {
          const bestCost = this.calculateJobCost(best, job);
          const currentCost = this.calculateJobCost(current, job);
          return currentCost < bestCost ? current : best;
        });
      }
    });

    // Latency-Optimized Strategy
    this.strategies.set('latency-optimized', {
      name: 'Latency Optimized',
      description: 'Minimizes latency for time-sensitive jobs',
      algorithm: (nodes, job) => {
        const availableNodes = this.getAvailableNodes(nodes, job);
        if (availableNodes.length === 0) return null;
        
        return availableNodes.reduce((best, current) => {
          const bestLatency = this.calculateLatency(best, job);
          const currentLatency = this.calculateLatency(current, job);
          return currentLatency < bestLatency ? current : best;
        });
      }
    });

    // Hybrid Strategy
    this.strategies.set('hybrid', {
      name: 'Hybrid',
      description: 'Combines multiple factors for optimal job placement',
      algorithm: (nodes, job) => {
        const availableNodes = this.getAvailableNodes(nodes, job);
        if (availableNodes.length === 0) return null;
        
        return availableNodes.reduce((best, current) => {
          const bestScore = this.calculateHybridScore(best, job);
          const currentScore = this.calculateHybridScore(current, job);
          return currentScore > bestScore ? current : best;
        });
      }
    });
  }

  /**
   * Add compute nodes to the load balancer
   */
  addNodes(nodes: ComputeNode[]): void {
    for (const node of nodes) {
      this.nodes.set(node.id, node);
      this.emit('nodeAdded', node);
      console.log(`✅ Added node: ${node.name} (${node.gpuCount} GPUs, ${node.cpuCores} cores)`);
    }
  }

  /**
   * Remove compute nodes
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      // Reassign jobs from this node
      this.reassignNodeJobs(nodeId);
      this.nodes.delete(nodeId);
      this.emit('nodeRemoved', node);
      console.log(`❌ Removed node: ${node.name}`);
    }
  }

  /**
   * Submit a job for load balancing
   */
  async submitJob(job: Job): Promise<string | null> {
    console.log(`📋 Submitting job: ${job.name} (${job.resourceRequirements.gpuCount} GPUs)`);
    
    const strategy = this.strategies.get(this.config.strategy);
    if (!strategy) {
      throw new Error(`Unknown load balancing strategy: ${this.config.strategy}`);
    }
    
    const availableNodes = Array.from(this.nodes.values());
    const selectedNode = strategy.algorithm(availableNodes, job);
    
    if (selectedNode) {
      await this.assignJobToNode(job, selectedNode);
      return selectedNode.id;
    } else {
      // No suitable node found, add to queue
      this.jobQueue.push(job);
      this.emit('jobQueued', job);
      console.log(`⏳ Job queued: ${job.name} (no suitable nodes available)`);
      return null;
    }
  }

  /**
   * Assign job to a specific node
   */
  private async assignJobToNode(job: Job, node: ComputeNode): Promise<void> {
    // Update node load
    node.currentLoad += this.calculateJobLoad(job);
    node.queueLength += 1;
    
    // Track assignment
    this.assignedJobs.set(job.id, node.id);
    
    this.emit('jobAssigned', job, node);
    console.log(`🚀 Assigned job: ${job.name} to node: ${node.name}`);
    
    // Simulate job execution
    this.simulateJobExecution(job, node);
  }

  /**
   * Simulate job execution
   */
  private simulateJobExecution(job: Job, node: ComputeNode): void {
    const executionTime = job.estimatedDuration;
    
    setTimeout(() => {
      // Job completed
      node.currentLoad -= this.calculateJobLoad(job);
      node.queueLength -= 1;
      this.assignedJobs.delete(job.id);
      
      this.emit('jobCompleted', job, node);
      console.log(`✅ Completed job: ${job.name} on node: ${node.name}`);
      
      // Try to schedule queued jobs
      this.processJobQueue();
    }, executionTime);
  }

  /**
   * Process queued jobs
   */
  private processJobQueue(): void {
    const strategy = this.strategies.get(this.config.strategy);
    if (!strategy) return;
    
    const availableNodes = Array.from(this.nodes.values());
    
    for (let i = this.jobQueue.length - 1; i >= 0; i--) {
      const job = this.jobQueue[i];
      const selectedNode = strategy.algorithm(availableNodes, job);
      
      if (selectedNode) {
        this.jobQueue.splice(i, 1);
        this.assignJobToNode(job, selectedNode);
      }
    }
  }

  /**
   * Get available nodes for a job
   */
  private getAvailableNodes(nodes: ComputeNode[], job: Job): ComputeNode[] {
    return nodes.filter(node => {
      // Check node health
      if (node.status !== 'healthy') return false;
      
      // Check resource requirements
      if (node.cpuCores < job.resourceRequirements.cpuCores) return false;
      if (node.memory < job.resourceRequirements.memory) return false;
      if (node.gpuCount < job.resourceRequirements.gpuCount) return false;
      if (job.resourceRequirements.gpuType && node.gpuType !== job.resourceRequirements.gpuType) return false;
      
      // Check constraints
      if (job.constraints.preferredRegions && !job.constraints.preferredRegions.includes(node.region)) return false;
      if (job.constraints.preferredProviders && !job.constraints.preferredProviders.includes(node.provider)) return false;
      if (job.constraints.maxLatency && node.metrics.latency > job.constraints.maxLatency) return false;
      
      // Check cost budget
      if (job.costBudget) {
        const estimatedCost = this.calculateJobCost(node, job);
        if (estimatedCost > job.costBudget) return false;
      }
      
      return true;
    });
  }

  /**
   * Calculate load score for a node
   */
  private calculateLoadScore(node: ComputeNode): number {
    const cpuWeight = 0.3;
    const memoryWeight = 0.2;
    const gpuWeight = 0.3;
    const queueWeight = 0.2;
    
    return (
      node.metrics.cpuUtilization * cpuWeight +
      node.metrics.memoryUtilization * memoryWeight +
      node.metrics.gpuUtilization * gpuWeight +
      (node.queueLength / 10) * queueWeight * 100
    );
  }

  /**
   * Calculate performance score for a node
   */
  private calculatePerformanceScore(node: ComputeNode, job: Job): number {
    const throughputScore = node.metrics.throughput / 1000; // Normalize
    const latencyScore = Math.max(0, 100 - node.metrics.latency); // Lower latency is better
    const errorScore = Math.max(0, 100 - node.metrics.errorRate * 100); // Lower error rate is better
    const resourceScore = this.calculateResourceMatch(node, job);
    
    return (throughputScore * 0.3) + (latencyScore * 0.3) + (errorScore * 0.2) + (resourceScore * 0.2);
  }

  /**
   * Calculate resource match score
   */
  private calculateResourceMatch(node: ComputeNode, job: Job): number {
    const cpuMatch = Math.min(100, (node.cpuCores / job.resourceRequirements.cpuCores) * 100);
    const memoryMatch = Math.min(100, (node.memory / job.resourceRequirements.memory) * 100);
    const gpuMatch = Math.min(100, (node.gpuCount / job.resourceRequirements.gpuCount) * 100);
    
    return (cpuMatch + memoryMatch + gpuMatch) / 3;
  }

  /**
   * Calculate job cost on a node
   */
  private calculateJobCost(node: ComputeNode, job: Job): number {
    const estimatedHours = job.estimatedDuration / 3600;
    const resourceMultiplier = (
      job.resourceRequirements.cpuCores / node.cpuCores +
      job.resourceRequirements.memory / node.memory +
      job.resourceRequirements.gpuCount / node.gpuCount
    ) / 3;
    
    return node.costPerHour * resourceMultiplier * estimatedHours;
  }

  /**
   * Calculate latency for a job on a node
   */
  private calculateLatency(node: ComputeNode, job: Job): number {
    const baseLatency = node.metrics.latency;
    const queueLatency = node.queueLength * 1000; // 1 second per queued job
    const networkLatency = job.constraints.dataLocality ? 0 : 50; // 50ms for remote data
    
    return baseLatency + queueLatency + networkLatency;
  }

  /**
   * Calculate hybrid score combining multiple factors
   */
  private calculateHybridScore(node: ComputeNode, job: Job): number {
    const performanceScore = this.calculatePerformanceScore(node, job);
    const costScore = Math.max(0, 100 - (this.calculateJobCost(node, job) / 100)); // Normalize cost
    const latencyScore = Math.max(0, 100 - this.calculateLatency(node, job));
    const loadScore = Math.max(0, 100 - this.calculateLoadScore(node));
    
    return (
      performanceScore * this.config.performanceWeight +
      costScore * this.config.costWeight +
      latencyScore * (this.config.latencyOptimization ? 0.3 : 0.1) +
      loadScore * 0.2
    );
  }

  /**
   * Calculate job load impact on a node
   */
  private calculateJobLoad(job: Job): number {
    const cpuLoad = job.resourceRequirements.cpuCores / 16; // Assume 16 cores max
    const memoryLoad = job.resourceRequirements.memory / 128; // Assume 128GB max
    const gpuLoad = job.resourceRequirements.gpuCount / 8; // Assume 8 GPUs max
    
    return (cpuLoad + memoryLoad + gpuLoad) / 3;
  }

  /**
   * Reassign jobs from a node
   */
  private reassignNodeJobs(nodeId: string): void {
    const jobsToReassign: Job[] = [];
    
    for (const [jobId, assignedNodeId] of this.assignedJobs.entries()) {
      if (assignedNodeId === nodeId) {
        // Find the job in the system (this would be stored elsewhere in a real implementation)
        const job = this.jobQueue.find(j => j.id === jobId);
        if (job) {
          jobsToReassign.push(job);
        }
      }
    }
    
    // Reassign jobs
    for (const job of jobsToReassign) {
      this.jobQueue.push(job);
      this.assignedJobs.delete(job.id);
    }
    
    if (jobsToReassign.length > 0) {
      console.log(`🔄 Reassigned ${jobsToReassign.length} jobs from removed node`);
      this.processJobQueue();
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all nodes
   */
  private performHealthChecks(): void {
    for (const node of this.nodes.values()) {
      const isHealthy = this.checkNodeHealth(node);
      
      if (!isHealthy && node.status === 'healthy') {
        node.status = 'degraded';
        this.emit('nodeDegraded', node);
        console.warn(`⚠️ Node ${node.name} is degraded`);
      } else if (isHealthy && node.status === 'degraded') {
        node.status = 'healthy';
        this.emit('nodeRecovered', node);
        console.log(`✅ Node ${node.name} recovered`);
      }
      
      node.lastHealthCheck = new Date();
    }
  }

  /**
   * Check if a node is healthy
   */
  private checkNodeHealth(node: ComputeNode): boolean {
    const metrics = node.metrics;
    
    // Check various health indicators
    if (metrics.cpuUtilization > 95) return false;
    if (metrics.memoryUtilization > 95) return false;
    if (metrics.gpuUtilization > 95) return false;
    if (metrics.temperature > 80) return false;
    if (metrics.errorRate > 0.1) return false;
    if (metrics.latency > 1000) return false; // 1 second
    
    return true;
  }

  /**
   * Start auto-scaling
   */
  private startAutoScaling(): void {
    if (!this.config.autoScalingEnabled) return;
    
    this.autoScalingInterval = setInterval(() => {
      this.performAutoScaling();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform auto-scaling decisions
   */
  private performAutoScaling(): void {
    const totalNodes = this.nodes.size;
    const avgUtilization = this.calculateAverageUtilization();
    const queueLength = this.jobQueue.length;
    
    // Scale up if utilization is high or queue is long
    if ((avgUtilization > this.config.scalingThreshold || queueLength > 5) && totalNodes < this.config.maxNodes) {
      this.scaleUp();
    }
    
    // Scale down if utilization is low and queue is empty
    if (avgUtilization < this.config.scalingThreshold / 2 && queueLength === 0 && totalNodes > this.config.minNodes) {
      this.scaleDown();
    }
  }

  /**
   * Calculate average utilization across all nodes
   */
  private calculateAverageUtilization(): number {
    if (this.nodes.size === 0) return 0;
    
    const totalUtilization = Array.from(this.nodes.values())
      .reduce((sum, node) => sum + this.calculateLoadScore(node), 0);
    
    return totalUtilization / this.nodes.size;
  }

  /**
   * Scale up by adding nodes
   */
  private scaleUp(): void {
    console.log('📈 Scaling up compute resources...');
    this.emit('scalingUp');
    // In a real implementation, this would trigger cloud provider APIs
  }

  /**
   * Scale down by removing nodes
   */
  private scaleDown(): void {
    console.log('📉 Scaling down compute resources...');
    this.emit('scalingDown');
    // In a real implementation, this would trigger cloud provider APIs
  }

  /**
   * Get load balancer statistics
   */
  getStats(): Record<string, any> {
    const totalNodes = this.nodes.size;
    const healthyNodes = Array.from(this.nodes.values()).filter(n => n.status === 'healthy').length;
    const avgUtilization = this.calculateAverageUtilization();
    
    return {
      totalNodes,
      healthyNodes,
      degradedNodes: totalNodes - healthyNodes,
      averageUtilization: avgUtilization,
      queuedJobs: this.jobQueue.length,
      runningJobs: this.assignedJobs.size,
      strategy: this.config.strategy,
      autoScalingEnabled: this.config.autoScalingEnabled
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.autoScalingInterval) {
      clearInterval(this.autoScalingInterval);
    }
    this.removeAllListeners();
  }
}
