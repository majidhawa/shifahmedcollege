import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'World Mental Health Day 2026 | SMTC Health Hub',
  description:
    'Explore mental health awareness, wellbeing, support and healthy conversations with Shifah Medical Training College.',
};

const topics = [
  {
    number: '01',
    title: 'Understand Mental Health',
    description:
      'Mental health is an important part of overall wellbeing. Learn why caring for the mind matters just as much as caring for the body.',
    icon: '🧠',
  },
  {
    number: '02',
    title: 'Talk About It',
    description:
      'Creating safe spaces for honest conversations can help reduce stigma and remind people that they do not have to face challenges alone.',
    icon: '💬',
  },
  {
    number: '03',
    title: 'Listen Without Judging',
    description:
      'Sometimes support begins with simply listening. Compassion, patience and understanding can make a meaningful difference.',
    icon: '🤝',
  },
  {
    number: '04',
    title: 'Seek Professional Support',
    description:
      'When mental or emotional difficulties become difficult to manage, reaching out to an appropriately qualified healthcare or mental-health professional is important.',
    icon: '🩺',
  },
];

const signs = [
  'Persistent sadness or low mood',
  'Feeling overwhelmed for a prolonged period',
  'Major changes in sleep or appetite',
  'Withdrawal from friends, family or normal activities',
  'Difficulty concentrating or functioning normally',
  'Persistent feelings of fear, hopelessness or distress',
];

const studentTips = [
  {
    title: 'Take meaningful breaks',
    description:
      'Give yourself time to rest between classes, practical sessions and study periods.',
  },
  {
    title: 'Stay connected',
    description:
      'Maintain healthy relationships with friends, classmates, mentors and trusted people around you.',
  },
  {
    title: 'Talk when you need help',
    description:
      'You do not have to carry every challenge by yourself. Speak to someone you trust and seek appropriate professional support when needed.',
  },
  {
    title: 'Look after your whole self',
    description:
      'Healthy routines involving sleep, physical activity, nutrition, recreation and spiritual or personal reflection can support overall wellbeing.',
  },
];

