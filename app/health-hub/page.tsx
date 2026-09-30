import Image from 'next/image';
import Link from 'next/link';

const featuredTopics = [
  {
    title: 'Mental Health',
    description:
      'Learn about mental wellbeing, healthy conversations, support and the importance of caring for the whole person.',
    image: '/images/mental-health-day.png',
    href: '/health-hub/mental-health',
    label: 'FEATURED',
  },
  {
    title: 'Heart Health',
    description:
      'Explore cardiovascular health, emergency response, CPR, AED awareness and practical life-saving knowledge.',
    image: '/images/Save_heart.png',
    href: '/world-heart-day',
    label: 'CAMPAIGN',
  },
  {
    title: 'Stroke Awareness',
    description:
      'Learn how to recognise important stroke warning signs and why rapid emergency response matters.',
    image: '/images/stroke-awareness.png',
    href: '/health-hub/stroke',
    label: 'COMING SOON',
  },
  {
    title: 'Diabetes',
    description:
      'Discover practical information about diabetes, healthy living, prevention and the importance of awareness.',
    image: '/images/diabetes-awareness.png',
    href: '/health-hub/diabetes',
    label: 'COMING SOON',
  },
];

const quickTopics = [
  {
    icon: '🧠',
    title: 'Mental Health',
    text: 'Understanding mental wellbeing and supporting healthier conversations.',
    href: '/health-hub/mental-health',
  },
  {
    icon: '❤️',
    title: 'Heart Health',
    text: 'Heart health, CPR, AEDs and emergency awareness.',
    href: '/world-heart-day',
  },
  {
    icon: '🩸',
    title: 'Diabetes',
    text: 'Diabetes awareness and healthy-living education.',
    href: '/health-hub/diabetes',
  },
  {
    icon: '🧠',
    title: 'Stroke',
    text: 'Recognising warning signs and understanding emergency response.',
    href: '/health-hub/stroke',
  },
  {
    icon: '🩺',
    title: 'First Aid',
    text: 'Practical knowledge for responding to common emergencies.',
    href: '/health-hub/first-aid',
  },
  {
    icon: '🥗',
    title: 'Healthy Living',
    text: 'Simple principles that support a healthier lifestyle.',
    href: '/health-hub/healthy-living',
  },
];

const studentContent = [
  {
    number: '01',
    title: 'Healthcare Student Problems 😂',
    description:
      'The funny, relatable and sometimes chaotic reality of healthcare training.',
  },
  {
    number: '02',
    title: 'Healthcare Knowledge',
    description:
      'Short educational videos explaining healthcare concepts in simple language.',
  },
  {
    number: '03',
    title: 'Behind the Scenes',
    description:
      'See practical training, student activities, college life and the people behind SMTC.',
  },
];

export const metadata = {
  title: 'Health Hub | Shifah Medical Training College',
  description:
    'Explore healthcare education, awareness campaigns, student insights and practical health knowledge from Shifah Medical Training College.',
};

