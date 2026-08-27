import type {
  PhoneAppId,
  PhoneContentIndex,
  PhoneDeepLinkTarget,
} from '@/phone/data/schema';

export type PhoneRoute =
  | Readonly<{ screen: 'lock' }>
  | Readonly<{ screen: 'home' }>
  | Readonly<{ screen: 'app'; appId: PhoneAppId }>
  | Readonly<{ screen: 'item'; appId: PhoneAppId; itemId: string }>;

export type PhoneNavigationState = Readonly<{
  current: PhoneRoute;
  history: readonly PhoneRoute[];
}>;

const LOCK_ROUTE: PhoneRoute = Object.freeze({ screen: 'lock' });
const HOME_ROUTE: PhoneRoute = Object.freeze({ screen: 'home' });

export function phoneRouteKey(route: PhoneRoute): string {
  if (route.screen === 'lock' || route.screen === 'home') return route.screen;
  if (route.screen === 'app') return `app:${route.appId}`;
  return `item:${route.appId}:${route.itemId}`;
}

export function createPhoneNavigationState(): PhoneNavigationState {
  return { current: LOCK_ROUTE, history: [] };
}

function pushRoute(state: PhoneNavigationState, route: PhoneRoute): PhoneNavigationState {
  if (
    state.current.screen === route.screen &&
    (route.screen !== 'app' ||
      (state.current.screen === 'app' && state.current.appId === route.appId)) &&
    (route.screen !== 'item' ||
      (state.current.screen === 'item' &&
        state.current.appId === route.appId &&
        state.current.itemId === route.itemId))
  ) {
    return state;
  }
  return { current: route, history: [...state.history, state.current] };
}

export function unlockPhone(state: PhoneNavigationState): PhoneNavigationState {
  return state.current.screen === 'lock' ? { current: HOME_ROUTE, history: [] } : state;
}

export function navigateToApp(
  state: PhoneNavigationState,
  appId: PhoneAppId,
  index: PhoneContentIndex,
  unlockedAppIds: ReadonlySet<PhoneAppId>,
): PhoneNavigationState {
  if (state.current.screen === 'lock') return state;
  if (!index.appsById[appId] || !unlockedAppIds.has(appId)) return state;
  return pushRoute(state, { screen: 'app', appId });
}

export function navigateToItem(
  state: PhoneNavigationState,
  appId: PhoneAppId,
  itemId: string,
  index: PhoneContentIndex,
  unlockedAppIds: ReadonlySet<PhoneAppId>,
): PhoneNavigationState {
  if (state.current.screen === 'lock') return state;
  if (!unlockedAppIds.has(appId) || index.itemAppIds[itemId] !== appId) return state;
  return pushRoute(state, { screen: 'item', appId, itemId });
}

export function navigateToDeepLink(
  state: PhoneNavigationState,
  target: PhoneDeepLinkTarget,
  index: PhoneContentIndex,
  unlockedAppIds: ReadonlySet<PhoneAppId>,
): PhoneNavigationState {
  if (target.itemId === undefined) {
    return navigateToApp(state, target.appId, index, unlockedAppIds);
  }

  const next = navigateToItem(state, target.appId, target.itemId, index, unlockedAppIds);
  if (
    next === state ||
    state.current.screen !== 'item' ||
    state.current.appId === target.appId
  ) {
    return next;
  }

  const sourceAppRoute: PhoneRoute = { screen: 'app', appId: state.current.appId };
  const previous = state.history.at(-1);
  const history =
    previous?.screen === 'app' && previous.appId === sourceAppRoute.appId
      ? state.history
      : [...state.history, sourceAppRoute];

  return { current: next.current, history };
}

export function goBack(state: PhoneNavigationState): PhoneNavigationState {
  const previous = state.history.at(-1);
  if (previous === undefined) return state;
  return { current: previous, history: state.history.slice(0, -1) };
}

export function goHome(state: PhoneNavigationState): PhoneNavigationState {
  if (state.current.screen === 'lock' || state.current.screen === 'home') return state;
  return { current: HOME_ROUTE, history: [] };
}
