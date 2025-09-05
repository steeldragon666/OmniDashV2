import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User'
          },
          expires: '2024-12-31T23:59:59.000Z'
        })
      });
    });

    // Mock dashboard stats API
    await page.route('/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalWorkflows: 12,
          activeWorkflows: 8,
          completedExecutions: 156,
          failedExecutions: 4,
          recentActivity: [
            {
              id: '1',
              type: 'workflow_completed',
              message: 'Daily report workflow completed successfully',
              timestamp: '2024-01-15T10:30:00Z'
            },
            {
              id: '2',
              type: 'workflow_failed',
              message: 'Data sync workflow failed',
              timestamp: '2024-01-15T09:45:00Z'
            }
          ]
        })
      });
    });

    await page.goto('/dashboard');
  });

  test('should display dashboard overview correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/welcome back, test user/i)).toBeVisible();
    
    // Check stats cards
    await expect(page.getByText('12').first()).toBeVisible(); // Total workflows
    await expect(page.getByText('8').first()).toBeVisible(); // Active workflows
    await expect(page.getByText('156').first()).toBeVisible(); // Completed executions
    await expect(page.getByText('4').first()).toBeVisible(); // Failed executions
  });

  test('should show recent activity feed', async ({ page }) => {
    const activitySection = page.getByTestId('recent-activity');
    await expect(activitySection).toBeVisible();
    
    await expect(page.getByText(/daily report workflow completed/i)).toBeVisible();
    await expect(page.getByText(/data sync workflow failed/i)).toBeVisible();
    
    // Check timestamps are displayed
    await expect(page.getByText(/10:30/i)).toBeVisible();
    await expect(page.getByText(/09:45/i)).toBeVisible();
  });

  test('should handle stats loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/dashboard/stats', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ totalWorkflows: 5 })
      });
    });

    await page.reload();
    
    // Should show loading skeletons
    await expect(page.getByTestId('stats-loading')).toBeVisible();
    
    // Wait for data to load
    await expect(page.getByText('5').first()).toBeVisible();
    await expect(page.getByTestId('stats-loading')).not.toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.reload();
    
    await expect(page.getByText(/error loading dashboard/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should refresh data when retry button is clicked', async ({ page }) => {
    let callCount = 0;
    await page.route('/api/dashboard/stats', async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({ status: 500 });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ totalWorkflows: 10 })
        });
      }
    });

    await page.reload();
    
    // First load fails
    await expect(page.getByText(/error loading dashboard/i)).toBeVisible();
    
    // Click retry
    await page.getByRole('button', { name: /retry/i }).click();
    
    // Should show success
    await expect(page.getByText('10').first()).toBeVisible();
    await expect(page.getByText(/error loading dashboard/i)).not.toBeVisible();
  });

  test('should navigate to workflows page', async ({ page }) => {
    await page.getByRole('link', { name: /view all workflows/i }).click();
    await expect(page).toHaveURL('/workflows');
  });

  test('should have responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Stats should stack vertically on mobile
    const statsContainer = page.getByTestId('stats-grid');
    await expect(statsContainer).toBeVisible();
    
    // Navigation should be accessible
    const mobileMenu = page.getByRole('button', { name: /menu/i });
    await expect(mobileMenu).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Stats should be in 2x2 grid on tablet
    await expect(statsContainer).toBeVisible();
  });

  test('should handle real-time updates', async ({ page }) => {
    // Mock WebSocket connection for real-time updates
    await page.evaluate(() => {
      // Simulate real-time update
      const event = new CustomEvent('dashboard-update', {
        detail: {
          type: 'workflow_completed',
          data: { totalWorkflows: 13 }
        }
      });
      window.dispatchEvent(event);
    });

    // Check if stats are updated
    await expect(page.getByText('13').first()).toBeVisible();
  });

  test('should display user profile in header', async ({ page }) => {
    await expect(page.getByText(/test user/i)).toBeVisible();
    await expect(page.getByText(/test@example.com/i)).toBeVisible();
    
    // Test profile dropdown
    await page.getByRole('button', { name: /user menu/i }).click();
    await expect(page.getByRole('menuitem', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();
  });

  test('should handle logout functionality', async ({ page }) => {
    await page.route('/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.getByRole('button', { name: /user menu/i }).click();
    await page.getByRole('menuitem', { name: /logout/i }).click();
    
    await expect(page).toHaveURL('/auth/login');
  });

  test('should show quick actions section', async ({ page }) => {
    const quickActions = page.getByTestId('quick-actions');
    await expect(quickActions).toBeVisible();
    
    await expect(page.getByRole('button', { name: /create workflow/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /run diagnostics/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /view logs/i })).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /workflows/i })).toBeFocused();
    
    // Test escape key for closing modals
    await page.getByRole('button', { name: /user menu/i }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).not.toBeVisible();
  });
});