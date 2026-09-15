'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

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

type Scheme = {
  id: number;
  programId: number;
  unitId: number;
  academicYear: string;
  term: string;
  title: string;
  status: string;
  programName: string;
  unitCode: string | null;
  unitName: string;
  entries: SchemeEntry[];
};

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

export default function SchemeDetailPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const [scheme, setScheme] =
    useState<Scheme | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [entries, setEntries] =
    useState<SchemeEntry[]>([]);

  async function loadScheme() {
    try {
      setLoading(true);
      setError('');

      const response =
        await fetch(
          `/api/lecturer/schemes/${params.id}`,
          {
            credentials: 'include',
            cache: 'no-store',
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
            'Unable to load scheme.',
        );
      }

      setScheme(result.scheme);
      setEntries(
        Array.isArray(
          result.scheme.entries,
        )
          ? result.scheme.entries
          : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load scheme.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScheme();
  }, [params.id]);

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
                    field ===
                    'weekNumber'
                      ? Number(value)
                      : value,
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

  async function handleSave(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!scheme) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!scheme.title.trim()) {
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
          'At least one week with a topic is required.',
        );
      }

      const response =
        await fetch(
          `/api/lecturer/schemes/${scheme.id}`,
          {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              title:
                scheme.title.trim(),
              academicYear:
                scheme.academicYear.trim(),
              term:
                scheme.term.trim(),
              status:
                scheme.status,
              entries:
                validEntries,
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
            'Unable to update scheme.',
        );
      }

      setMessage(
        result.message ||
          'Scheme updated successfully.',
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2
              size={20}
              className="animate-spin"
            />
            Loading scheme...
          </div>
        </div>
      </main>
    );
  }

  if (!scheme) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error ||
              'Scheme not found.'}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link
            href="/lecturer/dashboard/schemes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Schemes
          </Link>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          {/* HEADER */}
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
              Scheme of Work
            </p>

            <input
              value={scheme.title}
              onChange={(event) =>
                setScheme(
                  (current) =>
                    current
                      ? {
                          ...current,
                          title:
                            event.target
                              .value,
                        }
                      : current,
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl font-extrabold text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Info label="Programme" value={scheme.programName} />
              <Info label="Unit" value={`${scheme.unitCode ? `${scheme.unitCode} — ` : ''}${scheme.unitName}`} />
              <Info label="Academic Year" value={scheme.academicYear} />
              <Info label="Term" value={scheme.term} />
            </div>

            <div className="mt-5 max-w-xs">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Status
                </span>

                <select
                  value={scheme.status}
                  onChange={(event) =>
                    setScheme(
                      (current) =>
                        current
                          ? {
                              ...current,
                              status:
                                event
                                  .target
                                  .value,
                            }
                          : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
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
          </div>

          {/* ENTRIES */}
          <div className="space-y-6">
            {entries.map(
              (entry, index) => (
                <section
                  key={
                    entry.id ||
                    `new-${index}`
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                        Teaching Week
                      </p>

                      <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                        Week{' '}
                        {
                          entry.weekNumber
                        }
                      </h2>
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
                    <input
                      type="date"
                      value={
                        entry.startDate
                      }
                      onChange={(event) =>
                        updateEntry(
                          index,
                          'startDate',
                          event.target
                            .value,
                        )
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />

                    <input
                      type="date"
                      value={
                        entry.endDate
                      }
                      onChange={(event) =>
                        updateEntry(
                          index,
                          'endDate',
                          event.target
                            .value,
                        )
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />

                    <input
                      value={
                        entry.topic
                      }
                      onChange={(event) =>
                        updateEntry(
                          index,
                          'topic',
                          event.target
                            .value,
                        )
                      }
                      placeholder="Topic"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                      required
                    />

                    <input
                      value={
                        entry.subtopic
                      }
                      onChange={(event) =>
                        updateEntry(
                          index,
                          'subtopic',
                          event.target
                            .value,
                        )
                      }
                      placeholder="Sub-topic"
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />

                    <TextArea
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

                    <TextArea
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

                    <TextArea
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

                    <TextArea
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
                      <TextArea
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

          <div className="mt-6">
            <button
              type="button"
              onClick={addWeek}
              className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700"
            >
              <Plus size={17} />
              Add Week
            </button>
          </div>

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
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

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
};

function TextArea({
  label,
  value,
  onChange,
}: TextAreaProps) {
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
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
      />
    </label>
  );
}