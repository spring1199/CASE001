'use client';

export type PublicCaseSummary = Readonly<{
  label: string;
  title: string;
}>;

type PhoneShellProps = {
  caseSummary: PublicCaseSummary;
};

export function PhoneShell({ caseSummary }: PhoneShellProps) {
  return (
    <section aria-label={`${caseSummary.label}: ${caseSummary.title}`} style={{ width: 390, maxWidth: '100%', minHeight: 760, border: '1px solid #555', borderRadius: 36, padding: 20, background: '#1b1b1b' }}>
      <p style={{ opacity: 0.7, marginTop: 0 }}>{caseSummary.label}</p>
      <h1 style={{ marginTop: 8 }}>{caseSummary.title}</h1>
      <p>Starter shell. Phase 02 replaces this with the fake phone OS.</p>
    </section>
  );
}
