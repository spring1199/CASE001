import type { PublicCaseSummary } from '@/game/content/public-case-summary';
import { PhoneExperience } from '@/phone/PhoneExperience';

type PhoneShellProps = {
  caseSummary: PublicCaseSummary;
};

export function PhoneShell({ caseSummary }: PhoneShellProps) {
  return <PhoneExperience caseSummary={caseSummary} />;
}
