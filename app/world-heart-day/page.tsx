import Image from 'next/image';
import Link from 'next/link';
import HeartEmergencyQuiz from './HeartEmergencyQuiz';

export default function WorldHeartDayPage() {
  return (
    <main className="min-h-screen bg-brand-dark text-white">

      {/* ========================================================= */}
      {/* HERO */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden">

        {/* Background glows */}

        <div
          className="
            pointer-events-none
            absolute
            -right-40
            -top-40
            h-96
            w-96
            rounded-full
            bg-brand-green/20
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-40
            -left-40
            h-96
            w-96
            rounded-full
            bg-brand-gold/10
            blur-3xl
          "
        />

        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-20">

          <div className="grid items-center gap-12 lg:grid-cols-2">

            {/* HERO TEXT */}

            <div>

              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-brand-gold/20
                  bg-brand-gold/10
                  px-4
                  py-2
                "
              >
                <span className="relative flex h-2.5 w-2.5">

                  <span
                    className="
                      absolute
                      inline-flex
                      h-full
                      w-full
                      animate-ping
                      rounded-full
                      bg-brand-gold
                      opacity-60
                    "
                  />

                  <span
                    className="
                      relative
                      inline-flex
                      h-2.5
                      w-2.5
                      rounded-full
                      bg-brand-gold
                    "
                  />

                </span>

                <span
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.2em]
                    text-brand-gold
                  "
                >
                  World Heart Day Campaign
                </span>

              </div>

              <h1
                className="
                  mt-6
                  text-5xl
                  font-black
                  leading-[0.95]
                  tracking-tight
                  sm:text-6xl
                  lg:text-7xl
                "
              >
                Could You
                <span className="block text-brand-gold">
                  Save a Heart?
                </span>
              </h1>

              <p
                className="
                  mt-6
                  max-w-xl
                  text-lg
                  leading-8
                  text-white/65
                "
              >
                A heart can stop without warning. Knowing what to do
                in those critical moments can make a difference.
              </p>

              <p
                className="
                  mt-4
                  max-w-xl
                  text-sm
                  leading-7
                  text-white/45
                "
              >
                Shifah Medical Training College is using World Heart Day
                to promote awareness, emergency preparedness and the
                importance of practical healthcare skills.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                <a
                  href="#learn"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    bg-brand-green
                    px-6
                    py-3.5
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-brand-green/20
                    transition
                    hover:-translate-y-0.5
                    hover:bg-brand-gold
                    hover:text-brand-dark
                  "
                >
                  Learn How to Respond

                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>

                </a>

                <Link
                  href="/apply"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/15
                    bg-white/5
                    px-6
                    py-3.5
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-white/10
                  "
                >
                  Explore Healthcare Training
                </Link>

              </div>

            </div>

            {/* HERO POSTER */}

            <div className="relative mx-auto w-full max-w-[520px]">

              <div
                className="
                  absolute
                  -inset-4
                  rounded-[2rem]
                  bg-brand-green/10
                  blur-2xl
                "
              />

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-[2rem]
                  border
                  border-white/10
                  bg-white/5
                  p-2
                  shadow-[0_30px_100px_rgba(0,0,0,0.45)]
                "
              >

                <Image
                  src="/images/world-heart-day.jpg"
                  alt="World Heart Day: Could You Save a Heart? campaign"
                  width={1080}
                  height={1350}
                  priority
                  className="h-auto w-full rounded-[1.5rem] object-contain"
                />

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* CAMPAIGN INTRO */}
      {/* ========================================================= */}

      <section
        id="learn"
        className="border-y border-white/10 bg-white/[0.02]"
      >

        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">

          <div className="max-w-3xl">

            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.25em]
                text-brand-gold
              "
            >
              The Question
            </p>

            <h2
              className="
                mt-3
                text-3xl
                font-black
                tracking-tight
                sm:text-4xl
              "
            >
              If someone collapsed in front of you,
              would you know what to do?
            </h2>

            <p
              className="
                mt-5
                text-base
                leading-8
                text-white/55
              "
            >
              Emergencies do not always happen inside hospitals.
              They can happen at home, at work, in school, on the
              road or in public spaces. The first few moments can
              be critical.
            </p>

            <p
              className="
                mt-4
                text-base
                leading-8
                text-white/55
              "
            >
              This campaign encourages communities to become more
              aware of heart health and more prepared to respond
              appropriately during emergencies.
            </p>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* THREE ACTIONS */}
      {/* ========================================================= */}

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">

        <div className="text-center">

          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.25em]
              text-brand-gold
            "
          >
            Start Here
          </p>

          <h2
            className="
              mt-3
              text-3xl
              font-black
              tracking-tight
              sm:text-4xl
            "
          >
            Know. Respond. Act.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/50">
            Small amounts of knowledge can help people respond more
            appropriately while professional emergency help is sought.
          </p>

        </div>


        <div className="mt-10 grid gap-5 md:grid-cols-3">

          {/* CARD 1 */}

          <div
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/[0.04]
              p-7
              transition
              hover:-translate-y-1
              hover:bg-white/[0.06]
            "
          >

            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-brand-green/15
                text-xl
              "
            >
              ❤️
            </div>

            <h3 className="mt-5 text-xl font-black">
              Know Your Heart
            </h3>

            <p className="mt-3 text-sm leading-7 text-white/50">
              Learn why cardiovascular health matters and why
              recognizing warning signs should never be ignored.
            </p>

          </div>


          {/* CARD 2 */}

          <div
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/[0.04]
              p-7
              transition
              hover:-translate-y-1
              hover:bg-white/[0.06]
            "
          >

            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-brand-gold/15
                text-xl
              "
            >
              🚑
            </div>

            <h3 className="mt-5 text-xl font-black">
              Know How to Respond
            </h3>

            <p className="mt-3 text-sm leading-7 text-white/50">
              Understanding basic emergency response can help you
              remain calm and take appropriate action while help
              is on the way.
            </p>

          </div>


          {/* CARD 3 */}

          <div
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/[0.04]
              p-7
              transition
              hover:-translate-y-1
              hover:bg-white/[0.06]
            "
          >

            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-brand-green/15
                text-xl
              "
            >
              🫀
            </div>

            <h3 className="mt-5 text-xl font-black">
              Take Action
            </h3>

            <p className="mt-3 text-sm leading-7 text-white/50">
              Share reliable information, encourage emergency
              preparedness and help build communities that know
              how to respond.
            </p>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
{/* EMERGENCY QUIZ */}
{/* ========================================================= */}

