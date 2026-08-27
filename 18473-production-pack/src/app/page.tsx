import { PhoneShell } from '@/components/PhoneShell';
import { case001Seed } from '@/game/content/case-001';
import { toPublicCaseSummary } from '@/game/content/public-case-summary';

export default function HomePage() {
  const caseSummary = toPublicCaseSummary(case001Seed.manifest);

  return (
    <main className="stage">
      <PhoneShell caseSummary={caseSummary} />
    </main>
  );
}
