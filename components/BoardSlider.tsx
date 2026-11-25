
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Pause,
  Play,
  ShieldCheck,
} from 'lucide-react';

/* =========================================================
   BOARD MEMBERS
========================================================= */

const boardMembers = [
  {
    name: 'Musah Kanenje',
    title: 'Board Chair',
    image: '/images/musa.png',
    number: '01',
  },
  {
    name: 'Zaitun Kanenje',
    title: 'Operations & Human Resource',
    image: '/images/director.png',
    number: '02',
  },
  {
    name: 'Ramadhan Kanenje',
    title: 'Partnership & Stakeholder Engagements',
    image: '/images/rama.png',
    number: '03',
  },
  {
    name: 'Jactone A. Ocharo',
    title: 'Secretary to the Board',
    image: '/images/jack.png',
    number: '04',
  },
];

const SLIDE_DURATION = 5000;

/* =========================================================
   BOARD SLIDER
========================================================= */

export function BoardSlider() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);

  const member = boardMembers[current];

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const previous = useCallback(() => {
    setCurrent((prev) =>
      (prev - 1 + boardMembers.length) % boardMembers.length
    );
  }, []);

  const next = useCallback(() => {
    setCurrent((prev) =>
      (prev + 1) % boardMembers.length
    );
  }, []);

  const goToSlide = (index: number) => {
    setCurrent(index);
  };

  /* =======================================================
     AUTOMATIC SLIDER
  ======================================================= */

  useEffect(() => {
    if (isPaused || isManuallyPaused) return;

    const interval = window.setInterval(() => {
      setCurrent((prev) =>
        (prev + 1) % boardMembers.length
      );
    }, SLIDE_DURATION);

    return () => window.clearInterval(interval);
  }, [isPaused, isManuallyPaused]);

  /* =======================================================
     KEYBOARD NAVIGATION
  ======================================================= */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    if (event.key === 'ArrowLeft') {
      previous();
    }

    if (event.key === 'ArrowRight') {
      next();
    }
  };

  return (
    <section
      className="relative overflow-hidden bg-[#f8faf8] py-20 sm:py-24 lg:py-28"
      aria-label="Board of Directors"
    >

      {/* =====================================================
          BACKGROUND DECORATION
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand-green/[0.045] blur-3xl" />

        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-brand-gold/[0.08] blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(#0f4f3f 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

        {/* ===================================================
            SECTION HEADER
        ==================================================== */}

        <div className="mx-auto mb-14 max-w-3xl text-center lg:mb-16">

          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-brand-green/10 bg-white px-5 py-2 shadow-sm">

            <ShieldCheck
              size={15}
              className="text-brand-green"
            />

            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green sm:text-xs">
              Institutional Leadership
            </span>

          </div>

          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark sm:text-4xl md:text-5xl lg:text-[52px]">

            Leadership Behind

            <span className="block text-brand-green">
              Our Vision
            </span>

          </h2>

          <div className="mx-auto mt-6 flex items-center justify-center gap-2">

            <span className="h-[2px] w-10 rounded-full bg-brand-gold" />

            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />

            <span className="h-[2px] w-10 rounded-full bg-brand-gold" />

          </div>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            Meet the distinguished members of the Board of Directors
            providing strategic leadership, institutional governance
            and direction for Shifah Medical Training College.
          </p>

        </div>

        {/* ===================================================
            MAIN SLIDER
        ==================================================== */}

        <div
          className="relative mx-auto max-w-6xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPaused(false);
            }
          }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="Board members"
        >

          {/* SLIDER CARD */}

          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-brand-dark/[0.06] sm:rounded-3xl">

            {/* TOP ACCENT */}

            <div className="absolute left-0 right-0 top-0 z-20 flex h-1">

              <div className="w-2/3 bg-brand-green" />

              <div className="w-1/3 bg-brand-gold" />

            </div>

            {/* SLIDES */}

            <div className="overflow-hidden">

              <div
                className="flex transition-transform duration-700 ease-in-out motion-reduce:transition-none"
                style={{
                  transform: `translateX(-${current * 100}%)`,
                }}
              >

                {boardMembers.map((item, index) => (

                  <div
                    key={item.name}
                    className="w-full min-w-full"
                    aria-hidden={current !== index}
                  >

                    <div className="grid items-center lg:grid-cols-2">

                      {/* =====================================
                          PORTRAIT
                      ====================================== */}

                      <div className="relative flex min-h-[350px] items-center justify-center overflow-hidden bg-[#eef3ef] sm:min-h-[450px] lg:min-h-[540px]">

                        {/* Decorative circles */}

                        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full border border-brand-green/10" />

                        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full border border-brand-gold/20" />

                        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 blur-3xl" />

                        {/* Portrait */}

                        <div className="relative z-10 h-[330px] w-full max-w-[430px] sm:h-[430px] lg:h-[500px]">

                          <Image
                            src={item.image}
                            alt={`${item.name}, ${item.title}`}
                            fill
                            priority={index === 0}
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-contain object-bottom transition-transform duration-700 hover:scale-[1.025]"
                          />

                        </div>

                        {/* Portrait label */}

                        <div className="absolute bottom-5 left-5 z-20 rounded-lg border border-white/60 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-md lg:bottom-7 lg:left-7">

                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-green">
                            Board Member
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-brand-dark">
                            Shifah Medical Training College
                          </p>

                        </div>

                      </div>

                      {/* =====================================
                          MEMBER INFORMATION
                      ====================================== */}

                      <div className="relative flex min-h-[350px] flex-col justify-center px-7 py-12 sm:px-12 sm:py-14 lg:min-h-[540px] lg:px-16 xl:px-20">

                        {/* Background number */}

                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-8 top-5 select-none text-8xl font-black text-brand-green/[0.045] sm:text-9xl"
                        >
                          {item.number}
                        </span>

                        <div className="relative z-10">

                          {/* Category */}

                          <div className="flex items-center gap-3">

                            <span className="h-1 w-9 rounded-full bg-brand-gold" />

                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-green sm:text-xs">
                              Board of Directors
                            </p>

                          </div>

                          {/* Name */}

                          <h3 className="mt-7 max-w-lg text-3xl font-extrabold leading-tight tracking-tight text-brand-dark sm:text-4xl lg:text-[42px]">
                            {item.name}
                          </h3>

                          {/* Role */}

                          <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-xl border border-brand-green/10 bg-brand-green/[0.045] px-4 py-3">

                            <div className="h-9 w-1 shrink-0 rounded-full bg-brand-gold" />

                            <p className="text-sm font-bold leading-relaxed text-brand-green sm:text-base">
                              {item.title}
                            </p>

                          </div>

                          {/* Institution */}

                          <div className="mt-10 border-t border-gray-100 pt-7">

                            <div className="flex items-center gap-3">

                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">

                                <Building2 size={21} />

                              </div>

                              <div>

                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                  Institution
                                </p>

                                <p className="mt-1 text-xs font-bold text-brand-dark sm:text-sm">
                                  Shifah Medical Training College
                                </p>

                              </div>

                            </div>

                          </div>

                          {/* Member counter */}

                          <div className="mt-8 flex items-center justify-between">

                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                              Leadership & Governance
                            </p>

                            <p className="text-xs font-bold tabular-nums text-brand-green">
                              {item.number}
                              <span className="mx-1 text-gray-300">/</span>
                              04
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

          {/* =================================================
              PREVIOUS BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={previous}
            aria-label="Previous board member"
            className="
              absolute left-2 top-1/2 z-30
              flex h-10 w-10 -translate-y-1/2
              items-center justify-center rounded-full
              border border-gray-200 bg-white text-brand-green
              shadow-lg transition-all duration-300
              hover:scale-110 hover:border-brand-green
              hover:bg-brand-green hover:text-white
              sm:-left-5 sm:h-12 sm:w-12
            "
          >
            <ArrowLeft size={19} />
          </button>

          {/* =================================================
              NEXT BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={next}
            aria-label="Next board member"
            className="
              absolute right-2 top-1/2 z-30
              flex h-10 w-10 -translate-y-1/2
              items-center justify-center rounded-full
              border border-gray-200 bg-white text-brand-green
              shadow-lg transition-all duration-300
              hover:scale-110 hover:border-brand-green
              hover:bg-brand-green hover:text-white
              sm:-right-5 sm:h-12 sm:w-12
            "
          >
            <ArrowRight size={19} />
          </button>

        </div>

        {/* ===================================================
            MEMBER NAVIGATION
        ==================================================== */}

        <div className="mx-auto mt-9 flex max-w-4xl flex-wrap items-center justify-center gap-2 sm:gap-3">

          {boardMembers.map((item, index) => (

            <button
              key={item.name}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`View ${item.name}`}
              aria-pressed={current === index}
              className={`
                flex items-center gap-2 rounded-full
                border px-3 py-2.5 text-xs font-semibold
                transition-all duration-300 sm:px-4
                ${
                  current === index
                    ? 'border-brand-green bg-brand-green text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-brand-green/40 hover:text-brand-green'
                }
              `}
            >

              <span
                className={`
                  h-2 w-2 rounded-full
                  ${
                    current === index
                      ? 'bg-brand-gold'
                      : 'bg-gray-300'
                  }
                `}
              />

              <span className="hidden sm:inline">
                {item.name}
              </span>

              <span className="sm:hidden">
                {item.number}
              </span>

            </button>

          ))}

        </div>

        {/* ===================================================
            PLAY / PAUSE CONTROL
        ==================================================== */}

        <div className="mt-6 flex items-center justify-center">

          <button
            type="button"
            onClick={() => setIsManuallyPaused((prev) => !prev)}
            aria-label={isManuallyPaused ? 'Resume automatic slides' : 'Pause automatic slides'}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-gray-500 transition hover:bg-white hover:text-brand-green"
          >

            {isManuallyPaused ? (
              <>
                <Play size={14} />
                Resume slideshow
              </>
            ) : (
              <>
                <Pause size={14} />
                Pause slideshow
              </>
            )}

          </button>

        </div>

      </div>

    </section>
  );
}
