import Link from 'next/link';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import {
  Search,
  FileText,
  FileCheck2,
  Image as ImageIcon,
  Download,
  Eye,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ArrowRight,
  FolderOpen,
  Receipt,
  GraduationCap,
  CreditCard,
  ClipboardList,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type DocumentRecord = {
  id: number;
  application_number: string;
  student_name: string;
  course: string;
  intake: string;

  id_document: string | null;
  kcse_certificate: string | null;
  passport_photo: string | null;

  application_status: string | null;
  payment_status: string | null;
  application_fee: string | number | null;

  admission_id: number | null;
  admission_number: string | null;
  admission_status: string | null;
  admission_date: string | null;
  admission_letter_path: string | null;
  has_admission_letter_pdf: boolean;

  created_at: string | Date;
};

type CourseOption = {
  course: string;
};

type IntakeOption = {
  intake: string;
};

type DocumentsPageProps = {
  searchParams?: {
    search?: string;
    course?: string;
    intake?: string;
  };
};

type DocumentStatusProps = {
  exists: boolean;
  available?: boolean;
};

function formatDate(value: string | Date | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DocumentStatus({
  exists,
  available = true,
}: DocumentStatusProps) {
  if (!available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        <Clock3 className="h-3 w-3" />
        Not available yet
      </span>
    );
  }

  if (exists) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Available
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <AlertCircle className="h-3 w-3" />
      Not uploaded
    </span>
  );
}

function DocumentAction({
  href,
  label,
  download = false,
  disabled = false,
}: {
  href?: string;
  label: string;
  download?: boolean;
  disabled?: boolean;
}) {
  if (disabled || !href) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400">
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download={download}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-green px-3 py-2 text-xs font-semibold text-brand-green transition hover:bg-brand-green hover:text-white"
    >
      {download ? (
        <Download className="h-3.5 w-3.5" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}

      {label}
    </a>
  );
}

