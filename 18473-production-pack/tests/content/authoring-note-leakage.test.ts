import { describe, expect, it } from 'vitest';

import { case001Seed } from '@/game/content/case-001';
import {
  createInitialCaseState,
  processEngineEvent,
  settleEngineState,
} from '@/game/engine/engine';
import { projectCaseView } from '@/game/engine/view';
import { createCase001PhoneIndex } from '@/phone/data/case-001';
import { toPublicCaseSummary } from '@/game/content/public-case-summary';
import type { CaseAssetAccessState } from '@/game/assets/case-assets';

/**
 * Writers'-room language that must never reach a player. These are matched
 * against the *projected* player-visible payloads rather than against source
 * files, so authored records may keep the same wording in server-only
 * `authoringNote` metadata.
 */
const PRODUCTION_NOTE_PATTERNS: readonly Readonly<{ label: string; pattern: RegExp }>[] = [
  { label: 'purpose header', pattern: /(^|\n)\s*Purpose\s*:/i },
  { label: 'length target', pattern: /(^|\n)?\s*Length target\s*:/i },
  { label: 'clue extract', pattern: /clue extract/i },
  { label: 'authoring note', pattern: /\bauthoring note\b/i },
  { label: 'production note', pattern: /\bproduction note\b/i },
  { label: 'implementation note', pattern: /\bimplementation note\b/i },
  { label: 'designer note', pattern: /\bdesigner note\b/i },
  { label: 'developer note', pattern: /\bdeveloper note\b/i },
  { label: 'reveal purpose', pattern: /\breveal purpose\b/i },
  { label: 'pacing note', pattern: /\bpacing note\b/i },
  { label: 'recontextualization brief', pattern: /\brecontextualization\b/i },
  { label: 'unfinished marker', pattern: /\b(?:TODO|FIXME|WIP)\b/ },
];

/**
 * Every field a player can read. `authoringNote` is deliberately absent: the
 * point of the field is that it never appears in a projection at all.
 */
const PLAYER_TEXT_KEYS: ReadonlySet<string> = new Set([
  'title', 'subtitle', 'body', 'transcript', 'description', 'label', 'alt',
  'timestampLabel', 'groupLabel', 'emptyLabel', 'value', 'durationLabel',
  'iconLabel', 'shortLabel', 'choiceLabel', 'ownerLabel', 'modelLabel',
  'systemLabel', 'lockPrompt', 'senderLabel',
]);

type Finding = Readonly<{ path: string; key: string; rule: string; text: string }>;

function collectFindings(root: unknown, rootPath: string): Finding[] {
  const findings: Finding[] = [];
  const walk = (node: unknown, path: string, key: string): void => {
    if (typeof node === 'string') {
      if (!PLAYER_TEXT_KEYS.has(key)) return;
      for (const { label, pattern } of PRODUCTION_NOTE_PATTERNS) {
        if (pattern.test(node)) {
          findings.push({ path, key, rule: label, text: node.slice(0, 120) });
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((entry, index) => walk(entry, `${path}[${index}]`, key));
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    for (const [childKey, value] of Object.entries(node)) {
      walk(value, `${path}.${childKey}`, childKey);
    }
  };
  walk(root, rootPath, rootPath);
  return findings;
}

const ACCESS_STATES: readonly Readonly<{ label: string; access: CaseAssetAccessState }>[] = [
  { label: 'fresh unlock', access: { factIds: [], endingId: null } },
  {
    label: 'deep progression',
    access: { factIds: case001Seed.facts.map(({ id }) => id), endingId: null },
  },
  {
    label: 'after SEVER',
    access: { factIds: case001Seed.facts.map(({ id }) => id), endingId: 'ending_sever' },
  },
  {
    label: 'after TRACE',
    access: { factIds: case001Seed.facts.map(({ id }) => id), endingId: 'ending_trace' },
  },
];

describe('player-facing authoring-note leakage', () => {
  it.each(ACCESS_STATES)(
    'keeps writers-room language out of the $label phone projection',
    ({ access }) => {
      const projection = createCase001PhoneIndex(access);
      expect(collectFindings(projection.content, 'phone')).toEqual([]);
    },
  );

  it('keeps the public case summary free of production language', () => {
    expect(collectFindings(toPublicCaseSummary(case001Seed.manifest), 'summary')).toEqual([]);
  });

  it('keeps evidence, deductions, timeline, GRAPH and the ending free of production language', () => {
    const opened = settleEngineState(case001Seed, {
      ...createInitialCaseState(case001Seed, '2026-08-28T00:00:00.000Z'),
      knownFactIds: case001Seed.facts.map(({ id }) => id),
      discoveredEvidenceIds: case001Seed.evidence.map(({ id }) => id),
      discoveredArtifactIds: case001Seed.artifacts.map(({ id }) => id),
    }).state;
    expect(collectFindings(projectCaseView(case001Seed, opened), 'view')).toEqual([]);

    const ended = processEngineEvent(case001Seed, opened, {
      type: 'select-ending',
      endingId: 'ending_sever',
    }).state;
    expect(collectFindings(projectCaseView(case001Seed, ended), 'endedView')).toEqual([]);
  });

  it('never projects the server-only authoringNote field itself', () => {
    for (const { access } of ACCESS_STATES) {
      const serialized = JSON.stringify(createCase001PhoneIndex(access).content);
      expect(serialized).not.toContain('authoringNote');
      expect(serialized).not.toContain('INC-18473 clue extract');
    }
  });

  it('keeps the recovered final call free of its authoring brief while preserving the script', () => {
    const projection = createCase001PhoneIndex({
      factIds: case001Seed.facts.map(({ id }) => id),
      endingId: 'ending_sever',
    });
    const finalCall = projection.itemsById['call_18473_03'];

    expect(finalCall).toBeDefined();
    expect(finalCall?.body).not.toMatch(/Purpose\s*:|Length target\s*:/i);
    expect(finalCall?.audio?.transcript).not.toMatch(/Purpose\s*:|Length target\s*:/i);
    // The authored performance, its stage directions and the raspberry callback
    // must survive the sanitation untouched.
    expect(finalCall?.audio?.transcript).toContain('[Old call. Low room noise. Maral laughs near beginning.]');
    expect(finalCall?.audio?.transcript).toContain('Бөөрөлзгөнө.');
    expect(finalCall?.audio?.transcript).toContain('[Both laugh. Audio ends naturally, not dramatically.]');
  });

  it('still records the removed briefs as server-only authored metadata', () => {
    const finalCall = case001Seed.calls.find(({ id }) => id === 'call_18473_03');
    expect(finalCall?.authoringNote).toMatch(/Purpose\s*:/);

    const extractThreads = case001Seed.messages.filter(
      ({ authoringNote }) => authoringNote === 'INC-18473 clue extract',
    );
    expect(extractThreads).toHaveLength(4);
    for (const thread of extractThreads) {
      expect(thread.subtitle).not.toMatch(/clue extract/i);
      for (const message of thread.messages) {
        expect(message.timestampLabel).not.toMatch(/clue extract/i);
      }
    }
  });
});
