import { describe, expect, it } from 'vitest';
import {
  case001AssetRegistry,
  resolveCaseAsset,
} from '@/game/assets/case-assets';

describe('Case #001 spoiler-safe asset registry', () => {
  it('registers all 85 manifest assets with the corrected mode counts', () => {
    expect(case001AssetRegistry.assets).toHaveLength(85);
    expect(case001AssetRegistry.assets.filter(({ mode }) => mode === 'generate')).toHaveLength(79);
    expect(case001AssetRegistry.assets.filter(({ mode }) => mode === 'derive')).toHaveLength(2);
    expect(case001AssetRegistry.assets.filter(({ mode }) => mode === 'ui-data')).toHaveLength(4);
  });

  it('keeps S0–S2 public and S3–S4 server-only with opaque IDs', () => {
    for (const asset of case001AssetRegistry.assets) {
      if (asset.mode === 'ui-data') continue;
      if (asset.spoiler === 'S0' || asset.spoiler === 'S1' || asset.spoiler === 'S2') {
        expect(asset.delivery).toBe('public');
        expect(asset.publicPath).toMatch(/^\/assets\/case-001\/runtime\//);
      } else {
        expect(asset.delivery).toBe('server');
        expect(asset.publicPath).toBeUndefined();
        expect(asset.runtimePath).toMatch(/^private-assets\/case-001\/runtime\//);
      }
    }
  });

  it('returns the same rejection for locked and nonexistent private IDs', () => {
    const locked = resolveCaseAsset('HOPE-003', { factIds: [], endingId: null });
    const missing = resolveCaseAsset('DOES-NOT-EXIST', { factIds: [], endingId: null });
    expect(locked).toEqual({ kind: 'unavailable' });
    expect(missing).toEqual({ kind: 'unavailable' });
  });

  it('allows S4 only after its reveal and never exposes a public private filename', () => {
    expect(resolveCaseAsset('HOPE-003', {
      factIds: ['fact_tenuun_alive'], endingId: null,
    })).toMatchObject({ kind: 'private-file' });
    expect(JSON.stringify(case001AssetRegistry.assets.filter(({ spoiler }) => spoiler === 'S4')))
      .not.toContain('/assets/case-001/runtime/');
  });

  it('keeps ending imagery post-choice and NODE: 0 ending-gated', () => {
    expect(resolveCaseAsset('END-002', {
      factIds: ['fact_tenuun_alive'], endingId: null,
    })).toEqual({ kind: 'unavailable' });
    expect(resolveCaseAsset('END-002', {
      factIds: ['fact_tenuun_alive'], endingId: 'ending_sever',
    })).toMatchObject({ kind: 'private-file' });
    expect(resolveCaseAsset('END-005', {
      factIds: ['fact_tenuun_alive'], endingId: null,
    })).toEqual({ kind: 'unavailable' });
  });
});
