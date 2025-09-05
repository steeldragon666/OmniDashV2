import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/auth/login');
  });

  test('should display login form correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/please enter a valid email/i)).toBeVisible();
  });

  test('should handle successful login', async ({ page }) => {
    // Mock successful authentication response
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'user123',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      });
    });

    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/welcome, test user/i)).toBeVisible();
  });

  test('should handle login failure', async ({ page }) => {
    // Mock failed authentication response
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      });
    });

    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL('/auth/login');
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/password/i);
    const toggleButton = page.getByRole('button', { name: /toggle password/i });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle again to hide password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle OAuth login options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with discord/i })).toBeVisible();
  });

  test('should redirect to signup page', async ({ page }) => {
    await page.getByRole('link', { name: /create an account/i }).click();
    await expect(page).toHaveURL('/auth/signup');
  });

  test('should handle forgot password link', async ({ page }) => {
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL('/auth/forgot-password');
  });

  test('should show loading state during login', async ({ page }) => {
    // Mock slow response
    await page.route('/api/auth/login', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    // Should show loading state
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText(/signing in/i)).toBeVisible();
  });

  test('should handle session persistence', async ({ page, context }) => {
    // Mock session API
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

    // Login successfully
    await page.route('/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/dashboard');

    // Open new page in same context (should maintain session)
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    // Should not redirect to login
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.getByText(/test user/i)).toBeVisible();
  });
});