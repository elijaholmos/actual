import { describe, expect, it, vi } from 'vitest';

import {
  getCommandItemValue,
  getExportErrorNotification,
  getTourCommandLabel,
  runSyncAndDownload,
  shouldSuppressCommandBarShortcut,
} from './CommandBar';

describe('CommandBar foundation behavior', () => {
  it('suppresses the global shortcut while a modal is active', () => {
    expect(shouldSuppressCommandBarShortcut(1)).toBe(true);
    expect(shouldSuppressCommandBarShortcut(0)).toBe(false);
  });

  it('qualifies cmdk values by section and item', () => {
    expect(getCommandItemValue('navigation', 'reports')).toBe(
      'navigation:reports',
    );
    expect(getCommandItemValue('actions', 'reports')).not.toBe(
      getCommandItemValue('navigation', 'reports'),
    );
  });

  it('delegates account sync to the sync-and-download mutation', () => {
    const mutate = vi.fn();
    runSyncAndDownload({ mutate });
    expect(mutate).toHaveBeenCalledWith({});
  });

  it('uses the translated master tour copy', () => {
    expect(
      getTourCommandLabel((key, options) => `${key}:${options.appName}`),
    ).toBe('Take a tour of {{appName}}:Actual');
  });

  it('uses the stable export-error notification id for save rejection', () => {
    expect(getExportErrorNotification('Export failed')).toEqual({
      id: 'export-error',
      type: 'error',
      message: 'Export failed',
    });
  });

  it('keeps configurable sidebar order and hidden paths compatible', async () => {
    const { getDefaultSidebarMenuItems, getSidebarMenuItemPath } =
      await import('#components/sidebar/sidebarMenu');
    const items = getDefaultSidebarMenuItems();
    expect(items.map(item => item.id)).toEqual([
      'budget',
      'reports',
      'schedules',
      'payees',
      'tags',
      'rules',
      'bank-sync',
    ]);
    expect(getSidebarMenuItemPath('schedules', false)).toBe(
      '/settings/schedules',
    );
    expect(getSidebarMenuItemPath('bank-sync', false)).toBe(
      '/settings/bank-sync',
    );
    expect(getSidebarMenuItemPath('budget', true)).toBe('/budget');
  });
});
