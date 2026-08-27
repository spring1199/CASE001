import { z } from 'zod';

const idSchema = z.string().trim().min(1);
const textSchema = z.string().trim().min(1);

export const authoredMetadataRowSchema = z.object({
  label: textSchema,
  value: textSchema,
}).strict();

export const authoredDeepLinkSchema = z.object({
  label: textSchema,
  appId: idSchema,
  contentId: idSchema.optional(),
}).strict();

export const authoredVisualSchema = z.object({
  assetId: idSchema,
  alt: textSchema,
  description: textSchema,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
}).strict().superRefine((visual, context) => {
  if ((visual.width === undefined) !== (visual.height === undefined)) {
    context.addIssue({
      code: 'custom',
      message: 'Visual dimensions must provide both width and height.',
    });
  }
});

export const authoredAudioSchema = z.object({
  assetId: idSchema.optional(),
  durationLabel: textSchema,
  transcript: textSchema,
  productionStatus: z.enum(['scripted', 'ready']).default('scripted'),
}).strict().superRefine((audio, context) => {
  if (audio.productionStatus === 'ready' && audio.assetId === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['assetId'],
      message: 'Ready audio requires an opaque asset ID.',
    });
  }
});

export const authoredDiscoverySchema = z.object({
  artifactIds: z.array(idSchema).optional(),
  evidenceIds: z.array(idSchema).optional(),
  unlockAppIds: z.array(idSchema).optional(),
  unlockContentIds: z.array(idSchema).optional(),
}).strict();

export const authoredMessageEntrySchema = z.object({
  id: idSchema,
  senderLabel: textSchema,
  direction: z.enum(['incoming', 'outgoing', 'system']),
  body: textSchema.optional(),
  timestampLabel: textSchema,
  read: z.boolean(),
  audio: authoredAudioSchema.optional(),
  visual: authoredVisualSchema.optional(),
}).strict().superRefine((message, context) => {
  if (message.body === undefined && message.audio === undefined && message.visual === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'A message entry requires body, audio, or visual content.',
    });
  }
});

const commonShape = {
  id: idSchema,
  title: textSchema,
  collectionId: idSchema.optional(),
  groupLabel: textSchema.optional(),
  subtitle: textSchema.optional(),
  timestampLabel: textSchema.optional(),
  body: textSchema.optional(),
  visual: authoredVisualSchema.optional(),
  audio: authoredAudioSchema.optional(),
  metadata: z.array(authoredMetadataRowSchema).optional(),
  deepLinks: z.array(authoredDeepLinkSchema).optional(),
  discovery: authoredDiscoverySchema.optional(),
  hiddenUntilFacts: z.array(idSchema).optional(),
  hiddenUntilEndings: z.array(idSchema).optional(),
};

export const artifactRecordSchema = z.object({
  ...commonShape,
  kind: z.enum(['file', 'system-info']),
}).strict();

export const browserRecordSchema = z.object({
  ...commonShape,
  kind: z.literal('web-page'),
}).strict();

export const callRecordSchema = z.object({
  ...commonShape,
  kind: z.literal('call'),
}).strict();

export const emailRecordSchema = z.object({
  ...commonShape,
  kind: z.literal('mail'),
}).strict();

export const locationRecordSchema = z.object({
  ...commonShape,
  kind: z.literal('location'),
}).strict();

export const messageThreadRecordSchema = z.object({
  ...commonShape,
  kind: z.literal('message-thread'),
  messages: z.array(authoredMessageEntrySchema).min(1),
}).strict().superRefine((thread, context) => {
  const seen = new Set<string>();
  thread.messages.forEach((message, messageIndex) => {
    if (seen.has(message.id)) {
      context.addIssue({
        code: 'custom',
        path: ['messages', messageIndex, 'id'],
        message: `duplicate message ID "${message.id}"`,
      });
    }
    seen.add(message.id);
  });
});

export const noteRecordSchema = z.object({
  ...commonShape,
  kind: z.literal('note'),
}).strict();

export const photoRecordSchema = z.object({
  ...commonShape,
  kind: z.literal('photo'),
  visual: authoredVisualSchema,
}).strict();

export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;
export type BrowserRecord = z.infer<typeof browserRecordSchema>;
export type CallRecord = z.infer<typeof callRecordSchema>;
export type EmailRecord = z.infer<typeof emailRecordSchema>;
export type LocationRecord = z.infer<typeof locationRecordSchema>;
export type MessageThreadRecord = z.infer<typeof messageThreadRecordSchema>;
export type NoteRecord = z.infer<typeof noteRecordSchema>;
export type PhotoRecord = z.infer<typeof photoRecordSchema>;
export type AuthoredArtifactRecord =
  | ArtifactRecord
  | BrowserRecord
  | CallRecord
  | EmailRecord
  | LocationRecord
  | MessageThreadRecord
  | NoteRecord
  | PhotoRecord;
