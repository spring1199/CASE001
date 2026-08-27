import { expect, test, type Response } from '@playwright/test';
import { case001Seed } from '../../src/game/content/case-001';
import { deferredCaseSourceKeys } from '../../src/game/content/case-loader';

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
  isJavaScript: boolean;
};

type CaptureResult = DeliveredText | {
  source: string;
  error: string;
};

function buildProtectedValues(): ProtectedValue[] {
  const values = new Map<string, Set<string>>();
  const add = (value: string, reason: string) => {
    const reasons = values.get(value) ?? new Set<string>();
    reasons.add(reason);
    values.set(value, reasons);
  };

  const collectRecordStrings = (
    record: unknown,
    reason: string,
    path = '',
  ): void => {
    if (typeof record === 'string') {
      if (record.trim().length > 0) {
        add(record, path === '' ? reason : `${reason} at ${path}`);
      }
      return;
    }

    if (Array.isArray(record)) {
      record.forEach((value, index) => {
        collectRecordStrings(value, reason, `${path}[${index}]`);
      });
      return;
    }

    if (typeof record !== 'object' || record === null) return;

    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .forEach(([key, value]) => {
        collectRecordStrings(value, reason, path === '' ? key : `${path}.${key}`);
      });
  };

  const secretFacts = case001Seed.facts.filter(({ secret }) => secret);
  const secretFactIds = new Set(secretFacts.map(({ id }) => id));
  const revealIds = new Set(secretFacts.flatMap(({ reveal }) => (
    reveal === undefined ? [] : [reveal]
  )));

  secretFacts.forEach((fact) => {
    collectRecordStrings(fact, `secret fact record ${fact.id}`);
  });

  case001Seed.characters.forEach((character) => {
    if (character.hiddenUntilFact !== undefined) {
      collectRecordStrings(character, `gated character record ${character.id}`);
    }

    if (character.canonicalCharacterId !== undefined) {
      collectRecordStrings(character, `canonical alias record ${character.id}`);
      const canonicalCharacter = case001Seed.characters.find(
        ({ id }) => id === character.canonicalCharacterId,
      );
      collectRecordStrings(
        canonicalCharacter,
        `canonical character record referenced by ${character.id}`,
      );
    }
  });

  case001Seed.evidence.forEach((evidence) => {
    if (evidence.hiddenUntilFacts === undefined) return;
    collectRecordStrings(evidence, `gated evidence record ${evidence.id}`);
  });

  case001Seed.deductions.forEach((deduction) => {
    const revealsSecret = revealIds.has(deduction.id)
      || deduction.grantsFacts.some((factId) => secretFactIds.has(factId));
    if (!revealsSecret) return;
    collectRecordStrings(deduction, `secret-revealing deduction record ${deduction.id}`);
  });

  const conditionFactIds = (
    condition: (typeof case001Seed.locks)[number]['unlockWhen'],
  ): string[] => ('fact' in condition ? [condition.fact] : condition.allFacts);

  case001Seed.locks.forEach((lock) => {
    if (!conditionFactIds(lock.unlockWhen).some((factId) => secretFactIds.has(factId))) return;
    collectRecordStrings(lock, `secret-gated lock record ${lock.id}`);
  });

  case001Seed.triggers.forEach((trigger) => {
    if (!conditionFactIds(trigger.when).some((factId) => secretFactIds.has(factId))) return;
    collectRecordStrings(trigger, `secret-gated trigger record ${trigger.id}`);
  });

  case001Seed.objectives.filter(({ state }) => state === 'locked').forEach((objective) => {
    collectRecordStrings(objective, `locked objective record ${objective.id}`);
  });

  case001Seed.endings.forEach((ending) => {
    collectRecordStrings(ending, `ending record ${ending.id}`);
  });

  deferredCaseSourceKeys.forEach((sourceKey) => {
    (case001Seed[sourceKey] as readonly unknown[]).forEach((record, recordIndex) => {
      collectRecordStrings(record, `deferred ${sourceKey} record ${recordIndex}`);
    });
  });

  return [...values.entries()]
    .map(([value, reasons]) => ({ value, reasons: [...reasons].sort() }))
    .sort((left, right) => left.value.localeCompare(right.value, 'en'));
}

function isJavaScriptResponse(response: Response): boolean {
  const pathname = new URL(response.url()).pathname;

  return response.request().resourceType() === 'script'
    || pathname.endsWith('.js')
    || pathname.endsWith('.mjs');
}

function isTextualContentType(contentTypeHeader: string | undefined): boolean {
  const contentType = contentTypeHeader?.split(';')[0].trim().toLowerCase();

  return contentType?.startsWith('text/') === true
    || contentType === 'application/json'
    || contentType?.endsWith('+json') === true
    || contentType === 'application/javascript'
    || contentType === 'application/x-javascript'
    || contentType === 'application/ecmascript'
    || contentType === 'application/x-ecmascript'
    || contentType === 'application/xml'
    || contentType?.endsWith('+xml') === true;
}

