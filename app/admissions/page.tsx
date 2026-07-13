import Link from 'next/link';
import { Container } from '@/components/Container';
import { site } from '@/data/site';
const documents = [
  {
    title: "Diploma in Paramedicine Fee Structure",
    description:
      "Indicative fees and payment plan for the Diploma in Paramedicine programme.",
    file: "/downloads/paramedicine-fees.pdf",
  },
  {
    title: "Certificate in German Language Fee Structure",
    description:
      "Indicative fees and payment plan for the German Language programme.",
    file: "/downloads/german-language-fees.pdf",
  },
  {
    title: "Certificate in Dialysis Technology Fee Structure",
    description:
      "Indicative fees and payment plan for the Dialysis Technology programme.",
    file: "/downloads/dialysis-fees.pdf",
  },
  {
    title: "Emergency Medical Technician (EMT) Fee Structure",
    description:
      "Indicative fees and payment plan for the EMT programme.",
    file: "/downloads/emt-fees.pdf",
  },
  {
    title: "Certificate in Caregiving Fee Structure",
    description:
      "Indicative fees and payment plan for the Caregiving programme.",
    file: "/downloads/caregiving-fees.pdf",
  },
  {
    title: "Safe Phlebotomy Fee Structure",
    description:
      "Indicative fees and payment plan for the Safe Phlebotomy programme.",
    file: "/downloads/phlebotomy-fees.pdf",
  },
  {
    title: "Medical Assessment Form",
    description:
      "To be completed by a registered medical practitioner.",
    file: "/downloads/medical-assessment-form.pdf",
  },
  {
    title: "Application Letter Template",
    description:
      "Ready-to-fill admission application letter.",
    file: "/downloads/application-letter-template.pdf",
  },
];
export default function AdmissionsPage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-brand-dark py-24 text-white">
        <img src="/images/girl2.jpeg" alt="Admissions" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />
        <Container className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-brand-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Admissions</p>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Your journey into healthcare <span className="text-brand-gold">starts here.</span>
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-brand-gold" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Shifah's admissions process is simple, transparent, and designed to get you started as quickly as possible. Here's everything you need to know.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-green/30 transition hover:bg-brand-dark">
              Apply Now →
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Contact Admissions
            </Link>
          </div>
        </Container>
      </section>

      {/* ── REQUIREMENTS + STEPS ── */}
      <section className="py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-start">

          {/* Entry Requirements */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Entry Requirements</p>
            </div>
            <h2 className="text-2xl font-extrabold text-brand-dark md:text-3xl">
              Who can <span className="text-brand-green">apply?</span>
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">Shifah is open to students from all backgrounds. Our entry requirements are intentionally accessible.</p>

            <ul className="mt-8 space-y-4">
              {site.requirements.map((item, i) => (
                <li
                  key={item}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 transition-all duration-300 hover:border-brand-green/30 hover:bg-white hover:shadow-md hover:shadow-brand-green/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-xs font-black text-brand-green transition-all duration-300 group-hover:bg-brand-green group-hover:text-white">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-7 text-slate-600">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* How to Apply */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">How to Apply</p>
            </div>
            <h2 className="text-2xl font-extrabold text-brand-dark md:text-3xl">
              5 simple <span className="text-brand-green">steps.</span>
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">From choosing your course to receiving your offer — here's exactly what to expect.</p>

            <ol className="mt-8 space-y-4">
              {site.admissionsSteps.map((item, i) => (
                <li key={item} className="group relative flex items-start gap-4">
                  {/* connector line */}
                  {i < site.admissionsSteps.length - 1 && (
                    <div className="absolute left-4 top-10 h-full w-px bg-slate-200" />
                  )}
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green text-xs font-black text-white shadow-md shadow-brand-green/30 z-10">
                    {i + 1}
                  </span>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 flex-1 transition-all duration-300 group-hover:border-brand-green/30 group-hover:bg-white group-hover:shadow-md group-hover:shadow-brand-green/10">
                    <p className="text-sm leading-7 text-slate-600">{item}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ── FEES ── */}
      <section className="py-24 bg-brand-dark text-white">
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Fees Guidance</p>
              <span className="h-px w-8 bg-brand-gold" />
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Transparent <span className="text-brand-gold">fee information.</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {site.feeNotes.map((item, i) => (
              <div
                key={item}
                className="group rounded-3xl border border-white/10 bg-white/5 p-7 transition-all duration-300 hover:bg-white/10 hover:border-brand-gold/30 hover:-translate-y-1"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold mb-4 transition-all duration-300 group-hover:bg-brand-gold group-hover:text-brand-dark">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {i === 0
                      ? <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>
                      : <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>
                    }
                  </svg>
                </div>
                <p className="text-sm leading-7 text-white/70">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-white/50">For specific fee details per programme, contact the admissions office directly.</p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Contact Admissions →
            </Link>
          </div>
        </Container>
      </section>
{/* ───────── DOWNLOAD DOCUMENTS ───────── */}

<section className="bg-slate-50 py-24">

  <Container>

    <div className="text-center max-w-3xl mx-auto">

      <div className="flex items-center justify-center gap-2 mb-4">

        <span className="h-px w-8 bg-brand-gold" />

        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">

          Downloads

        </p>

        <span className="h-px w-8 bg-brand-gold" />

      </div>

      <h2 className="text-3xl md:text-4xl font-extrabold text-brand-dark">

        Fee Structures & Admission Forms

      </h2>

      <p className="mt-5 text-slate-500 leading-8">

        Download official fee structures, admission forms and application
        documents. All documents are provided in PDF format.

      </p>

    </div>

    <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

      {documents.map((doc) => (

        <div
          key={doc.title}
          className="group rounded-3xl border border-slate-200 bg-white p-7 transition-all duration-300 hover:-translate-y-2 hover:border-brand-green hover:shadow-xl"
        >

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">

            <svg
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-600"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>

          </div>

          <h3 className="mt-6 text-xl font-bold text-brand-dark">

            {doc.title}

          </h3>

          <p className="mt-3 text-sm leading-7 text-slate-500">

            {doc.description}

          </p>

          <a
            href={doc.file}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >

            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>

            Download PDF

          </a>

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
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Start Your Application</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
                Ready to take the first step?
              </h2>
              <p className="mt-4 text-base leading-8 text-white/75">
                Applications are open now. Complete the form online and our admissions team will guide you through the rest.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-green transition-all hover:bg-brand-cream hover:-translate-y-0.5">
                  Apply Now →
                </Link>
                <Link href="/courses" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  View Courses
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

    </main>
  );
}
