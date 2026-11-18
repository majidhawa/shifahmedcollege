'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Receipt,
  Search,
  Wallet,
} from 'lucide-react';

type Student = {
  application_id: number;
  application_number: string;
  admission_number: string;
  student_name: string;
  phone_number: string | null;
  course: string;
  intake: string;
  total_fee: number | string;
  total_paid: number | string;
  balance: number | string;
};

type FeePayment = {
  id: number;
  receipt_number: string;
  application_id: number;
  admission_number: string;
  student_name: string;
  course: string;
  mpesa_code: string;
  phone_number: string;
  amount_paid: number | string;
  payment_date: string;
};

type ApiData = {
  success: boolean;
  message?: string;
  students?: Student[];
  payments?: FeePayment[];
  summary?: {
    transactions: number;
    total_collected: number;
    total_billed: number;
  };
};

const currency = (amount: number | string) =>
  `KSh ${Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PaymentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [selectedId, setSelectedId] = useState('');

  const [search, setSearch] = useState('');
  const [totalFee, setTotalFee] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [summary, setSummary] = useState({
    transactions: 0,
    total_collected: 0,
    total_billed: 0,
  });

  const selectedStudent = students.find(
    (student) => String(student.application_id) === selectedId,
  );

  const totalPaid = Number(selectedStudent?.total_paid || 0);
  const fee = Number(totalFee || 0);
  const currentPayment = Number(amountPaid || 0);

  const remainingBeforePayment = Math.max(fee - totalPaid, 0);
  const balanceAfterPayment = Math.max(
    fee - totalPaid - currentPayment,
    0,
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return students;

    return students.filter((student) =>
      [
        student.student_name,
        student.admission_number,
        student.application_number,
        student.course,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [students, search]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/fees', {
        cache: 'no-store',
      });

      const data = (await response.json()) as ApiData;

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load fee records.');
      }

      setStudents(data.students || []);
      setPayments(data.payments || []);
      setSummary(
        data.summary || {
          transactions: 0,
          total_collected: 0,
          total_billed: 0,
        },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load fee records.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleStudentChange(value: string) {
    setSelectedId(value);
    setMpesaCode('');
    setAmountPaid('');
    setSuccess('');
    setError('');

    const student = students.find(
      (item) => String(item.application_id) === value,
    );

    setTotalFee(
      student && Number(student.total_fee) > 0
        ? String(student.total_fee)
        : '',
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedStudent) {
      setError('Please select a student.');
      return;
    }

    if (!totalFee || Number(totalFee) < 0) {
      setError('Please enter the total course fee.');
      return;
    }

    if (!amountPaid || Number(amountPaid) <= 0) {
      setError('Please enter the amount received.');
      return;
    }

    if (Number(amountPaid) > remainingBeforePayment) {
      setError('The payment cannot exceed the remaining balance.');
      return;
    }

    if (!mpesaCode.trim()) {
      setError('Please enter the M-Pesa transaction code.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: selectedStudent.application_id,
          totalFee: Number(totalFee),
          amountPaid: Number(amountPaid),
          mpesaCode: mpesaCode.trim().toUpperCase(),
        }),
      });

      const data = (await response.json()) as ApiData & {
        payment?: { id: number; receipt_number: string };
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to record payment.');
      }

      setSuccess(data.message || 'Payment recorded successfully.');

      await loadData();

      setSelectedId('');
      setTotalFee('');
      setAmountPaid('');
      setMpesaCode('');

      if (data.payment?.id) {
        window.location.href =
          `/admin/dashboard/receipts/${data.payment.id}`;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to record payment.',
      );
    } finally {
      setSaving(false);
    }
  }

  const totalOutstanding = Math.max(
    summary.total_billed - summary.total_collected,
    0,
  );

  return (
    <section className="mb-10 space-y-8">
      {/* SECTION HEADING */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-gold">
            Student Accounts
          </p>

          <h2 className="mt-1 text-2xl font-bold text-brand-dark">
            Course Fee Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Record student instalments, track balances and generate receipts.
          </p>
        </div>

        <Link
          href="/admin/dashboard/receipts"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green px-4 py-3 text-sm font-semibold text-brand-green hover:bg-brand-cream"
        >
          <Receipt className="h-4 w-4" />
          View Receipts
        </Link>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Transactions"
          value={String(summary.transactions)}
          icon={<CreditCard className="h-5 w-5" />}
        />

        <SummaryCard
          label="Total Fees Billed"
          value={currency(summary.total_billed)}
          icon={<Wallet className="h-5 w-5" />}
        />

        <SummaryCard
          label="Total Collected"
          value={currency(summary.total_collected)}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <SummaryCard
          label="Outstanding Balance"
          value={currency(totalOutstanding)}
          icon={<Clock3 className="h-5 w-5" />}
        />
      </div>

      {/* PAYMENT FORM */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="font-bold text-brand-dark">
            Record Student Payment
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Select an admitted student. Their admission details will be
            populated automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              {success}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Student
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, admission number or application number"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Select Student
              </label>

              <select
                value={selectedId}
                onChange={(event) => handleStudentChange(event.target.value)}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
              >
                <option value="">
                  {loading ? 'Loading students...' : 'Choose a student'}
                </option>

                {filteredStudents.map((student) => (
                  <option
                    key={student.application_id}
                    value={student.application_id}
                  >
                    {student.student_name} — {student.admission_number}
                  </option>
                ))}
              </select>
            </div>

            <ReadOnlyField
              label="Admission Number"
              value={selectedStudent?.admission_number || ''}
            />

            <ReadOnlyField
              label="Student Phone Number"
              value={selectedStudent?.phone_number || ''}
            />

            <ReadOnlyField
              label="Registered Course"
              value={selectedStudent?.course || ''}
            />

            <ReadOnlyField
              label="Intake"
              value={selectedStudent?.intake || ''}
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Total Course Fee (KSh)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={totalFee}
                onChange={(event) => setTotalFee(event.target.value)}
                required
                placeholder="Enter total course fee"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Amount Received (KSh)
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                max={remainingBeforePayment}
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
                required
                placeholder="Enter amount received"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                M-Pesa Transaction Code
              </label>

              <input
                value={mpesaCode}
                onChange={(event) =>
                  setMpesaCode(event.target.value.toUpperCase())
                }
                required
                maxLength={30}
                placeholder="e.g. QWE1234567"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
              />
            </div>
          </div>

          {/* BALANCE PREVIEW */}

          <div className="grid gap-4 rounded-2xl bg-brand-cream p-5 sm:grid-cols-3">
            <BalanceItem
              label="Previously Paid"
              value={currency(totalPaid)}
            />

            <BalanceItem
              label="Balance Before This Payment"
              value={currency(remainingBeforePayment)}
            />

            <BalanceItem
              label="Balance After This Payment"
              value={currency(balanceAfterPayment)}
              highlight
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              Every saved instalment receives its own receipt number. The
              transaction code cannot be reused.
            </p>

            <button
              type="submit"
              disabled={saving || !selectedStudent}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording Payment...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
{/* STUDENT FEE BALANCES */}

<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-200 px-6 py-5">
    <h3 className="font-bold text-brand-dark">
      Student Fee Balances
    </h3>

    <p className="mt-1 text-sm text-slate-500">
      Fee accounts for all admitted students.
    </p>
  </div>

  {students.length === 0 ? (
    <div className="p-8 text-center text-sm text-slate-500">
      No admitted students found.
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-brand-cream text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-4">Student</th>
            <th className="px-5 py-4">Admission No.</th>
            <th className="px-5 py-4">Course</th>
            <th className="px-5 py-4">Total Fee</th>
            <th className="px-5 py-4">Total Paid</th>
            <th className="px-5 py-4">Balance</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const billed = Number(student.total_fee || 0);
            const paid = Number(student.total_paid || 0);
            const balance = Math.max(billed - paid, 0);

            const cleared = billed > 0 && balance === 0;

            return (
              <tr
                key={student.application_id}
                className="hover:bg-slate-50"
              >
                <td className="px-5 py-4 font-semibold text-brand-dark">
                  {student.student_name}
                </td>

                <td className="px-5 py-4">
                  {student.admission_number}
                </td>

                <td className="max-w-[200px] truncate px-5 py-4">
                  {student.course}
                </td>

                <td className="px-5 py-4">
                  {currency(billed)}
                </td>

                <td className="px-5 py-4 font-semibold text-green-700">
                  {currency(paid)}
                </td>

                <td className="px-5 py-4 font-semibold text-brand-dark">
                  {currency(balance)}
                </td>

                <td className="px-5 py-4">
                  {cleared ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                      CLEARED
                    </span>
                  ) : billed === 0 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      NOT SET
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      BALANCE DUE
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</div>
      {/* RECENT PAYMENTS */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="font-bold text-brand-dark">
            Recent Course Fee Payments
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Individual instalments recorded in the system.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading payments...
          </div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No course fee payments have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-cream text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Receipt</th>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Admission No.</th>
                  <th className="px-5 py-4">M-Pesa Code</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-brand-green">
                      {payment.receipt_number}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {payment.student_name}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {payment.admission_number}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs">
                      {payment.mpesa_code}
                    </td>

                    <td className="px-5 py-4 font-semibold text-brand-dark">
                      {currency(payment.amount_paid)}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {new Date(payment.payment_date).toLocaleDateString(
                        'en-KE',
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/dashboard/receipts/${payment.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-green px-3 py-2 text-xs font-semibold text-brand-green hover:bg-brand-cream"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Receipt
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-bold text-brand-dark">{value}</p>
        </div>

        <div className="rounded-xl bg-brand-cream p-3 text-brand-green">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        value={value}
        readOnly
        placeholder="Automatically populated"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
      />
    </div>
  );
}

function BalanceItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-lg font-bold ${
          highlight ? 'text-brand-green' : 'text-brand-dark'
        }`}
      >
        {value}
      </p>
    </div>
  );
}