
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

import {
  FileText,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  WalletCards,
  Receipt,
  History,
  GraduationCap,
  CreditCard,
  Download,
  BookOpen,
  CalendarDays,
} from 'lucide-react';

import PaymentClient from './PaymentClient';

export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type Component = 'TUITION' | 'ADMIN' | 'PROGRAMME';

type FeePayment = {
  id: number;
  receipt_number: string | null;
  mpesa_code: string | null;
  phone_number: string | null;
  amount_paid: number | string;
  payment_method: string | null;
  payment_date: string | Date | null;
  recorded_at: string | Date | null;
  payment_component: Component | null;
  term_number: number | null;
};

type TermPayment = {
  term_number: number;
  amount_paid: number | string;
};

type StudentRow = {
  id: number;
  application_number: string;
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
  mobile: string | null;
  application_course: string | null;
  application_intake: string | null;
  application_fee: number | string | null;
  payment_status: string | null;
  application_status: string | null;
  mpesa_phone_number: string | null;
  mpesa_receipt_number: string | null;
  mpesa_transaction_date: string | null;
  created_at: string | Date | null;

  admission_number: string | null;
  admission_course: string | null;
  admission_intake: string | null;
  admission_status: string | null;
  student_name: string | null;

  fee_structure_id: number | null;
  fee_course_name: string | null;
  course_duration: string | null;
  duration_months: number | null;
  billing_type: string | null;
  tuition_fee: number | string | null;
  admin_charge: number | string | null;
  total_terms: number | null;
  terms_per_year: number | null;

  fee_application_fee: number | string;
  application_fee_paid: number | string;
  uniform_fee: number | string;
  scrub_fee: number | string;

  total_fee: number | string;
  fee_configured: boolean;

  tuition_paid: number | string;
  admin_paid: number | string;
  programme_paid: number | string;
  course_payments_total: number | string;
  total_paid: number | string;
  balance: number | string;
  unallocated_tuition: number | string;

  academic_current_term: number;
  academic_completed_terms: number;
  academic_progress_percent: number | string;
  academic_status: string;
  course_start_date: string | Date | null;
  expected_completion_date: string | Date | null;

  term_payments: TermPayment[] | null;
};

/* =========================================================
   HELPERS
========================================================= */

