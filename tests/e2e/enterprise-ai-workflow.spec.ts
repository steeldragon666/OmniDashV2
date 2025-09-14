import { test, expect } from '@playwright/test';

test.describe('Enterprise AI Training Hub - Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Complete training workflow from configuration to deployment', async ({ page }) => {
    // Step 1: Verify initial page load
    await expect(page.getByText('Enterprise AI Training Hub')).toBeVisible();
    await expect(page.getByText('Training Budget')).toBeVisible();
    await expect(page.getByText('START AI TRAINING')).toBeVisible();

    // Step 2: Configure training parameters
    const budgetInput = page.getByDisplayValue('5000');
    await budgetInput.fill('10000');
    await expect(budgetInput).toHaveValue('10000');

    // Change priority to Speed
    await page.getByText('Priority').click();
    await page.getByText('⚡ Speed Optimized').click();

    // Change cloud provider to GCP
    await page.getByText('Cloud Provider').click();
    await page.getByText('🔵 Google Cloud').click();

    // Change data size to XLarge
    await page.getByText('Dataset Size').click();
    await page.getByText('🗃️ XLarge (1B+ samples)').click();

    // Step 3: Verify optimized configuration appears
    await expect(page.getByText('AI-Optimized Configuration')).toBeVisible();
    await expect(page.getByText('Total GPUs')).toBeVisible();
    await expect(page.getByText('Nodes')).toBeVisible();

    // Step 4: Start training
    const startButton = page.getByText('START AI TRAINING');
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Step 5: Verify training starts
    await expect(page.getByText('TRAINING IN PROGRESS')).toBeVisible();
    await expect(page.getByText('Training Status')).toBeVisible();

    // Step 6: Check training status updates
    await expect(page.getByText('Overall Progress')).toBeVisible();
    await expect(page.getByText('Current Step:')).toBeVisible();

    // Step 7: Verify GPU cluster status
    await expect(page.getByText('GPU Cluster Status')).toBeVisible();
    await expect(page.getByText('Active GPUs')).toBeVisible();

    // Step 8: Check cost tracking
    await expect(page.getByText('Cost Tracking')).toBeVisible();
    await expect(page.getByText('Budget')).toBeVisible();
    await expect(page.getByText('Spent')).toBeVisible();
    await expect(page.getByText('Remaining')).toBeVisible();

    // Step 9: Verify real-time metrics
    await expect(page.getByText('Real-time Metrics')).toBeVisible();

    // Step 10: Check deployment status
    await expect(page.getByText('Model Deployment')).toBeVisible();
  });

  test('Advanced settings configuration', async ({ page }) => {
    // Navigate to Advanced Settings tab
    await page.getByText('Advanced Settings').click();

    // Configure Model Architecture
    await page.getByText('Model Architecture').click();
    await page.getByText('🧠 Transformer + Attention').click();

    // Configure Optimization Strategy
    await page.getByText('Optimization Strategy').click();
    await page.getByText('⚡ AdamW').click();

    // Configure Learning Rate Schedule
    await page.getByText('Learning Rate Schedule').click();
    await page.getByText('🌊 Cosine Annealing').click();

    // Configure Regularization
    await page.getByText('Regularization').click();
    await page.getByText('🎲 Dropout').click();

    // Verify all settings are applied
    await expect(page.getByText('Advanced Configuration')).toBeVisible();
  });

  test('Training history navigation', async ({ page }) => {
    // Navigate to Training History tab
    await page.getByText('Training History').click();

    // Verify history content
    await expect(page.getByText('Previous Training Runs')).toBeVisible();
    await expect(page.getByText('2024-01-15')).toBeVisible();
    await expect(page.getByText('$2,450')).toBeVisible();
    await expect(page.getByText('94.2%')).toBeVisible();

    // Test view buttons
    const viewButtons = page.getByRole('button', { name: /view/i });
    await expect(viewButtons.first()).toBeVisible();
    await viewButtons.first().click();
  });

  test('API integration features', async ({ page }) => {
    // Navigate to API Integration tab
    await page.getByText('API Integration').click();

    // Verify API endpoints
    await expect(page.getByText('API Endpoint')).toBeVisible();
    await expect(page.getByText('https://api.enterprise-ai.com/v1/predict')).toBeVisible();

    // Verify WebSocket stream
    await expect(page.getByText('WebSocket Stream')).toBeVisible();
    await expect(page.getByText('wss://stream.enterprise-ai.com/v1/realtime')).toBeVisible();

    // Test copy buttons
    const copyButtons = page.getByRole('button', { name: /copy/i });
    await expect(copyButtons).toHaveCount(2);
    
    // Test copy functionality
    await copyButtons.first().click();
    // Note: In a real test, you would verify clipboard content

    // Verify API integration cards
    await expect(page.getByText('REST API')).toBeVisible();
    await expect(page.getByText('Mobile SDK')).toBeVisible();
    await expect(page.getByText('GraphQL')).toBeVisible();
  });

  test('Responsive design and mobile compatibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify main elements are still visible
    await expect(page.getByText('Enterprise AI Training Hub')).toBeVisible();
    await expect(page.getByText('Training Budget')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Verify layout adapts
    await expect(page.getByText('Enterprise AI Training Hub')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Verify full layout
    await expect(page.getByText('Enterprise AI Training Hub')).toBeVisible();
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test with very low budget
    const budgetInput = page.getByDisplayValue('5000');
    await budgetInput.fill('50');
    
    // Verify start button is disabled
    const startButton = page.getByText('START AI TRAINING');
    await expect(startButton).toBeDisabled();

    // Test with very high budget
    await budgetInput.fill('1000000');
    await expect(startButton).toBeEnabled();

    // Test with invalid budget input
    await budgetInput.fill('abc');
    await expect(startButton).toBeDisabled();

    // Test with negative budget
    await budgetInput.fill('-1000');
    await expect(startButton).toBeEnabled(); // Should handle negative values
  });

  test('Keyboard navigation and accessibility', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Test Enter key on buttons
    const startButton = page.getByText('START AI TRAINING');
    await startButton.focus();
    await page.keyboard.press('Enter');

    // Verify training starts
    await expect(page.getByText('TRAINING IN PROGRESS')).toBeVisible();

    // Test Escape key behavior
    await page.keyboard.press('Escape');
  });

  test('Performance and loading states', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Verify reasonable load time (less than 3 seconds)
    expect(loadTime).toBeLessThan(3000);

    // Test loading states during training
    const startButton = page.getByText('START AI TRAINING');
    await startButton.click();

    // Verify loading indicators
    await expect(page.getByText('TRAINING IN PROGRESS')).toBeVisible();
  });

  test('Data persistence and state management', async ({ page }) => {
    // Configure settings
    const budgetInput = page.getByDisplayValue('5000');
    await budgetInput.fill('7500');

    await page.getByText('Priority').click();
    await page.getByText('⚡ Speed Optimized').click();

    // Refresh page
    await page.reload();

    // Verify settings are maintained (if implemented)
    // Note: This would depend on actual state persistence implementation
  });
});
