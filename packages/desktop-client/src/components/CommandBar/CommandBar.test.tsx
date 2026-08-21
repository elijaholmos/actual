import type { ReactNode } from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeCommandBar, openCommandBar } from '#commandbar/commandBarSlice';
import {
  CommandBarProvider,
  useRegisterCommandBarCommands,
} from '#commandbar/index';
import {
  configureTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { pushModal } from '#modals/modalsSlice';
import type * as ModalsSlice from '#modals/modalsSlice';

import { CommandBar } from './CommandBar';
import { actionItemClassName, destructiveActionClassName } from './styles';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  saveFile: vi.fn(),
  syncAndDownload: vi.fn(),
  reopenAccount: vi.fn(),
  startTour: vi.fn(),
  navigate: vi.fn(),
  setGlobalPref: vi.fn(),
  setPrivacyPref: vi.fn(),
  switchTheme: vi.fn(),
}));

const mockData = vi.hoisted(() => ({
  budgetId: 'budget-1',
  pathname: '/budget',
  accounts: [] as unknown[],
  customReports: [] as unknown[],
  dashboardPages: [] as unknown[],
  sidebarItems: [] as unknown[],
  sidebarDetails: {} as Record<string, { title: string; Icon: () => null }>,
}));

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: mockData.pathname }),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: mocks.send,
}));

vi.mock('#accounts/mutations', () => ({
  useSyncAndDownloadMutation: () => ({ mutate: mocks.syncAndDownload }),
  useReopenAccountMutation: () => ({
    mutate: mocks.reopenAccount,
    mutateAsync: mocks.reopenAccount,
  }),
}));

vi.mock('#modals/modalsSlice', async importOriginal => {
  const actual = await importOriginal<typeof ModalsSlice>();
  return {
    ...actual,
    openAccountCloseModal: ({ accountId }: { accountId: string }) =>
      actual.pushModal({
        modal: {
          name: 'close-account',
          options: {
            account: {
              id: accountId,
              name: 'Checking',
              offbudget: 0,
              closed: 0,
              sort_order: 0,
              last_reconciled: null,
              tombstone: 0,
              account_id: null,
              bank: null,
              bankName: null,
              bankId: null,
              mask: null,
              official_name: null,
              balance_current: null,
              balance_available: null,
              balance_limit: null,
              account_sync_source: null,
              last_sync: null,
              bank_sync_status: null,
            },
            balance: 0,
            canDelete: false,
          },
        },
      }),
  };
});

vi.mock('#accounts/useAccountSyncStatus', () => ({
  useAccountSyncStatus: () => () => undefined,
}));

vi.mock('#components/accounts/AccountStatusIndicator', () => ({
  AccountStatusIndicator: () => null,
}));

vi.mock('#components/sidebar/useSidebarMenuItemDetails', () => ({
  useSidebarMenuItemDetails: () => mockData.sidebarDetails,
}));

vi.mock('#hooks/useSidebarMenu', () => ({
  useSidebarMenu: () => ({ availableItems: mockData.sidebarItems }),
}));

vi.mock('#components/tour/TourProvider', () => ({
  useTour: () => ({ startTour: mocks.startTour }),
}));

vi.mock('#hooks/useAccounts', () => ({
  useAccounts: () => ({ data: mockData.accounts }),
}));

vi.mock('#hooks/useDashboardPages', () => ({
  useDashboardPages: () => ({ data: mockData.dashboardPages }),
}));

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [undefined, mocks.setGlobalPref],
}));

vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: (prefName: string) => [
    prefName === 'id' ? mockData.budgetId : 'Demo budget',
    vi.fn(),
  ],
}));

vi.mock('#hooks/useNavigate', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('#hooks/useReports', () => ({
  useReports: () => ({ data: mockData.customReports }),
}));

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => [false, mocks.setPrivacyPref],
}));

