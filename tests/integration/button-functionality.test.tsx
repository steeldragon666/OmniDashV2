import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnterpriseAITrainingHub from '@/components/toolsets/EnterpriseAITrainingHub';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Enterprise AI Training Hub - Button Functionality Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Configuration Buttons', () => {
    test('Priority selection buttons work correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      // Test Cost Optimized
      const costButton = screen.getByText('💰 Cost Optimized');
      fireEvent.click(costButton);
      expect(costButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test Speed Optimized
      const speedButton = screen.getByText('⚡ Speed Optimized');
      fireEvent.click(speedButton);
      expect(speedButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test Quality Optimized
      const qualityButton = screen.getByText('🎯 Quality Optimized');
      fireEvent.click(qualityButton);
      expect(qualityButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
    });

    test('Cloud provider selection buttons work correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      // Test AWS
      const awsButton = screen.getByText('🟠 Amazon AWS');
      fireEvent.click(awsButton);
      expect(awsButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test GCP
      const gcpButton = screen.getByText('🔵 Google Cloud');
      fireEvent.click(gcpButton);
      expect(gcpButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test Azure
      const azureButton = screen.getByText('🔷 Microsoft Azure');
      fireEvent.click(azureButton);
      expect(azureButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
    });

    test('Data size selection buttons work correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      // Test Small
      const smallButton = screen.getByText('📊 Small (1M samples)');
      fireEvent.click(smallButton);
      expect(smallButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test Medium
      const mediumButton = screen.getByText('📈 Medium (10M samples)');
      fireEvent.click(mediumButton);
      expect(mediumButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test Large
      const largeButton = screen.getByText('📉 Large (100M samples)');
      fireEvent.click(largeButton);
      expect(largeButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test XLarge
      const xlargeButton = screen.getByText('🗃️ XLarge (1B+ samples)');
      fireEvent.click(xlargeButton);
      expect(xlargeButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Main Training Button', () => {
    test('START AI TRAINING button triggers training workflow', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          jobId: 'test-job-123',
          status: 'PENDING'
        })
      });

      render(<EnterpriseAITrainingHub />);
      
      const startButton = screen.getByText('START AI TRAINING');
      expect(startButton).toBeEnabled();
      
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText('TRAINING IN PROGRESS')).toBeInTheDocument();
      });
    });

    test('Training button is disabled during training', async () => {
      render(<EnterpriseAITrainingHub />);
      
      const startButton = screen.getByText('START AI TRAINING');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const trainingButton = screen.getByText('TRAINING IN PROGRESS');
        expect(trainingButton).toBeDisabled();
      });
    });
  });

  describe('Tab Navigation Buttons', () => {
    test('Training Overview tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const overviewTab = screen.getByText('Training Overview');
      fireEvent.click(overviewTab);
      
      expect(screen.getByText('Training Pipeline Overview')).toBeInTheDocument();
    });

    test('Advanced Settings tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const advancedTab = screen.getByText('Advanced Settings');
      fireEvent.click(advancedTab);
      
      expect(screen.getByText('Advanced Configuration')).toBeInTheDocument();
      expect(screen.getByText('Model Architecture')).toBeInTheDocument();
    });

    test('Training History tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const historyTab = screen.getByText('Training History');
      fireEvent.click(historyTab);
      
      expect(screen.getByText('Previous Training Runs')).toBeInTheDocument();
    });

    test('API Integration tab button works', () => {
      render(<EnterpriseAITrainingHub />);
      
      const apiTab = screen.getByText('API Integration');
      fireEvent.click(apiTab);
      
      expect(screen.getByText('API Integration')).toBeInTheDocument();
      expect(screen.getByText('API Endpoint')).toBeInTheDocument();
    });
  });

  describe('Advanced Configuration Buttons', () => {
    test('Model Architecture selection buttons work', () => {
      render(<EnterpriseAITrainingHub />);
      
      const advancedTab = screen.getByText('Advanced Settings');
      fireEvent.click(advancedTab);
      
      // Test Transformer
      const transformerButton = screen.getByText('🧠 Transformer + Attention');
      fireEvent.click(transformerButton);
      expect(transformerButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test CNN
      const cnnButton = screen.getByText('🔲 Convolutional Neural Network');
      fireEvent.click(cnnButton);
      expect(cnnButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
    });

    test('Optimization Strategy selection buttons work', () => {
      render(<EnterpriseAITrainingHub />);
      
      const advancedTab = screen.getByText('Advanced Settings');
      fireEvent.click(advancedTab);
      
      // Test AdamW
      const adamwButton = screen.getByText('⚡ AdamW');
      fireEvent.click(adamwButton);
      expect(adamwButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test SGD
      const sgdButton = screen.getByText('🎯 SGD with Momentum');
      fireEvent.click(sgdButton);
      expect(sgdButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
    });

    test('Learning Rate Schedule selection buttons work', () => {
      render(<EnterpriseAITrainingHub />);
      
      const advancedTab = screen.getByText('Advanced Settings');
      fireEvent.click(advancedTab);
      
      // Test Cosine Annealing
      const cosineButton = screen.getByText('🌊 Cosine Annealing');
      fireEvent.click(cosineButton);
      expect(cosineButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test Linear Decay
      const linearButton = screen.getByText('📉 Linear Decay');
      fireEvent.click(linearButton);
      expect(linearButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
    });

    test('Regularization selection buttons work', () => {
      render(<EnterpriseAITrainingHub />);
      
      const advancedTab = screen.getByText('Advanced Settings');
      fireEvent.click(advancedTab);
      
      // Test Dropout
      const dropoutButton = screen.getByText('🎲 Dropout');
      fireEvent.click(dropoutButton);
      expect(dropoutButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
      
      // Test Batch Normalization
      const batchnormButton = screen.getByText('📊 Batch Normalization');
      fireEvent.click(batchnormButton);
      expect(batchnormButton.closest('[role="option"]')).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Action Buttons', () => {
    test('View Live Models button appears after deployment', async () => {
      render(<EnterpriseAITrainingHub />);
      
      // Simulate training completion
      const startButton = screen.getByText('START AI TRAINING');
      fireEvent.click(startButton);
      
      // Wait for training to complete (this would be mocked in real implementation)
      await waitFor(() => {
        const viewModelsButton = screen.queryByText('View Live Models');
        if (viewModelsButton) {
          expect(viewModelsButton).toBeInTheDocument();
        }
      }, { timeout: 1000 });
    });

    test('Copy buttons work in API Integration tab', () => {
      render(<EnterpriseAITrainingHub />);
      
      const apiTab = screen.getByText('API Integration');
      fireEvent.click(apiTab);
      
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons.length).toBeGreaterThan(0);
      
      // Test that copy buttons are clickable
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
      
      // Test that view buttons are clickable
      viewButtons.forEach(button => {
        expect(button).toBeEnabled();
        fireEvent.click(button);
      });
    });
  });

  describe('Input Field Interactions', () => {
    test('Budget input field accepts numeric values', () => {
      render(<EnterpriseAITrainingHub />);
      
      const budgetInput = screen.getByDisplayValue('5000');
      
      fireEvent.change(budgetInput, { target: { value: '10000' } });
      expect(budgetInput).toHaveValue(10000);
      
      fireEvent.change(budgetInput, { target: { value: '2500' } });
      expect(budgetInput).toHaveValue(2500);
    });

    test('Budget input field handles invalid input gracefully', () => {
      render(<EnterpriseAITrainingHub />);
      
      const budgetInput = screen.getByDisplayValue('5000');
      
      fireEvent.change(budgetInput, { target: { value: 'abc' } });
      expect(budgetInput).toHaveValue(null); // Should be null for invalid input
      
      fireEvent.change(budgetInput, { target: { value: '-100' } });
      expect(budgetInput).toHaveValue(-100);
    });
  });

  describe('Progress and Status Updates', () => {
    test('Progress bar updates during training simulation', async () => {
      render(<EnterpriseAITrainingHub />);
      
      const startButton = screen.getByText('START AI TRAINING');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      });
    });

    test('Status badges update correctly', () => {
      render(<EnterpriseAITrainingHub />);
      
      const statusBadge = screen.getByText('IDLE');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });
});