export default function MentalHealthPage() {
  return (
    <main className="min-h-screen bg-brand-cream text-brand-dark">

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="relative overflow-hidden bg-brand-dark">
        {/* Background decoration */}

        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-green/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-brand-gold/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:py-28">

          {/* Breadcrumb */}

          <div className="mb-8 flex items-center gap-2 text-xs font-semibold text-white/50">
            <Link
              href="/"
              className="transition hover:text-brand-gold"
            >
              Home
            </Link>

            <span>/</span>

            <Link
              href="/health-hub"
              className="transition hover:text-brand-gold"
            >
              Health Hub
            </Link>

            <span>/</span>

            <span className="text-brand-gold">
              Mental Health
            </span>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">

            {/* Hero copy */}

            <div>

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-gold" />

                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold">
                  World Mental Health Day • 10 October 2026
                </span>
              </div>

              <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight text-white md:text-6xl lg:text-7xl">
                Mental Health
                <span className="block text-brand-gold">
                  Matters.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65 md:text-xl">
                Your mind matters. Your health matters. Your life matters.
                Let&apos;s create space for understanding, compassion and
                meaningful conversations about mental wellbeing.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">

                <a
                  href="#learn"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-7 py-4 text-sm font-bold text-white shadow-xl shadow-brand-green/20 transition hover:-translate-y-0.5 hover:bg-brand-gold hover:text-brand-dark"
                >
                  Explore the Campaign

                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </a>

                <Link
                  href="/health-hub"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Explore Health Hub
                </Link>

              </div>

              <div className="mt-10 flex flex-wrap gap-3">

                {[
                  'Awareness',
                  'Wellbeing',
                  'Compassion',
                  'Support',
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/50"
                  >
                    {item}
                  </span>
                ))}

              </div>

            </div>

            {/* Hero image */}

            <div className="relative mx-auto w-full max-w-lg">

              <div className="absolute -inset-5 rounded-[2.5rem] bg-brand-green/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 shadow-2xl">

                <div className="relative aspect-[4/5]">

                  <Image
                    src="/images/mental-health-day.png"
                    alt="World Mental Health Day 2026 - Shifah Medical Training College"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 500px"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/70 via-transparent to-transparent" />

                  <div className="absolute bottom-6 left-6 right-6">

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold">
                      SMTC Health Hub
                    </p>

                    <p className="mt-2 text-xl font-black text-white">
                      Let&apos;s talk. Let&apos;s listen. Let&apos;s care.
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

      <section
        id="learn"
        className="mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28"
      >

        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-green">
              Why it matters
            </p>

            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Caring for the mind is part of caring for the whole person.
            </h2>

          </div>

          <div className="space-y-5 text-base leading-8 text-brand-dark/65 md:text-lg">

            <p>
              Mental wellbeing influences how we think, feel, relate to
              others and respond to everyday challenges.
            </p>

            <p>
              Conversations about mental health can help people recognise
              when they are struggling, seek appropriate support and extend
              compassion to others.
            </p>

            <p>
              At Shifah Medical Training College, we believe healthcare
              education should go beyond treating illness. It should also
              encourage knowledge, empathy, prevention and responsible care.
            </p>

          </div>

        </div>

      </section>

      {/* =========================================================
          FOUR PILLARS
      ========================================================= */}

      <section className="bg-white py-20 md:py-28">

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="max-w-2xl">

            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-green">
              Mental health awareness
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Start with understanding.
            </h2>

            <p className="mt-5 leading-7 text-brand-dark/60">
              Awareness begins when we learn to recognise the importance of
              mental wellbeing and create environments where people can speak
              openly and seek appropriate help.
            </p>

          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">

            {topics.map((topic) => (
              <article
                key={topic.number}
                className="group rounded-3xl border border-brand-dark/10 bg-brand-cream p-7 transition duration-300 hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-xl"
              >

                <div className="flex items-start justify-between">

                  <span className="text-4xl">
                    {topic.icon}
                  </span>

                  <span className="text-xs font-black tracking-[0.2em] text-brand-green/50">
                    {topic.number}
                  </span>

                </div>

                <h3 className="mt-8 text-2xl font-black">
                  {topic.title}
                </h3>

                <p className="mt-3 leading-7 text-brand-dark/60">
                  {topic.description}
                </p>

              </article>
            ))}

          </div>

        </div>

      </section>

      {/* =========================================================
          SIGNS
      ========================================================= */}

      <section className="bg-brand-dark py-20 text-white md:py-28">

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-gold">
                Know the signs
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-5xl">
                Sometimes the first step is noticing that something has
                changed.
              </h2>

              <p className="mt-6 max-w-xl leading-8 text-white/55">
                People respond to stress and emotional difficulties
                differently. A change in behaviour or wellbeing that persists
                or interferes with everyday life may be a reason to seek
                support.
              </p>

            </div>

            <div className="grid gap-3 sm:grid-cols-2">

              {signs.map((sign, index) => (
                <div
                  key={sign}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
                >

                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold text-xs font-black text-brand-dark">
                    {index + 1}
                  </span>

                  <p className="text-sm font-semibold leading-6 text-white/75">
                    {sign}
                  </p>

                </div>
              ))}

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          SUPPORT
      ========================================================= */}

      <section className="py-20 md:py-28">

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="mx-auto max-w-3xl text-center">

            <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-green">
              Be a source of support
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Small acts of care can open important conversations.
            </h2>

            <p className="mt-5 leading-8 text-brand-dark/60">
              You do not need to have all the answers to support someone.
              Listening with empathy, avoiding judgement and encouraging
              appropriate professional help can be meaningful steps.
            </p>

          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">

            {[
              {
                title: 'Listen',
                text: 'Give someone your attention and allow them to express what they are experiencing.',
              },
              {
                title: 'Encourage',
                text: 'Encourage people who are struggling to connect with trusted support and qualified professionals.',
              },
              {
                title: 'Care',
                text: 'Continue checking in. A simple message or conversation can remind someone that they are not alone.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-brand-dark/10 bg-white p-7 shadow-sm"
              >

                <div className="mb-6 h-2 w-12 rounded-full bg-brand-gold" />

                <h3 className="text-2xl font-black">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-brand-dark/60">
                  {item.text}
                </p>

              </div>
            ))}

          </div>

        </div>

      </section>

      {/* =========================================================
          STUDENT WELLBEING
      ========================================================= */}

      <section className="bg-brand-green py-20 text-white md:py-28">

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-gold">
                For healthcare students
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                You care for others. Remember to care for yourself.
              </h2>

              <p className="mt-6 leading-8 text-white/70">
                Healthcare education can be demanding. Building healthy
                routines and knowing when to ask for support are important
                parts of becoming a sustainable healthcare professional.
              </p>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              {studentTips.map((tip) => (
                <article
                  key={tip.title}
                  className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"
                >

                  <h3 className="text-xl font-black">
                    {tip.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-white/65">
                    {tip.description}
                  </p>

                </article>
              ))}

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          SMTC CAMPAIGN SERIES
      ========================================================= */}

      <section className="py-20 md:py-28">

        <div className="mx-auto max-w-7xl px-6 md:px-10">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-green">
                Follow the conversation
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                SMTC Mental Health Series
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-brand-dark/60">
                Follow our social channels for short educational videos,
                student conversations and practical mental-health awareness
                content throughout the campaign.
              </p>

            </div>

            <Link
              href="/health-hub"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-dark px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-green"
            >
              Visit Health Hub
              <span>→</span>
            </Link>

          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">

            {[
              {
                episode: 'EPISODE 01',
                title: 'What Is Mental Health?',
                text: 'A simple introduction to mental wellbeing and why it matters.',
              },
              {
                episode: 'EPISODE 02',
                title: 'When Should You Seek Support?',
                text: 'Understanding when a challenge may require additional support.',
              },
              {
                episode: 'EPISODE 03',
                title: 'Let’s Talk About It',
                text: 'Breaking the silence and encouraging healthier conversations.',
              },
            ].map((episode) => (
              <article
                key={episode.episode}
                className="group overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >

                <div className="flex aspect-video items-center justify-center bg-brand-dark">

                  <div className="text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold text-xl text-brand-dark">
                      ▶
                    </div>

                    <p className="mt-4 text-[10px] font-black tracking-[0.25em] text-white/50">
                      {episode.episode}
                    </p>

                  </div>

                </div>

                <div className="p-6">

                  <p className="text-[10px] font-black tracking-[0.2em] text-brand-green">
                    {episode.episode}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {episode.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-brand-dark/60">
                    {episode.text}
                  </p>

                </div>

              </article>
            ))}

          </div>

        </div>

      </section>

      {/* =========================================================
          IMPORTANT SUPPORT NOTICE
      ========================================================= */}

      <section className="px-6 pb-20 md:px-10 md:pb-28">

        <div className="mx-auto max-w-5xl rounded-[2rem] border border-brand-gold/30 bg-brand-gold/10 p-7 md:p-10">

          <div className="flex flex-col gap-5 md:flex-row md:items-start">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-gold text-xl">
              💛
            </div>

            <div>

              <h2 className="text-2xl font-black">
                Need support?
              </h2>

              <p className="mt-3 leading-7 text-brand-dark/65">
                This page is intended for health education and awareness. It
                is not a substitute for professional diagnosis, treatment or
                emergency care. If you or someone else is experiencing serious
                distress or is in immediate danger, contact an appropriate
                emergency service or qualified healthcare professional in
                your area.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================= */}

      <section className="bg-brand-dark py-20 text-white md:py-24">

        <div className="mx-auto max-w-5xl px-6 text-center md:px-10">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-gold">
            Health through Innovation and Research
          </p>

          <h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
            Learn healthcare.
            <span className="block text-brand-gold">
              Make a difference.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-8 text-white/55">
            Discover healthcare education, awareness campaigns and practical
            learning opportunities at Shifah Medical Training College.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

            <Link
              href="/courses"
              className="rounded-full bg-brand-green px-8 py-4 text-sm font-bold transition hover:bg-brand-gold hover:text-brand-dark"
            >
              Explore Our Courses
            </Link>

            <Link
              href="/admissions"
              className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-bold transition hover:bg-white/10"
            >
              Apply Now
            </Link>

          </div>

          <p className="mt-10 text-xs text-white/30">
            © {new Date().getFullYear()} Shifah Medical Training College
          </p>

        </div>

      </section>

    </main>
  );
}