<section className="border-t border-white/10 bg-white/[0.02]">
  <HeartEmergencyQuiz />
</section>
      <section className="bg-brand-green">

        <div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-6">

          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.3em]
              text-white/60
            "
          >
            Think About It
          </p>

          <h2
            className="
              mt-4
              text-3xl
              font-black
              leading-tight
              sm:text-5xl
            "
          >
            Someone collapses.
            <br />
            What would you do first?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/70">
            Emergency situations can be frightening. Learning
            appropriate first-response principles is one way to
            become better prepared.
          </p>

          <Link
            href="/courses/emt"
            className="
              mt-8
              inline-flex
              items-center
              justify-center
              rounded-full
              bg-white
              px-7
              py-3.5
              text-sm
              font-black
              text-brand-dark
              transition
              hover:-translate-y-0.5
              hover:bg-brand-gold
            "
          >
            Discover EMT Training
          </Link>

        </div>

      </section>


      {/* ========================================================= */}
      {/* SMTC CONNECTION */}
      {/* ========================================================= */}

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">

        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">

          <div>

            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.25em]
                text-brand-gold
              "
            >
              Healthcare Starts With Skills
            </p>

            <h2
              className="
                mt-3
                max-w-3xl
                text-3xl
                font-black
                tracking-tight
                sm:text-4xl
              "
            >
              Turn your interest in healthcare
              into practical skills.
            </h2>

            <p
              className="
                mt-5
                max-w-2xl
                text-sm
                leading-7
                text-white/50
              "
            >
              At Shifah Medical Training College, students develop
              practical healthcare knowledge and skills through
              focused training programmes designed to prepare them
              for service in the healthcare environment.
            </p>

          </div>

          <Link
            href="/apply"
            className="
              inline-flex
              items-center
              justify-center
              rounded-full
              bg-brand-gold
              px-7
              py-4
              text-sm
              font-black
              text-brand-dark
              transition
              hover:-translate-y-0.5
              hover:bg-white
            "
          >
            Explore Admissions
          </Link>

        </div>


        {/* PROGRAMMES */}

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {[
            'Emergency Medical Technology',
            'Diploma in Paramedicine',
            'Dialysis Technology',
            'Safe Phlebotomy',
            'Caregiving',
            'German Language',
          ].map((program) => (
            <div
              key={program}
              className="
                rounded-2xl
                border
                border-white/10
                bg-white/[0.03]
                px-5
                py-4
                text-sm
                font-semibold
                text-white/70
              "
            >
              {program}
            </div>
          ))}

        </div>

      </section>


      {/* ========================================================= */}
      {/* SHARE CAMPAIGN */}
      {/* ========================================================= */}

      <section className="border-t border-white/10 bg-white/[0.02]">

        <div className="mx-auto max-w-4xl px-5 py-14 text-center sm:px-6">

          <div className="text-4xl">
            ❤️
          </div>

          <h2 className="mt-4 text-3xl font-black">
            Could You Save a Heart?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/50">
            Share this campaign with someone who should know
            what to do when an emergency happens.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">

            <Link
              href="/"
              className="
                rounded-full
                border
                border-white/10
                bg-white/5
                px-6
                py-3
                text-sm
                font-bold
                text-white
                transition
                hover:bg-white/10
              "
            >
              Back to SMTC
            </Link>

            <Link
              href="/apply"
              className="
                rounded-full
                bg-brand-green
                px-6
                py-3
                text-sm
                font-bold
                text-white
                transition
                hover:bg-brand-gold
                hover:text-brand-dark
              "
            >
              Apply to SMTC
            </Link>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}

      <footer className="border-t border-white/10">

        <div className="mx-auto max-w-7xl px-5 py-8 text-center sm:px-6">

          <p className="text-xs font-semibold text-white/40">
            Shifah Medical Training College
          </p>

          <p className="mt-1 text-[10px] text-white/25">
            Health through Innovation and Research
          </p>

        </div>

      </footer>

    </main>
  );
}
