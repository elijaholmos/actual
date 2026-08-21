import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandBarProvider } from '#commandbar/index';

import { CommandBar } from './CommandBar';

const dispatch = vi.fn();
const mutate = vi.fn();
const startTour = vi.fn();
let modalStack: unknown[] = [];
let open = true;

function renderCommandBar() {
  return render(
    <CommandBarProvider>
      <CommandBar />
    </CommandBarProvider>,
  );
}

vi.mock('#redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ commandBar: { open } }),
}));
vi.mock('#accounts/mutations', () => ({
  useSyncAndDownloadMutation: () => ({ mutate }),
  useReopenAccountMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}));
vi.mock('#accounts/useAccountSyncStatus', () => ({
  useAccountSyncStatus: () => () => 'success',
}));
vi.mock('#hooks/useModalState', () => ({
  useModalState: () => ({ modalStack }),
}));
vi.mock('#hooks/useSidebarMenu', () => ({
  useSidebarMenu: () => ({ availableItems: [] }),
}));
vi.mock('#components/sidebar/useSidebarMenuItemDetails', () => ({
  useSidebarMenuItemDetails: () => ({}),
}));
vi.mock('#hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));
vi.mock('#hooks/useReports', () => ({ useReports: () => ({ data: [] }) }));
vi.mock('#hooks/useDashboardPages', () => ({
  useDashboardPages: () => ({ data: [] }),
}));
vi.mock('#hooks/useNavigate', () => ({ useNavigate: () => vi.fn() }));
vi.mock('#hooks/useMetadataPref', () => ({
  useMetadataPref: () => ['Budget'],
}));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => ['false', vi.fn()],
}));
vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: () => [null, vi.fn()],
}));
vi.mock('#style', () => ({ useTheme: () => ['light', vi.fn()] }));
vi.mock('#components/tour/TourProvider', () => ({
  useTour: () => ({ startTour }),
}));
vi.mock('#components/spreadsheet/CellValue', () => ({
  CellValue: ({
    children,
  }: {
    children: (props: { value: number }) => unknown;
  }) => children({ value: 0 }),
  CellValueText: () => null,
}));
vi.mock('#spreadsheet/bindings', () => ({
  accountBalance: () => ({}),
  allAccountBalance: () => ({}),
  offBudgetAccountBalance: () => ({}),
  onBudgetAccountBalance: () => ({}),
}));
vi.mock('./ThemePage', () => ({
  ThemePage: () => <div data-testid="theme-page" />,
  isThemePageEscape: (key: string, page: string) =>
    key === 'Escape' && page === 'themes',
}));

describe('CommandBar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modalStack = [];
    open = true;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('stays closed when Ctrl/Cmd+K is pressed over an active modal', () => {
    open = false;
    modalStack = [{}];
    renderCommandBar();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('runs sync-and-download when Sync all accounts is selected', () => {
    renderCommandBar();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Sync all accounts' },
    });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(mutate).toHaveBeenCalledWith({});
  });

  it('runs the tour handler with the translated command label', () => {
    renderCommandBar();
    expect(screen.getByText('Take a tour of Actual')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Take a tour of Actual'));

    expect(startTour).toHaveBeenCalledTimes(1);
  });

  it('returns from themes on Escape without closing the palette', () => {
    renderCommandBar();
    fireEvent.click(screen.getByText('Change theme…'));
    expect(screen.getByTestId('theme-page')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('theme-page')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
