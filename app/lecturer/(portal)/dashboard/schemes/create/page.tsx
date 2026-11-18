
'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

type Unit = {
  id: number;
  code: string | null;
  name: string;
};

type Program = {
  id: number;
  name: string;
  units: Unit[];
};

type SchemeEntry = {
  weekNumber: number;
  lessonTitle: string;
  objectives: string;
  keyPoints: string;
  applicationActivities: string;
  referencesAids: string;
  remarks: string;
  dateTaught: string;
};

type Metadata = {
  referenceNumber: string;
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
};

const TERMS = [
  'Term 1',
  'Term 2',
  'Term 3',
  'Semester 1',
  'Semester 2',
];

function localDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function createEntry(weekNumber: number): SchemeEntry {
  return {
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

function createMetadata(): Metadata {
  return {
    referenceNumber: 'SMTC/SW/2026/002',
    trainerName: '',
    trainerTelephone: '',
    trainerEmail: '',
    courseNameLevel: '',
    competencyArea: '',
    dateOfPreparation: localDate(),
    institution: 'Shifah Medical Training College',
    intake: '',
    module: '',
    supervisorName: '',
    supervisorSignature: '',
  };
}

/* -------------------------------------------------------------------------- */
/* REUSABLE INPUTS                                                            */
/* -------------------------------------------------------------------------- */

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || label}
        required={required}
        readOnly={readOnly}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 read-only:bg-slate-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder || label}
        required={required}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN CREATE PAGE                                                           */
/* -------------------------------------------------------------------------- */