export default function HealthHubPage() {
  return (
    <main className="min-h-screen bg-brand-cream text-brand-dark">

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="relative overflow-hidden bg-brand-dark text-white">

        {/* Decorative elements */}

        <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-green/25 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-brand-gold/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:py-28">

          {/* Breadcrumb */}

          <div className="mb-10 flex items-center gap-2 text-xs font-semibold text-white/40">

            <Link
              href="/"
              className="transition hover:text-brand-gold"
            >
              Home
            </Link>

            <span>/</span>

            <span className="text-brand-gold">
              Health Hub
            </span>

          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">

            {/* Hero copy */}

            <div>

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/10 px-4 py-2">

                <span className="h-2 w-2 rounded-full bg-brand-gold" />

                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-gold">
                  SMTC Health & Awareness
                </span>

              </div>

              <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
                Learn.
                <span className="text-brand-gold"> Understand.</span>
                <span className="block">
                  Make a Difference.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/60 md:text-xl">
                Welcome to the SMTC Health Hub — a growing collection of
                healthcare education, public-health awareness, student
                insights and practical knowledge designed to make healthcare
                easier to understand.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">

                <a
                  href="#featured"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-7 py-4 text-sm font-bold text-white shadow-xl shadow-brand-green/20 transition hover:-translate-y-0.5 hover:bg-brand-gold hover:text-brand-dark"
                >
                  Explore Health Topics
                  <span>→</span>
                </a>

                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Explore SMTC Courses
                </Link>

              </div>

            </div>

            {/* Hero visual */}

            <div className="relative mx-auto w-full max-w-lg">

              <div className="absolute -inset-5 rounded-[2.5rem] bg-brand-green/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 shadow-2xl">

                <div className="relative aspect-[4/5]">

                  <Image
                    src="/images/health-hub.png"
                    alt="SMTC Health Hub"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 500px"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-transparent to-transparent" />

                  <div className="absolute bottom-6 left-6 right-6">

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold">
                      Shifah Medical Training College
                    </p>

                    <p className="mt-2 text-2xl font-black">
                      Healthcare knowledge for everyday life.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =========================================================
          INTRO
      ========================================================= */}

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28">

        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-green">
              About the Health Hub
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Healthcare information should be useful, understandable and
              accessible.
            </h2>

          </div>

          <div className="space-y-5 text-base leading-8 text-brand-dark/65 md:text-lg">

            <p>
              The SMTC Health Hub brings together health-awareness campaigns,
              educational resources, practical healthcare information and
              conversations about issues that affect individuals and
              communities.
            </p>

            <p>
              Whether you are a student, parent, healthcare enthusiast or
              simply someone who wants to understand health better, this space
              is designed to help you learn something useful.
            </p>

            <p className="font-semibold text-brand-dark">
              Learn from SMTC. Share what you learn. Help someone else make
              better-informed health decisions.
            </p>

          </div>

        </div>

      </section>

      {/* =========================================================
          FEATURED TOPICS
      ========================================================= */}

      <section
        id="featured"
        className="bg-white py-20 md:py-28"
      >

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-green">
                Featured health topics
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Explore the Health Hub
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-brand-dark/60">
                Explore our current campaigns and growing collection of
                healthcare-awareness topics.
              </p>

            </div>

          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">

            {featuredTopics.map((topic) => (
              <Link
                key={topic.title}
                href={topic.href}
                className="group overflow-hidden rounded-[2rem] border border-brand-dark/10 bg-brand-cream transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >

                <div className="relative aspect-[16/10] overflow-hidden">

                  <Image
                    src={topic.image}
                    alt={topic.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  <div className="absolute left-5 top-5 rounded-full bg-brand-gold px-3 py-1.5 text-[9px] font-black tracking-[0.15em] text-brand-dark">
                    {topic.label}
                  </div>

                  <div className="absolute bottom-5 left-5 right-5">

                    <h3 className="text-2xl font-black text-white md:text-3xl">
                      {topic.title}
                    </h3>

                  </div>

                </div>

                <div className="p-6">

                  <p className="leading-7 text-brand-dark/60">
                    {topic.description}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-green transition group-hover:gap-3">
                    Explore topic
                    <span>→</span>
                  </div>

                </div>

              </Link>
            ))}

          </div>

        </div>

      </section>

      {/* =========================================================
          QUICK TOPICS
      ========================================================= */}

      <section className="py-20 md:py-28">

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="max-w-2xl">

            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-green">
              More to explore
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Health knowledge, one topic at a time.
            </h2>

          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {quickTopics.map((topic) => (
              <Link
                key={topic.title}
                href={topic.href}
                className="group rounded-3xl border border-brand-dark/10 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-xl"
              >

                <div className="flex items-start justify-between">

                  <span className="text-3xl">
                    {topic.icon}
                  </span>

                  <span className="text-xl text-brand-dark/20 transition group-hover:text-brand-green">
                    →
                  </span>

                </div>

                <h3 className="mt-7 text-xl font-black">
                  {topic.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-brand-dark/55">
                  {topic.text}
                </p>

              </Link>
            ))}

          </div>

        </div>

      </section>

      {/* =========================================================
          STUDENT CONTENT
      ========================================================= */}

      <section className="bg-brand-dark py-20 text-white md:py-28">

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-gold">
                Beyond health awareness
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Healthcare is more than textbooks.
              </h2>

              <p className="mt-6 leading-8 text-white/55">
                Get a glimpse into the people, experiences and practical
                learning behind healthcare education at SMTC.
              </p>

              <Link
                href="/student-life"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3.5 text-sm font-bold transition hover:bg-brand-gold hover:text-brand-dark"
              >
                Discover Student Life
                <span>→</span>
              </Link>

            </div>

            <div className="space-y-4">

              {studentContent.map((item) => (
                <div
                  key={item.number}
                  className="group flex gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
                >

                  <span className="text-sm font-black text-brand-gold">
                    {item.number}
                  </span>

                  <div>

                    <h3 className="text-xl font-black">
                      {item.title}
                    </h3>

                    <p className="mt-2 leading-7 text-white/50">
                      {item.description}
                    </p>

                  </div>

                </div>
              ))}

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          SOCIAL CTA
      ========================================================= */}

      <section className="py-20 md:py-28">

        <div className="mx-auto max-w-5xl px-6 text-center md:px-10">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-2xl">
            ▶
          </div>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-brand-green">
            Learn with SMTC
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Follow the conversation.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-brand-dark/60">
            From quick healthcare lessons to funny student moments and major
            awareness campaigns, follow SMTC on social media for content that
            informs, educates and entertains.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">

            <a
              href="https://www.tiktok.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand-dark px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-green"
            >
              TikTok
            </a>

            <a
              href="https://www.instagram.com/shifahmedicalcollege/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-brand-dark/10 bg-white px-6 py-3 text-sm font-bold transition hover:bg-brand-green hover:text-white"
            >
              Instagram
            </a>

            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-brand-dark/10 bg-white px-6 py-3 text-sm font-bold transition hover:bg-brand-green hover:text-white"
            >
              Facebook
            </a>

          </div>

        </div>

      </section>

      {/* =========================================================
          ADMISSIONS CTA
      ========================================================= */}

      <section className="bg-brand-green py-20 text-white md:py-24">

        <div className="mx-auto max-w-5xl px-6 text-center md:px-10">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-gold">
            Build your healthcare future
          </p>

          <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
            Interested in healthcare?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-white/70">
            Turn your interest in healthcare into practical skills and
            professional training at Shifah Medical Training College.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

            <Link
              href="/courses"
              className="rounded-full bg-white px-8 py-4 text-sm font-bold text-brand-green transition hover:bg-brand-gold hover:text-brand-dark"
            >
              Explore Our Courses
            </Link>

            <Link
              href="/admissions"
              className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Apply Now
            </Link>

          </div>

        </div>

      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="bg-brand-dark px-6 py-10 text-center text-white/35">

        <p className="text-sm font-semibold">
          Shifah Medical Training College
        </p>

        <p className="mt-2 text-xs">
          Health through Innovation and Research
        </p>

        <p className="mt-5 text-[10px]">
          © {new Date().getFullYear()} SMTC. Health education and awareness.
        </p>

      </footer>

    </main>
  );
}
