'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  Loader2,
  Save,
} from 'lucide-react';

type SchemeEntry = {
  id: number;
  schemeId: number;
  weekNumber: number;
  topic: string;
  subtopic: string;
  schemeTitle: string;
  academicYear: string;
  term: string;
  programId: number;
  unitId: number;
};

type Program = {
  id: number;
  name: string;
  units: Unit[];
};

type Unit = {
  id: number;
  code: string | null;
  name: string;
};

type LessonPlan = {
  id: number;

  programId: number;
  unitId: number;

  schemeEntryId: number | null;
  topicId: number | null;

  lessonDate: string;
  durationMinutes: number | null;

  topic: string;
  subtopic: string;

  generalObjective: string;
  specificObjectives: string;
  priorKnowledge: string;
  resources: string;

  introduction: string;
  teacherActivities: string;
  learnerActivities: string;

  assessment: string;
  conclusion: string;
  assignment: string;
  remarks: string;

  status: 'draft' | 'completed';

  programName: string;
  unitCode: string | null;
  unitName: string;

  schemeId: number | null;
  schemeTitle: string | null;
  weekNumber: number | null;
  schemeWeekTopic: string | null;

  academicYear: string | null;
  term: string | null;

  topicTitle: string | null;
};

type LessonPlanForm = {
  programId: string;
  unitId: string;
  schemeEntryId: string;
  lessonDate: string;
  durationMinutes: string;

  topic: string;
  subtopic: string;

  generalObjective: string;
  specificObjectives: string;
  priorKnowledge: string;
  resources: string;

  introduction: string;
  teacherActivities: string;
  learnerActivities: string;

  assessment: string;
  conclusion: string;
  assignment: string;
  remarks: string;

  status: 'draft' | 'completed';
};

const initialForm: LessonPlanForm = {
  programId: '',
  unitId: '',
  schemeEntryId: '',
  lessonDate: '',
  durationMinutes: '60',

  topic: '',
  subtopic: '',

  generalObjective: '',
  specificObjectives: '',
  priorKnowledge: '',
  resources: '',

  introduction: '',
  teacherActivities: '',
  learnerActivities: '',

  assessment: '',
  conclusion: '',
  assignment: '',
  remarks: '',

  status: 'draft',
};

