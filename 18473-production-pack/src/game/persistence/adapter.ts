import { createSaveEnvelope, deserializeSave } from '@/game/persistence/save';
import type { PlayerState } from '@/game/state/types';

export { SavePersistenceError } from '@/game/persistence/save';

export interface PersistenceAdapter {
  load(caseId: string): Promise<PlayerState | null>;
  save(state: PlayerState): Promise<void>;
  clear(caseId: string): Promise<void>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageFactory = () => StorageLike | null;

export type LocalStoragePersistenceOptions = {
  storage?: StorageFactory;
  now?: () => string;
};

const defaultStorageFactory: StorageFactory = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const defaultClock = (): string => new Date().toISOString();
const saveKey = (caseId: string): string => `18473:save:${caseId}`;

export class LocalStoragePersistenceAdapter implements PersistenceAdapter {
  private readonly storage: StorageFactory;
  private readonly now: () => string;

  constructor(options: LocalStoragePersistenceOptions = {}) {
    this.storage = options.storage ?? defaultStorageFactory;
    this.now = options.now ?? defaultClock;
  }

  async load(caseId: string): Promise<PlayerState | null> {
    const storage = this.storage();
    if (storage === null) return null;
    const raw = storage.getItem(saveKey(caseId));
    return raw === null ? null : deserializeSave(raw, caseId);
  }

  async save(state: PlayerState): Promise<void> {
    const envelope = createSaveEnvelope(state, this.now());
    const storage = this.storage();
    if (storage === null) return;
    storage.setItem(saveKey(state.caseId), JSON.stringify(envelope));
  }

  async clear(caseId: string): Promise<void> {
    const storage = this.storage();
    if (storage === null) return;
    storage.removeItem(saveKey(caseId));
  }
}
