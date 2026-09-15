import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  IdCard,
  Image as ImageIcon,
  Lock,
  Receipt,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import pool from "@/lib/db";
import { getStudentSession } from "@/lib/student-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StudentDocumentRecord = {
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

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStudentName(student: StudentDocumentRecord): string {
  return [
    student.surname,
    student.middle_name,
    student.first_name,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim() || "Student";
}

function getFileName(url: string | null): string {
  if (!url) return "Document";

  try {
    const cleanUrl = url.split("?")[0];
    const parts = cleanUrl.split("/");
    const lastPart = parts[parts.length - 1];

    return decodeURIComponent(lastPart || "Document");
  } catch {
    return "Document";
  }
}

function isPdf(url: string | null): boolean {
  if (!url) return false;

  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".pdf") ||
    cleanUrl.includes(".pdf/")
  );
}

function DocumentAction({
  href,
  label,
  download = false,
  disabled = false,
}: {
  href: string;
  label: string;
  download?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-400">
        <Lock className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      {...(download ? { download: true } : {})}
      target={download ? undefined : "_blank"}
      rel={download ? undefined : "noopener noreferrer"}
      className="inline-flex items-center gap-2 rounded-lg border border-[#0f4f3f]/20 bg-white px-3 py-2 text-xs font-semibold text-[#0f4f3f] transition hover:border-[#0f4f3f] hover:bg-[#f1f7f5]"
    >
      {download ? (
        <Download className="h-3.5 w-3.5" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {label}
    </a>
  );
}

function StatusBadge({
  status,
  type,
}: {
  status: string | null;
  type: "application" | "payment" | "admission";
}) {
  const normalized = status?.toLowerCase() ?? "";

  let label = status || "Pending";
  let className =
    "border-gray-200 bg-gray-100 text-gray-600";

  if (
    normalized === "approved" ||
    normalized === "active" ||
    normalized === "paid"
  ) {
    label =
      type === "payment"
        ? "Paid"
        : type === "admission"
          ? "Admitted"
          : "Approved";

    className =
      "border-green-200 bg-green-50 text-green-700";
  } else if (
    normalized === "pending" ||
    normalized === "payment_pending" ||
    normalized === "awaiting_approval"
  ) {
    label =
      type === "payment"
        ? "Payment Pending"
        : type === "admission"
          ? "Pending"
          : "Pending";

    className =
      "border-amber-200 bg-amber-50 text-amber-700";
  } else if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "declined"
  ) {
    className =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function DocumentRow({
  icon,
  title,
  description,
  available,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[#0f4f3f]/20 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            available
              ? "bg-[#0f4f3f]/10 text-[#0f4f3f]"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[#0c1f1a]">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            {description}
          </p>

          <div className="mt-2">
            {available ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                Not available yet
              </span>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

export default async function StudentDocumentsPage() {
  const session = await getStudentSession();

  if (!session) {
    redirect("/student/login");
  }

  const applicationId = Number(session.applicationId);
  const applicationNumber = String(session.applicationNumber || "").trim();

  if (
    !Number.isInteger(applicationId) ||
    applicationId <= 0 ||
    !applicationNumber
  ) {
    redirect("/student/login");
  }

  const result = await pool.query<StudentDocumentRecord>(
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
      FROM applications a
      LEFT JOIN admissions ad
        ON ad.application_id = a.id
      WHERE a.id = $1
        AND a.application_number = $2
      LIMIT 1
    `,
    [applicationId, applicationNumber]
  );

  if (result.rows.length === 0) {
    redirect("/student/dashboard");
  }

  const student = result.rows[0];

  const studentName = getStudentName(student);

  const admissionIsActive =
    student.admission_status?.toLowerCase() === "active";

  const paymentIsPaid =
    student.payment_status?.toLowerCase() === "paid";

  const admissionLetterAvailable =
    admissionIsActive && Boolean(student.admission_id);

  const applicationReceiptAvailable = paymentIsPaid;

  const idDocumentAvailable = Boolean(student.id_document);
  const kcseCertificateAvailable = Boolean(student.kcse_certificate);
  const passportPhotoAvailable = Boolean(student.passport_photo);

  const uploadedApplicationDocuments = [
    student.id_document,
    student.kcse_certificate,
    student.passport_photo,
  ].filter(Boolean).length;

  const totalTrackedDocuments = 11;

  const availableDocuments =
    uploadedApplicationDocuments +
    (admissionLetterAvailable ? 1 : 0) +
    (applicationReceiptAvailable ? 1 : 0);

  const applicationFileUrl = (value: string | null): string | null => {
    if (!value) return null;
    return value;
  };

  const idDocumentUrl = applicationFileUrl(student.id_document);
  const kcseCertificateUrl = applicationFileUrl(
    student.kcse_certificate
  );
  const passportPhotoUrl = applicationFileUrl(
    student.passport_photo
  );

  return (
    <main className="min-h-screen bg-[#f8f6ef]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-[#0c1f1a] shadow-sm">
          <div className="relative px-5 py-6 sm:px-7 sm:py-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#d7a93b]/10 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#0f4f3f]/30 blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#d7a93b]">
                  <FileCheck2 className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7a93b]">
                    Student Portal
                  </p>

                  <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                    My Documents
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                View and download your admission, payment, application,
                and academic documents from Shifah Medical Training College.
              </p>
            </div>
          </div>
        </div>

        {/* Student summary */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                <UserRound className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#0c1f1a]">
                  {studentName}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>
                    Application No:{" "}
                    <strong className="text-gray-700">
                      {student.application_number || "—"}
                    </strong>
                  </span>

                  {student.admission_number && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>
                        Admission No:{" "}
                        <strong className="text-gray-700">
                          {student.admission_number}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={student.application_status}
                type="application"
              />

              <StatusBadge
                status={student.payment_status}
                type="payment"
              />

              {student.admission_id && (
                <StatusBadge
                  status={student.admission_status}
                  type="admission"
                />
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Programme
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">
                {student.course || "—"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Intake
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">
                {student.intake || "—"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Application Date
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">
                {formatDate(student.created_at)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Admission Date
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">
                {formatDate(student.admission_date)}
              </p>
            </div>
          </div>
        </section>

        {/* Document count */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f4f3f]/10 text-[#0f4f3f]">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Documents Available
                </p>
                <p className="text-xl font-bold text-[#0c1f1a]">
                  {availableDocuments}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d7a93b]/15 text-[#a27a08]">
                <GraduationCap className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Admission Status
                </p>
                <p className="text-sm font-bold text-[#0c1f1a]">
                  {student.admission_status
                    ? student.admission_status.replace(/_/g, " ")
                    : "Not admitted"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Records Tracked
                </p>
                <p className="text-xl font-bold text-[#0c1f1a]">
                  {totalTrackedDocuments}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          {/* Admission documents */}
          <section>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f4f3f]/10 text-[#0f4f3f]">
                <GraduationCap className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-[#0c1f1a]">
                  Admission Documents
                </h2>
                <p className="text-xs text-gray-500">
                  Official documents issued after admission approval.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <DocumentRow
                icon={<FileText className="h-5 w-5" />}
                title="Admission Letter"
                description={
                  admissionLetterAvailable
                    ? "Your official SMTC admission letter."
                    : "Available after your admission has been approved."
                }
                available={admissionLetterAvailable}
                actions={
                  <>
                    <DocumentAction
                      href="/api/student/documents/admission-letter"
                      label="View"
                      disabled={!admissionLetterAvailable}
                    />
                    <DocumentAction
                      href="/api/student/documents/admission-letter?download=1"
                      label="Download"
                      download
                      disabled={!admissionLetterAvailable}
                    />
                  </>
                }
              />

              <DocumentRow
                icon={<FileCheck2 className="h-5 w-5" />}
                title="Joining / Admission Instructions"
                description="Joining instructions and reporting information."
                available={false}
                actions={
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
                    Coming soon
                  </span>
                }
              />
            </div>
          </section>

          {/* Payment documents */}
          <section>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d7a93b]/15 text-[#a27a08]">
                <WalletCards className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-[#0c1f1a]">
                  Fees &amp; Payment Documents
                </h2>
                <p className="text-xs text-gray-500">
                  Receipts and financial documents related to your
                  application and admission.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <DocumentRow
                icon={<Receipt className="h-5 w-5" />}
                title="Application Fee Receipt"
                description={
                  applicationReceiptAvailable
                    ? "Official receipt for your application fee payment."
                    : "Available after your application fee payment has been verified."
                }
                available={applicationReceiptAvailable}
                actions={
                  <>
                    <DocumentAction
                      href="/api/student/documents/application-receipt"
                      label="View"
                      disabled={!applicationReceiptAvailable}
                    />
                    <DocumentAction
                      href="/api/student/documents/application-receipt?download=1"
                      label="Download"
                      download
                      disabled={!applicationReceiptAvailable}
                    />
                  </>
                }
              />

              <DocumentRow
                icon={<CreditCard className="h-5 w-5" />}
                title="Fee Statement"
                description="Detailed statement of your college fees and payments."
                available={false}
                actions={
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
                    Coming soon
                  </span>
                }
              />

              <DocumentRow
                icon={<WalletCards className="h-5 w-5" />}
                title="Fee Clearance"
                description="Official fee clearance document."
                available={false}
                actions={
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
                    Coming soon
                  </span>
                }
              />
            </div>
          </section>

          {/* Student and admission documents */}
          <section>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <IdCard className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-[#0c1f1a]">
                  Student &amp; Admission Documents
                </h2>
                <p className="text-xs text-gray-500">
                  Documents submitted during your application.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <DocumentRow
                icon={<IdCard className="h-5 w-5" />}
                title="ID / Passport"
                description={
                  idDocumentUrl
                    ? getFileName(idDocumentUrl)
                    : "National ID or passport submitted during application."
                }
                available={idDocumentAvailable}
                actions={
                  idDocumentUrl ? (
                    <>
                      <DocumentAction
                        href={idDocumentUrl}
                        label={isPdf(idDocumentUrl) ? "View" : "Open"}
                      />
                      <DocumentAction
                        href={idDocumentUrl}
                        label="Download"
                        download
                      />
                    </>
                  ) : undefined
                }
              />

              <DocumentRow
                icon={<FileText className="h-5 w-5" />}
                title="KCSE Certificate"
                description={
                  kcseCertificateUrl
                    ? getFileName(kcseCertificateUrl)
                    : "KCSE certificate submitted during application."
                }
                available={kcseCertificateAvailable}
                actions={
                  kcseCertificateUrl ? (
                    <>
                      <DocumentAction
                        href={kcseCertificateUrl}
                        label={isPdf(kcseCertificateUrl) ? "View" : "Open"}
                      />
                      <DocumentAction
                        href={kcseCertificateUrl}
                        label="Download"
                        download
                      />
                    </>
                  ) : undefined
                }
              />

              <DocumentRow
                icon={<ImageIcon className="h-5 w-5" />}
                title="Passport Photo"
                description={
                  passportPhotoUrl
                    ? getFileName(passportPhotoUrl)
                    : "Passport-size photograph submitted during application."
                }
                available={passportPhotoAvailable}
                actions={
                  passportPhotoUrl ? (
                    <>
                      <DocumentAction
                        href={passportPhotoUrl}
                        label="View"
                      />
                      <DocumentAction
                        href={passportPhotoUrl}
                        label="Download"
                        download
                      />
                    </>
                  ) : undefined
                }
              />
            </div>
          </section>

          {/* Academic documents */}
          <section>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <GraduationCap className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-[#0c1f1a]">
                  Academic Documents
                </h2>
                <p className="text-xs text-gray-500">
                  Academic records issued during your studies.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <DocumentRow
                icon={<FileText className="h-5 w-5" />}
                title="Result Slip"
                description="Academic result slip issued by the college."
                available={false}
                actions={
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
                    Coming soon
                  </span>
                }
              />

              <DocumentRow
                icon={<GraduationCap className="h-5 w-5" />}
                title="Progress Report"
                description="Academic progress report for your programme."
                available={false}
                actions={
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
                    Coming soon
                  </span>
                }
              />

              <DocumentRow
                icon={<FileCheck2 className="h-5 w-5" />}
                title="Transcript"
                description="Official academic transcript."
                available={false}
                actions={
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
                    Coming soon
                  </span>
                }
              />
            </div>
          </section>
        </div>

        {/* Security notice */}
        <section className="mt-6 rounded-2xl border border-[#0f4f3f]/15 bg-[#0f4f3f]/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f4f3f]" />

            <div>
              <h2 className="text-sm font-bold text-[#0c1f1a]">
                Document Security
              </h2>

              <p className="mt-1 text-xs leading-5 text-gray-600">
                Your student documents are linked to your authenticated
                student account. Do not share your admission documents,
                application records, or login details with unauthorized
                persons.
              </p>
            </div>
          </div>
        </section>

        {/* Record information */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-[#0f4f3f]" />
            <h2 className="text-sm font-bold text-[#0c1f1a]">
              Application Record
            </h2>
          </div>

          <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-gray-400">Application Number</p>
              <p className="mt-1 font-semibold text-gray-700">
                {student.application_number || "—"}
              </p>
            </div>

            <div>
              <p className="text-gray-400">Application Date</p>
              <p className="mt-1 font-semibold text-gray-700">
                {formatDate(student.created_at)}
              </p>
            </div>

            <div>
              <p className="text-gray-400">Application Status</p>
              <p className="mt-1 font-semibold capitalize text-gray-700">
                {(student.application_status || "pending").replace(
                  /_/g,
                  " "
                )}
              </p>
            </div>

            <div>
              <p className="text-gray-400">Payment Status</p>
              <p className="mt-1 font-semibold capitalize text-gray-700">
                {(student.payment_status || "pending").replace(
                  /_/g,
                  " "
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link
            href="/student/dashboard"
            className="text-sm font-semibold text-[#0f4f3f] hover:underline"
          >
            ← Back to Student Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}