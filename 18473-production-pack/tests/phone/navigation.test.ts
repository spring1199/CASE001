import { describe, expect, it } from 'vitest';

import { neutralPhoneIndex } from '@/phone/data/neutral-seed';
import type { PhoneAppId } from '@/phone/data/schema';
import {
  createPhoneNavigationState,
  goBack,
  goHome,
  navigateToApp,
  navigateToDeepLink,
  navigateToItem,
  unlockPhone,
} from '@/phone/navigation';

const initiallyUnlocked: ReadonlySet<PhoneAppId> = new Set(
  Object.values(neutralPhoneIndex.appsById)
    .filter((app) => !app.lockedInitially)
    .map((app) => app.id),
);

describe('phone navigation', () => {
  it('tracks lock, home, app, and item routes in order', () => {
    const messageItemId = neutralPhoneIndex.appsById.messages.items[0]!.id;
    let state = createPhoneNavigationState();

    state = unlockPhone(state);
    state = navigateToApp(state, 'messages', neutralPhoneIndex, initiallyUnlocked);
    state = navigateToItem(
      state,
      'messages',
      messageItemId,
      neutralPhoneIndex,
      initiallyUnlocked,
    );

    expect(state.current).toEqual({ screen: 'item', appId: 'messages', itemId: messageItemId });
    expect(state.history).toEqual([
      { screen: 'home' },
      { screen: 'app', appId: 'messages' },
    ]);
  });

  it('does not keep the lock route in history and Back from Home is a no-op', () => {
    const unlocked = unlockPhone(createPhoneNavigationState());

    expect(unlocked).toEqual({ current: { screen: 'home' }, history: [] });
    expect(goBack(unlocked)).toBe(unlocked);
  });

  it('moves back through history and sends Home directly to the launcher', () => {
    const messageItemId = neutralPhoneIndex.appsById.messages.items[0]!.id;
    let state = unlockPhone(createPhoneNavigationState());
    state = navigateToApp(state, 'messages', neutralPhoneIndex, initiallyUnlocked);
    state = navigateToItem(
      state,
      'messages',
      messageItemId,
      neutralPhoneIndex,
      initiallyUnlocked,
    );

    state = goBack(state);
    expect(state.current).toEqual({ screen: 'app', appId: 'messages' });
    expect(goHome(state)).toEqual({
      current: { screen: 'home' },
      history: [],
    });
  });

  it('refuses navigation to a locked app without mutating history', () => {
    const state = unlockPhone(createPhoneNavigationState());

    const refused = navigateToApp(state, 'files', neutralPhoneIndex, initiallyUnlocked);

    expect(refused).toBe(state);
  });

  it('resolves an accessible deep link to its target item', () => {
    const source = Object.values(neutralPhoneIndex.itemsById).find(
      (item) => item !== undefined && item.deepLinks && item.deepLinks.length > 0,
    );
    const link = source?.deepLinks?.[0];
    expect(link).toBeDefined();

    const state = navigateToDeepLink(
      unlockPhone(createPhoneNavigationState()),
      link!.target,
      neutralPhoneIndex,
      initiallyUnlocked,
    );

    expect(state.current).toEqual({
      screen: 'item',
      appId: link!.target.appId,
      itemId: link!.target.itemId,
    });
  });
});
