'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  LayoutDashboard,
  UserRound,
  CreditCard,
  FileText,
  Phone,
  LogOut,
  BookOpen,
  Users,
  X,
  CalendarCheck,
  CalendarDays,
  Bell,
  Megaphone,
} from 'lucide-react';

type ParentSidebarProps = {
  parentName: string;
  studentName: string;
  applicationNumber: string;
  parentInitial: string;
  studentInitial: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

type SidebarItemProps = {
  href: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
};

export default function ParentSidebar({
  parentName,
  studentName,
  applicationNumber,
  parentInitial,
  studentInitial,
  mobileOpen,
  onCloseMobile,
}: ParentSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside className="hidden w-72 shrink-0 flex-col bg-brand-dark text-white lg:flex">

        <SidebarBrand />

        <SidebarProfile
          parentName={parentName}
          parentInitial={parentInitial}
        />

        <LinkedStudent
          studentName={studentName}
          applicationNumber={applicationNumber}
          studentInitial={studentInitial}
        />

        <SidebarNavigation
          pathname={pathname}
          onNavigate={undefined}
        />

        <SidebarLogout />

      </aside>

      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* =====================================================
          MOBILE SIDEBAR
      ====================================================== */}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col bg-brand-dark text-white shadow-2xl transition-transform duration-300 lg:hidden',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full',
        ].join(' ')}
      >

        <div className="flex items-center justify-between border-b border-white/10">

          <div className="flex-1">
            <SidebarBrand />
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="mr-4 rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close parent menu"
          >
            <X size={22} />
          </button>

        </div>

        <SidebarProfile
          parentName={parentName}
          parentInitial={parentInitial}
        />

        <LinkedStudent
          studentName={studentName}
          applicationNumber={applicationNumber}
          studentInitial={studentInitial}
        />

        <SidebarNavigation
          pathname={pathname}
          onNavigate={onCloseMobile}
        />

        <SidebarLogout />

      </aside>
    </>
  );
}

/* =========================================================
   BRAND
========================================================= */

function SidebarBrand() {
  return (
    <div className="border-b border-white/10 p-6">

      <div className="flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1">

          <img
            src="/images/logo.jpg"
            alt="Shifah Medical Training College"
            className="h-full w-full object-contain"
          />

        </div>

        <div>

          <p className="text-sm font-bold">
            SMTC
          </p>

          <p className="text-[10px] text-white/50">
            Parent Portal
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   PARENT PROFILE
========================================================= */

function SidebarProfile({
  parentName,
  parentInitial,
}: {
  parentName: string;
  parentInitial: string;
}) {
  return (
    <div className="border-b border-white/10 p-5">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold ring-2 ring-brand-gold/60">
          {parentInitial}
        </div>

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold">
            {parentName}
          </p>

          <p className="truncate text-xs text-white/50">
            Parent Account
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   LINKED STUDENT
========================================================= */

function LinkedStudent({
  studentName,
  applicationNumber,
  studentInitial,
}: {
  studentName: string;
  applicationNumber: string;
  studentInitial: string;
}) {
  return (
    <div className="border-b border-white/10 px-5 py-4">

      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
        Linked Student
      </p>

      <div className="mt-3 flex items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-brand-gold">
          {studentInitial}
        </div>

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold text-white">
            {studentName}
          </p>

          <p className="truncate text-[11px] text-white/40">
            {applicationNumber}
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   NAVIGATION
========================================================= */

function SidebarNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-4 py-6">

      {/* ===================================================
          MAIN
      ==================================================== */}

      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        Main
      </p>

      <div className="space-y-1">

        <SidebarItem
          href="/parent/dashboard"
          icon={<LayoutDashboard size={19} />}
          label="Dashboard"
          active={
            pathname === '/parent/dashboard'
          }
          onClick={onNavigate}
        />

      </div>

      {/* ===================================================
          MY CHILD
      ==================================================== */}

      <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        My Child
      </p>

      <div className="space-y-1">

        <SidebarItem
          href="/parent/dashboard/student"
          icon={<UserRound size={19} />}
          label="My Child"
          active={pathname.startsWith(
            '/parent/dashboard/student'
          )}
          onClick={onNavigate}
        />

        <SidebarItem
          href="/parent/dashboard/academic"
          icon={<BookOpen size={19} />}
          label="Academic"
          active={pathname.startsWith(
            '/parent/dashboard/academic'
          )}
          onClick={onNavigate}
        />

        <SidebarItem
          href="/parent/dashboard/attendance"
          icon={<CalendarCheck size={19} />}
          label="Attendance"
          active={pathname.startsWith(
            '/parent/dashboard/attendance'
          )}
          onClick={onNavigate}
        />

        <SidebarItem
          href="/parent/dashboard/timetable"
          icon={<CalendarDays size={19} />}
          label="Timetable"
          active={pathname.startsWith(
            '/parent/dashboard/timetable'
          )}
          onClick={onNavigate}
        />

      </div>

      {/* ===================================================
          FINANCE & RECORDS
      ==================================================== */}

      <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        Finance & Records
      </p>

      <div className="space-y-1">

        <SidebarItem
          href="/parent/dashboard/payment"
          icon={<CreditCard size={19} />}
          label="Fees & Payments"
          active={pathname.startsWith(
            '/parent/dashboard/payment'
          )}
          onClick={onNavigate}
        />

        <SidebarItem
          href="/parent/dashboard/documents"
          icon={<FileText size={19} />}
          label="Documents"
          active={pathname.startsWith(
            '/parent/dashboard/documents'
          )}
          onClick={onNavigate}
        />

      </div>

      {/* ===================================================
          COMMUNICATION
      ==================================================== */}

      <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        Communication
      </p>

      <div className="space-y-1">

        <SidebarItem
          href="/parent/dashboard/notifications"
          icon={<Bell size={19} />}
          label="Notifications"
          active={pathname.startsWith(
            '/parent/dashboard/notifications'
          )}
          onClick={onNavigate}
        />

        <SidebarItem
          href="/parent/dashboard/announcements"
          icon={<Megaphone size={19} />}
          label="Announcements"
          active={pathname.startsWith(
            '/parent/dashboard/announcements'
          )}
          onClick={onNavigate}
        />

      </div>

      {/* ===================================================
          SUPPORT
      ==================================================== */}

      <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        Support
      </p>

      <SidebarItem
        href="/parent/dashboard/contact"
        icon={<Phone size={19} />}
        label="Contact College"
         active={pathname.startsWith(
            '/parent/dashboard/contact'
          )}
          onClick={onNavigate}
        />

    </nav>
  );
}

/* =========================================================
   SIDEBAR ITEM
========================================================= */

function SidebarItem({
  href,
  icon,
  label,
  active,
  onClick,
}: SidebarItemProps & {
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
        active
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-white/60 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      {icon}

      <span>
        {label}
      </span>

    </Link>
  );
}

/* =========================================================
   LOGOUT
========================================================= */

function SidebarLogout() {
  return (
    <div className="border-t border-white/10 p-4">

      <form
        action="/api/parent/logout"
        method="POST"
      >

        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-red-500/10 hover:text-red-300"
        >

          <LogOut size={19} />

          <span>
            Logout
          </span>

        </button>

      </form>

    </div>
  );
}

