import {
  parseCaseBundle,
  type CaseBundleSources,
  type LoadedCaseBundle,
} from '../../src/game/content/case-loader';

/**
 * Neutral synthetic mini-case used to prove the Phase 03 engine before the
 * real 18473 content is authored. It shares no fact, character, or story
 * detail with Case #001 canon; every mechanic the engine supports appears at
 * least once, and its manifest declares `progressionComplete` so the strict
 * fair-play validation runs on load.
 */
export function createMiniCaseSources(): CaseBundleSources {
  const base = 'content/cases/mini';
  return {
    manifest: {
      sourcePath: `${base}/case.json`,
      data: {
        id: 'case_mini',
        title: 'Mini engine proof',
        version: 1,
        locale: 'mn',
        targetMinutes: 30,
        initialObjectiveIds: ['obj_m_start'],
        appIds: ['messages'],
        canonEndingId: 'ending_m_close',
        progressionComplete: true,
      },
    },
    characters: {
      sourcePath: `${base}/characters.json`,
      data: [
        { id: 'char_m_resident', name: 'Оршин суугч', role: 'suspect', playerVisibleAtStart: true },
        {
          id: 'char_m_alias',
          name: 'X7',
          role: 'unknown',
          canonicalCharacterId: 'char_m_resident',
          hiddenUntilFact: 'fact_m_identity',
        },
      ],
    },
    evidence: {
      sourcePath: `${base}/evidence.json`,
      data: [
        {
          id: 'ev_m_key',
          title: 'Түлхүүр тэмдэглэл',
          sourceArtifactId: 'art_m_note',
          description: 'Нээх дугаар бүхий тэмдэглэл.',
          tags: ['opening'],
          grantsFacts: ['fact_m_open'],
        },
        {
          id: 'ev_m_anchor',
          title: 'Гол баримт',
          sourceArtifactId: 'art_m_anchor',
          description: 'Alias холбоосын үндсэн баримт.',
          tags: ['identity'],
        },
        {
          id: 'ev_m_hint1',
          title: 'Сэжүүр 1',
          sourceArtifactId: 'art_m_hint1',
          description: 'Эхний давхцал.',
          tags: ['identity'],
        },
        {
          id: 'ev_m_hint2',
          title: 'Сэжүүр 2',
          sourceArtifactId: 'art_m_hint2',
          description: 'Хоёр дахь давхцал.',
          tags: ['identity'],
        },
        {
          id: 'ev_m_hint3',
          title: 'Сэжүүр 3',
          sourceArtifactId: 'art_m_hint3',
          description: 'Гурав дахь давхцал.',
          tags: ['identity'],
        },
        {
          id: 'ev_m_hidden',
          title: 'Нууц бүртгэл',
          sourceArtifactId: 'art_m_hidden',
          description: 'Alias тогтоосны дараа л харагдана.',
          tags: ['gated'],
          hiddenUntilFacts: ['fact_m_identity'],
        },
        {
          id: 'ev_m_contra_a',
          title: 'Мэдүүлэг A',
          sourceArtifactId: 'art_m_contra_a',
          description: 'Тухайн үдшийн байршлын мэдүүлэг.',
          tags: ['contradiction'],
        },
        {
          id: 'ev_m_contra_b',
          title: 'Мэдүүлэг B',
          sourceArtifactId: 'art_m_contra_b',
          description: 'Мэдүүлэгтэй зөрчилдөх бичлэг.',
          tags: ['contradiction'],
        },
        {
          id: 'ev_m_edge_1',
          title: 'Холболтын лог 1',
          sourceArtifactId: 'art_m_edge_1',
          description: 'Төхөөрөмжийн хандалтын лог.',
          tags: ['graph'],
        },
        {
          id: 'ev_m_edge_2',
          title: 'Холболтын лог 2',
          sourceArtifactId: 'art_m_edge_2',
          description: 'Давтан хандалтын лог.',
          tags: ['graph'],
        },
        {
          id: 'ev_m_final',
          title: 'Эцсийн зөвшөөрөл',
          sourceArtifactId: 'art_m_final',
          description: 'Шийдвэрийн өмнөх сүүлийн баримт.',
          tags: ['final'],
        },
      ],
    },
    facts: {
      sourcePath: `${base}/facts.json`,
      data: [
        { id: 'fact_m_open', secret: false },
        { id: 'fact_m_identity', secret: true, reveal: 'ded_m_identity' },
        { id: 'fact_m_motive', secret: true, reveal: 'ded_m_motive' },
        { id: 'fact_m_timeline', secret: false },
      ],
    },
    deductions: {
      sourcePath: `${base}/deductions.json`,
      data: [
        {
          id: 'ded_m_identity',
          title: 'X7 бол оршин суугч',
          requiredAll: ['ev_m_anchor'],
          requiredAnyGroups: [['ev_m_hint1', 'ev_m_hint2', 'ev_m_hint3']],
          minimumFromAnyGroup: 2,
          prerequisiteFacts: ['fact_m_open'],
          grantsFacts: ['fact_m_identity'],
        },
        {
          id: 'ded_m_motive',
          title: 'Мэдүүлэг бичлэгтэй зөрчилдөнө',
          kind: 'contradiction',
          requiredAll: ['ev_m_contra_a', 'ev_m_contra_b'],
          prerequisiteFacts: ['fact_m_identity'],
          grantsFacts: ['fact_m_motive'],
        },
      ],
    },
    objectives: {
      sourcePath: `${base}/objectives.json`,
      data: [
        {
          id: 'obj_m_start',
          title: 'Тэмдэглэлийг нээ',
          state: 'active',
          completeWhen: { fact: 'fact_m_open' },
        },
        {
          id: 'obj_m_identify',
          title: 'X7-г таних',
          state: 'locked',
          activateWhen: { fact: 'fact_m_open' },
          completeWhen: { deductionCompleted: 'ded_m_identity' },
        },
        {
          id: 'obj_m_manual',
          title: 'Дүгнэлтээ тэмдэглэ',
          state: 'locked',
          activateWhen: { objectiveCompleted: 'obj_m_identify' },
        },
      ],
    },
    locks: {
      sourcePath: `${base}/locks.json`,
      data: [
        {
          id: 'lock_m_vault',
          title: 'Архив',
          unlockWhen: { fact: 'fact_m_open' },
        },
        {
          id: 'lock_m_final',
          title: 'Эцсийн шийдвэр',
          unlockWhen: {
            allOf: [
              { fact: 'fact_m_motive' },
              { fact: 'fact_m_timeline' },
              { edgeConfidenceAtLeast: { edgeId: 'edge_m_link', minimum: 70 } },
            ],
          },
          requiredEvidence: ['ev_m_final'],
        },
      ],
    },
    triggers: {
      sourcePath: `${base}/triggers.json`,
      data: [
        {
          id: 'tr_m_vault',
          when: { fact: 'fact_m_open' },
          effects: [{ type: 'unlock', target: 'content_m_vault' }],
        },
        {
          id: 'tr_m_threshold',
          when: {
            evidenceThreshold: {
              anyOf: ['ev_m_hint1', 'ev_m_hint2', 'ev_m_hint3'],
              minimum: 2,
            },
          },
          effects: [{ type: 'unlock', target: 'content_m_threshold' }],
        },
        {
          id: 'tr_m_reveal',
          when: { deductionCompleted: 'ded_m_identity' },
          effects: [{ type: 'unlock', target: 'content_m_archive' }],
        },
        {
          id: 'tr_m_post',
          when: { endingSelected: 'ending_m_close' },
          effects: [{ type: 'unlock', target: 'content_m_epilogue' }],
        },
      ],
    },
    endings: {
      sourcePath: `${base}/endings.json`,
      data: [
        {
          id: 'ending_m_close',
          title: 'CLOSE',
          choiceLabel: 'CLOSE',
          description: 'Холболтыг тасалж хэргийг хаана.',
          canon: true,
          gateLockId: 'lock_m_final',
          revealsExactLocation: false,
          onSelect: { severGraphEdgeIds: ['edge_m_link'] },
        },
        {
          id: 'ending_m_expose',
          title: 'EXPOSE',
          choiceLabel: 'EXPOSE',
          description: 'Холболтыг баталгаажуулж байршлыг ил гаргана.',
          canon: false,
          gateLockId: 'lock_m_final',
          revealsExactLocation: true,
          onSelect: { confirmGraphEdgeIds: ['edge_m_link'] },
        },
      ],
    },
    graph: {
      sourcePath: `${base}/graph.json`,
      data: [
        {
          recordType: 'node',
          id: 'node_m_resident',
          nodeType: 'person',
          publicLabel: 'Оршин суугч',
        },
        {
          recordType: 'node',
          id: 'node_m_alias',
          nodeType: 'person',
          publicLabel: 'X7',
          canonicalCharacterId: 'char_m_resident',
          identityRevealFact: 'fact_m_identity',
        },
        {
          recordType: 'node',
          id: 'node_m_device',
          nodeType: 'device',
          publicLabel: 'Гар утас',
        },
        {
          recordType: 'edge',
          id: 'edge_m_link',
          fromNodeId: 'node_m_alias',
          toNodeId: 'node_m_device',
          kind: 'inferred',
          confidenceSources: [
            { evidenceId: 'ev_m_edge_1', weight: 40 },
            { evidenceId: 'ev_m_edge_2', weight: 35 },
          ],
          playerCanConfirm: true,
          playerCanSever: true,
        },
        {
          recordType: 'edge',
          id: 'edge_m_fixed',
          fromNodeId: 'node_m_resident',
          toNodeId: 'node_m_device',
          kind: 'observed',
          confidenceSources: [],
          hiddenUntilFacts: ['fact_m_identity'],
        },
      ],
    },
    timeline: {
      sourcePath: `${base}/timeline.json`,
      data: [
        { recordType: 'position', id: 'tpos_m_1', title: 'Орой эрт', order: 1 },
        { recordType: 'position', id: 'tpos_m_2', title: 'Шөнө дунд', order: 2 },
        { recordType: 'position', id: 'tpos_m_3', title: 'Үүр цайх', order: 3 },
        {
          recordType: 'event',
          id: 'tev_m_meeting',
          title: 'Танихгүй уулзалт',
          acceptablePositionIds: ['tpos_m_2', 'tpos_m_3'],
          requiredEvidenceIds: ['ev_m_hint1'],
          hiddenUntilFacts: ['fact_m_open'],
          grantsFactsWhenPlaced: ['fact_m_timeline'],
        },
      ],
    },
    artifacts: { sourcePath: `${base}/artifacts.json`, data: [] },
    browser: { sourcePath: `${base}/browser.json`, data: [] },
    calls: { sourcePath: `${base}/calls.json`, data: [] },
    emails: { sourcePath: `${base}/emails.json`, data: [] },
    locations: { sourcePath: `${base}/locations.json`, data: [] },
    messages: { sourcePath: `${base}/messages.json`, data: [] },
    notes: { sourcePath: `${base}/notes.json`, data: [] },
    photos: { sourcePath: `${base}/photos.json`, data: [] },
  };
}

export function loadMiniCase(): LoadedCaseBundle {
  return parseCaseBundle(createMiniCaseSources());
}