vi.mock('#hooks/useThemeCatalog', () => ({
  useThemeCatalog: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('#spreadsheet/bindings', () => ({
  accountBalance: (id: string) => ({ id }),
  allAccountBalance: () => ({}),
  offBudgetAccountBalance: () => ({}),
  onBudgetAccountBalance: () => ({}),
}));

vi.mock('#style', () => ({
  themeOptions: [
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['midnight', 'Midnight'],
    ['auto', 'System default'],
  ],
  useTheme: () => ['light', mocks.switchTheme],
}));

vi.mock('#style/customThemes', () => ({
  embedThemeFonts: vi.fn(),
  extractRepoOwner: (repo: string) => repo.split('/')[0],
  fetchThemeCss: vi.fn(),
  generateThemeId: (repo: string) => repo,
  normalizeGitHubRepo: (repo: string) => repo,
  parseInstalledTheme: () => null,
  serializeInstalledTheme: (theme: unknown) => JSON.stringify(theme),
  validateThemeCss: (css: string) => css,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
        return options?.[name] ?? `{{${name}}}`;
      }),
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./primitives', () => ({
  BalanceRow: ({ label }: { label: string }) => label,
  FooterHint: ({ children }: { children: ReactNode }) => children,
  Highlight: ({ text }: { text: string }) => text,
  KeyChip: ({ children }: { children: ReactNode }) => children,
  ShortcutHint: ({ label }: { label: ReactNode }) => label,
}));

function createStore() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(['accounts', 'lists'], mockData.accounts);
  return configureTestAppStore({ queryClient });
}

function renderCommandBar(
  store: ReturnType<typeof createStore>,
  children?: ReactNode,
) {
  return render(
    <TestProviders store={store}>
      <CommandBarProvider>
        {children}
        <CommandBar />
      </CommandBarProvider>
    </TestProviders>,
  );
}

function renderOpenCommandBar(children?: ReactNode) {
  const store = createStore();
  store.dispatch(openCommandBar());
  renderCommandBar(store, children);
  return store;
}

function rerenderCommandBar(
  view: { rerender: (ui: ReactNode) => void },
  store: ReturnType<typeof createStore>,
  children?: ReactNode,
) {
  view.rerender(
    <TestProviders store={store}>
      <CommandBarProvider>
        {children}
        <CommandBar />
      </CommandBarProvider>
    </TestProviders>,
  );
}

function setCommandBarPath(
  view: { rerender: (ui: ReactNode) => void },
  store: ReturnType<typeof createStore>,
  pathname: string,
) {
  mockData.pathname = pathname;
  rerenderCommandBar(view, store);
}

async function keyboardSelectRootItem(name: string) {
  const input = screen.getByPlaceholderText('Search Demo budget...');
  input.focus();

  for (let i = 0; i < 50; i++) {
    const item = screen.getByRole('option', { name });
    if (item.getAttribute('data-selected') === 'true') return;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
  }

  throw new Error(`Could not keyboard-select ${name}`);
}

function ContributedCommands({
  ownerId = 'test-owner',
  commands,
}: {
  ownerId?: string;
  commands: Parameters<typeof useRegisterCommandBarCommands>[1];
}) {
  useRegisterCommandBarCommands(ownerId, commands);
  return null;
}

