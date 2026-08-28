import { case001Seed } from '@/game/content/case-001';
import {
  case001AssetRegistry,
  resolveCaseAsset,
  type CaseAssetAccessState,
} from '@/game/assets/case-assets';
import { createPhoneContentIndex, type PhoneAppId } from '@/phone/data/schema';

const appLabels: Record<PhoneAppId, { label: string; shortLabel: string; iconLabel: string }> = {
  messages: { label: 'Зурвас', shortLabel: 'Зурвас', iconLabel: 'Зурвас апп' },
  gallery: { label: 'Зураг', shortLabel: 'Зураг', iconLabel: 'Зургийн цомог' },
  calls: { label: 'Дуудлага', shortLabel: 'Дуудлага', iconLabel: 'Дуудлагын жагсаалт' },
  mail: { label: 'Шуудан', shortLabel: 'Шуудан', iconLabel: 'Цахим шуудан' },
  browser: { label: 'Хөтөч', shortLabel: 'Хөтөч', iconLabel: 'Вэб хөтөч' },
  notes: { label: 'Тэмдэглэл', shortLabel: 'Тэмдэглэл', iconLabel: 'Тэмдэглэл апп' },
  files: { label: 'Файл', shortLabel: 'Файл', iconLabel: 'Файлын сан' },
  settings: { label: 'Тохиргоо', shortLabel: 'Тохиргоо', iconLabel: 'Төхөөрөмжийн тохиргоо' },
};

type CommonRecord = {
  id: string;
  title: string;
  groupLabel?: string;
  subtitle?: string;
  timestampLabel?: string;
  body?: string;
  metadata?: Array<{ label: string; value: string }>;
  visual?: { assetId: string; alt: string; description: string; width?: number; height?: number };
  audio?: {
    assetId?: string;
    durationLabel: string;
    transcript: string;
    productionStatus: 'scripted' | 'ready';
  };
  deepLinks?: Array<{ label: string; appId: string; contentId?: string }>;
  discovery?: {
    artifactIds?: string[];
    evidenceIds?: string[];
    unlockAppIds?: string[];
    unlockContentIds?: string[];
  };
};

function projectCommon(record: CommonRecord) {
  return {
    id: record.id,
    title: record.title,
    groupLabel: record.groupLabel,
    subtitle: record.subtitle,
    timestampLabel: record.timestampLabel,
    body: record.body,
    metadata: record.metadata,
    visual: record.visual === undefined ? undefined : {
      assetId: record.visual.assetId,
      src: case001AssetRegistry.assets.find(({ id }) => id === record.visual?.assetId)?.publicPath,
      alt: record.visual.alt,
      description: record.visual.description,
      width: record.visual.width ?? 1536,
      height: record.visual.height ?? 1024,
    },
    audio: record.audio === undefined ? undefined : {
      src: record.audio.productionStatus === 'ready' && record.audio.assetId !== undefined
        ? `/api/case-audio/${record.audio.assetId}`
        : undefined,
      durationLabel: record.audio.durationLabel,
      transcript: record.audio.transcript,
      productionStatus: record.audio.productionStatus,
    },
    deepLinks: record.deepLinks?.map((link) => ({
      label: link.label,
      target: { appId: link.appId, itemId: link.contentId },
    })),
    discovery: {
      artifactIds: record.discovery?.artifactIds ?? [record.id],
      evidenceIds: record.discovery?.evidenceIds,
      unlockAppIds: record.discovery?.unlockAppIds,
      unlockContentIds: record.discovery?.unlockContentIds,
    },
  };
}

const messages = case001Seed.messages.map((record) => ({
  ...projectCommon(record),
  kind: 'message-thread' as const,
  messages: record.messages.map((message) => ({
    ...message,
    visual: message.visual === undefined ? undefined : {
      assetId: message.visual.assetId,
      src: case001AssetRegistry.assets.find(({ id }) => id === message.visual?.assetId)?.publicPath,
      alt: message.visual.alt,
      description: message.visual.description,
      width: message.visual.width ?? 1536,
      height: message.visual.height ?? 1024,
    },
    audio: message.audio === undefined ? undefined : {
      src: message.audio.productionStatus === 'ready' && message.audio.assetId !== undefined
        ? `/api/case-audio/${message.audio.assetId}`
        : undefined,
      durationLabel: message.audio.durationLabel,
      transcript: message.audio.transcript,
      productionStatus: message.audio.productionStatus,
    },
  })),
}));

