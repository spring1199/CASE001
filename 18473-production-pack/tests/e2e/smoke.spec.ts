import { expect, test } from '@playwright/test';
import { case001Seed } from '../../src/game/content/case-001';

const publicCaseSummary = {
  label: case001Seed.manifest.id.replace(/^case_/, 'CASE ').replaceAll('_', ' '),
  title: case001Seed.manifest.title,
};

const spoilerBearingValues = [
  case001Seed.manifest.canonEndingId,
  case001Seed.characters.find(({ canonicalCharacterId }) => canonicalCharacterId !== undefined)
    ?.canonicalCharacterId,
  case001Seed.characters.find(({ hiddenUntilFact }) => hiddenUntilFact !== undefined)?.name,
  case001Seed.facts.find(({ secret }) => secret)?.id,
].filter((value): value is string => value !== undefined);

test('renders only the Case #001 public manifest summary', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('region', {
    name: `${publicCaseSummary.label}: ${publicCaseSummary.title}`,
  })).toBeVisible();
  await expect(page.getByText(publicCaseSummary.label, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: publicCaseSummary.title })).toBeVisible();

  const renderedHtml = await page.content();
  for (const spoilerBearingValue of spoilerBearingValues) {
    expect(renderedHtml).not.toContain(spoilerBearingValue);
  }
});
