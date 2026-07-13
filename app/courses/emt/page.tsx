import Link from 'next/link';
import { Container } from '@/components/Container';
import { courses } from '@/data/site';

const course = courses.find((c) => c.slug === 'emt')!;

export default function EMTPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-dark py-20 text-white">
        <img src={course.heroImage} alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />
        <Container className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Course Detail</p>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">{course.title}</h1>
            <div className="mt-4 h-1 w-12 rounded-full bg-brand-gold" />
            <p className="mt-5 text-base leading-8 text-white/75">{course.summary}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">{course.duration}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">{course.entry}</span>
              <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-4 py-1.5 text-xs font-semibold text-brand-gold">Fee: {course.fee}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-green/30 transition hover:bg-brand-dark">
                Apply Now →
              </Link>
              <Link href="/admissions" className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Admissions Guide
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -right-4 -top-4 h-full w-full rounded-3xl bg-brand-green/10" />
            <img src={course.heroImage} alt={course.title} className="relative rounded-3xl object-cover shadow-2xl aspect-[4/3] w-full" />
          </div>
        </Container>
      </section>

      {/* Details */}
      <section className="py-20">
        <Container className="grid gap-8 lg:grid-cols-3">

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
              <h2 className="text-2xl font-bold text-brand-dark">Programme Overview</h2>
              <div className="mt-4 h-0.5 w-10 rounded-full bg-brand-gold" />
              <div className="mt-5 space-y-4 text-base leading-8 text-slate-600">
                {course.overview.map((p) => <p key={p}>{p}</p>)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
              <h2 className="text-2xl font-bold text-brand-dark">What You Will Learn</h2>
              <div className="mt-4 h-0.5 w-10 rounded-full bg-brand-gold" />
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {course.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft">
              <h3 className="text-lg font-bold text-brand-dark">Entry Requirements</h3>
              <div className="mt-3 h-0.5 w-8 rounded-full bg-brand-gold" />
              <ul className="mt-4 space-y-2">
                {course.entryRequirements?.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick facts */}
            <div className="rounded-3xl border border-brand-green/20 bg-brand-green/5 p-6">
              <h3 className="text-lg font-bold text-brand-dark">Course Facts</h3>
              <div className="mt-3 h-0.5 w-8 rounded-full bg-brand-gold" />
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Duration', value: course.duration },
                  { label: 'Mode', value: 'Full-time' },
                  { label: 'Award', value: 'Certificate' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{f.label}</span>
                    <span className="font-semibold text-brand-dark">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-brand-dark p-6 text-white">
              <p className="text-sm font-bold uppercase tracking-wider text-brand-gold">Ready to enrol?</p>
              <p className="mt-2 text-sm text-white/70">Applications are open. Secure your place today.</p>
              <Link href="/apply" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand-green py-3 text-sm font-semibold text-white transition hover:bg-brand-green/80">
                Apply Now →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
