import { case001Seed } from '@/game/content/case-001';
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
  visual?: { alt: string; description: string; width?: number; height?: number };
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
      alt: record.visual.alt,
      description: record.visual.description,
      width: record.visual.width,
      height: record.visual.height,
    },
    audio: record.audio === undefined ? undefined : {
      src: `/api/case-audio/${record.audio.assetId ?? record.id}`,
      durationLabel: record.audio.durationLabel,
      transcript: record.audio.transcript,
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
      alt: message.visual.alt,
      description: message.visual.description,
      width: message.visual.width,
      height: message.visual.height,
    },
    audio: message.audio === undefined ? undefined : {
      src: `/api/case-audio/${message.audio.assetId ?? message.id}`,
      durationLabel: message.audio.durationLabel,
      transcript: message.audio.transcript,
    },
  })),
}));

const gallery = case001Seed.photos.map((record) => ({
  ...projectCommon(record), kind: 'photo' as const, collectionId: 'timeline',
}));
const calls = case001Seed.calls.map((record) => ({ ...projectCommon(record), kind: 'call' as const }));
const mail = case001Seed.emails.map((record) => ({ ...projectCommon(record), kind: 'mail' as const }));
const browser = [
  ...case001Seed.browser.map((record) => ({ ...projectCommon(record), kind: 'web-page' as const })),
  ...case001Seed.locations.map((record) => ({ ...projectCommon(record), kind: 'web-page' as const })),
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
      collections: [{ id: 'timeline', label: 'Цагийн шугам', presentation: 'timeline-grid' }],
    }),
    app('calls', calls),
    app('mail', mail),
    app('browser', browser),
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
