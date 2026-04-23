import Link from 'next/link';
import { ApplyForm } from '@/components/ApplyForm';
import { Container } from '@/components/Container';
import { site } from '@/data/site';

export default function ApplyPage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-brand-dark py-24 text-white">
        <img src="/images/girl2.jpeg" alt="Apply" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />
        <Container className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-brand-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Apply Now</p>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Start your healthcare <span className="text-brand-gold">career today.</span>
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-brand-gold" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Fill in the form below and our admissions team will get back to you with the next steps. It only takes a few minutes.
          </p>
        </Container>
      </section>

      {/* ── FORM + SIDEBAR ── */}
      <section className="py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Why Apply</p>
            </div>

            {[
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, title: 'Accredited Programmes', text: 'NITA and TVET/CDACC recognised certificates.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title: 'Short & Focused', text: 'Programmes from 2 to 6 months — get qualified fast.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: 'Open to All', text: 'Minimum KCSE D- — no prior experience needed.' },
              { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>, title: 'Guided Process', text: 'Our admissions team will walk you through every step.' },
            ].map((item) => (
              <div key={item.title} className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-md hover:shadow-brand-green/10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green/8 text-brand-green transition-all duration-300 group-hover:bg-brand-green group-hover:text-white">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-dark">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-6 text-slate-500">{item.text}</p>
                </div>
              </div>
            ))}

            {/* Contact nudge */}
            <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Need Help?</p>
              <p className="mt-2 text-sm text-slate-600">Call or WhatsApp us directly and we'll guide you through the application.</p>
              <a href={`tel:${site.phone}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline">
                {site.phone} →
              </a>
            </div>
          </div>

          {/* Form */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Application Form</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
              <ApplyForm />
            </div>
          </div>
        </Container>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 pt-0">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-green px-8 py-14 md:px-14 text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(215,169,59,0.15)_0%,transparent_60%)]" />
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Questions?</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">Not sure which course is right for you?</h2>
              <p className="mt-4 text-base leading-8 text-white/75">Browse our programmes or contact the admissions team — we're happy to help you choose.</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/courses" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-green transition-all hover:bg-brand-cream hover:-translate-y-0.5">
                  View Courses →
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

    </main>
  );
}
