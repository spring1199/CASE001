# Content Data Schema

## ID conventions
- case: `case_001`
- character: `char_tenuun`
- evidence: `ev_001`
- fact: `fact_f17_is_maral`
- deduction: `ded_f17_identity`
- objective: `obj_find_sender`
- lock: `lock_archive_18473`
- trigger: `tr_reveal_winter47`
- ending: `ending_sever`

## CaseManifest
```ts
{
  id: string;
  title: string;
  version: number;
  locale: 'mn';
  targetMinutes: number;
  initialObjectiveIds: string[];
  appIds: string[];
}
```

## Evidence
```ts
{
  id: string;
  title: string;
  sourceArtifactId: string;
  description: string;
  tags: string[];
  grantsFacts?: string[];
  hiddenUntilFacts?: string[];
}
```

## Deduction
```ts
{
  id: string;
  title: string;
  requiredAll?: string[];
  requiredAnyGroups?: string[][];
  prerequisiteFacts?: string[];
  grantsFacts: string[];
  unlocks?: string[];
}
```

## Secret projection rule
Never put spoiler-sensitive canonical labels into fields sent straight to UI. Store a neutral public label plus transformations keyed by known facts.

## Confidence
GRAPH confidence must be authored/derived deterministically from evidence weights. The final 91% is story-controlled but should still result from transparent contributions.
