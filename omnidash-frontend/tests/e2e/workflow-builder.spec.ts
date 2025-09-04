import { test, expect } from '@playwright/test';

test.describe('Workflow Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workflow builder
    await page.goto('/workflows/new');
    
    // Wait for the builder to load
    await page.waitForSelector('[data-testid="workflow-builder"]', { timeout: 10000 });
  });

  test('should load workflow builder interface', async ({ page }) => {
    // Check that main components are present
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-header"]')).toBeVisible();

    // Check that node templates are loaded
    const nodeTemplates = page.locator('[data-testid="node-template"]');
    await expect(nodeTemplates).toHaveCount(6); // Based on our nodeTemplates array

    // Check workflow name input
    const nameInput = page.locator('input[placeholder*="workflow name"]').or(
      page.locator('input').filter({ hasText: 'New Workflow' })
    ).first();
    await expect(nameInput).toBeVisible();
  });

  test('should create a simple workflow', async ({ page }) => {
    // Set workflow name
    const nameInput = page.locator('input').first();
    await nameInput.fill('Test Automation Workflow');

    // Add a time trigger node
    const timeTrigger = page.locator('[data-testid="node-template"]').filter({ hasText: 'Schedule Trigger' });
    await timeTrigger.click();

    // Verify the node was added to canvas
    await expect(page.locator('[data-testid="workflow-node"]').first()).toBeVisible();
    
    // Add a social post action
    const socialAction = page.locator('[data-testid="node-template"]').filter({ hasText: 'Social Media Post' });
    await socialAction.click();

    // Should have 2 nodes on canvas now
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(2);

    // Save the workflow
    const saveButton = page.locator('button').filter({ hasText: 'Save' });
    await saveButton.click();

    // Wait for save confirmation
    await expect(page.locator('.toast, .notification').filter({ hasText: 'saved' })).toBeVisible({
      timeout: 5000
    });
  });

  test('should configure node properties', async ({ page }) => {
    // Add a social post node
    const socialAction = page.locator('[data-testid="node-template"]').filter({ hasText: 'Social Media Post' });
    await socialAction.click();

    // Select the node to open properties panel
    const node = page.locator('[data-testid="workflow-node"]').first();
    await node.click();

    // Properties panel should open
    await expect(page.locator('[data-testid="properties-panel"]')).toBeVisible();

    // Configure the node
    const contentField = page.locator('textarea[placeholder*="content"]').or(
      page.locator('textarea').first()
    );
    await contentField.fill('Hello from OmniDash automation!');

    // Select platforms
    const twitterCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /twitter/i }).or(
      page.locator('label').filter({ hasText: /twitter/i }).locator('input')
    );
    await twitterCheckbox.check();

    const facebookCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /facebook/i }).or(
      page.locator('label').filter({ hasText: /facebook/i }).locator('input')
    );
    await facebookCheckbox.check();

    // Close properties panel
    const closeButton = page.locator('[data-testid="properties-panel"] button').filter({ hasText: '×' });
    await closeButton.click();

    // Verify configuration was saved (properties panel should close)
    await expect(page.locator('[data-testid="properties-panel"]')).not.toBeVisible();
  });

  test('should connect nodes with workflow connections', async ({ page }) => {
    // Add trigger node
    const timeTrigger = page.locator('[data-testid="node-template"]').filter({ hasText: 'Schedule Trigger' });
    await timeTrigger.click();

    // Add action node
    const socialAction = page.locator('[data-testid="node-template"]').filter({ hasText: 'Social Media Post' });
    await socialAction.click();

    // Try to connect nodes by clicking output handle of first node
    const firstNode = page.locator('[data-testid="workflow-node"]').first();
    const outputHandle = firstNode.locator('[data-testid="output-handle"]').or(
      firstNode.locator('.output-handle, .handle-output').first()
    );
    
    if (await outputHandle.isVisible()) {
      await outputHandle.click();
    }

    // Click input handle of second node
    const secondNode = page.locator('[data-testid="workflow-node"]').nth(1);
    const inputHandle = secondNode.locator('[data-testid="input-handle"]').or(
      secondNode.locator('.input-handle, .handle-input').first()
    );
    
    if (await inputHandle.isVisible()) {
      await inputHandle.click();
    }

    // Check if connection was created
    const connection = page.locator('[data-testid="workflow-connection"]').or(
      page.locator('svg path, .connection').first()
    );
    
    // Connection might be visible after nodes are connected
    await expect(connection).toBeVisible({ timeout: 3000 });
  });

  test('should delete nodes from workflow', async ({ page }) => {
    // Add a node
    const timeTrigger = page.locator('[data-testid="node-template"]').filter({ hasText: 'Schedule Trigger' });
    await timeTrigger.click();

    // Verify node is added
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(1);

    // Select the node
    const node = page.locator('[data-testid="workflow-node"]').first();
    await node.click();

    // Delete the node (look for delete button)
    const deleteButton = node.locator('button').filter({ hasText: '×' }).or(
      node.locator('[data-testid="delete-button"]')
    );
    await deleteButton.click();

    // Verify node is deleted
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(0);
  });

  test('should zoom and pan canvas', async ({ page }) => {
    // Get initial canvas transform
    const canvas = page.locator('[data-testid="workflow-canvas"]');
    
    // Test zoom with mouse wheel
    await canvas.hover();
    await page.mouse.wheel(0, -120); // Zoom in
    
    // Wait for zoom animation
    await page.waitForTimeout(500);
    
    // Test pan by dragging
    await page.mouse.move(400, 300);
    await page.mouse.down({ button: 'middle' }); // Middle click for panning
    await page.mouse.move(450, 350);
    await page.mouse.up({ button: 'middle' });

    // Verify zoom controls work
    const resetViewButton = page.locator('button').filter({ hasText: 'Reset View' });
    await resetViewButton.click();
    
    // Should reset zoom to 100%
    await expect(page.locator('.scale-indicator, .zoom-level').filter({ hasText: '100%' })).toBeVisible({
      timeout: 2000
    });
  });

  test('should handle workflow validation', async ({ page }) => {
    // Try to save empty workflow
    const saveButton = page.locator('button').filter({ hasText: 'Save' });
    await saveButton.click();

    // Should show validation error or success message
    const validationMessage = page.locator('.error, .warning, .validation-error, .toast').first();
    
    // Wait for any validation feedback
    await expect(validationMessage).toBeVisible({ timeout: 3000 });
    
    // Now add nodes to make valid workflow
    const timeTrigger = page.locator('[data-testid="node-template"]').filter({ hasText: 'Schedule Trigger' });
    await timeTrigger.click();

    const socialAction = page.locator('[data-testid="node-template"]').filter({ hasText: 'Social Media Post' });
    await socialAction.click();

    // Save again
    await saveButton.click();

    // Should show success message
    await expect(page.locator('.success, .toast').filter({ hasText: /saved|success/i })).toBeVisible({
      timeout: 5000
    });
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Add a node first
    const timeTrigger = page.locator('[data-testid="node-template"]').filter({ hasText: 'Schedule Trigger' });
    await timeTrigger.click();

    const node = page.locator('[data-testid="workflow-node"]').first();
    await node.click();

    // Test delete with keyboard
    await page.keyboard.press('Delete');
    
    // Node should be deleted
    await expect(page.locator('[data-testid="workflow-node"]')).toHaveCount(0);

    // Test save with Ctrl+S
    await page.keyboard.press('Control+s');
    
    // Should trigger save action
    await expect(page.locator('.toast, .notification')).toBeVisible({ timeout: 3000 });
  });
});