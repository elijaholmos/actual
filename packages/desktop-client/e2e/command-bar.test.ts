import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

test.describe('Command bar', () => {
  let page: Page;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();

    // Move mouse to corner of the screen;
    // sometimes the mouse hovers on a budget element thus rendering an input box
    // and this breaks screenshot tests
    await page.mouse.move(0, 0);

    // ensure page is loaded
    await expect(page.getByTestId('budget-table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add group' })).toBeVisible({
      timeout: 10000,
    });
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('opens the root palette with Ctrl/Cmd+K', async () => {
    await page.keyboard.press('ControlOrMeta+k');
    const commandBar = page.getByRole('combobox', {
      name: 'Command Bar',
    });

    await expect(commandBar).toBeVisible();
    await expect(commandBar).toHaveValue('');

    await page.keyboard.press('Escape');
    await expect(commandBar).not.toBeVisible();
  });

  test('shows sidebar navigation in master order', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBar = page.getByRole('dialog', {
      name: 'Command Bar',
    });
    const navigationGroup = commandBar.getByRole('group', {
      name: 'Navigation',
    });
    const navigationItems = navigationGroup.getByRole('option');

    await expect(navigationItems).toHaveText([
      'Budget',
      'Reports',
      'Schedules',
      'Payees',
      'Tags',
      'Rules',
      'Bank Sync',
      'Settings',
      /^All Accounts/,
    ]);
    await expect(
      navigationGroup.getByRole('option', { name: 'Bank Sync' }),
    ).toBeVisible();
  });

  test('searches sidebar navigation items', async () => {
    await page.keyboard.press('ControlOrMeta+k');

    const commandBar = page.getByRole('dialog', {
      name: 'Command Bar',
    });
    const search = commandBar.getByRole('combobox', {
      name: 'Command Bar',
    });

    await search.fill('Bank Sync');
    await expect(commandBar.getByRole('option')).toHaveText(['Bank Sync']);
  });

  test('matches the root palette across themes', async () => {
    await page.keyboard.press('ControlOrMeta+k');
    const commandBar = page.getByRole('dialog', {
      name: 'Command Bar',
    });
    await expect(
      commandBar.getByRole('combobox', { name: 'Command Bar' }),
    ).toBeVisible();
    const palette = commandBar.locator('[cmdk-root]');

    await expect(palette).toBeVisible();
    await expect(palette).toMatchThemeScreenshots();
  });
});