export default function LessonPlanDetailPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const [form, setForm] =
    useState<LessonPlanForm>(
      initialForm,
    );

  const [programs, setPrograms] =
    useState<Program[]>([]);

  const [schemeEntries, setSchemeEntries] =
    useState<SchemeEntry[]>([]);

  const [lessonPlan, setLessonPlan] =
    useState<LessonPlan | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [
        planResponse,
        optionsResponse,
      ] = await Promise.all([
        fetch(
          `/api/lecturer/lesson-plans/${params.id}`,
          {
            credentials: 'include',
            cache: 'no-store',
          },
        ),
        fetch(
          '/api/lecturer/planning/options',
          {
            credentials: 'include',
            cache: 'no-store',
          },
        ),
      ]);

      const planResult =
        await planResponse.json();

      const optionsResult =
        await optionsResponse.json();

      if (
        !planResponse.ok ||
        !planResult.success
      ) {
        throw new Error(
          planResult.message ||
            'Unable to load lesson plan.',
        );
      }

      if (
        !optionsResponse.ok ||
        !optionsResult.success
      ) {
        throw new Error(
          optionsResult.message ||
            'Unable to load planning options.',
        );
      }

      const loadedPlan =
        planResult.lessonPlan as LessonPlan;

      setLessonPlan(
        loadedPlan,
      );

      setPrograms(
        Array.isArray(
          optionsResult.programs,
        )
          ? optionsResult.programs
          : [],
      );

      setSchemeEntries(
        Array.isArray(
          optionsResult.schemeEntries,
        )
          ? optionsResult.schemeEntries
          : [],
      );

      setForm({
        programId:
          String(
            loadedPlan.programId,
          ),

        unitId:
          String(
            loadedPlan.unitId,
          ),

        schemeEntryId:
          loadedPlan.schemeEntryId
            ? String(
                loadedPlan.schemeEntryId,
              )
            : '',

        lessonDate:
          loadedPlan.lessonDate ||
          '',

        durationMinutes:
          loadedPlan.durationMinutes
            ? String(
                loadedPlan.durationMinutes,
              )
            : '',

        topic:
          loadedPlan.topic ||
          '',

        subtopic:
          loadedPlan.subtopic ||
          '',

        generalObjective:
          loadedPlan.generalObjective ||
          '',

        specificObjectives:
          loadedPlan.specificObjectives ||
          '',

        priorKnowledge:
          loadedPlan.priorKnowledge ||
          '',

        resources:
          loadedPlan.resources ||
          '',

        introduction:
          loadedPlan.introduction ||
          '',

        teacherActivities:
          loadedPlan.teacherActivities ||
          '',

        learnerActivities:
          loadedPlan.learnerActivities ||
          '',

        assessment:
          loadedPlan.assessment ||
          '',

        conclusion:
          loadedPlan.conclusion ||
          '',

        assignment:
          loadedPlan.assignment ||
          '',

        remarks:
          loadedPlan.remarks ||
          '',

        status:
          loadedPlan.status,
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load lesson plan.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [params.id]);

  const selectedProgram =
    useMemo(
      () =>
        programs.find(
          (program) =>
            String(program.id) ===
            form.programId,
        ),
      [
        programs,
        form.programId,
      ],
    );

  const selectedSchemeEntry =
    useMemo(
      () =>
        schemeEntries.find(
          (entry) =>
            String(entry.id) ===
              form.schemeEntryId &&
            entry.programId ===
              Number(form.programId) &&
            entry.unitId ===
              Number(form.unitId),
        ),
      [
        schemeEntries,
        form.schemeEntryId,
        form.programId,
        form.unitId,
      ],
    );

  const availableSchemeEntries =
    useMemo(() => {
      if (!form.programId) {
        return [];
      }

      return schemeEntries.filter(
        (entry) => {
          if (
            entry.programId !==
            Number(form.programId)
          ) {
            return false;
          }

          if (
            form.unitId &&
            entry.unitId !==
              Number(form.unitId)
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      schemeEntries,
      form.programId,
      form.unitId,
    ]);

  function updateField<
    K extends keyof LessonPlanForm,
  >(
    field: K,
    value: LessonPlanForm[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }

  function handleProgramChange(
    value: string,
  ) {
    const nextProgram =
      programs.find(
        (program) =>
          String(program.id) ===
          value,
      );

    setForm(
      (current) => ({
        ...current,
        programId: value,
        unitId: '',
        schemeEntryId: '',
        topic: '',
        subtopic:
          '',
      }),
    );

    if (!nextProgram) {
      return;
    }
  }

  function handleUnitChange(
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        unitId: value,
        schemeEntryId: '',
      }),
    );
  }

  function handleSchemeEntryChange(
    value: string,
  ) {
    if (!value) {
      setForm(
        (current) => ({
          ...current,
          schemeEntryId: '',
        }),
      );

      return;
    }

    const entry =
      schemeEntries.find(
        (item) =>
          String(item.id) ===
          value,
      );

    if (!entry) {
      return;
    }

    setForm(
      (current) => ({
        ...current,

        programId:
          String(
            entry.programId,
          ),

        unitId:
          String(
            entry.unitId,
          ),

        schemeEntryId:
          String(
            entry.id,
          ),

        topic:
          entry.topic ||
          current.topic,

        subtopic:
          entry.subtopic ||
          current.subtopic,
      }),
    );
  }

  async function handleSave(
    event: FormEvent,
  ) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (
        !form.programId ||
        !form.unitId
      ) {
        throw new Error(
          'Programme and unit are required.',
        );
      }

      if (
        !form.topic.trim()
      ) {
        throw new Error(
          'Lesson topic is required.',
        );
      }

      const response =
        await fetch(
          `/api/lecturer/lesson-plans/${params.id}`,
          {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              programId:
                Number(
                  form.programId,
                ),

              unitId:
                Number(
                  form.unitId,
                ),

              schemeEntryId:
                form.schemeEntryId
                  ? Number(
                      form.schemeEntryId,
                    )
                  : null,

              lessonDate:
                form.lessonDate,

              durationMinutes:
                form.durationMinutes
                  ? Number(
                      form.durationMinutes,
                    )
                  : null,

              topic:
                form.topic.trim(),

              subtopic:
                form.subtopic.trim(),

              generalObjective:
                form.generalObjective.trim(),

              specificObjectives:
                form.specificObjectives.trim(),

              priorKnowledge:
                form.priorKnowledge.trim(),

              resources:
                form.resources.trim(),

              introduction:
                form.introduction.trim(),

              teacherActivities:
                form.teacherActivities.trim(),

              learnerActivities:
                form.learnerActivities.trim(),

              assessment:
                form.assessment.trim(),

              conclusion:
                form.conclusion.trim(),

              assignment:
                form.assignment.trim(),

              remarks:
                form.remarks.trim(),

              status:
                form.status,
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
            'Unable to save lesson plan.',
        );
      }

      setMessage(
        result.message ||
          'Lesson plan updated successfully.',
      );

      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save lesson plan.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-5xl items-center justify-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2
              size={20}
              className="animate-spin"
            />
            Loading lesson plan...
          </div>
        </div>
      </main>
    );
  }

  if (!lessonPlan) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
            {error ||
              'Lesson plan not found.'}
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
            href="/lecturer/dashboard/lesson-plans"
            className="inline-flex items-center gap-2 text-sm font-bold text-green-700 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Lesson Plans
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
          className="space-y-6"
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Lesson Plan
              </p>

              <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
                Edit Lesson Plan #{lessonPlan.id}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Update the teaching plan, lesson procedure,
                assessment and follow-up work.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Programme
                </span>

                <select
                  value={form.programId}
                  onChange={(event) =>
                    handleProgramChange(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
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
                        {program.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Unit
                </span>

                <select
                  value={form.unitId}
                  onChange={(event) =>
                    handleUnitChange(
                      event.target.value,
                    )
                  }
                  disabled={
                    !selectedProgram
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm disabled:bg-slate-100"
                >
                  <option value="">
                    Select unit
                  </option>

                  {selectedProgram?.units.map(
                    (unit) => (
                      <option
                        key={unit.id}
                        value={unit.id}
                      >
                        {unit.code
                          ? `${unit.code} — ${unit.name}`
                          : unit.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Scheme Week
                </span>

                <select
                  value={
                    form.schemeEntryId
                  }
                  onChange={(event) =>
                    handleSchemeEntryChange(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="">
                    No scheme week selected
                  </option>

                  {availableSchemeEntries.map(
                    (entry) => (
                      <option
                        key={entry.id}
                        value={entry.id}
                      >
                        Week{' '}
                        {
                          entry.weekNumber
                        }{' '}
                        —{' '}
                        {entry.topic}
                        {' — '}
                        {
                          entry.schemeTitle
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              {selectedSchemeEntry && (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4 md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                    Linked Scheme Week
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-green-900">
                    Week{' '}
                    {
                      selectedSchemeEntry.weekNumber
                    }
                    {' — '}
                    {
                      selectedSchemeEntry.topic
                    }
                  </p>

                  {selectedSchemeEntry.subtopic && (
                    <p className="mt-1 text-sm text-green-800">
                      {
                        selectedSchemeEntry.subtopic
                      }
                    </p>
                  )}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Lesson Date
                </span>

                <input
                  type="date"
                  value={
                    form.lessonDate
                  }
                  onChange={(event) =>
                    updateField(
                      'lessonDate',
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Duration (minutes)
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    form.durationMinutes
                  }
                  onChange={(event) =>
                    updateField(
                      'durationMinutes',
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Topic
                </span>

                <input
                  value={form.topic}
                  onChange={(event) =>
                    updateField(
                      'topic',
                      event.target
                        .value,
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Sub-topic
                </span>

                <input
                  value={
                    form.subtopic
                  }
                  onChange={(event) =>
                    updateField(
                      'subtopic',
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />
              </label>

              <div className="md:col-span-2">
                <TextArea
                  label="General Objective"
                  value={
                    form.generalObjective
                  }
                  onChange={(value) =>
                    updateField(
                      'generalObjective',
                      value,
                    )
                  }
                />
              </div>

              <TextArea
                label="Specific Objectives"
                value={
                  form.specificObjectives
                }
                onChange={(value) =>
                  updateField(
                    'specificObjectives',
                    value,
                  )
                }
              />

              <TextArea
                label="Prior Knowledge"
                value={
                  form.priorKnowledge
                }
                onChange={(value) =>
                  updateField(
                    'priorKnowledge',
                    value,
                  )
                }
              />

              <div className="md:col-span-2">
                <TextArea
                  label="Resources"
                  value={
                    form.resources
                  }
                  onChange={(value) =>
                    updateField(
                      'resources',
                      value,
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
                Lesson Procedure
              </p>

              <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                Classroom Activities
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <TextArea
                label="Introduction"
                value={
                  form.introduction
                }
                onChange={(value) =>
                  updateField(
                    'introduction',
                    value,
                  )
                }
              />

              <TextArea
                label="Teacher Activities"
                value={
                  form.teacherActivities
                }
                onChange={(value) =>
                  updateField(
                    'teacherActivities',
                    value,
                  )
                }
              />

              <TextArea
                label="Learner Activities"
                value={
                  form.learnerActivities
                }
                onChange={(value) =>
                  updateField(
                    'learnerActivities',
                    value,
                  )
                }
              />

              <TextArea
                label="Assessment"
                value={
                  form.assessment
                }
                onChange={(value) =>
                  updateField(
                    'assessment',
                    value,
                  )
                }
              />

              <TextArea
                label="Conclusion"
                value={
                  form.conclusion
                }
                onChange={(value) =>
                  updateField(
                    'conclusion',
                    value,
                  )
                }
              />

              <TextArea
                label="Assignment"
                value={
                  form.assignment
                }
                onChange={(value) =>
                  updateField(
                    'assignment',
                    value,
                  )
                }
              />

              <div className="md:col-span-2">
                <TextArea
                  label="Remarks"
                  value={
                    form.remarks
                  }
                  onChange={(value) =>
                    updateField(
                      'remarks',
                      value,
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      'status',
                      event.target
                        .value as
                        | 'draft'
                        | 'completed',
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="draft">
                    Draft
                  </option>

                  <option value="completed">
                    Completed
                  </option>
                </select>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          </section>
        </form>
      </div>
    </main>
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
        rows={5}
        placeholder={label}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}