
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet,
  CreditCard,
  CheckCircle2,
  Clock,
  Receipt,
  GraduationCap,
  UserRound,
  CalendarDays,
  Phone,
  AlertCircle,
  ArrowDownToLine,
} from 'lucide-react';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ChildFee = {
  id: number;
  application_number: string | null;
  admission_number: string | null;
  student_name: string;
  course: string;
  intake: string | null;
  mobile: string | null;
  total_fee: number;
  total_paid: number;
};

type Payment = {
  id: number;
  application_id: number;
  receipt_number: string | null;
  mpesa_code: string | null;
  phone_number: string | null;
  amount_paid: number;
  payment_method: string | null;
  payment_date: string | Date | null;
  recorded_at: string | Date | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const currency = (amount: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

function formatDate(value: string | Date | null) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function percentage(paid: number, total: number) {
  if (total <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, Math.round((paid / total) * 100))
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default async function ParentPaymentPage() {
  const session = await getParentSession();

  if (!session) {
    redirect('/parent/login');
  }

  /* ------------------------------------------------------------------------ */
  /* GET ALL CHILDREN LINKED TO THIS PARENT                                   */
  /* ------------------------------------------------------------------------ */

  const childrenResult = await pool.query(
    `
      SELECT
        a.id,
        a.application_number,
        a.mobile,

        COALESCE(
          NULLIF(ad.admission_number, ''),
          ''
        ) AS admission_number,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(
            ' ',
            a.surname,
            a.middle_name,
            a.first_name
          )
        ) AS student_name,

        COALESCE(
          NULLIF(ad.course, ''),
          a.course,
          'Course not specified'
        ) AS course,

        ad.intake,

        /* -------------------------------------------------------------- */
        /* TOTAL FEES                                                     */
        /* -------------------------------------------------------------- */
        /*
         * fa.total_fee represents the configured programme and
         * administrative charges.
         *
         * The application fee and selected optional items are added
         * separately so that the parent sees the same overall fee
         * obligation as the student.
         */

        (
          COALESCE(fa.total_fee, 0)

          + COALESCE(fa.application_fee, 1500)

          + COALESCE(fa.uniform_fee, 0)

          + COALESCE(fa.scrub_fee, 0)
        ) AS total_fee,

        /* -------------------------------------------------------------- */
        /* TOTAL PAID                                                     */
        /* -------------------------------------------------------------- */
        /*
         * Only actual recorded course payments and a verified
         * application fee are counted as paid.
         *
         * Uniform and scrub charges are NOT automatically treated
         * as payments.
         */

        (
          COALESCE(payments.total_paid, 0)

          + CASE
              WHEN LOWER(
                TRIM(COALESCE(a.payment_status, ''))
              ) = 'paid'
              THEN COALESCE(fa.application_fee, 1500)
              ELSE 0
            END
        ) AS total_paid

      FROM parent_students ps

      INNER JOIN applications a
        ON a.id = ps.application_id

      LEFT JOIN LATERAL (
        SELECT
          admission_number,
          student_name,
          course,
          intake
        FROM admissions
        WHERE application_id = a.id
        ORDER BY id DESC
        LIMIT 1
      ) ad ON TRUE

      LEFT JOIN student_fee_accounts fa
        ON fa.application_id = a.id

      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(amount_paid), 0) AS total_paid
        FROM student_fee_payments
        WHERE application_id = a.id
      ) payments ON TRUE

      WHERE ps.parent_id = $1

      ORDER BY
        ps.is_primary DESC,
        ps.created_at DESC
    `,
    [session.parentId]
  );

  const children: ChildFee[] = childrenResult.rows.map(
    (row: any) => ({
      id: Number(row.id),
      application_number: row.application_number,
      admission_number: row.admission_number,
      student_name: row.student_name || 'Student',
      course: row.course || 'Course not specified',
      intake: row.intake,
      mobile: row.mobile,
      total_fee: Number(row.total_fee || 0),
      total_paid: Number(row.total_paid || 0),
    })
  );

  /* ------------------------------------------------------------------------ */
  /* GET PAYMENT HISTORY FOR LINKED CHILDREN ONLY                             */
  /* ------------------------------------------------------------------------ */

  let payments: Payment[] = [];

  if (children.length > 0) {
    const applicationIds = children.map((child) => child.id);

    const paymentsResult = await pool.query(
      `
        SELECT
          id,
          application_id,
          receipt_number,
          mpesa_code,
          phone_number,
          amount_paid,
          payment_method,
          payment_date,
          recorded_at

        FROM student_fee_payments

        WHERE application_id = ANY($1::bigint[])

        ORDER BY
          COALESCE(payment_date, recorded_at) DESC,
          id DESC
      `,
      [applicationIds]
    );

    payments = paymentsResult.rows.map(
      (row: any) => ({
        id: Number(row.id),
        application_id: Number(row.application_id),
        receipt_number: row.receipt_number,
        mpesa_code: row.mpesa_code,
        phone_number: row.phone_number,
        amount_paid: Number(row.amount_paid || 0),
        payment_method: row.payment_method,
        payment_date: row.payment_date,
        recorded_at: row.recorded_at,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* OVERALL TOTALS                                                           */
  /* ------------------------------------------------------------------------ */

  const totalFees = children.reduce(
    (sum, child) => sum + child.total_fee,
    0
  );

  const totalPaid = children.reduce(
    (sum, child) => sum + child.total_paid,
    0
  );

  const totalBalance = children.reduce(
    (sum, child) =>
      sum + Math.max(child.total_fee - child.total_paid, 0),
    0
  );

  const overallProgress = percentage(totalPaid, totalFees);

  /* ------------------------------------------------------------------------ */
  /* NO LINKED CHILDREN                                                       */
  /* ------------------------------------------------------------------------ */

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f6ef] p-5 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0c1f1a]">
              Fees & Payments
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              View your child's fee statements and payment records.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f1ec]">
              <GraduationCap className="h-8 w-8 text-[#0f4f3f]" />
            </div>

            <h2 className="text-lg font-bold text-gray-900">
              No student linked to your account
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              There are currently no students linked to your parent
              account. Please contact the college administration
              for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PAYMENT PAGE                                                             */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-[#f8f6ef] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0f4f3f]">
              <Wallet size={17} />
              Parent Portal
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#0c1f1a] md:text-3xl">
              Fees & Payments
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Monitor your children's fee balances and payment history.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#dce8df] bg-white px-4 py-3 text-sm text-[#0f4f3f]">
            <UserRound size={18} />

            <span className="font-medium">
              {children.length}{' '}
              {children.length === 1 ? 'Student' : 'Students'} linked
            </span>
          </div>
        </div>

        {/* OVERALL SUMMARY */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            title="Total Course Fees"
            amount={currency(totalFees)}
            description="Combined fees for linked students"
            icon={<GraduationCap size={21} />}
            iconClass="bg-blue-50 text-blue-700"
          />

          <SummaryCard
            title="Total Amount Paid"
            amount={currency(totalPaid)}
            description="Recorded payments and verified application fees"
            icon={<CheckCircle2 size={21} />}
            iconClass="bg-green-50 text-green-700"
          />

          <SummaryCard
            title="Outstanding Balance"
            amount={currency(totalBalance)}
            description="Remaining fees to be paid"
            icon={<Clock size={21} />}
            iconClass="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            title="Payment Progress"
            amount={`${overallProgress}%`}
            description="Combined fee payment progress"
            icon={<CreditCard size={21} />}
            iconClass="bg-purple-50 text-purple-700"
          />

        </div>

        {/* OVERALL PROGRESS */}
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-[#0c1f1a]">
                Overall Fee Payment Progress
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Combined progress across all linked students
              </p>
            </div>

            <span className="text-xl font-bold text-[#0f4f3f]">
              {overallProgress}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#0f4f3f] transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
            <span>Paid: {currency(totalPaid)}</span>
            <span>Remaining: {currency(totalBalance)}</span>
          </div>
        </div>

        {/* INDIVIDUAL STUDENT ACCOUNTS */}
        <div className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#0c1f1a]">
              Student Fee Accounts
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Each student's fee statement is displayed separately.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

            {children.map((child) => {
              const balance = Math.max(
                child.total_fee - child.total_paid,
                0
              );

              const progress = percentage(
                child.total_paid,
                child.total_fee
              );

              const childPayments = payments.filter(
                (payment) => payment.application_id === child.id
              );

              return (
                <div
                  key={child.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* STUDENT HEADER */}
                  <div className="border-b border-gray-100 bg-gradient-to-r from-[#0f4f3f] to-[#17664f] p-5 text-white">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                        <GraduationCap size={25} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-bold">
                          {child.student_name}
                        </h3>

                        <p className="mt-1 text-xs text-white/80">
                          Admission No:{' '}
                          {child.admission_number || 'Pending'}
                        </p>

                        <p className="mt-1 text-xs text-white/80">
                          Application No:{' '}
                          {child.application_number || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">

                    {/* STUDENT DETAILS */}
                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

                      <DetailItem
                        icon={<GraduationCap size={16} />}
                        label="Course"
                        value={child.course}
                      />

                      <DetailItem
                        icon={<CalendarDays size={16} />}
                        label="Intake"
                        value={child.intake || 'Not specified'}
                      />

                      <DetailItem
                        icon={<Phone size={16} />}
                        label="Student Phone"
                        value={child.mobile || 'Not available'}
                      />

                      <DetailItem
                        icon={<UserRound size={16} />}
                        label="Payment Records"
                        value={`${childPayments.length} payments`}
                      />

                    </div>

                    {/* FEE SUMMARY */}
                    <div className="mb-5 border-t border-gray-100 pt-5">
                      <div className="grid grid-cols-2 gap-4">

                        <div>
                          <p className="text-xs text-gray-500">
                            Total Course Fees
                          </p>

                          <p className="mt-1 text-lg font-bold text-gray-900">
                            {currency(child.total_fee)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Amount Paid
                          </p>

                          <p className="mt-1 text-lg font-bold text-green-700">
                            {currency(child.total_paid)}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-xl bg-amber-50 p-4">
                          <p className="text-xs font-medium text-amber-800">
                            Outstanding Balance
                          </p>

                          <p className="mt-1 text-2xl font-bold text-amber-900">
                            {currency(balance)}
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* STUDENT PROGRESS */}
                    <div className="mb-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">
                          Fee Payment Progress
                        </span>

                        <span className="text-sm font-bold text-[#0f4f3f]">
                          {progress}%
                        </span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#0f4f3f]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* PAYMENT STATUS */}
                    <div className="mb-5">
                      {child.total_fee > 0 && balance <= 0 ? (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
                          <CheckCircle2 size={17} />
                          Fees fully paid
                        </div>
                      ) : child.total_fee <= 0 ? (
                        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                          <AlertCircle size={17} />
                          Fee account has not been configured
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                          <Clock size={17} />
                          Payment pending — balance outstanding
                        </div>
                      )}
                    </div>

                    {/* PAYMENT HISTORY */}
                    <div className="border-t border-gray-100 pt-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-bold text-gray-900">
                          Payment History
                        </h4>

                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                          {childPayments.length} records
                        </span>
                      </div>

                      {childPayments.length === 0 ? (
                        <div className="rounded-xl bg-gray-50 px-4 py-6 text-center">
                          <Receipt className="mx-auto mb-2 h-7 w-7 text-gray-400" />

                          <p className="text-sm font-medium text-gray-700">
                            No payments recorded yet
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Payment records will appear here once the
                            college records a payment.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {childPayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="rounded-xl border border-gray-100 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900">
                                    {currency(payment.amount_paid)}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    {formatDate(
                                      payment.payment_date ||
                                      payment.recorded_at
                                    )}
                                  </p>

                                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                                    <p>
                                      Receipt:{' '}
                                      {payment.receipt_number || 'Not available'}
                                    </p>

                                    {payment.mpesa_code && (
                                      <p>
                                        M-Pesa Code: {payment.mpesa_code}
                                      </p>
                                    )}

                                    <p>
                                      Method:{' '}
                                      {payment.payment_method || 'Not specified'}
                                    </p>
                                  </div>
                                </div>

                                <Link
                                  href={`/api/parent/fees/payments/${payment.id}/receipt?download=1`}
                                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#0f4f3f] px-3 py-2 text-xs font-semibold text-[#0f4f3f] transition hover:bg-[#0f4f3f] hover:text-white"
                                >
                                  <ArrowDownToLine size={15} />
                                  Receipt
                                </Link>

                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* PAYMENT INFORMATION */}
        <div className="rounded-2xl border border-[#dce8df] bg-[#edf5ef] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white p-2 text-[#0f4f3f]">
              <AlertCircle size={20} />
            </div>

            <div>
              <h3 className="font-bold text-[#0c1f1a]">
                Important Payment Information
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-700">
                This statement reflects payments recorded in the
                Shifah Medical Training College system. Verified
                application fees are included in the amount paid.
                Selected school uniform and purple medical scrub
                charges are included in the total fees but are not
                automatically treated as payments. If you have made
                a payment that is not appearing here, kindly contact
                the college accounts office with your M-Pesa
                transaction code for verification.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  amount,
  description,
  icon,
  iconClass,
}: {
  title: string;
  amount: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </div>
      </div>

      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 break-words text-2xl font-bold text-[#0c1f1a]">
        {amount}
      </p>

      <p className="mt-2 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STUDENT DETAIL ITEM                                                        */
/* -------------------------------------------------------------------------- */

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="mt-0.5 text-[#0f4f3f]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] text-gray-500">
          {label}
        </p>

        <p className="break-words text-sm font-medium text-gray-800">
          {value}
        </p>
      </div>
    </div>
  );
}
