import { z } from 'zod';

export const REQUIRED_PHONE_APP_IDS = [
  'messages',
  'gallery',
  'calls',
  'mail',
  'browser',
  'notes',
  'files',
  'settings',
] as const;

export const phoneAppIdSchema = z.enum(REQUIRED_PHONE_APP_IDS);

const nonEmptyTextSchema = z.string().trim().min(1);
const identifierSchema = z.string().regex(/^[a-z][a-z0-9_-]*$/, {
  message: 'Identifiers must use lowercase letters, digits, underscores, or hyphens.',
});

export const phoneDeepLinkTargetSchema = z.strictObject({
  appId: phoneAppIdSchema,
  itemId: identifierSchema.optional(),
});

export const phoneDeepLinkSchema = z.strictObject({
  label: nonEmptyTextSchema,
  target: phoneDeepLinkTargetSchema,
});

export const phoneMetadataRowSchema = z.strictObject({
  label: nonEmptyTextSchema,
  value: nonEmptyTextSchema,
});

export const phoneVisualSchema = z.strictObject({
  src: nonEmptyTextSchema.optional(),
  alt: nonEmptyTextSchema,
  description: nonEmptyTextSchema,
});

export const phoneAudioSchema = z.strictObject({
  src: nonEmptyTextSchema,
  durationLabel: nonEmptyTextSchema,
  transcript: nonEmptyTextSchema,
});

export const phoneDiscoveryEffectsSchema = z.strictObject({
  artifactIds: z.array(identifierSchema).optional(),
  evidenceIds: z.array(identifierSchema).optional(),
  unlockAppIds: z.array(phoneAppIdSchema).optional(),
  unlockContentIds: z.array(identifierSchema).optional(),
});

export const phoneMessageRecordSchema = z.strictObject({
  id: identifierSchema,
  senderLabel: nonEmptyTextSchema,
  direction: z.enum(['incoming', 'outgoing', 'system']),
  body: nonEmptyTextSchema.optional(),
  timestampLabel: nonEmptyTextSchema,
  read: z.boolean(),
  audio: phoneAudioSchema.optional(),
  visual: phoneVisualSchema.optional(),
}).superRefine((message, context) => {
  if (message.body === undefined && message.audio === undefined && message.visual === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'A message record requires body, audio, or visual content.',
    });
  }
});

const commonItemShape = {
  id: identifierSchema,
  title: nonEmptyTextSchema,
  subtitle: nonEmptyTextSchema.optional(),
  timestampLabel: nonEmptyTextSchema.optional(),
  body: nonEmptyTextSchema.optional(),
  visual: phoneVisualSchema.optional(),
  audio: phoneAudioSchema.optional(),
  metadata: z.array(phoneMetadataRowSchema).optional(),
  deepLinks: z.array(phoneDeepLinkSchema).optional(),
  discovery: phoneDiscoveryEffectsSchema.optional(),
};

const messageThreadItemSchema = z.strictObject({
  ...commonItemShape,
  kind: z.literal('message-thread'),
  messages: z.array(phoneMessageRecordSchema).min(1),
});

function genericItemSchema<Kind extends string>(kind: Kind) {
  return z.strictObject({
    ...commonItemShape,
    kind: z.literal(kind),
  });
}

export const phoneItemSchema = z.discriminatedUnion('kind', [
  messageThreadItemSchema,
  genericItemSchema('photo'),
  genericItemSchema('call'),
  genericItemSchema('mail'),
  genericItemSchema('web-page'),
  genericItemSchema('note'),
  genericItemSchema('file'),
  genericItemSchema('system-info'),
]);

export const phoneAppDescriptorSchema = z.strictObject({
  id: phoneAppIdSchema,
  label: nonEmptyTextSchema,
  shortLabel: nonEmptyTextSchema,
  iconLabel: nonEmptyTextSchema,
  lockedInitially: z.boolean(),
  items: z.array(phoneItemSchema),
});

