import { describe, expect, it } from 'vitest';

import {
  COMMAND_BAR_FAVORITES_VERSION,
  parseCommandBarFavorites,
} from './commandBarFavorites';

describe('parseCommandBarFavorites', () => {
  it('collapses duplicate persisted references while preserving order', () => {
    expect(
      parseCommandBarFavorites({
        version: COMMAND_BAR_FAVORITES_VERSION,
        favorites: [
          { type: 'account', id: 'checking' },
          { type: 'report', id: 'monthly' },
          { type: 'account', id: 'checking' },
        ],
      }),
    ).toEqual([
      { type: 'account', id: 'checking' },
      { type: 'report', id: 'monthly' },
    ]);
  });

  it('returns no favorites for an unsupported version', () => {
    expect(
      parseCommandBarFavorites({
        version: COMMAND_BAR_FAVORITES_VERSION + 1,
        favorites: [{ type: 'account', id: 'checking' }],
      }),
    ).toEqual([]);
  });
});
