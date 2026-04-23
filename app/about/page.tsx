import Link from 'next/link';
import { Container } from '@/components/Container';
import { site } from '@/data/site';

const valueIcons: Record<string, JSX.Element> = {
  Excellence: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Integrity: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  'Evidence-Based Practice': <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Compassion: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Collaboration: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Innovation: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

export default function AboutPage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-brand-dark py-24 text-white">
        <img src="/images/hero9.jpeg" alt="Shifah" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />
        <Container className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-brand-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">About Shifah</p>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Where ambition meets <span className="text-brand-gold">purpose.</span>
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-brand-gold" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Shifah Medical Training College is a career-focused institution in Kitale, Kenya — built to equip the next generation of healthcare professionals with the skills, values, and confidence to make a real difference.
          </p>

          {/* quick stats */}
          <div className="mt-12 flex flex-wrap gap-6">
            {[
              { value: '3+', label: 'Accredited Programmes' },
              { value: 'NITA', label: 'Accreditation Body' },
              { value: 'Kitale', label: 'Kenya' },
              { value: '100%', label: 'Practical Focus' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-brand-gold">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── WHO WE ARE ── */}
      <section className="py-24 overflow-hidden">
        <Container className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Who We Are</p>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark md:text-4xl">
              A college built on <span className="text-brand-green">skill, discipline, and impact.</span>
            </h2>
            <div className="mt-4 h-1 w-12 rounded-full bg-brand-gold" />
            <p className="mt-6 text-base leading-8 text-slate-600">{site.about}</p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              We believe that quality healthcare training should be accessible to everyone. With low entry requirements, short focused programmes, and hands-on learning, Shifah removes the barriers that keep talented people out of the healthcare sector.
            </p>
            <Link
              href="/apply"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-green/20 transition-all hover:bg-brand-dark hover:-translate-y-0.5"
            >
              Join Shifah Today →
            </Link>
          </div>

          {/* image with decorative frame */}
          <div className="relative">
            <div className="absolute -right-6 -top-6 h-full w-full rounded-3xl bg-brand-cream" />
            <div className="absolute -left-3 top-8 bottom-8 w-1 rounded-full bg-gradient-to-b from-brand-green to-brand-gold" />
            <div className="relative overflow-hidden rounded-3xl shadow-xl">
              <img src="/images/girl2.jpeg" alt="Shifah students" className="aspect-[4/5] h-full w-full object-cover" />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-brand-dark/80 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Shifah Medical Training College</p>
                <p className="mt-0.5 text-sm text-white/80">Kitale, Kenya — {site.motto}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── VISION / MISSION / MOTTO ── */}
      <section className="py-24 bg-brand-dark text-white overflow-hidden">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Our Foundation</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Guided by a clear <span className="text-brand-gold">vision and purpose.</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Vision */}
            <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all duration-300 hover:bg-white/10 hover:border-brand-gold/30 hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold transition-all duration-300 group-hover:bg-brand-gold group-hover:text-brand-dark">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Our Vision</h3>
              <div className="mt-2 h-0.5 w-8 rounded-full bg-brand-gold/40 transition-all duration-300 group-hover:w-14 group-hover:bg-brand-gold" />
              <p className="mt-4 text-sm leading-7 text-white/60">{site.vision}</p>
            </div>

            {/* Mission */}
            <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition-all duration-300 hover:bg-white/10 hover:border-brand-gold/30 hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold transition-all duration-300 group-hover:bg-brand-gold group-hover:text-brand-dark">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Our Mission</h3>
              <div className="mt-2 h-0.5 w-8 rounded-full bg-brand-gold/40 transition-all duration-300 group-hover:w-14 group-hover:bg-brand-gold" />
              <p className="mt-4 text-sm leading-7 text-white/60">{site.mission}</p>
            </div>

            {/* Motto */}
            <div className="group rounded-3xl border border-brand-gold/30 bg-brand-gold/5 p-8 transition-all duration-300 hover:bg-brand-gold/10 hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold/20 text-brand-gold">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Our Motto</h3>
              <div className="mt-2 h-0.5 w-8 rounded-full bg-brand-gold" />
              <p className="mt-4 text-3xl font-extrabold text-brand-gold">{site.motto}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── CORE VALUES ── */}
      <section className="py-24 bg-slate-50">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Core Values</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark md:text-4xl">
              The principles that <span className="text-brand-green">define everything we do.</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">Every decision, every programme, and every interaction at Shifah is shaped by these six core values.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {site.values.map((value) => (
              <div
                key={value.title}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-green/30 hover:shadow-xl hover:shadow-brand-green/10"
              >
                <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-slate-100 transition-all duration-500 group-hover:bg-brand-green group-hover:top-2 group-hover:bottom-2" />
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green/8 text-brand-green transition-all duration-300 group-hover:bg-brand-green group-hover:text-white">
                  {valueIcons[value.title]}
                </div>
                <h3 className="mt-5 text-lg font-bold text-brand-dark">{value.title}</h3>
                <div className="mt-2 h-0.5 w-6 rounded-full bg-brand-gold/40 transition-all duration-500 group-hover:w-12 group-hover:bg-brand-gold" />
                <p className="mt-3 text-sm leading-7 text-slate-500">{value.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA ── */}
      <section className="py-20">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-green px-8 py-14 md:px-14 text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(215,169,59,0.15)_0%,transparent_60%)]" />
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Start Your Journey</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
                Ready to build a career in healthcare?
              </h2>
              <p className="mt-4 text-base leading-8 text-white/75">
                Shifah is open to students from all backgrounds. With KCSE D- entry, short programmes, and hands-on training — your healthcare career starts here.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-green transition-all hover:bg-brand-cream hover:-translate-y-0.5">
                  Apply Now →
                </Link>
                <Link href="/courses" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  Explore Courses
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

    </main>
  );
}
