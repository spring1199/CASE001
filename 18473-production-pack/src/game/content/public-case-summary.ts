import type { CaseManifest } from '@/game/schema/case';

export type PublicCaseSummary = Readonly<{
  id: string;
  label: string;
  title: string;
}>;

export function toPublicCaseSummary(
  manifest: Pick<CaseManifest, 'id' | 'title'>,
): PublicCaseSummary {
  return {
    id: manifest.id,
    label: manifest.id.replace(/^case_/, 'CASE ').replaceAll('_', ' '),
    title: manifest.title,
  };
}
