import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ledgerPath = process.argv[2];
if (!ledgerPath) throw new Error('Usage: node scripts/import-phase04-assets.mjs <generation-ledger.json>');
const source = JSON.parse(readFileSync(resolve(ledgerPath), 'utf8'));

function gates(asset) {
  if (asset.id.startsWith('END-')) {
    return { revealFactIds: ['fact_tenuun_alive'], revealEndingIds: ['ending_trace', 'ending_sever'] };
  }
  if (asset.id === 'END-005') {
    return { revealEndingIds: ['ending_trace', 'ending_sever'] };
  }
  if (asset.spoiler === 'S4') return { revealFactIds: ['fact_tenuun_alive'] };
  if (asset.id.startsWith('W47-')) return { revealFactIds: ['fact_f17_is_maral'] };
  if (asset.id.startsWith('DEC-')) return { revealFactIds: ['fact_tenuun_obscured'] };
  if (asset.id === 'HOPE-002') return { revealFactIds: ['fact_planned_disappearance'] };
  if (asset.spoiler === 'S3') return { revealFactIds: ['fact_18473_archive_open'] };
  return {};
}

const assets = source.assets.map((asset) => {
  const mode = asset.mode.toLowerCase().replace('ui data', 'ui-data');
  const delivery = mode === 'ui-data'
    ? 'ui'
    : asset.spoiler === 'S3' || asset.spoiler === 'S4'
      ? 'server'
      : 'public';
  const runtimeRoot = delivery === 'server'
    ? 'private-assets/case-001/runtime'
    : 'public/assets/case-001/runtime';
  return {
    id: asset.id,
    filename: asset.filename,
    mode,
    spoiler: asset.spoiler,
    delivery,
    description: asset.description,
    ...(mode === 'ui-data' ? {} : { runtimePath: `${runtimeRoot}/${asset.filename}` }),
    ...(delivery === 'public' ? { publicPath: `/assets/case-001/runtime/${asset.filename}` } : {}),
    ...gates(asset),
  };
});

writeFileSync(resolve('content/cases/case-001/assets.json'), `${JSON.stringify({
  version: 1,
  sourcePack: '18473-PHASE04-PRODUCTION-PACK-v1.0.1-FINAL',
  assets,
}, null, 2)}\n`);

console.log(`Imported ${assets.length} asset policies.`);
