'use client';

import {
  Menu,
  UserRound,
} from 'lucide-react';

type ParentHeaderProps = {
  parentName: string;
  parentInitial: string;
  onOpenMenu: () => void;
};

export default function ParentHeader({
  parentName,
  parentInitial,
  onOpenMenu,
}: ParentHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">

      <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">

        <div className="flex min-w-0 items-center gap-3">

          {/* =================================================
              MOBILE MENU
          ================================================== */}

          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-brand-dark transition hover:bg-slate-50 lg:hidden"
            aria-label="Open parent menu"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0">

            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-green">
              Parent Portal
            </p>

            <h1 className="mt-1 truncate text-xl font-bold text-brand-dark sm:text-2xl">
              Welcome Back
              {parentName
                ? `, ${parentName}`
                : ''}
            </h1>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              Monitor your child&apos;s progress
              and college information.
            </p>

          </div>

        </div>

        {/* =================================================
            PROFILE
        ================================================== */}

        <div className="flex shrink-0 items-center gap-3">

          <div className="hidden text-right sm:block">

            <p className="text-sm font-bold text-brand-dark">
              {parentName}
            </p>

            <p className="text-xs text-slate-400">
              Parent Account
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
            {parentInitial}
          </div>

        </div>

      </div>

    </header>
  );
}