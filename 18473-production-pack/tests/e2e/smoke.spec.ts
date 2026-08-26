import { expect, test } from '@playwright/test';

test('renders the 18473 starter shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '18473' })).toBeVisible();
});
