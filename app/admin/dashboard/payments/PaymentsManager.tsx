
'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  GraduationCap,
  Landmark,
  Loader2,
  Pencil,
  Receipt,
  Search,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Component =
  | 'TUITION'
  | 'ADMIN'
  | 'PROGRAMME'
  | 'UNIFORM'
  | 'SCRUB';

type Method = 'Bank' | 'M-Pesa';

type Student = {
  application_id: number;
  application_number: string;
  admission_number: string;
  student_name: string;
  phone_number: string | null;
  course: string;
  intake: string;

  fee_structure_id: number | null;
  fee_course_name: string | null;
  course_duration: string | null;
  duration_months: number | null;
  billing_type: 'PER_TERM' | 'ONE_TIME' | null;

  tuition_fee: number | string;
  admin_charge: number | string;
  total_terms: number;
  terms_per_year: number;
  total_fee: number | string;

  application_fee: number | string;
  uniform_fee: number | string;
  scrub_fee: number | string;

  tuition_paid: number | string;
  admin_paid: number | string;
  programme_paid: number | string;
  uniform_paid: number | string;
  scrub_paid: number | string;

  total_paid: number | string;
  balance: number | string;
  unallocated_tuition: number | string;

  fee_configured: boolean;

  academic_current_term: number;
  academic_completed_terms: number;
  academic_progress_percent: number;
  academic_status: string;
  course_start_date: string | null;
  expected_completion_date: string | null;

  term_payments: {
    term_number: number;
    amount_paid: number | string;
  }[];
};

type FeePayment = {
  id: number;
  receipt_number: string;
  application_id: number;
  admission_number: string;
  student_name: string;
  course: string;
  reference_code: string;
  mpesa_code?: string;
  phone_number?: string | null;
  amount_paid: number | string;
  payment_method: Method;
  payment_date: string;
  payment_component: Component;
  term_number: number | null;
};

type ApiData = {
  success: boolean;
  message?: string;
  students?: Student[];
  payments?: FeePayment[];
  payment?: Partial<FeePayment> & { id?: number };
  summary?: {
    transactions: number;
    total_collected: number;
    total_billed: number;
  };
};

type PaymentForm = {
  amountPaid: string;
  paymentMethod: Method;
  paymentComponent: Component;
  termNumber: string;
  referenceCode: string;
  paymentDate: string;
  phoneNumber: string;
};

/* =========================================================
   CONSTANTS AND HELPERS
========================================================= */

const UNIFORM_PRICE = 2000;
const SCRUB_PRICE = 3000;

