import Link from 'next/link';
import { Container } from '@/components/Container';
import { CourseCard } from '@/components/CourseCard';
import { HeroSlider } from '@/components/HeroSlider';
import { PartnersMarquee } from '@/components/PartnersMarquee';
import { courses, site } from '@/data/site';

export default function HomePage() {
  return (
    <main>
      <HeroSlider />

      <section className="py-24 overflow-hidden">
        <Container className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">About the College</p>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark md:text-4xl">
              Training the next generation of{' '}
              <span className="text-brand-green">healthcare professionals.</span>
            </h2>
            <div className="mt-4 h-1 w-12 rounded-full bg-brand-gold" />
            <p className="mt-6 text-base leading-8 text-slate-600">{site.about}</p>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { value: '3+', label: 'Programmes' },
                { value: '6mo', label: 'Shortest Course' },
                { value: '100%', label: 'Practical Focus' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center">
                  <p className="text-2xl font-extrabold text-brand-green">{s.value}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-green/20 transition-all hover:bg-brand-dark hover:-translate-y-0.5">
                Learn More
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <Link href="/apply" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-brand-green/40 hover:text-brand-green hover:bg-brand-green/5">
                Apply Today
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-6 -top-6 h-full w-full rounded-3xl bg-brand-cream" />
            <div className="absolute -left-3 top-8 bottom-8 w-1 rounded-full bg-gradient-to-b from-brand-green to-brand-gold" />
            <div className="relative overflow-hidden rounded-3xl shadow-xl">
              <img src="/images/girl.jpeg" alt="Student nurse" className="h-full w-full object-cover aspect-[4/5]" />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-brand-dark/80 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">Shifah Medical Training College</p>
                <p className="mt-0.5 text-sm text-white/80">Kitale, Kenya — {site.motto}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 py-20">
        <Container>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Featured Courses</p>
          <h2 className="section-title mt-4">Best Medical Training College in Kitale — Caregiving, Phlebotomy & Dialysis.</h2>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        </Container>
      </section>

      <section className="py-24 bg-brand-dark text-white overflow-hidden">
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Why Choose Shifah</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Built for students who are serious about a <span className="text-brand-gold">healthcare career.</span>
            </h2>
            <p className="mt-4 text-base text-white/60 leading-7">At Shifah Medical Training College, we combine practical training, strong values, and a clear pathway to help you succeed in the medical field.</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                title: 'Accredited Programmes',
                text: 'Our courses are accredited by NITA, TVET/CDACC and other recognised bodies, giving your certificate real value locally and internationally.'
              },
              {
                icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
                title: 'Hands-On Training',
                text: 'Every programme at Shifah is built around practical, real-world skills — not just theory. You graduate ready to work from day one.'
              },
              {
                icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                title: 'Short, Focused Courses',
                text: 'From 2 months to 6 months, our programmes are designed to get you qualified and into the workforce quickly without compromising quality.'
              },
              {
                icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                title: 'Open to All Backgrounds',
                text: 'With a minimum entry of KCSE D-, Shifah opens the door to healthcare careers for students from all walks of life and experience levels.'
              },
            ].map((item) => (
              <div key={item.title} className="group relative rounded-3xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:bg-white/10 hover:border-brand-gold/30 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold transition-all duration-300 group-hover:bg-brand-gold group-hover:text-brand-dark">
                  {item.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{item.title}</h3>
                <div className="mt-2 h-0.5 w-8 rounded-full bg-brand-gold/40 transition-all duration-300 group-hover:w-12 group-hover:bg-brand-gold" />
                <p className="mt-3 text-sm leading-7 text-white/60">{item.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-24 bg-white overflow-hidden">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Academic Departments</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark md:text-4xl">
              A full spectrum of <span className="text-brand-green">healthcare disciplines.</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Shifah's departments are structured to give students a broad, credible foundation across all major areas of healthcare practice.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {site.departments.map((dept, i) => (
              <div key={dept} className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 px-6 py-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-green/40 hover:bg-white hover:shadow-xl hover:shadow-brand-green/10">
                <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-slate-200 transition-all duration-500 group-hover:bg-brand-green group-hover:top-2 group-hover:bottom-2" />
                <div className="relative">
                  <p className="text-2xl font-black text-brand-green/30 transition-colors duration-300 group-hover:text-brand-green">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2 text-sm font-bold leading-snug text-brand-dark">{dept}</h3>
                  <div className="mt-3 h-0.5 w-5 rounded-full bg-brand-gold/30 transition-all duration-500 group-hover:w-12 group-hover:bg-brand-gold" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 via-brand-green/5 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-green/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-green/20 to-transparent" />
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Partners & Recognition</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark md:text-4xl">
              Trusted by leading <span className="text-brand-green">healthcare organisations.</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">Shifah's programmes are backed by recognised accreditation bodies and industry partners.</p>
          </div>
          <PartnersMarquee />
        </Container>
      </section>

      <section className="pt-24 pb-10">
        <Container>
          <div className="rounded-[2rem] bg-brand-cream px-8 py-10 md:px-12 md:py-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Apply for Intake</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-brand-dark md:text-4xl">Ready to begin your healthcare career with Shifah?</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">Applications are open. Choose your programme, complete the form, and take the first step toward a meaningful career in healthcare.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/apply" className="rounded-full bg-brand-green px-7 py-3 text-sm font-semibold text-white">Apply Now</Link>
              <Link href="/admissions" className="rounded-full border border-slate-300 px-7 py-3 text-sm font-semibold text-slate-700">Admissions Guide</Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
