'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

type Notice = {
  id: number;
  image: string;
  status: string;
  statusType: 'live' | 'upcoming' | 'admissions' | 'info';
  title: string;
  description: string;
  date?: string;
  buttonText: string;
  buttonHref: string;
};

const notices: Notice[] = [
  {
    id: 1,
    image: '/images/mental-health-day.png',
    status: 'COMING SOON',
    statusType: 'upcoming',
    title: 'World Mental Health Day 2026',
    description:
      'Mental health is an essential part of overall health. Join SMTC as we create awareness, encourage meaningful conversations and promote a culture of care, understanding and support.',
    date: '10 OCTOBER 2026 • HEALTH AWARENESS',
    buttonText: 'Coming Soon',
    buttonHref: '/health-hub/mental-health',
  },

  {
    id: 2,
    image: '/images/Save_heart.png',
    status: 'CAMPAIGN COMPLETE',
    statusType: 'info',
    title: 'Could You Save a Heart?',
    description:
      'Our World Heart Day campaign explored heart health, cardiac emergencies, CPR, AEDs and the importance of knowing what to do when every second matters.',
    date: 'WORLD HEART DAY • CAMPAIGN ARCHIVE',
    buttonText: 'View Campaign',
    buttonHref: '/world-heart-day',
  },

  {
    id: 3,
    image: '/images/health-hub.png',
    status: 'HEALTH HUB',
    statusType: 'info',
    title: 'Learn. Understand. Make a Difference.',
    description:
      'Explore practical healthcare knowledge, public health awareness, student insights and educational content from Shifah Medical Training College.',
    date: 'SMTC HEALTH & AWARENESS',
    buttonText: 'Explore Health Hub',
    buttonHref: '/health-hub',
  },

  {
    id: 4,
    image: '/images/admissions.png',
    status: 'ADMISSIONS ONGOING',
    statusType: 'admissions',
    title: 'Start Your Healthcare Journey',
    description:
      'Ready to build a career in healthcare? Explore our programmes and discover training opportunities designed to equip you with practical knowledge and professional skills.',
    date: 'SEPTEMBER 2026 INTAKE • SMTC KITale',
    buttonText: 'Explore Courses',
    buttonHref: '/courses',
  },
];

const statusStyles: Record<Notice['statusType'], string> = {
  live: 'bg-brand-gold text-brand-dark',
  upcoming: 'bg-white/10 text-white',
  admissions: 'bg-brand-green text-white',
  info: 'bg-white/10 text-white',
};

export function AdmissionsCountdown() {
  const [activeNotice, setActiveNotice] = useState(0);

  const notice = notices[activeNotice];

  const nextNotice = () => {
    setActiveNotice((current) =>
      current === notices.length - 1 ? 0 : current + 1
    );
  };

  const previousNotice = () => {
    setActiveNotice((current) =>
      current === 0 ? notices.length - 1 : current - 1
    );
  };

  return (
    <div
      className="
        relative
        w-full
        max-w-[420px]
        overflow-hidden
        rounded-[2rem]
        border
        border-white/15
        bg-brand-dark/95
        shadow-[0_25px_80px_rgba(0,0,0,0.45)]
        backdrop-blur-xl
      "
    >
      {/* ================= DECORATIVE GLOW ================= */}

      <div
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          h-52
          w-52
          rounded-full
          bg-brand-green/20
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-20
          -left-20
          h-52
          w-52
          rounded-full
          bg-brand-gold/10
          blur-3xl
        "
      />

      {/* ================= TOP ACCENT ================= */}

      <div
        className="
          absolute
          left-0
          right-0
          top-0
          h-1
          bg-gradient-to-r
          from-brand-green
          via-brand-gold
          to-brand-green
        "
      />

      {/* ================= CONTENT ================= */}

      <div className="relative p-5 md:p-6">

        {/* ================= NOTICE BOARD HEADER ================= */}

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-2">

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

            <p
              className="
                text-[10px]
                font-extrabold
                uppercase
                tracking-[0.25em]
                text-brand-gold
              "
            >
              SMTC Health & Notice Board
            </p>

          </div>

          {/* NOTICE COUNT */}

          {notices.length > 1 && (
            <span
              className="
                rounded-full
                border
                border-white/10
                bg-white/5
                px-2.5
                py-1
                text-[9px]
                font-bold
                text-white/50
              "
            >
              {activeNotice + 1} / {notices.length}
            </span>
          )}

        </div>

        {/* ================= POSTER ================= */}

        <div
          className="
            relative
            mt-5
            aspect-[4/5]
            w-full
            overflow-hidden
            rounded-2xl
            border
            border-white/10
            bg-white/5
          "
        >

          <Image
            src={notice.image}
            alt={notice.title}
            fill
            priority={activeNotice === 0}
            className="
              object-contain
              transition-transform
              duration-500
            "
            sizes="(max-width: 768px) 100vw, 420px"
          />

          {/* IMAGE OVERLAY */}

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-t
              from-black/50
              via-transparent
              to-black/10
            "
          />

          {/* STATUS */}

          <div
            className={`
              absolute
              left-4
              top-4
              rounded-full
              px-3
              py-1.5
              text-[9px]
              font-black
              tracking-[0.15em]
              shadow-lg
              ${statusStyles[notice.statusType]}
            `}
          >
            {notice.status}
          </div>

        </div>

        {/* ================= NOTICE INFORMATION ================= */}

        <div className="mt-5">

          {/* DATE / CATEGORY */}

          {notice.date && (
            <p
              className="
                text-[9px]
                font-extrabold
                uppercase
                tracking-[0.2em]
                text-brand-gold
              "
            >
              {notice.date}
            </p>
          )}

          {/* TITLE */}

          <h3
            className="
              mt-2
              text-2xl
              font-black
              leading-[1.1]
              tracking-tight
              text-white
              md:text-[27px]
            "
          >
            {notice.title}
          </h3>

          {/* DESCRIPTION */}

          <p
            className="
              mt-3
              text-sm
              leading-6
              text-white/60
            "
          >
            {notice.description}
          </p>

        </div>

        {/* ================= DIVIDER ================= */}

        <div className="my-5 h-px bg-white/10" />

        {/* ================= ACTION ROW ================= */}

        <div className="flex items-center gap-2">

          {/* MAIN CTA */}

          <Link
            href={notice.buttonHref}
            className="
              flex
              flex-1
              items-center
              justify-center
              gap-2
              rounded-full
              bg-brand-green
              px-5
              py-3.5
              text-sm
              font-bold
              text-white
              shadow-lg
              shadow-brand-green/20
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:bg-brand-gold
              hover:text-brand-dark
            "
          >
            {notice.buttonText}

            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>

          </Link>

          {/* NAVIGATION */}

          {notices.length > 1 && (
            <div className="flex gap-2">

              <button
                type="button"
                onClick={previousNotice}
                aria-label="Previous notice"
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/10
                  bg-white/5
                  text-white/70
                  transition
                  hover:bg-white/10
                  hover:text-white
                "
              >
                ←
              </button>

              <button
                type="button"
                onClick={nextNotice}
                aria-label="Next notice"
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/10
                  bg-white/5
                  text-white/70
                  transition
                  hover:bg-white/10
                  hover:text-white
                "
              >
                →
              </button>

            </div>
          )}

        </div>

        {/* ================= FOOTER ================= */}

        <p
          className="
            mt-4
            text-center
            text-[9px]
            font-medium
            leading-5
            text-white/35
          "
        >
          Shifah Medical Training College •
          Health through Innovation and Research
        </p>

      </div>
    </div>
  );
}

