import { PhoneShell, type PublicCaseSummary } from '@/components/PhoneShell';
import { case001Seed } from '@/game/content/case-001';

const publicCaseSummary = {
  label: case001Seed.manifest.id.replace(/^case_/, 'CASE ').replaceAll('_', ' '),
  title: case001Seed.manifest.title,
} satisfies PublicCaseSummary;

export default function HomePage() {
  return (
    <main className="stage">
      <PhoneShell caseSummary={publicCaseSummary} />
    </main>
  );
}
