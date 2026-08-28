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

/** Acknowledge any queued reveal exactly like a player before continuing. */
async function acknowledgePresentation(
  page: import('@playwright/test').Page,
): Promise<void> {
  const reveal = page.locator('[data-presentation-beat]');
  for (let acknowledged = 0; acknowledged < 8; acknowledged += 1) {
    await expect(page.locator('[data-runtime-busy="true"]')).toHaveCount(0);
    if (await reveal.count() === 0) return;
    await reveal.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
  }
  await expect(reveal).toHaveCount(0);
}

async function instrumentAudioContext(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const state = window as unknown as { __audioContextCreations: number };
    state.__audioContextCreations = 0;
    const parameter = () => ({
      value: 1,
      cancelScheduledValues: () => undefined,
      setValueAtTime: () => undefined,
      linearRampToValueAtTime: () => undefined,
      exponentialRampToValueAtTime: () => undefined,
    });
    const node = (extra: Record<string, unknown> = {}) => ({
      connect(this: unknown) { return this; },
      disconnect: () => undefined,
      onended: null,
      ...extra,
    });
    class InstrumentedAudioContext {
      currentTime = 0;
      state = 'suspended';
      destination = node();
      sampleRate = 48_000;

      constructor() { state.__audioContextCreations += 1; }
      async resume() { this.state = 'running'; }
      async suspend() { this.state = 'suspended'; }
      async close() { this.state = 'closed'; }
      createGain() { return node({ gain: parameter() }); }
      createOscillator() {
        return node({ frequency: parameter(), type: 'sine', start: () => undefined, stop: () => undefined });
      }
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      createBufferSource() {
        return node({ buffer: null, loop: false, start: () => undefined, stop: () => undefined });
      }
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: InstrumentedAudioContext,
    });
  });
}

test('opens the persisted mixer from a labeled user-gesture control', async ({ page }) => {
  await instrumentAudioContext(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __audioContextCreations: number }
  ).__audioContextCreations)).toBe(0);
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(page.locator('[data-phone-screen="home"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __audioContextCreations: number }
  ).__audioContextCreations)).toBe(1);
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
  await acknowledgePresentation(page);
  await page.getByRole('button', { name: /^18473/ }).first().click();
  await acknowledgePresentation(page);
  await page.getByText('Бичлэгийн тайлал').click();
  await expect(page.locator('[data-audio-production-status="scripted"]')).toContainText('Audio log өөр зүйл хэлж байна');
  await expect(page.locator('[data-audio-production-status="scripted"] audio')).toHaveCount(0);
});

test('uses a short crossfade for an actual reveal and persists acknowledgement across reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await unlock(page);
  await page.getByRole('button', { name: 'Вэб хөтөч' }).click();
  await page.getByRole('button', { name: 'Хадгалсан', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Хөтчийн бүртгэлээс хайх' }).fill('Timber House');
  await page.getByRole('button', { name: /Small Timber House/ }).click();
  await page.getByRole('button', { name: 'Cabin budget' }).click();
  const layer = page.getByRole('dialog');
  await expect(layer).toBeVisible();
  await expect(layer).toHaveAttribute('data-presentation-duration', /^(?:[0-9]|[1-9][0-9]|1[0-4][0-9]|150)$/);
  const beat = await layer.getAttribute('data-presentation-beat');
  const continueButton = layer.getByRole('button', { name: 'Үргэлжлүүлэх' });
  await expect(continueButton).toBeFocused();
  await expect(page.locator('[data-phone-chrome-content]')).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await expect(continueButton).toBeFocused();

  await page.reload();
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(layer).toHaveAttribute('data-presentation-beat', beat!);
  await layer.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
  await expect(page.locator('#phone-screen-heading')).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  await expect(layer).toHaveCount(0);
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
  await expect(aftermath.locator('[data-ending-audio-id]'))
    .toHaveAttribute('data-ending-audio-id', 'call_18473_03');
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
