
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
} from 'lucide-react';

import PaymentClient from './PaymentClient';

export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type FeePayment = {
  id: number;
  receipt_number: string | null;
  mpesa_code: string | null;
  phone_number: string | null;
  amount_paid: number | string;
  payment_method: string | null;
  payment_date: string | Date | null;
  recorded_at: string | Date | null;
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
};

type FeeAccount = {
  id: number;
  total_fee: number | string;
  total_paid: number | string;
};

/* =========================================================
   HELPERS
========================================================= */

function formatKES(
  value: number | string | null | undefined
) {
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

  // M-Pesa format: YYYYMMDDHHmmss
  if (/^\d{14}$/.test(rawDate)) {
    const date = new Date(
      Number(rawDate.substring(0, 4)),
      Number(rawDate.substring(4, 6)) - 1,
      Number(rawDate.substring(6, 8)),
      Number(rawDate.substring(8, 10)),
      Number(rawDate.substring(10, 12)),
      Number(rawDate.substring(12, 14))
    );

    return Number.isNaN(date.getTime())
      ? '—'
      : formatDateTime(date);
  }

  return formatDateTime(rawDate);
}

/* =========================================================
   STUDENT PAYMENT PAGE
========================================================= */

export default async function StudentPaymentPage() {
  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  const session = await getStudentSession();

  if (!session) {
    redirect('/student/login');
  }

  /* =======================================================
     GET AUTHENTICATED APPLICATION
  ======================================================= */

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
        admission.student_name

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

      WHERE app.id = $1
        AND app.application_number = $2

      LIMIT 1
    `,
    [
      session.applicationId,
      session.applicationNumber,
    ]
  );

  if (result.rows.length === 0) {
    redirect('/student/login');
  }

  const student = result.rows[0] as StudentRow;

  /* =======================================================
     STUDENT DETAILS
  ======================================================= */

  const fullName =
    student.student_name ||
    [
      student.first_name,
      student.middle_name,
      student.surname,
    ]
      .filter(Boolean)
      .join(' ') ||
    'Student';

  const course =
    student.admission_course ||
    student.application_course ||
    '—';

  const intake =
    student.admission_intake ||
    student.application_intake ||
    '—';

  /* =======================================================
     APPLICATION FEE DETAILS

     This is separate from tuition/course fees.
  ======================================================= */

  const paymentStatus = String(
    student.payment_status || 'Pending'
  );

  const paymentStatusLower =
    paymentStatus.trim().toLowerCase();

  const isPaid = paymentStatusLower === 'paid';

  const isRejected =
    paymentStatusLower === 'rejected';

  const applicationStatus = String(
    student.application_status || 'Pending'
  );

  const applicationFee = Number(
    student.application_fee || 0
  );

  const paymentPhone =
    student.mpesa_phone_number ||
    student.mobile ||
    '';

  const paymentDate = formatMpesaDate(
    student.mpesa_transaction_date
  );

  const applicationDate = formatDate(
    student.created_at
  );

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

  /* =======================================================
     GET STUDENT FEE ACCOUNT

     student_fee_accounts:
       application_id
       total_fee

     student_fee_payments:
       application_id
       amount_paid
       receipt_number
       mpesa_code
       phone_number
       payment_method
       payment_date
       recorded_at
  ======================================================= */

  const feeAccountResult = await pool.query(
    `
      SELECT
        fa.id,
        fa.total_fee,

        COALESCE(
          (
            SELECT SUM(fp.amount_paid)
            FROM student_fee_payments fp
            WHERE fp.application_id = fa.application_id
          ),
          0
        ) AS total_paid

      FROM student_fee_accounts fa

      WHERE fa.application_id = $1

      LIMIT 1
    `,
    [student.id]
  );

  const feeAccount =
    (feeAccountResult.rows[0] as FeeAccount | undefined) ||
    null;

  const totalFees = Number(
    feeAccount?.total_fee || 0
  );

  const totalPaid = Number(
    feeAccount?.total_paid || 0
  );

  const balance = Math.max(
    totalFees - totalPaid,
    0
  );

  const hasFeeAccount = Boolean(feeAccount);

  const feesCleared =
    hasFeeAccount &&
    totalFees > 0 &&
    balance <= 0;

  const paymentProgress =
    totalFees > 0
      ? Math.min(
          (totalPaid / totalFees) * 100,
          100
        )
      : 0;

  /* =======================================================
     GET STUDENT PAYMENT HISTORY
  ======================================================= */

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
        recorded_at

      FROM student_fee_payments

      WHERE application_id = $1

      ORDER BY
        COALESCE(payment_date, recorded_at) DESC,
        id DESC
    `,
    [student.id]
  );

  const paymentHistory =
    paymentsResult.rows as FeePayment[];

  /* =======================================================
     CLIENT PAYMENT DATA

     Retains the existing application-fee payment workflow.
  ======================================================= */

  const paymentData = {
    applicationNumber: String(
      student.application_number
    ),

    applicationId: Number(student.id),

    fullName,

    course: String(course),

    intake: String(intake),

    applicationFee,

    paymentStatus,

    paymentPhone: String(paymentPhone || ''),

    mpesaReceiptNumber:
      student.mpesa_receipt_number
        ? String(student.mpesa_receipt_number)
        : null,

    mpesaTransactionDate: paymentDate,

    isPaid,
  };

  /* =======================================================
     RECEIPT DOWNLOAD URL
  ======================================================= */

  function getReceiptUrl(paymentId: number) {
    return `/api/student/fees/payments/${paymentId}/receipt?download=1`;
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f8faf9]">

      <main className="px-4 py-6 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-7xl">

          {/* BACK */}

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
                View your course fees, payments received,
                outstanding balance and download your
                individual payment receipts.
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

          {/* =================================================
              COURSE FEES SUMMARY
          ================================================= */}

          <section className="mb-7">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                <GraduationCap size={21} />
              </div>

              <div>
                <h3 className="font-bold text-[#0c1f1a]">
                  Course Fees Summary
                </h3>

                <p className="text-xs text-gray-500">
                  Your registered course fee account
                </p>
              </div>

            </div>

            {!hasFeeAccount ? (

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">

                <div className="flex items-start gap-3">

                  <AlertCircle
                    size={22}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>

                    <h4 className="font-bold text-amber-900">
                      Fee account not yet available
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Your course fee structure has not yet
                      been assigned to your student account.
                      Please contact the college accounts
                      office for assistance.
                    </p>

                  </div>

                </div>

              </div>

            ) : (

              <>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                  <FeeSummaryCard
                    label="Total Course Fees"
                    amount={formatKES(totalFees)}
                    description="Total amount required for your course"
                    icon={<WalletCards size={22} />}
                    color="green"
                  />

                  <FeeSummaryCard
                    label="Total Amount Paid"
                    amount={formatKES(totalPaid)}
                    description="All payments recorded in your account"
                    icon={<CheckCircle2 size={22} />}
                    color="blue"
                  />

                  <FeeSummaryCard
                    label="Outstanding Balance"
                    amount={formatKES(balance)}
                    description={
                      feesCleared
                        ? 'Your course fees are fully paid'
                        : 'Amount remaining to clear your fees'
                    }
                    icon={
                      feesCleared
                        ? <CheckCircle2 size={22} />
                        : <Clock3 size={22} />
                    }
                    color={
                      feesCleared ? 'green' : 'gold'
                    }
                  />

                </div>

                {/* PAYMENT PROGRESS */}

                <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">

                    <div>
                      <h4 className="font-bold text-[#0c1f1a]">
                        Fee Payment Progress
                      </h4>

                      <p className="mt-1 text-xs text-gray-500">
                        Percentage of your course fees paid
                      </p>
                    </div>

                    <p className="text-lg font-bold text-[#0f4f3f]">
                      {paymentProgress.toFixed(1)}%
                    </p>

                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">

                    <div
                      className="h-full rounded-full bg-[#0f4f3f] transition-all duration-500"
                      style={{
                        width: `${paymentProgress}%`,
                      }}
                    />

                  </div>

                  <div className="mt-3 flex justify-between gap-3 text-xs text-gray-500">

                    <span>
                      Paid: {formatKES(totalPaid)}
                    </span>

                    <span>
                      Total: {formatKES(totalFees)}
                    </span>

                  </div>

                </div>

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
                        ? 'Your recorded payments have cleared your course fees.'
                        : `You have ${formatKES(balance)} remaining on your fee account.`}
                    </p>

                  </div>

                </div>

              </>

            )}

          </section>

          {/* =================================================
              PAYMENT HISTORY
          ================================================= */}

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
                    View payments and download individual receipts
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
                  Your course fee payments will appear here
                  once they have been recorded and confirmed
                  by the college accounts office.
                </p>

              </div>

            ) : (

              <>

                {/* DESKTOP PAYMENT TABLE */}

                <div className="hidden overflow-x-auto md:block">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-[#f8faf9] text-xs uppercase tracking-wider text-gray-500">

                      <tr>

                        <th className="px-6 py-4 font-semibold">
                          Date
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          Receipt Number
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          M-Pesa Code
                        </th>

                        <th className="px-6 py-4 font-semibold">
                          Payment Method
                        </th>

                        <th className="px-6 py-4 text-right font-semibold">
                          Amount Paid
                        </th>

                        <th className="px-6 py-4 text-center font-semibold">
                          Receipt
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-gray-100">

                      {paymentHistory.map((payment) => (

                        <tr
                          key={payment.id}
                          className="transition hover:bg-gray-50"
                        >

                          <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                            {formatDateTime(
                              payment.payment_date ||
                              payment.recorded_at
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-[#0f4f3f]">
                              {payment.receipt_number || '—'}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-semibold text-gray-700">
                              {payment.mpesa_code || '—'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-gray-600">
                            {payment.payment_method || 'M-Pesa'}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-[#0f4f3f]">
                            {formatKES(payment.amount_paid)}
                          </td>

                          <td className="px-6 py-4 text-center">

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
                          label="M-Pesa Code"
                          value={payment.mpesa_code || '—'}
                        />

                        <InfoItem
                          label="Payment Method"
                          value={payment.payment_method || 'M-Pesa'}
                        />

                        <InfoItem
                          label="Payment Date"
                          value={formatDateTime(
                            payment.payment_date ||
                            payment.recorded_at
                          )}
                        />

                        <InfoItem
                          label="Phone Number"
                          value={payment.phone_number || '—'}
                        />

                      </div>

                      {/* DOWNLOAD RECEIPT */}

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

                {/* PAYMENT HISTORY TOTAL */}

                <div className="flex flex-col justify-between gap-2 border-t border-gray-100 bg-[#f8faf9] p-5 sm:flex-row sm:items-center">

                  <p className="text-sm font-semibold text-gray-600">
                    Total Payments Recorded
                  </p>

                  <p className="text-lg font-bold text-[#0f4f3f]">
                    {formatKES(totalPaid)}
                  </p>

                </div>

              </>

            )}

          </section>

          {/* =================================================
              APPLICATION FEE PAYMENT

              Kept separate from course fees.
          ================================================= */}

          <section className="mb-7">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d7a93b]/15 text-[#a67d13]">
                <CreditCard size={21} />
              </div>

              <div>
                <h3 className="font-bold text-[#0c1f1a]">
                  Application Fee
                </h3>

                <p className="text-xs text-gray-500">
                  Your application processing payment
                </p>
              </div>

            </div>

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
                        {formatKES(applicationFee)}
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

            {/* EXISTING APPLICATION PAYMENT COMPONENT */}

            <div className="mt-5">
              <PaymentClient payment={paymentData} />
            </div>

          </section>

          {/* =================================================
              STUDENT INFORMATION
          ================================================= */}

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

              <InfoItem
                label="Student Name"
                value={fullName}
              />

              <InfoItem
                label="Application Number"
                value={student.application_number}
              />

              <InfoItem
                label="Admission Number"
                value={student.admission_number || 'Not assigned'}
              />

              <InfoItem
                label="Course"
                value={course}
              />

              <InfoItem
                label="Intake"
                value={intake}
              />

              <InfoItem
                label="Admission Status"
                value={student.admission_status || 'Not available'}
              />

              <InfoItem
                label="Date Submitted"
                value={applicationDate}
              />

              <InfoItem
                label="Registered Phone"
                value={paymentPhone || 'Not provided'}
              />

              <InfoItem
                label="Application M-Pesa Receipt"
                value={
                  student.mpesa_receipt_number ||
                  'Not available'
                }
                highlight={Boolean(student.mpesa_receipt_number)}
              />

              <InfoItem
                label="Application Payment Date"
                value={paymentDate}
              />

            </div>

          </section>

          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

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
                  Your course fee balance is calculated from the
                  total fees assigned to your student account
                  less all payments recorded by the college.
                  You can download an individual receipt for
                  every recorded course-fee payment. Always
                  retain your M-Pesa confirmation messages and
                  official college receipts. Contact the
                  accounts office if a payment is missing or
                  your balance appears incorrect.
                </p>

              </div>

            </div>

          </div>

          {/* FOOTER */}

          <div className="py-8 text-center">

            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Shifah Medical Training
              College. All rights reserved.
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

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color].icon}`}>
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
        className={`
          mt-1.5 break-words text-sm font-semibold
          ${
            highlight
              ? 'text-[#0f4f3f]'
              : 'text-gray-800'
          }
        `}
      >
        {value || '—'}
      </p>

    </div>
  );
}
