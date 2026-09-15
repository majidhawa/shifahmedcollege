import { redirect } from 'next/navigation';
import Link from 'next/link';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

import {
  FileText,
  FolderOpen,
  CheckCircle2,
  Clock3,
  AlertCircle,
  FileCheck2,
  Download,
  Eye,
  Image as ImageIcon,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  CreditCard,
  ReceiptText,
  BookOpen,
  FileBadge2,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type ChildRecord = {
  id: number;
  application_number: string | null;

  surname: string | null;
  middle_name: string | null;
  first_name: string | null;

  course: string | null;
  intake: string | null;

  id_document: string | null;
  kcse_certificate: string | null;
  passport_photo: string | null;

  application_status: string | null;
  payment_status: string | null;

  created_at: string | null;

  admission_id: number | null;
  admission_number: string | null;
  admission_status: string | null;
  admission_date: string | null;
};

type DocumentItem = {
  key: string;
  title: string;
  description: string;
  file: string | null;
  icon: React.ReactNode;
  type: string;
};

/* =========================================================
   MY CHILD'S DOCUMENTS PAGE
========================================================= */

export default async function ParentDocumentsPage() {
  /* =======================================================
     CHECK PARENT SESSION
  ======================================================= */

  const session = await getParentSession();

  if (!session) {
    redirect('/parent/login');
  }

  /* =======================================================
     GET PARENT + LINKED CHILD APPLICATION + ADMISSION
  ======================================================= */

  const result = await pool.query<ChildRecord>(
    `
      SELECT
        a.id,
        a.application_number,

        a.surname,
        a.middle_name,
        a.first_name,

        a.course,
        a.intake,

        a.id_document,
        a.kcse_certificate,
        a.passport_photo,

        a.application_status,
        a.payment_status,

        a.created_at,

        ad.id AS admission_id,
        ad.admission_number,
        ad.admission_status,
        ad.admission_date

      FROM parent_students ps

      INNER JOIN applications a
        ON a.id = ps.application_id

      INNER JOIN users u
        ON u.id = ps.parent_id
       AND u.role = 'parent'
       AND u.active = TRUE

      LEFT JOIN admissions ad
        ON ad.application_id = a.id

      WHERE ps.parent_id = $1

      ORDER BY
        ps.is_primary DESC,
        a.created_at DESC

      LIMIT 1
    `,
    [session.parentId]
  );

  /* =======================================================
     CHILD NOT FOUND
  ======================================================= */

  if (result.rows.length === 0) {
    return (
      <main className="min-h-screen bg-[#f8faf9] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">

          <Link
            href="/parent/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#0f4f3f]"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col items-center px-6 py-14 text-center sm:px-10">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                <GraduationCap size={30} />
              </div>

              <h1 className="mt-5 text-2xl font-bold text-[#0c1f1a]">
                No Linked Child
              </h1>

              <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
                We could not find a child linked to your parent
                account. Please contact the college if you believe
                this is an error.
              </p>

              <Link
                href="/parent/dashboard/contact"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0c1f1a]"
              >
                Contact College
                <ChevronRight size={16} />
              </Link>

            </div>
          </section>

        </div>
      </main>
    );
  }

  const child = result.rows[0];

  /* =======================================================
     FULL NAME
  ======================================================= */

  const fullName = [
    child.first_name,
    child.middle_name,
    child.surname,
  ]
    .filter(
      (value): value is string =>
        typeof value === 'string' &&
        value.trim().length > 0
    )
    .join(' ')
    .trim();

  /* =======================================================
     APPLICATION STATUS
  ======================================================= */

  const applicationStatus =
    child.application_status || 'Pending';

  const paymentStatus =
    child.payment_status || 'Pending';

  const applicationStatusLower =
    String(applicationStatus)
      .trim()
      .toLowerCase();

  const paymentStatusLower =
    String(paymentStatus)
      .trim()
      .toLowerCase();

  const admissionStatusLower =
    String(child.admission_status || '')
      .trim()
      .toLowerCase();

  const isApproved = [
    'approved',
    'accepted',
    'admitted',
  ].includes(applicationStatusLower);

  const isRejected = [
    'rejected',
    'declined',
  ].includes(applicationStatusLower);

  const isPaid =
    paymentStatusLower === 'paid';

  const hasActiveAdmission =
    Boolean(child.admission_id) &&
    admissionStatusLower === 'active';

  /* =======================================================
     STATUS COLOR
  ======================================================= */

  let applicationStatusClass =
    'border-amber-200 bg-amber-50 text-amber-700';

  if (isApproved) {
    applicationStatusClass =
      'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (isRejected) {
    applicationStatusClass =
      'border-red-200 bg-red-50 text-red-700';
  }

  /* =======================================================
     SUBMITTED APPLICATION DOCUMENTS
  ======================================================= */

  const submittedDocuments: DocumentItem[] = [
    {
      key: 'id',
      title: 'ID / Passport Document',
      description:
        'National ID, passport, or other identification document submitted with your child\'s application.',
      file: child.id_document,
      icon: <FileText size={22} />,
      type: 'Identification Document',
    },
    {
      key: 'kcse',
      title: 'KCSE Certificate',
      description:
        'Your child\'s KCSE certificate or academic certificate submitted during the application process.',
      file: child.kcse_certificate,
      icon: <FileCheck2 size={22} />,
      type: 'Academic Certificate',
    },
    {
      key: 'photo',
      title: 'Passport Photo',
      description:
        'Passport-size photograph submitted as part of your child\'s application.',
      file: child.passport_photo,
      icon: <ImageIcon size={22} />,
      type: 'Photograph',
    },
  ];

  const uploadedCount = submittedDocuments.filter(
    (document) =>
      typeof document.file === 'string' &&
      document.file.trim().length > 0
  ).length;

  /* =======================================================
     TOTAL AVAILABLE / PENDING DOCUMENTS
  ======================================================= */

  const admissionDocumentAvailable =
    hasActiveAdmission;

  const receiptAvailable =
    isPaid;

  const totalTrackedDocuments = 8;

  const availableDocumentCount =
    uploadedCount +
    (admissionDocumentAvailable ? 1 : 0) +
    (receiptAvailable ? 1 : 0);

  /* =======================================================
     ADMISSION DATE
  ======================================================= */

  const formattedAdmissionDate =
    child.admission_date
      ? formatDate(child.admission_date)
      : null;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f8faf9] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            BACK
        ================================================= */}

        <Link
          href="/parent/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#0f4f3f]"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        {/* =================================================
            INTRO
        ================================================= */}

        <div className="mb-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <p className="text-sm font-semibold text-[#0f4f3f]">
                Child Documents
              </p>

              <h1 className="mt-1 text-2xl font-bold text-[#0c1f1a] sm:text-3xl">
                My Child&apos;s Documents
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Access important documents connected to your
                child&apos;s college application, admission,
                payments, and academic journey.
              </p>

            </div>

            <div className="flex flex-wrap items-center gap-3">

              <span className="text-xs text-gray-400">
                Child
              </span>

              <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700">
                {fullName || 'Student'}
              </span>

              <span className="text-xs text-gray-400">
                Application No.
              </span>

              <span className="rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs font-bold text-gray-700">
                {child.application_number || '—'}
              </span>

            </div>

          </div>
        </div>

        {/* =================================================
            DOCUMENT SUMMARY
        ================================================= */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <div className="grid md:grid-cols-3">

            {/* DOCUMENT COUNT */}

            <div className="p-6">

              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                  <FolderOpen size={22} />
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Documents
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#0c1f1a]">
                    {availableDocumentCount}/{totalTrackedDocuments}
                  </p>

                  <p className="mt-0.5 text-xs text-gray-400">
                    Available
                  </p>

                </div>

              </div>

            </div>

            {/* APPLICATION STATUS */}

            <div className="border-t border-gray-100 p-6 md:border-l md:border-t-0">

              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d7a93b]/15 text-[#a67d13]">
                  <FileCheck2 size={22} />
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Application Status
                  </p>

                  <span
                    className={`mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${applicationStatusClass}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {applicationStatus}
                  </span>

                </div>

              </div>

            </div>

            {/* PAYMENT STATUS */}

            <div className="border-t border-gray-100 bg-[#fafcfb] p-6 md:border-l md:border-t-0">

              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  {isPaid ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <Clock3 size={22} />
                  )}
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Application Fee
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#0c1f1a]">
                    {paymentStatus}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            SECURITY NOTICE
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-[#0f4f3f]/10 bg-[#f1f8f5] p-5">

          <div className="flex gap-3">

            <ShieldCheck
              size={21}
              className="mt-0.5 shrink-0 text-[#0f4f3f]"
            />

            <div>

              <p className="text-sm font-semibold text-[#0c1f1a]">
                Your child&apos;s documents are protected
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                Documents shown here are resolved through the
                authenticated parent account and the child linked
                to that account. Do not share your parent portal
                login details or downloaded documents with
                unauthorised persons.
              </p>

            </div>

          </div>

        </div>

        {/* =================================================
            ADMISSION DOCUMENTS
        ================================================= */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <SectionHeader
            icon={<GraduationCap size={21} />}
            title="Admission Documents"
            description="Official documents connected to your child&apos;s admission."
          />

          <div className="divide-y divide-gray-100">

            <DocumentActionRow
              title="Admission Letter"
              description={
                hasActiveAdmission
                  ? `Official admission letter for ${fullName || 'your child'}${formattedAdmissionDate ? `, dated ${formattedAdmissionDate}.` : '.'}`
                  : 'The official admission letter will become available once your child has an active admission.'
              }
              icon={<GraduationCap size={22} />}
              available={admissionDocumentAvailable}
              type="Official Admission Document"
              viewHref={
                admissionDocumentAvailable
                  ? '/api/parent/documents/admission-letter'
                  : undefined
              }
              downloadHref={
                admissionDocumentAvailable
                  ? '/api/parent/documents/admission-letter?download=1'
                  : undefined
              }
            />

            <DocumentActionRow
              title="Joining / Admission Instructions"
              description="Official joining instructions will be made available here when issued by the college."
              icon={<FileBadge2 size={22} />}
              available={false}
              type="Admission Instructions"
            />

          </div>

        </section>

        {/* =================================================
            FEES & PAYMENT DOCUMENTS
        ================================================= */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <SectionHeader
            icon={<CreditCard size={21} />}
            title="Fees & Payment Documents"
            description="Payment documents connected to your child&apos;s application."
          />

          <div className="divide-y divide-gray-100">

            <DocumentActionRow
              title="Application Fee Receipt"
              description={
                receiptAvailable
                  ? 'Official receipt for the application fee payment.'
                  : 'The official application fee receipt will become available after the payment is confirmed.'
              }
              icon={<ReceiptText size={22} />}
              available={receiptAvailable}
              type="Official Payment Receipt"
              viewHref={
                receiptAvailable
                  ? '/api/parent/documents/application-receipt'
                  : undefined
              }
              downloadHref={
                receiptAvailable
                  ? '/api/parent/documents/application-receipt?download=1'
                  : undefined
              }
            />

            <DocumentActionRow
              title="Fee Statement"
              description="A detailed fee statement will be available here when the college fee statement service is enabled."
              icon={<FileText size={22} />}
              available={false}
              type="Fee Statement"
            />

            <DocumentActionRow
              title="Fee Clearance Document"
              description="Official fee clearance documentation will appear here when issued by the college."
              icon={<FileCheck2 size={22} />}
              available={false}
              type="Fee Clearance"
            />

          </div>

        </section>

        {/* =================================================
            STUDENT / ADMISSION DOCUMENTS
        ================================================= */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <SectionHeader
            icon={<FolderOpen size={21} />}
            title="Student & Admission Documents"
            description="Documents submitted and retained as part of your child&apos;s application record."
          />

          <div className="divide-y divide-gray-100">

            {submittedDocuments.map((document) => (
              <DocumentRow
                key={document.key}
                title={document.title}
                description={document.description}
                file={document.file}
                icon={document.icon}
                type={document.type}
              />
            ))}

          </div>

        </section>

        {/* =================================================
            ACADEMIC DOCUMENTS
        ================================================= */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <SectionHeader
            icon={<BookOpen size={21} />}
            title="Academic Documents"
            description="Academic documents will become available as they are issued through the student academic system."
          />

          <div className="divide-y divide-gray-100">

            <DocumentActionRow
              title="Academic Result Slip"
              description="Academic result slips will be available here when issued."
              icon={<FileText size={22} />}
              available={false}
              type="Academic Result"
            />

            <DocumentActionRow
              title="Academic Progress Report"
              description="Official academic progress reports will appear here when available."
              icon={<BookOpen size={22} />}
              available={false}
              type="Academic Report"
            />

            <DocumentActionRow
              title="Academic Transcript"
              description="Official academic transcripts will appear here when issued by the college."
              icon={<FileBadge2 size={22} />}
              available={false}
              type="Academic Transcript"
            />

          </div>

        </section>

        {/* =================================================
            IMPORTANT NOTICE
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-[#d7a93b]/20 bg-[#fffdf5] p-6">

          <div className="flex gap-3">

            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-[#a67d13]"
            />

            <div>

              <h3 className="text-sm font-bold text-[#0c1f1a]">
                Need to replace a document?
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                If a document was uploaded incorrectly, is
                unclear, expired, or does not belong to your
                child, please contact the admissions office.
                Do not submit another application just to
                replace a document.
              </p>

              <Link
                href="/parent/dashboard/contact"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0f4f3f] transition hover:text-[#a67d13]"
              >
                Contact College
                <ChevronRight size={16} />
              </Link>

            </div>

          </div>

        </section>

        {/* =================================================
            CHILD APPLICATION DETAILS
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-7">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
              <ShieldCheck size={21} />
            </div>

            <div>

              <h3 className="font-bold text-[#0c1f1a]">
                Child&apos;s Application Record
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                These documents form part of your child&apos;s
                official application record at Shifah Medical
                Training College.
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">

            <InfoItem
              label="Child"
              value={fullName}
            />

            <InfoItem
              label="Course"
              value={child.course}
            />

            <InfoItem
              label="Intake"
              value={child.intake}
            />

            <InfoItem
              label="Admission Number"
              value={child.admission_number}
            />

          </div>

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="py-8 text-center">

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Shifah Medical Training College.
            All rights reserved.
          </p>

          <p className="mt-1 text-[11px] text-gray-400">
            Parent Portal • Secure Family Access
          </p>

        </div>

      </div>
    </main>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-gray-100 p-6 sm:p-7">

      <div className="flex items-center gap-4">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
          {icon}
        </div>

        <div>

          <h2 className="font-bold text-[#0c1f1a]">
            {title}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   DOCUMENT ACTION ROW
========================================================= */

function DocumentActionRow({
  title,
  description,
  icon,
  available,
  type,
  viewHref,
  downloadHref,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  type: string;
  viewHref?: string;
  downloadHref?: string;
}) {
  return (
    <div className="p-6 sm:p-7">

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-start gap-4">

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              available
                ? 'bg-[#0f4f3f]/10 text-[#0f4f3f]'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <h4 className="font-bold text-[#0c1f1a]">
                {title}
              </h4>

              {available ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 size={12} />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  <Clock3 size={12} />
                  Pending
                </span>
              )}

            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              {description}
            </p>

            <p className="mt-2 text-xs font-medium text-gray-400">
              Type: {type}
            </p>

          </div>

        </div>

        <div className="flex shrink-0 items-center gap-2">

          {available && viewHref && downloadHref ? (
            <>
              <a
                href={viewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#0f4f3f]/30 hover:bg-[#f1f8f5] hover:text-[#0f4f3f]"
              >
                <Eye size={17} />
                View
              </a>

              <a
                href={downloadHref}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c1f1a]"
              >
                <Download size={17} />
                Download
              </a>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400">
              <Clock3 size={17} />
              Pending
            </span>
          )}

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   SUBMITTED DOCUMENT ROW
========================================================= */

function DocumentRow({
  title,
  description,
  file,
  icon,
  type,
}: {
  title: string;
  description: string;
  file: string | null | undefined;
  icon: React.ReactNode;
  type: string;
}) {
  const hasFile =
    typeof file === 'string' &&
    file.trim().length > 0;

  const fileUrl = hasFile
    ? file!.startsWith('/')
      ? file!
      : `/${file}`
    : '';

  const lowerFileUrl =
    fileUrl.toLowerCase();

  const isPdf =
    hasFile &&
    lowerFileUrl.includes('.pdf');

  const isImage =
    hasFile &&
    (
      lowerFileUrl.includes('.jpg') ||
      lowerFileUrl.includes('.jpeg') ||
      lowerFileUrl.includes('.png') ||
      lowerFileUrl.includes('.webp')
    );

  return (
    <div className="p-6 sm:p-7">

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-start gap-4">

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              hasFile
                ? 'bg-[#0f4f3f]/10 text-[#0f4f3f]'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <h4 className="font-bold text-[#0c1f1a]">
                {title}
              </h4>

              {hasFile ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 size={12} />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  <Clock3 size={12} />
                  Pending
                </span>
              )}

            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              {description}
            </p>

            <p className="mt-2 text-xs font-medium text-gray-400">
              Type: {type}
            </p>

          </div>

        </div>

        <div className="flex shrink-0 items-center gap-2">

          {hasFile ? (
            <>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#0f4f3f]/30 hover:bg-[#f1f8f5] hover:text-[#0f4f3f]"
              >
                <Eye size={17} />
                View
              </a>

              <a
                href={fileUrl}
                download
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c1f1a]"
              >
                <Download size={17} />
                Download
              </a>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400">
              <Clock3 size={17} />
              Pending
            </span>
          )}

        </div>

      </div>

      {hasFile && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">

          {isPdf ? (
            <FileText size={14} />
          ) : isImage ? (
            <ImageIcon size={14} />
          ) : (
            <FolderOpen size={14} />
          )}

          <span className="truncate">
            {fileUrl.split('/').pop() || 'Uploaded document'}
          </span>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>

      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-gray-800">
        {value || '—'}
      </p>

    </div>
  );
}

/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDate(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}