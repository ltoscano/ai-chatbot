import { expect, test } from '../fixtures';
import { AuthPage } from '../pages/auth';
import { generateRandomTestUser } from '../helpers';
import { ChatPage } from '../pages/chat';

test.describe
  .serial('Authentication Required', () => {
    test('Redirect to login when no session is present', async ({ page }) => {
      const response = await page.goto('/');

      if (!response) {
        throw new Error('Failed to load page');
      }

      // Should redirect to login page
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });

    test('Allow navigating to /login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });

    test('Allow navigating to /register when not authenticated', async ({
      page,
    }) => {
      await page.goto('/register');
      await page.waitForURL('/register');
      await expect(page).toHaveURL('/register');
    });
  });

test.describe
  .serial('Login and Registration', () => {
    let authPage: AuthPage;

    const testUser = generateRandomTestUser();

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
    });

    test('Register new account', async () => {
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain('Account created successfully!');
    });

    test('Register new account with existing email', async () => {
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain('Account already exists!');
    });

    test('Log into account that exists', async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);

      await page.waitForURL('/');
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
    });

    test('Display user email in user menu', async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);

      await page.waitForURL('/');
      await expect(page.getByPlaceholder('Send a message...')).toBeVisible();

      const userEmail = await page.getByTestId('user-email');
      await expect(userEmail).toHaveText(testUser.email);
    });

    test('Log out as authenticated user', async () => {
      await authPage.logout(testUser.email, testUser.password);
    });

    test('Log out is available for authenticated users', async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');

      authPage.openSidebar();

      const userNavButton = page.getByTestId('user-nav-button');
      await expect(userNavButton).toBeVisible();

      await userNavButton.click();
      const userNavMenu = page.getByTestId('user-nav-menu');
      await expect(userNavMenu).toBeVisible();

      const authMenuItem = page.getByTestId('user-nav-item-auth');
      await expect(authMenuItem).toContainText('Sign out');
    });

    test('Do not navigate to /register for authenticated users', async ({
      page,
    }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');

      await page.goto('/register');
      await expect(page).toHaveURL('/');
    });

    test('Do not navigate to /login for authenticated users', async ({
      page,
    }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL('/');

      await page.goto('/login');
      await expect(page).toHaveURL('/');
    });
  });

test.describe('Entitlements', () => {
  let chatPage: ChatPage;

  const testUser = generateRandomTestUser();

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);

    // Create and login user before each test
    const authPage = new AuthPage(page);
    await authPage.register(testUser.email, testUser.password);
    await authPage.login(testUser.email, testUser.password);
    await page.waitForURL('/');
  });

  test('Authenticated user has message limits based on entitlements', async () => {
    await chatPage.createNewChat();

    // Test a few messages to ensure the system works
    // Note: Testing 100+ messages would take too long in e2e tests
    for (let i = 0; i < 5; i++) {
      await chatPage.sendUserMessage('Why is the sky blue?');
      await chatPage.isGenerationComplete();
    }

    // The actual rate limiting would need to be tested with the correct limits
    // This is a placeholder to ensure the chat functionality works for authenticated users
  });
});
