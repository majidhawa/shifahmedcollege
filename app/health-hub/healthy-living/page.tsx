import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Healthy Living | SMTC Health Hub",
  description:
    "Explore practical healthy living principles covering nutrition, physical activity, sleep, mental wellbeing and preventive healthcare.",
};

const pillars = [
  {
    title: "Balanced Nutrition",
    icon: "🥗",
    description:
      "Aim for a varied and balanced diet that provides the nutrients your body needs.",
  },
  {
    title: "Physical Activity",
    icon: "🏃",
    description:
      "Regular physical activity supports physical health, fitness and overall wellbeing.",
  },
  {
    title: "Quality Sleep",
    icon: "😴",
    description:
      "Adequate, regular sleep is an important part of maintaining physical and mental wellbeing.",
  },
  {
    title: "Mental Wellbeing",
    icon: "🧠",
    description:
      "Make time for meaningful relationships, rest, reflection and seeking support when needed.",
  },
  {
    title: "Avoid Harmful Habits",
    icon: "🚭",
    description:
      "Avoid tobacco and limit behaviours that can negatively affect your health.",
  },
  {
    title: "Preventive Care",
    icon: "🩺",
    description:
      "Health checks and professional advice can help identify concerns early.",
  },
];

const dailyHabits = [
  "Drink enough water throughout the day.",
  "Include a variety of nutritious foods in your meals.",
  "Move your body regularly.",
  "Make time for adequate rest and sleep.",
  "Stay connected with supportive people.",
  "Take your mental wellbeing seriously.",
  "Avoid tobacco use.",
  "Seek professional healthcare advice when needed.",
];

export default function HealthyLivingPage() {
  return (
    <main className="min-h-screen bg-brand-cream text-brand-dark">
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-green/90 via-brand-dark to-black/95" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">
              <span className="h-px w-10 bg-brand-gold" />
              SMTC Health Hub
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Healthy Living
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
              Good health is influenced by many everyday choices. Discover
              practical principles that can help you build healthier habits
              while understanding that every person's needs are different.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#pillars"
                className="rounded-full bg-brand-gold px-6 py-3 font-semibold text-brand-dark transition hover:scale-105"
              >
                Explore Healthy Living
              </a>

              <Link
                href="/health-hub"
                className="rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Back to Health Hub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="px-6 py-16 text-center lg:py-20">
        <div className="mx-auto max-w-4xl">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
            Everyday Health
          </span>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Healthy living is more than one habit.
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Nutrition, movement, sleep, mental wellbeing, relationships and
            preventive healthcare all contribute to overall wellbeing. Healthy
            living is about building sustainable habits rather than pursuing
            perfection.
          </p>
        </div>
      </section>

      {/* PILLARS */}
      <section id="pillars" className="bg-white px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
              Six Pillars
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Build your health from the basics.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="group rounded-3xl border border-gray-100 bg-brand-cream p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green text-3xl transition group-hover:scale-110">
                  {pillar.icon}
                </div>

                <h3 className="mt-7 text-xl font-bold">{pillar.title}</h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DAILY HABITS */}
      <section className="px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
                Start Today
              </span>

              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Simple habits. Meaningful choices.
              </h2>

              <p className="mt-5 text-lg leading-8 text-gray-600">
                You do not need to change everything at once. Start with small
                actions that are realistic for your lifestyle and build from
                there.
              </p>
            </div>

            <div className="rounded-3xl bg-brand-green p-8 text-white shadow-xl">
              <h3 className="text-xl font-bold text-brand-gold">
                Healthy Living Checklist
              </h3>

              <ul className="mt-7 space-y-4">
                {dailyHabits.map((habit) => (
                  <li key={habit} className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold text-sm font-bold text-brand-dark">
                      ✓
                    </span>

                    <span className="text-white/90">{habit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* MENTAL + PHYSICAL */}
      <section className="bg-brand-dark px-6 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="text-5xl">🧠 ❤️</div>

          <h2 className="mt-6 text-3xl font-bold sm:text-4xl">
            There is no health without whole-person care.
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70">
            Physical health and mental wellbeing are connected. Caring for
            yourself includes knowing when to rest, when to make healthier
            choices and when to reach out for professional support.
          </p>

          <Link
            href="/health-hub/mental-health"
            className="mt-8 inline-flex rounded-full border border-brand-gold px-7 py-3 font-semibold text-brand-gold transition hover:bg-brand-gold hover:text-brand-dark"
          >
            Explore Mental Health
          </Link>
        </div>
      </section>

      {/* STUDENT CONNECTION */}
      <section className="px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100 sm:p-12">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
            SMTC Health Hub
          </span>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Learn. Understand. Make a difference.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-gray-600">
            Healthcare knowledge is not only for healthcare professionals. The
            more we understand about our health, the better prepared we can be
            to make informed decisions and support our communities.
          </p>

          <Link
            href="/health-hub"
            className="mt-8 inline-flex rounded-full bg-brand-green px-7 py-3 font-bold text-white transition hover:scale-105"
          >
            Explore the Health Hub
          </Link>
        </div>
      </section>

      {/* ADMISSIONS CTA */}
      <section className="bg-brand-green px-6 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Turn healthcare interest into practical skills.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/80">
            Explore healthcare training opportunities at Shifah Medical
            Training College, Kitale.
          </p>

          <Link
            href="/courses"
            className="mt-8 inline-flex rounded-full bg-brand-gold px-7 py-3 font-bold text-brand-dark transition hover:scale-105"
          >
            Explore Our Courses
          </Link>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-7 text-gray-500">
          <strong className="text-brand-dark">Health education note:</strong>{" "}
          This page provides general health education and does not replace
          personalised medical advice, diagnosis or treatment. Consult a
          qualified healthcare professional for individual health concerns.
        </div>
      </section>

      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Shifah Medical Training College. Health
        through Innovation and Research.
      </footer>
    </main>
  );
}