import { test, expect } from '@playwright/test';

test.describe('Workflow Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user123', email: 'test@example.com', name: 'Test User' }
        })
      });
    });

    // Mock workflows API
    await page.route('/api/automation/workflows', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workflows: [
              {
                id: 'wf-1',
                name: 'Daily Email Report',
                description: 'Send daily analytics report via email',
                status: 'active',
                created_at: '2024-01-10T09:00:00Z',
                last_run: '2024-01-15T09:00:00Z',
                next_run: '2024-01-16T09:00:00Z',
                executions: 45,
                success_rate: 0.98
              },
              {
                id: 'wf-2',
                name: 'Data Backup',
                description: 'Backup important data to cloud storage',
                status: 'paused',
                created_at: '2024-01-05T12:00:00Z',
                last_run: '2024-01-14T12:00:00Z',
                next_run: null,
                executions: 12,
                success_rate: 1.0
              }
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 2,
              totalPages: 1
            }
          })
        });
      }
    });

    await page.goto('/workflows');
  });

  test('should display workflows list correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /workflows/i })).toBeVisible();
    
    // Check workflow cards
    await expect(page.getByText('Daily Email Report')).toBeVisible();
    await expect(page.getByText('Data Backup')).toBeVisible();
    
    // Check workflow details
    await expect(page.getByText(/send daily analytics report/i)).toBeVisible();
    await expect(page.getByText(/backup important data/i)).toBeVisible();
    
    // Check status badges
    await expect(page.getByText('Active').first()).toBeVisible();
    await expect(page.getByText('Paused').first()).toBeVisible();
  });

  test('should filter workflows by status', async ({ page }) => {
    await page.route('/api/automation/workflows?status=active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: [
            {
              id: 'wf-1',
              name: 'Daily Email Report',
              status: 'active'
            }
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        })
      });
    });

    await page.getByRole('combobox', { name: /filter by status/i }).click();
    await page.getByRole('option', { name: /active/i }).click();
    
    await expect(page.getByText('Daily Email Report')).toBeVisible();
    await expect(page.getByText('Data Backup')).not.toBeVisible();
  });

  test('should search workflows by name', async ({ page }) => {
    await page.route('/api/automation/workflows?search=email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: [
            {
              id: 'wf-1',
              name: 'Daily Email Report',
              status: 'active'
            }
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        })
      });
    });

    await page.getByPlaceholder(/search workflows/i).fill('email');
    await page.keyboard.press('Enter');
    
    await expect(page.getByText('Daily Email Report')).toBeVisible();
    await expect(page.getByText('Data Backup')).not.toBeVisible();
  });

  test('should create new workflow', async ({ page }) => {
    await page.route('/api/automation/workflows', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            workflow: {
              id: 'wf-new',
              name: 'New Workflow',
              status: 'draft'
            }
          })
        });
      }
    });

    await page.getByRole('button', { name: /create workflow/i }).click();
    
    // Fill out workflow creation form
    await page.getByLabel(/workflow name/i).fill('New Test Workflow');
    await page.getByLabel(/description/i).fill('A test workflow for automation');
    
    // Select trigger type
    await page.getByRole('combobox', { name: /trigger type/i }).click();
    await page.getByRole('option', { name: /schedule/i }).click();
    
    // Set schedule
    await page.getByLabel(/schedule/i).fill('0 9 * * *');
    
    // Add action
    await page.getByRole('button', { name: /add action/i }).click();
    await page.getByRole('combobox', { name: /action type/i }).click();
    await page.getByRole('option', { name: /email/i }).click();
    
    await page.getByLabel(/email recipients/i).fill('test@example.com');
    await page.getByLabel(/email template/i).fill('daily-report');
    
    // Save workflow
    await page.getByRole('button', { name: /create workflow/i }).click();
    
    await expect(page.getByText(/workflow created successfully/i)).toBeVisible();
  });

  test('should edit existing workflow', async ({ page }) => {
    await page.route('/api/automation/workflows/wf-1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'wf-1',
            name: 'Daily Email Report',
            description: 'Send daily analytics report via email',
            triggers: [{
              type: 'schedule',
              schedule: '0 9 * * *'
            }],
            actions: [{
              type: 'email',
              recipients: ['admin@company.com'],
              template: 'daily-analytics'
            }]
          })
        });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    // Click edit button on first workflow
    await page.getByTestId('workflow-wf-1').getByRole('button', { name: /edit/i }).click();
    
    // Update workflow name
    await page.getByLabel(/workflow name/i).clear();
    await page.getByLabel(/workflow name/i).fill('Updated Email Report');
    
    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();
    
    await expect(page.getByText(/workflow updated successfully/i)).toBeVisible();
  });

  test('should pause and resume workflows', async ({ page }) => {
    await page.route('/api/automation/workflows/wf-1/pause', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'paused' })
      });
    });

    await page.route('/api/automation/workflows/wf-2/resume', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'active' })
      });
    });

    // Pause active workflow
    await page.getByTestId('workflow-wf-1').getByRole('button', { name: /pause/i }).click();
    await expect(page.getByText(/workflow paused/i)).toBeVisible();
    
    // Resume paused workflow
    await page.getByTestId('workflow-wf-2').getByRole('button', { name: /resume/i }).click();
    await expect(page.getByText(/workflow resumed/i)).toBeVisible();
  });

  test('should delete workflow with confirmation', async ({ page }) => {
    await page.route('/api/automation/workflows/wf-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    // Click delete button
    await page.getByTestId('workflow-wf-1').getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion
    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
    await page.getByRole('button', { name: /confirm delete/i }).click();
    
    await expect(page.getByText(/workflow deleted successfully/i)).toBeVisible();
  });

  test('should execute workflow manually', async ({ page }) => {
    await page.route('/api/automation/workflows/wf-1/execute', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executionId: 'exec-123',
          status: 'running'
        })
      });
    });

    await page.getByTestId('workflow-wf-1').getByRole('button', { name: /run now/i }).click();
    
    await expect(page.getByText(/workflow execution started/i)).toBeVisible();
    await expect(page.getByText(/execution id: exec-123/i)).toBeVisible();
  });

  test('should view workflow execution history', async ({ page }) => {
    await page.route('/api/automation/workflows/wf-1/executions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executions: [
            {
              id: 'exec-1',
              startTime: '2024-01-15T09:00:00Z',
              endTime: '2024-01-15T09:02:30Z',
              status: 'completed',
              duration: 150000,
              result: { emailsSent: 5 }
            },
            {
              id: 'exec-2',
              startTime: '2024-01-14T09:00:00Z',
              endTime: '2024-01-14T09:01:45Z',
              status: 'failed',
              duration: 105000,
              error: 'SMTP connection timeout'
            }
          ]
        })
      });
    });

    await page.getByTestId('workflow-wf-1').getByRole('button', { name: /view history/i }).click();
    
    await expect(page.getByText(/execution history/i)).toBeVisible();
    await expect(page.getByText('exec-1')).toBeVisible();
    await expect(page.getByText('exec-2')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('Failed')).toBeVisible();
    await expect(page.getByText(/smtp connection timeout/i)).toBeVisible();
  });

  test('should handle pagination', async ({ page }) => {
    await page.route('/api/automation/workflows?page=2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: [
            { id: 'wf-3', name: 'Workflow 3', status: 'active' }
          ],
          pagination: { page: 2, limit: 10, total: 3, totalPages: 2 }
        })
      });
    });

    // Go to next page
    await page.getByRole('button', { name: /next page/i }).click();
    
    await expect(page.getByText('Workflow 3')).toBeVisible();
    await expect(page.getByText(/page 2 of 2/i)).toBeVisible();
  });

  test('should show empty state when no workflows exist', async ({ page }) => {
    await page.route('/api/automation/workflows', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        })
      });
    });

    await page.reload();
    
    await expect(page.getByText(/no workflows found/i)).toBeVisible();
    await expect(page.getByText(/create your first workflow/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create workflow/i })).toBeVisible();
  });

  test('should handle workflow validation errors', async ({ page }) => {
    await page.route('/api/automation/workflows', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [
              'Workflow name is required',
              'At least one trigger must be specified',
              'Invalid cron expression'
            ]
          })
        });
      }
    });

    await page.getByRole('button', { name: /create workflow/i }).click();
    
    // Submit empty form
    await page.getByRole('button', { name: /create workflow/i }).click();
    
    await expect(page.getByText(/workflow name is required/i)).toBeVisible();
    await expect(page.getByText(/at least one trigger must be specified/i)).toBeVisible();
  });
});