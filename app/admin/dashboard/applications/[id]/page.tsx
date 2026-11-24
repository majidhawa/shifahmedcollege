'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type UploadedDocument =
  | string
  | {
      name?: string | null;
      url?: string | null;
      path?: string | null;
      mimeType?: string | null;
      size?: number | null;
    };

type SupportingDocuments = {
  birthCertificate: UploadedDocument | null;
  leavingCertificate: UploadedDocument | null;
  schoolTestimonials: UploadedDocument | null;
  additionalAcademicCertificates: UploadedDocument[];
  otherSupportingDocuments: UploadedDocument[];
};

type Admission = {
  id: number;
  application_id: number;
  admission_number: string;
  application_number: string;
  student_name: string;
  course: string;
  intake: string;
  admission_date: string;
  admission_status: string;
  admission_letter_path: string | null;
};

type Application = {
  id: number;
  application_number: string;

  surname: string;
  middle_name: string;
  first_name: string;

  date_of_birth: string;
  gender: string;
  nationality: string;
  country: string;
  id_passport_number: string;
  marital_status: string;

  postal_address: string;
  postal_code: string;
  town: string;
  county: string;
  mobile: string;
  email: string;

  kcse_index: string;
  kcse_year: string;
  kcse_mean_grade: string;
  english_grade: string;
  kiswahili_grade: string;
  biology_grade: string;
  chemistry_grade: string;
  physics_grade: string;
  mathematics_grade: string;
  previous_institution: string;
  highest_qualification: string;

  course: string;
  intake: string;

  sponsor_type: string;
  sponsor_name: string;
  sponsor_relationship: string;
  sponsor_mobile: string;
  sponsor_email: string;

  guardian_name: string;
  guardian_relationship: string;
  guardian_mobile: string;
  guardian_email: string;

  // Existing uploaded documents
  id_document: UploadedDocument | null;
  kcse_certificate: UploadedDocument | null;
  passport_photo: UploadedDocument | null;
  previous_qualification_certificate: UploadedDocument | null;
  academic_transcripts: UploadedDocument | null;

  // Optional supporting documents
  supporting_documents?: SupportingDocuments | null;
  supportingDocuments?: SupportingDocuments | null;

  declaration: boolean;

  application_fee: number;
  payment_status: string;
  application_status: string;

  created_at: string;
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

function fullName(application: Application) {
  return [
    application.first_name,
    application.middle_name,
    application.surname,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return '—';

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatFileSize(size?: number | null) {
  if (
    typeof size !== 'number' ||
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return '';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function isApproved(status?: string | null) {
  return (
    String(status || '')
      .trim()
      .toLowerCase() === 'approved'
  );
}

function isPaid(status?: string | null) {
  return (
    String(status || '')
      .trim()
      .toLowerCase() === 'paid'
  );
}

function isActive(status?: string | null) {
  return (
    String(status || '')
      .trim()
      .toLowerCase() === 'active'
  );
}

/* =========================================================
   DOCUMENT NORMALIZATION

   Supports both formats:

   1. Legacy string:
      "/uploads/applications/document.pdf"

   2. Current object:
      {
        name: "Birth Certificate.pdf",
        url: "/uploads/applications/document.pdf",
        mimeType: "application/pdf",
        size: 123456
      }

   Also accepts "path" as a fallback for "url".
========================================================= */

function normalizeUploadedDocument(
  value: unknown
): UploadedDocument | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    return trimmed ? trimmed : null;
  }

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  const document = value as Record<string, unknown>;

  const url =
    typeof document.url === 'string'
      ? document.url.trim()
      : typeof document.path === 'string'
        ? document.path.trim()
        : '';

  if (!url) {
    return null;
  }

  return {
    name:
      typeof document.name === 'string'
        ? document.name
        : null,

    url,

    path: url,

    mimeType:
      typeof document.mimeType === 'string'
        ? document.mimeType
        : null,

    size:
      typeof document.size === 'number'
        ? document.size
        : null,
  };
}

function normalizeDocumentArray(
  value: unknown
): UploadedDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeUploadedDocument)
    .filter(
      (document): document is UploadedDocument =>
        document !== null
    );
}

function normalizeSupportingDocuments(
  value: unknown
): SupportingDocuments {
  let documents = value;

  // PostgreSQL JSONB may arrive as an object.
  // Some API implementations may return it as a JSON string.
  if (typeof documents === 'string') {
    try {
      documents = JSON.parse(documents);
    } catch {
      documents = {};
    }
  }

  if (
    !documents ||
    typeof documents !== 'object' ||
    Array.isArray(documents)
  ) {
    documents = {};
  }

  const data = documents as Record<string, unknown>;

  return {
    birthCertificate: normalizeUploadedDocument(
      data.birthCertificate ??
        data.birth_certificate
    ),

    leavingCertificate: normalizeUploadedDocument(
      data.leavingCertificate ??
        data.leaving_certificate
    ),

    schoolTestimonials: normalizeUploadedDocument(
      data.schoolTestimonials ??
        data.school_testimonials
    ),

    additionalAcademicCertificates:
      normalizeDocumentArray(
        data.additionalAcademicCertificates ??
          data.additional_academic_certificates
      ),

    otherSupportingDocuments:
      normalizeDocumentArray(
        data.otherSupportingDocuments ??
          data.other_supporting_documents
      ),
  };
}

function getDocumentUrl(
  document: UploadedDocument | null | undefined
): string | null {
  if (!document) return null;

  if (typeof document === 'string') {
    return document.trim() || null;
  }

  return (
    document.url?.trim() ||
    document.path?.trim() ||
    null
  );
}

function getDocumentName(
  document: UploadedDocument | null | undefined
): string | null {
  if (!document || typeof document === 'string') {
    return null;
  }

  return document.name?.trim() || null;
}

function getDocumentSize(
  document: UploadedDocument | null | undefined
): number | null {
  if (
    !document ||
    typeof document === 'string' ||
    typeof document.size !== 'number'
  ) {
    return null;
  }

  return document.size;
}

function countSupportingDocuments(
  documents: SupportingDocuments
) {
  return [
    documents.birthCertificate,
    documents.leavingCertificate,
    documents.schoolTestimonials,
  ].filter(Boolean).length +
    documents.additionalAcademicCertificates.length +
    documents.otherSupportingDocuments.length;
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || '—'}
      </p>
    </div>
  );
}

