'use client';

import { useState } from 'react';

import ParentHeader from '@/components/parent/ParentHeader';
import ParentSidebar from '@/components/parent/ParentSidebar';

type ParentDashboardShellProps = {
  children: React.ReactNode;
  parentName: string;
  studentName: string;
  applicationNumber: string;
  parentInitial: string;
  studentInitial: string;
};

export default function ParentDashboardShell({
  children,
  parentName,
  studentName,
  applicationNumber,
  parentInitial,
  studentInitial,
}: ParentDashboardShellProps) {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-brand-cream">

      {/* =====================================================
          TOP BRAND BAR
      ====================================================== */}

      <div className="h-1.5 w-full bg-brand-gold" />

      <div className="flex min-h-[calc(100vh-6px)]">

        <ParentSidebar
          parentName={parentName}
          studentName={studentName}
          applicationNumber={applicationNumber}
          parentInitial={parentInitial}
          studentInitial={studentInitial}
          mobileOpen={mobileOpen}
          onCloseMobile={() =>
            setMobileOpen(false)
          }
        />

        <section className="min-w-0 flex-1">

          <ParentHeader
            parentName={parentName}
            parentInitial={parentInitial}
            onOpenMenu={() =>
              setMobileOpen(true)
            }
          />

          <main className="min-w-0">
            {children}
          </main>

        </section>

      </div>

    </div>
  );
}