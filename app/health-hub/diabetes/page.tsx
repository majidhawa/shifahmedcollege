import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diabetes Awareness | SMTC Health Hub",
  description:
    "Learn about diabetes, common signs, risk factors, healthy habits and the importance of professional healthcare support.",
};

const signs = [
  {
    title: "Increased Thirst",
    description:
      "Feeling unusually thirsty can be one of the symptoms associated with high blood glucose.",
    icon: "💧",
  },
  {
    title: "Frequent Urination",
    description:
      "Needing to urinate more frequently can occur when blood glucose levels are elevated.",
    icon: "🚻",
  },
  {
    title: "Unusual Tiredness",
    description:
      "Persistent or unusual fatigue can occur among people with diabetes.",
    icon: "😴",
  },
  {
    title: "Changes in Vision",
    description:
      "Changes or blurred vision may occur and should be discussed with a healthcare professional.",
    icon: "👁️",
  },
];

const habits = [
  "Choose a balanced variety of foods.",
  "Stay physically active according to your ability.",
  "Maintain a healthy weight where appropriate.",
  "Avoid tobacco use.",
  "Attend recommended health checks.",
  "Follow professional medical advice when diagnosed.",
];

export default function DiabetesAwarenessPage() {
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

              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Diabetes Awareness
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                Understanding diabetes can help individuals recognise possible
                warning signs, understand risk factors and make informed
                decisions about their health.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#learn"
                  className="rounded-full bg-brand-gold px-6 py-3 font-semibold text-brand-dark transition hover:scale-105"
                >
                  Learn More
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
                src="/images/diabetes-awareness.png"
                alt="Diabetes awareness"
                width={800}
                height={1000}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section id="learn" className="px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
            Understanding Diabetes
          </span>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            What is diabetes?
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Diabetes is a chronic condition in which blood glucose levels are
            too high because the body does not produce enough insulin, does not
            use insulin effectively, or both. Different types of diabetes
            exist, and appropriate diagnosis and management should involve
            qualified healthcare professionals.
          </p>
        </div>
      </section>

      {/* SIGNS */}
      <section className="bg-white px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">
              Know Your Health
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Possible signs to know
            </h2>

            <p className="mt-5 text-lg leading-8 text-gray-600">
              Some people may have few or no noticeable symptoms, especially
              in the early stages. These are examples of symptoms that can be
              associated with diabetes.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {signs.map((sign) => (
              <div
                key={sign.title}
                className="rounded-3xl border border-gray-100 bg-brand-cream p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-4xl">{sign.icon}</div>

                <h3 className="mt-6 text-xl font-bold">{sign.title}</h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {sign.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HEALTHY HABITS */}
      <section className="bg-brand-green px-6 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">
                Healthy Living
              </span>

              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Small habits can support better health.
              </h2>

              <p className="mt-5 text-lg leading-8 text-white/80">
                Healthy lifestyle choices can contribute to reducing the risk
                of type 2 diabetes and supporting overall wellbeing. Individual
                needs differ, so professional guidance is important.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-8 backdrop-blur-sm">
              <ul className="space-y-4">
                {habits.map((habit) => (
                  <li key={habit} className="flex gap-3">
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

      {/* HEALTHCARE PROFESSIONAL */}
      <section className="px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100 sm:p-12">
          <div className="text-4xl">🩺</div>

          <h2 className="mt-5 text-3xl font-bold">
            Knowledge is part of prevention.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-gray-600">
            Regular health checks and professional medical advice can help
            people understand their health status and identify concerns that
            may require further assessment.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-dark px-6 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Learn healthcare. Make a difference.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-white/70">
            Explore healthcare training opportunities at Shifah Medical
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
          This page provides general health awareness and is not a substitute
          for diagnosis, treatment or individual medical advice. If you have
          concerning symptoms or questions about diabetes, consult a qualified
          healthcare professional.
        </div>
      </section>

      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Shifah Medical Training College. Health
        through Innovation and Research.
      </footer>
    </main>
  );
}