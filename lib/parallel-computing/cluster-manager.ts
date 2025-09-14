/**
 * Maximum Parallel Computing Cluster Manager
 * Manages GPU clusters, distributed training, and parallel processing
 */

import { EventEmitter } from 'events';

export interface GPUNode {
  id: string;
  name: string;
  gpuCount: number;
  gpuType: string;
  memory: number;
  computeCapability: number;
  status: 'idle' | 'busy' | 'offline' | 'maintenance';
  currentJobs: string[];
  utilization: number;
  temperature: number;
  powerConsumption: number;
  lastHeartbeat: Date;
}

export interface ComputeCluster {
  id: string;
  name: string;
  provider: 'aws' | 'gcp' | 'azure' | 'on-premise';
  region: string;
  nodes: GPUNode[];
  totalGPUs: number;
  availableGPUs: number;
  totalMemory: number;
  totalComputePower: number;
  status: 'active' | 'scaling' | 'maintenance' | 'offline';
  autoScaling: boolean;
  minNodes: number;
  maxNodes: number;
  currentNodes: number;
}

export interface ParallelJob {
  id: string;
  name: string;
  type: 'training' | 'inference' | 'data-processing' | 'model-optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  requiredGPUs: number;
  requiredMemory: number;
  estimatedDuration: number;
  actualDuration?: number;
  assignedNodes: string[];
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  metadata: Record<string, any>;
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-loaded' | 'performance-based' | 'cost-optimized';
  healthCheckInterval: number;
  autoScalingThreshold: number;
  maxConcurrentJobs: number;
  resourceReservation: number;
}