describe('CommandBar', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {
          return undefined;
        }
        unobserve() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
    window.localStorage.clear();
    mockData.budgetId = 'budget-1';
    mockData.pathname = '/budget';
    mockData.accounts = [];
    mockData.customReports = [];
    mockData.dashboardPages = [];
    mockData.sidebarItems = [];
    mockData.sidebarDetails = {};
    mocks.send.mockResolvedValue({ data: 'budget-export' });
    mocks.saveFile.mockResolvedValue(undefined);
    window.Actual.saveFile = mocks.saveFile;
  });

  afterEach(vi.unstubAllGlobals);

  it('does not open with the shortcut while a modal is open', () => {
    const store = createStore();
    store.dispatch(pushModal({ modal: { name: 'add-account', options: {} } }));
    renderCommandBar(store);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(store.getState().commandBar.open).toBe(false);
  });

  it('opens an account action page from the keyboard-selected root item', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search actions...')).toHaveFocus();
    expect(screen.getAllByRole('listbox')).toHaveLength(1);
    expect(
      screen.getByRole('listbox', { name: 'Available actions' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Checking')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('back');
  });

  it('executes an action with keyboard navigation and Enter', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    const actionInput = screen.getByPlaceholderText('Search actions...');
    expect(actionInput).toHaveFocus();
    await userEvent.setup().keyboard('{ArrowDown}{ArrowUp}{Enter}');

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/accounts/account-1');
    });
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('does not open an action page for an unsupported root item', () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    expect(
      screen.queryByPlaceholderText('Search actions...'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search Demo budget...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('close');
  });

  it('persists an eligible favorite reference without executing the action', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Add to favorites' }));

    expect(store.getState().commandBar.open).toBe(true);
    expect(
      screen.getByRole('option', { name: 'Remove from favorites' }),
    ).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 1,
      favorites: [{ type: 'account', id: 'account-1' }],
    });
  });

  it('toggles the favorite without executing the selected action', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    const favoriteAction = screen.getByRole('option', {
      name: 'Add to favorites',
    });
    await userEvent.setup().click(favoriteAction);

    expect(store.getState().commandBar.open).toBe(true);
    expect(
      screen.getByRole('option', { name: 'Remove from favorites' }),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Remove from favorites' }));

    expect(store.getState().commandBar.open).toBe(true);
    expect(
      screen.getByRole('option', { name: 'Add to favorites' }),
    ).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 1,
      favorites: [],
    });
  });

  it('restores a stored favorite and resolves its live label', async () => {
    mockData.accounts = [
      { id: 'account-1', name: 'Renamed checking', closed: 0 },
    ];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'account-1' }],
      }),
    );
    renderOpenCommandBar();

    expect(screen.getByText('Favorites', { exact: true })).toBeInTheDocument();
    expect(
      screen.getAllByRole('option', { name: 'Renamed checking' }),
    ).toHaveLength(1);

    await keyboardSelectRootItem('Renamed checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    expect(
      screen.getByRole('option', { name: 'Remove from favorites' }),
    ).toBeInTheDocument();
  });

  it('isolates favorites by budget', () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'account-1' }],
      }),
    );
    mockData.budgetId = 'budget-2';
    renderOpenCommandBar();

    expect(
      screen.queryByText('Favorites', { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Checking' }),
    ).toBeInTheDocument();
  });

  it('preserves stored favorite order and removes canonical duplicates', () => {
    mockData.accounts = [
      { id: 'account-1', name: 'Checking', closed: 0 },
      { id: 'account-2', name: 'Savings', closed: 0 },
    ];
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [
          { type: 'report', id: 'report-1' },
          { type: 'account', id: 'account-2' },
          { type: 'account', id: 'account-1' },
        ],
      }),
    );
    renderOpenCommandBar();

    const options = screen.getAllByRole('option');
    expect(
      options.slice(0, 3).map(option => option.getAttribute('aria-label')),
    ).toEqual(['Monthly report', 'Savings', 'Checking']);
    expect(screen.getAllByRole('option', { name: 'Checking' })).toHaveLength(1);
    expect(
      screen.getAllByRole('option', { name: 'Monthly report' }),
    ).toHaveLength(1);
  });

  it('hides malformed and stale favorite references without rewriting them', () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const stored = {
      version: 1,
      favorites: [
        { type: 'account' },
        { type: 'account', id: 'deleted-account' },
        { type: 'report', id: 'deleted-report' },
      ],
    };
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify(stored),
    );
    renderOpenCommandBar();

    expect(
      screen.queryByText('Favorites', { exact: true }),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem('budget-1-commandbar.favorites')).toBe(
      JSON.stringify(stored),
    );
  });

  it('persists only eligible domain references when writing favorites', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();
    await userEvent
      .setup()
      .click(screen.getByText('Settings', { exact: true }));

    expect(window.localStorage.getItem('budget-1-commandbar.favorites')).toBe(
      null,
    );
  });

  it('persists custom report favorites as report references', async () => {
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    renderOpenCommandBar();
    await keyboardSelectRootItem('Monthly report');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Add to favorites' }));

    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 1,
      favorites: [{ type: 'report', id: 'report-1' }],
    });
  });

  it('prunes stale references only during a later favorite write', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'deleted-account' }],
      }),
    );
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Add to favorites' }));

    expect(store.getState().commandBar.open).toBe(true);
    expect(
      JSON.parse(
        window.localStorage.getItem('budget-1-commandbar.favorites') ?? '',
      ),
    ).toEqual({
      version: 1,
      favorites: [{ type: 'account', id: 'account-1' }],
    });
  });

  it('tracks four route-backed pages and displays the three prior pages', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/schedules');
    setCommandBarPath(view, store, '/tags');

    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 3)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Schedules', 'Settings', 'Budget']);
    });
  });

  it('moves a revisited page to the front of recent history', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/schedules');
    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/tags');

    await waitFor(() => {
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 3)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Settings', 'Schedules', 'Budget']);
    });
  });

  it('ignores current, unsupported, and reports redirect paths', async () => {
    mockData.pathname = '/reports';
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    await waitFor(() => {
      expect(
        screen.queryByText('Recent', { exact: true }),
      ).not.toBeInTheDocument();
    });

    setCommandBarPath(view, store, '/settings');
    setCommandBarPath(view, store, '/reports');
    setCommandBarPath(view, store, '/reports/custom');

    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(screen.getAllByRole('option', { name: 'Settings' })).toHaveLength(
        1,
      );
      expect(screen.getAllByRole('option', { name: 'Reports' })).toHaveLength(
        1,
      );
    });
  });

  it('resolves renamed recent entities and hides deleted ones', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/accounts/account-1');
    setCommandBarPath(view, store, '/settings');

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Checking' }),
      ).toBeInTheDocument();
    });

    mockData.accounts = [
      { id: 'account-1', name: 'Renamed checking', closed: 1 },
    ];
    rerenderCommandBar(view, store);
    expect(
      screen.getByRole('option', { name: 'Renamed checking' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Checking' }),
    ).not.toBeInTheDocument();

    mockData.accounts = [];
    rerenderCommandBar(view, store);
    expect(
      screen.queryByRole('option', { name: 'Renamed checking' }),
    ).not.toBeInTheDocument();
  });

  it('excludes favorited pages from Recent and canonical duplicates', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    window.localStorage.setItem(
      'budget-1-commandbar.favorites',
      JSON.stringify({
        version: 1,
        favorites: [{ type: 'account', id: 'account-1' }],
      }),
    );
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/accounts/account-1');
    setCommandBarPath(view, store, '/settings');

    await waitFor(() => {
      expect(
        screen.getByText('Favorites', { exact: true }),
      ).toBeInTheDocument();
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(screen.getAllByRole('option', { name: 'Checking' })).toHaveLength(
        1,
      );
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 1)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Budget']);
    });
  });

  it('preserves recent pages when the palette closes and reopens', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/settings');
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Budget' }),
      ).toBeInTheDocument();
    });

    act(() => {
      void store.dispatch(closeCommandBar());
    });
    act(() => {
      void store.dispatch(openCommandBar());
    });

    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Budget' }),
      ).toBeInTheDocument();
    });
  });

  it('resets recent pages when the provider and budget remount', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/settings');
    await waitFor(() => {
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument();
    });

    view.unmount();
    mockData.budgetId = 'budget-2';
    const nextStore = createStore();
    nextStore.dispatch(openCommandBar());
    renderCommandBar(nextStore);

    await waitFor(() => {
      expect(
        screen.queryByText('Recent', { exact: true }),
      ).not.toBeInTheDocument();
    });
  });

  it('tracks dashboards and custom reports from their live catalogs', async () => {
    mockData.dashboardPages = [{ id: 'dashboard-1', name: 'Overview' }];
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    setCommandBarPath(view, store, '/reports/dashboard-1');
    setCommandBarPath(view, store, '/reports/custom/report-1');
    setCommandBarPath(view, store, '/budget');

    await waitFor(() => {
      expect(
        screen
          .getAllByRole('option')
          .slice(0, 2)
          .map(option => option.getAttribute('aria-label')),
      ).toEqual(['Monthly report', 'Overview']);
    });
  });

  it.each([
    ['account-1', 'Checking', '/accounts/account-1'],
    ['report-1', 'Monthly report', '/reports/custom/report-1'],
  ])(
    'opens the contextual page for a Recent %s row with literal Ctrl+Enter',
    async (id, name, path) => {
      if (id.startsWith('account')) {
        mockData.accounts = [{ id, name, closed: 0 }];
      } else {
        mockData.customReports = [{ id, name }];
      }
      const store = createStore();
      store.dispatch(openCommandBar());
      const view = renderCommandBar(store);
      setCommandBarPath(view, store, path);
      setCommandBarPath(view, store, '/settings');

      const input = screen.getByPlaceholderText('Search Demo budget...');
      await userEvent.setup().type(input, name);
      await keyboardSelectRootItem(name);
      fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });

      expect(
        screen.getByPlaceholderText('Search actions...'),
      ).toBeInTheDocument();
      expect(screen.getByText(name, { exact: true })).toBeInTheDocument();
      expect(
        screen.getByText(
          id.startsWith('account') ? 'Account' : 'Custom report',
        ),
      ).toBeInTheDocument();
    },
  );

  it('records and reuses the hidden Payees settings route in Recent', async () => {
    const Icon = () => null;
    mockData.sidebarItems = [{ id: 'payees', hidden: true }];
    mockData.sidebarDetails = { payees: { title: 'Payees', Icon } };
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);

    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Payees' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/settings/payees');

    mockData.pathname = '/settings/payees';
    rerenderCommandBar(view, store);
    mockData.pathname = '/settings';
    act(() => void store.dispatch(closeCommandBar()));
    act(() => void store.dispatch(openCommandBar()));
    rerenderCommandBar(view, store);

    await waitFor(() =>
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument(),
    );
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Payees' }));
    expect(mocks.navigate).toHaveBeenLastCalledWith('/settings/payees');
  });

  it('follows the live sidebar order, visibility, and canonical execution paths', async () => {
    const Icon = () => null;
    mockData.sidebarItems = [
      { id: 'payees', hidden: true },
      { id: 'bank-sync', hidden: false },
      { id: 'budget', hidden: false },
    ];
    mockData.sidebarDetails = {
      payees: { title: 'Payees', Icon },
      'bank-sync': { title: 'Bank Sync', Icon },
      budget: { title: 'Budget', Icon },
    };
    const store = createStore();
    store.dispatch(openCommandBar());
    renderCommandBar(store);

    const options = screen.getAllByRole('option');
    const labels = options.map(option => option.getAttribute('aria-label'));
    expect(labels.indexOf('Payees')).toBeLessThan(labels.indexOf('Bank Sync'));
    expect(labels.indexOf('Bank Sync')).toBeLessThan(labels.indexOf('Budget'));

    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Bank Sync' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/bank-sync');
  });

  it('removes a recorded navigation destination when it becomes unavailable', async () => {
    mockData.sidebarItems = [{ id: 'budget', hidden: false }];
    mockData.sidebarDetails = { budget: { title: 'Budget', Icon: () => null } };
    const store = createStore();
    store.dispatch(openCommandBar());
    const view = renderCommandBar(store);
    setCommandBarPath(view, store, '/budget');
    setCommandBarPath(view, store, '/settings');

    await waitFor(() =>
      expect(screen.getByText('Recent', { exact: true })).toBeInTheDocument(),
    );
    mockData.sidebarItems = [{ id: 'reports', hidden: false }];
    mockData.sidebarDetails = {
      reports: { title: 'Reports', Icon: () => null },
    };
    rerenderCommandBar(view, store);

    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: 'Budget' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('opens a custom-report action page from the root palette', async () => {
    mockData.customReports = [{ id: 'report-1', name: 'Monthly report' }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Monthly report');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();
    expect(screen.getByText('Monthly report')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
  });

  it('renders a renamed account from live query data on the action page', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    mockData.accounts = [
      { id: 'account-1', name: 'Daily checking', closed: 0 },
    ];
    fireEvent.change(screen.getByPlaceholderText('Search actions...'), {
      target: { value: 'open' },
    });

    expect(screen.getByText('Daily checking')).toBeInTheDocument();
    expect(screen.queryByText('Checking')).not.toBeInTheDocument();
  });

  it('updates account actions when the live account is closed or reopened', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    expect(
      screen.getByRole('option', { name: 'Close account' }),
    ).toBeInTheDocument();

    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 1 }];
    fireEvent.change(screen.getByPlaceholderText('Search actions...'), {
      target: { value: 'account' },
    });

    expect(
      screen.getByRole('option', { name: 'Reopen account' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Close account' }),
    ).not.toBeInTheDocument();
  });

  it('returns to root when the contextual target is deleted', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    mockData.accounts = [];
    fireEvent.change(screen.getByPlaceholderText('Search actions...'), {
      target: { value: 'open' },
    });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Search Demo budget...'),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByPlaceholderText('Search actions...'),
    ).not.toBeInTheDocument();
  });

  it('keeps normal Enter as direct root navigation', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    await userEvent.setup().keyboard('{Enter}');

    expect(mocks.navigate).toHaveBeenCalledWith('/accounts/account-1');
    expect(store.getState().commandBar.open).toBe(false);
    expect(
      screen.queryByPlaceholderText('Search actions...'),
    ).not.toBeInTheDocument();
  });

  it('restores root search and selection from an action page', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();
    const rootInput = screen.getByPlaceholderText('Search Demo budget...');

    await userEvent.setup().type(rootInput, 'Checking');
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    expect(
      screen.getByPlaceholderText('Search actions...'),
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText('Search actions...'), {
      key: 'Backspace',
    });
    expect(screen.getByPlaceholderText('Search Demo budget...')).toHaveValue(
      'Checking',
    );

    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.getByPlaceholderText('Search Demo budget...')).toHaveValue(
      'Checking',
    );
    expect(screen.getByRole('option', { name: 'Checking' })).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('shows close for active accounts and reopen for closed accounts', async () => {
    mockData.accounts = [
      { id: 'active-account', name: 'Checking', closed: 0 },
      { id: 'closed-account', name: 'Old checking', closed: 1 },
    ];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    expect(
      screen.getByRole('option', { name: 'Close account' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Reopen account' }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await keyboardSelectRootItem('Old checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    expect(
      screen.getByRole('option', { name: 'Reopen account' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Close account' }),
    ).not.toBeInTheDocument();
  });

  it('keeps action section headings and destructive styling when filtering', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    renderOpenCommandBar();

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    await userEvent
      .setup()
      .type(screen.getByPlaceholderText('Search actions...'), 'close');

    expect(screen.getByText('Additional', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Close account' })).toHaveClass(
      destructiveActionClassName,
    );
    expect(
      screen.queryByText('Primary', { exact: true }),
    ).not.toBeInTheDocument();
  });

  it('closes before executing contextual navigation', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });

    mocks.navigate.mockImplementation(() => {
      expect(store.getState().commandBar.open).toBe(false);
    });
    await userEvent.setup().click(screen.getByRole('option', { name: 'Open' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/accounts/account-1');
  });

  it('opens the close confirmation without mutating an active account', async () => {
    mockData.accounts = [{ id: 'account-1', name: 'Checking', closed: 0 }];
    const store = renderOpenCommandBar();
    mocks.send.mockImplementation(async (command: string) => {
      if (command === 'account-properties') {
        return { balance: 0, numTransactions: 1 };
      }
      if (command === 'accounts-get') return mockData.accounts;
      return { data: 'budget-export' };
    });

    await keyboardSelectRootItem('Checking');
    fireEvent.keyDown(screen.getByPlaceholderText('Search Demo budget...'), {
      key: 'Enter',
      ctrlKey: true,
    });
    await userEvent
      .setup()
      .click(screen.getByRole('option', { name: 'Close account' }));
    expect(store.getState().commandBar.open).toBe(false);
    await waitFor(() => {
      expect(store.getState().modals.modalStack).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'close-account' }),
        ]),
      );
    });
    expect(
      mocks.send.mock.calls.some(([command]) => command === 'account-close'),
    ).toBe(false);
  });

  it('fails clearly when rendered without a command bar provider', () => {
    const store = createStore();

    expect(() =>
      render(
        <TestProviders store={store}>
          <CommandBar />
        </TestProviders>,
      ),
    ).toThrow('useCommandBarCommands must be used within a CommandBarProvider');
  });

  it('runs the sync-all-accounts action', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(screen.getByText('Sync all accounts', { exact: true }));

    expect(mocks.syncAndDownload).toHaveBeenCalledWith({});
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('goes back to the root page when Escape is pressed on the theme page', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(screen.getByText('Change theme…', { exact: true }));
    expect(screen.getByPlaceholderText('Search themes...')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(
      screen.getByPlaceholderText('Search Demo budget...'),
    ).toBeInTheDocument();
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('starts the tour from the quick actions', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(
      screen.getByText('Take a tour of Actual', { exact: true }),
    );

    expect(mocks.startTour).toHaveBeenCalledTimes(1);
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('uses stable, section-qualified values for items with the same id', () => {
    mockData.customReports = [{ id: 'settings', name: 'Settings report' }];
    const store = renderOpenCommandBar();

    expect(store.getState().commandBar.open).toBe(true);
    expect(screen.getByRole('option', { name: /^Settings$/ })).toHaveAttribute(
      'data-value',
      'navigation:settings',
    );
    expect(
      screen.getByRole('option', { name: /^Settings report$/ }),
    ).toHaveAttribute('data-value', 'reports-custom:settings');
  });

  it('reports export failures through the notification system', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();
    mocks.send.mockResolvedValue({ error: 'export-failed' });

    await user.click(screen.getByText('Export budget data', { exact: true }));

    await waitFor(() => {
      expect(store.getState().notifications.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'export-error',
            type: 'error',
          }),
        ]),
      );
    });

    expect(mocks.saveFile).not.toHaveBeenCalled();
  });

  it('closes after a normal quick action selection', async () => {
    const user = userEvent.setup();
    const store = renderOpenCommandBar();

    await user.click(screen.getByText('Settings', { exact: true }));

    expect(store.getState().commandBar.open).toBe(false);
    expect(mocks.navigate).toHaveBeenCalledWith('/settings');
  });

  it('shows, filters, executes, and closes for a contributed page action', async () => {
    const user = userEvent.setup();
    const execute = vi.fn();
    const store = renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'open', label: 'Open contributed item', execute }]}
      />,
    );

    expect(
      screen.getByText('Page actions', { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('Open contributed item')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Open contributed item' }),
    ).toHaveAttribute('data-value', 'page-actions:test-owner:open');

    const input = screen.getByPlaceholderText('Search Demo budget...');
    await user.type(input, 'contributed');
    expect(screen.getByText('Open contributed item')).toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.getState().commandBar.open).toBe(false);
  });

  it('styles destructive page actions without executing them', () => {
    const execute = vi.fn();
    renderOpenCommandBar(
      <ContributedCommands
        commands={[
          { id: 'close', label: 'Close Account', destructive: true, execute },
        ]}
      />,
    );

    const item = screen.getByRole('option', { name: 'Close Account' });
    expect(item).toHaveClass(actionItemClassName, destructiveActionClassName);
    expect(execute).not.toHaveBeenCalled();
  });

  it('updates and removes contributed commands while the palette is open', async () => {
    const store = createStore();
    store.dispatch(openCommandBar());
    const first = {
      id: 'first',
      label: 'First contributed item',
      execute: vi.fn(),
    };
    const second = {
      id: 'second',
      label: 'Second contributed item',
      execute: vi.fn(),
    };
    const view = render(
      <TestProviders store={store}>
        <CommandBarProvider>
          <ContributedCommands commands={[first]} />
          <CommandBar />
        </CommandBarProvider>
      </TestProviders>,
    );

    expect(screen.getByText('First contributed item')).toBeInTheDocument();

    view.rerender(
      <TestProviders store={store}>
        <CommandBarProvider>
          <ContributedCommands commands={[second]} />
          <CommandBar />
        </CommandBarProvider>
      </TestProviders>,
    );

    await waitFor(() => {
      expect(
        screen.queryByText('First contributed item'),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Second contributed item')).toBeInTheDocument();
    });

    view.rerender(
      <TestProviders store={store}>
        <CommandBarProvider>
          <ContributedCommands commands={[]} />
          <CommandBar />
        </CommandBarProvider>
      </TestProviders>,
    );

    await waitFor(() =>
      expect(
        screen.queryByText('Second contributed item'),
      ).not.toBeInTheDocument(),
    );
    expect(store.getState().commandBar.open).toBe(true);
  });

  it('reports contributed action failures and still closes normally', async () => {
    const user = userEvent.setup();
    const error = new Error('contributed failure');
    const execute = vi.fn(() => {
      throw error;
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const store = renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'failing', label: 'Failing action', execute }]}
      />,
    );

    await user.click(screen.getByText('Failing action'));
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Command bar action failed', {
        commandId: 'test-owner:failing',
        error,
      }),
    );
    expect(store.getState().commandBar.open).toBe(false);
    consoleError.mockRestore();
  });

  it('reports rejected promises from contributed actions', async () => {
    const user = userEvent.setup();
    const error = new Error('async contributed failure');
    const execute = vi.fn().mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    renderOpenCommandBar(
      <ContributedCommands
        commands={[{ id: 'async-failing', label: 'Async failure', execute }]}
      />,
    );

    await user.click(screen.getByText('Async failure'));
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith('Command bar action failed', {
        commandId: 'test-owner:async-failing',
        error,
      }),
    );
    consoleError.mockRestore();
  });
});
