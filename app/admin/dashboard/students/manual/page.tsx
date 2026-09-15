'use client';

import Link from 'next/link';
import {
ChangeEvent,
FormEvent,
useState,
} from 'react';
import {
AlertCircle,
ArrowLeft,
CheckCircle2,
Clipboard,
ExternalLink,
Loader2,
UserPlus,
} from 'lucide-react';

/* =========================================================
CONSTANTS
========================================================= */

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

const KCSE_GRADES = [
'A',
'A-',
'B+',
'B',
'B-',
'C+',
'C',
'C-',
'D+',
'D',
'D-',
'E',
];

const STEPS = [
'Personal Information',
'Contact Details',
'Academic Information',
'Course & Sponsorship',
'Parent / Guardian',
'Supporting Documents',
'Review Application',
];

const inputClass =
'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100';

const today = () =>
new Date().toISOString().split('T')[0];

/* =========================================================
TYPES
========================================================= */

type SponsorType =
| ''
| 'Self'
| 'Parent'
| 'Guardian'
| 'Sponsor';

type UploadedFile = File | null;

type FormData = {
surname: string;
middleName: string;
firstName: string;
dateOfBirth: string;
gender: string;
nationality: string;
country: string;
idPassportNumber: string;
maritalStatus: string;

postalAddress: string;
postalCode: string;
town: string;
county: string;
mobile: string;
email: string;

kcseIndex: string;
kcseYear: string;
kcseMeanGrade: string;
englishGrade: string;
kiswahiliGrade: string;
biologyGrade: string;
chemistryGrade: string;
physicsGrade: string;
mathematicsGrade: string;
previousInstitution: string;
highestQualification: string;

course: string;
intake: string;
sponsorType: SponsorType;
sponsorName: string;
sponsorRelationship: string;
sponsorMobile: string;
sponsorEmail: string;

guardianName: string;
guardianRelationship: string;
guardianMobile: string;
guardianEmail: string;

idDocument: UploadedFile;
kcseCertificate: UploadedFile;
passportPhoto: UploadedFile;

declaration: boolean;

admissionNumber: string;
admissionDate: string;
applicationFee: string;
paymentStatus: string;
};

type Errors = Partial<
Record<
| keyof FormData
| 'submit',
string

> >;

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

/* =========================================================
INITIAL FORM
========================================================= */

function createInitialForm(): FormData {
return {
surname: '',
middleName: '',
firstName: '',
dateOfBirth: '',
gender: '',
nationality: 'Kenyan',
country: 'Kenya',
idPassportNumber: '',
maritalStatus: '',

postalAddress: '',
postalCode: '',
town: '',
county: '',
mobile: '',
email: '',

kcseIndex: '',
kcseYear: '',
kcseMeanGrade: '',
englishGrade: '',
kiswahiliGrade: '',
biologyGrade: '',
chemistryGrade: '',
physicsGrade: '',
mathematicsGrade: '',
previousInstitution: '',
highestQualification: '',

course: '',
intake: '',
sponsorType: '',
sponsorName: '',
sponsorRelationship: '',
sponsorMobile: '',
sponsorEmail: '',

guardianName: '',
guardianRelationship: '',
guardianMobile: '',
guardianEmail: '',

idDocument: null,
kcseCertificate: null,
passportPhoto: null,

declaration: false,

admissionNumber: '',
admissionDate: today(),
applicationFee: '1500',
paymentStatus: 'paid',

};
}

/* =========================================================
PAGE
========================================================= */

