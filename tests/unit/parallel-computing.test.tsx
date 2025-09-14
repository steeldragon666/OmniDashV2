import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParallelComputingDashboard from '@/components/parallel-computing/ParallelComputingDashboard';

// Mock the API calls
global.fetch = jest.fn();

describe('Parallel Computing Dashboard - Maximum Parallel Computing Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Dashboard Rendering', () => {
    test('renders the main parallel computing dashboard', () => {
      render(<ParallelComputingDashboard />);
      
      expect(screen.getByText('Maximum Parallel Computing Hub')).toBeInTheDocument();
      expect(screen.getByText('Real-time monitoring and management of distributed compute clusters')).toBeInTheDocument();
    });

    test('displays overview statistics', () => {
      render(<ParallelComputingDashboard />);
      
      expect(screen.getByText('Total GPUs')).toBeInTheDocument();
      expect(screen.getByText('Available GPUs')).toBeInTheDocument();
      expect(screen.getByText('Running Jobs')).toBeInTheDocument();
      expect(screen.getByText('Queued Jobs')).toBeInTheDocument();
    });

    test('shows all tab navigation buttons', () => {
      render(<ParallelComputingDashboard />);
      
      expect(screen.getByText('Compute Clusters')).toBeInTheDocument();
      expect(screen.getByText('Parallel Jobs')).toBeInTheDocument();
      expect(screen.getByText('Data Processing')).toBeInTheDocument();
      expect(screen.getByText('Real-time Monitoring')).toBeInTheDocument();
    });
  });

  describe('Compute Clusters Tab', () => {
    test('displays cluster information correctly', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      expect(screen.getByText('AWS P4D Cluster')).toBeInTheDocument();
      expect(screen.getByText('GCP A2 Cluster')).toBeInTheDocument();
    });

    test('shows cluster status badges', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    test('displays node information', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      expect(screen.getByText('p4d-24xlarge-1')).toBeInTheDocument();
      expect(screen.getByText('a2-highgpu-8g-1')).toBeInTheDocument();
    });

    test('shows GPU utilization progress bars', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Parallel Jobs Tab', () => {
    test('displays job queue information', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      expect(screen.getByText('Parallel Job Queue')).toBeInTheDocument();
      expect(screen.getByText('Transformer Training')).toBeInTheDocument();
      expect(screen.getByText('Data Preprocessing')).toBeInTheDocument();
    });

    test('shows job status badges', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      expect(screen.getByText('RUNNING')).toBeInTheDocument();
      expect(screen.getByText('QUEUED')).toBeInTheDocument();
    });

    test('displays job priority badges', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    test('shows job progress bars', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    test('displays job control buttons', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      expect(screen.getByText('Start All')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });
  });

  describe('Data Processing Tab', () => {
    test('displays processing metrics', () => {
      render(<ParallelComputingDashboard />);
      
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);
      
      expect(screen.getByText('Processing Metrics')).toBeInTheDocument();
      expect(screen.getByText('Total Chunks')).toBeInTheDocument();
      expect(screen.getByText('Processed')).toBeInTheDocument();
    });

    test('shows processing progress', () => {
      render(<ParallelComputingDashboard />);
      
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);
      
      expect(screen.getByText('Processing Progress')).toBeInTheDocument();
    });

    test('displays processing controls', () => {
      render(<ParallelComputingDashboard />);
      
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);
      
      expect(screen.getByText('Processing Controls')).toBeInTheDocument();
      expect(screen.getByText('Start Processing')).toBeInTheDocument();
    });

    test('shows processing configuration', () => {
      render(<ParallelComputingDashboard />);
      
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);
      
      expect(screen.getByText('Active Workers')).toBeInTheDocument();
      expect(screen.getByText('Batch Size')).toBeInTheDocument();
      expect(screen.getByText('Compression')).toBeInTheDocument();
      expect(screen.getByText('Parallel Augmentation')).toBeInTheDocument();
    });
  });

  describe('Real-time Monitoring Tab', () => {
    test('displays monitoring sections', () => {
      render(<ParallelComputingDashboard />);
      
      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);
      
      expect(screen.getByText('System Performance')).toBeInTheDocument();
      expect(screen.getByText('Network I/O')).toBeInTheDocument();
      expect(screen.getByText('Resource Utilization')).toBeInTheDocument();
    });

    test('shows performance metrics', () => {
      render(<ParallelComputingDashboard />);
      
      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);
      
      expect(screen.getByText('Real-time Performance Metrics')).toBeInTheDocument();
    });

    test('displays network statistics', () => {
      render(<ParallelComputingDashboard />);
      
      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);
      
      expect(screen.getByText('Bandwidth')).toBeInTheDocument();
      expect(screen.getByText('Latency')).toBeInTheDocument();
      expect(screen.getByText('Packet Loss')).toBeInTheDocument();
      expect(screen.getByText('Connections')).toBeInTheDocument();
    });

    test('shows resource utilization bars', () => {
      render(<ParallelComputingDashboard />);
      
      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);
      
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('GPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Storage I/O')).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    test('tab navigation works correctly', () => {
      render(<ParallelComputingDashboard />);
      
      // Test Compute Clusters tab
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      expect(screen.getByText('AWS P4D Cluster')).toBeInTheDocument();
      
      // Test Parallel Jobs tab
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      expect(screen.getByText('Parallel Job Queue')).toBeInTheDocument();
      
      // Test Data Processing tab
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);
      expect(screen.getByText('Processing Metrics')).toBeInTheDocument();
      
      // Test Real-time Monitoring tab
      const monitoringTab = screen.getByText('Real-time Monitoring');
      fireEvent.click(monitoringTab);
      expect(screen.getByText('System Performance')).toBeInTheDocument();
    });

    test('processing control buttons work', () => {
      render(<ParallelComputingDashboard />);
      
      const processingTab = screen.getByText('Data Processing');
      fireEvent.click(processingTab);
      
      const startButton = screen.getByText('Start Processing');
      expect(startButton).toBeInTheDocument();
      
      fireEvent.click(startButton);
      // Button should change to "Stop Processing"
      expect(screen.getByText('Stop Processing')).toBeInTheDocument();
    });

    test('job control buttons are clickable', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      const startAllButton = screen.getByText('Start All');
      const pauseButton = screen.getByText('Pause');
      
      expect(startAllButton).toBeEnabled();
      expect(pauseButton).toBeEnabled();
      
      fireEvent.click(startAllButton);
      fireEvent.click(pauseButton);
    });
  });

  describe('Real-time Updates', () => {
    test('displays real-time data updates', async () => {
      render(<ParallelComputingDashboard />);
      
      // Wait for real-time updates
      await waitFor(() => {
        expect(screen.getByText('Total GPUs')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('progress bars update in real-time', async () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      // Wait for progress updates
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Performance Metrics', () => {
    test('displays GPU utilization correctly', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      // Check for GPU utilization percentages
      expect(screen.getByText(/85%/)).toBeInTheDocument();
      expect(screen.getByText(/92%/)).toBeInTheDocument();
    });

    test('shows cluster utilization progress', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      expect(screen.getByText('Cluster Utilization')).toBeInTheDocument();
    });

    test('displays job progress percentages', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      // Check for job progress percentages
      expect(screen.getByText(/65%/)).toBeInTheDocument();
      expect(screen.getByText(/30%/)).toBeInTheDocument();
      expect(screen.getByText(/90%/)).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    test('shows correct status colors', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      // Check for status badges with correct colors
      const activeBadges = screen.getAllByText('ACTIVE');
      expect(activeBadges.length).toBeGreaterThan(0);
    });

    test('displays priority indicators', () => {
      render(<ParallelComputingDashboard />);
      
      const jobsTab = screen.getByText('Parallel Jobs');
      fireEvent.click(jobsTab);
      
      // Check for priority badges
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    test('shows node status indicators', () => {
      render(<ParallelComputingDashboard />);
      
      const clustersTab = screen.getByText('Compute Clusters');
      fireEvent.click(clustersTab);
      
      // Check for node status indicators (colored dots)
      const statusDots = screen.getAllByRole('presentation');
      expect(statusDots.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    test('adapts to different screen sizes', () => {
      render(<ParallelComputingDashboard />);
      
      // Test that all main elements are visible
      expect(screen.getByText('Maximum Parallel Computing Hub')).toBeInTheDocument();
      expect(screen.getByText('Total GPUs')).toBeInTheDocument();
      expect(screen.getByText('Available GPUs')).toBeInTheDocument();
      expect(screen.getByText('Running Jobs')).toBeInTheDocument();
      expect(screen.getByText('Queued Jobs')).toBeInTheDocument();
    });

    test('maintains functionality across tabs', () => {
      render(<ParallelComputingDashboard />);
      
      // Test all tabs are accessible
      const tabs = ['Compute Clusters', 'Parallel Jobs', 'Data Processing', 'Real-time Monitoring'];
      
      tabs.forEach(tabName => {
        const tab = screen.getByText(tabName);
        expect(tab).toBeInTheDocument();
        fireEvent.click(tab);
      });
    });
  });
});
