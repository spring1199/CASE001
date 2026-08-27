import { z } from 'zod';

import rawRegistry from '../../../content/cases/case-001/assets.json';

const assetSchema = z.object({
  id: z.string().regex(/^[A-Z0-9-]+$/),
  filename: z.string().regex(/^[a-z0-9_.-]+$/),
  mode: z.enum(['generate', 'derive', 'ui-data']),
  spoiler: z.enum(['S0', 'S1', 'S2', 'S3', 'S4']),
  delivery: z.enum(['public', 'server', 'ui']),
  description: z.string().min(1),
  runtimePath: z.string().min(1).optional(),
  publicPath: z.string().startsWith('/assets/case-001/runtime/').optional(),
  revealFactIds: z.array(z.string().min(1)).optional(),
  revealEndingIds: z.array(z.enum(['ending_trace', 'ending_sever'])).optional(),
}).strict().superRefine((asset, context) => {
  if (asset.delivery === 'public' && asset.publicPath === undefined) {
    context.addIssue({ code: 'custom', path: ['publicPath'], message: 'Public assets require a public path.' });
  }
  if (asset.delivery === 'server' && asset.publicPath !== undefined) {
    context.addIssue({ code: 'custom', path: ['publicPath'], message: 'Server assets cannot declare a public path.' });
  }
  if (asset.delivery !== 'ui' && asset.runtimePath === undefined) {
    context.addIssue({ code: 'custom', path: ['runtimePath'], message: 'Binary assets require a runtime path.' });
  }
  if (asset.delivery !== 'ui' && !/\.(?:jpg|png)$/.test(asset.filename)) {
    context.addIssue({ code: 'custom', path: ['filename'], message: 'Binary assets require a JPG or PNG filename.' });
  }
});

const registrySchema = z.object({
  version: z.number().int().positive(),
  sourcePack: z.literal('18473-PHASE04-PRODUCTION-PACK-v1.0.1-FINAL'),
  assets: z.array(assetSchema).length(85),
}).strict().superRefine((registry, context) => {
  const ids = new Set<string>();
  registry.assets.forEach((asset, index) => {
    if (ids.has(asset.id)) {
      context.addIssue({ code: 'custom', path: ['assets', index, 'id'], message: `Duplicate asset ID "${asset.id}".` });
    }
    ids.add(asset.id);
  });
});

export const case001AssetRegistry = registrySchema.parse(rawRegistry);

export type CaseAssetAccessState = Readonly<{
  factIds: readonly string[];
  endingId: 'ending_trace' | 'ending_sever' | null;
}>;

export type CaseAssetResolution =
  | Readonly<{ kind: 'public-url'; url: string }>
  | Readonly<{ kind: 'private-file'; runtimePath: string; filename: string }>
  | Readonly<{ kind: 'ui-data' }>
  | Readonly<{ kind: 'unavailable' }>;

const assetsById = new Map(case001AssetRegistry.assets.map((asset) => [asset.id, asset]));

export function resolveCaseAsset(
  assetId: string,
  state: CaseAssetAccessState,
): CaseAssetResolution {
  const asset = assetsById.get(assetId);
  if (asset === undefined) return { kind: 'unavailable' };

  const knownFacts = new Set(state.factIds);
  if (!(asset.revealFactIds ?? []).every((factId) => knownFacts.has(factId))) {
    return { kind: 'unavailable' };
  }
  if (
    asset.revealEndingIds !== undefined
    && (state.endingId === null || !asset.revealEndingIds.includes(state.endingId))
  ) {
    return { kind: 'unavailable' };
  }
  if (asset.delivery === 'ui') return { kind: 'ui-data' };
  if (asset.delivery === 'public') return { kind: 'public-url', url: asset.publicPath! };
  return { kind: 'private-file', runtimePath: asset.runtimePath!, filename: asset.filename };
}