function isKnownBinaryContentType(contentTypeHeader: string | undefined): boolean {
  const contentType = contentTypeHeader?.split(';')[0].trim().toLowerCase();
  if (contentType === undefined) return false;

  return contentType.startsWith('image/')
    || contentType.startsWith('audio/')
    || contentType.startsWith('video/')
    || contentType.startsWith('font/')
    || contentType.startsWith('model/')
    || contentType.startsWith('application/font-')
    || contentType.startsWith('application/x-font-')
    || contentType === 'application/vnd.ms-fontobject'
    || contentType === 'application/octet-stream'
    || contentType === 'application/pdf'
    || contentType === 'application/wasm'
    || contentType === 'application/zip'
    || contentType === 'application/gzip'
    || contentType === 'application/x-gzip';
}

function isBrowserDeliveredText(response: Response): boolean {
  const contentType = response.headers()['content-type'];
  if (isKnownBinaryContentType(contentType)) return false;

  return response.request().resourceType() === 'document'
    || isJavaScriptResponse(response)
    || isTextualContentType(contentType);
}

function firstPartyModuleText(delivered: DeliveredText): string {
  if (!delivered.isJavaScript) return delivered.body;

  const markers = [...delivered.body.matchAll(/^"\[project\]\/[^\r\n]+/gm)];
  if (markers.length === 0) return delivered.body;

  return markers.flatMap((marker, index) => {
    const header = marker[0];
    if (!header.startsWith('"[project]/src/') && !header.startsWith('"[project]/content/')) {
      return [];
    }
    const start = marker.index ?? 0;
    const end = markers[index + 1]?.index ?? delivered.body.length;
    return [delivered.body.slice(start, end)];
  }).join('\n');
}

function isDistinctiveProtectedValue(value: string): boolean {
  return value.length >= 12 || /[_\s]/u.test(value) || /[^\x00-\x7F]/u.test(value);
}

function containsShortProtectedValue(body: string, value: string): boolean {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapedValue}(?![\\p{L}\\p{N}_])`,
    'u',
  ).test(body);
}

const protectedValues = buildProtectedValues();
const genericImplementationTokens = new Set(['locked', 'unlock']);

async function unlockPhone(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
}

async function goHome(page: import('@playwright/test').Page): Promise<void> {
  await page.keyboard.press('Home');
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
}

test('renders only the Case #001 public manifest summary', async ({ page, baseURL }) => {
  if (baseURL === undefined) throw new Error('Playwright baseURL is required for leak detection');

  expect(isTextualContentType('application/json; charset=utf-8')).toBe(true);
  expect(isTextualContentType('application/problem+json')).toBe(true);

  expect(
    protectedValues.map(({ value }) => value),
    'Protected records must contribute nested tag and canonical choice values',
  ).toEqual(expect.arrayContaining(['winter47', 'SEVER']));

  const alternateEnding = case001Seed.endings.find(({ canon }) => !canon);
  if (alternateEnding === undefined) throw new Error('An alternate ending is required');
  expect(
    protectedValues.map(({ value }) => value),
    'Every alternate ending string must be protected',
  ).toEqual(expect.arrayContaining([alternateEnding.id, alternateEnding.description]));

  const appOrigin = new URL(baseURL).origin;
  const responseCaptures: Promise<CaptureResult>[] = [];

  page.on('response', (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin !== appOrigin || !isBrowserDeliveredText(response)) return;
    if (response.status() === 204 || response.status() === 304) return;

    const source = response.url();
    responseCaptures.push(response.text()
      .then((body) => ({ source, body, isJavaScript: isJavaScriptResponse(response) }))
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
    { source: 'page.content()', body: await page.content(), isJavaScript: false },
    ...captureResults.filter(
      (result): result is DeliveredText => 'body' in result,
    ),
  ];

  const leaks = protectedValues.flatMap((protectedValue) => {
    if (genericImplementationTokens.has(protectedValue.value)) return [];
    const sources = deliveredText
      .filter((delivered) => {
        const searchableBody = isDistinctiveProtectedValue(protectedValue.value)
          ? delivered.body
          : firstPartyModuleText(delivered);
        return isDistinctiveProtectedValue(protectedValue.value)
          ? searchableBody.includes(protectedValue.value)
          : containsShortProtectedValue(searchableBody, protectedValue.value);
      })
      .map(({ source }) => source);
    return sources.length === 0 ? [] : [{ ...protectedValue, sources }];
  });
  expect(leaks, 'Protected authored values must not reach browser-delivered text').toEqual([]);
});

test('unlocks the neutral phone and exposes every Phase 02 app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-phone-screen="lock"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Файл хадгалах сан, түгжээтэй' })).toHaveCount(0);

  await unlockPhone(page);
  await expect(page.getByRole('button', { name: 'Файл хадгалах сан, түгжээтэй' })).toHaveAttribute('aria-disabled', 'true');

  const initiallyAvailableApps = [
    ['Зурвас апп', 'messages'],
    ['Зургийн цомог', 'gallery'],
    ['Дуудлагын жагсаалт', 'calls'],
    ['Цахим шуудан', 'mail'],
    ['Вэб хөтөч', 'browser'],
    ['Тэмдэглэлийн дэвтэр', 'notes'],
    ['Системийн тохиргоо', 'settings'],
  ] as const;

  for (const [accessibleName, appId] of initiallyAvailableApps) {
    await page.getByRole('button', { name: accessibleName }).click();
    await expect(page.locator(`[data-app-shell="${appId}"]`)).toBeVisible();
    await goHome(page);
  }

  await page.getByRole('button', { name: 'Зурвас апп' }).click();
  await page.getByRole('button', { name: /Амралтын өдрийн төлөвлөгөө/ }).click();
  await goHome(page);
  await page.getByRole('button', { name: 'Файл хадгалах сан' }).click();
  await expect(page.locator('[data-app-shell="files"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /баримт-08\.pdf/ })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(page.getByRole('button', { name: 'Файл хадгалах сан' })).toBeEnabled();
});

test('supports search, deep links, dialogs, zoom, transcripts, and keyboard history', async ({ page }) => {
  await unlockPhone(page);

  await page.getByRole('button', { name: 'Вэб хөтөч' }).click();
  const search = page.getByRole('searchbox', { name: 'Хадгалсан хуудсаас хайх' });
  await search.fill('бороо');
  await expect(page.getByRole('button', { name: /Долоо хоногийн цаг агаар/ })).toBeVisible();
  await page.getByRole('button', { name: /Долоо хоногийн цаг агаар/ }).click();
  await page.getByRole('button', { name: 'Төлөвлөгөөний зурвас нээх' }).click();
  await expect(page.getByRole('heading', { name: 'Амралтын өдрийн төлөвлөгөө', exact: true })).toBeVisible();
  await expect(page.getByText('Бичлэгийн тайлал')).toBeVisible();
  await page.getByText('Бичлэгийн тайлал').click();
  await expect(page.getByText('Бороотой бол кофе шопт уулзаж болно шүү.').first()).toBeVisible();
  await expect(page.locator('audio')).toHaveAttribute('controls', '');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator('[data-app-shell="browser"]')).toBeVisible();
  await goHome(page);

  await page.getByRole('button', { name: 'Зургийн цомог' }).click();
  await expect(page.locator('[data-gallery-layout="timeline-grid"]')).toBeVisible();
  await page.getByRole('button', { name: /Борооны дараах цэцэрлэг/ }).click();
  const metadataButton = page.getByRole('button', { name: 'Метадата шалгах' });
  await metadataButton.focus();
  await metadataButton.press('Enter');
  await expect(page.getByRole('dialog', { name: /Метадата/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(metadataButton).toBeFocused();

  const zoomButton = page.getByRole('button', { name: 'Зургийг томруулах' });
  await zoomButton.focus();
  await zoomButton.press('Enter');
  await expect(page.getByRole('dialog', { name: /Томруулсан зураг/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(zoomButton).toBeFocused();
});

for (const width of [320, 375, 414, 768]) {
  test(`keeps the phone surface usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await unlockPhone(page);

    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport);

    const actionLabels = page.locator('[data-action-label]');
    const actionCount = await actionLabels.count();
    expect(actionCount).toBeGreaterThan(0);
    for (let index = 0; index < actionCount; index += 1) {
      await expect(actionLabels.nth(index)).toHaveCSS('white-space', 'nowrap');
    }

    await page.getByRole('button', { name: 'Зурвас апп' }).click();
    await expect(page.locator('[data-phone-scroll-region]')).toHaveCSS('overflow-y', 'auto');
  });
}

