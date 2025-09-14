/**
 * Parallel Data Processing Engine
 * Handles data loading, preprocessing, and augmentation in parallel
 */

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';

export interface DataChunk {
  id: string;
  data: any[];
  metadata: {
    size: number;
    format: string;
    source: string;
    timestamp: Date;
  };
  processed: boolean;
  errors: string[];
}

export interface ProcessingWorker {
  id: string;
  worker: Worker;
  status: 'idle' | 'busy' | 'error';
  currentChunk: string | null;
  processedChunks: number;
  errors: number;
  startTime: Date;
}

export interface DataProcessingConfig {
  batchSize: number;
  numWorkers: number;
  maxMemoryUsage: number;
  compressionEnabled: boolean;
  cacheEnabled: boolean;
  parallelAugmentation: boolean;
  dataValidation: boolean;
  errorHandling: 'strict' | 'lenient' | 'skip';
}

export interface ProcessingMetrics {
  totalChunks: number;
  processedChunks: number;
  failedChunks: number;
  totalDataSize: number;
  processedDataSize: number;
  averageProcessingTime: number;
  throughput: number; // chunks per second
  memoryUsage: number;
  workerUtilization: number;
  timestamp: Date;
}

export class ParallelDataProcessor extends EventEmitter {
  private workers: Map<string, ProcessingWorker> = new Map();
  private dataChunks: Map<string, DataChunk> = new Map();
  private processingQueue: string[] = [];
  private config: DataProcessingConfig;
  private isProcessing: boolean = false;
  private metrics: ProcessingMetrics[] = [];
  private workerScript: string;

  constructor(config: DataProcessingConfig, workerScript?: string) {
    super();
    this.config = config;
    this.workerScript = workerScript || this.generateWorkerScript();
    this.initializeWorkers();
  }

  /**
   * Initialize processing workers
   */
  private initializeWorkers(): void {
    console.log(`🔧 Initializing ${this.config.numWorkers} data processing workers...`);
    
    for (let i = 0; i < this.config.numWorkers; i++) {
      const workerId = `worker_${i}`;
      const worker = new Worker(this.workerScript, {
        workerData: {
          workerId,
          config: this.config
        }
      });
      
      const processingWorker: ProcessingWorker = {
        id: workerId,
        worker,
        status: 'idle',
        currentChunk: null,
        processedChunks: 0,
        errors: 0,
        startTime: new Date()
      };
      
      this.workers.set(workerId, processingWorker);
      
      // Set up worker event handlers
      worker.on('message', (message) => this.handleWorkerMessage(workerId, message));
      worker.on('error', (error) => this.handleWorkerError(workerId, error));
      worker.on('exit', (code) => this.handleWorkerExit(workerId, code));
    }
    
    console.log('✅ Data processing workers initialized');
  }

  /**
   * Generate worker script for data processing
   */
  private generateWorkerScript(): string {
    return `
      const { parentPort, workerData } = require('worker_threads');
      
      const { workerId, config } = workerData;
      
      // Simulate data processing functions
      function preprocessData(data) {
        // Simulate preprocessing operations
        return data.map(item => ({
          ...item,
          processed: true,
          timestamp: new Date()
        }));
      }
      
      function augmentData(data) {
        if (!config.parallelAugmentation) return data;
        
        // Simulate data augmentation
        return data.map(item => ({
          ...item,
          augmented: true,
          augmentationType: 'random_transform'
        }));
      }
      
      function validateData(data) {
        if (!config.dataValidation) return { valid: true, errors: [] };
        
        const errors = [];
        for (const item of data) {
          if (!item.id) errors.push('Missing ID');
          if (!item.content) errors.push('Missing content');
        }
        
        return {
          valid: errors.length === 0,
          errors
        };
      }
      
      function compressData(data) {
        if (!config.compressionEnabled) return data;
        
        // Simulate compression
        return {
          compressed: true,
          originalSize: JSON.stringify(data).length,
          compressedSize: Math.floor(JSON.stringify(data).length * 0.7)
        };
      }
      
      // Main processing function
      function processChunk(chunk) {
        try {
          const startTime = Date.now();
          
          // Preprocess data
          const preprocessed = preprocessData(chunk.data);
          
          // Augment data if enabled
          const augmented = augmentData(preprocessed);
          
          // Validate data
          const validation = validateData(augmented);
          if (!validation.valid && config.errorHandling === 'strict') {
            throw new Error(\`Validation failed: \${validation.errors.join(', ')}\`);
          }
          
          // Compress data if enabled
          const compressed = compressData(augmented);
          
          const processingTime = Date.now() - startTime;
          
          return {
            success: true,
            processedData: augmented,
            compressed,
            processingTime,
            validation
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            processingTime: 0
          };
        }
      }
      
      // Listen for processing requests
      parentPort.on('message', (message) => {
        if (message.type === 'process') {
          const result = processChunk(message.chunk);
          parentPort.postMessage({
            type: 'result',
            chunkId: message.chunkId,
            result
          });
        }
      });
      
      // Send ready signal
      parentPort.postMessage({
        type: 'ready',
        workerId
      });
    `;
  }

