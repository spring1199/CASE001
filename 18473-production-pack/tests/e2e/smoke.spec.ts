import { expect, test, type Response } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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
  ): string[] => {
    if ('fact' in condition) return [condition.fact];
    if ('allFacts' in condition) return condition.allFacts;
    if ('allOf' in condition) return condition.allOf.flatMap(conditionFactIds);
    if ('anyOf' in condition) return condition.anyOf.flatMap(conditionFactIds);
    return [];
  };

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
  return value.length >= 12 || (value.length >= 6 && value.includes('_'));
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
const structuralReasonSuffixes = [
  '.appId',
  '.direction',
  '.durationLabel',
  '.kind',
  '.productionStatus',
  '.role',
];

function shouldScanProtectedValue(protectedValue: ProtectedValue): boolean {
  const { value, reasons } = protectedValue;
  if (genericImplementationTokens.has(value)) return false;
  if (!/[\p{L}_]/u.test(value)) return false;
  if (reasons.every((reason) => structuralReasonSuffixes.some((suffix) =>
    reason.endsWith(suffix) || reason.endsWith(` at ${suffix.slice(1)}`)))) {
    return false;
  }
  if (reasons.some((reason) => reason.startsWith('ending record ')) && value.length >= 5) {
    return true;
  }
  return isDistinctiveProtectedValue(value);
}

async function unlockPhone(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
}

async function goHome(page: import('@playwright/test').Page): Promise<void> {
  await page.keyboard.press('Home');
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
}

async function expectViewportFit(page: import('@playwright/test').Page): Promise<void> {
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport);
}

async function expectMinimumTouchTargets(page: import('@playwright/test').Page): Promise<void> {
  const targets = page.locator(
    'button:visible, select:visible, input:visible, summary:visible, [role="tab"]:visible',
  );
  const count = await targets.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const target = targets.nth(index);
    const box = await target.boundingBox();
    expect(box, `Interactive target ${index} must have a rendered box`).not.toBeNull();
    expect(box!.width, `Interactive target ${index} must be at least 44px wide`)
      .toBeGreaterThanOrEqual(44);
    expect(box!.height, `Interactive target ${index} must be at least 44px high`)
      .toBeGreaterThanOrEqual(44);
  }
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
    if (!shouldScanProtectedValue(protectedValue)) return [];
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

test('unlocks the Case #001 phone and exposes every Phase 02 app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-phone-screen="lock"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Файлын сан' })).toHaveCount(0);

  await unlockPhone(page);

  const initiallyAvailableApps = [
    ['Зурвас апп', 'messages'],
    ['Зургийн цомог', 'gallery'],
    ['Дуудлагын жагсаалт', 'calls'],
    ['Цахим шуудан', 'mail'],
    ['Вэб хөтөч', 'browser'],
    ['Тэмдэглэл апп', 'notes'],
    ['Файлын сан', 'files'],
    ['Төхөөрөмжийн тохиргоо', 'settings'],
  ] as const;

  for (const [accessibleName, appId] of initiallyAvailableApps) {
    await page.getByRole('button', { name: accessibleName }).click();
    await expect(page.locator(`[data-app-shell="${appId}"]`)).toBeVisible();
    await goHome(page);
  }

  await page.getByRole('button', { name: 'Зурвас апп' }).click();
  await page.getByRole('button', { name: '18473 217' }).click();
  await goHome(page);
  await page.getByRole('button', { name: 'Файлын сан' }).click();
  await expect(page.locator('[data-app-shell="files"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Cabin budget/ })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(page.getByRole('button', { name: 'Файлын сан' })).toBeEnabled();
});

test('keeps programmatic screen-heading focus visually unobtrusive', async ({ page }) => {
  await page.goto('/');

  const lockHeading = page.getByRole('heading', { name: publicCaseSummary.title });
  await expect(lockHeading).toBeFocused();
  await expect(lockHeading).toHaveCSS('outline-style', 'none');

  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  const homeHeading = page.getByRole('heading', { name: 'Аппын нүүр', exact: true });
  await expect(homeHeading).toBeFocused();
  await expect(homeHeading).toHaveCSS('outline-style', 'none');
});