test('protects narrow actions and both horizontal safe-area edges', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await unlockPhone(page);

  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
  const phoneCss = await page.evaluate(() =>
    Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules, (rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join('\n'),
  );
  expect(phoneCss).toContain('env(safe-area-inset-left)');
  expect(phoneCss).toContain('env(safe-area-inset-right)');

  await page.getByRole('button', { name: 'Вэб хөтөч' }).click();
  await page.getByRole('searchbox', { name: 'Хадгалсан хуудсаас хайх' }).fill('бороо');
  await page.getByRole('button', { name: /Долоо хоногийн цаг агаар/ }).click();
  const deepLink = page.getByRole('button', { name: 'Төлөвлөгөөний зурвас нээх' });
  const actionBox = await deepLink.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(actionBox.scrollWidth).toBeLessThanOrEqual(actionBox.clientWidth);
});

test('reduces phone motion without removing state feedback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await unlockPhone(page);
  await page.getByRole('button', { name: 'Зурвас апп' }).click();
  await page.keyboard.press('Shift+Tab');
  const action = page.getByRole('button', { name: 'Нүүр' });
  await expect(action).toBeFocused();
  const durations = await action.evaluate((element) =>
    getComputedStyle(element).transitionDuration.split(',').map((value) => Number.parseFloat(value) * 1000),
  );
  expect(Math.max(...durations)).toBeLessThanOrEqual(150);
  await expect(action).toHaveCSS('outline-style', 'solid');
  await expect(action).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
});