export class ParallelClusterManager extends EventEmitter {
  private clusters: Map<string, ComputeCluster> = new Map();
  private jobs: Map<string, ParallelJob> = new Map();
  private jobQueue: ParallelJob[] = [];
  private loadBalancerConfig: LoadBalancerConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: LoadBalancerConfig) {
    super();
    this.loadBalancerConfig = config;
    this.startMonitoring();
  }

  /**
   * Add a compute cluster to the manager
   */
  addCluster(cluster: ComputeCluster): void {
    this.clusters.set(cluster.id, cluster);
    this.emit('clusterAdded', cluster);
    console.log(`✅ Added cluster: ${cluster.name} (${cluster.totalGPUs} GPUs)`);
  }

  /**
   * Remove a compute cluster
   */
  removeCluster(clusterId: string): void {
    const cluster = this.clusters.get(clusterId);
    if (cluster) {
      // Cancel all jobs on this cluster
      this.cancelClusterJobs(clusterId);
      this.clusters.delete(clusterId);
      this.emit('clusterRemoved', cluster);
      console.log(`❌ Removed cluster: ${cluster.name}`);
    }
  }

  /**
   * Submit a parallel job for execution
   */
  async submitJob(job: Omit<ParallelJob, 'id' | 'status' | 'progress' | 'assignedNodes'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const parallelJob: ParallelJob = {
      ...job,
      id: jobId,
      status: 'queued',
      progress: 0,
      assignedNodes: []
    };

    this.jobs.set(jobId, parallelJob);
    this.jobQueue.push(parallelJob);
    
    this.emit('jobSubmitted', parallelJob);
    console.log(`📋 Submitted job: ${parallelJob.name} (${parallelJob.requiredGPUs} GPUs)`);
    
    // Try to schedule immediately
    await this.scheduleJobs();
    
    return jobId;
  }

  /**
   * Schedule jobs across available clusters
   */
  private async scheduleJobs(): Promise<void> {
    const availableClusters = Array.from(this.clusters.values())
      .filter(cluster => cluster.status === 'active' && cluster.availableGPUs > 0);

    if (availableClusters.length === 0) {
      console.log('⚠️ No available clusters for job scheduling');
      return;
    }

    // Sort jobs by priority and submission time
    this.jobQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.startTime?.getTime() || 0 - (b.startTime?.getTime() || 0);
    });

    for (const job of this.jobQueue.slice()) {
      const assignedCluster = this.findBestCluster(job, availableClusters);
      
      if (assignedCluster) {
        await this.assignJobToCluster(job, assignedCluster);
        this.jobQueue.splice(this.jobQueue.indexOf(job), 1);
      }
    }
  }

  /**
   * Find the best cluster for a job based on load balancing strategy
   */
  private findBestCluster(job: ParallelJob, clusters: ComputeCluster[]): ComputeCluster | null {
    switch (this.loadBalancerConfig.strategy) {
      case 'round-robin':
        return this.roundRobinSelection(clusters);
      
      case 'least-loaded':
        return this.leastLoadedSelection(job, clusters);
      
      case 'performance-based':
        return this.performanceBasedSelection(job, clusters);
      
      case 'cost-optimized':
        return this.costOptimizedSelection(job, clusters);
      
      default:
        return this.leastLoadedSelection(job, clusters);
    }
  }

  /**
   * Round-robin cluster selection
   */
  private roundRobinSelection(clusters: ComputeCluster[]): ComputeCluster | null {
    const availableClusters = clusters.filter(c => c.availableGPUs >= 1);
    if (availableClusters.length === 0) return null;
    
    const index = Math.floor(Math.random() * availableClusters.length);
    return availableClusters[index];
  }

  /**
   * Least-loaded cluster selection
   */
  private leastLoadedSelection(job: ParallelJob, clusters: ComputeCluster[]): ComputeCluster | null {
    const suitableClusters = clusters.filter(c => c.availableGPUs >= job.requiredGPUs);
    if (suitableClusters.length === 0) return null;
    
    return suitableClusters.reduce((best, current) => {
      const bestUtilization = best.availableGPUs / best.totalGPUs;
      const currentUtilization = current.availableGPUs / current.totalGPUs;
      return currentUtilization > bestUtilization ? current : best;
    });
  }

  /**
   * Performance-based cluster selection
   */
  private performanceBasedSelection(job: ParallelJob, clusters: ComputeCluster[]): ComputeCluster | null {
    const suitableClusters = clusters.filter(c => c.availableGPUs >= job.requiredGPUs);
    if (suitableClusters.length === 0) return null;
    
    return suitableClusters.reduce((best, current) => {
      const bestScore = this.calculatePerformanceScore(best, job);
      const currentScore = this.calculatePerformanceScore(current, job);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Cost-optimized cluster selection
   */
  private costOptimizedSelection(job: ParallelJob, clusters: ComputeCluster[]): ComputeCluster | null {
    const suitableClusters = clusters.filter(c => c.availableGPUs >= job.requiredGPUs);
    if (suitableClusters.length === 0) return null;
    
    return suitableClusters.reduce((best, current) => {
      const bestCost = this.calculateCost(best, job);
      const currentCost = this.calculateCost(current, job);
      return currentCost < bestCost ? current : best;
    });
  }

  /**
   * Calculate performance score for a cluster
   */
  private calculatePerformanceScore(cluster: ComputeCluster, job: ParallelJob): number {
    const gpuUtilization = cluster.availableGPUs / cluster.totalGPUs;
    const memoryUtilization = cluster.totalMemory / (cluster.totalMemory * 0.8); // 80% threshold
    const computePower = cluster.totalComputePower;
    
    return (gpuUtilization * 0.4) + (memoryUtilization * 0.3) + (computePower * 0.3);
  }

  /**
   * Calculate cost for running job on cluster
   */
  private calculateCost(cluster: ComputeCluster, job: ParallelJob): number {
    const baseCosts = {
      'aws': 3.06, // $/hour for p3.16xlarge
      'gcp': 2.48, // $/hour for n1-standard-8
      'azure': 2.90, // $/hour for Standard_NC6s_v3
      'on-premise': 0.5 // $/hour for on-premise
    };
    
    const baseCost = baseCosts[cluster.provider] || 1.0;
    const gpuMultiplier = job.requiredGPUs;
    const estimatedHours = job.estimatedDuration / 3600; // Convert seconds to hours
    
    return baseCost * gpuMultiplier * estimatedHours;
  }

  /**
   * Assign job to a specific cluster
   */
  private async assignJobToCluster(job: ParallelJob, cluster: ComputeCluster): Promise<void> {
    const assignedNodes: string[] = [];
    let remainingGPUs = job.requiredGPUs;
    
    // Find nodes with available GPUs
    for (const node of cluster.nodes) {
      if (remainingGPUs <= 0) break;
      if (node.status === 'idle' && node.gpuCount > 0) {
        const gpusToUse = Math.min(remainingGPUs, node.gpuCount);
        assignedNodes.push(node.id);
        node.status = 'busy';
        node.currentJobs.push(job.id);
        remainingGPUs -= gpusToUse;
      }
    }
    
    if (assignedNodes.length > 0) {
      job.assignedNodes = assignedNodes;
      job.status = 'running';
      job.startTime = new Date();
      
      cluster.availableGPUs -= job.requiredGPUs;
      
      this.emit('jobStarted', job, cluster);
      console.log(`🚀 Started job: ${job.name} on cluster: ${cluster.name}`);
      
      // Simulate job execution
      this.simulateJobExecution(job);
    }
  }

  /**
   * Simulate job execution with progress updates
   */
  private simulateJobExecution(job: ParallelJob): void {
    const updateInterval = setInterval(() => {
      if (job.status !== 'running') {
        clearInterval(updateInterval);
        return;
      }
      
      // Simulate progress
      job.progress = Math.min(job.progress + Math.random() * 10, 100);
      
      this.emit('jobProgress', job);
      
      if (job.progress >= 100) {
        this.completeJob(job);
        clearInterval(updateInterval);
      }
    }, 1000);
  }

  /**
   * Complete a job
   */
  private completeJob(job: ParallelJob): void {
    job.status = 'completed';
    job.endTime = new Date();
    job.actualDuration = job.endTime.getTime() - (job.startTime?.getTime() || 0);
    
    // Release cluster resources
    for (const cluster of this.clusters.values()) {
      for (const node of cluster.nodes) {
        if (node.currentJobs.includes(job.id)) {
          node.currentJobs = node.currentJobs.filter(id => id !== job.id);
          if (node.currentJobs.length === 0) {
            node.status = 'idle';
          }
        }
      }
      cluster.availableGPUs += job.requiredGPUs;
    }
    
    this.emit('jobCompleted', job);
    console.log(`✅ Completed job: ${job.name} in ${job.actualDuration}ms`);
    
    // Try to schedule more jobs
    this.scheduleJobs();
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    
    if (job.status === 'queued') {
      job.status = 'cancelled';
      this.jobQueue.splice(this.jobQueue.indexOf(job), 1);
    } else if (job.status === 'running') {
      job.status = 'cancelled';
      job.endTime = new Date();
      
      // Release resources
      for (const cluster of this.clusters.values()) {
        for (const node of cluster.nodes) {
          if (node.currentJobs.includes(jobId)) {
            node.currentJobs = node.currentJobs.filter(id => id !== jobId);
            if (node.currentJobs.length === 0) {
              node.status = 'idle';
            }
          }
        }
        cluster.availableGPUs += job.requiredGPUs;
      }
    }
    
    this.emit('jobCancelled', job);
    console.log(`❌ Cancelled job: ${job.name}`);
    
    return true;
  }

  /**
   * Cancel all jobs on a specific cluster
   */
  private cancelClusterJobs(clusterId: string): void {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return;
    
    for (const job of this.jobs.values()) {
      if (job.assignedNodes.some(nodeId => 
        cluster.nodes.some(node => node.id === nodeId)
      )) {
        this.cancelJob(job.id);
      }
    }
  }

  /**
   * Get cluster statistics
   */
  getClusterStats(): Record<string, any> {
    const stats = {
      totalClusters: this.clusters.size,
      totalGPUs: 0,
      availableGPUs: 0,
      totalJobs: this.jobs.size,
      runningJobs: 0,
      queuedJobs: this.jobQueue.length,
      completedJobs: 0,
      failedJobs: 0,
      clusters: [] as any[]
    };
    
    for (const cluster of this.clusters.values()) {
      stats.totalGPUs += cluster.totalGPUs;
      stats.availableGPUs += cluster.availableGPUs;
      stats.clusters.push({
        id: cluster.id,
        name: cluster.name,
        provider: cluster.provider,
        status: cluster.status,
        totalGPUs: cluster.totalGPUs,
        availableGPUs: cluster.availableGPUs,
        utilization: ((cluster.totalGPUs - cluster.availableGPUs) / cluster.totalGPUs) * 100
      });
    }
    
    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'running':
          stats.runningJobs++;
          break;
        case 'completed':
          stats.completedJobs++;
          break;
        case 'failed':
          stats.failedJobs++;
          break;
      }
    }
    
    return stats;
  }

  /**
   * Start monitoring system
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateClusterHealth();
      this.emit('monitoringUpdate', this.getClusterStats());
    }, this.loadBalancerConfig.healthCheckInterval);
  }

  /**
   * Update cluster health status
   */
  private updateClusterHealth(): void {
    for (const cluster of this.clusters.values()) {
      for (const node of cluster.nodes) {
        // Simulate health updates
        node.utilization = Math.random() * 100;
        node.temperature = 45 + Math.random() * 20;
        node.powerConsumption = 200 + Math.random() * 100;
        node.lastHeartbeat = new Date();
        
        // Check for unhealthy nodes
        if (node.temperature > 80 || node.utilization > 95) {
          console.warn(`⚠️ Node ${node.name} is under stress: Temp=${node.temperature.toFixed(1)}°C, Util=${node.utilization.toFixed(1)}%`);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.removeAllListeners();
  }
}
