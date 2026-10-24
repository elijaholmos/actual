import { describe, expect, it } from 'vitest';

import { getCommandBarRecentRef } from './commandBarRecent';

const catalog = {
  navigation: [
    { id: 'budget', path: '/budget' },
    { id: 'reports-nav', path: '/reports' },
    { id: 'bank-sync', path: '/settings/bank-sync' },
    { id: 'payees', path: '/settings/payees' },
  ],
  accounts: [{ id: 'checking' }],
  dashboardPages: [{ id: 'overview' }],
  customReports: [{ id: 'monthly' }],
};

describe('getCommandBarRecentRef', () => {
  it('uses the live navigation catalog, including hidden settings routes', () => {
    expect(getCommandBarRecentRef('/settings/bank-sync', catalog)).toEqual({
      type: 'navigation',
      id: 'bank-sync',
    });
    expect(getCommandBarRecentRef('/settings/rules', catalog)).toBeNull();
  });

  it('resolves Reports through the stable sidebar alias', () => {
    expect(getCommandBarRecentRef('/reports', catalog)).toEqual({
      type: 'navigation',
      id: 'reports-nav',
    });
  });

  it('removes unavailable live navigation destinations', () => {
    expect(
      getCommandBarRecentRef('/settings/bank-sync', {
        ...catalog,
        navigation: [{ id: 'budget', path: '/budget' }],
      }),
    ).toBeNull();
  });

  it.each([
    ['/accounts/checking', { type: 'account', id: 'checking' }],
    ['/reports/custom/monthly', { type: 'report', id: 'monthly' }],
  ])('returns contextual refs for %s', (path, expected) => {
    expect(getCommandBarRecentRef(path, catalog)).toEqual(expected);
  });
});