export const phoneContentSchema = z.strictObject({
  version: z.number().int().positive(),
  locale: z.literal('mn'),
  device: z.strictObject({
    ownerLabel: nonEmptyTextSchema,
    modelLabel: nonEmptyTextSchema,
    systemLabel: nonEmptyTextSchema,
    lockPrompt: nonEmptyTextSchema,
  }),
  apps: z.array(phoneAppDescriptorSchema),
}).superRefine((content, context) => {
  const appIndexById = new Map<PhoneAppId, number>();
  const itemOwnerById = new Map<string, PhoneAppId>();

  content.apps.forEach((app, appIndex) => {
    const firstAppIndex = appIndexById.get(app.id);
    if (firstAppIndex !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['apps', appIndex, 'id'],
        message: `Duplicate app ID "${app.id}" (first declared at apps.${firstAppIndex}).`,
      });
    } else {
      appIndexById.set(app.id, appIndex);
    }

    app.items.forEach((item, itemIndex) => {
      const firstOwner = itemOwnerById.get(item.id);
      if (firstOwner !== undefined) {
        context.addIssue({
          code: 'custom',
          path: ['apps', appIndex, 'items', itemIndex, 'id'],
          message: `Duplicate item ID "${item.id}" (first declared in app "${firstOwner}").`,
        });
      } else {
        itemOwnerById.set(item.id, app.id);
      }
    });
  });

  REQUIRED_PHONE_APP_IDS.forEach((appId) => {
    if (!appIndexById.has(appId)) {
      context.addIssue({
        code: 'custom',
        path: ['apps'],
        message: `Missing required app ID "${appId}".`,
      });
    }
  });

  content.apps.forEach((app, appIndex) => {
    app.items.forEach((item, itemIndex) => {
      item.deepLinks?.forEach((link, linkIndex) => {
        const targetAppExists = appIndexById.has(link.target.appId);
        const targetOwner = link.target.itemId
          ? itemOwnerById.get(link.target.itemId)
          : link.target.appId;
        if (!targetAppExists || targetOwner !== link.target.appId) {
          context.addIssue({
            code: 'custom',
            path: ['apps', appIndex, 'items', itemIndex, 'deepLinks', linkIndex, 'target'],
            message: `Broken deep link to "${link.target.appId}${link.target.itemId ? `/${link.target.itemId}` : ''}".`,
          });
        }
      });
    });
  });
});

export type PhoneAppId = z.infer<typeof phoneAppIdSchema>;
export type PhoneDeepLinkTarget = z.infer<typeof phoneDeepLinkTargetSchema>;
export type PhoneDiscoveryEffects = z.infer<typeof phoneDiscoveryEffectsSchema>;
export type PhoneItem = z.infer<typeof phoneItemSchema>;
export type PhoneAppDescriptor = z.infer<typeof phoneAppDescriptorSchema>;
export type PhoneContent = z.infer<typeof phoneContentSchema>;

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export type PhoneContentIndex = Readonly<{
  content: DeepReadonly<PhoneContent>;
  appsById: Readonly<Record<PhoneAppId, DeepReadonly<PhoneAppDescriptor>>>;
  itemsById: Readonly<Record<string, DeepReadonly<PhoneItem>>>;
  itemAppIds: Readonly<Record<string, PhoneAppId>>;
}>;

export function parsePhoneContent(input: unknown): PhoneContent {
  return phoneContentSchema.parse(input);
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value as DeepReadonly<T>;
  }

  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value) as DeepReadonly<T>;
}

export function createPhoneContentIndex(input: unknown): PhoneContentIndex {
  const content = deepFreeze(parsePhoneContent(input));
  const appsById = Object.freeze(
    Object.fromEntries(content.apps.map((app) => [app.id, app])),
  ) as Record<PhoneAppId, DeepReadonly<PhoneAppDescriptor>>;
  const itemEntries = content.apps.flatMap((app) => app.items.map((item) => [item.id, item] as const));
  const itemOwnerEntries = content.apps.flatMap((app) =>
    app.items.map((item) => [item.id, app.id] as const),
  );

  return Object.freeze({
    content,
    appsById,
    itemsById: Object.freeze(Object.fromEntries(itemEntries)),
    itemAppIds: Object.freeze(Object.fromEntries(itemOwnerEntries)),
  });
}