test('supports search, deep links, dialogs, zoom, transcripts, and keyboard history', async ({ page }) => {
  await unlockPhone(page);

  await page.getByRole('button', { name: 'Вэб хөтөч' }).click();
  await page.getByRole('button', { name: 'Хадгалсан', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Хөтчийн бүртгэлээс хайх' });
  await search.fill('Timber House');
  await expect(page.getByRole('button', { name: /Small Timber House/ })).toBeVisible();
  await page.getByRole('button', { name: /Small Timber House/ }).click();
  await page.getByRole('button', { name: 'Cabin budget' }).click();
  await expect(page.getByRole('heading', { name: 'Cabin budget', exact: true })).toBeVisible();
  await goHome(page);

  await page.getByRole('button', { name: 'Дуудлагын жагсаалт' }).click();
  await page.getByRole('button', { name: /^18473/ }).first().click();
  await expect(page.getByText('Бичлэгийн тайлал')).toBeVisible();
  await page.getByText('Бичлэгийн тайлал').click();
  await expect(page.getByText(/Audio log өөр зүйл хэлж байна/).first()).toBeVisible();
  await expect(page.getByText('Аудио мастер ороогүй · продакшны тайлал бэлэн')).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(0);
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator('[data-app-shell="calls"]')).toBeVisible();
  await goHome(page);

  await page.getByRole('button', { name: 'Зургийн цомог' }).click();
  await expect(page.locator('[data-gallery-layout="timeline-grid"]')).toBeVisible();
  await page.getByRole('button', { name: /Roadside café exterior/ }).click();
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
  test(`keeps the phone and investigation surfaces usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await unlockPhone(page);

    await expectViewportFit(page);
    await expectMinimumTouchTargets(page);

    const actionLabels = page.locator('[data-action-label]');
    const actionCount = await actionLabels.count();
    expect(actionCount).toBeGreaterThan(0);
    for (let index = 0; index < actionCount; index += 1) {
      await expect(actionLabels.nth(index)).toHaveCSS('white-space', 'nowrap');
    }

    await page.getByRole('button', { name: 'Зурвас апп' }).click();
    await expect(page.locator('[data-phone-scroll-region]')).toHaveCSS('overflow-y', 'auto');

    await page.getByRole('tab', { name: 'Мөрдлөг' }).click();
    await expect(page.getByRole('region', { name: 'Мөрдлөгийн ажлын талбар' })).toBeVisible();
    await expectViewportFit(page);
    await expectMinimumTouchTargets(page);

    const investigationTab = page.getByRole('tab', { name: 'Мөрдлөг' });
    await investigationTab.focus();
    await expect(investigationTab).toHaveCSS('outline-style', 'solid');
    await expect(investigationTab).not.toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
  });
}

test('bounds long message DOM growth in chronological 60-message windows', async ({ page }) => {
  await unlockPhone(page);
  await page.getByRole('button', { name: 'Зурвас апп' }).click();
  await page.getByRole('button', { name: '18473 217' }).click();

  const history = page.getByRole('list', { name: 'Зурвасын түүх' });
  await expect(history).toHaveAttribute('data-message-window-size', '60');
  await expect(history.locator('[data-message-direction]')).toHaveCount(60);

  const earlierMessages = page.getByRole('button', { name: 'Өмнөх 60 зурвасыг харуулах' });
  await expect(earlierMessages).toHaveCSS('white-space', 'nowrap');
  const earlierMessagesBox = await earlierMessages.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(earlierMessagesBox.scrollWidth).toBeLessThanOrEqual(earlierMessagesBox.clientWidth);
  await earlierMessages.click();
  await expect(history).toHaveAttribute('data-message-window-size', '120');
  await expect(history.locator('[data-message-direction]')).toHaveCount(120);

  const timestamps = await history.locator('time').evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('datetime') ?? element.textContent ?? ''),
  );
  expect(timestamps).toEqual([...timestamps].sort((left, right) => left.localeCompare(right)));
});

test('lazy-loads responsive Gallery thumbnails with intrinsic dimensions', async ({ page }) => {
  await unlockPhone(page);
  await page.getByRole('button', { name: 'Зургийн цомог' }).click();

  const thumbnails = page.locator('[data-gallery-thumbnail] img');
  const thumbnailCount = await thumbnails.count();
  expect(thumbnailCount).toBeGreaterThan(0);
  for (let index = 0; index < thumbnailCount; index += 1) {
    const thumbnail = thumbnails.nth(index);
    await expect(thumbnail).toHaveAttribute('loading', 'lazy');
    await expect(thumbnail).toHaveAttribute('sizes', /44vw/);
    expect(Number(await thumbnail.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(await thumbnail.getAttribute('height'))).toBeGreaterThan(0);
  }
});

test('keeps the existing Hallmark Workbench/Halo presentation contract auditable', () => {
  const cssPath = path.join(process.cwd(), 'src/phone/phone.module.css');
  const css = readFileSync(cssPath, 'utf8');
  const firstLines = css.split(/\r?\n/).slice(0, 8).join('\n');

  expect(firstLines).toContain('macrostructure: Workbench');
  expect(firstLines).toContain('theme: Halo');
  expect(firstLines).toContain('genre: atmospheric');
  expect(firstLines).toContain('mobile: pass (36, 59, 61–69)');

  const critique = firstLines.match(/pre-emit critique: P(\d) H(\d) E(\d) S(\d) R(\d) V(\d)/);
  expect(critique).not.toBeNull();
  expect(critique!.slice(1).map(Number).every((score) => score >= 3)).toBe(true);

  expect(css).not.toMatch(/transition(?:-property)?:\s*all\b/i);
  expect(css).not.toMatch(/background-clip:\s*text|linear-gradient|radial-gradient|text-shadow/i);
  expect(css).not.toMatch(/(?:^|\s)(?:color|background|border-color|outline-color):\s*#[0-9a-f]{3,8}\b/im);

  const keyframeBlocks = [...css.matchAll(/@keyframes\s+[\w-]+\s*{([\s\S]*?)\n}/g)]
    .map((match) => match[1]);
  expect(keyframeBlocks.length).toBeGreaterThan(0);
  for (const keyframes of keyframeBlocks) {
    expect(keyframes).not.toMatch(/\b(?:width|height|top|left|margin|padding)\s*:/);
  }
});

test('keeps Gallery card titles readable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await unlockPhone(page);
  await page.getByRole('button', { name: 'Зургийн цомог' }).click();

  const firstTitle = page.getByRole('button', { name: /Childhood family kitchen/ }).locator('strong');
  const titleWidth = await firstTitle.evaluate((element) => element.getBoundingClientRect().width);

  expect(titleWidth).toBeGreaterThanOrEqual(80);
});

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
  await page.getByRole('button', { name: 'Хадгалсан', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Хөтчийн бүртгэлээс хайх' }).fill('Timber House');
  await page.getByRole('button', { name: /Small Timber House/ }).click();
  const deepLink = page.getByRole('button', { name: 'Cabin budget' });
  const actionBox = await deepLink.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(actionBox.scrollWidth).toBeLessThanOrEqual(actionBox.clientWidth);
});

test('switches Browser and Gallery collections and restores route scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 360 });
  await unlockPhone(page);

  await page.getByRole('button', { name: 'Вэб хөтөч' }).click();
  await expect(page.getByRole('button', { name: 'Түүх', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Өмнөх хайлтууд', exact: true }).click();
  await expect(page.getByRole('button', { name: /sore throat tea honey/ })).toBeVisible();
  await page.getByRole('button', { name: 'Хадгалсан', exact: true }).click();
  await expect(page.getByRole('button', { name: /Small Timber House/ })).toBeVisible();
  await goHome(page);

  await page.getByRole('button', { name: 'Зургийн цомог' }).click();
  await expect(page.locator('[data-collection-group="Нотлох зураг"]')).toBeVisible();
  await expect(page.locator('[data-collection-group="Ердийн зураг"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Нотлох зураг' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ердийн зураг' })).toBeVisible();
  await page.getByRole('button', { name: 'Нуусан', exact: true }).click();
  await expect(page.getByRole('button', { name: /Empty wooden interior/ })).toBeVisible();
  await page.getByRole('button', { name: 'Саяхан устгасан', exact: true }).click();
  await expect(page.getByRole('button', { name: /Deleted audit screen/ })).toBeVisible();
  await page.getByRole('button', { name: 'Цагийн шугам', exact: true }).click();

  const scrollRegion = page.locator('[data-phone-scroll-region]');
  await expect.poll(() => scrollRegion.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const finalPhoto = page.getByRole('button', { name: /Ердийн зураг 20/ });
  await finalPhoto.scrollIntoViewIfNeeded();
  const timelineScrollTop = await scrollRegion.evaluate((element) => element.scrollTop);
  expect(timelineScrollTop).toBeGreaterThan(0);
  await finalPhoto.click();
  await expect(page.getByRole('heading', { name: 'Ердийн зураг 20', exact: true })).toBeVisible();
  await expect.poll(() => scrollRegion.evaluate((element) => element.scrollTop)).toBe(0);

  await page.getByRole('button', { name: 'Буцах' }).click();
  await expect(page.locator('[data-app-shell="gallery"]')).toBeVisible();
  await expect.poll(() => scrollRegion.evaluate((element) => element.scrollTop)).toBe(timelineScrollTop);

  await goHome(page);
  await page.getByRole('button', { name: 'Зургийн цомог' }).click();
  await expect.poll(() => scrollRegion.evaluate((element) => element.scrollTop)).toBe(0);
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