const gallery = case001Seed.photos.map((record) => ({
  ...projectCommon(record),
  kind: 'photo' as const,
  collectionId: record.id === 'photo_audit_screen'
    ? 'recently_deleted'
    : record.id === 'photo_safehouse'
      ? 'hidden'
      : 'timeline',
  groupLabel: record.id.startsWith('photo_filler_') ? 'Ердийн зураг' : 'Нотлох зураг',
  metadata: record.metadata ?? (record.visual === undefined ? undefined : [
    { label: 'Хөрөнгийн ID', value: record.visual.assetId },
    { label: 'Эх сурвалж', value: 'Төхөөрөмжийн зургийн сан' },
  ]),
}));
const calls = case001Seed.calls.map((record) => ({ ...projectCommon(record), kind: 'call' as const }));
const mail = case001Seed.emails.map((record) => ({ ...projectCommon(record), kind: 'mail' as const }));
const browser = [
  ...case001Seed.browser.map((record) => ({
    ...projectCommon(record),
    kind: 'web-page' as const,
    collectionId: record.id === 'browser_cabin_plan'
      ? 'saved'
      : Number(record.id.replace('browser_', '')) >= 13
        ? 'searches'
        : 'history',
  })),
  ...case001Seed.locations.map((record) => ({
    ...projectCommon(record), kind: 'web-page' as const, collectionId: 'saved',
  })),
];
const notes = case001Seed.notes.map((record) => ({ ...projectCommon(record), kind: 'note' as const }));
const files = case001Seed.artifacts.map((record) => ({
  ...projectCommon(record),
  kind: record.kind === 'file' ? 'file' as const : 'system-info' as const,
}));

const app = (id: PhoneAppId, items: unknown[], extra: object = {}) => ({
  id,
  ...appLabels[id],
  lockedInitially: false,
  items,
  ...extra,
});

export const case001PhoneIndex = createPhoneContentIndex({
  version: 1,
  locale: 'mn',
  device: {
    ownerLabel: 'Тэнүүн Батзоригийн төхөөрөмж',
    modelLabel: 'Aru X1',
    systemLabel: 'Aru OS 12.4 · forensic mirror',
    lockPrompt: 'Мөрдөн шалгах төхөөрөмжийг нээнэ үү',
  },
  apps: [
    app('messages', messages),
    app('gallery', gallery, {
      collections: [
        { id: 'timeline', label: 'Цагийн шугам', presentation: 'timeline-grid' },
        { id: 'hidden', label: 'Нуусан', presentation: 'timeline-grid', emptyLabel: 'Нуусан зураг алга.' },
        { id: 'recently_deleted', label: 'Саяхан устгасан', presentation: 'timeline-grid', emptyLabel: 'Саяхан устгасан зураг алга.' },
      ],
    }),
    app('calls', calls),
    app('mail', mail),
    app('browser', browser, {
      collections: [
        { id: 'history', label: 'Түүх', presentation: 'list' },
        { id: 'searches', label: 'Өмнөх хайлтууд', presentation: 'list' },
        { id: 'saved', label: 'Хадгалсан', presentation: 'list' },
      ],
    }),
    app('notes', notes),
    app('files', files),
    app('settings', [{
      id: 'case_001_device_info',
      kind: 'system-info',
      title: 'Төхөөрөмжийн тухай',
      body: 'Aru X1 · forensic mirror · Case #001',
      discovery: { artifactIds: ['case_001_device_info'] },
    }]),
  ],
});

const authoredGatesById = new Map(
  [
    ...case001Seed.artifacts,
    ...case001Seed.browser,
    ...case001Seed.calls,
    ...case001Seed.emails,
    ...case001Seed.locations,
    ...case001Seed.messages,
    ...case001Seed.notes,
    ...case001Seed.photos,
  ].map((record) => [record.id, {
    facts: record.hiddenUntilFacts ?? [],
    endings: record.hiddenUntilEndings ?? [],
  }] as const),
);

function itemIsVisible(itemId: string, access: CaseAssetAccessState): boolean {
  const gates = authoredGatesById.get(itemId);
  if (gates === undefined) return true;
  const facts = new Set(access.factIds);
  return gates.facts.every((factId) => facts.has(factId))
    && (gates.endings.length === 0
      || (access.endingId !== null && gates.endings.includes(access.endingId)));
}

function revealVisual<Visual extends { assetId?: string; src?: string }>(
  visual: Visual | undefined,
  access: CaseAssetAccessState,
): Visual | undefined {
  if (visual?.assetId === undefined) return visual;
  const resolution = resolveCaseAsset(visual.assetId, access);
  const src = resolution.kind === 'public-url'
    ? resolution.url
    : resolution.kind === 'private-file'
      ? `/api/case-assets/${visual.assetId}`
      : undefined;
  return { ...visual, src };
}

export function createCase001PhoneIndex(access: CaseAssetAccessState) {
  return createPhoneContentIndex({
    ...case001PhoneIndex.content,
    apps: case001PhoneIndex.content.apps.map((appDescriptor) => ({
      ...appDescriptor,
      items: appDescriptor.items
        .filter((item) => itemIsVisible(item.id, access))
        .map((item) => ({
          ...item,
          visual: revealVisual(item.visual, access),
          ...(item.kind === 'message-thread' ? {
            messages: item.messages.map((message) => ({
              ...message,
              visual: revealVisual(message.visual, access),
            })),
          } : {}),
        })),
    })),
  });
}