export default function ManualStudentPage() {
const [step, setStep] = useState(1);
const [data, setData] =
useState<FormData>(createInitialForm);

const [errors, setErrors] =
useState<Errors>({});

const [submitError, setSubmitError] =
useState('');

const [isSubmitting, setIsSubmitting] =
useState(false);

const [createdStudent, setCreatedStudent] =
useState<CreatedStudent | null>(null);

/* =======================================================
UPDATE FIELD
======================================================= */

function updateField<K extends keyof FormData>(
field: K,
value: FormData[K]
) {
setData((current) => ({
...current,
[field]: value,
}));

setErrors((current) => {
  const next = {
    ...current,
  };

  delete next[field];

  return next;
});

setSubmitError('');

}

/* =======================================================
VALIDATION
======================================================= */

function validateStep(
currentStep: number
): boolean {
const nextErrors: Errors = {};

if (currentStep === 1) {
  if (!data.surname.trim()) {
    nextErrors.surname =
      'Surname is required.';
  }

  if (!data.firstName.trim()) {
    nextErrors.firstName =
      'First name is required.';
  }

  if (!data.dateOfBirth) {
    nextErrors.dateOfBirth =
      'Date of birth is required.';
  }

  if (!data.gender) {
    nextErrors.gender =
      'Gender is required.';
  }

  if (!data.idPassportNumber.trim()) {
    nextErrors.idPassportNumber =
      'ID / Passport number is required.';
  }
}

if (currentStep === 2) {
  if (!data.county.trim()) {
    nextErrors.county =
      'County is required.';
  }

  if (!data.mobile.trim()) {
    nextErrors.mobile =
      'Mobile number is required.';
  }

  if (!data.email.trim()) {
    nextErrors.email =
      'Email address is required.';
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      data.email.trim()
    )
  ) {
    nextErrors.email =
      'Please enter a valid email address.';
  }
}

if (currentStep === 3) {
  if (!data.kcseIndex.trim()) {
    nextErrors.kcseIndex =
      'KCSE index number is required.';
  }

  if (!data.kcseYear.trim()) {
    nextErrors.kcseYear =
      'KCSE year is required.';
  }

  if (!data.kcseMeanGrade) {
    nextErrors.kcseMeanGrade =
      'KCSE mean grade is required.';
  }
}

if (currentStep === 4) {
  if (!data.course) {
    nextErrors.course =
      'Please select a course.';
  }

  if (!data.intake) {
    nextErrors.intake =
      'Please select an intake.';
  }

  if (!data.sponsorType) {
    nextErrors.sponsorType =
      'Please select the sponsor type.';
  }

  if (
    data.sponsorType !== 'Self' &&
    !data.sponsorName.trim()
  ) {
    nextErrors.sponsorName =
      'Sponsor name is required.';
  }
}

if (currentStep === 5) {
  if (!data.guardianName.trim()) {
    nextErrors.guardianName =
      'Guardian / next of kin name is required.';
  }

  if (!data.guardianMobile.trim()) {
    nextErrors.guardianMobile =
      'Guardian mobile number is required.';
  }
}

if (currentStep === 6) {
  if (!data.idDocument) {
    nextErrors.idDocument =
      'National ID / Passport document is required.';
  }

  if (!data.kcseCertificate) {
    nextErrors.kcseCertificate =
      'KCSE Certificate / Result Slip is required.';
  }

  if (!data.passportPhoto) {
    nextErrors.passportPhoto =
      'Passport photo is required.';
  }
}

if (currentStep === 7) {
  if (!data.admissionNumber.trim()) {
    nextErrors.admissionNumber =
      'Official admission number is required.';
  }

  if (!data.admissionDate) {
    nextErrors.admissionDate =
      'Admission date is required.';
  }

  if (!data.declaration) {
    nextErrors.declaration =
      'The declaration must be accepted.';
  }
}

setErrors(nextErrors);

return Object.keys(nextErrors).length === 0;

}

/* =======================================================
NEXT / PREVIOUS
======================================================= */

function handleNext() {
if (!validateStep(step)) {
return;
}
if (step < STEPS.length) {
  setStep((current) => current + 1);

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

}

function handlePrevious() {
if (step > 1) {
setStep((current) => current - 1);

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

}

/* =======================================================
FILE HANDLER
======================================================= */

function handleFileChange(
field:
| 'idDocument'
| 'kcseCertificate'
| 'passportPhoto',
event: ChangeEvent<HTMLInputElement>
) {
const file =
event.target.files?.[0] ?? null;

if (!file) {
  updateField(field, null);
  return;
}

if (file.size > 5 * 1024 * 1024) {
  setErrors((current) => ({
    ...current,
    [field]:
      'Maximum file size is 5 MB.',
  }));

  event.target.value = '';
  return;
}

const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

if (!allowedTypes.includes(file.type)) {
  setErrors((current) => ({
    ...current,
    [field]:
      'Only PDF, JPG and PNG files are accepted.',
  }));

  event.target.value = '';
  return;
}

updateField(field, file);

}

/* =======================================================
SUBMIT
======================================================= */

async function handleFinalSubmit(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (!validateStep(7)) {
  return;
}

setIsSubmitting(true);
setSubmitError('');
setErrors({});

try {
  const formData = new FormData();

  formData.append(
    'surname',
    data.surname.trim()
  );

  formData.append(
    'middleName',
    data.middleName.trim()
  );

  formData.append(
    'firstName',
    data.firstName.trim()
  );

  formData.append(
    'dateOfBirth',
    data.dateOfBirth
  );

  formData.append(
    'gender',
    data.gender
  );

  formData.append(
    'nationality',
    data.nationality.trim()
  );

  formData.append(
    'country',
    data.country.trim()
  );

  formData.append(
    'idPassportNumber',
    data.idPassportNumber.trim()
  );

  formData.append(
    'maritalStatus',
    data.maritalStatus
  );

  formData.append(
    'postalAddress',
    data.postalAddress.trim()
  );

  formData.append(
    'postalCode',
    data.postalCode.trim()
  );

  formData.append(
    'town',
    data.town.trim()
  );

  formData.append(
    'county',
    data.county.trim()
  );

  formData.append(
    'mobile',
    data.mobile.trim()
  );

  formData.append(
    'email',
    data.email.trim()
  );

  formData.append(
    'kcseIndex',
    data.kcseIndex.trim()
  );

  formData.append(
    'kcseYear',
    data.kcseYear.trim()
  );

  formData.append(
    'kcseMeanGrade',
    data.kcseMeanGrade
  );

  formData.append(
    'englishGrade',
    data.englishGrade
  );

  formData.append(
    'kiswahiliGrade',
    data.kiswahiliGrade
  );

  formData.append(
    'biologyGrade',
    data.biologyGrade
  );

  formData.append(
    'chemistryGrade',
    data.chemistryGrade
  );

  formData.append(
    'physicsGrade',
    data.physicsGrade
  );

  formData.append(
    'mathematicsGrade',
    data.mathematicsGrade
  );

  formData.append(
    'previousInstitution',
    data.previousInstitution.trim()
  );

  formData.append(
    'highestQualification',
    data.highestQualification.trim()
  );

  formData.append(
    'course',
    data.course
  );

  formData.append(
    'intake',
    data.intake
  );

  formData.append(
    'sponsorType',
    data.sponsorType
  );

  formData.append(
    'sponsorName',
    data.sponsorName.trim()
  );

  formData.append(
    'sponsorRelationship',
    data.sponsorRelationship.trim()
  );

  formData.append(
    'sponsorMobile',
    data.sponsorMobile.trim()
  );

  formData.append(
    'sponsorEmail',
    data.sponsorEmail.trim()
  );

  formData.append(
    'guardianName',
    data.guardianName.trim()
  );

  formData.append(
    'guardianRelationship',
    data.guardianRelationship
  );

  formData.append(
    'guardianMobile',
    data.guardianMobile.trim()
  );

  formData.append(
    'guardianEmail',
    data.guardianEmail.trim()
  );

  formData.append(
    'admissionNumber',
    data.admissionNumber.trim()
  );

  formData.append(
    'admissionDate',
    data.admissionDate
  );

  formData.append(
    'applicationFee',
    data.applicationFee || '0'
  );

  formData.append(
    'paymentStatus',
    data.paymentStatus
  );

  formData.append(
    'declaration',
    data.declaration ? 'true' : 'false'
  );

  if (data.idDocument) {
    formData.append(
      'idDocument',
      data.idDocument
    );
  }

  if (data.kcseCertificate) {
    formData.append(
      'kcseCertificate',
      data.kcseCertificate
    );
  }

  if (data.passportPhoto) {
    formData.append(
      'passportPhoto',
      data.passportPhoto
    );
  }

  const response = await fetch(
    '/api/admin/manual-students',
    {
      method: 'POST',
      body: formData,
    }
  );

  const result =
    (await response.json()) as ApiResponse;

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        'Unable to create the manual student.'
    );
  }

  if (!result.student) {
    throw new Error(
      'The student was created, but no student information was returned.'
    );
  }

  setCreatedStudent(result.student);

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
} catch (submitError) {
  setSubmitError(
    submitError instanceof Error
      ? submitError.message
      : 'Unable to create the manual student.'
  );

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
} finally {
  setIsSubmitting(false);
}

}

