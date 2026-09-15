'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
ArrowLeft,
CheckCircle2,
Clipboard,
ExternalLink,
Loader2,
UserPlus,
AlertCircle,
} from 'lucide-react';

const COURSES = [
'EMT',
'Diploma in Paramedicine',
'Safe Phlebotomy',
'German Language',
'Caregiving Level 4',
'Dialysis Technology',
];

const INTAKES = [
'September 2026 Intake',
'January 2027 Intake',
'March 2027 Intake',
'May 2027 Intake',
];

type CreatedStudent = {
application: {
id: number;
application_number: string;
course: string;
intake: string;
application_fee: number | string;
payment_status: string;
application_status: string;
};
admission: {
id: number;
admission_number: string;
admission_status: string;
admission_date: string;
};
portal: {
application_number: string;
phone: string;
login_url: string;
};
};

type ApiResponse = {
success?: boolean;
message?: string;
student?: CreatedStudent;
};

export default function ManualStudentPage() {
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState('');
const [createdStudent, setCreatedStudent] =
useState<CreatedStudent | null>(null);

const [form, setForm] = useState({
firstName: '',
middleName: '',
surname: '',
mobile: '',
email: '',
course: '',
intake: '',
admissionNumber: '',
admissionDate: new Date().toISOString().split('T')[0],
applicationFee: '1500',
paymentStatus: 'paid',
});

function updateField(
field: keyof typeof form,
value: string
) {
setForm((current) => ({
...current,
[field]: value,
}));
}

async function handleSubmit(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();

setError('');
setCreatedStudent(null);

if (!form.firstName.trim()) {
  setError('First name is required.');
  return;
}

if (!form.surname.trim()) {
  setError('Surname is required.');
  return;
}

if (!form.mobile.trim()) {
  setError('Phone number is required.');
  return;
}

if (!form.course) {
  setError('Please select a course.');
  return;
}

if (!form.intake) {
  setError('Please select an intake.');
  return;
}

if (!form.admissionNumber.trim()) {
  setError(
    'The student admission number is required.'
  );
  return;
}

if (!form.admissionDate) {
  setError('Admission date is required.');
  return;
}

setIsSubmitting(true);

try {
  const response = await fetch(
    '/api/admin/manual-students',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        surname: form.surname.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        course: form.course,
        intake: form.intake,
        admissionNumber:
          form.admissionNumber.trim(),
        admissionDate: form.admissionDate,
        applicationFee: Number(
          form.applicationFee || '0'
        ),
        paymentStatus: form.paymentStatus,
      }),
    }
  );

  const data =
    (await response.json()) as ApiResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        'Unable to create the manual student.'
    );
  }

  if (!data.student) {
    throw new Error(
      'The student was created, but no student information was returned.'
    );
  }

  setCreatedStudent(data.student);
} catch (submitError) {
  setError(
    submitError instanceof Error
      ? submitError.message
      : 'Unable to create the manual student.'
  );
} finally {
  setIsSubmitting(false);
}

}

function resetForm() {
setForm({
firstName: '',
middleName: '',
surname: '',
mobile: '',
email: '',
course: '',
intake: '',
admissionNumber: '',
admissionDate:
new Date().toISOString().split('T')[0],
applicationFee: '1500',
paymentStatus: 'paid',
});

setError('');
setCreatedStudent(null);

}

async function copyText(value: string) {
try {
await navigator.clipboard.writeText(value);
} catch {
// Clipboard access may be unavailable in some browsers.
}
}

