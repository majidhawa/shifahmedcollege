
import Link from 'next/link';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import type { ElementType } from 'react';

import {
  BarChart3,
  Users,
  GraduationCap,
  CreditCard,
  CheckCircle2,
  Clock3,
  FileText,
  ArrowRight,
  TrendingUp,
  MapPin,
  UserRound,
  Wallet,
  ShieldCheck,
  UserCheck,
  UserX,
  BookOpen,
  Activity,
  UsersRound,
} from 'lucide-react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type Summary = {
  total_applications: number;
  paid_applications: number;
  pending_payments: number;
  approved_applications: number;
  pending_applications: number;
  rejected_applications: number;
  total_collected: number | string;
};

type CourseReport = {
  course: string;
  total: number;
};

type IntakeReport = {
  intake: string;
  total: number;
};

type GenderReport = {
  gender: string;
  total: number;
};

type CountyReport = {
  county: string;
  total: number;
};

type UserStatistics = {
  total_users: number;
  admins: number;
  lecturers: number;
  parents: number;
  active_users: number;
  inactive_users: number;
  linked_students: number;
  lecturer_assignments: number;
  lecturers_with_programs: number;
};

type RecentApplication = {
  id: number;
  application_number: string;
  student_name: string;
  course: string | null;
  intake: string | null;
  payment_status: string | null;
  application_status: string | null;
  created_at: string;
};

type RecentUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  active: boolean;
  created_at: string;
};

/* =========================================================
   HELPERS
========================================================= */

const formatNumber = (value: number | string | null | undefined) => {
  return Number(value || 0).toLocaleString('en-KE');
};