function NotAvailableNotice() {
  return (
    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
      <span className="font-semibold text-slate-600">
        Not available yet.
      </span>{' '}
      Manual upload/generation can be added later.
    </div>
  );
}

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  /* =====================================================
     ADMIN AUTHENTICATION
  ===================================================== */

  const admin = requireAdmin();

  if (!admin) {
    return null;
  }

  /* =====================================================
     SEARCH / FILTER PARAMETERS
  ===================================================== */

  const search =
    typeof searchParams?.search === 'string'
      ? searchParams.search.trim()
      : '';

  const selectedCourse =
    typeof searchParams?.course === 'string'
      ? searchParams.course.trim()
      : '';

  const selectedIntake =
    typeof searchParams?.intake === 'string'
      ? searchParams.intake.trim()
      : '';

  /* =====================================================
     COURSE OPTIONS
  ===================================================== */

  const courseResult = await pool.query<CourseOption>(
    `
      SELECT DISTINCT course
      FROM applications
      WHERE course IS NOT NULL
        AND TRIM(course) <> ''
      ORDER BY course ASC
    `
  );

  const courses = courseResult.rows;

  /* =====================================================
     INTAKE OPTIONS
  ===================================================== */

  const intakeResult = await pool.query<IntakeOption>(
    `
      SELECT DISTINCT intake
      FROM applications
      WHERE intake IS NOT NULL
        AND TRIM(intake) <> ''
      ORDER BY intake ASC
    `
  );

  const intakes = intakeResult.rows;

  /* =====================================================
     APPLICATION / DOCUMENT DATA
  ===================================================== */

  const result = await pool.query<DocumentRecord>(
    `
      SELECT
        a.id,
        a.application_number,

        CONCAT_WS(
          ' ',
          a.surname,
          a.middle_name,
          a.first_name
        ) AS student_name,

        a.course,
        a.intake,

        a.id_document,
        a.kcse_certificate,
        a.passport_photo,

        a.application_status,
        a.payment_status,
        a.application_fee,

        ad.id AS admission_id,
        ad.admission_number,
        ad.admission_status,
        ad.admission_date,
        ad.admission_letter_path,

        CASE
          WHEN ad.admission_letter_pdf IS NOT NULL
          THEN TRUE
          ELSE FALSE
        END AS has_admission_letter_pdf,

        a.created_at

      FROM applications a

      LEFT JOIN admissions ad
        ON ad.application_id = a.id

      WHERE
        (
          $1 = ''
          OR CONCAT_WS(
            ' ',
            a.surname,
            a.middle_name,
            a.first_name
          ) ILIKE '%' || $1 || '%'
          OR a.application_number ILIKE '%' || $1 || '%'
        )

        AND (
          $2 = ''
          OR a.course = $2
        )

        AND (
          $3 = ''
          OR a.intake = $3
        )

      ORDER BY a.created_at DESC
    `,
    [search, selectedCourse, selectedIntake]
  );

  const documents = result.rows;

  /* =====================================================
     SUMMARY COUNTS
  ===================================================== */

  const totalApplications = documents.length;

  const uploadedApplicationDocuments =
    documents.reduce((total, document) => {
      if (document.id_document) {
        total += 1;
      }

      if (document.kcse_certificate) {
        total += 1;
      }

      if (document.passport_photo) {
        total += 1;
      }

      return total;
    }, 0);

  const idDocuments = documents.filter(
    (document) => Boolean(document.id_document)
  ).length;

  const kcseDocuments = documents.filter(
    (document) => Boolean(document.kcse_certificate)
  ).length;

  const passportPhotos = documents.filter(
    (document) => Boolean(document.passport_photo)
  ).length;

  const admissionLetters = documents.filter(
    (document) =>
      document.admission_status?.toLowerCase() === 'active' &&
      document.has_admission_letter_pdf
  ).length;

  const applicationsWithAdmissions = documents.filter(
    (document) => Boolean(document.admission_id)
  ).length;

  /* =====================================================
     CURRENT FILTER STATE
  ===================================================== */

  const hasFilters =
    Boolean(search) ||
    Boolean(selectedCourse) ||
    Boolean(selectedIntake);

  return (
    <div className="min-h-screen bg-brand-cream">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-gold">

                <FolderOpen className="h-4 w-4" />

                Admissions

                <span className="text-slate-300">/</span>

                Documents

              </div>

              <h1 className="mt-1 text-3xl font-bold text-brand-dark">
                Student Documents
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Manage application, admission, payment and
                academic documents for SMTC applicants and
                admitted students.
              </p>

            </div>

            <Link
              href="/admin/dashboard/students"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green px-5 py-3 text-sm font-semibold text-brand-green transition hover:bg-brand-cream"
            >
              Students

              <ArrowRight className="h-4 w-4" />

            </Link>

          </div>

        </div>

      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium text-slate-500">
                  Applications
                </p>

                <p className="mt-2 text-3xl font-bold text-brand-dark">
                  {totalApplications}
                </p>

              </div>

              <div className="rounded-xl bg-brand-cream p-3">

                <FileText className="h-6 w-6 text-brand-green" />

              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium text-slate-500">
                  Uploaded Documents
                </p>

                <p className="mt-2 text-3xl font-bold text-brand-dark">
                  {uploadedApplicationDocuments}
                </p>

              </div>

              <div className="rounded-xl bg-blue-50 p-3">

                <FolderOpen className="h-6 w-6 text-blue-600" />

              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium text-slate-500">
                  Admission Letters
                </p>

                <p className="mt-2 text-3xl font-bold text-brand-dark">
                  {admissionLetters}
                </p>

              </div>

              <div className="rounded-xl bg-green-50 p-3">

                <GraduationCap className="h-6 w-6 text-brand-green" />

              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium text-slate-500">
                  Admissions
                </p>

                <p className="mt-2 text-3xl font-bold text-brand-dark">
                  {applicationsWithAdmissions}
                </p>

              </div>

              <div className="rounded-xl bg-purple-50 p-3">

                <GraduationCap className="h-6 w-6 text-purple-600" />

              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium text-slate-500">
                  Application PDFs
                </p>

                <p className="mt-2 text-3xl font-bold text-brand-dark">
                  {totalApplications}
                </p>

              </div>

              <div className="rounded-xl bg-amber-50 p-3">

                <ClipboardList className="h-6 w-6 text-amber-600" />

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            SEARCH AND FILTERS
        ================================================= */}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-xl bg-brand-cream p-2.5">

              <Search className="h-5 w-5 text-brand-green" />

            </div>

            <div>

              <h2 className="font-bold text-brand-dark">
                Search & Filter
              </h2>

              <p className="text-xs text-slate-500">
                Search by student name or application number,
                or filter by course and intake.
              </p>

            </div>

          </div>

          <form
            method="GET"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >

            {/* SEARCH */}

            <div>

              <label
                htmlFor="search"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Name / Application Number
              </label>

              <div className="relative">

                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="search"
                  name="search"
                  type="search"
                  defaultValue={search}
                  placeholder="Search applicant..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10"
                />

              </div>

            </div>

            {/* COURSE */}

            <div>

              <label
                htmlFor="course"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Course
              </label>

              <select
                id="course"
                name="course"
                defaultValue={selectedCourse}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10"
              >

                <option value="">
                  All Courses
                </option>

                {courses.map((item) => (

                  <option
                    key={item.course}
                    value={item.course}
                  >
                    {item.course}
                  </option>

                ))}

              </select>

            </div>

            {/* INTAKE */}

            <div>

              <label
                htmlFor="intake"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Intake
              </label>

              <select
                id="intake"
                name="intake"
                defaultValue={selectedIntake}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10"
              >

                <option value="">
                  All Intakes
                </option>

                {intakes.map((item) => (

                  <option
                    key={item.intake}
                    value={item.intake}
                  >
                    {item.intake}
                  </option>

                ))}

              </select>

            </div>

            {/* BUTTONS */}

            <div className="flex items-end gap-2">

              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >

                <Search className="h-4 w-4" />

                Search

              </button>

              {hasFilters && (

                <Link
                  href="/admin/dashboard/documents"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Clear
                </Link>

              )}

            </div>

          </form>

          {hasFilters && (

            <div className="mt-4 rounded-xl bg-brand-cream px-4 py-3 text-sm text-slate-600">

              Showing filtered results

              {search && (
                <>
                  {' '}for{' '}
                  <span className="font-semibold text-brand-dark">
                    "{search}"
                  </span>
                </>
              )}

              {selectedCourse && (
                <>
                  {' '}· Course:{' '}
                  <span className="font-semibold text-brand-dark">
                    {selectedCourse}
                  </span>
                </>
              )}

              {selectedIntake && (
                <>
                  {' '}· Intake:{' '}
                  <span className="font-semibold text-brand-dark">
                    {selectedIntake}
                  </span>
                </>
              )}

            </div>

          )}

        </div>

        {/* =================================================
            DOCUMENT CATEGORIES
        ================================================= */}

        <div className="mt-8 space-y-8">

          {/* =================================================
              A. APPLICATION DOCUMENTS
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">

            <div className="border-b border-slate-200 bg-brand-cream px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-white p-3 shadow-sm">

                  <FileText className="h-6 w-6 text-brand-green" />

                </div>

                <div>

                  <h2 className="text-xl font-bold text-brand-dark">
                    A. Application Documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Documents submitted during the admission application.
                  </p>

                </div>

              </div>

            </div>

            <div className="divide-y divide-slate-100">

              {documents.map((document) => {

                return (

                <div
                  key={`application-${document.id}`}
                  className="p-6"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    {/* STUDENT */}

                    <div className="min-w-[230px]">

                      <p className="font-bold text-brand-dark">
                        {document.student_name || 'Unnamed Applicant'}
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {document.application_number}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {document.course || 'Course not specified'}
                      </p>

                      <p className="text-xs text-slate-400">
                        {document.intake || 'Intake not specified'}
                      </p>

                    </div>

                    {/* DOCUMENTS */}

                    <div className="grid flex-1 gap-4 md:grid-cols-3">

                      {/* ID */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <FileText className="h-4 w-4 text-blue-600" />

                          <p className="text-sm font-semibold text-brand-dark">
                            ID / Passport
                          </p>

                        </div>

                        <div className="mt-3">

                          <DocumentStatus
                            exists={Boolean(document.id_document)}
                          />

                        </div>

                        {document.id_document && (

                          <div className="mt-3 flex gap-2">

                            <DocumentAction
                              href={document.id_document}
                              label="View"
                            />

                            <DocumentAction
                              href={document.id_document}
                              label="Download"
                              download
                            />

                          </div>

                        )}

                      </div>

                      {/* KCSE */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <FileCheck2 className="h-4 w-4 text-green-600" />

                          <p className="text-sm font-semibold text-brand-dark">
                            KCSE Certificate
                          </p>

                        </div>

                        <div className="mt-3">

                          <DocumentStatus
                            exists={Boolean(
                              document.kcse_certificate
                            )}
                          />

                        </div>

                        {document.kcse_certificate && (

                          <div className="mt-3 flex gap-2">

                            <DocumentAction
                              href={document.kcse_certificate}
                              label="View"
                            />

                            <DocumentAction
                              href={document.kcse_certificate}
                              label="Download"
                              download
                            />

                          </div>

                        )}

                      </div>

                      {/* PHOTO */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <ImageIcon className="h-4 w-4 text-purple-600" />

                          <p className="text-sm font-semibold text-brand-dark">
                            Passport Photo
                          </p>

                        </div>

                        <div className="mt-3">

                          <DocumentStatus
                            exists={Boolean(
                              document.passport_photo
                            )}
                          />

                        </div>

                        {document.passport_photo && (

                          <div className="mt-3 flex gap-2">

                            <DocumentAction
                              href={document.passport_photo}
                              label="View"
                            />

                            <DocumentAction
                              href={document.passport_photo}
                              label="Download"
                              download
                            />

                          </div>

                        )}

                      </div>

                    </div>

                    {/* APPLICATION PDF */}

                    <div className="lg:min-w-[150px]">

                      <a
                        href={`/api/admin/applications/${document.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3 text-xs font-semibold text-white transition hover:bg-brand-dark"
                      >

                        <Download className="h-4 w-4" />

                        Application PDF

                      </a>

                      <Link
                        href={`/admin/dashboard/applications/${document.id}`}
                        className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-brand-green px-4 py-3 text-xs font-semibold text-brand-green transition hover:bg-brand-cream"
                      >

                        <Eye className="h-4 w-4" />

                        View Application

                      </Link>

                    </div>

                  </div>

                </div>

                );
              })}

            </div>

          </section>

          {/* =================================================
              B. ADMISSION DOCUMENTS
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">

            <div className="border-b border-slate-200 bg-brand-cream px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-white p-3 shadow-sm">

                  <GraduationCap className="h-6 w-6 text-brand-green" />

                </div>

                <div>

                  <h2 className="text-xl font-bold text-brand-dark">
                    B. Admission Documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Documents issued after an applicant is admitted.
                  </p>

                </div>

              </div>

            </div>

            <div className="divide-y divide-slate-100">

              {documents.map((document) => {

                const admissionActive =
                  document.admission_status?.toLowerCase() ===
                  'active';

                return (

                  <div
                    key={`admission-${document.id}`}
                    className="p-6"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

                      {/* STUDENT */}

                      <div className="min-w-[230px]">

                        <p className="font-bold text-brand-dark">
                          {document.student_name || 'Unnamed Applicant'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {document.application_number}
                        </p>

                        {document.admission_id ? (

                          <>

                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Admission Number
                            </p>

                            <p className="mt-1 font-semibold text-brand-green">
                              {document.admission_number || '—'}
                            </p>

                          </>

                        ) : (

                          <p className="mt-3 text-sm text-slate-400">
                            No admission record yet
                          </p>

                        )}

                      </div>

                      {/* DOCUMENTS */}

                      <div className="grid flex-1 gap-4 md:grid-cols-2">

                        {/* ADMISSION LETTER */}

                        <div className="rounded-xl border border-slate-200 p-4">

                          <div className="flex items-center gap-2">

                            <FileText className="h-4 w-4 text-brand-green" />

                            <p className="text-sm font-semibold text-brand-dark">
                              Admission Letter
                            </p>

                          </div>

                          <div className="mt-3">

                            {!document.admission_id ? (

                              <DocumentStatus
                                exists={false}
                              />

                            ) : (

                              <DocumentStatus
                                exists={
                                  document.has_admission_letter_pdf
                                }
                              />

                            )}

                          </div>

                          {document.admission_id &&
                            admissionActive && (

                              <div className="mt-3 flex flex-wrap gap-2">

                                <DocumentAction
                                  href={`/api/admin/admissions/${document.admission_id}/letter`}
                                  label={
                                    document.has_admission_letter_pdf
                                      ? 'View / Download'
                                      : 'Generate Letter'
                                  }
                                  download={
                                    document.has_admission_letter_pdf
                                  }
                                />

                              </div>

                            )}

                          {document.admission_id &&
                            !admissionActive && (

                              <p className="mt-3 text-xs text-slate-500">
                                Admission is not currently active.
                              </p>

                            )}

                        </div>

                        {/* JOINING INSTRUCTIONS */}

                        <div className="rounded-xl border border-slate-200 p-4">

                          <div className="flex items-center gap-2">

                            <ClipboardList className="h-4 w-4 text-purple-600" />

                            <p className="text-sm font-semibold text-brand-dark">
                              Joining / Admission Instructions
                            </p>

                          </div>

                          <div className="mt-3">

                            <DocumentStatus
                              exists={false}
                              available={false}
                            />

                          </div>

                          <NotAvailableNotice />

                        </div>

                      </div>

                    </div>

                  </div>

                );
              })}

            </div>

          </section>

          {/* =================================================
              C. FEES & PAYMENT DOCUMENTS
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">

            <div className="border-b border-slate-200 bg-brand-cream px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-white p-3 shadow-sm">

                  <CreditCard className="h-6 w-6 text-brand-green" />

                </div>

                <div>

                  <h2 className="text-xl font-bold text-brand-dark">
                    C. Fees & Payment Documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Financial documents related to application
                    and student fees.
                  </p>

                </div>

              </div>

            </div>

            <div className="divide-y divide-slate-100">

              {documents.map((document) => (

                <div
                  key={`fees-${document.id}`}
                  className="p-6"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

                    {/* STUDENT */}

                    <div className="min-w-[230px]">

                      <p className="font-bold text-brand-dark">
                        {document.student_name || 'Unnamed Applicant'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {document.application_number}
                      </p>

                      <div className="mt-3 flex items-center gap-2">

                        <CreditCard className="h-4 w-4 text-brand-green" />

                        <span className="text-sm font-semibold text-slate-700">
                          Payment:
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            document.payment_status?.toLowerCase() ===
                              'paid'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {document.payment_status || 'Pending'}
                        </span>

                      </div>

                    </div>

                    {/* FEE DOCUMENTS */}

                    <div className="grid flex-1 gap-4 md:grid-cols-3">

                      {/* RECEIPT */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <Receipt className="h-4 w-4 text-green-600" />

                          <p className="text-sm font-semibold text-brand-dark">
                            Application Fee Receipt
                          </p>

                        </div>

                        <div className="mt-3">

                         {document.payment_status?.toLowerCase() === 'paid' ? (
  <>
    <DocumentStatus exists />

    <div className="mt-3 flex flex-wrap gap-2">
      <a
        href={`/api/applications/${encodeURIComponent(
          document.application_number
        )}/receipt`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
      >
        <Eye className="h-3.5 w-3.5" />
        View
      </a>

      <a
        href={`/api/applications/${encodeURIComponent(
          document.application_number
        )}/receipt`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-green px-3 py-2 text-xs font-semibold text-brand-green transition hover:bg-brand-cream"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </a>
    </div>
  </>
) : (
  <>
    <DocumentStatus exists={false} />

    <p className="mt-3 text-xs leading-5 text-slate-500">
      Receipt will become available after the application
      fee has been successfully paid and verified.
    </p>
  </>
)}

                      </div>

                      </div>

                      {/* FEE STATEMENT */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <FileText className="h-4 w-4 text-blue-600" />

                          <p className="text-sm font-semibold text-brand-dark">
                            Fee Statement
                          </p>

                        </div>

                        <div className="mt-3">

                          {document.payment_status?.toLowerCase() === 'paid' ? (
                            <DocumentStatus exists />
                          ) : (
                            <DocumentStatus exists={false} />
                          )}

                        </div>

                        <NotAvailableNotice />

                      </div>

                      {/* FEE CLEARANCE */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <FileCheck2 className="h-4 w-4 text-brand-green" />

                          <p className="text-sm font-semibold text-brand-dark">
                            Fee Clearance
                          </p>

                        </div>

                        <div className="mt-3">

                          <DocumentStatus
                            exists={false}
                            available={false}
                          />

                        </div>

                        <NotAvailableNotice />

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>

          {/* =================================================
              D. ACADEMIC DOCUMENTS
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">

            <div className="border-b border-slate-200 bg-brand-cream px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-white p-3 shadow-sm">

                  <GraduationCap className="h-6 w-6 text-brand-green" />

                </div>

                <div>

                  <h2 className="text-xl font-bold text-brand-dark">
                    D. Academic Documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Academic records generated during the student's
                    studies.
                  </p>

                </div>

              </div>

            </div>

            <div className="divide-y divide-slate-100">

              {documents.map((document) => (

                <div
                  key={`academic-${document.id}`}
                  className="p-6"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

                    {/* STUDENT */}

                    <div className="min-w-[230px]">

                      <p className="font-bold text-brand-dark">
                        {document.student_name || 'Unnamed Applicant'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {document.application_number}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {document.course || 'Course not specified'}
                      </p>

                    </div>

                    {/* ACADEMIC DOCUMENTS */}

                    <div className="grid flex-1 gap-4 md:grid-cols-3">

                      {/* RESULT SLIP */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <FileText className="h-4 w-4 text-blue-600" />

                          <p className="text-sm font-semibold text-brand-dark">
                            Result Slip
                          </p>

                        </div>

                        <div className="mt-3">

                          <DocumentStatus
                            exists={false}
                            available={false}
                          />

                        </div>

                        <NotAvailableNotice />

                      </div>

                      {/* PROGRESS REPORT */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <ClipboardList className="h-4 w-4 text-purple-600" />

                          <p className="text-sm font-semibold text-brand-dark">
                            Progress Report
                          </p>

                        </div>

                        <div className="mt-3">

                          <DocumentStatus
                            exists={false}
                            available={false}
                          />

                        </div>

                        <NotAvailableNotice />

                      </div>

                      {/* TRANSCRIPT */}

                      <div className="rounded-xl border border-slate-200 p-4">

                        <div className="flex items-center gap-2">

                          <GraduationCap className="h-4 w-4 text-brand-green" />

                          <p className="text-sm font-semibold text-brand-dark">
                            Transcript
                          </p>

                        </div>

                        <div className="mt-3">

                          <DocumentStatus
                            exists={false}
                            available={false}
                          />

                        </div>

                        <NotAvailableNotice />

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>

        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {documents.length === 0 && (

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-soft">

            <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />

            <h3 className="mt-4 text-lg font-bold text-brand-dark">
              No applications found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              No applicants match the current search or filter
              criteria.
            </p>

            {hasFilters && (

              <Link
                href="/admin/dashboard/documents"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >

                Clear Filters

              </Link>

            )}

          </div>

        )}

      </main>

    </div>
  );
}

