import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  getParentSession,
} from '@/lib/parent-auth';

import {
  getParentDashboardData,
} from '@/lib/parent-dashboard';

import {
  UserRound,
  GraduationCap,
  CreditCard,
  FileText,
  CalendarDays,
  Phone,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  BookOpen,
  ChevronRight,
  Users,
} from 'lucide-react';

/* =========================================================
   PARENT DASHBOARD
   Shifah Medical Training College

   The parent dashboard shell is handled by:

   app/parent/dashboard/layout.tsx

   Shared parent/student data is handled by:

   lib/parent-dashboard.ts
========================================================= */

/* =========================================================
   PAGE
========================================================= */

export default async function ParentDashboardPage() {
  /* =======================================================
     GET SESSION
  ======================================================= */

  const session =
    await getParentSession();

  /*
   * The dashboard layout already protects this route.
   *
   * This check is kept here because the dashboard page
   * also needs the parent ID to retrieve its data.
   */

  if (!session) {
    return null;
  }

  /* =======================================================
     GET PARENT DASHBOARD DATA
  ======================================================= */

  const dashboardData =
    await getParentDashboardData(
      session.parentId
    );

  if (!dashboardData) {
    return (
      <NoParentAccount />
    );
  }

  const parent =
    dashboardData.parent;

  const student =
    dashboardData.student;

  /* =======================================================
     NO LINKED STUDENT
  ======================================================= */

  if (!student) {
    return (
      <NoLinkedStudent />
    );
  }

  /* =======================================================
     FULL STUDENT NAME
  ======================================================= */

  const fullName = [
    student.first_name,
    student.middle_name,
    student.surname,
  ]
    .filter(
      (
        value: string | null
      ): value is string =>
        Boolean(
          value &&
            value.trim()
        )
    )
    .join(' ');

  /* =======================================================
     STATUS VALUES
  ======================================================= */

  const applicationStatus =
    String(
      student.application_status ||
        'Pending'
    );

  const paymentStatus =
    String(
      student.payment_status ||
        'Pending'
    );

  const admissionStatus =
    String(
      student.admission_status ||
        'Not Admitted'
    );

  /* =======================================================
     NORMALIZE STATUS
  ======================================================= */

  const normalizedApplicationStatus =
    applicationStatus
      .trim()
      .toLowerCase();

  const normalizedPaymentStatus =
    paymentStatus
      .trim()
      .toLowerCase();

  const normalizedAdmissionStatus =
    admissionStatus
      .trim()
      .toLowerCase();

  /* =======================================================
     APPLICATION STATUS
  ======================================================= */

  const applicationApproved = [
    'approved',
    'accepted',
    'admitted',
  ].includes(
    normalizedApplicationStatus
  );

  /* =======================================================
     PAYMENT STATUS
  ======================================================= */

  const paymentComplete = [
    'paid',
    'approved',
    'completed',
    'complete',
  ].includes(
    normalizedPaymentStatus
  );

  /* =======================================================
     ADMISSION STATUS
  ======================================================= */

  const admissionActive = [
    'active',
    'approved',
    'admitted',
  ].includes(
    normalizedAdmissionStatus
  );

  /* =======================================================
     APPLICATION PROGRESS
  ======================================================= */

  let progress = 33;

  if (paymentComplete) {
    progress = 66;
  }

  if (
    applicationApproved ||
    admissionActive
  ) {
    progress = 100;
  }

  /* =======================================================
     PARENT / GUARDIAN DISPLAY DATA
  ======================================================= */

  const parentDisplayName =
    student.guardian_name ||
    student.sponsor_name ||
    parent.name ||
    'Parent / Guardian';

  const parentRelationship =
    student.guardian_relationship ||
    student.sponsor_relationship ||
    'Parent / Guardian';

  const parentPhone =
    student.guardian_mobile ||
    student.sponsor_mobile ||
    parent.phone ||
    '—';

  const parentEmail =
    student.guardian_email ||
    student.sponsor_email ||
    parent.email ||
    '—';

  /* =======================================================
     ADMISSION NUMBER
  ======================================================= */

  const admissionNumber =
    student.admission_number ||
    'Not yet assigned';

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6 p-5 sm:p-8">

      {/* =================================================
          STUDENT HERO
      ================================================== */}

      <section className="overflow-hidden rounded-3xl bg-brand-green shadow-lg">

        <div className="relative p-6 sm:p-8">

          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full border-[35px] border-white/5" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
                Student Overview
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {fullName || 'Student'}
              </h2>

              <p className="mt-2 text-sm text-white/70">

                Application No:{' '}

                <span className="font-semibold text-white">
                  {student.application_number || '—'}
                </span>

              </p>

              <p className="mt-1 text-sm text-white/70">

                Admission No:{' '}

                <span className="font-semibold text-white">
                  {admissionNumber}
                </span>

              </p>

              <p className="mt-1 text-sm text-white/70">

                {student.course ||
                  'Course not specified'}

                {student.intake
                  ? ` • ${student.intake}`
                  : ''}

              </p>

            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-extrabold text-brand-green shadow-lg">
              {fullName.charAt(0).toUpperCase() || 'S'}
            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          STATUS CARDS
      ================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatusCard
          icon={
            <FileText size={21} />
          }
          title="Application"
          value={applicationStatus}
          success={applicationApproved}
        />

        <StatusCard
          icon={
            <CreditCard size={21} />
          }
          title="Payment"
          value={paymentStatus}
          success={paymentComplete}
        />

        <StatusCard
          icon={
            <GraduationCap size={21} />
          }
          title="Admission"
          value={admissionStatus}
          success={admissionActive}
        />

        <StatusCard
          icon={
            <CalendarDays size={21} />
          }
          title="Intake"
          value={
            student.intake ||
            'Not specified'
          }
          success={true}
        />

      </section>

      {/* =================================================
          PROGRESS
      ================================================== */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold text-brand-dark">
              Application Progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track the progress of your
              student&apos;s enrollment.
            </p>

          </div>

          <span className="text-lg font-extrabold text-brand-green">
            {progress}%
          </span>

        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">

          <div
            className="h-full rounded-full bg-brand-green transition-all"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">

          <ProgressStep
            title="Application"
            complete={true}
            description="Application submitted"
          />

          <ProgressStep
            title="Payment"
            complete={paymentComplete}
            description={
              paymentComplete
                ? 'Payment confirmed'
                : 'Payment pending'
            }
          />

          <ProgressStep
            title="Admission"
            complete={
              applicationApproved ||
              admissionActive
            }
            description={
              admissionActive ||
              applicationApproved
                ? 'Admission confirmed'
                : 'Awaiting admission'
            }
          />

        </div>

      </section>

      {/* =================================================
          STUDENT + PARENT INFORMATION
      ================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* =================================================
            STUDENT DETAILS
        ================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10">

              <UserRound
                size={20}
                className="text-brand-green"
              />

            </div>

            <div>

              <h2 className="font-bold text-brand-dark">
                Student Details
              </h2>

              <p className="text-xs text-slate-500">
                Basic student information
              </p>

            </div>

          </div>

          <InfoRow
            label="Full Name"
            value={
              fullName || '—'
            }
          />

          <InfoRow
            label="Application Number"
            value={
              student.application_number ||
              '—'
            }
          />

          <InfoRow
            label="Admission Number"
            value={
              admissionNumber
            }
          />

          <InfoRow
            label="Course"
            value={
              student.course ||
              '—'
            }
          />

          <InfoRow
            label="Intake"
            value={
              student.intake ||
              '—'
            }
          />

          <InfoRow
            label="Phone"
            value={
              student.mobile ||
              '—'
            }
          />

          <InfoRow
            label="Email"
            value={
              student.email ||
              '—'
            }
          />

        </section>

        {/* =================================================
            PARENT DETAILS
        ================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10">

              <Users
                size={20}
                className="text-brand-green"
              />

            </div>

            <div>

              <h2 className="font-bold text-brand-dark">
                Parent / Guardian
              </h2>

              <p className="text-xs text-slate-500">
                Registered contact information
              </p>

            </div>

          </div>

          <InfoRow
            label="Name"
            value={
              parentDisplayName
            }
          />

          <InfoRow
            label="Relationship"
            value={
              parentRelationship
            }
          />

          <InfoRow
            label="Phone"
            value={
              parentPhone
            }
          />

          <InfoRow
            label="Email"
            value={
              parentEmail
            }
          />

        </section>

      </div>

      {/* =================================================
          QUICK ACTIONS
      ================================================== */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5">

          <h2 className="text-lg font-bold text-brand-dark">
            Quick Access
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Quickly access important student
            information.
          </p>

        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <ActionLink
            href="/parent/dashboard/student"
            icon={
              <UserRound size={20} />
            }
            title="Student Details"
            description="View student information"
          />

          <ActionLink
            href="/parent/dashboard/academic"
            icon={
              <BookOpen size={20} />
            }
            title="Academic Progress"
            description="View academic performance"
          />

          <ActionLink
            href="/parent/dashboard/payment"
            icon={
              <CreditCard size={20} />
            }
            title="Fees & Payments"
            description="Check payment information"
          />

          <ActionLink
            href="/parent/dashboard/admission"
            icon={
              <GraduationCap size={20} />
            }
            title="Admission"
            description="View admission status"
          />

        </div>

      </section>

      {/* =================================================
          SECURITY NOTICE
      ================================================== */}

      <section className="rounded-3xl border border-brand-green/10 bg-brand-green/5 p-5">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/10">

            <ShieldCheck
              size={20}
              className="text-brand-green"
            />

          </div>

          <div>

            <p className="text-sm font-bold text-brand-dark">
              Secure Parent Portal
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Your parent account provides secure
              access to information associated with
              your linked student&apos;s Shifah Medical
              Training College records.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   NO PARENT ACCOUNT
========================================================= */

function NoParentAccount() {
  return (
    <div className="flex min-h-[calc(100vh-90px)] items-center justify-center p-6">

      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <ShieldCheck size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-brand-dark">
          Parent Account Unavailable
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          We could not retrieve your parent account
          information. Please contact Shifah Medical
          Training College for assistance.
        </p>

        <div className="mt-6">

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <Phone size={18} />
            Contact College
          </Link>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   NO LINKED STUDENT
========================================================= */

function NoLinkedStudent() {
  return (
    <div className="flex min-h-[calc(100vh-90px)] items-center justify-center p-6">

      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Users size={30} />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-brand-dark">
          No Linked Student
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your parent account is active, but there is
          currently no student linked to this account.
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Please contact Shifah Medical Training College
          so your student can be linked to your parent
          account.
        </p>

        <div className="mt-6">

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <Phone size={18} />
            Contact College
          </Link>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   STATUS CARD
========================================================= */

function StatusCard({
  icon,
  title,
  value,
  success,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  success: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
          {icon}
        </div>

        <StatusIndicator
          success={success}
        />

      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-brand-dark">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   STATUS INDICATOR
========================================================= */

function StatusIndicator({
  success,
}: {
  success: boolean;
}) {
  return success ? (
    <CheckCircle2
      size={18}
      className="text-emerald-600"
    />
  ) : (
    <Clock3
      size={18}
      className="text-amber-600"
    />
  );
}

/* =========================================================
   PROGRESS STEP
========================================================= */

function ProgressStep({
  title,
  description,
  complete,
}: {
  title: string;
  description: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-start gap-3">

      <div
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          complete
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-amber-100 text-amber-600',
        ].join(' ')}
      >

        {complete ? (
          <CheckCircle2 size={18} />
        ) : (
          <Clock3 size={18} />
        )}

      </div>

      <div>

        <p className="text-sm font-bold text-brand-dark">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">

      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>

      <span className="max-w-[65%] break-words text-right text-sm font-semibold text-brand-dark">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   ACTION LINK
========================================================= */

function ActionLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-md"
    >

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-bold text-brand-dark">
          {title}
        </p>

        <p className="mt-0.5 truncate text-xs text-slate-500">
          {description}
        </p>

      </div>

      <ChevronRight
        size={17}
        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-green"
      />

    </Link>
  );
}
