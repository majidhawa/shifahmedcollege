'use client';

import { site } from '@/data/site';

export function PartnersMarquee() {
  const row1 = [...site.partners, ...site.partners];
  const row2 = [...site.partners].reverse().concat([...site.partners].reverse());

  return (
    <div className="relative overflow-hidden py-4">
      {/* fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white/80 to-transparent" />

      {/* Row 1 — scrolls left */}
      <div className="flex gap-4 mb-4" style={{ animation: 'scrollLeft 30s linear infinite' }}>
        {row1.map((partner, i) => (
          <div
            key={`r1-${i}`}
            className="group flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-green/10 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brand-green/30 hover:shadow-md hover:-translate-y-0.5"
            style={{ minWidth: '140px' }}
          >
            <div className="flex h-12 w-full items-center justify-center overflow-hidden">
              <img
                src={partner.image}
                alt={partner.name}
                className="max-h-10 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-brand-green transition-colors duration-300 text-center">
              {partner.name}
            </p>
          </div>
        ))}
      </div>

      {/* Row 2 — scrolls right */}
      <div className="flex gap-4" style={{ animation: 'scrollRight 35s linear infinite' }}>
        {row2.map((partner, i) => (
          <div
            key={`r2-${i}`}
            className="group flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-brand-green/10 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brand-green/30 hover:shadow-md hover:-translate-y-0.5"
            style={{ minWidth: '140px' }}
          >
            <div className="flex h-12 w-full items-center justify-center overflow-hidden">
              <img
                src={partner.image}
                alt={partner.name}
                className="max-h-10 w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-brand-green transition-colors duration-300 text-center">
              {partner.name}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scrollLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
