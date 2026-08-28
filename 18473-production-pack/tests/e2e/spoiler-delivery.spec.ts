import { expect, test } from '@playwright/test';
import { case001AssetRegistry } from '../../src/game/assets/case-assets';

const gatedAssets = case001AssetRegistry.assets.filter(
  ({ spoiler, mode }) => (spoiler === 'S3' || spoiler === 'S4') && mode !== 'ui-data',
);

test('keeps S3/S4 binaries outside public delivery and rejects without an existence oracle', async ({
  page,
  context,
  baseURL,
}) => {
  if (baseURL === undefined) throw new Error('Playwright baseURL is required');
  await page.goto('/');

  const locked = await page.request.get('/api/case-assets/HOPE-003');
  const missing = await page.request.get('/api/case-assets/DOES-NOT-EXIST');
  expect(locked.status()).toBe(404);
  expect(missing.status()).toBe(404);
  expect(await locked.body()).toEqual(await missing.body());
  const publicLeak = await page.request.get(
    '/assets/case-001/runtime/wooden_safehouse_window_live.jpg',
  );
  expect(publicLeak.status()).toBe(404);
  for (const asset of gatedAssets) {
    const response = await page.request.get(`/assets/case-001/runtime/${asset.filename}`);
    expect(response.status(), asset.id).toBe(404);
  }

  await context.addCookies([{
    name: 'case-001-facts',
    value: 'fact_tenuun_alive',
    url: new URL(baseURL).origin,
  }]);
  const revealed = await page.request.get('/api/case-assets/HOPE-003');
  expect(revealed.status()).toBe(200);
  expect(revealed.headers()['content-type']).toBe('image/jpeg');
  expect((await revealed.body()).byteLength).toBeGreaterThan(0);
});

test('projects authored phone data only after device unlock and withholds ending content', async ({ page }) => {
  const runtimeResponses: string[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname !== '/api/case-runtime') return;
    runtimeResponses.push(response.url());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(runtimeResponses).toEqual([]);
  const initialText = await page.locator('body').innerText();
  for (const protectedSemantic of [
    'Мөрдлөгийн ажлын талбар',
    'Төгсгөлийн дараалал',
    'CALL_18473_03',
    'NODE: 0',
    'ending_sever',
    'fact_tenuun_alive',
  ]) {
    expect(initialText).not.toContain(protectedSemantic);
  }
  await expect(page.getByRole('tab', { name: 'Мөрдлөг' })).toHaveCount(0);

  const projectionPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/case-runtime');
  await page.getByRole('button', { name: 'Түгжээ тайлах' }).click();
  const projection = await projectionPromise;
  const body = await projection.text();

  expect(projection.status()).toBe(200);
  expect(body).not.toContain('CALL_18473_03');
  expect(body).not.toContain('ending_trace');
  expect(body).not.toContain('wooden_safehouse_window_live.jpg');
  for (const asset of gatedAssets) {
    expect(body, asset.id).not.toContain(asset.filename);
  }
});
