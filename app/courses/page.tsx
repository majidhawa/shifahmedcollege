import Link from 'next/link';
import { Container } from '@/components/Container';
import { courses } from '@/data/site';

export default function CoursesPage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-brand-dark py-24 text-white">
        <img src="/images/hero11.jpeg" alt="Courses" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />
        <Container className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-brand-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Our Programmes</p>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Practical training for a <span className="text-brand-gold">real healthcare career.</span>
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-brand-gold" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Every programme at Shifah is built around hands-on skills, professional values, and a clear path into the healthcare workforce. Short, focused, and accredited.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-green/30 transition hover:bg-brand-dark">
              Apply Now →
            </Link>
            <Link href="/admissions" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Admissions Guide
            </Link>
          </div>
        </Container>
      </section>

      {/* ── COURSES ── */}
      <section className="py-24 bg-slate-50">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Featured Programmes</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark md:text-4xl">
              Choose the programme <span className="text-brand-green">that fits your goals.</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">All programmes are open to KCSE D- and above. No prior healthcare experience required for most courses.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {courses.map((course, i) => (
              <div
                key={course.slug}
                className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-soft border border-slate-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-brand-green/20"
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={course.heroImage}
                    alt={course.cardTitle}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/20 to-transparent" />

                  {/* number */}
                  <span className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white backdrop-blur-sm border border-white/20">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* duration badge */}
                  <span className="absolute bottom-4 left-4 rounded-full bg-brand-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-dark">
                    {course.duration}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-7">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-extrabold text-brand-dark leading-tight">{course.cardTitle}</h3>
                    <span className="shrink-0 rounded-full bg-brand-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-green">
                      {course.entry.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>

                  <div className="mt-3 h-0.5 w-8 rounded-full bg-brand-gold transition-all duration-500 group-hover:w-16" />

                  <p className="mt-4 flex-1 text-sm leading-7 text-slate-500">{course.summary}</p>

                  {/* highlights preview */}
                  <ul className="mt-5 space-y-2">
                    {course.highlights.slice(0, 2).map((h) => (
                      <li key={h} className="flex items-start gap-2 text-xs text-slate-500">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex gap-3">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="flex-1 rounded-full bg-brand-green py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-brand-green/20 transition-all duration-200 hover:bg-brand-dark hover:-translate-y-0.5"
                    >
                      Learn More
                    </Link>
                    <Link
                      href="/apply"
                      className="flex-1 rounded-full border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-brand-green/40 hover:text-brand-green hover:bg-brand-green/5"
                    >
                      Apply
                    </Link>
                  </div>
                </div>
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
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Ready to Enrol?</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
                Your healthcare career starts at Shifah.
              </h2>
              <p className="mt-4 text-base leading-8 text-white/75">
                Applications are open. Pick your programme, fill in the form, and take the first step toward a meaningful career in healthcare.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-green transition-all hover:bg-brand-cream hover:-translate-y-0.5">
                  Apply Now →
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
