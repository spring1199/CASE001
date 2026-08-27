import artifacts from '../../../content/cases/case-001/artifacts.json';
import browser from '../../../content/cases/case-001/browser.json';
import calls from '../../../content/cases/case-001/calls.json';
import manifest from '../../../content/cases/case-001/case.json';
import characters from '../../../content/cases/case-001/characters.json';
import deductions from '../../../content/cases/case-001/deductions.json';
import emails from '../../../content/cases/case-001/emails.json';
import endings from '../../../content/cases/case-001/endings.json';
import evidence from '../../../content/cases/case-001/evidence.json';
import facts from '../../../content/cases/case-001/facts.json';
import graph from '../../../content/cases/case-001/graph.json';
import locations from '../../../content/cases/case-001/locations.json';
import locks from '../../../content/cases/case-001/locks.json';
import messages from '../../../content/cases/case-001/messages.json';
import notes from '../../../content/cases/case-001/notes.json';
import objectives from '../../../content/cases/case-001/objectives.json';
import photos from '../../../content/cases/case-001/photos.json';
import timeline from '../../../content/cases/case-001/timeline.json';
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
  graph: { sourcePath: `${case001Path}/graph.json`, data: graph },
  artifacts: { sourcePath: `${case001Path}/artifacts.json`, data: artifacts },
  browser: { sourcePath: `${case001Path}/browser.json`, data: browser },
  calls: { sourcePath: `${case001Path}/calls.json`, data: calls },
  emails: { sourcePath: `${case001Path}/emails.json`, data: emails },
  locations: { sourcePath: `${case001Path}/locations.json`, data: locations },
  messages: { sourcePath: `${case001Path}/messages.json`, data: messages },
  notes: { sourcePath: `${case001Path}/notes.json`, data: notes },
  photos: { sourcePath: `${case001Path}/photos.json`, data: photos },
  timeline: { sourcePath: `${case001Path}/timeline.json`, data: timeline },
});
