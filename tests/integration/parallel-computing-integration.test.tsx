import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParallelComputingDashboard from '@/components/parallel-computing/ParallelComputingDashboard';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Parallel Computing Integration Tests - Maximum Parallel Computing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('End-to-End Parallel Computing Workflow', () => {
    test('complete parallel computing workflow from cluster management to job execution', async () => {
      // Mock API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            clusters: [
              {
                id: 'cluster-1',
                name: 'AWS P4D Cluster',
                provider: 'aws',
                totalGPUs: 16,
                availableGPUs: 8,
                utilization: 50,
                status: 'active'
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            jobs: [
              {
                id: 'job-1',
                name: 'Parallel Training Job',
                type: 'training',
                status: 'running',
                progress: 45,
                requiredGPUs: 8
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            metrics: {
              totalChunks: 1000,
              processedChunks: 500,
              throughput: 25.5,
              memoryUsage: 8.2,
              workerUtilization: 75
            }
          })
        });

      render(<ParallelComputingDashboard />);

      // Step 1: Verify initial dashboard load
      await waitFor(() => {
        expect(screen.getByText('Maximum Parallel Computing Hub')).toBeInTheDocument();
      });

      // Step 2: Check compute clusters
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);

      await waitFor(() => {
        expect(screen.getByText('AWS P4D Cluster')).toBeInTheDocument();
      });

      // Step 3: Monitor parallel jobs
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);

      await waitFor(() => {
        expect(screen.getByText('Parallel Job Queue')).toBeInTheDocument();
      });

      // Step 4: Check data processing
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);

      await waitFor(() => {
        expect(screen.getByText('Processing Metrics')).toBeInTheDocument();
      });

      // Step 5: Monitor real-time performance
      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });
    });

    test('parallel job submission and execution workflow', async () => {
      render(<ParallelComputingDashboard />);

      // Navigate to jobs tab
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);

      // Verify job queue is displayed
      await waitFor(() => {
        expect(screen.getByText('Parallel Job Queue')).toBeInTheDocument();
      });

      // Check job control buttons
      const startAllButton = screen.getByText('Start All');
      const pauseButton = screen.getByText('Pause');

      expect(startAllButton).toBeEnabled();
      expect(pauseButton).toBeEnabled();

      // Test job control actions
      fireEvent.click(startAllButton);
      fireEvent.click(pauseButton);

      // Verify job status updates
      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
      });
    });

    test('data processing pipeline workflow', async () => {
      render(<ParallelComputingDashboard />);

      // Navigate to data processing tab
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);

      // Verify processing metrics are displayed
      await waitFor(() => {
        expect(screen.getByText('Processing Metrics')).toBeInTheDocument();
        expect(screen.getByText('Total Chunks')).toBeInTheDocument();
        expect(screen.getByText('Processed')).toBeInTheDocument();
      });

      // Test processing controls
      const startProcessingButton = screen.getByText('Start Processing');
      expect(startProcessingButton).toBeEnabled();

      fireEvent.click(startProcessingButton);

      // Verify button state changes
      await waitFor(() => {
        expect(screen.getByText('Stop Processing')).toBeInTheDocument();
      });

      // Check processing configuration
      expect(screen.getByText('Active Workers')).toBeInTheDocument();
      expect(screen.getByText('Batch Size')).toBeInTheDocument();
      expect(screen.getByText('Compression')).toBeInTheDocument();
      expect(screen.getByText('Parallel Augmentation')).toBeInTheDocument();
    });

    test('real-time monitoring and performance tracking', async () => {
      render(<ParallelComputingDashboard />);

      // Navigate to monitoring tab
      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);

      // Verify monitoring sections
      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
        expect(screen.getByText('Network I/O')).toBeInTheDocument();
        expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
      });

      // Check performance metrics
      expect(screen.getByText('Real-time Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Optimal')).toBeInTheDocument();

      // Check network statistics
      expect(screen.getByText('Bandwidth')).toBeInTheDocument();
      expect(screen.getByText('Latency')).toBeInTheDocument();
      expect(screen.getByText('Packet Loss')).toBeInTheDocument();
      expect(screen.getByText('Connections')).toBeInTheDocument();

      // Check resource utilization
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('GPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Storage I/O')).toBeInTheDocument();
    });
  });

  describe('Cluster Management Integration', () => {
    test('cluster status monitoring and updates', async () => {
      render(<ParallelComputingDashboard />);

      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);

      // Verify cluster information
      await waitFor(() => {
        expect(screen.getByText('AWS P4D Cluster')).toBeInTheDocument();
        expect(screen.getByText('GCP A2 Cluster')).toBeInTheDocument();
      });

      // Check cluster status badges
      const activeBadges = screen.getAllByText('ACTIVE');
      expect(activeBadges.length).toBeGreaterThan(0);

      // Verify node information
      expect(screen.getByText('p4d-24xlarge-1')).toBeInTheDocument();
      expect(screen.getByText('a2-highgpu-8g-1')).toBeInTheDocument();

      // Check GPU utilization
      expect(screen.getByText('Cluster Utilization')).toBeInTheDocument();
    });

    test('node-level monitoring and health checks', async () => {
      render(<ParallelComputingDashboard />);

      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);

      // Verify node details
      await waitFor(() => {
        expect(screen.getByText('Nodes (2)')).toBeInTheDocument();
      });

      // Check node status indicators
      const statusDots = screen.getAllByRole('presentation');
      expect(statusDots.length).toBeGreaterThan(0);

      // Verify GPU information
      expect(screen.getByText(/8 GPUs/)).toBeInTheDocument();
    });
  });

  describe('Job Management Integration', () => {
    test('job queue management and priority handling', async () => {
      render(<ParallelComputingDashboard />);

      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);

      // Verify job queue
      await waitFor(() => {
        expect(screen.getByText('Parallel Job Queue')).toBeInTheDocument();
      });

      // Check job priorities
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('LOW')).toBeInTheDocument();

      // Check job statuses
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('QUEUED')).toBeInTheDocument();

      // Verify job progress
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    test('job execution monitoring and progress tracking', async () => {
      render(<ParallelComputingDashboard />);

      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);

      // Verify job details
      await waitFor(() => {
        expect(screen.getByText('Transformer Training')).toBeInTheDocument();
        expect(screen.getByText('Data Preprocessing')).toBeInTheDocument();
        expect(screen.getByText('Model Inference')).toBeInTheDocument();
      });

      // Check job types
      expect(screen.getByText(/training/)).toBeInTheDocument();
      expect(screen.getByText(/data-processing/)).toBeInTheDocument();
      expect(screen.getByText(/inference/)).toBeInTheDocument();

      // Verify GPU requirements
      expect(screen.getByText(/4 GPUs/)).toBeInTheDocument();
      expect(screen.getByText(/2 GPUs/)).toBeInTheDocument();
      expect(screen.getByText(/1 GPUs/)).toBeInTheDocument();
    });
  });

  describe('Data Processing Integration', () => {
    test('parallel data processing workflow', async () => {
      render(<ParallelComputingDashboard />);

      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);

      // Verify processing metrics
      await waitFor(() => {
        expect(screen.getByText('Processing Metrics')).toBeInTheDocument();
      });

      // Check processing statistics
      expect(screen.getByText('Total Chunks')).toBeInTheDocument();
      expect(screen.getByText('Processed')).toBeInTheDocument();
      expect(screen.getByText('Processing Progress')).toBeInTheDocument();

      // Verify processing controls
      expect(screen.getByText('Processing Controls')).toBeInTheDocument();
      expect(screen.getByText('Start Processing')).toBeInTheDocument();

      // Check configuration
      expect(screen.getByText('Active Workers')).toBeInTheDocument();
      expect(screen.getByText('Batch Size')).toBeInTheDocument();
    });

    test('worker management and utilization tracking', async () => {
      render(<ParallelComputingDashboard />);

      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);

      // Verify worker information
      await waitFor(() => {
        expect(screen.getByText('Active Workers')).toBeInTheDocument();
      });

      // Check processing features
      expect(screen.getByText('Compression')).toBeInTheDocument();
      expect(screen.getByText('Parallel Augmentation')).toBeInTheDocument();

      // Verify feature status
      const enabledBadges = screen.getAllByText('Enabled');
      expect(enabledBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('real-time performance metrics and alerts', async () => {
      render(<ParallelComputingDashboard />);

      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);

      // Verify monitoring sections
      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
        expect(screen.getByText('Network I/O')).toBeInTheDocument();
        expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
      });

      // Check performance indicators
      expect(screen.getByText('Real-time Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Optimal')).toBeInTheDocument();

      // Verify network metrics
      expect(screen.getByText('2.4 GB/s')).toBeInTheDocument();
      expect(screen.getByText('0.8 ms')).toBeInTheDocument();
      expect(screen.getByText('0.01%')).toBeInTheDocument();
      expect(screen.getByText('1,247')).toBeInTheDocument();
    });

    test('resource utilization monitoring and optimization', async () => {
      render(<ParallelComputingDashboard />);

      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);

      // Verify resource utilization
      await waitFor(() => {
        expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
      });

      // Check utilization metrics
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('GPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Storage I/O')).toBeInTheDocument();

      // Verify progress bars for utilization
      const utilizationBars = screen.getAllByRole('progressbar');
      expect(utilizationBars.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Tab Integration', () => {
    test('data consistency across all tabs', async () => {
      render(<ParallelComputingDashboard />);

      // Check overview stats
      expect(screen.getByText('Total GPUs')).toBeInTheDocument();
      expect(screen.getByText('Available GPUs')).toBeInTheDocument();
      expect(screen.getByText('Running Jobs')).toBeInTheDocument();
      expect(screen.getByText('Queued Jobs')).toBeInTheDocument();

      // Navigate through all tabs
      const tabs = ['Compute Clusters', 'Parallel Jobs', 'Data Processing', 'Real-time Monitoring'];
      
      for (const tabName of tabs) {
        const tab = screen.getByText(tabName);
        fireEvent.click(tab);
        
        // Verify tab content loads
        await waitFor(() => {
          expect(tab).toBeInTheDocument();
        });
      }
    });

    test('real-time updates across all components', async () => {
      render(<ParallelComputingDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Maximum Parallel Computing Hub')).toBeInTheDocument();
      });

      // Test real-time updates by checking for dynamic content
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);

      // Verify real-time job updates
      await waitFor(() => {
        expect(screen.getByText('Parallel Job Queue')).toBeInTheDocument();
      });

      // Check for progress updates
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles API errors gracefully', async () => {
      // Mock API error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<ParallelComputingDashboard />);

      // Dashboard should still render with fallback data
      await waitFor(() => {
        expect(screen.getByText('Maximum Parallel Computing Hub')).toBeInTheDocument();
      });
    });

    test('handles empty data states', async () => {
      // Mock empty API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          clusters: [],
          jobs: [],
          metrics: {
            totalChunks: 0,
            processedChunks: 0,
            throughput: 0,
            memoryUsage: 0,
            workerUtilization: 0
          }
        })
      });

      render(<ParallelComputingDashboard />);

      // Dashboard should handle empty states gracefully
      await waitFor(() => {
        expect(screen.getByText('Maximum Parallel Computing Hub')).toBeInTheDocument();
      });
    });
  });
});
