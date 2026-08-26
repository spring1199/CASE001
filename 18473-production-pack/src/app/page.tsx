import { PhoneShell } from '@/components/PhoneShell';
import { case001Seed } from '@/game/content/case-001';
import { toPublicCaseSummary } from '@/game/content/public-case-summary';

const publicCaseSummary = toPublicCaseSummary(case001Seed.manifest);

export default function HomePage() {
  return (
    <main className="stage">
      <PhoneShell caseSummary={publicCaseSummary} />
    </main>
  );
}
