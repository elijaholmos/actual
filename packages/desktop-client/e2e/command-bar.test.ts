import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';

const demoAccountName = 'Ally Savings';

async function openCommandBar(page: Page) {
  await page.keyboard.press('ControlOrMeta+k');

  const commandBar = page.getByRole('dialog', {
    name: 'Command Bar',
  });
  await expect(
    commandBar.getByRole('combobox', { name: 'Command Bar' }),
  ).toBeVisible();

  return commandBar;
}

async function searchForDemoAccount(page: Page) {
  const commandBar = await openCommandBar(page);
  const search = commandBar.getByRole('combobox', {
    name: 'Command Bar',
  });

  await search.fill(demoAccountName);
  const account = commandBar.getByRole('option', {
    name: demoAccountName,
  });
  await expect(account).toBeVisible();

  return { commandBar, search, account };
}

async function openDemoAccountPage(page: Page) {
  await page
    .getByRole('link', { name: new RegExp(`^${demoAccountName}`) })
    .click();
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
  await expect(page.getByTestId('account-name')).toHaveText(demoAccountName);
  await expect(page.getByTestId('transaction-table')).toBeVisible();
}

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

  test('uses plain Enter for direct account navigation', async () => {
    const { search } = await searchForDemoAccount(page);

    await search.press('Enter');

    await expect(page).toHaveURL(/\/accounts\/[^/]+$/);
    await expect(page.getByTestId('account-name')).toHaveText(demoAccountName);
  });

  test('opens an account action page with literal Ctrl+Enter', async () => {
    const { commandBar, search } = await searchForDemoAccount(page);

    await search.press('Control+Enter');

    await expect(
      commandBar.getByPlaceholder('Search actions...'),
    ).toBeVisible();
    await expect(commandBar.getByRole('heading', { level: 2 })).toContainText(
      demoAccountName,
    );
    await expect(commandBar.getByRole('heading', { level: 2 })).toContainText(
      'Account',
    );
    await expect(
      commandBar.getByRole('option', { name: 'Open' }),
    ).toBeVisible();

    const backButton = commandBar.getByRole('button', { name: 'Back' });
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(
      commandBar.getByRole('combobox', { name: 'Command Bar' }),
    ).toHaveValue(demoAccountName);
  });

  test('matches the account action page across themes', async () => {
    const { commandBar, search } = await searchForDemoAccount(page);

    await search.press('Control+Enter');
    const actionPanel = commandBar.locator('[cmdk-root]');

    await expect(
      commandBar.getByRole('button', { name: 'Back' }),
    ).toBeVisible();
    await expect(actionPanel).toBeVisible();
    await expect(actionPanel).toMatchThemeScreenshots();
  });

  test('shows active account Page actions and opens the filter picker', async () => {
    await openDemoAccountPage(page);
    const commandBar = await openCommandBar(page);
    const pageActions = commandBar.getByRole('group', {
      name: 'Page actions',
    });

    await expect(pageActions.getByRole('option')).toHaveText([
      'Add New',
      'Import',
      'Filter',
      'Collapse split transactions',
      'Show balance chart',
      'Manage table columns',
      'Hide reconciled transactions',
      'Export',
      'Close account',
    ]);

    await pageActions.getByRole('option', { name: 'Filter' }).click();
    await expect(page.getByTestId('filters-select-tooltip')).toBeVisible();
  });

  test('matches active account Page actions across themes', async () => {
    await openDemoAccountPage(page);
    const commandBar = await openCommandBar(page);
    const search = commandBar.getByRole('combobox', {
      name: 'Command Bar',
    });

    await search.fill('Close account');
    await expect(
      commandBar
        .getByRole('group', { name: 'Page actions' })
        .getByRole('option', { name: 'Close account' }),
    ).toBeVisible();

    const actionPanel = commandBar.locator('[cmdk-root]');
    await expect(actionPanel).toBeVisible();
    await expect(actionPanel).toMatchThemeScreenshots();
  });
});
