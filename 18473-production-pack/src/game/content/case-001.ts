import manifest from '../../../content/cases/case-001/case.json';
import characters from '../../../content/cases/case-001/characters.json';
import deductions from '../../../content/cases/case-001/deductions.json';
import endings from '../../../content/cases/case-001/endings.json';
import evidence from '../../../content/cases/case-001/evidence.json';
import facts from '../../../content/cases/case-001/facts.json';
import locks from '../../../content/cases/case-001/locks.json';
import objectives from '../../../content/cases/case-001/objectives.json';
import triggers from '../../../content/cases/case-001/triggers.json';
import { parseCaseBundle } from '@/game/content/case-loader';

const case001Path = 'content/cases/case-001';

export const case001Seed = parseCaseBundle({
  manifest: { sourcePath: `${case001Path}/case.json`, data: manifest },
  characters: { sourcePath: `${case001Path}/characters.json`, data: characters },
  evidence: { sourcePath: `${case001Path}/evidence.json`, data: evidence },
  facts: { sourcePath: `${case001Path}/facts.json`, data: facts },
  deductions: { sourcePath: `${case001Path}/deductions.json`, data: deductions },
  objectives: { sourcePath: `${case001Path}/objectives.json`, data: objectives },
  locks: { sourcePath: `${case001Path}/locks.json`, data: locks },
  triggers: { sourcePath: `${case001Path}/triggers.json`, data: triggers },
  endings: { sourcePath: `${case001Path}/endings.json`, data: endings },
});