function formatKES(value: number | string | null | undefined) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown) {
  if (!value) return '—';

  const date = new Date(value as string | Date);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: unknown) {
  if (!value) return '—';

  const date = new Date(value as string | Date);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMpesaDate(value: unknown) {
  if (!value) return '—';

  const rawDate = String(value);

  if (/^\d{14}$/.test(rawDate)) {
    const date = new Date(
      Number(rawDate.substring(0, 4)),
      Number(rawDate.substring(4, 6)) - 1,
      Number(rawDate.substring(6, 8)),
      Number(rawDate.substring(8, 10)),
      Number(rawDate.substring(10, 12)),
      Number(rawDate.substring(12, 14)),
    );

    return Number.isNaN(date.getTime())
      ? '—'
      : formatDateTime(date);
  }

  return formatDateTime(rawDate);
}

function paymentComponentLabel(
  component: string | null,
  term: number | null,
) {
  if (component === 'ADMIN') return 'Administrative Charge';

  if (component === 'PROGRAMME') return 'Programme Tuition';

  if (component === 'TUITION') {
    return term ? `Term ${term} Tuition` : 'Unallocated Tuition';
  }

  return 'Course Fee Payment';
}

/* =========================================================
   STUDENT PAYMENT PAGE
========================================================= */

export default async function StudentPaymentPage() {
  /* AUTHENTICATION */

  const session = await getStudentSession();

  if (!session) {
    redirect('/student/login');
  }

  /* =========================================================
     STUDENT DETAILS AND COURSE FEE STRUCTURE

     PER_TERM:
       Tuition x total terms + admin charge once.

     ONE_TIME:
       Tuition once + admin charge once.

     Additional items:
       Application fee + uniform + scrub.

     PAYMENT RULES:
       - Application fee is credited only when app.payment_status
         is marked as paid.
       - Uniform and scrub are included in total fees.
       - Uniform and scrub are NOT automatically counted as paid.
       - Only actual recorded course payments are counted.
  ========================================================= */

  const result = await pool.query(
    `
    SELECT
      app.id,
      app.application_number,
      app.first_name,
      app.middle_name,
      app.surname,
      app.mobile,
      app.course AS application_course,
      app.intake AS application_intake,
      app.application_fee,
      app.payment_status,
      app.application_status,
      app.mpesa_phone_number,
      app.mpesa_receipt_number,
      app.mpesa_transaction_date,
      app.created_at,

      admission.admission_number,
      admission.course AS admission_course,
      admission.intake AS admission_intake,
      admission.admission_status,
      admission.student_name,

      fee.id AS fee_structure_id,
      fee.course_name AS fee_course_name,
      fee.course_duration,
      fee.duration_months,
      fee.billing_type,
      fee.tuition_fee,
      fee.admin_charge,
      fee.total_terms,
      fee.terms_per_year,

      /* APPLICATION FEE */

      COALESCE(
        NULLIF(fa.application_fee, 0),
        NULLIF(app.application_fee, 0),
        1500
      ) AS fee_application_fee,

      /*
       * Only credit the application fee when the application
       * payment status confirms that it has been paid.
       */

      CASE
        WHEN LOWER(TRIM(COALESCE(app.payment_status, ''))) = 'paid'
        THEN COALESCE(
          NULLIF(fa.application_fee_paid, 0),
          NULLIF(fa.application_fee, 0),
          NULLIF(app.application_fee, 0),
          1500
        )
        ELSE 0
      END AS application_fee_paid,

      /* OPTIONAL FEE ITEMS */

      COALESCE(fa.uniform_fee, 0) AS uniform_fee,
      COALESCE(fa.scrub_fee, 0) AS scrub_fee,

      /* TOTAL FEES */

      (
        CASE
          WHEN fee.id IS NULL
            THEN COALESCE(fa.total_fee, 0)

          WHEN fee.billing_type = 'PER_TERM'
            THEN (
              COALESCE(fee.tuition_fee, 0)
              * COALESCE(fee.total_terms, 0)
            ) + COALESCE(fee.admin_charge, 0)

          ELSE
            COALESCE(fee.tuition_fee, 0)
            + COALESCE(fee.admin_charge, 0)
        END

        + COALESCE(
            NULLIF(fa.application_fee, 0),
            NULLIF(app.application_fee, 0),
            1500
          )

        + COALESCE(fa.uniform_fee, 0)
        + COALESCE(fa.scrub_fee, 0)
      ) AS total_fee,

      /* RECORDED COURSE PAYMENTS */

      COALESCE(paid.tuition_paid, 0) AS tuition_paid,
      COALESCE(paid.admin_paid, 0) AS admin_paid,
      COALESCE(paid.programme_paid, 0) AS programme_paid,

      COALESCE(paid.total_paid, 0) AS course_payments_total,

      /*
       * TOTAL PAID
       *
       * 1. Actual recorded course payments.
       * 2. Verified application fee payment.
       *
       * Uniform and scrub are NOT automatically credited
       * as paid. They remain part of the outstanding fees.
       */

      (
        COALESCE(paid.total_paid, 0)

        + CASE
            WHEN LOWER(TRIM(COALESCE(app.payment_status, ''))) = 'paid'
            THEN COALESCE(
              NULLIF(fa.application_fee_paid, 0),
              NULLIF(fa.application_fee, 0),
              NULLIF(app.application_fee, 0),
              1500
            )
            ELSE 0
          END
      ) AS total_paid,

      COALESCE(paid.unallocated_tuition, 0) AS unallocated_tuition,

      /* OUTSTANDING BALANCE */

      GREATEST(
        (
          CASE
            WHEN fee.id IS NULL
              THEN COALESCE(fa.total_fee, 0)

            WHEN fee.billing_type = 'PER_TERM'
              THEN (
                COALESCE(fee.tuition_fee, 0)
                * COALESCE(fee.total_terms, 0)
              ) + COALESCE(fee.admin_charge, 0)

            ELSE
              COALESCE(fee.tuition_fee, 0)
              + COALESCE(fee.admin_charge, 0)
          END

          + COALESCE(
              NULLIF(fa.application_fee, 0),
              NULLIF(app.application_fee, 0),
              1500
            )

          + COALESCE(fa.uniform_fee, 0)
          + COALESCE(fa.scrub_fee, 0)
        )

        - (
          COALESCE(paid.total_paid, 0)

          + CASE
              WHEN LOWER(TRIM(COALESCE(app.payment_status, ''))) = 'paid'
              THEN COALESCE(
                NULLIF(fa.application_fee_paid, 0),
                NULLIF(fa.application_fee, 0),
                NULLIF(app.application_fee, 0),
                1500
              )
              ELSE 0
            END
        ),
        0
      ) AS balance,

      /* ACADEMIC PROGRESS */

      COALESCE(fa.academic_current_term, 1) AS academic_current_term,
      COALESCE(fa.academic_completed_terms, 0) AS academic_completed_terms,
      COALESCE(fa.academic_progress_percent, 0) AS academic_progress_percent,
      COALESCE(fa.academic_status, 'IN_PROGRESS') AS academic_status,
      fa.course_start_date,
      fa.expected_completion_date,

      /* TERM PAYMENT DETAILS */

      COALESCE(term_data.term_payments, '[]'::json) AS term_payments,

      (fee.id IS NOT NULL) AS fee_configured

    FROM applications app

    LEFT JOIN LATERAL (
      SELECT
        a.admission_number,
        a.course,
        a.intake,
        a.admission_status,
        a.student_name
      FROM admissions a
      WHERE a.application_id = app.id
      ORDER BY a.id DESC
      LIMIT 1
    ) admission ON TRUE

    LEFT JOIN student_fee_accounts fa
      ON fa.application_id = app.id

    LEFT JOIN LATERAL (
      SELECT cfs.*
      FROM course_fee_structures cfs
      CROSS JOIN LATERAL
        unnest(cfs.course_aliases) AS aliases(alias)
      WHERE
        cfs.academic_year = $3
        AND LOWER(
          COALESCE(NULLIF(admission.course, ''), app.course, '')
        ) LIKE '%' || LOWER(aliases.alias) || '%'
      ORDER BY LENGTH(aliases.alias) DESC
      LIMIT 1
    ) fee ON TRUE

    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(amount_paid) FILTER (
          WHERE payment_component = 'TUITION'
        ), 0) AS tuition_paid,

        COALESCE(SUM(amount_paid) FILTER (
          WHERE payment_component = 'ADMIN'
        ), 0) AS admin_paid,

        COALESCE(SUM(amount_paid) FILTER (
          WHERE payment_component = 'PROGRAMME'
        ), 0) AS programme_paid,

        COALESCE(SUM(amount_paid), 0) AS total_paid,

        COALESCE(SUM(amount_paid) FILTER (
          WHERE payment_component = 'TUITION'
            AND term_number IS NULL
        ), 0) AS unallocated_tuition

      FROM student_fee_payments
      WHERE application_id = app.id
    ) paid ON TRUE

    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'term_number', term_number,
          'amount_paid', amount_paid
        ) ORDER BY term_number
      ) AS term_payments
      FROM (
        SELECT
          term_number,
          SUM(amount_paid) AS amount_paid
        FROM student_fee_payments
        WHERE
          application_id = app.id
          AND payment_component = 'TUITION'
          AND term_number IS NOT NULL
        GROUP BY term_number
      ) grouped_terms
    ) term_data ON TRUE

    WHERE
      app.id = $1
      AND app.application_number = $2

    LIMIT 1
    `,
    [
      session.applicationId,
      session.applicationNumber,
      '2026/2027',
    ],
  );

  if (result.rows.length === 0) {
    redirect('/student/login');
  }

  const student = result.rows[0] as StudentRow;

  /* =========================================================
     STUDENT INFORMATION
  ========================================================= */

  const fullName =
    student.student_name ||
    [
      student.first_name,
      student.middle_name,
      student.surname,
    ].filter(Boolean).join(' ') ||
    'Student';

  const course =
    student.admission_course ||
    student.application_course ||
    '—';

  const intake =
    student.admission_intake ||
    student.application_intake ||
    '—';

  /* =========================================================
     APPLICATION PAYMENT STATUS
  ========================================================= */

  const paymentStatus = String(student.payment_status || 'Pending');
  const paymentStatusLower = paymentStatus.trim().toLowerCase();

  const isPaid = paymentStatusLower === 'paid';
  const isRejected = paymentStatusLower === 'rejected';

  const applicationStatus = String(
    student.application_status || 'Pending',
  );

  const paymentPhone =
    student.mpesa_phone_number ||
    student.mobile ||
    '';

  const paymentDate = formatMpesaDate(
    student.mpesa_transaction_date,
  );

  const applicationDate = formatDate(student.created_at);

  let paymentStatusClass =
    'border-amber-200 bg-amber-50 text-amber-700';

  if (isPaid) {
    paymentStatusClass =
      'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (isRejected) {
    paymentStatusClass =
      'border-red-200 bg-red-50 text-red-700';
  }

  /* =========================================================
     COURSE FEES
  ========================================================= */

  const hasFeeAccount = Boolean(student.fee_configured);

  const totalFees = Number(student.total_fee || 0);
  const totalPaid = Number(student.total_paid || 0);
  const balance = Number(student.balance || 0);

  const tuitionFee = Number(student.tuition_fee || 0);
  const adminCharge = Number(student.admin_charge || 0);

  const tuitionPaid = Number(student.tuition_paid || 0);
  const adminPaid = Number(student.admin_paid || 0);
  const programmePaid = Number(student.programme_paid || 0);

  /* APPLICATION FEE */

  const feeApplicationFee = Number(
    student.fee_application_fee ?? 1500,
  );

  const applicationFeePaid = isPaid
    ? Number(student.application_fee_paid || 0)
    : 0;

  const applicationFeeBalance = Math.max(
    feeApplicationFee - applicationFeePaid,
    0,
  );

  /* =========================================================
     UNIFORM AND SCRUB

     Uniform and scrub are included in the total fees.

     They are NOT automatically credited as paid.
     They remain outstanding until the corresponding
     payment is recorded by the accounts office.

     They do not create separate payment history records
     unless an actual payment is recorded.
  ========================================================= */

  const uniformFee = Number(student.uniform_fee || 0);
  const scrubFee = Number(student.scrub_fee || 0);

  const uniformPaid = 0;
  const scrubPaid = 0;

  /* =========================================================
     BILLING TYPE
  ========================================================= */

  const isTermBased = student.billing_type === 'PER_TERM';
  const totalTerms = Number(student.total_terms || 0);

  const termPayments = (
    Array.isArray(student.term_payments)
      ? student.term_payments
      : []
  ) as TermPayment[];

  const feesCleared =
    hasFeeAccount &&
    totalFees > 0 &&
    balance <= 0;

  const paymentProgress =
    totalFees > 0
      ? Math.min((totalPaid / totalFees) * 100, 100)
      : 0;

  const tuitionTotal = isTermBased
    ? tuitionFee * totalTerms
    : tuitionFee;

  const tuitionBalance = Math.max(
    tuitionTotal - tuitionPaid,
    0,
  );

  /* =========================================================
     COMBINED FEE CALCULATIONS

     ONE-TIME PROGRAMMES:
       Tuition + selected uniform + selected scrub + admin.

     TERM-BASED PROGRAMMES:
       Tuition is displayed separately.
       Admin + selected uniform + selected scrub are combined.

     Uniform and scrub are billed but not automatically
     credited as paid.
  ========================================================= */

  const oneTimeProgrammeTotal =
    tuitionTotal +
    uniformFee +
    scrubFee +
    adminCharge;

  const oneTimeProgrammePaid =
    programmePaid +
    uniformPaid +
    scrubPaid +
    adminPaid;

  const oneTimeProgrammeBalance = Math.max(
    oneTimeProgrammeTotal - oneTimeProgrammePaid,
    0,
  );

  const termAdditionalFeesTotal =
    adminCharge +
    uniformFee +
    scrubFee;

  const termAdditionalFeesPaid =
    adminPaid +
    uniformPaid +
    scrubPaid;

  const termAdditionalFeesBalance = Math.max(
    termAdditionalFeesTotal - termAdditionalFeesPaid,
    0,
  );

  const academicProgress = Math.min(
    Math.max(Number(student.academic_progress_percent || 0), 0),
    100,
  );

  const completedTerms = Number(
    student.academic_completed_terms || 0,
  );

  const currentTerm = Number(
    student.academic_current_term || 1,
  );

  /* =========================================================
     PAYMENT HISTORY

     Only actual records from student_fee_payments are displayed.
     Uniform and scrub charges do not create payment history
     entries unless an actual payment is recorded.
  ========================================================= */

  const paymentsResult = await pool.query(
    `
    SELECT
      id,
      receipt_number,
      mpesa_code,
      phone_number,
      amount_paid,
      payment_method,
      payment_date,
      recorded_at,
      payment_component,
      term_number

    FROM student_fee_payments

    WHERE application_id = $1

    ORDER BY
      COALESCE(payment_date, recorded_at) DESC,
      id DESC
    `,
    [student.id],
  );

  const paymentHistory =
    paymentsResult.rows as FeePayment[];

  /* =========================================================
     CLIENT PAYMENT DATA
  ========================================================= */

  const paymentData = {
    applicationNumber: String(student.application_number),
    applicationId: Number(student.id),
    fullName,
    course: String(course),
    intake: String(intake),
    applicationFee: feeApplicationFee,
    paymentStatus,
    paymentPhone: String(paymentPhone || ''),
    mpesaReceiptNumber: student.mpesa_receipt_number
      ? String(student.mpesa_receipt_number)
      : null,
    mpesaTransactionDate: paymentDate,
    isPaid,
  };

  function getReceiptUrl(paymentId: number) {
    return `/api/student/fees/payments/${paymentId}/receipt?download=1`;
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">

          <Link
            href="/student/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#0f4f3f]"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          {/* PAGE INTRO */}

          <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-[#0f4f3f]">
                Student Finance
              </p>

              <h2 className="mt-1 text-2xl font-bold text-[#0c1f1a] sm:text-3xl">
                Fees & Payments
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                View your approved fee structure, application fee,
                selected fee items, term payments, outstanding balances,
                academic progress and payment receipts.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400">
                Application Number
              </p>

              <span className="mt-1 inline-block rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs font-bold text-gray-700">
                {student.application_number}
              </span>
            </div>
          </div>

          {/* =====================================================
              COURSE FEE SUMMARY
          ===================================================== */}

          <section className="mb-7">
            <SectionHeading
              icon={<GraduationCap size={21} />}
              title="Course Fees Summary"
              description="Your approved 2026/2027 fee account"
            />

            {!hasFeeAccount ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={22}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <h4 className="font-bold text-amber-900">
                      Course fee structure not available
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      The college has not yet configured an approved fee
                      structure for your registered course. Please contact
                      the accounts office.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* COURSE DETAILS */}

                <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Registered Programme
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-[#0c1f1a]">
                        {student.fee_course_name || course}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Duration: {student.course_duration || 'Not specified'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#0f4f3f]/10 px-3 py-1.5 text-xs font-bold text-[#0f4f3f]">
                        {isTermBased
                          ? 'Term-Based Programme'
                          : 'One-Time Programme'}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                        Academic Year 2026/2027
                      </span>
                    </div>
                  </div>
                </div>

                {/* TOTALS */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FeeSummaryCard
                    label="Total Fees"
                    amount={formatKES(totalFees)}
                    description="Application fee, tuition, administration and selected fee items"
                    icon={<WalletCards size={22} />}
                    color="green"
                  />

                  <FeeSummaryCard
                    label="Total Amount Paid"
                    amount={formatKES(totalPaid)}
                    description="Actual recorded course payments and verified application fee"
                    icon={<CheckCircle2 size={22} />}
                    color="blue"
                  />

                  <FeeSummaryCard
                    label="Outstanding Balance"
                    amount={formatKES(balance)}
                    description={
                      feesCleared
                        ? 'Your fee account is fully cleared'
                        : 'Remaining amount to clear your fee account'
                    }
                    icon={
                      feesCleared
                        ? <CheckCircle2 size={22} />
                        : <Clock3 size={22} />
                    }
                    color={feesCleared ? 'green' : 'gold'}
                  />
                </div>

                {/* FEE PAYMENT PROGRESS */}

                <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h4 className="font-bold text-[#0c1f1a]">
                        Fee Payment Progress
                      </h4>

                      <p className="mt-1 text-xs text-gray-500">
                        Percentage of total fees covered by actual recorded
                        payments and verified application fee
                      </p>
                    </div>

                    <p className="text-lg font-bold text-[#0f4f3f]">
                      {paymentProgress.toFixed(1)}%
                    </p>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#0f4f3f] transition-all duration-500"
                      style={{ width: `${paymentProgress}%` }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between gap-3 text-xs text-gray-500">
                    <span>Paid: {formatKES(totalPaid)}</span>
                    <span>Total: {formatKES(totalFees)}</span>
                  </div>
                </div>

                {/* FEE BREAKDOWN */}

                <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="border-b border-gray-100 p-5">
                    <h4 className="font-bold text-[#0c1f1a]">
                      Fee Breakdown
                    </h4>

                    <p className="mt-1 text-xs text-gray-500">
                      Your application fee, tuition, administrative charges
                      and selected additional items.
                    </p>
                  </div>

                  <div className="divide-y divide-gray-100">

                    {/* APPLICATION FEE */}

                    <FeeBreakdownRow
                      title="Application Fee"
                      amount={formatKES(feeApplicationFee)}
                      paid={formatKES(applicationFeePaid)}
                      balance={formatKES(applicationFeeBalance)}
                    />

                    {/* ONE-TIME PROGRAMMES */}

                    {!isTermBased ? (
                      <FeeBreakdownRow
                        title="Programme Tuition + Selected Uniform/Scrub + Administrative Charges (once)"
                        amount={formatKES(oneTimeProgrammeTotal)}
                        paid={formatKES(oneTimeProgrammePaid)}
                        balance={formatKES(oneTimeProgrammeBalance)}
                        paidNote={
                          uniformFee > 0 || scrubFee > 0
                            ? 'Uniform and scrub are included in the fees but are not automatically credited as paid'
                            : undefined
                        }
                      />
                    ) : (
                      <>
                        {/* TERM-BASED TUITION */}

                        <FeeBreakdownRow
                          title={`Programme Tuition (${totalTerms} academic terms)`}
                          amount={formatKES(tuitionTotal)}
                          paid={formatKES(tuitionPaid)}
                          balance={formatKES(tuitionBalance)}
                        />

                        {/* ADMIN + SELECTED UNIFORM/SCRUB */}

                        <FeeBreakdownRow
                          title="Administrative Charges (once) + Selected Uniform/Scrub"
                          amount={formatKES(termAdditionalFeesTotal)}
                          paid={formatKES(termAdditionalFeesPaid)}
                          balance={formatKES(termAdditionalFeesBalance)}
                          paidNote={
                            uniformFee > 0 || scrubFee > 0
                              ? 'Uniform and scrub are included in the fees but are not automatically credited as paid'
                              : undefined
                          }
                        />
                      </>
                    )}
                  </div>

                  {(uniformFee > 0 || scrubFee > 0) && (
                    <div className="border-t border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs leading-5 text-amber-800">
                        <strong>Selected fee items:</strong>{' '}
                        {uniformFee > 0 && scrubFee > 0
                          ? 'Your school uniform and purple medical scrub'
                          : uniformFee > 0
                            ? 'Your school uniform'
                            : 'Your purple medical scrub'}{' '}
                        have been included in your total fees. These charges
                        remain outstanding until payment is recorded by the
                        college accounts office. They are not automatically
                        counted as paid and do not create separate M-Pesa
                        transactions.
                      </p>
                    </div>
                  )}
                </div>

                {/* TERM PAYMENT DETAILS */}

                {isTermBased && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-5">
                      <div className="flex items-center gap-3">
                        <CalendarDays
                          className="text-[#0f4f3f]"
                          size={21}
                        />

                        <div>
                          <h4 className="font-bold text-[#0c1f1a]">
                            Academic Term Fee Details
                          </h4>

                          <p className="mt-1 text-xs text-gray-500">
                            Tuition allocation and payment status for each term
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {Array.from(
                        { length: totalTerms },
                        (_, index) => {
                          const term = index + 1;

                          const paid = Number(
                            termPayments.find(
                              (item) =>
                                Number(item.term_number) === term,
                            )?.amount_paid || 0,
                          );

                          const termBalance = Math.max(
                            tuitionFee - paid,
                            0,
                          );

                          const percentage = tuitionFee > 0
                            ? Math.min(
                                (paid / tuitionFee) * 100,
                                100,
                              )
                            : 0;

                          const isTermPaid =
                            termBalance <= 0 && tuitionFee > 0;

                          return (
                            <div key={term} className="p-5">
                              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                  <p className="font-bold text-[#0c1f1a]">
                                    Term {term}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    {paid > 0
                                      ? `${percentage.toFixed(1)}% of term tuition paid`
                                      : 'No payment recorded for this term'}
                                  </p>
                                </div>

                                <div className="text-left sm:text-right">
                                  <p className="font-bold text-[#0f4f3f]">
                                    {formatKES(paid)}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    of {formatKES(tuitionFee)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-[#0f4f3f]"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>

                              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-gray-500">
                                  Balance: {formatKES(termBalance)}
                                </p>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    isTermPaid
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : paid > 0
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {isTermPaid
                                    ? 'Fully Paid'
                                    : paid > 0
                                      ? 'Partially Paid'
                                      : 'Pending'}
                                </span>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* ACCOUNT STATUS */}

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4">
                  {feesCleared ? (
                    <CheckCircle2
                      size={21}
                      className="shrink-0 text-emerald-600"
                    />
                  ) : (
                    <Clock3
                      size={21}
                      className="shrink-0 text-amber-600"
                    />
                  )}

                  <div>
                    <p className="text-sm font-bold text-[#0c1f1a]">
                      {feesCleared
                        ? 'Fees Fully Cleared'
                        : 'Fees Payment Ongoing'}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {feesCleared
                        ? 'Your recorded payments have cleared your fee account.'
                        : `You have ${formatKES(balance)} remaining on your fee account.`}
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* =====================================================
              ACADEMIC PROGRESS
          ===================================================== */}

          <section className="mb-7">
            <SectionHeading
              icon={<BookOpen size={21} />}
              title="Academic Progress"
              description="Your academic progress is separate from your fee payment progress"
            />

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Course Completion
                  </p>

                  <p className="mt-1 text-2xl font-bold text-[#0f4f3f]">
                    {academicProgress.toFixed(1)}%
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Progress recorded by the college administration
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                    student.academic_status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : student.academic_status === 'SUSPENDED'
                        ? 'bg-amber-50 text-amber-700'
                        : student.academic_status === 'WITHDRAWN'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {String(
                    student.academic_status || 'IN_PROGRESS',
                  ).replaceAll('_', ' ')}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${academicProgress}%` }}
                />
              </div>

              {isTermBased && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InfoItem
                    label="Current Academic Term"
                    value={`Term ${currentTerm} of ${totalTerms}`}
                  />

                  <InfoItem
                    label="Completed Terms"
                    value={`${completedTerms} of ${totalTerms}`}
                  />
                </div>
              )}

              <div className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
                <InfoItem
                  label="Course Start Date"
                  value={formatDate(student.course_start_date)}
                />

                <InfoItem
                  label="Expected Completion Date"
                  value={formatDate(student.expected_completion_date)}
                />
              </div>

              <p className="mt-5 rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-800">
                Academic progress is updated by the college. Paying your
                course fees does not automatically mark academic terms or
                course requirements as completed.
              </p>
            </div>
          </section>

          {/* =====================================================
              PAYMENT HISTORY
          ===================================================== */}

          <section className="mb-7 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                  <History size={21} />
                </div>

                <div>
                  <h3 className="font-bold text-[#0c1f1a]">
                    Fee Payment History
                  </h3>

                  <p className="text-xs text-gray-500">
                    Payments recorded by the college accounts office
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-[#0f4f3f]/10 px-3 py-1.5 text-xs font-bold text-[#0f4f3f]">
                {paymentHistory.length} Payment
                {paymentHistory.length === 1 ? '' : 's'}
              </span>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Receipt size={25} />
                </div>

                <h4 className="mt-4 font-bold text-gray-800">
                  No fee payments recorded
                </h4>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Your course fee payments will appear here once recorded
                  by the college accounts office.
                </p>
              </div>
            ) : (
              <>
                {/* DESKTOP TABLE */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f8faf9] text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Date Paid</th>
                        <th className="px-5 py-4 font-semibold">Receipt</th>
                        <th className="px-5 py-4 font-semibold">Reference Code</th>
                        <th className="px-5 py-4 font-semibold">Category</th>
                        <th className="px-5 py-4 font-semibold">Method</th>
                        <th className="px-5 py-4 text-right font-semibold">Amount</th>
                        <th className="px-5 py-4 text-center font-semibold">Receipt</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {paymentHistory.map((payment) => (
                        <tr
                          key={payment.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                            {formatDate(
                              payment.payment_date || payment.recorded_at,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-bold text-[#0f4f3f]">
                              {payment.receipt_number || '—'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-semibold text-gray-700">
                              {payment.mpesa_code || '—'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {paymentComponentLabel(
                              payment.payment_component,
                              payment.term_number,
                            )}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {payment.payment_method || '—'}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-[#0f4f3f]">
                            {formatKES(payment.amount_paid)}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <Link
                              href={getReceiptUrl(payment.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#0f4f3f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0c1f1a]"
                            >
                              <Download size={15} />
                              Download
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE PAYMENT CARDS */}

                <div className="divide-y divide-gray-100 md:hidden">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="space-y-4 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">
                            Receipt Number
                          </p>

                          <p className="mt-1 break-all font-mono text-xs font-bold text-[#0f4f3f]">
                            {payment.receipt_number || '—'}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-[#0f4f3f]">
                          {formatKES(payment.amount_paid)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <InfoItem
                          label="Reference Code"
                          value={payment.mpesa_code || '—'}
                        />

                        <InfoItem
                          label="Payment Method"
                          value={payment.payment_method || '—'}
                        />

                        <InfoItem
                          label="Payment Category"
                          value={paymentComponentLabel(
                            payment.payment_component,
                            payment.term_number,
                          )}
                        />

                        <InfoItem
                          label="Payment Date"
                          value={formatDate(
                            payment.payment_date || payment.recorded_at,
                          )}
                        />

                        <InfoItem
                          label="Phone Number"
                          value={payment.phone_number || '—'}
                        />
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <Link
                          href={getReceiptUrl(payment.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f4f3f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0c1f1a]"
                        >
                          <Download size={17} />
                          Download Payment Receipt
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* HISTORY TOTAL */}

                <div className="flex flex-col justify-between gap-2 border-t border-gray-100 bg-[#f8faf9] p-5 sm:flex-row sm:items-center">
                  <p className="text-sm font-semibold text-gray-600">
                    Total Course Payments Recorded
                  </p>

                  <p className="text-lg font-bold text-[#0f4f3f]">
                    {formatKES(student.course_payments_total)}
                  </p>
                </div>
              </>
            )}
          </section>

          {/* =====================================================
              APPLICATION FEE
          ===================================================== */}

          <section className="mb-7">
            <SectionHeading
              icon={<CreditCard size={21} />}
              title="Application Fee"
              description="Your application processing payment, separate from course tuition"
            />

            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="grid md:grid-cols-3">
                <div className="p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d7a93b]/15 text-[#a67d13]">
                      <WalletCards size={22} />
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        Application Fee
                      </p>

                      <p className="mt-1 text-xl font-bold text-[#0c1f1a]">
                        {formatKES(feeApplicationFee)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t bg-[#fafcfb] p-6 md:border-l md:border-t-0 sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                      {isPaid ? (
                        <CheckCircle2 size={22} />
                      ) : isRejected ? (
                        <AlertCircle size={22} />
                      ) : (
                        <Clock3 size={22} />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        Payment Status
                      </p>

                      <span
                        className={`mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClass}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t p-6 md:border-l md:border-t-0 sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShieldCheck size={22} />
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        Application Status
                      </p>

                      <p className="mt-1 text-sm font-bold text-[#0c1f1a]">
                        {applicationStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-5">
              <PaymentClient payment={paymentData} />
            </div>
          </section>

          {/* =====================================================
              STUDENT INFORMATION
          ===================================================== */}

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                <FileText size={21} />
              </div>

              <div>
                <h3 className="font-bold text-[#0c1f1a]">
                  Student Information
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Your registration and payment account details.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Student Name" value={fullName} />

              <InfoItem
                label="Application Number"
                value={student.application_number}
              />

              <InfoItem
                label="Admission Number"
                value={student.admission_number || 'Not assigned'}
              />

              <InfoItem label="Course" value={course} />

              <InfoItem label="Intake" value={intake} />

              <InfoItem
                label="Admission Status"
                value={student.admission_status || 'Not available'}
              />

              <InfoItem label="Date Submitted" value={applicationDate} />

              <InfoItem
                label="Registered Phone"
                value={paymentPhone || 'Not provided'}
              />

              <InfoItem
                label="Application M-Pesa Receipt"
                value={student.mpesa_receipt_number || 'Not available'}
                highlight={Boolean(student.mpesa_receipt_number)}
              />

              <InfoItem
                label="Application Payment Date"
                value={paymentDate}
              />
            </div>
          </section>

          {/* =====================================================
              SECURITY NOTICE
          ===================================================== */}

          <div className="mt-6 rounded-2xl border border-[#d7a93b]/20 bg-[#fffdf5] p-5">
            <div className="flex gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-[#a67d13]"
              />

              <div>
                <p className="text-sm font-semibold text-[#0c1f1a]">
                  Important payment information
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Your total fee balance includes the application fee,
                  approved course tuition, administrative charges and any
                  additional items selected on your student fee account,
                  such as the SMTC school uniform or purple medical scrub.
                  Uniform and scrub charges are included in your total fees
                  but are not automatically credited as paid. They remain
                  outstanding until the corresponding payment is recorded
                  by the college accounts office. For one-time programmes,
                  tuition, selected uniform/scrub and administrative
                  charges are combined into one fee breakdown item. For
                  term-based programmes, tuition is tracked separately
                  for each academic term, while administrative charges
                  and selected uniform/scrub are combined into one
                  additional-fees item. Administrative charges are payable
                  once. Academic progress is maintained independently of
                  payment progress. Always retain your payment confirmation
                  messages and official receipts. Contact the accounts
                  office if a payment is missing or your balance appears
                  incorrect.
                </p>
              </div>
            </div>
          </div>

          {/* FOOTER */}

          <div className="py-8 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Shifah Medical Training College.
              All rights reserved.
            </p>

            <p className="mt-1 text-[11px] text-gray-400">
              Student Portal • Secure Student Access
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
        {icon}
      </div>

      <div>
        <h3 className="font-bold text-[#0c1f1a]">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

/* =========================================================
   FEE SUMMARY CARD
========================================================= */

function FeeSummaryCard({
  label,
  amount,
  description,
  icon,
  color,
}: {
  label: string;
  amount: string;
  description: string;
  icon: ReactNode;
  color: 'green' | 'blue' | 'gold';
}) {
  const colors = {
    green: {
      icon: 'bg-[#0f4f3f]/10 text-[#0f4f3f]',
      amount: 'text-[#0f4f3f]',
    },
    blue: {
      icon: 'bg-blue-50 text-blue-600',
      amount: 'text-blue-700',
    },
    gold: {
      icon: 'bg-[#d7a93b]/15 text-[#a67d13]',
      amount: 'text-[#a67d13]',
    },
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color].icon}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-4 text-2xl font-bold ${colors[color].amount}`}>
        {amount}
      </p>

      <p className="mt-2 text-xs leading-5 text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   FEE BREAKDOWN ROW
========================================================= */

function FeeBreakdownRow({
  title,
  amount,
  paid,
  balance,
  paidNote,
}: {
  title: string;
  amount: string;
  paid: string;
  balance: string;
  paidNote?: string;
}) {
  return (
    <div className="grid gap-3 p-5 sm:grid-cols-4 sm:items-center">
      <div className="sm:col-span-1">
        <p className="text-sm font-bold text-[#0c1f1a]">
          {title}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-400">Required</p>

        <p className="mt-1 text-sm font-semibold text-gray-800">
          {amount}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-400">Paid</p>

        <p className="mt-1 text-sm font-semibold text-emerald-700">
          {paid}
        </p>

        {paidNote && (
          <p className="mt-1 text-[11px] text-amber-700">
            {paidNote}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs text-gray-400">Balance</p>

        <p className="mt-1 text-sm font-semibold text-[#a67d13]">
          {balance}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   INFORMATION ITEM
========================================================= */

function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1.5 break-words text-sm font-semibold ${
          highlight ? 'text-[#0f4f3f]' : 'text-gray-800'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}
