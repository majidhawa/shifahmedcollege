import Link from 'next/link';
import { notFound } from 'next/navigation';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

type ReceiptPageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function FeeReceiptPage({
  params,
}: ReceiptPageProps) {
  const admin = requireAdmin();

  if (!admin) return null;

  const { paymentId } = await params;
  const id = Number(paymentId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const result = await pool.query(
    `
      SELECT
        fp.id,
        fp.receipt_number,
        fp.mpesa_code,
        fp.phone_number,
        fp.amount_paid,
        fp.payment_method,
        fp.payment_date,

        ad.admission_number,
        ad.intake,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(' ', a.surname, a.middle_name, a.first_name)
        ) AS student_name,

        COALESCE(NULLIF(ad.course, ''), a.course) AS course,

        COALESCE(fa.total_fee, 0) AS total_fee,

        (
          SELECT COALESCE(SUM(p.amount_paid), 0)
          FROM student_fee_payments p
          WHERE p.application_id = fp.application_id
            AND (
              p.payment_date < fp.payment_date
              OR (
                p.payment_date = fp.payment_date
                AND p.id <= fp.id
              )
            )
        ) AS total_paid_at_receipt

      FROM student_fee_payments fp

      INNER JOIN applications a
        ON a.id = fp.application_id

      INNER JOIN admissions ad
        ON ad.application_id = a.id

      INNER JOIN student_fee_accounts fa
        ON fa.id = fp.fee_account_id

      WHERE fp.id = $1
      LIMIT 1
    `,
    [id],
  );

  if (result.rows.length === 0) {
    notFound();
  }

  const payment = result.rows[0];

  const totalFee = Number(payment.total_fee || 0);
  const totalPaid = Number(payment.total_paid_at_receipt || 0);
  const balance = Math.max(totalFee - totalPaid, 0);

  const formatCurrency = (amount: number) =>
    `KSh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const paymentDate = new Date(payment.payment_date);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/admin/dashboard/payments"
            className="text-sm font-semibold text-brand-green hover:text-brand-dark"
          >
            ← Back to Payments
          </Link>

          <span className="text-sm font-semibold text-slate-600">
            Use your browser7s print command to print this receipt.
          </span>
        </div>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-brand-green px-8 py-8 text-center text-white">
            <h1 className="text-2xl font-extrabold">
              SHIFAH MEDICAL TRAINING COLLEGE
            </h1>

            <p className="mt-2 text-sm text-white/80">
              Health through Innovation and Research
            </p>

            <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-brand-gold" />

            <h2 className="mt-5 text-xl font-bold tracking-widest">
              OFFICIAL PAYMENT RECEIPT
            </h2>
          </div>

          <div className="space-y-7 p-6 sm:p-9">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Receipt Number
                </p>

                <p className="mt-1 font-mono text-lg font-extrabold text-brand-green">
                  {payment.receipt_number}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Payment Date
                </p>

                <p className="mt-1 font-semibold text-brand-dark">
                  {paymentDate.toLocaleString('en-KE', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                Student Information
              </h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <ReceiptField
                  label="Student Name"
                  value={payment.student_name}
                />

                <ReceiptField
                  label="Admission Number"
                  value={payment.admission_number}
                />

                <ReceiptField
                  label="Phone Number"
                  value={payment.phone_number || '—'}
                />

                <ReceiptField
                  label="Course"
                  value={payment.course}
                />

                <ReceiptField
                  label="Intake"
                  value={payment.intake || '—'}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                Payment Information
              </h3>

              <div className="rounded-xl border border-slate-200">
                <div className="flex justify-between gap-4 border-b border-slate-100 p-4">
                  <span className="text-sm text-slate-500">
                    Payment Method
                  </span>

                  <span className="text-sm font-semibold text-brand-dark">
                    {payment.payment_method}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-slate-100 p-4">
                  <span className="text-sm text-slate-500">
                    M-Pesa/Bank Transaction Code
                  </span>

                  <span className="font-mono text-sm font-bold text-brand-dark">
                    {payment.mpesa_code}
                  </span>
                </div>

                <div className="flex justify-between gap-4 p-4">
                  <span className="text-sm text-slate-500">
                    Amount Received
                  </span>

                  <span className="text-lg font-extrabold text-brand-green">
                    {formatCurrency(Number(payment.amount_paid))}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-brand-cream p-5">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-dark">
                Fee Account Summary
              </h3>

              <div className="space-y-3">
                <SummaryRow
                  label="Total Course Fee"
                  value={formatCurrency(totalFee)}
                />

                <SummaryRow
                  label="Total Paid (including this payment)"
                  value={formatCurrency(totalPaid)}
                />

                <div className="border-t border-brand-gold/30 pt-3">
                  <SummaryRow
                    label="Remaining Balance"
                    value={formatCurrency(balance)}
                    bold
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 text-center">
              <p className="text-sm font-semibold text-brand-dark">
                Thank you for your payment.
              </p>

              <p className="mt-2 text-xs text-slate-500">
                This is a computer-generated receipt issued by Shifah Medical
                Training College.
              </p>

              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-brand-green">
                Health through Innovation and Research
              </p>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

function ReceiptField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-brand-dark">
        {value || '—'}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${bold ? 'font-bold text-brand-dark' : 'text-slate-600'}`}>
        {label}
      </span>

      <span className={`${bold ? 'text-lg font-extrabold text-brand-green' : 'text-sm font-semibold text-brand-dark'}`}>
        {value}
      </span>
    </div>
  );
}