import type { PlayerState } from '@/game/state/types';

export interface PersistenceAdapter {
  load(caseId: string): Promise<PlayerState | null>;
  save(state: PlayerState): Promise<void>;
  clear(caseId: string): Promise<void>;
}

export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
  async load(caseId: string): Promise<PlayerState | null> {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(`18473:save:${caseId}`);
    return raw ? (JSON.parse(raw) as PlayerState) : null;
  }

  async save(state: PlayerState): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`18473:save:${state.caseId}`, JSON.stringify(state));
  }

  async clear(caseId: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(`18473:save:${caseId}`);
  }
}
