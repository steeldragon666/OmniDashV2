import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnterpriseAITrainingHub from '@/components/toolsets/EnterpriseAITrainingHub';

// Mock the API
jest.mock('@/lib/api/enterprise-ai', () => ({
  useEnterpriseAI: () => ({
    api: {
      optimizeConfiguration: jest.fn().mockResolvedValue({
        success: true,
        config: {
          gpus: 32,
          nodes: 4,
          instanceType: 'p3.16xlarge',
          estimatedTime: '3 hours',
          datasamples: '25M samples',
          expectedAccuracy: '92%',
          costBreakdown: {
            compute: 4000,
            storage: 400,
            network: 300
          }
        }
      }),
      startTraining: jest.fn().mockResolvedValue({
        success: true,
        jobId: 'test-job-123',
        status: 'PENDING'
      })
    },
    startTrainingWithRealtime: jest.fn()
  })
}));

describe('EnterpriseAITrainingHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the main interface', () => {
    render(<EnterpriseAITrainingHub />);
    
    expect(screen.getByText('Enterprise AI Training Hub')).toBeInTheDocument();
    expect(screen.getByText('Training Budget')).toBeInTheDocument();
    expect(screen.getByText('START AI TRAINING')).toBeInTheDocument();
  });

  test('updates budget input correctly', () => {
    render(<EnterpriseAITrainingHub />);
    
    const budgetInput = screen.getByDisplayValue('5000');
    fireEvent.change(budgetInput, { target: { value: '10000' } });
    
    expect(budgetInput).toHaveValue(10000);
  });

  test('changes priority selection', () => {
    render(<EnterpriseAITrainingHub />);
    
    const prioritySelect = screen.getByRole('combobox');
    fireEvent.click(prioritySelect);
    
    const speedOption = screen.getByText('⚡ Speed Optimized');
    fireEvent.click(speedOption);
    
    expect(prioritySelect).toHaveTextContent('⚡ Speed Optimized');
  });

  test('changes cloud provider selection', () => {
    render(<EnterpriseAITrainingHub />);
    
    const cloudSelect = screen.getAllByRole('combobox')[1];
    fireEvent.click(cloudSelect);
    
    const gcpOption = screen.getByText('🔵 Google Cloud');
    fireEvent.click(gcpOption);
    
    expect(cloudSelect).toHaveTextContent('🔵 Google Cloud');
  });

  test('changes data size selection', () => {
    render(<EnterpriseAITrainingHub />);
    
    const dataSizeSelect = screen.getAllByRole('combobox')[2];
    fireEvent.click(dataSizeSelect);
    
    const xlargeOption = screen.getByText('🗃️ XLarge (1B+ samples)');
    fireEvent.click(xlargeOption);
    
    expect(dataSizeSelect).toHaveTextContent('🗃️ XLarge (1B+ samples)');
  });

  test('displays optimized configuration when budget changes', async () => {
    render(<EnterpriseAITrainingHub />);
    
    const budgetInput = screen.getByDisplayValue('5000');
    fireEvent.change(budgetInput, { target: { value: '8000' } });
    
    await waitFor(() => {
      expect(screen.getByText('AI-Optimized Configuration')).toBeInTheDocument();
    });
  });

  test('start training button is disabled when budget is too low', () => {
    render(<EnterpriseAITrainingHub />);
    
    const budgetInput = screen.getByDisplayValue('5000');
    fireEvent.change(budgetInput, { target: { value: '50' } });
    
    const startButton = screen.getByText('START AI TRAINING');
    expect(startButton).toBeDisabled();
  });

  test('start training button is enabled with valid budget', () => {
    render(<EnterpriseAITrainingHub />);
    
    const startButton = screen.getByText('START AI TRAINING');
    expect(startButton).toBeEnabled();
  });

  test('shows training status when training starts', async () => {
    render(<EnterpriseAITrainingHub />);
    
    const startButton = screen.getByText('START AI TRAINING');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('TRAINING IN PROGRESS')).toBeInTheDocument();
    });
  });

  test('displays GPU cluster status', () => {
    render(<EnterpriseAITrainingHub />);
    
    expect(screen.getByText('GPU Cluster Status')).toBeInTheDocument();
    expect(screen.getByText('Active GPUs')).toBeInTheDocument();
  });

  test('shows cost tracking information', () => {
    render(<EnterpriseAITrainingHub />);
    
    expect(screen.getByText('Cost Tracking')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  test('displays deployment status section', () => {
    render(<EnterpriseAITrainingHub />);
    
    expect(screen.getByText('Model Deployment')).toBeInTheDocument();
    expect(screen.getByText('Awaiting model completion')).toBeInTheDocument();
  });

  test('shows training overview tab content', () => {
    render(<EnterpriseAITrainingHub />);
    
    expect(screen.getByText('Training Overview')).toBeInTheDocument();
    expect(screen.getByText('Training Pipeline Overview')).toBeInTheDocument();
  });

  test('shows advanced settings tab content', () => {
    render(<EnterpriseAITrainingHub />);
    
    const advancedTab = screen.getByText('Advanced Settings');
    fireEvent.click(advancedTab);
    
    expect(screen.getByText('Advanced Configuration')).toBeInTheDocument();
    expect(screen.getByText('Model Architecture')).toBeInTheDocument();
  });

  test('shows training history tab content', () => {
    render(<EnterpriseAITrainingHub />);
    
    const historyTab = screen.getByText('Training History');
    fireEvent.click(historyTab);
    
    expect(screen.getByText('Previous Training Runs')).toBeInTheDocument();
  });

  test('shows API integration tab content', () => {
    render(<EnterpriseAITrainingHub />);
    
    const apiTab = screen.getByText('API Integration');
    fireEvent.click(apiTab);
    
    expect(screen.getByText('API Integration')).toBeInTheDocument();
    expect(screen.getByText('API Endpoint')).toBeInTheDocument();
  });
});