/* =========================================================
   SECTION
========================================================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-bold text-brand-dark">
          {title}
        </h2>
      </div>

      <div className="p-6">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   DOCUMENT CARD

   Displays uploaded documents regardless of whether the
   API returns a URL string or an object containing metadata.
========================================================= */

function DocumentCard({
  title,
  document,
}: {
  title: string;
  document: UploadedDocument | null | undefined;
}) {
  const path = getDocumentUrl(document);

  if (!path) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/70">
            <FileText className="h-5 w-5 text-slate-400" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">
              {title}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              No document uploaded
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fileName = getDocumentName(document);
  const fileSize = formatFileSize(
    getDocumentSize(document)
  );

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/10">
          <FileText className="h-5 w-5 text-brand-green" />
        </div>

        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-brand-dark">
            {title}
          </p>

          {fileName && (
            <p className="mt-1 break-all text-xs text-slate-500">
              {fileName}
            </p>
          )}

          <p className="mt-1 text-xs text-green-600">
            Document uploaded
            {fileSize ? ` · ${fileSize}` : ''}
          </p>
        </div>
      </div>

      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-green px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-dark"
      >
        View

        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

/* =========================================================
   MULTIPLE DOCUMENTS

   Displays every uploaded file in an array.
========================================================= */

function MultipleDocumentCards({
  title,
  documents,
}: {
  title: string;
  documents: UploadedDocument[];
}) {
  if (!documents.length) {
    return (
      <DocumentCard
        title={title}
        document={null}
      />
    );
  }

  return (
    <>
      {documents.map((document, index) => {
        const path = getDocumentUrl(document);

        return (
          <DocumentCard
            key={`${title}-${path || index}-${index}`}
            title={`${title} ${index + 1}`}
            document={document}
          />
        );
      })}
    </>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ApplicationDetailsPage() {
  const params = useParams<{ id: string }>();

  const id = params?.id;

  const [application, setApplication] =
    useState<Application | null>(null);

  const [admission, setAdmission] =
    useState<Admission | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [admissionLoading, setAdmissionLoading] =
    useState(false);

  const [letterLoading, setLetterLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  /* =======================================================
     LOAD APPLICATION
  ======================================================= */

  const loadApplication = useCallback(
    async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `/api/admin/applications/${encodeURIComponent(id)}`,
          {
            cache: 'no-store',
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              'Unable to load application.'
          );
        }

        const receivedApplication =
          data.application as Application;

        const supportingDocuments =
          normalizeSupportingDocuments(
            receivedApplication.supporting_documents ??
              receivedApplication.supportingDocuments
          );

        setApplication({
          ...receivedApplication,
          supporting_documents: supportingDocuments,
          supportingDocuments,
        });
      } catch (err) {
        console.error(
          'LOAD APPLICATION ERROR:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load application.'
        );
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  /* =======================================================
     LOAD EXISTING ADMISSION
  ======================================================= */

  const loadAdmission = useCallback(
    async () => {
      if (!id) return;

      try {
        const response = await fetch(
          `/api/admin/admissions/application/${encodeURIComponent(id)}`,
          {
            cache: 'no-store',
          }
        );

        if (response.status === 404) {
          setAdmission(null);
          return;
        }

        const data = await response.json();

        if (response.ok && data.success) {
          setAdmission(data.admission);
        }
      } catch (err) {
        console.error(
          'LOAD ADMISSION ERROR:',
          err
        );
      }
    },
    [id]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadApplication();
    loadAdmission();
  }, [
    loadApplication,
    loadAdmission,
  ]);

  /* =======================================================
     UPDATE APPLICATION STATUS
  ======================================================= */

  async function updateStatus(
    newStatus: 'Approved' | 'Rejected'
  ) {
    if (!application) return;

    const confirmed = window.confirm(
      newStatus === 'Approved'
        ? 'Are you sure you want to approve this application?'
        : 'Are you sure you want to reject this application?'
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(
        `/api/admin/applications/${application.id}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            application_status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to update application.'
        );
      }

      const updatedApplication =
        data.application as Application;

      const supportingDocuments =
        normalizeSupportingDocuments(
          updatedApplication?.supporting_documents ??
            updatedApplication?.supportingDocuments ??
            application.supporting_documents ??
            application.supportingDocuments
        );

      setApplication({
        ...application,
        ...updatedApplication,
        supporting_documents: supportingDocuments,
        supportingDocuments,
      });

      await loadAdmission();

      setSuccess(
        newStatus === 'Approved'
          ? 'Application approved successfully. The admission letter is now available if an active admission exists.'
          : 'Application rejected successfully. The admission letter is no longer available for download.'
      );
    } catch (err) {
      console.error(
        'UPDATE APPLICATION STATUS ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update application.'
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =======================================================
     CREATE ADMISSION
  ======================================================= */

  async function createAdmission() {
    if (!application) return;

    if (
      !isApproved(
        application.application_status
      )
    ) {
      setError(
        'The application must be approved before creating an admission.'
      );

      return;
    }

    if (
      !isPaid(
        application.payment_status
      )
    ) {
      setError(
        'The application fee must be paid before creating an admission.'
      );

      return;
    }

    const confirmed = window.confirm(
      `Create admission for ${fullName(application)}?`
    );

    if (!confirmed) return;

    try {
      setAdmissionLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(
        '/api/admin/admissions',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            application_id: application.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to create admission.'
        );
      }

      setAdmission(data.admission);

      setSuccess(
        data.message ||
          'Admission created successfully.'
      );

      await loadAdmission();
    } catch (err) {
      console.error(
        'CREATE ADMISSION ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create admission.'
      );
    } finally {
      setAdmissionLoading(false);
    }
  }

  /* =======================================================
     DOWNLOAD ADMISSION LETTER
  ======================================================= */

  async function downloadAdmissionLetter() {
    if (!application) return;

    if (
      !isApproved(
        application.application_status
      )
    ) {
      setError(
        'The admission letter can only be downloaded after the application has been approved.'
      );

      return;
    }

    if (!admission) {
      setError(
        'An admission must be created before the admission letter can be downloaded.'
      );

      return;
    }

    if (
      !isActive(
        admission.admission_status
      )
    ) {
      setError(
        'The admission must be active before the admission letter can be downloaded.'
      );

      return;
    }

    try {
      setLetterLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(
        `/api/admin/admissions/${admission.id}/letter`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        let message =
          'Unable to download admission letter.';

        try {
          const data = await response.json();

          if (data?.message) {
            message = data.message;
          }
        } catch {
          // Server returned a non-JSON error.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error(
          'The admission letter returned by the server is empty.'
        );
      }

      const contentDisposition =
        response.headers.get(
          'Content-Disposition'
        );

      let filename =
        `SMTC-Admission-Letter-${admission.admission_number}.pdf`;

      if (contentDisposition) {
        const filenameMatch =
          contentDisposition.match(
            /filename="([^"]+)"/i
          );

        if (filenameMatch?.[1]) {
          filename = filenameMatch[1];
        }
      }

      const blobUrl =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = blobUrl;
      link.download = filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(blobUrl);

      await loadAdmission();

      setSuccess(
        admission.admission_letter_path
          ? 'Admission letter downloaded successfully.'
          : 'Admission letter generated, saved and downloaded successfully.'
      );
    } catch (err) {
      console.error(
        'ADMISSION LETTER ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to download admission letter.'
      );
    } finally {
      setLetterLoading(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-brand-green" />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading application...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!application) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 text-xl font-bold text-red-800">
            Application not found
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error ||
              'The requested application could not be found.'}
          </p>

          <Link
            href="/admin/dashboard/applications"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  /* =======================================================
     DERIVED STATES
  ======================================================= */

  const applicationApproved =
    isApproved(application.application_status);

  const paymentPaid =
    isPaid(application.payment_status);

  const admissionActive =
    isActive(admission?.admission_status);

  const admissionLetterSaved =
    Boolean(admission?.admission_letter_path);

  const canDownloadAdmissionLetter =
    Boolean(
      applicationApproved &&
        admission &&
        admissionActive
    );

  const supportingDocuments =
    normalizeSupportingDocuments(
      application.supporting_documents ??
        application.supportingDocuments
    );

  const additionalDocumentCount =
    countSupportingDocuments(supportingDocuments);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            BACK
        ================================================== */}

        <Link
          href="/admin/dashboard/applications"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-green"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="mt-6 rounded-3xl bg-brand-green p-6 text-white shadow-soft">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
                Application Details
              </p>

              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                {application.application_number}
              </h1>

              <p className="mt-2 text-sm text-white/70">
                {fullName(application)}
              </p>

              <p className="mt-1 text-sm text-white/60">
                Submitted on{' '}
                {formatDate(application.created_at)}
              </p>
            </div>

            <div>
              {applicationApproved ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Approved
                </span>
              ) : application.application_status === 'Rejected' ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-red-700">
                  <XCircle className="h-4 w-4" />
                  Rejected
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-4 py-2 text-sm font-bold text-brand-dark">
                  Pending Review
                </span>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            MESSAGES
        ================================================== */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {/* =================================================
            ADMISSION
        ================================================== */}

        <div className="mt-6">
          <Section title="Admission">
            {admission ? (
              <div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                        Official Admission Number
                      </p>

                      <p className="mt-1 text-2xl font-bold text-brand-dark">
                        {admission.admission_number}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        This admission number is stored permanently
                        against this admission and must not change
                        when the admission letter is downloaded.
                      </p>
                    </div>

                    <div>
                      {admissionActive ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600">
                          <XCircle className="h-4 w-4" />
                          {admission.admission_status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoRow
                    label="Student"
                    value={admission.student_name}
                  />

                  <InfoRow
                    label="Course"
                    value={admission.course}
                  />

                  <InfoRow
                    label="Intake"
                    value={admission.intake}
                  />

                  <InfoRow
                    label="Admission Date"
                    value={formatDate(admission.admission_date)}
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/10">
                        <FileText className="h-5 w-5 text-brand-green" />
                      </div>

                      <div>
                        <h3 className="font-bold text-brand-dark">
                          Official Admission Letter
                        </h3>

                        {applicationApproved && admissionActive ? (
                          admissionLetterSaved ? (
                            <p className="mt-1 text-sm text-green-700">
                              Saved admission letter available.
                              Downloading it returns the stored
                              document without regenerating it.
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-slate-500">
                              This application is approved. Generate
                              the admission letter once and it will
                              be permanently saved with the admission
                              record.
                            </p>
                          )
                        ) : (
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            The admission letter can only be downloaded
                            after the application has been approved
                            and the admission is active.
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={downloadAdmissionLetter}
                      disabled={
                        letterLoading ||
                        !canDownloadAdmissionLetter
                      }
                      title={
                        !applicationApproved
                          ? 'Approve the application first'
                          : !admissionActive
                            ? 'Admission must be active'
                            : admissionLetterSaved
                              ? 'Download saved admission letter'
                              : 'Generate and download admission letter'
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {letterLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}

                      {letterLoading
                        ? 'Preparing Letter...'
                        : admissionLetterSaved
                          ? 'Download Admission Letter'
                          : 'Generate & Download Letter'}
                    </button>
                  </div>

                  {!applicationApproved && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-800">
                        Admission letter unavailable
                      </p>

                      <p className="mt-1 text-xs text-amber-700">
                        The application must be approved before
                        the admission letter can be downloaded.
                      </p>
                    </div>
                  )}

                  {applicationApproved && !admissionActive && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-800">
                        Admission letter unavailable
                      </p>

                      <p className="mt-1 text-xs text-red-700">
                        The admission must be active before the
                        admission letter can be downloaded.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href={`/api/admin/applications/${application.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green bg-white px-5 py-3 text-sm font-bold text-brand-green transition hover:bg-brand-green/5"
                  >
                    <Download className="h-4 w-4" />
                    Download Application Form
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-700">
                    No admission has been created yet.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    The application must be approved and the
                    application fee must be paid before an
                    admission can be created.
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={createAdmission}
                    disabled={
                      admissionLoading ||
                      !applicationApproved ||
                      !paymentPaid
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {admissionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}

                    {admissionLoading
                      ? 'Creating Admission...'
                      : 'Create Admission'}
                  </button>
                </div>

                {!applicationApproved && (
                  <p className="mt-3 text-xs text-slate-400">
                    Approve the application first.
                  </p>
                )}

                {applicationApproved && !paymentPaid && (
                  <p className="mt-3 text-xs text-red-500">
                    Application fee payment must be confirmed first.
                  </p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* =================================================
            PERSONAL
        ================================================== */}

        <div className="mt-6">
          <Section title="Personal Information">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                label="Full Name"
                value={fullName(application)}
              />

              <InfoRow
                label="Date of Birth"
                value={formatDate(application.date_of_birth)}
              />

              <InfoRow
                label="Gender"
                value={application.gender}
              />

              <InfoRow
                label="Nationality"
                value={application.nationality}
              />

              <InfoRow
                label="Country"
                value={application.country}
              />

              <InfoRow
                label="ID / Passport Number"
                value={application.id_passport_number}
              />

              <InfoRow
                label="Marital Status"
                value={application.marital_status}
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            CONTACT
        ================================================== */}

        <div className="mt-6">
          <Section title="Contact Information">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />

                <InfoRow
                  label="Mobile"
                  value={application.mobile}
                />
              </div>

              <div className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />

                <InfoRow
                  label="Email"
                  value={application.email}
                />
              </div>

              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />

                <InfoRow
                  label="County"
                  value={application.county}
                />
              </div>

              <InfoRow
                label="Town"
                value={application.town}
              />

              <InfoRow
                label="Postal Address"
                value={application.postal_address}
              />

              <InfoRow
                label="Postal Code"
                value={application.postal_code}
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            ACADEMIC
        ================================================== */}

        <div className="mt-6">
          <Section title="Academic Information">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                label="KCSE Index"
                value={application.kcse_index}
              />

              <InfoRow
                label="KCSE Year"
                value={application.kcse_year}
              />

              <InfoRow
                label="KCSE Mean Grade"
                value={application.kcse_mean_grade}
              />

              <InfoRow
                label="English"
                value={application.english_grade}
              />

              <InfoRow
                label="Kiswahili"
                value={application.kiswahili_grade}
              />

              <InfoRow
                label="Biology"
                value={application.biology_grade}
              />

              <InfoRow
                label="Chemistry"
                value={application.chemistry_grade}
              />

              <InfoRow
                label="Physics"
                value={application.physics_grade}
              />

              <InfoRow
                label="Mathematics"
                value={application.mathematics_grade}
              />

              <InfoRow
                label="Previous Institution"
                value={application.previous_institution}
              />

              <InfoRow
                label="Highest Qualification"
                value={application.highest_qualification}
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            COURSE
        ================================================== */}

        <div className="mt-6">
          <Section title="Course & Intake">
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoRow
                label="Selected Course"
                value={application.course}
              />

              <InfoRow
                label="Intake"
                value={application.intake}
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            SPONSOR
        ================================================== */}

        <div className="mt-6">
          <Section title="Sponsor Information">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                label="Sponsor Type"
                value={application.sponsor_type}
              />

              <InfoRow
                label="Sponsor Name"
                value={application.sponsor_name}
              />

              <InfoRow
                label="Relationship"
                value={application.sponsor_relationship}
              />

              <InfoRow
                label="Mobile"
                value={application.sponsor_mobile}
              />

              <InfoRow
                label="Email"
                value={application.sponsor_email}
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            GUARDIAN
        ================================================== */}

        <div className="mt-6">
          <Section title="Parent / Guardian Information">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow
                label="Name"
                value={application.guardian_name}
              />

              <InfoRow
                label="Relationship"
                value={application.guardian_relationship}
              />

              <InfoRow
                label="Mobile"
                value={application.guardian_mobile}
              />

              <InfoRow
                label="Email"
                value={application.guardian_email}
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            REQUIRED / EXISTING DOCUMENTS
        ================================================== */}

        <div className="mt-6">
          <Section title="Required Application Documents">
            <p className="mb-5 text-sm text-slate-500">
              These are the main documents submitted with
              the application.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DocumentCard
                title="National ID / Passport"
                document={application.id_document}
              />

              <DocumentCard
                title="KCSE Certificate / Result Slip"
                document={application.kcse_certificate}
              />

              <DocumentCard
                title="Passport Photo"
                document={application.passport_photo}
              />

              <DocumentCard
                title="Previous Qualification Certificate"
                document={
                  application.previous_qualification_certificate
                }
              />

              <DocumentCard
                title="Academic Transcripts"
                document={application.academic_transcripts}
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            OPTIONAL SUPPORTING DOCUMENTS
        ================================================== */}

        <div className="mt-6">
          <Section title="Additional Supporting Documents">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                These documents are optional. Applicants may
                provide any additional documents relevant to
                their application.
              </p>

              <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {additionalDocumentCount}{' '}
                {additionalDocumentCount === 1
                  ? 'document'
                  : 'documents'}{' '}
                uploaded
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DocumentCard
                title="Birth Certificate"
                document={
                  supportingDocuments.birthCertificate
                }
              />

              <DocumentCard
                title="Leaving Certificate"
                document={
                  supportingDocuments.leavingCertificate
                }
              />

              <DocumentCard
                title="School Testimonials"
                document={
                  supportingDocuments.schoolTestimonials
                }
              />

              <MultipleDocumentCards
                title="Additional Academic Certificate"
                documents={
                  supportingDocuments.additionalAcademicCertificates
                }
              />

              <MultipleDocumentCards
                title="Other Supporting Document"
                documents={
                  supportingDocuments.otherSupportingDocuments
                }
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            PAYMENT
        ================================================== */}

        <div className="mt-6">
          <Section title="Application Fee">
            <div className="grid gap-6 sm:grid-cols-3">
              <InfoRow
                label="Application Fee"
                value={formatCurrency(application.application_fee)}
              />

              <InfoRow
                label="Payment Status"
                value={application.payment_status}
              />

              <InfoRow
                label="Declaration Accepted"
                value={
                  application.declaration
                    ? 'Yes'
                    : 'No'
                }
              />
            </div>
          </Section>
        </div>

        {/* =================================================
            APPLICATION DECISION
        ================================================== */}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-brand-green" />

            <div>
              <h2 className="font-bold text-brand-dark">
                Application Decision
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review the application before making an
                admission decision.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={
                actionLoading ||
                applicationApproved
              }
              onClick={() => updateStatus('Approved')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}

              Approve Application
            </button>

            <button
              type="button"
              disabled={
                actionLoading ||
                application.application_status === 'Rejected'
              }
              onClick={() => updateStatus('Rejected')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}

              Reject Application
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}