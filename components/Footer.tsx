import Link from 'next/link';
import { site } from '@/data/site';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-brand-dark text-white">
      <div className="container-shell grid gap-10 py-14 md:grid-cols-3">
        <div>
          <h3 className="text-xl font-semibold">{site.shortName}</h3>
          <p className="mt-3 max-w-sm text-sm leading-7 text-white/75 italic">
            &ldquo;{site.mission}&rdquo;
          </p>
          <div className="mt-5 flex items-center gap-2">
            <a href="https://www.facebook.com/people/Shifah-Medical-Training-College/61588805690949/" target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.instagram.com/shifahmedicalcollege?igsh=MWMwcDVvazdqdmIzZQ%3D%3D&utm_source=qr" target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://x.com/shifahmtc" target="_blank" rel="noreferrer" aria-label="X" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Quick Links</h4>
          <div className="mt-4 grid gap-3 text-sm text-white/80">
            <Link href="/courses">Courses</Link>
            <Link href="/admissions">Admissions</Link>
            <Link href="/departments">Departments</Link>
            <Link href="/apply">Apply Now</Link>
             <Link href="/downloads">Downloads</Link>
              <Link href="/announcements">Announcements</Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Contact</h4>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            <p>{site.location}</p>
            <p>{site.phone}</p>
            <p>{site.email}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/55">
        © 2026 {site.shortName}. All rights reserved.
      </div>
    </footer>
  );
}
