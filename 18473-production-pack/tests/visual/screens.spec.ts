import { expect, test, type Page } from '@playwright/test';

import { case001Seed } from '../../src/game/content/case-001';
import {
  createInitialCaseState,
  processEngineEvent,
  settleEngineState,
} from '../../src/game/engine/engine';
import type { PlayerState } from '../../src/game/state/types';
import { createSaveEnvelope } from '../../src/game/persistence/save';

const SAVE_KEY = '18473:save:case_001';
const TEST_NOW = '2026-08-28T00:00:00.000Z';
const SHOTS = '.qa/shots';

const VIEWPORTS = [
  { tag: '320', width: 320, height: 720 },
  { tag: '375', width: 375, height: 812 },
  { tag: '393', width: 393, height: 852 },
  { tag: '430', width: 430, height: 932 },
  { tag: '768', width: 768, height: 1024 },
  { tag: '1440', width: 1440, height: 900 },
] as const;

/** Progresses far enough to expose the final TRACE/SEVER choice. */
function finalChoiceState(): PlayerState {
  let state = createInitialCaseState(case001Seed, TEST_NOW);
  state = processEngineEvent(case001Seed, state, {
    type: 'discover-evidence',
    evidenceIds: ['ev_maral_voice', 'ev_graph_confidence_tutorial', 'ev_raspberry_plan'],
  }).state;
  return settleEngineState(case001Seed, {
    ...state,
    knownFactIds: [...new Set([
      ...state.knownFactIds,
      'fact_tenuun_decoy',
      'fact_tenuun_alive',
    ])],
  }).state;
}

function endingState(): PlayerState {
  const selected = processEngineEvent(case001Seed, finalChoiceState(), {
    type: 'select-ending',
    endingId: 'ending_sever',
  });
  if (!selected.outcomes.some(({ type }) => type === 'ending-selected')) {
    throw new Error('Visual fixture did not satisfy the authored final-choice gate.');
  }
  return selected.state;
}

async function installSave(page: Page, state: PlayerState): Promise<void> {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: SAVE_KEY,
    value: JSON.stringify(createSaveEnvelope(state, TEST_NOW)),
  });
}

async function acknowledgePresentation(page: Page): Promise<void> {
  const reveal = page.locator('[data-presentation-beat]');
  for (let acknowledged = 0; acknowledged < 8; acknowledged += 1) {
    await expect(page.locator('[data-runtime-busy="true"]')).toHaveCount(0);
    if (await reveal.count() === 0) return;
    await reveal.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
  }
}

async function unlock(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
}

async function goHome(page: Page): Promise<void> {
  await acknowledgePresentation(page);
  await page.keyboard.press('Home');
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.tag}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    const shot = async (page: Page, name: string): Promise<void> => {
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${SHOTS}/${viewport.tag}-${name}.png` });
    };

    test('captures the phone surface inventory', async ({ page }) => {
      test.setTimeout(180_000);

      await page.goto('/');
      await shot(page, '01-lock');

      await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
      await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
      await shot(page, '02-home');

      await page.getByRole('button', { name: 'Дууны тохиргоо нээх' }).click();
      await shot(page, '03-audio-settings');
      await page.getByRole('button', { name: 'Дууны тохиргоог хаах' }).click();

      await page.getByRole('button', { name: 'Зурвас апп' }).click();
      await acknowledgePresentation(page);
      await shot(page, '04-messages-list');
      await page.getByRole('button', { name: '18473 217' }).click();
      await expect(page.locator('[data-runtime-busy="true"]')).toHaveCount(0);
      await shot(page, '05-reveal-sheet');
      await acknowledgePresentation(page);
      await shot(page, '06-thread');
      await page.locator('[data-phone-scroll-region]').evaluate((element) => {
        element.scrollTop = 600;
      });
      await shot(page, '07-thread-scrolled');
      await goHome(page);

      await page.getByRole('button', { name: 'Зургийн цомог' }).click();
      await acknowledgePresentation(page);
      await shot(page, '08-gallery');
      await page.getByRole('button', { name: /Roadside café exterior/ }).click();
      await acknowledgePresentation(page);
      await shot(page, '09-photo-detail');
      await page.getByRole('button', { name: 'Зургийг томруулах' }).click();
      await shot(page, '10-photo-zoom');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Метадата шалгах' }).click();
      await shot(page, '11-metadata');
      await page.keyboard.press('Escape');
      await goHome(page);

      await page.getByRole('button', { name: 'Дуудлагын жагсаалт' }).click();
      await acknowledgePresentation(page);
      await shot(page, '12-calls');
      await page.getByRole('button', { name: /^18473/ }).first().click();
      await acknowledgePresentation(page);
      await page.getByText('Бичлэгийн тайлал').click();
      await shot(page, '13-call-transcript');
      await goHome(page);

      for (const [name, app] of [
        ['14-mail', 'Цахим шуудан'],
        ['15-browser', 'Вэб хөтөч'],
        ['16-notes', 'Тэмдэглэл апп'],
        ['17-files', 'Файлын сан'],
        ['18-settings', 'Төхөөрөмжийн тохиргоо'],
      ] as const) {
        await page.getByRole('button', { name: app }).click();
        await acknowledgePresentation(page);
        await shot(page, name);
        await goHome(page);
      }

      await page.getByRole('tab', { name: 'Мөрдлөг' }).click();
      await shot(page, '19-investigation');
      const scrollRegion = page.locator('[data-phone-scroll-region]');
      await scrollRegion.evaluate((element) => { element.scrollTop = 1200; });
      await shot(page, '20-investigation-deductions');
      await scrollRegion.evaluate((element) => { element.scrollTop = 30_000; });
      await shot(page, '21-investigation-graph');
    });

    test('captures the final decision and ending presentation', async ({ page }) => {
      test.setTimeout(180_000);

      await installSave(page, finalChoiceState());
      await unlock(page);
      await acknowledgePresentation(page);
      await page.getByRole('tab', { name: 'Мөрдлөг' }).click();
      const scrollRegion = page.locator('[data-phone-scroll-region]');
      await scrollRegion.evaluate((element) => { element.scrollTop = 30_000; });
      await shot(page, '22-final-choice');
    });

    test('captures the acknowledged ending stages', async ({ page }) => {
      test.setTimeout(180_000);

      await installSave(page, endingState());
      await unlock(page);
      await acknowledgePresentation(page);
      await page.getByRole('tab', { name: 'Мөрдлөг' }).click();
      const ending = page.getByRole('region', { name: 'Төгсгөлийн дараалал' });
      await ending.scrollIntoViewIfNeeded();
      await shot(page, '23-ending-decision');
      await ending.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
      await shot(page, '24-ending-aftermath');
      await page.locator('[data-ending-aftermath="true"]')
        .getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
      await ending.scrollIntoViewIfNeeded();
      await shot(page, '25-ending-closure');
      await ending.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
      await ending.scrollIntoViewIfNeeded();
      await shot(page, '26-ending-postcredit');
    });
  });
}
