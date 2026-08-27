import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const registryPath = path.join(root, 'content/cases/case-001/assets.json');
const ledgerPath = path.join(root, 'content/cases/case-001/generation-ledger.json');
const sourceRoot = path.join(root, 'assets/case-001/source-masters');
const publicRuntimeRoot = path.join(root, 'public/assets/case-001/runtime');
const privateRuntimeRoot = path.join(root, 'private-assets/case-001/runtime');
const sourceFolders = ['anchors', 'generated', 'derived'];

async function findSource(filename) {
  for (const folder of sourceFolders) {
    const candidate = path.join(sourceRoot, folder, filename);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next source-master class.
    }
  }
  throw new Error(`Missing source master: ${filename}`);
}

function relativeFromRoot(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

async function buildDerivative(sourcePath, outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  let pipeline = sharp(sourcePath)
    .rotate()
    .resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true });

  if (path.extname(outputPath).toLowerCase() === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
  } else {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  }

  const info = await pipeline.toFile(outputPath);
  const bytes = await readFile(outputPath);
  return {
    width: info.width,
    height: info.height,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));

await rm(publicRuntimeRoot, { recursive: true, force: true });
await rm(privateRuntimeRoot, { recursive: true, force: true });

const assets = [];
for (const asset of registry.assets) {
  if (asset.mode === 'ui-data') {
    assets.push({
      id: asset.id,
      filename: asset.filename,
      mode: asset.mode,
      spoiler: asset.spoiler,
      delivery: asset.delivery,
      sourceMasterPath: null,
      runtimePath: null,
      width: null,
      height: null,
      bytes: null,
      sha256: null,
      qaStatus: 'approved',
    });
    continue;
  }

  const sourcePath = await findSource(asset.filename);
  const outputRoot = asset.delivery === 'public' ? publicRuntimeRoot : privateRuntimeRoot;
  const outputPath = path.join(outputRoot, asset.filename);
  const metadata = await buildDerivative(sourcePath, outputPath);
  assets.push({
    id: asset.id,
    filename: asset.filename,
    mode: asset.mode,
    spoiler: asset.spoiler,
    delivery: asset.delivery,
    sourceMasterPath: relativeFromRoot(sourcePath),
    runtimePath: relativeFromRoot(outputPath),
    ...metadata,
    qaStatus: 'approved',
  });
}

const ledger = {
  version: 1,
  sourcePack: registry.sourcePack,
  productionProfile: {
    maxWidth: 1536,
    maxHeight: 1536,
    jpegQuality: 82,
    metadata: 'stripped',
  },
  counts: {
    total: assets.length,
    generated: assets.filter(({ mode }) => mode === 'generate').length,
    derived: assets.filter(({ mode }) => mode === 'derive').length,
    uiData: assets.filter(({ mode }) => mode === 'ui-data').length,
  },
  assets,
};

await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(`Built ${assets.length - ledger.counts.uiData} Case #001 runtime assets.`);
console.log(`Ledger: ${relativeFromRoot(ledgerPath)}`);
