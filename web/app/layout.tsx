import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jb-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fhenix DAO · Vote on-chain. Stay invisible.',
  description:
    'Confidential DAO voting where individual ballots stay encrypted forever. Powered by Fully Homomorphic Encryption on Fhenix CoFHE · Sepolia.',
  openGraph: {
    title: 'Fhenix DAO · Vote on-chain. Stay invisible.',
    description: 'Confidential DAO voting powered by Fully Homomorphic Encryption.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
      <body className="text-zinc-100 min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
