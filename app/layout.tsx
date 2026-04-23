import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MarqueeBar } from '@/components/MarqueeBar';
import { site } from '@/data/site';

export const metadata: Metadata = {
  title: `${site.shortName} | Healthcare Training in Kitale`,
  description: 'A modern informational website for a medical training college focused on admissions, courses, and institutional credibility.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MarqueeBar />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
