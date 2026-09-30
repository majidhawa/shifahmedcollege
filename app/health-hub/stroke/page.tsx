import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stroke Awareness | SMTC Health Hub",
  description:
    "Learn the warning signs of stroke, why fast action matters, and how healthcare knowledge can help save lives.",
};

const warningSigns = [
  {
    title: "Face",
    description:
      "One side of the face may droop or feel different. Ask the person to smile and observe whether the smile is uneven.",
  },
  {
    title: "Arms",
    description:
      "One arm may become weak, numb or difficult to lift. Ask the person to raise both arms.",
  },
  {
    title: "Speech",
    description:
      "Speech may suddenly become unclear, confused or difficult to understand.",
  },
  {
    title: "Time",
    description:
      "Stroke can be an emergency. If these symptoms appear suddenly, seek emergency medical help immediately.",
  },
];

const topics = [
  {
    title: "Know the Signs",
    description: "Recognising sudden changes can help someone get urgent care.",
    icon: "🚨",
  },
  {
    title: "Act Quickly",
    description: "Stroke symptoms require prompt medical attention.",
    icon: "⏱️",
  },
  {
    title: "Learn Prevention",
    description: "Understanding risk factors can support healthier choices.",
    icon: "❤️",
  },
];

export default function StrokeAwarenessPage() {
  return (
    <main className="min-h-screen bg-brand-cream text-brand-dark">
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-green/90 via-brand-dark to-black/95" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">
                <span className="h-px w-10 bg-brand-gold" />
                SMTC Health Hub
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Stroke Awareness
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                A stroke can happen suddenly. Knowing the warning signs and
                understanding the importance of urgent medical attention can
                help protect lives.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#warning-signs"
                  className="rounded-full bg-brand-gold px-6 py-3 font-semibold text-brand-dark transition hover:scale-105"
                >
                  Know the Warning Signs
                </a>

                <Link
                  href="/health-hub"
                  className="rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Back to Health Hub
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <Image
                src="/images/stroke-awareness.png"
                alt="Stroke awareness"
                width={800}
                height={1000}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center lg:py-20">
        <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
          Why It Matters
        </span>

        <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
          Every second can matter.
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Stroke occurs when blood flow to part of the brain is interrupted or
          when a blood vessel in the brain bleeds. Because brain cells are
          sensitive to a lack of oxygen, stroke requires urgent medical
          assessment and treatment.
        </p>
      </section>

      {/* WARNING SIGNS */}
      <section
        id="warning-signs"
        className="bg-white px-6 py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
              Recognise Stroke
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Remember: Face. Arms. Speech. Time.
            </h2>

            <p className="mt-5 text-lg leading-8 text-gray-600">
              Stroke symptoms can appear suddenly. One commonly used way of
              remembering important warning signs is FAST.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {warningSigns.map((item, index) => (
              <div
                key={item.title}
                className="rounded-3xl border border-gray-100 bg-brand-cream p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green text-lg font-bold text-white">
                  {index + 1}
                </div>

                <h3 className="mt-6 text-xl font-bold">{item.title}</h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK ACTION */}
      <section className="bg-brand-green px-6 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">
            Emergency Awareness
          </span>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Suspect a stroke?
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/80">
            Do not wait for symptoms to disappear. Seek emergency medical
            assistance immediately and follow the instructions of qualified
            healthcare professionals.
          </p>
        </div>
      </section>

      {/* KEY TOPICS */}
      <section className="px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
              Learn More
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Stroke awareness starts with knowledge.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {topics.map((topic) => (
              <div
                key={topic.title}
                className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100"
              >
                <div className="text-4xl">{topic.icon}</div>

                <h3 className="mt-6 text-xl font-bold">{topic.title}</h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {topic.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STUDENT CTA */}
      <section className="bg-brand-dark px-6 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Interested in learning healthcare professionally?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-white/70">
            Build practical healthcare knowledge and skills at Shifah Medical
            Training College.
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
          This page is intended for general health awareness and education. It
          does not diagnose or treat medical conditions. In an emergency,
          contact appropriate emergency medical services or seek immediate
          assistance from a qualified healthcare professional.
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Shifah Medical Training College. Health
        through Innovation and Research.
      </footer>
    </main>
  );
}