import { expect, test, type Response } from '@playwright/test';
import { case001Seed } from '../../src/game/content/case-001';

const publicCaseSummary = {
  label: case001Seed.manifest.id.replace(/^case_/, 'CASE ').replaceAll('_', ' '),
  title: case001Seed.manifest.title,
};

type ProtectedValue = {
  value: string;
  reasons: string[];
};

type DeliveredText = {
  source: string;
  body: string;
};

type CaptureResult = DeliveredText | {
  source: string;
  error: string;
};

function buildProtectedValues(): ProtectedValue[] {
  const values = new Map<string, Set<string>>();
  const add = (value: string | undefined, reason: string) => {
    if (value === undefined) return;
    const reasons = values.get(value) ?? new Set<string>();
    reasons.add(reason);
    values.set(value, reasons);
  };

  const secretFactIds = new Set(
    case001Seed.facts.filter(({ secret }) => secret).map(({ id }) => id),
  );
  const revealIds = new Set<string>();

  case001Seed.facts.filter(({ secret }) => secret).forEach((fact) => {
    add(fact.id, 'secret fact ID');
    add(fact.reveal, `reveal gate for ${fact.id}`);
    if (fact.reveal !== undefined) revealIds.add(fact.reveal);
  });

  case001Seed.characters.forEach((character) => {
    if (character.hiddenUntilFact !== undefined) {
      add(character.id, 'gated character ID');
      add(character.name, `gated character label for ${character.id}`);
      add(character.hiddenUntilFact, `character reveal gate for ${character.id}`);
    }

    if (character.canonicalCharacterId !== undefined) {
      add(character.canonicalCharacterId, `canonical character ID for ${character.id}`);
      const canonicalCharacter = case001Seed.characters.find(
        ({ id }) => id === character.canonicalCharacterId,
      );
      add(
        canonicalCharacter?.name,
        `referenced canonical character label for ${character.id}`,
      );
    }
  });

  case001Seed.evidence.forEach((evidence) => {
    if (evidence.hiddenUntilFacts === undefined) return;
    add(evidence.id, 'gated evidence ID');
    add(evidence.title, `gated evidence title for ${evidence.id}`);
    add(evidence.sourceArtifactId, `gated source artifact for ${evidence.id}`);
    add(evidence.description, `gated evidence description for ${evidence.id}`);
    evidence.hiddenUntilFacts.forEach((factId) => {
      add(factId, `evidence reveal gate for ${evidence.id}`);
    });
  });

  case001Seed.deductions.forEach((deduction) => {
    const revealsSecret = revealIds.has(deduction.id)
      || deduction.grantsFacts.some((factId) => secretFactIds.has(factId));
    if (!revealsSecret) return;
    add(deduction.id, 'secret-revealing deduction ID');
    add(deduction.title, `secret-revealing deduction title for ${deduction.id}`);
  });

  const conditionFactIds = (
    condition: (typeof case001Seed.locks)[number]['unlockWhen'],
  ): string[] => ('fact' in condition ? [condition.fact] : condition.allFacts);

  case001Seed.locks.forEach((lock) => {
    if (!conditionFactIds(lock.unlockWhen).some((factId) => secretFactIds.has(factId))) return;
    add(lock.id, 'secret-gated lock ID');
    add(lock.title, `secret-gated lock title for ${lock.id}`);
  });

  case001Seed.triggers.forEach((trigger) => {
    if (!conditionFactIds(trigger.when).some((factId) => secretFactIds.has(factId))) return;
    add(trigger.id, 'secret-gated trigger ID');
    trigger.effects.forEach(({ target }) => {
      add(target, `secret-gated trigger target for ${trigger.id}`);
    });
  });

  case001Seed.objectives.filter(({ state }) => state === 'locked').forEach((objective) => {
    add(objective.id, 'locked objective ID');
    add(objective.title, `locked objective title for ${objective.id}`);
  });

  add(case001Seed.manifest.canonEndingId, 'canonical ending ID');
  const canonicalEnding = case001Seed.endings.find(
    ({ id }) => id === case001Seed.manifest.canonEndingId,
  );
  add(canonicalEnding?.description, 'canonical ending description');

  return [...values.entries()]
    .map(([value, reasons]) => ({ value, reasons: [...reasons].sort() }))
    .sort((left, right) => left.value.localeCompare(right.value, 'en'));
}

function isBrowserDeliveredText(response: Response): boolean {
  const contentType = response.headers()['content-type']?.split(';')[0].trim().toLowerCase();
  const resourceType = response.request().resourceType();
  const pathname = new URL(response.url()).pathname;

  return resourceType === 'document'
    || resourceType === 'script'
    || pathname.endsWith('.js')
    || pathname.endsWith('.mjs')
    || contentType === 'text/html'
    || contentType === 'text/javascript'
    || contentType === 'application/javascript'
    || contentType === 'application/x-javascript'
    || contentType === 'text/x-component';
}

const protectedValues = buildProtectedValues();

test('renders only the Case #001 public manifest summary', async ({ page, baseURL }) => {
  if (baseURL === undefined) throw new Error('Playwright baseURL is required for leak detection');

  const appOrigin = new URL(baseURL).origin;
  const responseCaptures: Promise<CaptureResult>[] = [];

  page.on('response', (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin !== appOrigin || !isBrowserDeliveredText(response)) return;
    if (response.status() === 204 || response.status() === 304) return;

    const source = response.url();
    responseCaptures.push(response.text()
      .then((body) => ({ source, body }))
      .catch((error: unknown) => ({
        source,
        error: error instanceof Error ? error.message : String(error),
      })));
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('region', {
    name: `${publicCaseSummary.label}: ${publicCaseSummary.title}`,
  })).toBeVisible();
  await expect(page.getByText(publicCaseSummary.label, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: publicCaseSummary.title })).toBeVisible();

  const captureResults = await Promise.all(responseCaptures);
  const captureFailures = captureResults.filter(
    (result): result is Extract<CaptureResult, { error: string }> => 'error' in result,
  );
  expect(captureFailures, 'Every same-origin HTML/RSC/JS response must be inspectable').toEqual([]);

  const deliveredText: DeliveredText[] = [
    { source: 'page.content()', body: await page.content() },
    ...captureResults.filter(
      (result): result is DeliveredText => 'body' in result,
    ),
  ];

  for (const protectedValue of protectedValues) {
    const leakingSources = deliveredText
      .filter(({ body }) => body.includes(protectedValue.value))
      .map(({ source }) => source);
    expect(
      leakingSources,
      `Protected value ${JSON.stringify(protectedValue.value)} (${protectedValue.reasons.join('; ')}) leaked via ${leakingSources.join(', ')}`,
    ).toEqual([]);
  }
});