/* =======================================================
RESET
======================================================= */

function resetForm() {
setStep(1);
setData(createInitialForm());
setErrors({});
setSubmitError('');
setCreatedStudent(null);

window.scrollTo({
  top: 0,
  behavior: 'smooth',
});

}

/* =======================================================
COPY
======================================================= */

async function copyText(value: string) {
try {
await navigator.clipboard.writeText(value);
} catch {
// Clipboard may be unavailable.
}
}

/* =======================================================
SUCCESS
======================================================= */

if (createdStudent) {
const student =
createdStudent.application;

const admission =
  createdStudent.admission;

const portal =
  createdStudent.portal;

const fullName = [
  data.surname,
  data.middleName,
  data.firstName,
]
  .filter(Boolean)
  .join(' ');

return (
  <main className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/dashboard/students"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 transition hover:text-green-900"
        >
          <ArrowLeft size={17} />
          Back to Students
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl border border-green-200 bg-white shadow-sm">
        <div className="bg-green-700 px-6 py-8 text-white sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold">
                Student Created Successfully
              </h1>

              <p className="mt-1 text-sm text-green-50">
                The manually registered student has
                been added to the SMTC admissions system.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              label="Student Name"
              value={fullName}
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
              value={
                portal.application_number
              }
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

          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-extrabold text-blue-900">
              Student Portal Credentials
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Give the student the application number
              and phone number below. These are the
              credentials used by the existing SMTC
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
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                Open Student Login
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-extrabold text-slate-900">
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

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <InfoCard
              label="Application Status"
              value={
                student.application_status
              }
            />

            <InfoCard
              label="Payment Status"
              value={
                student.payment_status
              }
            />
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Clipboard size={17} />
              Copy Credentials
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800"
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

/* =======================================================
APPLICATION FORM
======================================================= */

return ( <main className="min-h-screen bg-slate-50 px-4 py-8"> <div className="mx-auto max-w-5xl">
{/* =================================================
BACK
================================================= */}

    <div className="mb-6">
      <Link
        href="/admin/dashboard/students"
        className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 transition hover:text-green-900"
      >
        <ArrowLeft size={17} />
        Back to Students
      </Link>
    </div>

    {/* =================================================
        HEADER
    ================================================= */}

    <div className="mb-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
          <UserPlus size={25} />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-600">
            SMTC Admissions
          </p>

          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Add Manual Student
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Register a student who applied manually and
            already has an official SMTC admission number.
            Complete the application information as it
            appears on the student's official documents.
          </p>
        </div>
      </div>
    </div>

    {/* =================================================
        ERROR
    ================================================= */}

    {(submitError ||
      Object.keys(errors).length > 0) &&
      submitError && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
          role="alert"
        >
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-bold">
              Unable to create student
            </p>

            <p className="mt-1 text-sm leading-6">
              {submitError}
            </p>
          </div>
        </div>
      )}

    {/* =================================================
        FORM
    ================================================= */}

    <form
      onSubmit={handleFinalSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
    >
      {/* =================================================
          PROGRESS
      ================================================= */}

      <div className="mb-10">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-600">
              SMTC Admission
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Step {step} of {STEPS.length}
            </h2>
          </div>

          <p className="text-sm font-semibold text-slate-500">
            {STEPS[step - 1]}
          </p>
        </div>

        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          aria-label={`Application progress: step ${step} of ${STEPS.length}`}
        >
          <div
            className="h-full rounded-full bg-green-600 transition-all duration-300"
            style={{
              width: `${
                (step / STEPS.length) * 100
              }%`,
            }}
          />
        </div>

        <div className="mt-5 hidden gap-2 md:flex">
          {STEPS.map((item, index) => {
            const number = index + 1;
            const active = number === step;
            const completed = number < step;

            return (
              <div
                key={item}
                className={`flex-1 text-center text-[11px] font-bold ${
                  active || completed
                    ? 'text-green-600'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    active || completed
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {completed
                    ? '✓'
                    : number}
                </span>

                {item}
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================
          STEP 1
      ================================================= */}

      {step === 1 && (
        <section>
          <SectionTitle
            title="Personal Information"
            description="Enter the student's personal information as it appears on official documents."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Surname"
              required
              value={data.surname}
              error={errors.surname}
              onChange={(value) =>
                updateField(
                  'surname',
                  value
                )
              }
              placeholder="Enter surname"
            />

            <Field
              label="Middle Name"
              value={data.middleName}
              onChange={(value) =>
                updateField(
                  'middleName',
                  value
                )
              }
              placeholder="Enter middle name"
            />

            <Field
              label="First Name"
              required
              value={data.firstName}
              error={errors.firstName}
              onChange={(value) =>
                updateField(
                  'firstName',
                  value
                )
              }
              placeholder="Enter first name"
            />

            <Field
              label="Date of Birth"
              required
              value={data.dateOfBirth}
              error={errors.dateOfBirth}
              onChange={(value) =>
                updateField(
                  'dateOfBirth',
                  value
                )
              }
              type="date"
            />

            <SelectField
              label="Gender"
              required
              value={data.gender}
              error={errors.gender}
              onChange={(value) =>
                updateField(
                  'gender',
                  value
                )
              }
              options={[
                'Male',
                'Female',
              ]}
              placeholder="Select gender"
            />

            <Field
              label="Nationality"
              value={data.nationality}
              onChange={(value) =>
                updateField(
                  'nationality',
                  value
                )
              }
            />

            <Field
              label="Country"
              value={data.country}
              onChange={(value) =>
                updateField(
                  'country',
                  value
                )
              }
            />

            <Field
              label="ID / Passport Number"
              required
              value={
                data.idPassportNumber
              }
              error={
                errors.idPassportNumber
              }
              onChange={(value) =>
                updateField(
                  'idPassportNumber',
                  value
                )
              }
              placeholder="Enter ID or passport number"
            />

            <SelectField
              label="Marital Status"
              value={
                data.maritalStatus
              }
              onChange={(value) =>
                updateField(
                  'maritalStatus',
                  value
                )
              }
              options={[
                'Single',
                'Married',
                'Divorced',
                'Widowed',
              ]}
              placeholder="Select marital status"
            />
          </div>
        </section>
      )}

      {/* =================================================
          STEP 2
      ================================================= */}

      {step === 2 && (
        <section>
          <SectionTitle
            title="Contact Details"
            description="Provide accurate contact details for communication with the student."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Postal Address"
              value={
                data.postalAddress
              }
              onChange={(value) =>
                updateField(
                  'postalAddress',
                  value
                )
              }
              placeholder="P.O. Box / Postal Address"
            />

            <Field
              label="Postal Code"
              value={data.postalCode}
              onChange={(value) =>
                updateField(
                  'postalCode',
                  value
                )
              }
              placeholder="e.g. 30200"
            />

            <Field
              label="Town"
              value={data.town}
              onChange={(value) =>
                updateField(
                  'town',
                  value
                )
              }
              placeholder="Enter town"
            />

            <Field
              label="County"
              required
              value={data.county}
              error={errors.county}
              onChange={(value) =>
                updateField(
                  'county',
                  value
                )
              }
              placeholder="Enter county"
            />

            <Field
              label="Mobile Number"
              required
              value={data.mobile}
              error={errors.mobile}
              onChange={(value) =>
                updateField(
                  'mobile',
                  value
                )
              }
              placeholder="e.g. 0712345678"
              type="tel"
            />

            <Field
              label="Email Address"
              required
              value={data.email}
              error={errors.email}
              onChange={(value) =>
                updateField(
                  'email',
                  value
                )
              }
              placeholder="example@email.com"
              type="email"
            />
          </div>
        </section>
      )}

      {/* =================================================
          STEP 3
      ================================================= */}

      {step === 3 && (
        <section>
          <SectionTitle
            title="Academic Information"
            description="Enter the student's KCSE information and previous educational background."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="KCSE Index Number"
              required
              value={data.kcseIndex}
              error={errors.kcseIndex}
              onChange={(value) =>
                updateField(
                  'kcseIndex',
                  value
                )
              }
              placeholder="Enter KCSE index number"
            />

            <Field
              label="KCSE Year"
              required
              value={data.kcseYear}
              error={errors.kcseYear}
              onChange={(value) =>
                updateField(
                  'kcseYear',
                  value
                )
              }
              placeholder="e.g. 2025"
              type="number"
              min="1990"
              max={String(
                new Date().getFullYear()
              )}
            />

            <SelectField
              label="KCSE Mean Grade"
              required
              value={
                data.kcseMeanGrade
              }
              error={
                errors.kcseMeanGrade
              }
              onChange={(value) =>
                updateField(
                  'kcseMeanGrade',
                  value
                )
              }
              options={KCSE_GRADES}
              placeholder="Select mean grade"
            />

            <GradeField
              label="English Grade"
              value={
                data.englishGrade
              }
              onChange={(value) =>
                updateField(
                  'englishGrade',
                  value
                )
              }
            />

            <GradeField
              label="Kiswahili Grade"
              value={
                data.kiswahiliGrade
              }
              onChange={(value) =>
                updateField(
                  'kiswahiliGrade',
                  value
                )
              }
            />

            <GradeField
              label="Biology Grade"
              value={
                data.biologyGrade
              }
              onChange={(value) =>
                updateField(
                  'biologyGrade',
                  value
                )
              }
            />

            <GradeField
              label="Chemistry Grade"
              value={
                data.chemistryGrade
              }
              onChange={(value) =>
                updateField(
                  'chemistryGrade',
                  value
                )
              }
            />

            <GradeField
              label="Physics Grade"
              value={
                data.physicsGrade
              }
              onChange={(value) =>
                updateField(
                  'physicsGrade',
                  value
                )
              }
            />

            <GradeField
              label="Mathematics Grade"
              value={
                data.mathematicsGrade
              }
              onChange={(value) =>
                updateField(
                  'mathematicsGrade',
                  value
                )
              }
            />

            <Field
              label="Previous Institution"
              value={
                data.previousInstitution
              }
              onChange={(value) =>
                updateField(
                  'previousInstitution',
                  value
                )
              }
              placeholder="Previous school / college"
            />

            <Field
              label="Highest Qualification"
              value={
                data.highestQualification
              }
              onChange={(value) =>
                updateField(
                  'highestQualification',
                  value
                )
              }
              placeholder="e.g. KCSE"
            />
          </div>
        </section>
      )}

      {/* =================================================
          STEP 4
      ================================================= */}

      {step === 4 && (
        <section>
          <SectionTitle
            title="Course & Sponsorship"
            description="Select the student's course and intake, then provide sponsorship information."
          />

          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Course Applied For"
                required
                value={data.course}
                error={errors.course}
                onChange={(value) =>
                  updateField(
                    'course',
                    value
                  )
                }
                options={COURSES}
                placeholder="Select course"
              />

              <SelectField
                label="Preferred Intake"
                required
                value={data.intake}
                error={errors.intake}
                onChange={(value) =>
                  updateField(
                    'intake',
                    value
                  )
                }
                options={INTAKES}
                placeholder="Select intake"
              />
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-sm font-extrabold text-slate-900">
                Sponsorship Information
              </h4>

              <p className="mt-1 text-xs leading-6 text-slate-500">
                Tell us who will be responsible for
                financing the student's education.
              </p>
            </div>

            <SelectField
              label="Who will sponsor the studies?"
              required
              value={data.sponsorType}
              error={errors.sponsorType}
              onChange={(value) =>
                updateField(
                  'sponsorType',
                  value as SponsorType
                )
              }
              options={[
                'Self',
                'Parent',
                'Guardian',
                'Sponsor',
              ]}
              placeholder="Select sponsor"
            />

            {data.sponsorType && (
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label={
                    data.sponsorType ===
                    'Self'
                      ? 'Applicant Name'
                      : 'Sponsor Name'
                  }
                  required={
                    data.sponsorType !==
                    'Self'
                  }
                  value={
                    data.sponsorName
                  }
                  error={
                    errors.sponsorName
                  }
                  onChange={(value) =>
                    updateField(
                      'sponsorName',
                      value
                    )
                  }
                  placeholder="Enter full name"
                />

                <Field
                  label="Relationship"
                  value={
                    data.sponsorRelationship
                  }
                  onChange={(value) =>
                    updateField(
                      'sponsorRelationship',
                      value
                    )
                  }
                  placeholder="e.g. Father"
                />

                <Field
                  label="Mobile Number"
                  value={
                    data.sponsorMobile
                  }
                  onChange={(value) =>
                    updateField(
                      'sponsorMobile',
                      value
                    )
                  }
                  placeholder="Sponsor mobile number"
                  type="tel"
                />

                <Field
                  label="Email Address"
                  value={
                    data.sponsorEmail
                  }
                  error={
                    errors.sponsorEmail
                  }
                  onChange={(value) =>
                    updateField(
                      'sponsorEmail',
                      value
                    )
                  }
                  placeholder="Sponsor email"
                  type="email"
                />
              </div>
            )}

            <FeeNotice />

            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <h4 className="text-sm font-extrabold text-green-900">
                Admin Admission Details
              </h4>

              <p className="mt-1 text-xs leading-6 text-green-800">
                Enter the official admission details
                already assigned to this manually
                registered student.
              </p>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="Official Admission Number"
                  required
                  value={
                    data.admissionNumber
                  }
                  error={
                    errors.admissionNumber
                  }
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
                  value={
                    data.admissionDate
                  }
                  error={
                    errors.admissionDate
                  }
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
                  value={
                    data.applicationFee
                  }
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
                  value={
                    data.paymentStatus
                  }
                  onChange={(value) =>
                    updateField(
                      'paymentStatus',
                      value
                    )
                  }
                  options={[
                    'paid',
                    'pending',
                  ]}
                  placeholder="Select payment status"
                />
              </div>

              <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-xs leading-6 text-yellow-800">
                  <strong>Important:</strong> The
                  admission number entered above is
                  the student's existing official
                  admission number. The system must
                  check for duplicates and must not
                  generate a replacement number.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =================================================
          STEP 5
      ================================================= */}

      {step === 5 && (
        <section>
          <SectionTitle
            title="Parent / Guardian / Next of Kin"
            description="Provide a person SMTC can contact when necessary."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Full Name"
              required
              value={
                data.guardianName
              }
              error={
                errors.guardianName
              }
              onChange={(value) =>
                updateField(
                  'guardianName',
                  value
                )
              }
              placeholder="Full name"
            />

            <SelectField
              label="Relationship"
              value={
                data.guardianRelationship
              }
              onChange={(value) =>
                updateField(
                  'guardianRelationship',
                  value
                )
              }
              options={[
                'Father',
                'Mother',
                'Guardian',
                'Spouse',
                'Sibling',
                'Other',
              ]}
              placeholder="Select relationship"
            />

            <Field
              label="Mobile Number"
              required
              value={
                data.guardianMobile
              }
              error={
                errors.guardianMobile
              }
              onChange={(value) =>
                updateField(
                  'guardianMobile',
                  value
                )
              }
              placeholder="e.g. 0712345678"
              type="tel"
            />

            <Field
              label="Email Address"
              value={
                data.guardianEmail
              }
              error={
                errors.guardianEmail
              }
              onChange={(value) =>
                updateField(
                  'guardianEmail',
                  value
                )
              }
              placeholder="guardian@email.com"
              type="email"
            />
          </div>
        </section>
      )}

      {/* =================================================
          STEP 6
      ================================================= */}

      {step === 6 && (
        <section>
          <SectionTitle
            title="Supporting Documents"
            description="Upload clear copies of the documents available for the manually registered student."
          />

          <div className="space-y-5">
            <FileField
              label="National ID / Passport"
              required
              file={data.idDocument}
              error={errors.idDocument}
              onChange={(event) =>
                handleFileChange(
                  'idDocument',
                  event
                )
              }
            />

            <FileField
              label="KCSE Certificate / Result Slip"
              required
              file={
                data.kcseCertificate
              }
              error={
                errors.kcseCertificate
              }
              onChange={(event) =>
                handleFileChange(
                  'kcseCertificate',
                  event
                )
              }
            />

            <FileField
              label="Passport Size Photo"
              required
              file={
                data.passportPhoto
              }
              error={
                errors.passportPhoto
              }
              onChange={(event) =>
                handleFileChange(
                  'passportPhoto',
                  event
                )
              }
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs leading-6 text-slate-500">
                Accepted formats: PDF, JPG and PNG.
                Maximum file size is 5 MB per
                document.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =================================================
          STEP 7
      ================================================= */}

      {step === 7 && (
        <section>
          <SectionTitle
            title="Review Your Application"
            description="Review all information carefully before creating the student's admission record."
          />

          <div className="space-y-6">
            <ReviewSection title="Personal Information">
              <ReviewItem
                label="Full Name"
                value={[
                  data.surname,
                  data.middleName,
                  data.firstName,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />

              <ReviewItem
                label="Date of Birth"
                value={
                  data.dateOfBirth
                }
              />

              <ReviewItem
                label="Gender"
                value={data.gender}
              />

              <ReviewItem
                label="Nationality"
                value={
                  data.nationality
                }
              />

              <ReviewItem
                label="Country"
                value={data.country}
              />

              <ReviewItem
                label="ID / Passport"
                value={
                  data.idPassportNumber
                }
              />

              <ReviewItem
                label="Marital Status"
                value={
                  data.maritalStatus
                }
              />
            </ReviewSection>

            <ReviewSection title="Contact Details">
              <ReviewItem
                label="Mobile"
                value={data.mobile}
              />

              <ReviewItem
                label="Email"
                value={data.email}
              />

              <ReviewItem
                label="Town"
                value={data.town}
              />

              <ReviewItem
                label="County"
                value={data.county}
              />

              <ReviewItem
                label="Postal Address"
                value={
                  data.postalAddress
                }
              />

              <ReviewItem
                label="Postal Code"
                value={
                  data.postalCode
                }
              />
            </ReviewSection>

            <ReviewSection title="Academic Information">
              <ReviewItem
                label="KCSE Index"
                value={
                  data.kcseIndex
                }
              />

              <ReviewItem
                label="KCSE Year"
                value={
                  data.kcseYear
                }
              />

              <ReviewItem
                label="Mean Grade"
                value={
                  data.kcseMeanGrade
                }
              />

              <ReviewItem
                label="English"
                value={
                  data.englishGrade
                }
              />

              <ReviewItem
                label="Kiswahili"
                value={
                  data.kiswahiliGrade
                }
              />

              <ReviewItem
                label="Biology"
                value={
                  data.biologyGrade
                }
              />

              <ReviewItem
                label="Chemistry"
                value={
                  data.chemistryGrade
                }
              />

              <ReviewItem
                label="Physics"
                value={
                  data.physicsGrade
                }
              />

              <ReviewItem
                label="Mathematics"
                value={
                  data.mathematicsGrade
                }
              />

              <ReviewItem
                label="Previous Institution"
                value={
                  data.previousInstitution
                }
              />

              <ReviewItem
                label="Highest Qualification"
                value={
                  data.highestQualification
                }
              />
            </ReviewSection>

            <ReviewSection title="Course & Intake">
              <ReviewItem
                label="Course"
                value={data.course}
              />

              <ReviewItem
                label="Intake"
                value={data.intake}
              />

              <ReviewItem
                label="Sponsor Type"
                value={
                  data.sponsorType
                }
              />
            </ReviewSection>

            <ReviewSection title="Sponsor Information">
              <ReviewItem
                label="Name"
                value={
                  data.sponsorName
                }
              />

              <ReviewItem
                label="Relationship"
                value={
                  data.sponsorRelationship
                }
              />

              <ReviewItem
                label="Mobile"
                value={
                  data.sponsorMobile
                }
              />

              <ReviewItem
                label="Email"
                value={
                  data.sponsorEmail
                }
              />
            </ReviewSection>

            <ReviewSection title="Parent / Guardian">
              <ReviewItem
                label="Name"
                value={
                  data.guardianName
                }
              />

              <ReviewItem
                label="Relationship"
                value={
                  data.guardianRelationship
                }
              />

              <ReviewItem
                label="Mobile"
                value={
                  data.guardianMobile
                }
              />

              <ReviewItem
                label="Email"
                value={
                  data.guardianEmail
                }
              />
            </ReviewSection>

            <ReviewSection title="Manual Admission Details">
              <ReviewItem
                label="Official Admission Number"
                value={
                  data.admissionNumber
                }
              />

              <ReviewItem
                label="Admission Date"
                value={
                  data.admissionDate
                }
              />

              <ReviewItem
                label="Application Fee"
                value={
                  data.applicationFee
                    ? `KSh ${Number(
                        data.applicationFee
                      ).toLocaleString()}`
                    : 'KSh 0'
                }
              />

              <ReviewItem
                label="Payment Status"
                value={
                  data.paymentStatus
                }
              />

              <ReviewItem
                label="Application Status"
                value="Approved"
              />

              <ReviewItem
                label="Admission Status"
                value="Active"
              />
            </ReviewSection>

            <ReviewSection title="Documents">
              <ReviewItem
                label="ID / Passport"
                value={
                  data.idDocument
                    ? data.idDocument.name
                    : 'Not uploaded'
                }
              />

              <ReviewItem
                label="KCSE Certificate"
                value={
                  data.kcseCertificate
                    ? data
                        .kcseCertificate
                        .name
                    : 'Not uploaded'
                }
              />

              <ReviewItem
                label="Passport Photo"
                value={
                  data.passportPhoto
                    ? data.passportPhoto
                        .name
                    : 'Not uploaded'
                }
              />
            </ReviewSection>

            {/* =================================================
                DECLARATION
            ================================================= */}

            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={
                    data.declaration
                  }
                  onChange={(event) =>
                    updateField(
                      'declaration',
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 accent-green-600"
                />

                <span className="text-sm leading-6 text-slate-700">
                  I declare that the information
                  provided in this application is
                  true, accurate and complete to the
                  best of my knowledge. I understand
                  that providing false information may
                  result in cancellation of the
                  student's application or admission.
                </span>
              </label>

              {errors.declaration && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  {errors.declaration}
                </p>
              )}
            </div>

            <FeeNotice />

            {submitError && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 p-4"
                role="alert"
              >
                <p className="text-sm font-semibold text-red-700">
                  {submitError}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div className="mt-10 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={17} />
              Previous
            </button>
          ) : (
            <Link
              href="/admin/dashboard/students"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Cancel
            </Link>
          )}
        </div>

        <div>
          {step < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800"
            >
              Continue
              <span aria-hidden="true">
                →
              </span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                  Create Student & Admission
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  </div>
</main>

);
}

/* =========================================================
SECTION TITLE
========================================================= */

type SectionTitleProps = {
title: string;
description: string;
};

function SectionTitle({
title,
description,
}: SectionTitleProps) {
return ( <div className="mb-7"> <h2 className="text-xl font-extrabold text-slate-900">
{title} </h2>

  <p className="mt-1 text-sm leading-6 text-slate-500">
    {description}
  </p>
</div>

);
}

/* =========================================================
FIELD
========================================================= */

type FieldProps = {
label: string;
value: string;
onChange: (value: string) => void;
placeholder?: string;
type?: string;
required?: boolean;
min?: string;
max?: string;
step?: string;
error?: string;
};

function Field({
label,
value,
onChange,
placeholder,
type = 'text',
required = false,
min,
max,
step,
error,
}: FieldProps) {
return ( <label className="block"> <span className="mb-2 block text-sm font-bold text-slate-700">
{label}

    {required && (
      <span className="ml-1 text-red-600">
        *
      </span>
    )}
  </span>

  <input
    type={type}
    value={value}
    onChange={(event) =>
      onChange(event.target.value)
    }
    placeholder={placeholder}
    required={required}
    min={min}
    max={max}
    step={step}
    aria-invalid={Boolean(error)}
    className={`${inputClass} ${
      error
        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
        : ''
    }`}
  />

  {error && (
    <p className="mt-1.5 text-xs font-semibold text-red-600">
      {error}
    </p>
  )}
</label>

);
}

/* =========================================================
SELECT
========================================================= */

type SelectFieldProps = {
label: string;
value: string;
onChange: (value: string) => void;
options: string[];
placeholder: string;
required?: boolean;
error?: string;
};

function SelectField({
label,
value,
onChange,
options,
placeholder,
required = false,
error,
}: SelectFieldProps) {
return ( <label className="block"> <span className="mb-2 block text-sm font-bold text-slate-700">
{label}


    {required && (
      <span className="ml-1 text-red-600">
        *
      </span>
    )}
  </span>

  <select
    value={value}
    onChange={(event) =>
      onChange(event.target.value)
    }
    required={required}
    aria-invalid={Boolean(error)}
    className={`${inputClass} ${
      error
        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
        : ''
    }`}
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

  {error && (
    <p className="mt-1.5 text-xs font-semibold text-red-600">
      {error}
    </p>
  )}
</label>

);
}

/* =========================================================
GRADE FIELD
========================================================= */

type GradeFieldProps = {
label: string;
value: string;
onChange: (value: string) => void;
};

function GradeField({
label,
value,
onChange,
}: GradeFieldProps) {
return ( <SelectField
   label={label}
   value={value}
   onChange={onChange}
   options={KCSE_GRADES}
   placeholder="Select grade"
 />
);
}

/* =========================================================
FILE FIELD
========================================================= */

type FileFieldProps = {
label: string;
required?: boolean;
file: UploadedFile;
error?: string;
onChange: (
event: ChangeEvent<HTMLInputElement>
) => void;
};

function FileField({
label,
required = false,
file,
error,
onChange,
}: FileFieldProps) {
return ( <div> <label className="block"> <span className="mb-2 block text-sm font-bold text-slate-700">
{label}

      {required && (
        <span className="ml-1 text-red-600">
          *
        </span>
      )}
    </span>

    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      onChange={onChange}
      className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white text-sm text-slate-600 file:mr-4 file:border-0 file:bg-green-50 file:px-4 file:py-3 file:text-sm file:font-bold file:text-green-700 hover:file:bg-green-100"
    />
  </label>

  {file && (
    <div className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
      Selected: {file.name}
    </div>
  )}

  {error && (
    <p className="mt-1.5 text-xs font-semibold text-red-600">
      {error}
    </p>
  )}
</div>


);
}

/* =========================================================
REVIEW SECTION
========================================================= */

type ReviewSectionProps = {
title: string;
children: React.ReactNode;
};

function ReviewSection({
title,
children,
}: ReviewSectionProps) {
return ( <section className="overflow-hidden rounded-2xl border border-slate-200"> <div className="border-b border-slate-200 bg-slate-50 px-5 py-4"> <h3 className="text-sm font-extrabold text-slate-900">
{title} </h3> </div>

  <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
    {children}
  </div>
</section>

);
}

/* =========================================================
REVIEW ITEM
========================================================= */

type ReviewItemProps = {
label: string;
value?: string;
};

function ReviewItem({
label,
value,
}: ReviewItemProps) {
return ( <div> <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
{label} </p>


  <p className="mt-1 break-words text-sm font-semibold text-slate-800">
    {value || '—'}
  </p>
</div>


);
}

/* =========================================================
FEE NOTICE
========================================================= */

function FeeNotice() {
return ( <div className="rounded-2xl border border-green-200 bg-green-50 p-5"> <h4 className="text-sm font-extrabold text-green-900">
Application Fee </h4>

  <p className="mt-1 text-sm leading-6 text-green-800">
    The standard SMTC application fee is
    <strong> KSh 1,500</strong>. For a manually
    registered student, the administrator should
    record the actual payment status and amount
    applicable to the student's physical application.
  </p>
</div>

);
}

/* =========================================================
INFO CARD
========================================================= */

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
return ( <div className="rounded-xl border border-slate-200 bg-white p-4"> <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
{label} </p>

  <div className="mt-1 flex items-center justify-between gap-3">
    <p className="break-all font-bold text-slate-900">
      {value || '—'}
    </p>

    {copyable && onCopy && (
      <button
        type="button"
        onClick={onCopy}
        title={`Copy ${label}`}
        className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <Clipboard size={16} />
      </button>
    )}
  </div>
</div>

);
}

/* =========================================================
CREDENTIAL ROW
========================================================= */

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
return ( <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"> <div> <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
{label} </p>


    <p className="mt-1 break-all font-bold text-slate-900">
      {value}
    </p>
  </div>

  <button
    type="button"
    onClick={onCopy}
    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
  >
    <Clipboard size={15} />
    Copy
  </button>
</div>


);
}