if (createdStudent) {
const student =
createdStudent.application;

const admission =
  createdStudent.admission;

const portal =
  createdStudent.portal;

return (
  <main className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/dashboard/students"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          <ArrowLeft size={17} />
          Back to Students
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="bg-emerald-700 px-6 py-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Student Created Successfully
              </h1>

              <p className="mt-1 text-sm text-emerald-50">
                The manual student has been added to
                the admissions system.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              label="Student Name"
              value={[
                form.firstName,
                form.middleName,
                form.surname,
              ]
                .filter(Boolean)
                .join(' ')}
            />

            <InfoCard
              label="Course"
              value={student.course}
            />

            <InfoCard
              label="Intake"
              value={student.intake}
            />

            <InfoCard
              label="Admission Number"
              value={admission.admission_number}
              copyable
              onCopy={() =>
                copyText(
                  admission.admission_number
                )
              }
            />

            <InfoCard
              label="Application Number"
              value={portal.application_number}
              copyable
              onCopy={() =>
                copyText(
                  portal.application_number
                )
              }
            />

            <InfoCard
              label="Login Phone"
              value={portal.phone}
              copyable
              onCopy={() =>
                copyText(portal.phone)
              }
            />
          </div>

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-semibold text-blue-900">
              Student Portal Credentials
            </h2>

            <p className="mt-1 text-sm text-blue-800">
              Give the student the application number
              and phone number below. They can use
              these credentials to access the existing
              student portal.
            </p>

            <div className="mt-4 space-y-3">
              <CredentialRow
                label="Application Number"
                value={
                  portal.application_number
                }
                onCopy={() =>
                  copyText(
                    portal.application_number
                  )
                }
              />

              <CredentialRow
                label="Phone Number"
                value={portal.phone}
                onCopy={() =>
                  copyText(portal.phone)
                }
              />
            </div>

            <div className="mt-5">
              <a
                href={portal.login_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Open Student Login
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-semibold text-slate-900">
              Admission Details
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <InfoCard
                label="Admission Number"
                value={
                  admission.admission_number
                }
              />

              <InfoCard
                label="Admission Status"
                value={
                  admission.admission_status
                }
              />

              <InfoCard
                label="Admission Date"
                value={
                  admission.admission_date
                }
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                copyText(
                  [
                    `Application Number: ${portal.application_number}`,
                    `Phone: ${portal.phone}`,
                    `Admission Number: ${admission.admission_number}`,
                  ].join('\n')
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Clipboard size={17} />
              Copy Credentials
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <UserPlus size={17} />
              Add Another Student
            </button>
          </div>
        </div>
      </section>
    </div>
  </main>
);

}

return ( <main className="min-h-screen bg-slate-50 px-4 py-8"> <div className="mx-auto max-w-5xl"> <div className="mb-6"> <Link
         href="/admin/dashboard/students"
         className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
       > <ArrowLeft size={17} />
Back to Students </Link> </div>

```
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <UserPlus size={25} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Add Manual Student
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Register a student who applied manually
            and already has an official admission number.
          </p>
        </div>
      </div>
    </div>

    {error && (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <AlertCircle
          size={20}
          className="mt-0.5 shrink-0"
        />

        <div>
          <p className="font-semibold">
            Unable to create student
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>
      </div>
    )}

    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Student Information
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enter the student's basic information.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <Field
            label="First Name"
            required
            value={form.firstName}
            onChange={(value) =>
              updateField('firstName', value)
            }
            placeholder="First name"
          />

          <Field
            label="Middle Name"
            value={form.middleName}
            onChange={(value) =>
              updateField('middleName', value)
            }
            placeholder="Middle name"
          />

          <Field
            label="Surname"
            required
            value={form.surname}
            onChange={(value) =>
              updateField('surname', value)
            }
            placeholder="Surname"
          />

          <Field
            label="Phone Number"
            required
            value={form.mobile}
            onChange={(value) =>
              updateField('mobile', value)
            }
            placeholder="0712345678"
            type="tel"
          />

          <Field
            label="Email Address"
            value={form.email}
            onChange={(value) =>
              updateField('email', value)
            }
            placeholder="student@example.com"
            type="email"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Academic Details
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Select the student's course and intake.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <SelectField
            label="Course"
            required
            value={form.course}
            onChange={(value) =>
              updateField('course', value)
            }
            options={COURSES}
            placeholder="Select course"
          />

          <SelectField
            label="Intake"
            required
            value={form.intake}
            onChange={(value) =>
              updateField('intake', value)
            }
            options={INTAKES}
            placeholder="Select intake"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Admission & Payment
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Enter the official admission number already
          assigned to this student. It will be preserved
          exactly as entered.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Official Admission Number"
            required
            value={form.admissionNumber}
            onChange={(value) =>
              updateField(
                'admissionNumber',
                value
              )
            }
            placeholder="SMTC/GEM01/026"
          />

          <Field
            label="Admission Date"
            required
            value={form.admissionDate}
            onChange={(value) =>
              updateField(
                'admissionDate',
                value
              )
            }
            type="date"
          />

          <Field
            label="Application Fee"
            value={form.applicationFee}
            onChange={(value) =>
              updateField(
                'applicationFee',
                value
              )
            }
            type="number"
            min="0"
            step="1"
          />

          <SelectField
            label="Application Fee Status"
            required
            value={form.paymentStatus}
            onChange={(value) =>
              updateField(
                'paymentStatus',
                value
              )
            }
            options={['paid', 'pending']}
            placeholder="Select payment status"
          />
        </div>

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Important:</strong> The admission
          number above is the student's existing official
          admission number. The system will not generate
          a replacement admission number.
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={resetForm}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear Form
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />
              Creating Student...
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Create Manual Student
            </>
          )}
        </button>
      </div>
    </form>
  </div>
</main>

);
}

type FieldProps = {
label: string;
value: string;
onChange: (value: string) => void;
placeholder?: string;
type?: string;
required?: boolean;
min?: string;
step?: string;
};

function Field({
label,
value,
onChange,
placeholder,
type = 'text',
required = false,
min,
step,
}: FieldProps) {
return ( <label className="block"> <span className="mb-2 block text-sm font-medium text-slate-700">
{label}
{required && ( <span className="ml-1 text-red-600">
* </span>
)} </span>

  <input
    type={type}
    value={value}
    onChange={(event) =>
      onChange(event.target.value)
    }
    placeholder={placeholder}
    required={required}
    min={min}
    step={step}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
  />
</label>

);
}

type SelectFieldProps = {
label: string;
value: string;
onChange: (value: string) => void;
options: string[];
placeholder: string;
required?: boolean;
};

function SelectField({
label,
value,
onChange,
options,
placeholder,
required = false,
}: SelectFieldProps) {
return ( <label className="block"> <span className="mb-2 block text-sm font-medium text-slate-700">
{label}
{required && ( <span className="ml-1 text-red-600">
* </span>
)} </span>

  <select
    value={value}
    onChange={(event) =>
      onChange(event.target.value)
    }
    required={required}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
  >
    <option value="">
      {placeholder}
    </option>

    {options.map((option) => (
      <option
        key={option}
        value={option}
      >
        {option}
      </option>
    ))}
  </select>
</label>

);
}

type InfoCardProps = {
label: string;
value: string;
copyable?: boolean;
onCopy?: () => void;
};

function InfoCard({
label,
value,
copyable = false,
onCopy,
}: InfoCardProps) {
return ( <div className="rounded-xl border border-slate-200 bg-white p-4"> <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
{label} </p>
  <div className="mt-1 flex items-center justify-between gap-3">
    <p className="break-all font-semibold text-slate-900">
      {value || '—'}
    </p>

    {copyable && onCopy && (
      <button
        type="button"
        onClick={onCopy}
        title={`Copy ${label}`}
        className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Clipboard size={16} />
      </button>
    )}
  </div>
</div>


);
}

type CredentialRowProps = {
label: string;
value: string;
onCopy: () => void;
};

function CredentialRow({
label,
value,
onCopy,
}: CredentialRowProps) {
return ( <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"> <div> <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
{label} </p>

    <p className="mt-1 break-all font-semibold text-slate-900">
      {value}
    </p>
  </div>

  <button
    type="button"
    onClick={onCopy}
    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
  >
    <Clipboard size={15} />
    Copy
  </button>
</div>


);
}
