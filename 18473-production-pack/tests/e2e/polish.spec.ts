import { expect, test } from '@playwright/test';

import { case001Seed } from '../../src/game/content/case-001';
import {
  createInitialCaseState,
  processEngineEvent,
  settleEngineState,
} from '../../src/game/engine/engine';
import { createSaveEnvelope } from '../../src/game/persistence/save';

const SAVE_KEY = '18473:save:case_001';
const TEST_NOW = '2026-08-28T00:00:00.000Z';

function endingSave(): string {
  let state = createInitialCaseState(case001Seed, TEST_NOW);
  state = processEngineEvent(case001Seed, state, {
    type: 'discover-evidence',
    evidenceIds: ['ev_maral_voice', 'ev_graph_confidence_tutorial', 'ev_raspberry_plan'],
  }).state;
  state = settleEngineState(case001Seed, {
    ...state,
    knownFactIds: [...new Set([
      ...state.knownFactIds,
      'fact_tenuun_decoy',
      'fact_tenuun_alive',
    ])],
  }).state;
  const selected = processEngineEvent(case001Seed, state, {
    type: 'select-ending',
    endingId: 'ending_sever',
  });
  if (!selected.outcomes.some(({ type }) => type === 'ending-selected')) {
    throw new Error('Ending fixture did not satisfy the authored final-choice gate.');
  }
  return JSON.stringify(createSaveEnvelope(selected.state, TEST_NOW));
}

async function installEndingSave(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: SAVE_KEY,
    value: endingSave(),
  });
}

async function unlock(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
}

test('opens the persisted mixer from a labeled user-gesture control', async ({ page }) => {
  await unlock(page);
  await page.getByRole('button', { name: 'Дууны тохиргоо нээх' }).click();
  await expect(page.getByRole('region', { name: 'Дууны тохиргоо' })).toBeVisible();
  await page.getByLabel('Ерөнхий дуу').fill('0.4');
  await page.getByLabel('Орчны дууг идэвхжүүлэх').check();
  await page.reload();
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await page.getByRole('button', { name: 'Дууны тохиргоо нээх' }).click();
  await expect(page.getByLabel('Ерөнхий дуу')).toHaveValue('0.4');
  await expect(page.getByLabel('Орчны дууг идэвхжүүлэх')).toBeChecked();
});

test('keeps Phone and Investigation navigation keyboard accessible with sound disabled', async ({ page }) => {
  await unlock(page);
  await page.getByRole('button', { name: 'Дууны тохиргоо нээх' }).click();
  await page.getByLabel('Бүх дууг хаах').check();
  await page.getByRole('button', { name: 'Дууны тохиргоог хаах' }).click();
  await page.getByRole('tab', { name: 'Мөрдлөг' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Мөрдлөг' })).toBeVisible();
  await page.getByRole('tab', { name: 'Утас' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Утас' })).toBeVisible();
});

test('keeps scripted transcripts available while audio is disabled', async ({ page }) => {
  await unlock(page);
  await page.getByRole('button', { name: 'Дууны тохиргоо нээх' }).click();
  await page.getByLabel('Бүх дууг хаах').check();
  await page.getByRole('button', { name: 'Дууны тохиргоог хаах' }).click();
  await page.getByRole('button', { name: 'Дуудлагын жагсаалт' }).click();
  await page.getByRole('button', { name: /^18473/ }).first().click();
  await page.getByText('Бичлэгийн тайлал').click();
  await expect(page.locator('[data-audio-production-status="scripted"]')).toContainText('Audio log өөр зүйл хэлж байна');
  await expect(page.locator('[data-audio-production-status="scripted"] audio')).toHaveCount(0);
});

test('uses a short crossfade for reveal presentation under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await unlock(page);
  const layer = page.locator('[data-presentation-beat]');
  if (await layer.count()) {
    await expect(layer).toHaveAttribute('data-presentation-duration', /^(?:[0-9]|[1-9][0-9]|1[0-4][0-9]|150)$/);
    await expect(layer.getByRole('button', { name: 'Үргэлжлүүлэх' })).toBeVisible();
  }
});

test('persists decision → call/raspberry → closure → postcredit ordering across reload', async ({ page }) => {
  await installEndingSave(page);
  await unlock(page);
  await page.getByRole('tab', { name: 'Мөрдлөг' }).click();

  const ending = page.getByRole('region', { name: 'Төгсгөлийн дараалал' });
  await expect(ending).toHaveAttribute('data-ending-stage', 'decision');
  await expect(page.getByText('NODE: 0')).toHaveCount(0);
  await ending.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();

  const aftermath = page.locator('[data-ending-aftermath="true"]');
  await expect(aftermath).toBeVisible();
  await expect(aftermath).toContainText('CALL_18473_03');
  await expect(aftermath).toContainText('Raspberry — 6');
  await expect(aftermath.locator('[data-audio-production-status="scripted"] audio')).toHaveCount(0);
  await expect(page.getByText('NODE: 0')).toHaveCount(0);
  await aftermath.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();

  await expect(ending).toHaveAttribute('data-ending-stage', 'closure');
  await page.reload();
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await page.getByRole('tab', { name: 'Мөрдлөг' }).click();
  await expect(ending).toHaveAttribute('data-ending-stage', 'closure');
  await expect(page.getByText('NODE: 0')).toHaveCount(0);
  await ending.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
  await expect(ending).toHaveAttribute('data-ending-stage', 'postcredit');
  await expect(page.getByText('NODE: 0')).toBeVisible();
});
