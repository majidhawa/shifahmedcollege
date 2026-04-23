'use client';

import { useState } from 'react';
import { site } from '@/data/site';

export function MarqueeBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative z-50 bg-gradient-to-r from-brand-dark via-brand-green to-brand-dark overflow-hidden">
      {/* subtle shimmer line */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(215,169,59,0.08)_50%,transparent_100%)]" />

      <div className="container-shell relative flex items-center justify-between gap-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {/* NEW badge */}
          <span className="shrink-0 rounded-full bg-brand-gold px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-brand-dark">
            New
          </span>
          {/* message */}
          <p className="truncate text-sm font-medium text-white">
            <span className="font-bold text-white">{site.intake}</span>
            <span className="mx-2 text-white/40">—</span>
            <span className="text-white/75">Applications are now open. Secure your spot today.</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <a
            href="/apply"
            className="rounded-full border border-brand-gold/60 bg-brand-gold/10 px-4 py-1.5 text-xs font-bold text-brand-gold transition-all duration-200 hover:bg-brand-gold hover:text-brand-dark"
          >
            Apply Now →
          </a>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
