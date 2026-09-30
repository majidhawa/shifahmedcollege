import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "First Aid Awareness | SMTC Health Hub",
  description:
    "Learn basic first aid principles, emergency awareness and the importance of responding safely while professional help is sought.",
};

const principles = [
  {
    number: "01",
    title: "Stay Safe",
    description:
      "Before helping, check whether the environment is safe for you, the injured person and others nearby.",
  },
  {
    number: "02",
    title: "Check the Person",
    description:
      "Assess responsiveness and look for signs that require urgent emergency assistance.",
  },
  {
    number: "03",
    title: "Call for Help",
    description:
      "Get appropriate emergency assistance as quickly as possible when the situation is serious.",
  },
  {
    number: "04",
    title: "Give Appropriate Care",
    description:
      "Provide first aid within your level of training while waiting for qualified medical assistance.",
  },
];

const situations = [
  {
    title: "Bleeding",
    icon: "🩸",
    description:
      "Serious bleeding can be life-threatening and requires urgent attention.",
  },
  {
    title: "Burns",
    icon: "🔥",
    description:
      "Burn injuries should be assessed and managed appropriately, especially when severe.",
  },
  {
    title: "Choking",
    icon: "🫁",
    description:
      "Severe choking can rapidly become an emergency and requires immediate action.",
  },
  {
    title: "Unconsciousness",
    icon: "🚑",
    description:
      "An unresponsive person may require immediate emergency assessment.",
  },
  {
    title: "Fractures",
    icon: "🦴",
    description:
      "Suspected fractures should be protected from unnecessary movement and assessed professionally.",
  },
  {
    title: "CPR & AED",
    icon: "❤️",
    description:
      "Cardiac emergencies require rapid emergency response and appropriately trained assistance.",
  },
];

export default function FirstAidPage() {
  return (
    <main className="min-h-screen bg-brand-cream text-brand-dark">
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-green/90 via-brand-dark to-black/95" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <div className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">
              <span className="h-px w-10 bg-brand-gold" />
              SMTC Health Hub
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              First Aid Awareness
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
              First aid knowledge can help people respond safely and
              confidently while professional medical assistance is being
              arranged.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#principles"
                className="rounded-full bg-brand-gold px-6 py-3 font-semibold text-brand-dark transition hover:scale-105"
              >
                Learn First Aid
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
            Be Prepared
          </span>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            First aid begins with a safe response.
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            First aid is immediate assistance given to someone who is injured
            or suddenly ill before professional medical care becomes available.
            The goal is to protect life, prevent the situation from worsening
            and support recovery while appropriate help is obtained.
          </p>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section id="principles" className="bg-white px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
              The Basics
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Four principles to remember
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {principles.map((principle) => (
              <div
                key={principle.number}
                className="rounded-3xl border border-gray-100 bg-brand-cream p-7 shadow-sm"
              >
                <span className="text-sm font-bold tracking-widest text-brand-gold">
                  {principle.number}
                </span>

                <h3 className="mt-5 text-xl font-bold">
                  {principle.title}
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SITUATIONS */}
      <section className="px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
              Emergency Awareness
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Situations where first aid knowledge matters
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {situations.map((situation) => (
              <div
                key={situation.title}
                className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-4xl">{situation.icon}</div>

                <h3 className="mt-6 text-xl font-bold">
                  {situation.title}
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {situation.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAINING */}
      <section className="bg-brand-green px-6 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">
            Practical Skills
          </span>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            First aid is a skill worth learning.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/80">
            Reading about first aid is useful, but practical training helps
            learners develop the confidence and skills needed to respond
            appropriately.
          </p>

          <Link
            href="/courses"
            className="mt-8 inline-flex rounded-full bg-brand-gold px-7 py-3 font-bold text-brand-dark transition hover:scale-105"
          >
            Explore Healthcare Training
          </Link>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-7 text-gray-500">
          <strong className="text-brand-dark">Important:</strong> This page
          provides general first aid awareness and should not replace certified
          practical first aid training. In a serious emergency, contact
          appropriate emergency medical services and follow guidance from
          qualified professionals.
        </div>
      </section>

      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Shifah Medical Training College. Health
        through Innovation and Research.
      </footer>
    </main>
  );
}