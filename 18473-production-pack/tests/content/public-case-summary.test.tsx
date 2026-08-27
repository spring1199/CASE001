import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PhoneShell } from '@/components/PhoneShell';
import { toPublicCaseSummary } from '@/game/content/public-case-summary';
import { caseManifestSchema } from '@/game/schema/case';

describe('public case summary', () => {
  it('maps and renders synthetic manifest values instead of starter constants', () => {
    const syntheticManifest = caseManifestSchema.parse({
      id: 'case_777',
      title: 'Синтетик хэрэг',
      version: 1,
      locale: 'mn',
      targetMinutes: 60,
      initialObjectiveIds: ['obj_synthetic'],
      appIds: ['messages'],
      canonEndingId: 'ending_synthetic',
    });

    const summary = toPublicCaseSummary(syntheticManifest);
    const markup = renderToStaticMarkup(<PhoneShell caseSummary={summary} />);

    expect(summary).toStrictEqual({
      id: 'case_777',
      label: 'CASE 777',
      title: 'Синтетик хэрэг',
    });
    expect(markup).toContain('CASE 777');
    expect(markup).toContain('Синтетик хэрэг');
    expect(markup).toContain('Түгжээ тайлах');
    expect(markup).not.toContain('CASE 001');
    expect(markup).not.toContain('18473');
    expect(markup).not.toContain('Starter shell');
    expect(markup).not.toContain('Phase 02');
    expect(markup).not.toContain('fake phone OS');
  });
});
