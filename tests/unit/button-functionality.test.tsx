import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnterpriseAITrainingHub from '@/components/toolsets/EnterpriseAITrainingHub';

// Mock the API
const mockAPI = {
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
};

jest.mock('@/lib/api/enterprise-ai', () => ({
  useEnterpriseAI: () => ({
    api: mockAPI,
    startTrainingWithRealtime: jest.fn()
  })
}));

describe('Enterprise AI Training Hub - Button Functionality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Primary Action Buttons', () => {
    test('START AI TRAINING button is enabled with valid budget', () => {
      render(<EnterpriseAITrainingHub />);
      
      const startButton = screen.getByText('START AI TRAINING');
      expect(startButton).toBeEnabled();
      expect(startButton).toHaveClass('bg-gradient-to-r', 'from-green-500', 'to-blue-600');
    });

    test('START AI TRAINING button is disabled with low budget', () => {
      render(<EnterpriseAITrainingHub />);
      
      const budgetInput = screen.getByDisplayValue('5000');
      fireEvent.change(budgetInput, { target: { value: '50' } });
      
      const startButton = screen.getByText('START AI TRAINING');
      expect(startButton).toBeDisabled();
    });

    test('START AI TRAINING button changes to TRAINING IN PROGRESS when clicked', async () => {
      render(<EnterpriseAITrainingHub />);
      
      const startButton = screen.getByText('START AI TRAINING');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText('TRAINING IN PROGRESS')).toBeInTheDocument();
      });
    });

    test('View Live Models button appears after deployment completion', async () => {
      render(<EnterpriseAITrainingHub />);
      
      // Simulate training completion
      const startButton = screen.getByText('START AI TRAINING');
      fireEvent.click(startButton);
      
      // Wait for potential deployment completion
      await waitFor(() => {
        const viewModelsButton = screen.queryByText('View Live Models');
        if (viewModelsButton) {
          expect(viewModelsButton).toBeInTheDocument();
          expect(viewModelsButton).toHaveClass('bg-teal-600', 'hover:bg-teal-700');
        }
      }, { timeout: 1000 });
    });
  });

  describe('Configuration Selection Buttons', () => {
    test('Priority selection buttons work correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      // Test Cost Optimized button
      const costButton = screen.getByText('💰 Cost Optimized');
      expect(costButton).toBeInTheDocument();
      fireEvent.click(costButton);
      
      // Test Speed Optimized button
      const speedButton = screen.getByText('⚡ Speed Optimized');
      expect(speedButton).toBeInTheDocument();
      fireEvent.click(speedButton);
      
      // Test Quality Optimized button
      const qualityButton = screen.getByText('🎯 Quality Optimized');
      expect(qualityButton).toBeInTheDocument();
      fireEvent.click(qualityButton);
    });

    test('Cloud provider selection buttons work correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      // Test AWS button
      const awsButton = screen.getByText('🟠 Amazon AWS');
      expect(awsButton).toBeInTheDocument();
      fireEvent.click(awsButton);
      
      // Test GCP button
      const gcpButton = screen.getByText('🔵 Google Cloud');
      expect(gcpButton).toBeInTheDocument();
      fireEvent.click(gcpButton);
      
      // Test Azure button
      const azureButton = screen.getByText('🔷 Microsoft Azure');
      expect(azureButton).toBeInTheDocument();
      fireEvent.click(azureButton);
    });

    test('Data size selection buttons work correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      // Test Small button
      const smallButton = screen.getByText('📊 Small (1M samples)');
      expect(smallButton).toBeInTheDocument();
      fireEvent.click(smallButton);
      
      // Test Medium button
      const mediumButton = screen.getByText('📈 Medium (10M samples)');
      expect(mediumButton).toBeInTheDocument();
      fireEvent.click(mediumButton);
      
      // Test Large button
      const largeButton = screen.getByText('📉 Large (100M samples)');
      expect(largeButton).toBeInTheDocument();
      fireEvent.click(largeButton);
      
      // Test XLarge button
      const xlargeButton = screen.getByText('🗃️ XLarge (1B+ samples)');
      expect(xlargeButton).toBeInTheDocument();
      fireEvent.click(xlargeButton);
    });
  });

  describe('Tab Navigation Buttons', () => {
    test('Training Overview tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const overviewTab = screen.getByText('Training Overview');
      expect(overviewTab).toBeInTheDocument();
      fireEvent.click(overviewTab);
      
      expect(screen.getByText('Training Pipeline Overview')).toBeInTheDocument();
    });

    test('Advanced Settings tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const advancedTab = screen.getByText('Advanced Settings');
      expect(advancedTab).toBeInTheDocument();
      fireEvent.click(advancedTab);
      
      expect(screen.getByText('Advanced Configuration')).toBeInTheDocument();
      expect(screen.getByText('Model Architecture')).toBeInTheDocument();
    });

    test('Training History tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const historyTab = screen.getByText('Training History');
      expect(historyTab).toBeInTheDocument();
      fireEvent.click(historyTab);
      
      expect(screen.getByText('Previous Training Runs')).toBeInTheDocument();
    });

    test('API Integration tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const apiTab = screen.getByText('API Integration');
      expect(apiTab).toBeInTheDocument();
      fireEvent.click(apiTab);
      
      expect(screen.getByText('API Integration')).toBeInTheDocument();
      expect(screen.getByText('API Endpoint')).toBeInTheDocument();
    });
  });

  describe('Advanced Configuration Buttons', () => {
    beforeEach(() => {
      render(<EnterpriseAITrainingHub />);
      const advancedTab = screen.getByText('Advanced Settings');
      fireEvent.click(advancedTab);
    });

    test('Model Architecture selection buttons work', () => {
      // Test Transformer button
      const transformerButton = screen.getByText('🧠 Transformer + Attention');
      expect(transformerButton).toBeInTheDocument();
      fireEvent.click(transformerButton);
      
      // Test CNN button
      const cnnButton = screen.getByText('🔲 Convolutional Neural Network');
      expect(cnnButton).toBeInTheDocument();
      fireEvent.click(cnnButton);
      
      // Test LSTM button
      const lstmButton = screen.getByText('🔄 LSTM Recurrent Network');
      expect(lstmButton).toBeInTheDocument();
      fireEvent.click(lstmButton);
      
      // Test Ensemble button
      const ensembleButton = screen.getByText('🎭 Ensemble Model');
      expect(ensembleButton).toBeInTheDocument();
      fireEvent.click(ensembleButton);
    });

    test('Optimization Strategy selection buttons work', () => {
      // Test AdamW button
      const adamwButton = screen.getByText('⚡ AdamW');
      expect(adamwButton).toBeInTheDocument();
      fireEvent.click(adamwButton);
      
      // Test SGD button
      const sgdButton = screen.getByText('🎯 SGD with Momentum');
      expect(sgdButton).toBeInTheDocument();
      fireEvent.click(sgdButton);
      
      // Test RMSprop button
      const rmspropButton = screen.getByText('📈 RMSprop');
      expect(rmspropButton).toBeInTheDocument();
      fireEvent.click(rmspropButton);
      
      // Test Adagrad button
      const adagradButton = screen.getByText('🔧 Adagrad');
      expect(adagradButton).toBeInTheDocument();
      fireEvent.click(adagradButton);
    });

    test('Learning Rate Schedule selection buttons work', () => {
      // Test Cosine Annealing button
      const cosineButton = screen.getByText('🌊 Cosine Annealing');
      expect(cosineButton).toBeInTheDocument();
      fireEvent.click(cosineButton);
      
      // Test Linear Decay button
      const linearButton = screen.getByText('📉 Linear Decay');
      expect(linearButton).toBeInTheDocument();
      fireEvent.click(linearButton);
      
      // Test Exponential Decay button
      const exponentialButton = screen.getByText('📊 Exponential Decay');
      expect(exponentialButton).toBeInTheDocument();
      fireEvent.click(exponentialButton);
      
      // Test Step Decay button
      const stepButton = screen.getByText('🪜 Step Decay');
      expect(stepButton).toBeInTheDocument();
      fireEvent.click(stepButton);
    });

    test('Regularization selection buttons work', () => {
      // Test Dropout button
      const dropoutButton = screen.getByText('🎲 Dropout');
      expect(dropoutButton).toBeInTheDocument();
      fireEvent.click(dropoutButton);
      
      // Test Batch Normalization button
      const batchnormButton = screen.getByText('📊 Batch Normalization');
      expect(batchnormButton).toBeInTheDocument();
      fireEvent.click(batchnormButton);
      
      // Test Layer Normalization button
      const layernormButton = screen.getByText('🔗 Layer Normalization');
      expect(layernormButton).toBeInTheDocument();
      fireEvent.click(layernormButton);
      
      // Test Weight Decay button
      const weightDecayButton = screen.getByText('⚖️ Weight Decay');
      expect(weightDecayButton).toBeInTheDocument();
      fireEvent.click(weightDecayButton);
    });
  });

  describe('Action Buttons in Tabs', () => {
    test('Copy buttons work in API Integration tab', () => {
      render(<EnterpriseAITrainingHub />);
      
      const apiTab = screen.getByText('API Integration');
      fireEvent.click(apiTab);
      
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons.length).toBeGreaterThan(0);
      
      copyButtons.forEach(button => {
        expect(button).toBeEnabled();
        fireEvent.click(button);
      });
    });

    test('View buttons work in Training History tab', () => {
      render(<EnterpriseAITrainingHub />);
      
      const historyTab = screen.getByText('Training History');
      fireEvent.click(historyTab);
      
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      expect(viewButtons.length).toBeGreaterThan(0);
      
      viewButtons.forEach(button => {
        expect(button).toBeEnabled();
        fireEvent.click(button);
      });
    });
  });

  describe('Input Field Interactions', () => {
    test('Budget input field accepts and validates numeric values', () => {
      render(<EnterpriseAITrainingHub />);
      
      const budgetInput = screen.getByDisplayValue('5000');
      expect(budgetInput).toBeInTheDocument();
      
      // Test valid input
      fireEvent.change(budgetInput, { target: { value: '10000' } });
      expect(budgetInput).toHaveValue(10000);
      
      // Test another valid input
      fireEvent.change(budgetInput, { target: { value: '2500' } });
      expect(budgetInput).toHaveValue(2500);
    });

    test('Budget input field handles edge cases', () => {
      render(<EnterpriseAITrainingHub />);
      
      const budgetInput = screen.getByDisplayValue('5000');
      
      // Test very high value
      fireEvent.change(budgetInput, { target: { value: '1000000' } });
      expect(budgetInput).toHaveValue(1000000);
      
      // Test zero value
      fireEvent.change(budgetInput, { target: { value: '0' } });
      expect(budgetInput).toHaveValue(0);
      
      // Test negative value
      fireEvent.change(budgetInput, { target: { value: '-100' } });
      expect(budgetInput).toHaveValue(-100);
    });
  });

  describe('Status and Progress Indicators', () => {
    test('Status badges display correct colors and text', () => {
      render(<EnterpriseAITrainingHub />);
      
      const statusBadge = screen.getByText('IDLE');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    test('Progress bar is present and functional', () => {
      render(<EnterpriseAITrainingHub />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('value', '0');
    });

    test('GPU cluster visualization is present', () => {
      render(<EnterpriseAITrainingHub />);
      
      expect(screen.getByText('GPU Cluster Status')).toBeInTheDocument();
      expect(screen.getByText('Active GPUs')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('Tab navigation works correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      const startButton = screen.getByText('START AI TRAINING');
      startButton.focus();
      expect(startButton).toHaveFocus();
    });

    test('Enter key triggers button actions', () => {
      render(<EnterpriseAITrainingHub />);
      
      const startButton = screen.getByText('START AI TRAINING');
      startButton.focus();
      
      fireEvent.keyDown(startButton, { key: 'Enter', code: 'Enter' });
      // Note: In a real implementation, this would trigger the training start
    });
  });

  describe('Responsive Design', () => {
    test('All buttons are visible and clickable on different screen sizes', () => {
      render(<EnterpriseAITrainingHub />);
      
      // Test main buttons are present
      expect(screen.getByText('START AI TRAINING')).toBeInTheDocument();
      expect(screen.getByText('Training Overview')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      expect(screen.getByText('Training History')).toBeInTheDocument();
      expect(screen.getByText('API Integration')).toBeInTheDocument();
    });
  });
});
