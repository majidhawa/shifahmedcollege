
'use client';

import Link from 'next/link';
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  Download,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type SchemeEntry = {
  id: number;
  weekNumber: number;
  lessonTitle: string;
  objectives: string;
  keyPoints: string;
  applicationActivities: string;
  referencesAids: string;
  remarks: string;
  dateTaught: string;
};

type Scheme = {
  id: number;
  programId: number;
  unitId: number;

  programName: string;
  unitCode: string | null;
  unitName: string;

  referenceNumber: string;
  academicYear: string;
  term: string;
  title: string;
  status: string;

  trainerName: string;
  trainerTelephone: string;
  trainerEmail: string;

  courseNameLevel: string;
  competencyArea: string;
  dateOfPreparation: string;

  institution: string;
  intake: string;
  module: string;

  supervisorName: string;
  supervisorSignature: string;

  entries: SchemeEntry[];
};

// ============================================
// HELPERS
// ============================================

function stringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function dateValue(value: unknown): string {
  if (!value) return '';

  const valueString = String(value);

  // PostgreSQL DATE values should not shift due to timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(valueString)) {
    return valueString;
  }

  const date = new Date(valueString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function createEntry(weekNumber: number): SchemeEntry {
  return {
    id: 0,
    weekNumber,
    lessonTitle: '',
    objectives: '',
    keyPoints: '',
    applicationActivities: '',
    referencesAids: '',
    remarks: '',
    dateTaught: '',
  };
}

// ============================================
// NORMALIZE API RESPONSE
// Supports camelCase and snake_case fields.
// ============================================

function normalizeEntry(raw: Record<string, unknown>, index: number): SchemeEntry {
  return {
    id: Number(raw.id || 0),

    weekNumber: Number(
      raw.weekNumber ??
      raw.week_number ??
      index + 1,
    ),

    lessonTitle: stringValue(
      raw.lessonTitle ??
      raw.lesson_title ??
      raw.topic,
    ),

    objectives: stringValue(
      raw.objectives ??
      raw.learningOutcomes ??
      raw.learning_outcomes,
    ),

    keyPoints: stringValue(
      raw.keyPoints ??
      raw.key_points ??
      raw.subtopic,
    ),

    applicationActivities: stringValue(
      raw.applicationActivities ??
      raw.application_activities ??
      raw.activities,
    ),

    referencesAids: stringValue(
      raw.referencesAids ??
      raw.references_aids ??
      raw.resources,
    ),

    remarks: stringValue(raw.remarks),

    dateTaught: dateValue(
      raw.dateTaught ??
      raw.date_taught ??
      raw.startDate ??
      raw.start_date,
    ),
  };
}

function normalizeScheme(raw: Record<string, unknown>): Scheme {
  const rawEntries = Array.isArray(raw.entries)
    ? raw.entries
    : [];

  return {
    id: Number(raw.id || 0),

    programId: Number(
      raw.programId ??
      raw.program_id ??
      0,
    ),

    unitId: Number(
      raw.unitId ??
      raw.unit_id ??
      0,
    ),

    programName: stringValue(
      raw.programName ??
      raw.program_name,
    ),

    unitCode: stringValue(
      raw.unitCode ??
      raw.unit_code,
    ) || null,

    unitName: stringValue(
      raw.unitName ??
      raw.unit_name,
    ),

    referenceNumber: stringValue(
      raw.referenceNumber ??
      raw.reference_number,
    ),

    academicYear: stringValue(
      raw.academicYear ??
      raw.academic_year,
    ),

    term: stringValue(raw.term),

    title: stringValue(raw.title),

    status: stringValue(raw.status || 'draft'),

    trainerName: stringValue(
      raw.trainerName ??
      raw.trainer_name,
    ),

    trainerTelephone: stringValue(
      raw.trainerTelephone ??
      raw.trainer_telephone,
    ),

    trainerEmail: stringValue(
      raw.trainerEmail ??
      raw.trainer_email,
    ),

    courseNameLevel: stringValue(
      raw.courseNameLevel ??
      raw.course_name_level,
    ),

    competencyArea: stringValue(
      raw.competencyArea ??
      raw.competency_area,
    ),

    dateOfPreparation: dateValue(
      raw.dateOfPreparation ??
      raw.date_of_preparation,
    ),

    institution: stringValue(
      raw.institution || 'Shifah Medical Training College',
    ),

    intake: stringValue(raw.intake),

    module: stringValue(raw.module),

    supervisorName: stringValue(
      raw.supervisorName ??
      raw.supervisor_name,
    ),

    supervisorSignature: stringValue(
      raw.supervisorSignature ??
      raw.supervisor_signature,
    ),

    entries: rawEntries.map(
      (entry, index) =>
        normalizeEntry(
          entry as Record<string, unknown>,
          index,
        ),
    ),
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SchemeDetailPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const [scheme, setScheme] = useState<Scheme | null>(null);

  const [entries, setEntries] = useState<SchemeEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ==========================================
  // LOAD SCHEME
  // ==========================================

  const loadScheme = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/lecturer/schemes/${params.id}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.scheme) {
        throw new Error(
          result.message ||
          result.error ||
          'Unable to load scheme.',
        );
      }

      const normalized = normalizeScheme(result.scheme);

      setScheme(normalized);
      setEntries(normalized.entries);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load scheme.',
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadScheme();
  }, [loadScheme]);

  // ==========================================
  // UPDATE SCHEME INFORMATION
  // ==========================================

  function updateScheme(
    field: keyof Scheme,
    value: string,
  ) {
    setScheme((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  // ==========================================
  // UPDATE WEEKLY ENTRY
  // ==========================================

  function updateEntry(
    index: number,
    field: keyof SchemeEntry,
    value: string,
  ) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [field]:
                field === 'weekNumber'
                  ? Number(value)
                  : value,
            }
          : entry,
      ),
    );
  }

  // ==========================================
  // ADD WEEK
  // ==========================================

  function addWeek() {
    setEntries((current) => {
      const nextWeek =
        current.length > 0
          ? Math.max(
              ...current.map((entry) => entry.weekNumber),
            ) + 1
          : 1;

      return [
        ...current,
        createEntry(nextWeek),
      ];
    });
  }

  // ==========================================
  // REMOVE WEEK
  // ==========================================

  function removeWeek(index: number) {
    setEntries((current) =>
      current
        .filter((_, entryIndex) => entryIndex !== index)
        .map((entry, entryIndex) => ({
          ...entry,
          weekNumber: entryIndex + 1,
        })),
    );
  }

  // ==========================================
  // SAVE SCHEME
  // ==========================================

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!scheme) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!scheme.title.trim()) {
        throw new Error('Scheme title is required.');
      }

      if (!scheme.academicYear.trim()) {
        throw new Error('Academic year is required.');
      }

      if (!scheme.term.trim()) {
        throw new Error('Term is required.');
      }

      if (!scheme.trainerName.trim()) {
        throw new Error('Trainer name is required.');
      }

      if (!scheme.courseNameLevel.trim()) {
        throw new Error('Course name and level are required.');
      }

      if (!scheme.competencyArea.trim()) {
        throw new Error('Competency area is required.');
      }

      const validEntries = entries.filter(
        (entry) => entry.lessonTitle.trim(),
      );

      if (validEntries.length === 0) {
        throw new Error(
          'At least one lesson title is required.',
        );
      }

      const response = await fetch(
        `/api/lecturer/schemes/${scheme.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Main scheme information
            title: scheme.title.trim(),
            academicYear: scheme.academicYear.trim(),
            term: scheme.term.trim(),
            status: scheme.status,

            // Official SMTC information
            trainerName: scheme.trainerName.trim(),
            trainerTelephone: scheme.trainerTelephone.trim(),
            trainerEmail: scheme.trainerEmail.trim(),

            courseNameLevel: scheme.courseNameLevel.trim(),
            competencyArea: scheme.competencyArea.trim(),
            dateOfPreparation: scheme.dateOfPreparation || null,

            institution: scheme.institution.trim(),
            intake: scheme.intake.trim(),
            module: scheme.module.trim(),

            supervisorName: scheme.supervisorName.trim(),
            supervisorSignature: scheme.supervisorSignature.trim(),

            // Official weekly teaching entries
            entries: validEntries.map((entry, index) => ({
              id: entry.id,
              weekNumber: Number(entry.weekNumber) || index + 1,

              lessonTitle: entry.lessonTitle.trim(),
              objectives: entry.objectives.trim(),
              keyPoints: entry.keyPoints.trim(),
              applicationActivities: entry.applicationActivities.trim(),
              referencesAids: entry.referencesAids.trim(),
              remarks: entry.remarks.trim(),
              dateTaught: entry.dateTaught || null,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          result.error ||
          'Unable to update scheme.',
        );
      }

      setMessage(
        result.message ||
        'Scheme of Work updated successfully.',
      );

      await loadScheme();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update scheme.',
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DOWNLOAD PDF
  // Uses the server-side PDF route.
  // ==========================================

  async function handleDownloadPdf() {
    if (!scheme) return;

    setDownloading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `/api/lecturer/schemes/${scheme.id}/pdf`,
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        let errorMessage = 'Unable to generate scheme PDF.';

        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch {
          // Keep default error message.
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = url;

      const safeReference = (
        scheme.referenceNumber ||
        `Scheme-${scheme.id}`
      ).replace(/[^a-z0-9_-]/gi, '_');

      link.download = `SMTC-Scheme-of-Work-${safeReference}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      setMessage('Scheme PDF downloaded successfully.');
    } catch (downloadError) {
      console.error('PDF download error:', downloadError);

      setError(
        downloadError instanceof Error
          ? downloadError.message
          : 'Unable to generate the PDF.',
      );
    } finally {
      setDownloading(false);
    }
  }

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-5xl items-center justify-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Loading scheme...
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (!scheme) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/lecturer/dashboard/schemes"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Schemes
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || 'Scheme not found.'}
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* TOP NAVIGATION */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

          <Link
            href="/lecturer/dashboard/schemes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Schemes
          </Link>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                Download PDF
              </>
            )}
          </button>

        </div>

        {/* SUCCESS MESSAGE */}

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="space-y-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >

          {/* ================================== */}
          {/* FORM HEADING                      */}
          {/* ================================== */}

          <div className="border-b border-slate-100 pb-6">

            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
              Shifah Medical Training College
            </p>

            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
              Edit Scheme of Work
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Update the scheme details and weekly teaching schedule.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              <Info
                label="Reference Number"
                value={scheme.referenceNumber || 'Not assigned'}
              />

              <Info
                label="Programme"
                value={scheme.programName || '—'}
              />

              <Info
                label="Unit"
                value={`${scheme.unitCode ? `${scheme.unitCode} — ` : ''}${scheme.unitName || '—'}`}
              />

              <Info
                label="Institution"
                value={scheme.institution || 'Shifah Medical Training College'}
              />

            </div>

          </div>

          {/* ================================== */}
          {/* GENERAL SCHEME INFORMATION        */}
          {/* ================================== */}

          <FormSection
            title="Scheme Information"
            description="Enter the main details of this scheme of work."
          >

            <div className="grid gap-5 md:grid-cols-2">

              <InputField
                label="Scheme Title"
                value={scheme.title}
                onChange={(value) => updateScheme('title', value)}
                placeholder="Enter scheme title"
                required
              />

              <InputField
                label="Academic Year"
                value={scheme.academicYear}
                onChange={(value) => updateScheme('academicYear', value)}
                placeholder="e.g. 2026"
                required
              />

              <InputField
                label="Term"
                value={scheme.term}
                onChange={(value) => updateScheme('term', value)}
                placeholder="e.g. Term 1"
                required
              />

              <InputField
                label="Institution"
                value={scheme.institution}
                onChange={(value) => updateScheme('institution', value)}
                placeholder="Shifah Medical Training College"
                required
              />

              <InputField
                label="Intake"
                value={scheme.intake}
                onChange={(value) => updateScheme('intake', value)}
                placeholder="e.g. January 2027"
              />

              <InputField
                label="Module"
                value={scheme.module}
                onChange={(value) => updateScheme('module', value)}
                placeholder="Enter module"
              />

              <SelectField
                label="Status"
                value={scheme.status}
                onChange={(value) => updateScheme('status', value)}
                options={[
                  { label: 'Draft', value: 'draft' },
                  { label: 'Published', value: 'published' },
                ]}
              />

              <InputField
                label="Date of Preparation"
                type="date"
                value={scheme.dateOfPreparation}
                onChange={(value) => updateScheme('dateOfPreparation', value)}
              />

            </div>

          </FormSection>

          {/* ================================== */}
          {/* TRAINER INFORMATION               */}
          {/* ================================== */}

          <FormSection
            title="Trainer Information"
            description="Details of the trainer preparing the scheme."
          >

            <div className="grid gap-5 md:grid-cols-2">

              <InputField
                label="Name of the Trainer"
                value={scheme.trainerName}
                onChange={(value) => updateScheme('trainerName', value)}
                placeholder="Enter trainer's full name"
                required
              />

              <InputField
                label="Trainer Telephone Number"
                type="tel"
                value={scheme.trainerTelephone}
                onChange={(value) => updateScheme('trainerTelephone', value)}
                placeholder="e.g. 07XXXXXXXX"
              />

              <InputField
                label="Trainer Email Address"
                type="email"
                value={scheme.trainerEmail}
                onChange={(value) => updateScheme('trainerEmail', value)}
                placeholder="Enter trainer's email"
              />

            </div>

          </FormSection>

          {/* ================================== */}
          {/* COURSE INFORMATION                */}
          {/* ================================== */}

          <FormSection
            title="Course and Competency Information"
            description="Specify the course, level and competency area covered."
          >

            <div className="grid gap-5 md:grid-cols-2">

              <InputField
                label="Course Name and Level"
                value={scheme.courseNameLevel}
                onChange={(value) => updateScheme('courseNameLevel', value)}
                placeholder="e.g. Diploma in Emergency Medical Technology Level 6"
                required
              />

              <InputField
                label="Competency Area"
                value={scheme.competencyArea}
                onChange={(value) => updateScheme('competencyArea', value)}
                placeholder="Enter competency area"
                required
              />

            </div>

          </FormSection>

          {/* ================================== */}
          {/* SUPERVISOR INFORMATION            */}
          {/* ================================== */}

          <FormSection
            title="Supervisor Information"
            description="Details for supervisor review and verification."
          >

            <div className="grid gap-5 md:grid-cols-2">

              <InputField
                label="Supervisor's Name"
                value={scheme.supervisorName}
                onChange={(value) => updateScheme('supervisorName', value)}
                placeholder="Enter supervisor's name"
              />

              <InputField
                label="Supervisor's Signature"
                value={scheme.supervisorSignature}
                onChange={(value) => updateScheme('supervisorSignature', value)}
                placeholder="Enter signature or leave blank for signing"
              />

            </div>

          </FormSection>

          {/* ================================== */}
          {/* WEEKLY TEACHING SCHEDULE          */}
          {/* ================================== */}

          <FormSection
            title="Weekly Teaching Schedule"
            description="Edit the lesson titles, objectives, key points, activities and other weekly teaching details."
          >

            <div className="space-y-6">

              {entries.map((entry, index) => (

                <section
                  key={entry.id || `new-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
                >

                  {/* WEEK HEADER */}

                  <div className="mb-5 flex flex-wrap items-center justify-between gap-4">

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                        Weekly Teaching Plan
                      </p>

                      <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                        Week {entry.weekNumber}
                      </h3>
                    </div>

                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWeek(index)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Remove Week
                      </button>
                    )}

                  </div>

                  {/* WEEK DETAILS */}

                  <div className="grid gap-5 md:grid-cols-2">

                    <InputField
                      label="Week Number"
                      type="number"
                      value={String(entry.weekNumber)}
                      onChange={(value) =>
                        updateEntry(index, 'weekNumber', value)
                      }
                      placeholder="Week number"
                      required
                    />

                    <InputField
                      label="Date Taught"
                      type="date"
                      value={entry.dateTaught}
                      onChange={(value) =>
                        updateEntry(index, 'dateTaught', value)
                      }
                    />

                    <div className="md:col-span-2">
                      <InputField
                        label="Lesson Title"
                        value={entry.lessonTitle}
                        onChange={(value) =>
                          updateEntry(index, 'lessonTitle', value)
                        }
                        placeholder="Enter lesson title"
                        required
                      />
                    </div>

                    <TextArea
                      label="Objectives"
                      value={entry.objectives}
                      onChange={(value) =>
                        updateEntry(index, 'objectives', value)
                      }
                      placeholder="What should learners be able to achieve?"
                    />

                    <TextArea
                      label="Key Points"
                      value={entry.keyPoints}
                      onChange={(value) =>
                        updateEntry(index, 'keyPoints', value)
                      }
                      placeholder="Enter the key points to be covered"
                    />

                    <TextArea
                      label="Application / Activities"
                      value={entry.applicationActivities}
                      onChange={(value) =>
                        updateEntry(index, 'applicationActivities', value)
                      }
                      placeholder="Teaching methods, practical activities and learner participation"
                    />

                    <TextArea
                      label="References and Aids"
                      value={entry.referencesAids}
                      onChange={(value) =>
                        updateEntry(index, 'referencesAids', value)
                      }
                      placeholder="Textbooks, learning materials, equipment and other references"
                    />

                    <div className="md:col-span-2">
                      <TextArea
                        label="Remarks"
                        value={entry.remarks}
                        onChange={(value) =>
                          updateEntry(index, 'remarks', value)
                        }
                        placeholder="Enter remarks about the lesson or teaching progress"
                      />
                    </div>

                  </div>

                </section>

              ))}

            </div>

            {/* ADD WEEK */}

            <button
              type="button"
              onClick={addWeek}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 transition hover:bg-green-100"
            >
              <Plus size={17} />
              Add Teaching Week
            </button>

          </FormSection>

          {/* ================================== */}
          {/* SAVE BUTTON                       */}
          {/* ================================== */}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">

            <Link
              href="/lecturer/dashboard/schemes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}

// ============================================
// FORM SECTION
// ============================================

type FormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 p-5 sm:p-6">

      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-extrabold text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        )}
      </div>

      {children}

    </section>
  );
}

// ============================================
// INFORMATION CARD
// ============================================

type InfoProps = {
  label: string;
  value: string;
};

function Info({
  label,
  value,
}: InfoProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-800">
        {value || '—'}
      </p>
    </div>
  );
}

// ============================================
// INPUT FIELD
// ============================================

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
};

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: InputFieldProps) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || label}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />

    </label>
  );
}

// ============================================
// SELECT FIELD
// ============================================

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
};

function SelectField({
  label,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

    </label>
  );
}

// ============================================
// TEXT AREA
// ============================================

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: TextAreaProps) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder || label}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />

    </label>
  );
}
