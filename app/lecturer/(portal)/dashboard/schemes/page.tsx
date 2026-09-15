'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  BookOpenCheck,
  Eye,
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

type Scheme = {
  id: number;
  programId: number;
  unitId: number;
  academicYear: string;
  term: string;
  title: string;
  status: string;
  entryCount: number;
  programName: string;
  unitCode: string | null;
  unitName: string;
};

type SchemeEntry = {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  topic: string;
  subtopic: string;
  learningOutcomes: string;
  activities: string;
  resources: string;
  assessment: string;
  remarks: string;
};

const TERMS = [
  'Term 1',
  'Term 2',
  'Term 3',
  'Semester 1',
  'Semester 2',
];

function createEntry(
  weekNumber: number,
): SchemeEntry {
  return {
    id: 0,
    weekNumber,
    startDate: '',
    endDate: '',
    topic: '',
    subtopic: '',
    learningOutcomes: '',
    activities: '',
    resources: '',
    assessment: '',
    remarks: '',
  };
}

export default function LecturerSchemesPage() {
  const [programs, setPrograms] = useState<Program[]>(
    [],
  );

  const [schemes, setSchemes] = useState<Scheme[]>(
    [],
  );

  const [programId, setProgramId] =
    useState('');

  const [unitId, setUnitId] =
    useState('');

  const [academicYear, setAcademicYear] =
    useState(
      String(new Date().getFullYear()),
    );

  const [term, setTerm] =
    useState('Term 1');

  const [title, setTitle] =
    useState('');

  const [status, setStatus] =
    useState('draft');

  const [entries, setEntries] =
    useState<SchemeEntry[]>([
      createEntry(1),
    ]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const selectedProgram =
    programs.find(
      (program) =>
        String(program.id) ===
        programId,
    );

  const units =
    selectedProgram?.units ?? [];

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [
        optionsResponse,
        schemesResponse,
      ] = await Promise.all([
        fetch(
          '/api/lecturer/planning/options',
          {
            credentials: 'include',
            cache: 'no-store',
          },
        ),

        fetch(
          '/api/lecturer/schemes',
          {
            credentials: 'include',
            cache: 'no-store',
          },
        ),
      ]);

      const options =
        await optionsResponse.json();

      const schemesData =
        await schemesResponse.json();

      if (
        !optionsResponse.ok ||
        !options.success
      ) {
        throw new Error(
          options.message ||
            'Unable to load lecturer programmes.',
        );
      }

      if (
        !schemesResponse.ok ||
        !schemesData.success
      ) {
        throw new Error(
          schemesData.message ||
            'Unable to load schemes of work.',
        );
      }

      setPrograms(
        Array.isArray(
          options.programs,
        )
          ? options.programs
          : [],
      );

      setSchemes(
        Array.isArray(
          schemesData.schemes,
        )
          ? schemesData.schemes
          : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load schemes of work.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateEntry(
    index: number,
    field: keyof SchemeEntry,
    value: string,
  ) {
    setEntries(
      (current) =>
        current.map(
          (entry, entryIndex) =>
            entryIndex === index
              ? {
                  ...entry,
                  [field]:
                    value,
                }
              : entry,
        ),
    );
  }

  function addWeek() {
    setEntries(
      (current) => [
        ...current,
        createEntry(
          current.length + 1,
        ),
      ],
    );
  }

  function removeWeek(
    index: number,
  ) {
    setEntries(
      (current) =>
        current
          .filter(
            (
              _,
              entryIndex,
            ) =>
              entryIndex !==
              index,
          )
          .map(
            (
              entry,
              entryIndex,
            ) => ({
              ...entry,
              weekNumber:
                entryIndex + 1,
            }),
          ),
    );
  }

  function resetForm() {
    setProgramId('');
    setUnitId('');
    setAcademicYear(
      String(
        new Date().getFullYear(),
      ),
    );
    setTerm('Term 1');
    setTitle('');
    setStatus('draft');
    setEntries([
      createEntry(1),
    ]);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!programId) {
        throw new Error(
          'Please select a programme.',
        );
      }

      if (!unitId) {
        throw new Error(
          'Please select a unit.',
        );
      }

      if (!academicYear.trim()) {
        throw new Error(
          'Academic year is required.',
        );
      }

      if (!title.trim()) {
        throw new Error(
          'Scheme title is required.',
        );
      }

      const validEntries =
        entries.filter(
          (entry) =>
            entry.topic.trim(),
        );

      if (
        validEntries.length === 0
      ) {
        throw new Error(
          'Add at least one scheme week with a topic.',
        );
      }

      const response =
        await fetch(
          '/api/lecturer/schemes',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              programId:
                Number(programId),
              unitId:
                Number(unitId),
              academicYear:
                academicYear.trim(),
              term,
              title:
                title.trim(),
              status,
              entries:
                validEntries.map(
                  (entry) => ({
                    weekNumber:
                      entry.weekNumber,
                    startDate:
                      entry.startDate,
                    endDate:
                      entry.endDate,
                    topic:
                      entry.topic.trim(),
                    subtopic:
                      entry.subtopic.trim(),
                    learningOutcomes:
                      entry.learningOutcomes.trim(),
                    activities:
                      entry.activities.trim(),
                    resources:
                      entry.resources.trim(),
                    assessment:
                      entry.assessment.trim(),
                    remarks:
                      entry.remarks.trim(),
                  }),
                ),
            }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Unable to create scheme of work.',
        );
      }

      setMessage(
        result.message ||
          'Scheme of work created successfully.',
      );

      resetForm();

      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create scheme of work.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteScheme(
    schemeId: number,
  ) {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this scheme of work?',
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setMessage('');

      const response =
        await fetch(
          `/api/lecturer/schemes/${schemeId}`,
          {
            method: 'DELETE',
            credentials: 'include',
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Unable to delete scheme.',
        );
      }

      setMessage(
        result.message ||
          'Scheme deleted successfully.',
      );

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete scheme.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/lecturer/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
          >
            <ArrowLeft size={16} />
            Lecturer Dashboard
          </Link>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-brand-green">
                  <BookOpenCheck
                    size={25}
                  />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
                    Academic Planning
                  </p>

                  <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
                    Schemes of Work
                  </h1>
                </div>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Create a structured teaching plan for
                each unit, including weekly topics,
                learning outcomes, activities, resources
                and assessment.
              </p>
            </div>
          </div>
        </div>

        {/* SUCCESS */}
        {message && (
          <div
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
            role="status"
          >
            {message}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* CREATE FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="mb-7">
            <h2 className="text-lg font-extrabold text-slate-900">
              Create Scheme of Work
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select one of your assigned programmes
              and units.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* PROGRAMME */}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Programme
                <span className="ml-1 text-red-600">
                  *
                </span>
              </span>

              <select
                value={programId}
                onChange={(
                  event,
                ) => {
                  setProgramId(
                    event.target.value,
                  );

                  setUnitId('');
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                required
              >
                <option value="">
                  Select programme
                </option>

                {programs.map(
                  (program) => (
                    <option
                      key={
                        program.id
                      }
                      value={
                        program.id
                      }
                    >
                      {
                        program.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* UNIT */}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Unit
                <span className="ml-1 text-red-600">
                  *
                </span>
              </span>

              <select
                value={unitId}
                onChange={(
                  event,
                ) =>
                  setUnitId(
                    event.target.value,
                  )
                }
                disabled={
                  !programId
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-green-600 focus:ring-2 focus:ring-green-100"
                required
              >
                <option value="">
                  Select unit
                </option>

                {units.map(
                  (unit) => (
                    <option
                      key={unit.id}
                      value={unit.id}
                    >
                      {unit.code
                        ? `${unit.code} — `
                        : ''}
                      {
                        unit.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* YEAR */}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Academic Year
                <span className="ml-1 text-red-600">
                  *
                </span>
              </span>

              <input
                value={
                  academicYear
                }
                onChange={(
                  event,
                ) =>
                  setAcademicYear(
                    event.target
                      .value,
                  )
                }
                placeholder="e.g. 2026"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                required
              />
            </label>

            {/* TERM */}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Term / Semester
              </span>

              <select
                value={term}
                onChange={(
                  event,
                ) =>
                  setTerm(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                {TERMS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </label>

            {/* TITLE */}
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Scheme Title
                <span className="ml-1 text-red-600">
                  *
                </span>
              </span>

              <input
                value={title}
                onChange={(
                  event,
                ) =>
                  setTitle(
                    event.target
                      .value,
                  )
                }
                placeholder="e.g. Anatomy and Physiology — Term 1 Scheme of Work"
                maxLength={255}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                required
              />
            </label>

            {/* STATUS */}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Status
              </span>

              <select
                value={status}
                onChange={(
                  event,
                ) =>
                  setStatus(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="draft">
                  Draft
                </option>

                <option value="published">
                  Published
                </option>
              </select>
            </label>
          </div>

          {/* WEEKS */}
          <div className="mt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Weekly Teaching Plan
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add one entry for each teaching
                  week.
                </p>
              </div>

              <button
                type="button"
                onClick={addWeek}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 transition hover:bg-green-100"
              >
                <Plus size={17} />
                Add Week
              </button>
            </div>

            <div className="space-y-6">
              {entries.map(
                (
                  entry,
                  index,
                ) => (
                  <section
                    key={`${entry.weekNumber}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                          Teaching Plan
                        </p>

                        <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                          Week{' '}
                          {
                            entry.weekNumber
                          }
                        </h3>
                      </div>

                      {entries.length >
                        1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeWeek(
                              index,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2
                            size={16}
                          />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">
                          Start Date
                        </span>

                        <input
                          type="date"
                          value={
                            entry.startDate
                          }
                          onChange={(
                            event,
                          ) =>
                            updateEntry(
                              index,
                              'startDate',
                              event
                                .target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">
                          End Date
                        </span>

                        <input
                          type="date"
                          value={
                            entry.endDate
                          }
                          onChange={(
                            event,
                          ) =>
                            updateEntry(
                              index,
                              'endDate',
                              event
                                .target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">
                          Topic
                          <span className="ml-1 text-red-600">
                            *
                          </span>
                        </span>

                        <input
                          value={
                            entry.topic
                          }
                          onChange={(
                            event,
                          ) =>
                            updateEntry(
                              index,
                              'topic',
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Main topic"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">
                          Sub-topic
                        </span>

                        <input
                          value={
                            entry.subtopic
                          }
                          onChange={(
                            event,
                          ) =>
                            updateEntry(
                              index,
                              'subtopic',
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Sub-topic"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        />
                      </label>

                      <TextAreaField
                        label="Learning Outcomes"
                        value={
                          entry.learningOutcomes
                        }
                        onChange={(
                          value,
                        ) =>
                          updateEntry(
                            index,
                            'learningOutcomes',
                            value,
                          )
                        }
                      />

                      <TextAreaField
                        label="Activities"
                        value={
                          entry.activities
                        }
                        onChange={(
                          value,
                        ) =>
                          updateEntry(
                            index,
                            'activities',
                            value,
                          )
                        }
                      />

                      <TextAreaField
                        label="Resources"
                        value={
                          entry.resources
                        }
                        onChange={(
                          value,
                        ) =>
                          updateEntry(
                            index,
                            'resources',
                            value,
                          )
                        }
                      />

                      <TextAreaField
                        label="Assessment"
                        value={
                          entry.assessment
                        }
                        onChange={(
                          value,
                        ) =>
                          updateEntry(
                            index,
                            'assessment',
                            value,
                          )
                        }
                      />

                      <div className="md:col-span-2">
                        <TextAreaField
                          label="Remarks"
                          value={
                            entry.remarks
                          }
                          onChange={(
                            value,
                          ) =>
                            updateEntry(
                              index,
                              'remarks',
                              value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </section>
                ),
              )}
            </div>
          </div>

          {/* SUBMIT */}
          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
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
                  Saving...
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

        {/* EXISTING SCHEMES */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-900">
              My Schemes of Work
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Schemes already created by you.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading schemes...
              </div>
            </div>
          ) : schemes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                You have not created any schemes of
                work yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {schemes.map(
                (scheme) => (
                  <article
                    key={
                      scheme.id
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900">
                          {
                            scheme.title
                          }
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            scheme.programName
                          }
                        </p>

                        <p className="text-sm text-slate-500">
                          {scheme.unitCode
                            ? `${scheme.unitCode} — `
                            : ''}
                          {
                            scheme.unitName
                          }
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase ${
                          scheme.status ===
                          'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {
                          scheme.status
                        }
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <InfoItem
                        label="Year"
                        value={
                          scheme.academicYear
                        }
                      />

                      <InfoItem
                        label="Term"
                        value={
                          scheme.term
                        }
                      />

                      <InfoItem
                        label="Weeks"
                        value={String(
                          scheme.entryCount,
                        )}
                      />
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/lecturer/dashboard/schemes/${scheme.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-green-800"
                      >
                        <Eye
                          size={16}
                        />
                        View / Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          void deleteScheme(
                            scheme.id,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2
                          size={16}
                        />
                        Delete
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
};

function TextAreaField({
  label,
  value,
  onChange,
}: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        rows={4}
        placeholder={label}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
};

function InfoItem({
  label,
  value,
}: InfoItemProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}