import Link from 'next/link';
import { Container } from '@/components/Container';
import { site } from '@/data/site';

const departmentDetails: Record<string, { icon: JSX.Element; text: string }> = {
  'Nursing Sciences': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    text: 'Foundational and advanced nursing skills for patient care, clinical practice, and healthcare delivery.',
  },
  'Emergency Medical Sciences': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    text: 'Rapid response training, pre-hospital care, and emergency medical procedures for critical situations.',
  },
  'Orthopaedic & Physiotherapy': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    text: 'Musculoskeletal rehabilitation, movement therapy, and physical recovery techniques.',
  },
  'Theatre Sciences': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    text: 'Surgical support, sterile technique, anaesthesia assistance, and operating theatre procedures.',
  },
  'Public Health Sciences': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    text: 'Community health, disease prevention, health promotion, and public health programme management.',
  },
  'Mortuary Sciences': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    text: 'Post-mortem procedures, body preparation, forensic support, and dignified care practices.',
  },
  'Medical Education': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    text: 'Training educators and clinical instructors to deliver high-quality healthcare education.',
  },
  'Laboratory Sciences': {
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-4 7h14l-4-7V3"/></svg>,
    text: 'Diagnostic testing, specimen analysis, medical laboratory procedures, and clinical pathology.',
  },
};

export default function DepartmentsPage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-brand-dark py-24 text-white">
        <img src="/images/hero5.jpeg" alt="Departments" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />
        <Container className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-brand-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Academic Departments</p>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            A full spectrum of <span className="text-brand-gold">healthcare disciplines.</span>
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-brand-gold" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Shifah's departments are structured to give students a broad, credible foundation across all major areas of healthcare practice and professional service.
          </p>

          {/* stat pills */}
          <div className="mt-10 flex flex-wrap gap-4">
            {[
              { value: '8', label: 'Departments' },
              { value: 'NITA', label: 'Accredited' },
              { value: '100%', label: 'Practical Focus' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-sm">
                <p className="text-xl font-extrabold text-brand-gold">{s.value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── DEPARTMENTS GRID ── */}
      <section className="py-24 bg-slate-50">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Our Departments</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark md:text-4xl">
              Every area of healthcare, <span className="text-brand-green">covered.</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {site.departments.map((dept, i) => (
              <div
                key={dept}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 transition-all duration-300 hover:-translate-y-2 hover:border-brand-green/30 hover:shadow-2xl hover:shadow-brand-green/10"
              >
                {/* number watermark */}
                <span className="absolute right-4 top-3 text-6xl font-black text-slate-100 transition-all duration-300 group-hover:text-brand-green/10 select-none leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* left bar */}
                <div className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full bg-slate-100 transition-all duration-500 group-hover:bg-brand-green group-hover:top-3 group-hover:bottom-3" />

                {/* icon */}
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/8 text-brand-green transition-all duration-300 group-hover:bg-brand-green group-hover:text-white">
                  {departmentDetails[dept]?.icon}
                </div>

                <h3 className="relative mt-5 text-base font-extrabold text-brand-dark leading-snug">{dept}</h3>
                <div className="mt-2 h-0.5 w-6 rounded-full bg-brand-gold/40 transition-all duration-500 group-hover:w-14 group-hover:bg-brand-gold" />
                <p className="relative mt-3 text-sm leading-7 text-slate-500">
                  {departmentDetails[dept]?.text}
                </p>
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
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Join Shifah</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
                Find your place in healthcare.
              </h2>
              <p className="mt-4 text-base leading-8 text-white/75">
                Explore our programmes and take the first step toward a career in one of these departments.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/courses" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-green transition-all hover:bg-brand-cream hover:-translate-y-0.5">
                  View Courses →
                </Link>
                <Link href="/apply" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

    </main>
  );
}