  /**
   * Handle worker messages
   */
  private handleWorkerMessage(workerId: string, message: any): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;
    
    switch (message.type) {
      case 'ready':
        console.log(`✅ Worker ${workerId} is ready`);
        break;
        
      case 'result':
        this.handleProcessingResult(workerId, message);
        break;
    }
  }

  /**
   * Handle processing results
   */
  private handleProcessingResult(workerId: string, message: any): void {
    const worker = this.workers.get(workerId);
    const chunk = this.dataChunks.get(message.chunkId);
    
    if (!worker || !chunk) return;
    
    worker.status = 'idle';
    worker.currentChunk = null;
    
    if (message.result.success) {
      chunk.processed = true;
      worker.processedChunks++;
      this.emit('chunkProcessed', chunk, message.result);
    } else {
      chunk.errors.push(message.result.error);
      worker.errors++;
      this.emit('chunkFailed', chunk, message.result.error);
    }
    
    // Try to process next chunk
    this.processNextChunk(workerId);
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(workerId: string, error: Error): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'error';
      console.error(`❌ Worker ${workerId} error:`, error.message);
      this.emit('workerError', workerId, error);
    }
  }

  /**
   * Handle worker exit
   */
  private handleWorkerExit(workerId: string, code: number): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      console.log(`👋 Worker ${workerId} exited with code ${code}`);
      this.workers.delete(workerId);
      this.emit('workerExit', workerId, code);
    }
  }

  /**
   * Add data chunks for processing
   */
  addDataChunks(chunks: DataChunk[]): void {
    for (const chunk of chunks) {
      this.dataChunks.set(chunk.id, chunk);
      this.processingQueue.push(chunk.id);
      this.emit('chunkAdded', chunk);
    }
    
    console.log(`📦 Added ${chunks.length} data chunks for processing`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Start parallel data processing
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Processing is already running');
      return;
    }
    
    this.isProcessing = true;
    console.log('🚀 Starting parallel data processing...');
    this.emit('processingStarted');
    
    // Start processing chunks with available workers
    for (const workerId of this.workers.keys()) {
      this.processNextChunk(workerId);
    }
    
    // Monitor processing progress
    this.monitorProcessing();
  }

  /**
   * Process next chunk with a worker
   */
  private processNextChunk(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker || worker.status !== 'idle') return;
    
    if (this.processingQueue.length === 0) {
      // No more chunks to process
      this.checkProcessingComplete();
      return;
    }
    
    const chunkId = this.processingQueue.shift()!;
    const chunk = this.dataChunks.get(chunkId);
    
    if (!chunk) return;
    
    worker.status = 'busy';
    worker.currentChunk = chunkId;
    
    // Send chunk to worker for processing
    worker.worker.postMessage({
      type: 'process',
      chunkId,
      chunk
    });
  }

  /**
   * Monitor processing progress
   */
  private monitorProcessing(): void {
    const monitorInterval = setInterval(() => {
      if (!this.isProcessing) {
        clearInterval(monitorInterval);
        return;
      }
      
      const metrics = this.computeMetrics();
      this.metrics.push(metrics);
      this.emit('processingProgress', metrics);
      
      // Check if processing is complete
      this.checkProcessingComplete();
    }, 1000);
  }

  /**
   * Check if processing is complete
   */
  private checkProcessingComplete(): void {
    const totalChunks = this.dataChunks.size;
    const processedChunks = Array.from(this.dataChunks.values())
      .filter(chunk => chunk.processed).length;
    
    if (processedChunks >= totalChunks) {
      this.completeProcessing();
    }
  }

  /**
   * Complete processing
   */
  private completeProcessing(): void {
    this.isProcessing = false;
    
    const finalMetrics = this.computeMetrics();
    this.emit('processingCompleted', finalMetrics);
    
    console.log('✅ Parallel data processing completed');
    console.log(`📊 Processed ${finalMetrics.processedChunks}/${finalMetrics.totalChunks} chunks`);
    console.log(`⚡ Throughput: ${finalMetrics.throughput.toFixed(2)} chunks/second`);
  }

  /**
   * Compute processing metrics
   */
  private computeMetrics(): ProcessingMetrics {
    const totalChunks = this.dataChunks.size;
    const processedChunks = Array.from(this.dataChunks.values())
      .filter(chunk => chunk.processed).length;
    const failedChunks = Array.from(this.dataChunks.values())
      .filter(chunk => chunk.errors.length > 0).length;
    
    const totalDataSize = Array.from(this.dataChunks.values())
      .reduce((sum, chunk) => sum + chunk.metadata.size, 0);
    const processedDataSize = Array.from(this.dataChunks.values())
      .filter(chunk => chunk.processed)
      .reduce((sum, chunk) => sum + chunk.metadata.size, 0);
    
    const totalProcessingTime = Array.from(this.workers.values())
      .reduce((sum, worker) => {
        const runtime = Date.now() - worker.startTime.getTime();
        return sum + runtime;
      }, 0);
    
    const averageProcessingTime = totalProcessingTime / Math.max(processedChunks, 1);
    const throughput = processedChunks / (totalProcessingTime / 1000);
    
    const memoryUsage = this.estimateMemoryUsage();
    const workerUtilization = Array.from(this.workers.values())
      .filter(worker => worker.status === 'busy').length / this.workers.size * 100;
    
    return {
      totalChunks,
      processedChunks,
      failedChunks,
      totalDataSize,
      processedDataSize,
      averageProcessingTime,
      throughput,
      memoryUsage,
      workerUtilization,
      timestamp: new Date()
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    const baseMemory = 100; // MB base memory
    const chunkMemory = Array.from(this.dataChunks.values())
      .reduce((sum, chunk) => sum + chunk.metadata.size, 0) / (1024 * 1024); // Convert to MB
    const workerMemory = this.workers.size * 50; // 50MB per worker
    
    return baseMemory + chunkMemory + workerMemory;
  }

  /**
   * Stop processing
   */
  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) return;
    
    this.isProcessing = false;
    
    // Terminate all workers
    for (const worker of this.workers.values()) {
      await worker.worker.terminate();
    }
    
    this.workers.clear();
    this.emit('processingStopped');
    console.log('⏹️ Data processing stopped');
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): Record<string, any> {
    const currentMetrics = this.computeMetrics();
    const workerStats = Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      status: worker.status,
      processedChunks: worker.processedChunks,
      errors: worker.errors,
      currentChunk: worker.currentChunk
    }));
    
    return {
      isProcessing: this.isProcessing,
      config: this.config,
      currentMetrics,
      workerStats,
      recentMetrics: this.metrics.slice(-10)
    };
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.stopProcessing();
    this.removeAllListeners();
  }
}