const currency = (amount: number | string) =>
  `KSh ${Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Not set';

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-KE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function paymentComponentLabel(
  component: Component,
  termNumber?: number | null,
) {
  switch (component) {
    case 'ADMIN':
      return 'Administrative Charge';

    case 'PROGRAMME':
      return 'Programme Tuition';

    case 'UNIFORM':
      return 'School Uniform';

    case 'SCRUB':
      return 'Medical Scrub';

    case 'TUITION':
      return termNumber
        ? `Tuition – Term ${termNumber}`
        : 'Tuition – Unallocated';

    default:
      return 'Student Fee';
  }
}

function ProgressBar({
  value,
  color = 'bg-brand-green',
}: {
  value: number;
  color?: string;
}) {
  const safe = Math.min(100, Math.max(0, value));

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

const emptySummary = {
  transactions: 0,
  total_collected: 0,
  total_billed: 0,
};

const emptyEdit: PaymentForm = {
  amountPaid: '',
  paymentMethod: 'M-Pesa',
  paymentComponent: 'TUITION',
  termNumber: '1',
  referenceCode: '',
  paymentDate: today(),
  phoneNumber: '',
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PaymentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);

  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');

  const [component, setComponent] = useState<Component>('TUITION');
  const [termNumber, setTermNumber] = useState('1');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Method>('M-Pesa');
  const [paymentDate, setPaymentDate] = useState(today());

  /* Academic progress */
  const [academicTerm, setAcademicTerm] = useState('1');
  const [completedTerms, setCompletedTerms] = useState('0');
  const [academicProgress, setAcademicProgress] = useState('0');
  const [academicStatus, setAcademicStatus] = useState('IN_PROGRESS');
  const [courseStartDate, setCourseStartDate] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');

  /* Loading and notifications */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingAcademic, setUpdatingAcademic] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [academicMessage, setAcademicMessage] = useState('');
  const [summary, setSummary] = useState(emptySummary);

  /* Fee options */
  const [uniformSelected, setUniformSelected] = useState(false);
  const [femaleConfirmed, setFemaleConfirmed] = useState(false);
  const [scrubSelected, setScrubSelected] = useState(false);
  const [savingOptions, setSavingOptions] = useState(false);

  /* Edit/delete payment */
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(
    null,
  );
  const [editForm, setEditForm] = useState<PaymentForm>(emptyEdit);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<number | null>(null);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [paymentError, setPaymentError] = useState('');

  /* =========================================================
     SELECTED STUDENT AND FEE CALCULATIONS
  ========================================================= */

  const student = students.find(
    (item) => String(item.application_id) === selectedId,
  );

  const tuitionFee = Number(student?.tuition_fee || 0);
  const adminFee = Number(student?.admin_charge || 0);
  const totalFee = Number(student?.total_fee || 0);

  const applicationFee = Number(student?.application_fee ?? 1500);
  const uniformFee = Number(student?.uniform_fee || 0);
  const scrubFee = Number(student?.scrub_fee || 0);

  const uniformPaid = Number(student?.uniform_paid || 0);
  const scrubPaid = Number(student?.scrub_paid || 0);

  const totalPaid = Number(student?.total_paid || 0);
  const balance = Math.max(totalFee - totalPaid, 0);

  const currentAmount = Number(amountPaid || 0);

  const selectedTermPaid = Number(
    student?.term_payments?.find(
      (item) => item.term_number === Number(termNumber),
    )?.amount_paid || 0,
  );

  const selectedTerm = component === 'TUITION';

  const allocationLimit =
    component === 'ADMIN'
      ? adminFee
      : component === 'PROGRAMME' || component === 'TUITION'
        ? tuitionFee
        : component === 'UNIFORM'
          ? uniformFee
          : scrubFee;

  const allocationPaid =
    component === 'ADMIN'
      ? Number(student?.admin_paid || 0)
      : component === 'PROGRAMME'
        ? Number(student?.programme_paid || 0)
        : component === 'UNIFORM'
          ? uniformPaid
          : component === 'SCRUB'
            ? scrubPaid
            : selectedTermPaid;

  const allocationBalance = Math.max(
    allocationLimit - allocationPaid,
    0,
  );

  const uniformOutstanding = Math.max(uniformFee - uniformPaid, 0);
  const scrubOutstanding = Math.max(scrubFee - scrubPaid, 0);

  const projectedTotalFee = Math.max(
    0,
    totalFee -
      uniformFee -
      scrubFee +
      (uniformSelected ? UNIFORM_PRICE : 0) +
      (scrubSelected ? SCRUB_PRICE : 0),
  );

  const availableComponents = useMemo<Component[]>(() => {
    if (!student) return [];

    const available: Component[] = [];

    if (student.billing_type === 'PER_TERM') {
      available.push('TUITION');
    }

    if (student.billing_type === 'ONE_TIME') {
      available.push('PROGRAMME');
    }

    if (Number(student.admin_charge || 0) > 0) {
      available.push('ADMIN');
    }

    if (Number(student.uniform_fee || 0) > 0) {
      available.push('UNIFORM');
    }

    if (Number(student.scrub_fee || 0) > 0) {
      available.push('SCRUB');
    }

    return available;
  }, [student]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter((item) =>
      [
        item.student_name,
        item.admission_number,
        item.application_number,
        item.course,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [students, search]);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true);

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
      setSummary(data.summary || emptySummary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load fee records.',
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  /* =========================================================
     STUDENT SELECTION
  ========================================================= */

  function selectStudent(value: string) {
    setSelectedId(value);

    setComponent('TUITION');
    setTermNumber('1');
    setAmountPaid('');
    setReferenceCode('');

    setError('');
    setSuccess('');
    setAcademicMessage('');

    const selected = students.find(
      (item) => String(item.application_id) === value,
    );

    if (!selected) {
      setUniformSelected(false);
      setFemaleConfirmed(false);
      setScrubSelected(false);
      return;
    }

    setAcademicTerm(String(selected.academic_current_term || 1));
    setCompletedTerms(String(selected.academic_completed_terms || 0));
    setAcademicProgress(
      String(selected.academic_progress_percent || 0),
    );
    setAcademicStatus(selected.academic_status || 'IN_PROGRESS');

    setCourseStartDate(selected.course_start_date?.slice(0, 10) || '');
    setExpectedCompletionDate(
      selected.expected_completion_date?.slice(0, 10) || '',
    );

    setUniformSelected(Number(selected.uniform_fee || 0) > 0);
    setFemaleConfirmed(Number(selected.uniform_fee || 0) > 0);
    setScrubSelected(Number(selected.scrub_fee || 0) > 0);
  }

  function changeComponent(value: Component) {
    setComponent(value);
    setAmountPaid('');
    setReferenceCode('');
    setError('');
  }

  /* =========================================================
     SAVE ADDITIONAL FEE OPTIONS
  ========================================================= */

  async function saveFeeOptions() {
    if (!student) return;

    if (uniformSelected && !femaleConfirmed) {
      setError(
        'Please confirm that the student is eligible for the school uniform.',
      );
      return;
    }

    setSavingOptions(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/fees/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: student.application_id,
          uniformSelected,
          scrubSelected,
          confirmFemaleUniform: femaleConfirmed,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to update additional fee items.',
        );
      }

      setSuccess(data.message || 'Additional fee items saved.');

      await loadData(false);

      /*
       * Keep the payment category valid after fee options change.
       * If a fee item is removed, do not leave its category selected.
       */
      if (
        (!uniformSelected && component === 'UNIFORM') ||
        (!scrubSelected && component === 'SCRUB')
      ) {
        setComponent('TUITION');
        setAmountPaid('');
        setReferenceCode('');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update additional fee items.',
      );
    } finally {
      setSavingOptions(false);
    }
  }

  /* =========================================================
     RECORD PAYMENT
  ========================================================= */

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!student) return;

    if (!student.fee_configured) {
      setError("This student's course fee has not been configured.");
      return;
    }

    if (!availableComponents.includes(component)) {
      setError(
        'This payment category has not been selected or configured for the student.',
      );
      return;
    }

    if (!Number.isFinite(currentAmount) || currentAmount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }

    if (currentAmount > allocationBalance) {
      setError(
        'The payment exceeds the outstanding amount for this allocation.',
      );
      return;
    }

    if (!referenceCode.trim()) {
      setError('Enter the transaction or bank reference code.');
      return;
    }

    if (!paymentDate) {
      setError('Select the payment date.');
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
          applicationId: student.application_id,
          amountPaid: currentAmount,
          paymentMethod,
          paymentComponent: component,

          /*
           * Only tuition payments are linked to academic terms.
           * ADMIN, PROGRAMME, UNIFORM and SCRUB are one-time allocations.
           */
          termNumber: component === 'TUITION' ? Number(termNumber) : null,

          referenceCode: referenceCode.trim().toUpperCase(),
          paymentDate,
        }),
      });

      const data = (await response.json()) as ApiData;

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to record payment.');
      }

      setSuccess(data.message || 'Payment recorded successfully.');

      await loadData(false);

      setAmountPaid('');
      setReferenceCode('');

      if (data.payment?.id) {
        window.location.href = `/admin/dashboard/receipts/${data.payment.id}`;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to record payment.',
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     UPDATE ACADEMIC PROGRESS
  ========================================================= */

  async function handleAcademicUpdate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!student) return;

    setUpdatingAcademic(true);
    setAcademicMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/fees', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: student.application_id,
          currentTerm: Number(academicTerm),
          completedTerms: Number(completedTerms),
          progressPercent: Number(academicProgress),
          status: academicStatus,
          courseStartDate: courseStartDate || null,
          expectedCompletionDate: expectedCompletionDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to update academic progress.',
        );
      }

      setAcademicMessage(
        data.message || 'Academic progress updated successfully.',
      );

      await loadData(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update academic progress.',
      );
    } finally {
      setUpdatingAcademic(false);
    }
  }

  /* =========================================================
     EDIT PAYMENT
  ========================================================= */

  function openEdit(payment: FeePayment) {
    setEditingPayment(payment);
    setPaymentError('');
    setPaymentNotice('');

    setEditForm({
      amountPaid: String(payment.amount_paid ?? ''),
      paymentMethod: payment.payment_method || 'M-Pesa',
      paymentComponent: payment.payment_component,
      termNumber: String(payment.term_number || 1),
      referenceCode:
        payment.reference_code || payment.mpesa_code || '',
      paymentDate: payment.payment_date?.slice(0, 10) || today(),
      phoneNumber: payment.phone_number || '',
    });
  }

  function closeEdit() {
    if (editSaving) return;

    setEditingPayment(null);
    setEditForm(emptyEdit);
    setPaymentError('');
  }

  async function saveEditedPayment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingPayment) return;

    const amount = Number(editForm.amountPaid);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter a valid amount greater than zero.');
      return;
    }

    if (!editForm.referenceCode.trim()) {
      setPaymentError('Enter the transaction/reference code.');
      return;
    }

    if (!editForm.paymentDate) {
      setPaymentError('Select the payment date.');
      return;
    }

    if (
      editForm.paymentComponent === 'TUITION' &&
      (!Number.isInteger(Number(editForm.termNumber)) ||
        Number(editForm.termNumber) < 1)
    ) {
      setPaymentError('Select a valid academic term.');
      return;
    }

    const editingStudent = students.find(
      (item) => item.application_id === editingPayment.application_id,
    );

    if (
      editForm.paymentComponent === 'UNIFORM' &&
      Number(editingStudent?.uniform_fee || 0) <= 0
    ) {
      setPaymentError(
        'Uniform has not been selected for this student.',
      );
      return;
    }

    if (
      editForm.paymentComponent === 'SCRUB' &&
      Number(editingStudent?.scrub_fee || 0) <= 0
    ) {
      setPaymentError(
        'Scrub has not been selected for this student.',
      );
      return;
    }

    setEditSaving(true);
    setPaymentError('');
    setPaymentNotice('');

    try {
      const response = await fetch('/api/admin/fees', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingPayment.id,
          amountPaid: amount,
          paymentMethod: editForm.paymentMethod,
          paymentComponent: editForm.paymentComponent,

          termNumber:
            editForm.paymentComponent === 'TUITION'
              ? Number(editForm.termNumber)
              : null,

          referenceCode: editForm.referenceCode
            .trim()
            .toUpperCase(),

          paymentDate: editForm.paymentDate,
          phoneNumber: editForm.phoneNumber.trim(),
        }),
      });

      const data = (await response.json()) as ApiData;

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update payment.');
      }

      setPaymentNotice(
        data.message || 'Payment updated successfully.',
      );

      setEditingPayment(null);
      await loadData(false);
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Unable to update payment.',
      );
    } finally {
      setEditSaving(false);
    }
  }

  /* =========================================================
     DELETE PAYMENT
  ========================================================= */

  async function deletePayment(payment: FeePayment) {
    const confirmed = window.confirm(
      `Delete receipt ${payment.receipt_number} for ${payment.student_name} (${currency(payment.amount_paid)})?\n\nOnly this transaction will be deleted. The student's application and fee account will remain.`,
    );

    if (!confirmed) return;

    setBusyPaymentId(payment.id);
    setPaymentError('');
    setPaymentNotice('');
    setDeletingId(payment.id);

    try {
      const response = await fetch(
        `/api/admin/fees?id=${payment.id}`,
        {
          method: 'DELETE',
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete payment.');
      }

      setPaymentNotice(
        data.message || 'Payment deleted successfully.',
      );

      await loadData(false);
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Unable to delete payment.',
      );
    } finally {
      setBusyPaymentId(null);
      setDeletingId(null);
    }
  }

  const totalOutstanding = Math.max(
    Number(summary.total_billed) - Number(summary.total_collected),
    0,
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="mb-10 space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-gold">
            Student Accounts
          </p>

          <h2 className="mt-1 text-2xl font-bold text-brand-dark">
            Course Fee Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage tuition, administrative charges, uniforms, medical
            scrubs, programme fees and academic progress.
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

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Transactions"
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

      {/* STUDENT SELECTION */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-brand-dark">
          Select Student Account
        </h3>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Search student
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, admission number or course"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-green"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Select admitted student
            </label>

            <select
              value={selectedId}
              onChange={(event) => selectStudent(event.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-green"
            >
              <option value="">
                {loading ? 'Loading students...' : 'Choose a student'}
              </option>

              {filteredStudents.map((item) => (
                <option
                  key={item.application_id}
                  value={item.application_id}
                >
                  {item.student_name} — {item.admission_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {student && (
          <div className="mt-5 grid gap-3 rounded-xl bg-brand-cream p-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoItem
              label="Admission Number"
              value={student.admission_number}
            />

            <InfoItem label="Student" value={student.student_name} />

            <InfoItem
              label="Registered Course"
              value={student.course}
            />

            <InfoItem
              label="Intake"
              value={student.intake || '—'}
            />

            <InfoItem
              label="Course Duration"
              value={student.course_duration || 'Not configured'}
            />

            <InfoItem
              label="Billing Structure"
              value={
                student.billing_type === 'PER_TERM'
                  ? `${student.total_terms} terms`
                  : 'One-time programme fee'
              }
            />

            <InfoItem
              label="Tuition Fee"
              value={currency(student.tuition_fee)}
            />

            <InfoItem
              label="Admin Charge (once)"
              value={currency(student.admin_charge)}
            />
          </div>
        )}

        {/* ADDITIONAL STUDENT CHARGES */}
        {student && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-bold text-brand-dark">
                  Additional Student Charges
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select applicable school items. Once saved, each
                  selected item becomes a separate payment category.
                </p>
              </div>

              <span className="rounded-lg bg-brand-cream px-3 py-2 text-sm font-bold text-brand-green">
                Application fee: {currency(applicationFee)}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {/* UNIFORM OPTION */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={uniformSelected}
                  onChange={(event) =>
                    setUniformSelected(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-brand-green"
                />

                <span>
                  <span className="block font-semibold text-brand-dark">
                    SMTC School Uniform
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    Female students only · Available at school
                  </span>

                  <span className="mt-2 block font-bold text-brand-green">
                    {currency(UNIFORM_PRICE)}
                  </span>

                  {uniformFee > 0 && (
                    <span className="mt-1 block text-xs font-semibold text-green-700">
                      Currently added to this student's account
                    </span>
                  )}
                </span>
              </label>

              {/* SCRUB OPTION */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={scrubSelected}
                  onChange={(event) =>
                    setScrubSelected(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-brand-green"
                />

                <span>
                  <span className="block font-semibold text-brand-dark">
                    SMTC Purple Medical Scrub
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    Available at school
                  </span>

                  <span className="mt-2 block font-bold text-brand-green">
                    {currency(SCRUB_PRICE)}
                  </span>

                  {scrubFee > 0 && (
                    <span className="mt-1 block text-xs font-semibold text-green-700">
                      Currently added to this student's account
                    </span>
                  )}
                </span>
              </label>
            </div>

            {uniformSelected && (
              <label className="mt-3 flex items-start gap-2 text-sm text-amber-800">
                <input
                  type="checkbox"
                  checked={femaleConfirmed}
                  onChange={(event) =>
                    setFemaleConfirmed(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-brand-green"
                />

                <span>
                  I confirm that this student is female and is eligible
                  for the SMTC School Uniform.
                </span>
              </label>
            )}

            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-brand-cream p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Total additional charges
                </p>

                <p className="mt-1 text-xl font-bold text-brand-dark">
                  {currency(
                    (uniformSelected ? UNIFORM_PRICE : 0) +
                      (scrubSelected ? SCRUB_PRICE : 0),
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={saveFeeOptions}
                disabled={
                  savingOptions ||
                  !student.fee_configured ||
                  (uniformSelected && !femaleConfirmed)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {savingOptions ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Fee Items
                  </>
                )}
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Projected billed total after saving: {currency(projectedTotalFee)}
              {' · '}Application fee: {currency(applicationFee)}
              {' · '}Uniform: {currency(uniformSelected ? UNIFORM_PRICE : 0)}
              {' · '}Scrub: {currency(scrubSelected ? SCRUB_PRICE : 0)}
            </p>

            {(uniformFee > 0 || scrubFee > 0) && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {uniformFee > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-brand-dark">
                      Uniform Payment Status
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Paid: {currency(uniformPaid)}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-brand-green">
                      Outstanding: {currency(uniformOutstanding)}
                    </p>

                    <div className="mt-3">
                      <ProgressBar
                        value={
                          uniformFee > 0
                            ? (uniformPaid / uniformFee) * 100
                            : 0
                        }
                      />
                    </div>
                  </div>
                )}

                {scrubFee > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-brand-dark">
                      Medical Scrub Payment Status
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Paid: {currency(scrubPaid)}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-brand-green">
                      Outstanding: {currency(scrubOutstanding)}
                    </p>

                    <div className="mt-3">
                      <ProgressBar
                        value={
                          scrubFee > 0
                            ? (scrubPaid / scrubFee) * 100
                            : 0
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* NOTIFICATIONS */}
      {error && <AlertBox type="error" message={error} />}
      {paymentNotice && (
        <AlertBox type="success" message={paymentNotice} />
      )}
      {paymentError && (
        <AlertBox type="error" message={paymentError} />
      )}

      {/* SELECTED STUDENT MANAGEMENT */}
      {student && (
        <>
          {!student.fee_configured ? (
            <AlertBox
              type="warning"
              message={`No approved fee structure matches ${student.course}. Please check the course name and fee catalogue.`}
            />
          ) : (
            <>
              {/* RECORD PAYMENT */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h3 className="font-bold text-brand-dark">
                    Record Student Payment
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose what the student is paying for. Uniform and
                    Scrub will appear here after they have been added to
                    the student's account.
                  </p>
                </div>

                <form
                  onSubmit={handlePayment}
                  className="space-y-5 p-6"
                >
                  {success && (
                    <AlertBox type="success" message={success} />
                  )}

                  <div className="grid gap-5 lg:grid-cols-2">
                    <Field label="Payment Category">
                      <select
                        value={component}
                        onChange={(event) =>
                          changeComponent(event.target.value as Component)
                        }
                        className="field"
                      >
                        {availableComponents.map((item) => (
                          <option key={item} value={item}>
                            {item === 'TUITION'
                              ? 'Tuition Fee – Term Payment'
                              : item === 'PROGRAMME'
                                ? 'Programme Tuition – One Time'
                                : item === 'ADMIN'
                                  ? 'Administrative Charge – Once'
                                  : item === 'UNIFORM'
                                    ? 'SMTC School Uniform'
                                    : 'SMTC Purple Medical Scrub'}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {selectedTerm && (
                      <Field label="Academic Term">
                        <select
                          value={termNumber}
                          onChange={(event) =>
                            setTermNumber(event.target.value)
                          }
                          className="field"
                        >
                          {Array.from(
                            { length: Number(student.total_terms) },
                            (_, index) => index + 1,
                          ).map((term) => (
                            <option key={term} value={term}>
                              Term {term}
                              {term <= 3
                                ? ' – Year 1'
                                : ' – Year 2'}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}

                    <Field label="Payment Method">
                      <div className="grid grid-cols-2 gap-3">
                        <MethodButton
                          active={paymentMethod === 'M-Pesa'}
                          onClick={() => setPaymentMethod('M-Pesa')}
                          icon={<Smartphone className="h-4 w-4" />}
                          label="M-Pesa"
                        />

                        <MethodButton
                          active={paymentMethod === 'Bank'}
                          onClick={() => setPaymentMethod('Bank')}
                          icon={<Landmark className="h-4 w-4" />}
                          label="Bank"
                        />
                      </div>
                    </Field>

                    <Field
                      label={
                        paymentMethod === 'M-Pesa'
                          ? 'M-Pesa Transaction Code'
                          : 'Bank Transaction / Reference Code'
                      }
                    >
                      <input
                        value={referenceCode}
                        onChange={(event) =>
                          setReferenceCode(
                            event.target.value.toUpperCase(),
                          )
                        }
                        maxLength={40}
                        required
                        placeholder="Enter transaction/reference code"
                        className="field font-mono uppercase"
                      />
                    </Field>

                    <Field label="Amount Received (KSh)">
                      <input
                        type="number"
                        min="0.01"
                        max={allocationBalance}
                        step="0.01"
                        required
                        value={amountPaid}
                        onChange={(event) =>
                          setAmountPaid(event.target.value)
                        }
                        placeholder="Enter amount received"
                        className="field"
                      />
                    </Field>

                    <Field label="Date Paid">
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="date"
                          value={paymentDate}
                          max={today()}
                          onChange={(event) =>
                            setPaymentDate(event.target.value)
                          }
                          required
                          className="field pl-10"
                        />
                      </div>
                    </Field>
                  </div>

                  {/* ALLOCATION SUMMARY */}
                  <div className="grid gap-4 rounded-xl bg-brand-cream p-5 sm:grid-cols-3">
                    <BalanceItem
                      label="Allocation Fee"
                      value={currency(allocationLimit)}
                    />

                    <BalanceItem
                      label="Previously Paid"
                      value={currency(allocationPaid)}
                    />

                    <BalanceItem
                      label="Outstanding for this allocation"
                      value={currency(allocationBalance)}
                      highlight
                    />
                  </div>

                  {allocationBalance <= 0 && (
                    <AlertBox
                      type="warning"
                      message="This fee allocation has been fully paid. Select another category with an outstanding balance."
                    />
                  )}

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      allocationBalance <= 0 ||
                      !availableComponents.includes(component)
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50 sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4" />
                        Record Payment
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* FEE PAYMENT PROGRESS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-brand-green" />
                  <h3 className="font-bold text-brand-dark">
                    Fee Payment Progress
                  </h3>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Total Programme Fee"
                    value={currency(totalFee)}
                  />

                  <Metric
                    label="Total Paid"
                    value={currency(totalPaid)}
                  />

                  <Metric
                    label="Outstanding"
                    value={currency(balance)}
                  />

                  <Metric
                    label="Fee Clearance"
                    value={`${
                      totalFee > 0
                        ? Math.min(
                            100,
                            (totalPaid / totalFee) * 100,
                          ).toFixed(1)
                        : '0.0'
                    }%`}
                  />
                </div>

                <div className="mt-4">
                  <ProgressBar
                    value={
                      totalFee > 0
                        ? (totalPaid / totalFee) * 100
                        : 0
                    }
                  />
                </div>

                <div className="mt-6 space-y-3">
                  {/* TERM TUITION */}
                  {student.billing_type === 'PER_TERM' ? (
                    Array.from(
                      { length: Number(student.total_terms) },
                      (_, index) => index + 1,
                    ).map((term) => {
                      const paid = Number(
                        student.term_payments?.find(
                          (item) => item.term_number === term,
                        )?.amount_paid || 0,
                      );

                      const percent =
                        tuitionFee > 0
                          ? Math.min(100, (paid / tuitionFee) * 100)
                          : 0;

                      return (
                        <div
                          key={term}
                          className="rounded-xl border border-slate-100 p-4"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-brand-dark">
                              Term {term}{' '}
                              {term <= 3 ? '· Year 1' : '· Year 2'}
                            </span>

                            <span className="text-xs font-semibold text-slate-600">
                              {currency(paid)} / {currency(tuitionFee)}
                            </span>
                          </div>

                          <ProgressBar value={percent} />

                          <p className="mt-2 text-xs text-slate-500">
                            {percent >= 100
                              ? 'Term tuition fully paid'
                              : paid > 0
                                ? `Outstanding: ${currency(
                                    tuitionFee - paid,
                                  )}`
                                : 'No tuition payment recorded'}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-slate-100 p-4">
                      <div className="mb-2 flex justify-between gap-3">
                        <span className="text-sm font-semibold text-brand-dark">
                          One-time programme tuition
                        </span>

                        <span className="text-sm font-semibold">
                          {currency(student.programme_paid)} /{' '}
                          {currency(tuitionFee)}
                        </span>
                      </div>

                      <ProgressBar
                        value={
                          tuitionFee > 0
                            ? (Number(student.programme_paid) /
                                tuitionFee) *
                              100
                            : 0
                        }
                      />
                    </div>
                  )}

                  {/* ADMINISTRATIVE CHARGE */}
                  {adminFee > 0 && (
                    <div className="rounded-xl border border-slate-100 p-4">
                      <div className="mb-2 flex justify-between gap-3">
                        <span className="text-sm font-semibold text-brand-dark">
                          Administrative charge (one time)
                        </span>

                        <span className="text-sm font-semibold">
                          {currency(student.admin_paid)} /{' '}
                          {currency(adminFee)}
                        </span>
                      </div>

                      <ProgressBar
                        value={
                          adminFee > 0
                            ? (Number(student.admin_paid) / adminFee) *
                              100
                            : 0
                        }
                      />
                    </div>
                  )}

                  {/* UNIFORM */}
                  {uniformFee > 0 && (
                    <div className="rounded-xl border border-slate-100 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-brand-dark">
                          SMTC School Uniform
                        </span>

                        <span className="text-sm font-semibold">
                          {currency(uniformPaid)} / {currency(uniformFee)}
                        </span>
                      </div>

                      <ProgressBar
                        value={
                          uniformFee > 0
                            ? (uniformPaid / uniformFee) * 100
                            : 0
                        }
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        {uniformOutstanding <= 0
                          ? 'Uniform fully paid'
                          : `Outstanding: ${currency(uniformOutstanding)}`}
                      </p>
                    </div>
                  )}

                  {/* SCRUB */}
                  {scrubFee > 0 && (
                    <div className="rounded-xl border border-slate-100 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-brand-dark">
                          SMTC Purple Medical Scrub
                        </span>

                        <span className="text-sm font-semibold">
                          {currency(scrubPaid)} / {currency(scrubFee)}
                        </span>
                      </div>

                      <ProgressBar
                        value={
                          scrubFee > 0
                            ? (scrubPaid / scrubFee) * 100
                            : 0
                        }
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        {scrubOutstanding <= 0
                          ? 'Medical scrub fully paid'
                          : `Outstanding: ${currency(scrubOutstanding)}`}
                      </p>
                    </div>
                  )}

                  {Number(student.unallocated_tuition) > 0 && (
                    <AlertBox
                      type="warning"
                      message={`${currency(
                        student.unallocated_tuition,
                      )} in historical tuition payments has not been assigned to a specific term. These payments are included in the overall account total but not in individual term progress.`}
                    />
                  )}
                </div>
              </div>

              {/* ACADEMIC COURSE COMPLETION */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-brand-green" />

                    <h3 className="font-bold text-brand-dark">
                      Academic Course Completion
                    </h3>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Academic progress is independent of fee payment
                    progress.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      label="Course Duration"
                      value={student.course_duration || '—'}
                    />

                    <Metric
                      label="Terms Completed"
                      value={`${student.academic_completed_terms} / ${
                        student.total_terms || 'N/A'
                      }`}
                    />

                    <Metric
                      label="Academic Progress"
                      value={`${Number(
                        student.academic_progress_percent,
                      ).toFixed(1)}%`}
                    />

                    <Metric
                      label="Academic Status"
                      value={student.academic_status.replace('_', ' ')}
                    />
                  </div>

                  <ProgressBar
                    value={Number(student.academic_progress_percent)}
                    color="bg-blue-600"
                  />

                  <form
                    onSubmit={handleAcademicUpdate}
                    className="space-y-4"
                  >
                    <h4 className="flex items-center gap-2 font-semibold text-brand-dark">
                      <BookOpen className="h-4 w-4" />
                      Update Academic Progress
                    </h4>

                    {student.total_terms > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Current Academic Term">
                          <select
                            value={academicTerm}
                            onChange={(event) =>
                              setAcademicTerm(event.target.value)
                            }
                            className="field"
                          >
                            {Array.from(
                              { length: student.total_terms },
                              (_, index) => index + 1,
                            ).map((term) => (
                              <option key={term} value={term}>
                                Term {term}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Completed Terms">
                          <select
                            value={completedTerms}
                            onChange={(event) =>
                              setCompletedTerms(event.target.value)
                            }
                            className="field"
                          >
                            {Array.from(
                              { length: student.total_terms + 1 },
                              (_, index) => index,
                            ).map((term) => (
                              <option key={term} value={term}>
                                {term} terms
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        This is a one-time programme without academic
                        term billing. Update its completion percentage
                        and status below.
                      </p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Course Completion (%)">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          required
                          value={academicProgress}
                          onChange={(event) =>
                            setAcademicProgress(event.target.value)
                          }
                          className="field"
                        />
                      </Field>

                      <Field label="Academic Status">
                        <select
                          value={academicStatus}
                          onChange={(event) =>
                            setAcademicStatus(event.target.value)
                          }
                          className="field"
                        >
                          <option value="IN_PROGRESS">
                            In Progress
                          </option>
                          <option value="COMPLETED">Completed</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="WITHDRAWN">Withdrawn</option>
                        </select>
                      </Field>

                      <Field label="Course Start Date">
                        <input
                          type="date"
                          value={courseStartDate}
                          onChange={(event) =>
                            setCourseStartDate(event.target.value)
                          }
                          className="field"
                        />
                      </Field>

                      <Field label="Expected Completion Date">
                        <input
                          type="date"
                          value={expectedCompletionDate}
                          onChange={(event) =>
                            setExpectedCompletionDate(event.target.value)
                          }
                          className="field"
                        />
                      </Field>
                    </div>

                    {academicMessage && (
                      <AlertBox
                        type="success"
                        message={academicMessage}
                      />
                    )}

                    <button
                      type="submit"
                      disabled={updatingAcademic}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {updatingAcademic ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <GraduationCap className="h-4 w-4" />
                      )}

                      Save Academic Progress
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* STUDENT FEE ACCOUNTS TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="font-bold text-brand-dark">
            Student Fee Accounts
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Programme duration, tuition, administrative charges,
            additional student items and outstanding balances.
          </p>
        </div>

        {loading ? (
          <Loading />
        ) : students.length === 0 ? (
          <EmptyState message="No student fee accounts found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-cream text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-4">Student</th>
                  <th className="px-4 py-4">Admission No.</th>
                  <th className="px-4 py-4">Course</th>
                  <th className="px-4 py-4">Duration</th>
                  <th className="px-4 py-4">Total Fee</th>
                  <th className="px-4 py-4">Paid</th>
                  <th className="px-4 py-4">Balance</th>
                  <th className="px-4 py-4">Fee Progress</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {students.map((item) => {
                  const billed = Number(item.total_fee || 0);
                  const paid = Number(item.total_paid || 0);

                  const percent =
                    billed > 0
                      ? Math.min(100, (paid / billed) * 100)
                      : 0;

                  return (
                    <tr
                      key={item.application_id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-semibold text-brand-dark">
                        {item.student_name}
                      </td>

                      <td className="px-4 py-4">
                        {item.admission_number}
                      </td>

                      <td className="max-w-[200px] px-4 py-4">
                        {item.course}
                      </td>

                      <td className="px-4 py-4">
                        {item.course_duration || '—'}
                      </td>

                      <td className="px-4 py-4">
                        {item.fee_configured
                          ? currency(billed)
                          : 'Not configured'}
                      </td>

                      <td className="px-4 py-4 font-semibold text-green-700">
                        {currency(paid)}
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {item.fee_configured
                          ? currency(Math.max(billed - paid, 0))
                          : '—'}
                      </td>

                      <td className="min-w-[150px] px-4 py-4">
                        <ProgressBar value={percent} />

                        <span className="mt-1 block text-xs text-slate-500">
                          {percent.toFixed(1)}%
                        </span>
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
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="font-bold text-brand-dark">
            Recent Payments
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Edit or delete individual tuition, administrative,
            programme, uniform and scrub transactions.
          </p>
        </div>

        {loading ? (
          <Loading />
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-cream text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-4">Receipt</th>
                  <th className="px-4 py-4">Student</th>
                  <th className="px-4 py-4">Payment For</th>
                  <th className="px-4 py-4">Method</th>
                  <th className="px-4 py-4">Reference</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Date Paid</th>
                  <th className="px-4 py-4">Receipt</th>
                  <th className="px-4 py-4 text-right">Manage</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-bold text-brand-green">
                      {payment.receipt_number}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {payment.student_name}

                      <span className="block text-xs font-normal text-slate-500">
                        {payment.admission_number}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {paymentComponentLabel(
                        payment.payment_component,
                        payment.term_number,
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {payment.payment_method || 'M-Pesa'}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs">
                      {payment.reference_code ||
                        payment.mpesa_code ||
                        '—'}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 font-semibold">
                      {currency(payment.amount_paid)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      {dateLabel(payment.payment_date)}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/dashboard/receipts/${payment.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-green px-3 py-2 text-xs font-semibold text-brand-green hover:bg-brand-cream"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(payment)}
                          disabled={busyPaymentId === payment.id}
                          title="Edit payment"
                          aria-label={`Edit payment ${payment.receipt_number}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />

                          <span className="hidden lg:inline">
                            Edit
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void deletePayment(payment)}
                          disabled={busyPaymentId === payment.id}
                          title="Delete payment"
                          aria-label={`Delete payment ${payment.receipt_number}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === payment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}

                          <span className="hidden lg:inline">
                            Delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT PAYMENT MODAL */}
      {editingPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-payment-title"
        >
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                  Payment Management
                </p>

                <h3
                  id="edit-payment-title"
                  className="mt-1 text-xl font-bold text-brand-dark"
                >
                  Edit Payment
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {editingPayment.receipt_number} ·{' '}
                  {editingPayment.student_name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={editSaving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close edit payment dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={saveEditedPayment}
              className="space-y-5 p-6"
            >
              {paymentError && (
                <AlertBox type="error" message={paymentError} />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Amount Paid (KSh)">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={editForm.amountPaid}
                    onChange={(event) =>
                      setEditForm((value) => ({
                        ...value,
                        amountPaid: event.target.value,
                      }))
                    }
                    className="field"
                  />
                </Field>

                <Field label="Payment Method">
                  <select
                    value={editForm.paymentMethod}
                    onChange={(event) =>
                      setEditForm((value) => ({
                        ...value,
                        paymentMethod: event.target.value as Method,
                      }))
                    }
                    className="field"
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank">Bank</option>
                  </select>
                </Field>

                <Field label="Payment Category">
                  <select
                    value={editForm.paymentComponent}
                    onChange={(event) =>
                      setEditForm((value) => ({
                        ...value,
                        paymentComponent: event.target.value as Component,
                        termNumber:
                          event.target.value === 'TUITION'
                            ? value.termNumber || '1'
                            : '',
                      }))
                    }
                    className="field"
                  >
                    {(() => {
                      const editingStudent = students.find(
                        (item) =>
                          item.application_id ===
                          editingPayment.application_id,
                      );

                      const options: Component[] = [];

                      if (
                        editingStudent?.billing_type === 'PER_TERM'
                      ) {
                        options.push('TUITION');
                      }

                      if (
                        editingStudent?.billing_type === 'ONE_TIME'
                      ) {
                        options.push('PROGRAMME');
                      }

                      if (
                        Number(editingStudent?.admin_charge || 0) > 0
                      ) {
                        options.push('ADMIN');
                      }

                      if (
                        Number(editingStudent?.uniform_fee || 0) > 0
                      ) {
                        options.push('UNIFORM');
                      }

                      if (
                        Number(editingStudent?.scrub_fee || 0) > 0
                      ) {
                        options.push('SCRUB');
                      }

                      /*
                       * Retain the original category in the dropdown
                       * if it is a historical payment category.
                       */
                      if (
                        !options.includes(
                          editingPayment.payment_component,
                        )
                      ) {
                        options.push(
                          editingPayment.payment_component,
                        );
                      }

                      return options.map((option) => (
                        <option key={option} value={option}>
                          {option === 'TUITION'
                            ? 'Term Tuition'
                            : option === 'PROGRAMME'
                              ? 'One-time Programme Tuition'
                              : option === 'ADMIN'
                                ? 'Administrative Charge'
                                : option === 'UNIFORM'
                                  ? 'SMTC School Uniform'
                                  : 'SMTC Purple Medical Scrub'}
                        </option>
                      ));
                    })()}
                  </select>
                </Field>

                {editForm.paymentComponent === 'TUITION' && (
                  <Field label="Academic Term">
                    <select
                      value={editForm.termNumber}
                      onChange={(event) =>
                        setEditForm((value) => ({
                          ...value,
                          termNumber: event.target.value,
                        }))
                      }
                      className="field"
                    >
                      {Array.from(
                        {
                          length: Math.max(
                            1,
                            Number(
                              students.find(
                                (item) =>
                                  item.application_id ===
                                  editingPayment.application_id,
                              )?.total_terms || 6,
                            ),
                          ),
                        },
                        (_, index) => index + 1,
                      ).map((term) => (
                        <option key={term} value={term}>
                          Term {term}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Transaction / Bank Reference">
                  <input
                    required
                    maxLength={40}
                    value={editForm.referenceCode}
                    onChange={(event) =>
                      setEditForm((value) => ({
                        ...value,
                        referenceCode: event.target.value.toUpperCase(),
                      }))
                    }
                    className="field font-mono uppercase"
                  />
                </Field>

                <Field label="Phone Number">
                  <input
                    value={editForm.phoneNumber}
                    onChange={(event) =>
                      setEditForm((value) => ({
                        ...value,
                        phoneNumber: event.target.value,
                      }))
                    }
                    placeholder="e.g. 0712345678"
                    className="field"
                  />
                </Field>

                <Field label="Date Paid">
                  <input
                    type="date"
                    max={today()}
                    required
                    value={editForm.paymentDate}
                    onChange={(event) =>
                      setEditForm((value) => ({
                        ...value,
                        paymentDate: event.target.value,
                      }))
                    }
                    className="field"
                  />
                </Field>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                The API validates the edited amount against the
                outstanding balance of the selected fee allocation and
                checks for duplicate transaction references. The
                original receipt number will be retained.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSaving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   REUSABLE PRESENTATION COMPONENTS
========================================================= */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-bold text-brand-dark">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-brand-cream p-3 text-brand-green">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-brand-dark">
        {value || '—'}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-bold text-brand-dark">
        {value}
      </p>
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
      <p className="text-xs font-semibold uppercase text-slate-500">
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

function MethodButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${
        active
          ? 'border-brand-green bg-brand-cream text-brand-green ring-2 ring-brand-green/10'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function AlertBox({
  type,
  message,
}: {
  type: 'error' | 'success' | 'warning';
  message: string;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles[type]}`}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      {message}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading records...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
