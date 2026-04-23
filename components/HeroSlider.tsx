'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { site } from '@/data/site';

const stats = [
  { label: 'Programmes', value: '3+' },
  { label: 'Location', value: 'Kitale, Kenya' },
  { label: 'Entry Grade', value: 'KCSE D-' },
  { label: 'Intake', value: '2026 Open' },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((c) => (c + 1) % site.heroSlides.length);
        setVisible(true);
      }, 400);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const slide = site.heroSlides[index];

  return (
    <section className="relative overflow-hidden bg-brand-dark min-h-[88svh] flex flex-col">

      {/* Background image */}
      <img
        key={slide.image}
        src={slide.image}
        alt={slide.title}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Decorative vertical green line */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />

      {/* Main content */}
      <div className="container-shell relative z-10 flex flex-1 items-center py-24">
        <div
          className="max-w-2xl text-white transition-all duration-500"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}
        >
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-green" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-gold">
              {site.intake}
            </span>
          </div>

          {/* Heading */}
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            {slide.title}
          </h1>

          {/* Accent line */}
          <div className="mt-4 h-1 w-16 rounded-full bg-brand-gold" />

          {/* Body */}
          <p className="mt-5 max-w-xl text-base leading-7 text-white/80 md:text-lg">
            {slide.text}
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/apply"
              className="rounded-full bg-brand-green px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-green/30 transition hover:bg-brand-dark hover:shadow-brand-green/10"
            >
              Apply Now →
            </Link>
            <Link
              href="/courses"
              className="rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Explore Courses
            </Link>
          </div>

          {/* Slide dots */}
          <div className="mt-10 flex items-center gap-2">
            {site.heroSlides.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => { setVisible(false); setTimeout(() => { setIndex(i); setVisible(true); }, 400); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-brand-gold' : 'w-1.5 bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="container-shell grid grid-cols-2 divide-x divide-white/10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="px-6 py-4 text-center">
              <p className="text-lg font-bold text-brand-gold">{s.value}</p>
              <p className="text-xs text-white/60 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
