import '../../tokens.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Onest } from 'next/font/google';
import type { ReactNode } from 'react';

const onest = Onest({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-onest-loader',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono-loader',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '18473',
  description: 'Psychological digital detective thriller',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn" className={`${onest.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
