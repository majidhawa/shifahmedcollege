'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  CalendarDays,
  Eye,
  FilePenLine,
  Loader2,
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
  id: number;
  schemeId: number;
  weekNumber: number;
  topic: string;
  subtopic: string | null;
  schemeTitle: string;
  academicYear: string;
  term: string;
  programId: number;
  unitId: number;
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

  status: string;

  programName: string;
  unitCode: string | null;
  unitName: string;

  schemeTitle: string | null;
  weekNumber: number | null;
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

  status: string;
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

export default function LecturerLessonPlansPage() {
  const [programs, setPrograms] =
    useState<Program[]>([]);

  const [schemeEntries, setSchemeEntries] =
    useState<SchemeEntry[]>([]);

  const [lessonPlans, setLessonPlans] =
    useState<LessonPlan[]>([]);

  const [form, setForm] =
    useState<LessonPlanForm>(
      initialForm,
    );

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
        form.programId,
    );

  const selectedSchemeEntry =
    schemeEntries.find(
      (entry) =>
        String(entry.id) ===
        form.schemeEntryId &&
        entry.programId ===
          Number(form.programId) &&
        entry.unitId ===
          Number(form.unitId),
    );

  const availableSchemeEntries =
    schemeEntries.filter(
      (entry) => {
        if (
          form.programId &&
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

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [
        optionsResponse,
        lessonPlansResponse,
      ] = await Promise.all([
        fetch(
          '/api/lecturer/planning/options',
          {
            credentials: 'include',
            cache: 'no-store',
          },
        ),

        fetch(
          '/api/lecturer/lesson-plans',
          {
            credentials: 'include',
            cache: 'no-store',
          },
        ),
      ]);

      const options =
        await optionsResponse.json();

      const plans =
        await lessonPlansResponse.json();

      if (
        !optionsResponse.ok ||
        !options.success
      ) {
        throw new Error(
          options.message ||
            'Unable to load planning options.',
        );
      }

      if (
        !lessonPlansResponse.ok ||
        !plans.success
      ) {
        throw new Error(
          plans.message ||
            'Unable to load lesson plans.',
        );
      }

      setPrograms(
        Array.isArray(
          options.programs,
        )
          ? options.programs
          : [],
      );

      setSchemeEntries(
        Array.isArray(
          options.schemeEntries,
        )
          ? options.schemeEntries
          : [],
      );

      setLessonPlans(
        Array.isArray(
          plans.lessonPlans,
        )
          ? plans.lessonPlans
          : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load lesson plans.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateField(
    field: keyof LessonPlanForm,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }

  function resetForm() {
    setForm({
      ...initialForm,
    });
  }

  function handleProgramChange(
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        programId: value,
        unitId: '',
        schemeEntryId: '',
        topic: '',
        subtopic: '',
      }),
    );
  }

  function handleUnitChange(
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        unitId: value,
        schemeEntryId: '',
        topic: '',
        subtopic: '',
      }),
    );
  }

  function handleSchemeEntryChange(
    value: string,
  ) {
    if (!value) {
      updateField(
        'schemeEntryId',
        '',
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

        schemeEntryId:
          String(entry.id),

        programId:
          String(
            entry.programId,
          ),

        unitId:
          String(
            entry.unitId,
          ),

        topic:
          entry.topic,

        subtopic:
          entry.subtopic ??
          '',
      }),
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!form.programId) {
        throw new Error(
          'Please select a programme.',
        );
      }

      if (!form.unitId) {
        throw new Error(
          'Please select a unit.',
        );
      }

      if (!form.topic.trim()) {
        throw new Error(
          'Lesson topic is required.',
        );
      }

      const response =
        await fetch(
          '/api/lecturer/lesson-plans',
          {
            method: 'POST',
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
            'Unable to create lesson plan.',
        );
      }

      setMessage(
        result.message ||
          'Lesson plan created successfully.',
      );

      resetForm();

      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create lesson plan.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteLessonPlan(
    lessonPlanId: number,
  ) {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this lesson plan?',
      );

    if (!confirmed) {
      return;
    }

    try {
      setError('');
      setMessage('');

      const response =
        await fetch(
          `/api/lecturer/lesson-plans/${lessonPlanId}`,
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
            'Unable to delete lesson plan.',
        );
      }

      setMessage(
        result.message ||
          'Lesson plan deleted successfully.',
      );

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete lesson plan.',
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
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-brand-green">
                <FilePenLine
                  size={25}
                />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
                  Academic Planning
                </p>

                <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
                  Lesson Plans
                </h1>
              </div>
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Prepare detailed lesson plans and link each
            lesson to a specific week in your scheme of
            work.
          </p>
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

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="mb-7">
            <h2 className="text-lg font-extrabold text-slate-900">
              Create Lesson Plan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select your programme, unit and scheme
              week before preparing the lesson.
            </p>
          </div>

          {/* BASIC INFORMATION */}
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
                value={form.programId}
                onChange={(event) =>
                  handleProgramChange(
                    event.target.value,
                  )
                }
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
                value={form.unitId}
                onChange={(event) =>
                  handleUnitChange(
                    event.target.value,
                  )
                }
                disabled={
                  !form.programId
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-green-600 focus:ring-2 focus:ring-green-100"
                required
              >
                <option value="">
                  Select unit
                </option>

                {(
                  selectedProgram?.units ??
                  []
                ).map(
                  (unit) => (
                    <option
                      key={
                        unit.id
                      }
                      value={
                        unit.id
                      }
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

            {/* SCHEME WEEK */}
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Scheme of Work Week
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="">
                  No scheme week selected
                </option>

                {availableSchemeEntries.map(
                  (entry) => (
                    <option
                      key={
                        entry.id
                      }
                      value={
                        entry.id
                      }
                    >
                      {entry.schemeTitle}
                      {' — '}
                      Week{' '}
                      {
                        entry.weekNumber
                      }
                      {' — '}
                      {entry.topic}
                    </option>
                  ),
                )}
              </select>

              {selectedSchemeEntry && (
                <p className="mt-2 text-xs font-semibold text-green-700">
                  Linked to Week{' '}
                  {
                    selectedSchemeEntry.weekNumber
                  }
                  {' — '}
                  {
                    selectedSchemeEntry.topic
                  }
                </p>
              )}
            </label>

            {/* LESSON DATE */}
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
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </label>

            {/* DURATION */}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Duration (Minutes)
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
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </label>

            {/* TOPIC */}
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Topic
                <span className="ml-1 text-red-600">
                  *
                </span>
              </span>

              <input
                value={form.topic}
                onChange={(event) =>
                  updateField(
                    'topic',
                    event.target.value,
                  )
                }
                placeholder="Lesson topic"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                required
              />
            </label>

            {/* SUBTOPIC */}
            <label className="block md:col-span-2">
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
                    event.target.value,
                  )
                }
                placeholder="Lesson sub-topic"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </label>

            {/* STATUS */}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Status
              </span>

              <select
                value={
                  form.status
                }
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value,
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
          </div>

          {/* LESSON CONTENT */}
          <div className="mt-8">
            <h2 className="mb-5 text-lg font-extrabold text-slate-900">
              Lesson Preparation
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <TextAreaField
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

              <TextAreaField
                label="Specific Learning Outcomes"
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

              <TextAreaField
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

              <TextAreaField
                label="Teaching / Learning Resources"
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

          {/* LESSON PROCEDURE */}
          <div className="mt-8">
            <h2 className="mb-5 text-lg font-extrabold text-slate-900">
              Lesson Procedure
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <TextAreaField
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

              <TextAreaField
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

              <TextAreaField
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

              <TextAreaField
                label="Assessment / Evaluation"
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

              <TextAreaField
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

              <TextAreaField
                label="Assignment / Homework"
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
                <TextAreaField
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
                  Save Lesson Plan
                </>
              )}
            </button>
          </div>
        </form>

        {/* EXISTING LESSON PLANS */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-slate-900">
              My Lesson Plans
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Lesson plans you have already created.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Loading lesson plans...
              </div>
            </div>
          ) : lessonPlans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <FilePenLine className="mx-auto h-10 w-10 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                You have not created any lesson plans yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {lessonPlans.map(
                (plan) => (
                  <article
                    key={plan.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900">
                          {plan.topic}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {
                            plan.programName
                          }
                        </p>

                        <p className="text-sm text-slate-500">
                          {plan.unitCode
                            ? `${plan.unitCode} — `
                            : ''}
                          {
                            plan.unitName
                          }
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase ${
                          plan.status ===
                          'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {
                          plan.status
                        }
                      </span>
                    </div>

                    {plan.subtopic && (
                      <p className="mt-3 text-sm text-slate-600">
                        {
                          plan.subtopic
                        }
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays
                          size={14}
                        />
                        {plan.lessonDate ||
                          'No date'}
                      </span>

                      {plan.durationMinutes && (
                        <span>
                          {
                            plan.durationMinutes
                          }{' '}
                          minutes
                        </span>
                      )}

                      {plan.schemeTitle && (
                        <span>
                          {
                            plan.schemeTitle
                          }

                          {plan.weekNumber
                            ? ` · Week ${plan.weekNumber}`
                            : ''}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Learning Outcomes
                      </p>

                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                        {plan.specificObjectives ||
                          'No learning outcomes recorded.'}
                      </p>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/lecturer/dashboard/lesson-plans/${plan.id}`}
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
                          void deleteLessonPlan(
                            plan.id,
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