const formatCurrency = (amount: number | string) => {
  return `KSh ${Number(amount || 0).toLocaleString('en-KE')}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getPercentage = (value: number, total: number) => {
  if (!total) return 0;

  return Math.round((value / total) * 100);
};

const getStatusClass = (status: string | null | undefined) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();

  if (
    normalized === 'paid' ||
    normalized === 'approved' ||
    normalized === 'accepted' ||
    normalized === 'active'
  ) {
    return 'bg-green-50 text-brand-green';
  }

  if (
    normalized === 'rejected' ||
    normalized === 'declined' ||
    normalized === 'inactive' ||
    normalized === 'failed'
  ) {
    return 'bg-red-50 text-red-600';
  }

  return 'bg-amber-50 text-amber-700';
};

const getRoleClass = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-purple-50 text-purple-700';

    case 'lecturer':
      return 'bg-blue-50 text-blue-700';

    case 'parent':
      return 'bg-amber-50 text-amber-700';

    default:
      return 'bg-slate-100 text-slate-600';
  }
};

/* =========================================================
   REUSABLE REPORT COMPONENTS
========================================================= */

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'green',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ElementType;
  color?: 'green' | 'blue' | 'amber' | 'purple' | 'red';
}) {
  const colors = {
    green: 'bg-green-50 text-brand-green',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 break-words text-3xl font-bold text-brand-dark">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className={`shrink-0 rounded-xl p-3 ${colors[color]}`}>
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

function ProgressReport({
  label,
  total,
  percentage,
  maximum,
  color = 'bg-brand-green',
}: {
  label: string;
  total: number;
  percentage?: number;
  maximum: number;
  color?: string;
}) {
  const width = maximum > 0
    ? Math.min(100, (total / maximum) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-700">
          {label}
        </p>

        <p className="text-sm font-bold text-brand-dark">
          {formatNumber(total)}
        </p>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>

      {percentage !== undefined && (
        <p className="mt-1 text-xs text-slate-400">
          {percentage}% of total applications
        </p>
      )}
    </div>
  );
}

/* =========================================================
   REPORTS PAGE
========================================================= */

export default async function ReportsPage() {
  /* =======================================================
     ADMIN AUTHENTICATION

     requireAdmin is asynchronous.
     Always await the session verification.
  ======================================================= */

  const admin = await requireAdmin();

  if (!admin) {
    redirect('/admin/login');
  }

  /* =======================================================
     FETCH REPORT DATA

     Application reports and user-management reports
     are loaded independently.
  ======================================================= */

  const [
    summaryResult,
    courseResult,
    intakeResult,
    genderResult,
    countyResult,
    recentResult,
    userStatisticsResult,
    recentUsersResult,
  ] = await Promise.all([

    /* =====================================================
       APPLICATION SUMMARY
    ===================================================== */

    pool.query(`
      SELECT
        COUNT(*)::int AS total_applications,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(COALESCE(payment_status, ''))) = 'paid'
        )::int AS paid_applications,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(COALESCE(payment_status, ''))) = 'pending'
        )::int AS pending_payments,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(application_status))
            IN ('approved', 'accepted')
        )::int AS approved_applications,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(application_status)) = 'pending'
        )::int AS pending_applications,

        COUNT(*) FILTER (
          WHERE LOWER(TRIM(application_status))
            IN ('rejected', 'declined')
        )::int AS rejected_applications,

        COALESCE(
          SUM(
            CASE
              WHEN LOWER(TRIM(COALESCE(payment_status, ''))) = 'paid'
              THEN COALESCE(application_fee, 0)::numeric
              ELSE 0::numeric
            END
          ),
          0::numeric
        ) AS total_collected

      FROM public.applications
    `),

    /* =====================================================
       APPLICATIONS BY COURSE
    ===================================================== */

    pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(course), ''),
          'Not specified'
        ) AS course,

        COUNT(*)::int AS total

      FROM public.applications

      GROUP BY 1

      ORDER BY total DESC
    `),

    /* =====================================================
       APPLICATIONS BY INTAKE
    ===================================================== */

    pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(intake), ''),
          'Not specified'
        ) AS intake,

        COUNT(*)::int AS total

      FROM public.applications

      GROUP BY 1

      ORDER BY total DESC
    `),

    /* =====================================================
       APPLICATIONS BY GENDER
    ===================================================== */

    pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(gender), ''),
          'Not specified'
        ) AS gender,

        COUNT(*)::int AS total

      FROM public.applications

      GROUP BY 1

      ORDER BY total DESC
    `),

    /* =====================================================
       APPLICATIONS BY COUNTY
    ===================================================== */

    pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(county), ''),
          'Not specified'
        ) AS county,

        COUNT(*)::int AS total

      FROM public.applications

      GROUP BY 1

      ORDER BY total DESC
    `),

    /* =====================================================
       RECENT APPLICATIONS
    ===================================================== */

    pool.query(`
      SELECT
        id,
        application_number,

        COALESCE(
          NULLIF(
            TRIM(
              CONCAT_WS(
                ' ',
                surname,
                middle_name,
                first_name
              )
            ),
            ''
          ),
          'Unnamed applicant'
        ) AS student_name,

        course,
        intake,
        payment_status,
        application_status,
        created_at

      FROM public.applications

      ORDER BY created_at DESC

      LIMIT 10
    `),

    /* =====================================================
       USER MANAGEMENT STATISTICS

       public.users is the main source of truth for
       administrators, lecturers and parents.

       Do not count admin_users separately because
       administrator accounts are represented in both
       tables after the updated user-creation process.
    ===================================================== */

    pool.query(`
      SELECT

        COUNT(*)::int AS total_users,

        COUNT(*) FILTER (
          WHERE role = 'admin'
        )::int AS admins,

        COUNT(*) FILTER (
          WHERE role = 'lecturer'
        )::int AS lecturers,

        COUNT(*) FILTER (
          WHERE role = 'parent'
        )::int AS parents,

        COUNT(*) FILTER (
          WHERE active = true
        )::int AS active_users,

        COUNT(*) FILTER (
          WHERE active = false
        )::int AS inactive_users,

        (
          SELECT COUNT(DISTINCT application_id)::int
          FROM public.parent_students
        ) AS linked_students,

        (
          SELECT COUNT(*)::int
          FROM public.lms_lecturer_programs
        ) AS lecturer_assignments,

        (
          SELECT COUNT(DISTINCT lecturer_id)::int
          FROM public.lms_lecturer_programs
        ) AS lecturers_with_programs

      FROM public.users

      WHERE role IN ('admin', 'lecturer', 'parent')
    `),

    /* =====================================================
       RECENT USER ACCOUNTS
    ===================================================== */

    pool.query(`
      SELECT
        id,
        name,
        email,
        phone,
        role,
        active,
        created_at

      FROM public.users

      WHERE role IN ('admin', 'lecturer', 'parent')

      ORDER BY created_at DESC

      LIMIT 10
    `),
  ]);

  /* =======================================================
     NORMALIZE RESULTS
  ======================================================= */

  const summary: Summary = summaryResult.rows[0] || {
    total_applications: 0,
    paid_applications: 0,
    pending_payments: 0,
    approved_applications: 0,
    pending_applications: 0,
    rejected_applications: 0,
    total_collected: 0,
  };

  const courses: CourseReport[] = courseResult.rows;
  const intakes: IntakeReport[] = intakeResult.rows;
  const genders: GenderReport[] = genderResult.rows;
  const counties: CountyReport[] = countyResult.rows;

  const recentApplications: RecentApplication[] =
    recentResult.rows;

  const userStatistics: UserStatistics =
    userStatisticsResult.rows[0] || {
      total_users: 0,
      admins: 0,
      lecturers: 0,
      parents: 0,
      active_users: 0,
      inactive_users: 0,
      linked_students: 0,
      lecturer_assignments: 0,
      lecturers_with_programs: 0,
    };

  const recentUsers: RecentUser[] = recentUsersResult.rows;

  /* =======================================================
     NORMALIZE NUMERIC VALUES
  ======================================================= */

  const totalApplications = Number(summary.total_applications || 0);

  const totalUsers = Number(userStatistics.total_users || 0);

  const maxCourseTotal = Math.max(
    ...courses.map((item) => Number(item.total)),
    1
  );

  const maxIntakeTotal = Math.max(
    ...intakes.map((item) => Number(item.total)),
    1
  );

  const maxGenderTotal = Math.max(
    ...genders.map((item) => Number(item.total)),
    1
  );

  const maxCountyTotal = Math.max(
    ...counties.map((item) => Number(item.total)),
    1
  );

  /* =======================================================
     RENDER PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-brand-cream">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-gold">
                Administration
              </p>

              <h1 className="mt-1 text-3xl font-bold text-brand-dark">
                Reports & Analytics
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Monitor applications, admissions, payments,
                user accounts and student trends.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">

              <Link
                href="/admin/dashboard/applications"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green px-4 py-3 text-sm font-semibold text-brand-green transition hover:bg-brand-cream"
              >
                Applications
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/admin/dashboard/payments"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Payments
                <CreditCard className="h-4 w-4" />
              </Link>

            </div>
          </div>

        </div>
      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">

        {/* =================================================
            SECTION 1: APPLICATION SUMMARY
        ================================================= */}

        <section>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-brand-dark">
              Application Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Overall application and application-fee performance.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <MetricCard
              title="Total Applications"
              value={formatNumber(summary.total_applications)}
              description="All submitted applications"
              icon={FileText}
              color="green"
            />

            <MetricCard
              title="Paid Applications"
              value={formatNumber(summary.paid_applications)}
              description={`${getPercentage(
                Number(summary.paid_applications),
                totalApplications
              )}% of submitted applications`}
              icon={CheckCircle2}
              color="green"
            />

            <MetricCard
              title="Pending Payments"
              value={formatNumber(summary.pending_payments)}
              description="Awaiting application fee payment"
              icon={Clock3}
              color="amber"
            />

            <MetricCard
              title="Total Collected"
              value={formatCurrency(summary.total_collected)}
              description="Recorded paid application fees"
              icon={Wallet}
              color="blue"
            />

          </div>

          {/* APPLICATION STATUS */}

          <div className="mt-5 grid gap-5 md:grid-cols-3">

            <MetricCard
              title="Approved Applications"
              value={formatNumber(summary.approved_applications)}
              description="Approved or accepted applications"
              icon={CheckCircle2}
              color="green"
            />

            <MetricCard
              title="Pending Review"
              value={formatNumber(summary.pending_applications)}
              description="Applications awaiting a decision"
              icon={Clock3}
              color="amber"
            />

            <MetricCard
              title="Rejected Applications"
              value={formatNumber(summary.rejected_applications)}
              description="Rejected or declined applications"
              icon={FileText}
              color="red"
            />

          </div>

        </section>

        {/* =================================================
            SECTION 2: USER MANAGEMENT REPORTS
        ================================================= */}

        <section>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-xl font-bold text-brand-dark">
                User Management Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Administrators, lecturers, parents and account activity.
              </p>
            </div>

            <Link
              href="/admin/dashboard/users"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-dark"
            >
              Manage Users
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>

          {/* USER ROLE COUNTS */}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <MetricCard
              title="Total User Accounts"
              value={formatNumber(userStatistics.total_users)}
              description="All administrator, lecturer and parent accounts"
              icon={Users}
              color="green"
            />

            <MetricCard
              title="Administrators"
              value={formatNumber(userStatistics.admins)}
              description="Administrator accounts"
              icon={ShieldCheck}
              color="purple"
            />

            <MetricCard
              title="Lecturers"
              value={formatNumber(userStatistics.lecturers)}
              description="Registered lecturer accounts"
              icon={GraduationCap}
              color="blue"
            />

            <MetricCard
              title="Parents"
              value={formatNumber(userStatistics.parents)}
              description="Registered parent accounts"
              icon={UsersRound}
              color="amber"
            />

          </div>

          {/* USER ACTIVITY */}

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <MetricCard
              title="Active Accounts"
              value={formatNumber(userStatistics.active_users)}
              description="Accounts currently enabled"
              icon={UserCheck}
              color="green"
            />

            <MetricCard
              title="Inactive Accounts"
              value={formatNumber(userStatistics.inactive_users)}
              description="Disabled or inactive accounts"
              icon={UserX}
              color="red"
            />

            <MetricCard
              title="Linked Students"
              value={formatNumber(userStatistics.linked_students)}
              description="Distinct students linked to parents"
              icon={UsersRound}
              color="blue"
            />

            <MetricCard
              title="Lecturer Assignments"
              value={formatNumber(userStatistics.lecturer_assignments)}
              description={`${formatNumber(
                userStatistics.lecturers_with_programs
              )} lecturers with programme assignments`}
              icon={BookOpen}
              color="purple"
            />

          </div>

          {/* USER ACCOUNT DISTRIBUTION */}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-brand-cream p-3">
                <Activity className="h-6 w-6 text-brand-green" />
              </div>

              <div>
                <h3 className="font-bold text-brand-dark">
                  Account Activity
                </h3>

                <p className="text-sm text-slate-500">
                  Current account activation overview.
                </p>
              </div>

            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    Active accounts
                  </span>

                  <span className="font-bold text-brand-green">
                    {getPercentage(
                      Number(userStatistics.active_users),
                      totalUsers
                    )}%
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-green"
                    style={{
                      width: `${getPercentage(
                        Number(userStatistics.active_users),
                        totalUsers
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">
                    Inactive accounts
                  </span>

                  <span className="font-bold text-red-600">
                    {getPercentage(
                      Number(userStatistics.inactive_users),
                      totalUsers
                    )}%
                  </span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{
                      width: `${getPercentage(
                        Number(userStatistics.inactive_users),
                        totalUsers
                      )}%`,
                    }}
                  />
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            SECTION 3: APPLICATION DISTRIBUTION
        ================================================= */}

        <section>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-brand-dark">
              Application Distribution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Understand programme demand and applicant demographics.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            {/* APPLICATIONS BY COURSE */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-brand-cream p-3">
                  <GraduationCap className="h-6 w-6 text-brand-green" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-brand-dark">
                    Applications by Course
                  </h3>

                  <p className="text-sm text-slate-500">
                    Course demand across all applications.
                  </p>
                </div>

              </div>

              <div className="mt-6 space-y-5">

                {courses.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No course data available.
                  </p>
                ) : (
                  courses.map((item) => {
                    const total = Number(item.total);

                    return (
                      <ProgressReport
                        key={item.course}
                        label={item.course}
                        total={total}
                        percentage={getPercentage(
                          total,
                          totalApplications
                        )}
                        maximum={maxCourseTotal}
                        color="bg-brand-green"
                      />
                    );
                  })
                )}

              </div>

            </div>

            {/* APPLICATIONS BY INTAKE */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-brand-cream p-3">
                  <TrendingUp className="h-6 w-6 text-brand-green" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-brand-dark">
                    Applications by Intake
                  </h3>

                  <p className="text-sm text-slate-500">
                    Applicant demand across intakes.
                  </p>
                </div>

              </div>

              <div className="mt-6 space-y-5">

                {intakes.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No intake data available.
                  </p>
                ) : (
                  intakes.map((item) => (
                    <ProgressReport
                      key={item.intake}
                      label={item.intake}
                      total={Number(item.total)}
                      maximum={maxIntakeTotal}
                      color="bg-brand-gold"
                    />
                  ))
                )}

              </div>

            </div>

          </div>

          {/* GENDER AND COUNTY */}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            {/* GENDER */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-purple-50 p-3">
                  <UserRound className="h-6 w-6 text-purple-600" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-brand-dark">
                    Applicants by Gender
                  </h3>

                  <p className="text-sm text-slate-500">
                    Gender distribution of applicants.
                  </p>
                </div>

              </div>

              <div className="mt-6 space-y-5">

                {genders.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No gender data available.
                  </p>
                ) : (
                  genders.map((item) => (
                    <ProgressReport
                      key={item.gender}
                      label={item.gender}
                      total={Number(item.total)}
                      maximum={maxGenderTotal}
                      color="bg-purple-500"
                    />
                  ))
                )}

              </div>

            </div>

            {/* COUNTY */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-50 p-3">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-brand-dark">
                    Applicants by County
                  </h3>

                  <p className="text-sm text-slate-500">
                    Geographic distribution of applicants.
                  </p>
                </div>

              </div>

              <div className="mt-6 space-y-5">

                {counties.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No county data available.
                  </p>
                ) : (
                  counties.slice(0, 10).map((item) => (
                    <ProgressReport
                      key={item.county}
                      label={item.county}
                      total={Number(item.total)}
                      maximum={maxCountyTotal}
                      color="bg-blue-500"
                    />
                  ))
                )}

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            SECTION 4: RECENT APPLICATIONS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">

          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-lg font-bold text-brand-dark">
                Recent Applications
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                The latest applications submitted to SMTC.
              </p>
            </div>

            <Link
              href="/admin/dashboard/applications"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-dark"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>

          {recentApplications.length === 0 ? (

            <div className="px-6 py-16 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 text-lg font-semibold text-brand-dark">
                No applications yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Reports will populate automatically when applications
                are submitted.
              </p>
            </div>

          ) : (

            <div className="overflow-x-auto">
              <table className="w-full text-left">

                <thead className="bg-brand-cream">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Applicant</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {recentApplications.map((application) => (

                    <tr
                      key={application.id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-6 py-4">
                        <p className="font-semibold text-brand-dark">
                          {application.student_name || '—'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {application.application_number}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">
                          {application.course || '—'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {application.intake || '—'}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            application.payment_status
                          )}`}
                        >
                          {application.payment_status || 'Pending'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            application.application_status
                          )}`}
                        >
                          {application.application_status || 'Pending'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(application.created_at)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/dashboard/applications/${encodeURIComponent(
                            application.application_number
                          )}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>
            </div>

          )}

        </section>

        {/* =================================================
            SECTION 5: RECENT USER ACCOUNTS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">

          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-lg font-bold text-brand-dark">
                Recently Created Accounts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest administrator, lecturer and parent accounts.
              </p>
            </div>

            <Link
              href="/admin/dashboard/users"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-dark"
            >
              Manage All Users
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>

          {recentUsers.length === 0 ? (

            <div className="px-6 py-14 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-semibold text-brand-dark">
                No user accounts found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Newly created accounts will appear here.
              </p>
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead className="bg-brand-cream">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Account Status</th>
                    <th className="px-6 py-4">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {recentUsers.map((user) => (

                    <tr
                      key={user.id}
                      className="transition hover:bg-slate-50"
                    >

                      <td className="px-6 py-4">
                        <p className="font-semibold text-brand-dark">
                          {user.name}
                        </p>

                        {user.phone && (
                          <p className="mt-1 text-xs text-slate-400">
                            {user.phone}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.email || 'No email'}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getRoleClass(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            user.active ? 'active' : 'inactive'
                          )}`}
                        >
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(user.created_at)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* =================================================
            SECTION 6: QUICK REPORT LINKS
        ================================================= */}

        <section>

          <h2 className="text-lg font-bold text-brand-dark">
            Quick Reports & Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Quickly access important administrative sections.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Link
              href="/admin/dashboard/applications"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-green"
            >
              <FileText className="h-6 w-6 text-brand-green" />

              <p className="mt-4 font-semibold text-brand-dark">
                Applications
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Review submitted applications.
              </p>

              <ArrowRight className="mt-4 h-4 w-4 text-brand-green transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/admin/dashboard/students"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-green"
            >
              <Users className="h-6 w-6 text-brand-green" />

              <p className="mt-4 font-semibold text-brand-dark">
                Students
              </p>

              <p className="mt-1 text-sm text-slate-500">
                View registered students.
              </p>

              <ArrowRight className="mt-4 h-4 w-4 text-brand-green transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/admin/dashboard/users"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-green"
            >
              <UsersRound className="h-6 w-6 text-brand-green" />

              <p className="mt-4 font-semibold text-brand-dark">
                User Management
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Manage administrators, lecturers and parents.
              </p>

              <ArrowRight className="mt-4 h-4 w-4 text-brand-green transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/admin/dashboard/payments"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-green"
            >
              <CreditCard className="h-6 w-6 text-brand-green" />

              <p className="mt-4 font-semibold text-brand-dark">
                Payments
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Monitor application payments.
              </p>

              <ArrowRight className="mt-4 h-4 w-4 text-brand-green transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="/admin/dashboard/receipts"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-green"
            >
              <Wallet className="h-6 w-6 text-brand-green" />

              <p className="mt-4 font-semibold text-brand-dark">
                Receipts
              </p>

              <p className="mt-1 text-sm text-slate-500">
                View official payment receipts.
              </p>

              <ArrowRight className="mt-4 h-4 w-4 text-brand-green transition group-hover:translate-x-1" />
            </Link>

          </div>

        </section>

      </main>
    </div>
  );
}