export default function CreateSchemePage() {
  const [programs, setPrograms] = useState<Program[]>([]);

  const [programId, setProgramId] = useState('');
  const [unitId, setUnitId] = useState('');

  const [academicYear, setAcademicYear] = useState(
    String(new Date().getFullYear()),
  );

  const [term, setTerm] = useState('Term 1');
  const [status, setStatus] = useState('draft');

  const [metadata, setMetadata] = useState<Metadata>(
    createMetadata(),
  );

  const [entries, setEntries] = useState<SchemeEntry[]>([
    createEntry(1),
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedProgram = programs.find(
    (program) => String(program.id) === programId,
  );

  const units = selectedProgram?.units ?? [];

  /* ------------------------------------------------------------------------ */
  /* LOAD PROGRAMMES                                                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          '/api/lecturer/planning/options',
          {
            credentials: 'include',
            cache: 'no-store',
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Unable to load programmes.',
          );
        }

        setPrograms(
          Array.isArray(result.programs)
            ? result.programs
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load programmes.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOptions();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* UPDATE METADATA                                                          */
  /* ------------------------------------------------------------------------ */

  function updateMetadata(
    field: keyof Metadata,
    value: string,
  ) {
    setMetadata((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* UPDATE WEEKLY ENTRY                                                      */
  /* ------------------------------------------------------------------------ */

  function updateEntry(
    index: number,
    field: keyof SchemeEntry,
    value: string,
  ) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, [field]: value }
          : entry,
      ),
    );
  }

  function addWeek() {
    setEntries((current) => [
      ...current,
      createEntry(current.length + 1),
    ]);
  }

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

  /* ------------------------------------------------------------------------ */
  /* RESET FORM                                                               */
  /* ------------------------------------------------------------------------ */

  function resetForm() {
    setProgramId('');
    setUnitId('');
    setAcademicYear(String(new Date().getFullYear()));
    setTerm('Term 1');
    setStatus('draft');
    setMetadata(createMetadata());
    setEntries([createEntry(1)]);
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE SCHEME                                                              */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!programId) {
        throw new Error('Please select a programme.');
      }

      if (!unitId) {
        throw new Error('Please select a unit.');
      }

      const requiredMetadata: Array<
        [keyof Metadata, string]
      > = [
        ['referenceNumber', 'Reference number'],
        ['trainerName', 'Trainer name'],
        ['courseNameLevel', 'Course name and level'],
        ['competencyArea', 'Competency area'],
        ['dateOfPreparation', 'Date of preparation'],
        ['institution', 'Institution'],
        ['intake', 'Intake'],
        ['module', 'Module'],
        ['supervisorName', "Supervisor's name"],
      ];

      for (const [field, label] of requiredMetadata) {
        if (!metadata[field].trim()) {
          throw new Error(`${label} is required.`);
        }
      }

      if (!academicYear.trim()) {
        throw new Error('Academic year is required.');
      }

      const validEntries = entries.filter(
        (entry) => entry.lessonTitle.trim(),
      );

      if (validEntries.length === 0) {
        throw new Error(
          'Please add at least one lesson title.',
        );
      }

      for (const entry of validEntries) {
        const fields: Array<[string, string]> = [
          ['Objectives', entry.objectives],
          ['Key Points', entry.keyPoints],
          ['Application / Activities', entry.applicationActivities],
          ['Ref. & Aids', entry.referencesAids],
        ];

        const missing = fields.find(
          ([, value]) => !value.trim(),
        );

        if (missing) {
          throw new Error(
            `${missing[0]} is required in Week ${entry.weekNumber}.`,
          );
        }
      }

      const response = await fetch(
        '/api/lecturer/schemes',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            programId: Number(programId),
            unitId: Number(unitId),
            academicYear: academicYear.trim(),
            term,
            title: `${metadata.module} - ${metadata.courseNameLevel} - ${term}`,
            status,

            referenceNumber: metadata.referenceNumber.trim(),
            trainerName: metadata.trainerName.trim(),
            trainerTelephone: metadata.trainerTelephone.trim(),
            trainerEmail: metadata.trainerEmail.trim(),
            courseNameLevel: metadata.courseNameLevel.trim(),
            competencyArea: metadata.competencyArea.trim(),
            dateOfPreparation: metadata.dateOfPreparation,
            institution: metadata.institution.trim(),
            intake: metadata.intake.trim(),
            module: metadata.module.trim(),
            supervisorName: metadata.supervisorName.trim(),
            supervisorSignature: metadata.supervisorSignature.trim(),

            entries: validEntries.map((entry) => ({
              weekNumber: entry.weekNumber,
              lessonTitle: entry.lessonTitle.trim(),
              objectives: entry.objectives.trim(),
              keyPoints: entry.keyPoints.trim(),
              applicationActivities:
                entry.applicationActivities.trim(),
              referencesAids: entry.referencesAids.trim(),
              remarks: entry.remarks.trim(),
              dateTaught: entry.dateTaught,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to create scheme of work.',
        );
      }

      setMessage(
        result.message || 'Scheme created successfully.',
      );

      // Return to the main schemes page after saving.
      window.location.href = '/lecturer/dashboard/schemes';

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create scheme of work.',
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-6">

          <Link
            href="/lecturer/dashboard/schemes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Schemes of Work
          </Link>

          <div className="mt-5 flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-brand-green">
              <BookOpenCheck size={25} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
                Academic Planning
              </p>

              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
                Create Scheme of Work
              </h1>
            </div>

          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Complete the official SMTC scheme of work
            document using the institution's approved
            structure.
          </p>

        </div>

        {/* ALERTS */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <Loader2 size={20} className="animate-spin" />
              Loading assigned programmes...
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          >

            {/* DOCUMENT HEADING */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
                  SMTC Official Document
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                  SCHEMES OF WORK
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Shifah Medical Training College
                </p>
              </div>

              <div className="rounded-xl bg-green-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase text-green-700">
                  Document Reference
                </p>

                <p className="mt-1 text-sm font-extrabold text-green-800">
                  {metadata.referenceNumber}
                </p>
              </div>

            </div>

            {/* ============================================================ */}
            {/* A. TRAINER AND COURSE DETAILS                                 */}
            {/* ============================================================ */}

            <section className="mb-9">

              <SectionHeading>
                A. Trainer and Course Information
              </SectionHeading>

              <div className="grid gap-5 md:grid-cols-2">

                <InputField
                  label="Reference Number"
                  value={metadata.referenceNumber}
                  onChange={(value) =>
                    updateMetadata('referenceNumber', value)
                  }
                  required
                />

                <InputField
                  label="Name of the Trainer"
                  value={metadata.trainerName}
                  onChange={(value) =>
                    updateMetadata('trainerName', value)
                  }
                  placeholder="Trainer's full name"
                  required
                />

                <InputField
                  label="Course Name and Level"
                  value={metadata.courseNameLevel}
                  onChange={(value) =>
                    updateMetadata('courseNameLevel', value)
                  }
                  placeholder="e.g. Diploma in EMT Level 6"
                  required
                />

                <InputField
                  label="Competency Area"
                  value={metadata.competencyArea}
                  onChange={(value) =>
                    updateMetadata('competencyArea', value)
                  }
                  placeholder="Enter competency area"
                  required
                />

                <InputField
                  label="Trainer Telephone Number"
                  value={metadata.trainerTelephone}
                  onChange={(value) =>
                    updateMetadata('trainerTelephone', value)
                  }
                  placeholder="07XXXXXXXX"
                  type="tel"
                />

                <InputField
                  label="Trainer's Email Address"
                  value={metadata.trainerEmail}
                  onChange={(value) =>
                    updateMetadata('trainerEmail', value)
                  }
                  placeholder="trainer@example.com"
                  type="email"
                />

                <InputField
                  label="Date of Preparation"
                  value={metadata.dateOfPreparation}
                  onChange={(value) =>
                    updateMetadata('dateOfPreparation', value)
                  }
                  type="date"
                  required
                />

                <InputField
                  label="Institution"
                  value={metadata.institution}
                  onChange={(value) =>
                    updateMetadata('institution', value)
                  }
                  required
                />

                <InputField
                  label="Intake"
                  value={metadata.intake}
                  onChange={(value) =>
                    updateMetadata('intake', value)
                  }
                  placeholder="e.g. January 2027 Intake"
                  required
                />

                <InputField
                  label="Module"
                  value={metadata.module}
                  onChange={(value) =>
                    updateMetadata('module', value)
                  }
                  placeholder="Enter module name"
                  required
                />

                <InputField
                  label="Academic Year"
                  value={academicYear}
                  onChange={setAcademicYear}
                  placeholder="e.g. 2026"
                  required
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Term
                  </span>

                  <select
                    value={term}
                    onChange={(event) =>
                      setTerm(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  >
                    {TERMS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

              </div>
            </section>

            {/* ============================================================ */}
            {/* B. PROGRAMME AND UNIT                                         */}
            {/* ============================================================ */}

            <section className="mb-9">

              <SectionHeading>
                B. Programme and Unit Selection
              </SectionHeading>

              <div className="grid gap-5 md:grid-cols-2">

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Programme
                    <Required />
                  </span>

                  <select
                    value={programId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setProgramId(value);
                      setUnitId('');

                      const program = programs.find(
                        (item) => String(item.id) === value,
                      );

                      if (program) {
                        updateMetadata(
                          'courseNameLevel',
                          program.name,
                        );
                      }
                    }}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="">Select programme</option>

                    {programs.map((program) => (
                      <option
                        key={program.id}
                        value={program.id}
                      >
                        {program.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Unit
                    <Required />
                  </span>

                  <select
                    value={unitId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setUnitId(value);

                      const unit = units.find(
                        (item) => String(item.id) === value,
                      );

                      if (unit) {
                        updateMetadata(
                          'competencyArea',
                          unit.name,
                        );
                      }
                    }}
                    disabled={!programId}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-100 focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="">Select unit</option>

                    {units.map((unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                      >
                        {unit.code ? `${unit.code} — ` : ''}
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>

              </div>

            </section>

            {/* ============================================================ */}
            {/* C. SUPERVISOR                                                 */}
            {/* ============================================================ */}

            <section className="mb-9">

              <SectionHeading>
                C. Supervisor's Details
              </SectionHeading>

              <div className="grid gap-5 md:grid-cols-2">

                <InputField
                  label="Supervisor's Name"
                  value={metadata.supervisorName}
                  onChange={(value) =>
                    updateMetadata('supervisorName', value)
                  }
                  placeholder="Supervisor's full name"
                  required
                />

                <InputField
                  label="Supervisor's Signature"
                  value={metadata.supervisorSignature}
                  onChange={(value) =>
                    updateMetadata('supervisorSignature', value)
                  }
                  placeholder="For supervisor's approval"
                />

              </div>

              <p className="mt-3 text-xs text-slate-500">
                The actual signature should be provided by
                the supervisor during approval.
              </p>

            </section>

            {/* ============================================================ */}
            {/* D. WEEKLY SCHEMES                                             */}
            {/* ============================================================ */}

            <section className="border-t border-slate-200 pt-8">

              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                <div>
                  <SectionHeading>
                    D. Weekly Schemes of Work
                  </SectionHeading>

                  <p className="mt-2 text-sm text-slate-500">
                    Enter the lesson details for each teaching week.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addWeek}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-100"
                >
                  <Plus size={17} />
                  Add Week
                </button>

              </div>

              <div className="space-y-6">

                {entries.map((entry, index) => (
                  <section
                    key={entry.weekNumber}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60"
                  >

                    {/* WEEK HEADER */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-brand-green">
                          <CalendarDays size={20} />
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                            Teaching Schedule
                          </p>

                          <h3 className="text-lg font-extrabold text-slate-900">
                            Week {entry.weekNumber}
                          </h3>
                        </div>

                      </div>

                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWeek(index)}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      )}

                    </div>

                    <div className="space-y-5 p-5">

                      {/* WEEK AND LESSON TITLE */}
                      <div className="grid gap-5 md:grid-cols-2">

                        <InputField
                          label="Week"
                          value={`Week ${entry.weekNumber}`}
                          onChange={() => {}}
                          readOnly
                        />

                        <InputField
                          label="Lesson Title"
                          value={entry.lessonTitle}
                          onChange={(value) =>
                            updateEntry(
                              index,
                              'lessonTitle',
                              value,
                            )
                          }
                          placeholder="Enter lesson title"
                          required
                        />

                      </div>

                      {/* OBJECTIVES */}
                      <TextAreaField
                        label="Objectives"
                        value={entry.objectives}
                        onChange={(value) =>
                          updateEntry(index, 'objectives', value)
                        }
                        placeholder="What should learners be able to know or do by the end of this lesson?"
                        rows={4}
                        required
                      />

                      {/* KEY POINTS */}
                      <TextAreaField
                        label="Key Points"
                        value={entry.keyPoints}
                        onChange={(value) =>
                          updateEntry(index, 'keyPoints', value)
                        }
                        placeholder="Enter the main concepts, knowledge and content to be covered."
                        rows={5}
                        required
                      />

                      {/* APPLICATION / ACTIVITIES */}
                      <TextAreaField
                        label="Application / Activities"
                        value={entry.applicationActivities}
                        onChange={(value) =>
                          updateEntry(
                            index,
                            'applicationActivities',
                            value,
                          )
                        }
                        placeholder="Describe teaching methods, demonstrations, practical activities, learner participation and application."
                        rows={5}
                        required
                      />

                      {/* REFERENCES AND AIDS */}
                      <TextAreaField
                        label="Ref. & Aids"
                        value={entry.referencesAids}
                        onChange={(value) =>
                          updateEntry(
                            index,
                            'referencesAids',
                            value,
                          )
                        }
                        placeholder="Textbooks, manuals, equipment, teaching aids, practical materials and other references."
                        rows={4}
                        required
                      />

                      {/* REMARK AND DATE TAUGHT */}
                      <div className="grid gap-5 border-t border-slate-200 pt-5 md:grid-cols-2">

                        <TextAreaField
                          label="Remark"
                          value={entry.remarks}
                          onChange={(value) =>
                            updateEntry(index, 'remarks', value)
                          }
                          placeholder="Record progress, challenges, completion or other observations."
                          rows={3}
                        />

                        <InputField
                          label="Date Taught"
                          value={entry.dateTaught}
                          onChange={(value) =>
                            updateEntry(index, 'dateTaught', value)
                          }
                          type="date"
                        />

                      </div>

                    </div>
                  </section>
                ))}

              </div>

            </section>

            {/* ============================================================ */}
            {/* E. STATUS                                                     */}
            {/* ============================================================ */}

            <section className="mt-8 border-t border-slate-200 pt-6">

              <SectionHeading>
                E. Publication Status
              </SectionHeading>

              <label className="block max-w-md">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Scheme Status
                </span>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>

            </section>

            {/* ============================================================ */}
            {/* FORM ACTIONS                                                  */}
            {/* ============================================================ */}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">

              <Link
                href="/lecturer/dashboard/schemes"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Saving Scheme...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Scheme of Work
                  </>
                )}
              </button>

            </div>

          </form>
        )}

      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* REUSABLE SECTION HEADING                                                   */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-5 border-l-4 border-brand-green pl-3 text-base font-extrabold text-slate-900">
      {children}
    </h2>
  );
}

function Required() {
  return <span className="ml-1 text-red-600">*</span>;
}
