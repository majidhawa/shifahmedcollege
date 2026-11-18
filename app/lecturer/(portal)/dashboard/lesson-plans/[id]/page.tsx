
'use client';

import Link from 'next/link';
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  BookOpen,
  BookMarked,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Loader2,
  Save,
  UserRound,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Unit = {
  id: number;
  code: string | null;
  name: string;
};

type Program = {
  id: number;
  name: string;
  level: string;
  units: Unit[];
};

type SchemeEntry = {
  id: number;
  schemeId: number;
  weekNumber: number;
  topic: string;
  subtopic: string;
  schemeTitle: string;
  programId: number;
  unitId: number;
};

type LessonPlan = {
  id: number;
  programId: number;
  unitId: number;
  schemeEntryId: number | null;

  lessonDate: string | null;
  lessonTime: string | null;
  durationMinutes: number | null;

  topic: string;
  subtopic: string;

  specificObjectives: string;
  resources: string;
  teacherActivities: string;

  trainerName: string | null;
  trainerPhone: string | null;
  courseLevel: string | null;

  intake: string | null;
  studentCount: number | null;
  competencyArea: string | null;

  // Current API property and backward compatibility.
  references?: string | null;
  lessonReferences?: string | null;

  supervisorSignature: string | null;
  presentation: unknown;

  status: 'draft' | 'completed';

  programName: string;
  unitCode: string | null;
  unitName: string;

  weekNumber: number | null;
  schemeTitle: string | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  lecturerName?: string;
  programs?: Program[];
  schemeEntries?: SchemeEntry[];
  lessonPlan?: LessonPlan;
};

type LessonPlanForm = {
  programId: string;
  unitId: string;
  schemeEntryId: string;

  trainerPhone: string;

  lessonDate: string;
  lessonTime: string;

  intake: string;
  studentCount: string;
  competencyArea: string;

  topic: string;
  subtopic: string;

  supervisorSignature: string;

  specificObjectives: string;
  resources: string;
  references: string;

  presentation: string;
  timeEstimate: string;

  status: 'draft' | 'completed';
};

const initialForm: LessonPlanForm = {
  programId: '',
  unitId: '',
  schemeEntryId: '',

  trainerPhone: '',

  lessonDate: '',
  lessonTime: '',

  intake: '',
  studentCount: '',
  competencyArea: '',

  topic: '',
  subtopic: '',

  supervisorSignature: '',

  specificObjectives: '',
  resources: '',
  references: '',

  presentation: '',
  timeEstimate: '60',

  status: 'draft',
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';

  return value.slice(0, 10);
}

function toTimeInput(value: string | null | undefined): string {
  if (!value) return '';

  return value.slice(0, 5);
}

function presentationToText(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return presentationToText(parsed);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (
          item &&
          typeof item === 'object' &&
          'content' in item
        ) {
          return String(
            (item as { content?: unknown }).content ?? '',
          );
        }

        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  if (typeof value === 'object' && value !== null) {
    if ('content' in value) {
      return String(
        (value as { content?: unknown }).content ?? '',
      );
    }
  }

  return '';
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function LessonPlanDetailPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [schemeEntries, setSchemeEntries] = useState<SchemeEntry[]>([]);

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lecturerName, setLecturerName] = useState('');

  const [form, setForm] = useState<LessonPlanForm>({
    ...initialForm,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /* ------------------------------------------------------------------------ */
  /* LOAD LESSON PLAN AND OPTIONS                                             */
  /* ------------------------------------------------------------------------ */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [planResponse, optionsResponse] = await Promise.all([
        fetch(`/api/lecturer/lesson-plans/${params.id}`, {
          credentials: 'include',
          cache: 'no-store',
        }),

        fetch('/api/lecturer/lesson-plans', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);

      const [planResult, optionsResult]: [
        ApiResponse,
        ApiResponse,
      ] = await Promise.all([
        planResponse.json(),
        optionsResponse.json(),
      ]);

      if (!planResponse.ok || !planResult.success) {
        throw new Error(
          planResult.message || 'Unable to load lesson plan.',
        );
      }

      if (!optionsResponse.ok || !optionsResult.success) {
        throw new Error(
          optionsResult.message ||
            'Unable to load programmes and Scheme of Work.',
        );
      }

      if (!planResult.lessonPlan) {
        throw new Error('Lesson plan not found.');
      }

      const loadedPlan = planResult.lessonPlan;

      setLessonPlan(loadedPlan);

      setPrograms(
        Array.isArray(optionsResult.programs)
          ? optionsResult.programs
          : [],
      );

      setSchemeEntries(
        Array.isArray(optionsResult.schemeEntries)
          ? optionsResult.schemeEntries
          : [],
      );

      setLecturerName(
        typeof optionsResult.lecturerName === 'string'
          ? optionsResult.lecturerName.trim()
          : loadedPlan.trainerName || '',
      );

      /*
       * IMPORTANT:
       * The API returns lesson_references as "references".
       * lessonReferences is retained as a fallback for older responses.
       */

      const savedReferences =
        loadedPlan.references ??
        loadedPlan.lessonReferences ??
        '';

      setForm({
        programId: String(loadedPlan.programId ?? ''),
        unitId: String(loadedPlan.unitId ?? ''),

        schemeEntryId:
          loadedPlan.schemeEntryId !== null &&
          loadedPlan.schemeEntryId !== undefined
            ? String(loadedPlan.schemeEntryId)
            : '',

        trainerPhone: loadedPlan.trainerPhone || '',

        lessonDate: toDateInput(loadedPlan.lessonDate),
        lessonTime: toTimeInput(loadedPlan.lessonTime),

        intake: loadedPlan.intake || '',

        studentCount:
          loadedPlan.studentCount !== null &&
          loadedPlan.studentCount !== undefined
            ? String(loadedPlan.studentCount)
            : '',

        competencyArea: loadedPlan.competencyArea || '',

        topic: loadedPlan.topic || '',
        subtopic: loadedPlan.subtopic || '',

        supervisorSignature:
          loadedPlan.supervisorSignature || '',

        specificObjectives:
          loadedPlan.specificObjectives || '',

        resources: loadedPlan.resources || '',

        // Corrected reference mapping.
        references: savedReferences,

        presentation:
          presentationToText(loadedPlan.presentation) ||
          loadedPlan.teacherActivities ||
          '',

        timeEstimate:
          loadedPlan.durationMinutes !== null &&
          loadedPlan.durationMinutes !== undefined
            ? String(loadedPlan.durationMinutes)
            : '60',

        status: loadedPlan.status || 'draft',
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
  }, [params.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ------------------------------------------------------------------------ */
  /* SELECTED PROGRAMME AND UNIT                                              */
  /* ------------------------------------------------------------------------ */

  const selectedProgram = useMemo(
    () =>
      programs.find(
        (program) => String(program.id) === form.programId,
      ),
    [programs, form.programId],
  );

  const selectedUnit = useMemo(
    () =>
      selectedProgram?.units.find(
        (unit) => String(unit.id) === form.unitId,
      ),
    [selectedProgram, form.unitId],
  );

  /* ------------------------------------------------------------------------ */
  /* SCHEME OF WORK ENTRIES                                                   */
  /* ------------------------------------------------------------------------ */

  const availableSchemeEntries = useMemo(
    () =>
      schemeEntries.filter(
        (entry) =>
          entry.programId === Number(form.programId) &&
          entry.unitId === Number(form.unitId),
      ),
    [schemeEntries, form.programId, form.unitId],
  );

  const selectedSchemeEntry = useMemo(
    () =>
      availableSchemeEntries.find(
        (entry) => String(entry.id) === form.schemeEntryId,
      ),
    [availableSchemeEntries, form.schemeEntryId],
  );

  /* ------------------------------------------------------------------------ */
  /* UPDATE FIELD                                                             */
  /* ------------------------------------------------------------------------ */

  function updateField(
    field: keyof LessonPlanForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* PROGRAMME AND UNIT SELECTION                                             */
  /* ------------------------------------------------------------------------ */

  function handleCourseChange(value: string) {
    const [programId, unitId] = value.split(':');

    setForm((current) => ({
      ...current,
      programId: programId || '',
      unitId: unitId || '',
      schemeEntryId: '',
      topic: '',
      subtopic: '',
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* SCHEME ENTRY SELECTION                                                   */
  /* ------------------------------------------------------------------------ */

  function handleSchemeEntryChange(value: string) {
    const entry = availableSchemeEntries.find(
      (item) => String(item.id) === value,
    );

    setForm((current) => ({
      ...current,
      schemeEntryId: value,
      topic: entry?.topic ?? '',
      subtopic: entry?.subtopic ?? '',
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE LESSON PLAN                                                         */
  /* ------------------------------------------------------------------------ */

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!form.programId || !form.unitId) {
        throw new Error(
          'Please select the course name and unit.',
        );
      }

      if (!form.schemeEntryId || !selectedSchemeEntry) {
        throw new Error(
          'Please select a valid Scheme of Work week.',
        );
      }

      if (!form.lessonDate) {
        throw new Error('Please enter the lesson date.');
      }

      if (!form.topic.trim()) {
        throw new Error('Lesson title is required.');
      }

      if (!form.specificObjectives.trim()) {
        throw new Error(
          'Please enter the specific objectives.',
        );
      }

      if (!form.timeEstimate) {
        throw new Error('Please enter the time estimate.');
      }

      const duration = Number(form.timeEstimate);

      if (!Number.isInteger(duration) || duration < 1) {
        throw new Error(
          'Time estimate must be a positive whole number of minutes.',
        );
      }

      if (
        form.studentCount &&
        (
          !Number.isInteger(Number(form.studentCount)) ||
          Number(form.studentCount) < 0
        )
      ) {
        throw new Error(
          'Number of students must be a valid non-negative whole number.',
        );
      }

      const payload = {
        programId: Number(form.programId),
        unitId: Number(form.unitId),
        schemeEntryId: Number(form.schemeEntryId),

        topicId: null,

        lessonDate: form.lessonDate,
        lessonTime: form.lessonTime || null,
        durationMinutes: duration,

        topic: form.topic.trim(),
        subtopic: form.subtopic.trim(),

        specificObjectives: form.specificObjectives.trim(),
        resources: form.resources.trim(),

        trainerPhone: form.trainerPhone.trim(),

        intake: form.intake.trim(),

        studentCount: form.studentCount
          ? Number(form.studentCount)
          : null,

        competencyArea: form.competencyArea.trim(),

        // References are sent to the API under the correct property.
        references: form.references.trim(),

        supervisorSignature:
          form.supervisorSignature.trim(),

        presentation: form.presentation.trim(),

        teacherActivities: form.presentation.trim(),

        status: form.status,
      };

      const response = await fetch(
        `/api/lecturer/lesson-plans/${params.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to update lesson plan.',
        );
      }

      setMessage(
        result.message || 'Lesson plan updated successfully.',
      );

      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update lesson plan.',
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING STATE                                                            */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-soft">
          <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
          Loading lesson plan...
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* NOT FOUND                                                                */
  /* ------------------------------------------------------------------------ */

  if (!lessonPlan) {
    return (
      <main className="min-h-screen bg-brand-cream px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
            {error || 'Lesson plan not found.'}
          </div>

          <Link
            href="/lecturer/dashboard/lesson-plans"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-green"
          >
            <ArrowLeft size={16} />
            Back to Lesson Plans
          </Link>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* MAIN FORM                                                                */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/lecturer/dashboard/lesson-plans"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green transition hover:text-brand-dark"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lesson Plans
        </Link>

        {/* HEADER */}

        <div className="mt-6 rounded-3xl bg-brand-green p-6 shadow-soft sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
            Academic Documentation
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Edit Trainer&apos;s Lesson Plan
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/75">
            Update your lesson plan using the approved college
            Scheme of Work and lesson-plan format.
          </p>

          <p className="mt-3 text-xs font-semibold text-white/70">
            Lesson Plan #{lessonPlan.id}
          </p>
        </div>

        {/* FEEDBACK */}

        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-8 space-y-6">

          {/* TRAINER AND COURSE DETAILS */}

          <FormSection
            icon={<UserRound className="h-5 w-5" />}
            title="Trainer and Course Details"
            description="Identify the trainer, course, unit and lesson schedule."
          >
            <div className="grid gap-5 md:grid-cols-2">

              <div className="md:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Trainer&apos;s Name
                  </p>

                  <p className="mt-2 text-sm font-bold text-brand-dark">
                    {lecturerName ||
                      lessonPlan.trainerName ||
                      'Trainer name unavailable'}
                  </p>
                </div>
              </div>

              <FormInput
                label="Tel. No."
                value={form.trainerPhone}
                onChange={(value) =>
                  updateField('trainerPhone', value)
                }
                placeholder="Enter telephone number"
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Course Level
                </label>

                <div className="flex min-h-[46px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {selectedProgram?.level ||
                    lessonPlan.courseLevel ||
                    'Course level unavailable'}
                </div>
              </div>

              <div className="md:col-span-2">
                <SelectField
                  label="Course Name and Unit"
                  value={
                    form.programId && form.unitId
                      ? `${form.programId}:${form.unitId}`
                      : ''
                  }
                  onChange={handleCourseChange}
                  required
                  placeholder="Select course and unit"
                  options={programs.flatMap((program) =>
                    program.units.map((unit) => ({
                      value: `${program.id}:${unit.id}`,
                      label: `${program.name} — ${
                        unit.code ? `${unit.code} ` : ''
                      }${unit.name}`,
                    })),
                  )}
                />
              </div>

              {selectedUnit && (
                <div className="md:col-span-2 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-5 w-5 text-brand-green" />

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                        Selected Unit
                      </p>

                      <p className="mt-1 text-sm font-bold text-brand-dark">
                        {selectedUnit.code
                          ? `${selectedUnit.code} — `
                          : ''}
                        {selectedUnit.name}
                      </p>

                      <p className="mt-1 text-xs text-green-800">
                        {selectedProgram?.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <FormInput
                label="Date"
                type="date"
                value={form.lessonDate}
                onChange={(value) =>
                  updateField('lessonDate', value)
                }
                required
              />

              <FormInput
                label="Time"
                type="time"
                value={form.lessonTime}
                onChange={(value) =>
                  updateField('lessonTime', value)
                }
              />

              <FormInput
                label="Intake"
                value={form.intake}
                onChange={(value) => updateField('intake', value)}
                placeholder="Enter intake"
              />

              <FormInput
                label="No. of Students"
                type="number"
                min="0"
                value={form.studentCount}
                onChange={(value) =>
                  updateField('studentCount', value)
                }
                placeholder="Enter number of students"
              />

              <div className="md:col-span-2">
                <FormInput
                  label="Competency Area"
                  value={form.competencyArea}
                  onChange={(value) =>
                    updateField('competencyArea', value)
                  }
                  placeholder="Enter competency area"
                />
              </div>
            </div>
          </FormSection>

          {/* SCHEME OF WORK */}

          <FormSection
            icon={<BookMarked className="h-5 w-5" />}
            title="Scheme of Work"
            description="Connect this lesson plan to the relevant teaching week in your approved Scheme of Work."
          >
            {!form.programId || !form.unitId ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400" />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Select a course and unit first.
                </p>
              </div>
            ) : availableSchemeEntries.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-800">
                  No Scheme of Work entries found.
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                  There are currently no Scheme of Work weeks available
                  for this course and unit.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <SelectField
                  label="Select Scheme of Work Week"
                  value={form.schemeEntryId}
                  onChange={handleSchemeEntryChange}
                  required
                  placeholder="Choose a week from the Scheme of Work"
                  options={availableSchemeEntries.map((entry) => ({
                    value: String(entry.id),
                    label: `${entry.schemeTitle} — Week ${entry.weekNumber} — ${entry.topic || 'Untitled topic'}`,
                  }))}
                />

                {selectedSchemeEntry && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-700" />

                      <p className="text-sm font-bold text-green-800">
                        Scheme of Work linked successfully
                      </p>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                          Scheme of Work
                        </p>

                        <p className="mt-1 text-sm font-semibold text-brand-dark">
                          {selectedSchemeEntry.schemeTitle}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                          Teaching Week
                        </p>

                        <p className="mt-1 text-sm font-semibold text-brand-dark">
                          Week {selectedSchemeEntry.weekNumber}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                          Scheme Topic
                        </p>

                        <p className="mt-1 text-sm font-semibold text-brand-dark">
                          {selectedSchemeEntry.topic || 'No topic provided'}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                          Scheme Subtopic
                        </p>

                        <p className="mt-1 text-sm font-semibold text-brand-dark">
                          {selectedSchemeEntry.subtopic || 'No subtopic provided'}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 border-t border-green-200 pt-3 text-xs leading-5 text-green-800">
                      The selected week, topic and subtopic are associated
                      with this lesson plan.
                    </p>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* LESSON TITLE */}

          <FormSection
            icon={<BookOpen className="h-5 w-5" />}
            title="Lesson Title"
            description="The lesson title and subtopic are populated from the selected Scheme of Work entry."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <div className="md:col-span-2">
                <FormInput
                  label="Lesson Title"
                  value={form.topic}
                  onChange={(value) => updateField('topic', value)}
                  required
                  placeholder="Select a Scheme of Work week first"
                  disabled={!form.schemeEntryId}
                />
              </div>

              <FormInput
                label="Supervisor's Signature"
                value={form.supervisorSignature}
                onChange={(value) =>
                  updateField('supervisorSignature', value)
                }
                placeholder="For supervisor's signature"
              />

              <div className="md:col-span-3">
                <FormTextArea
                  label="Subtopic"
                  value={form.subtopic}
                  onChange={(value) =>
                    updateField('subtopic', value)
                  }
                  rows={2}
                  placeholder="Subtopic from the selected Scheme of Work"
                  disabled={!form.schemeEntryId}
                />
              </div>
            </div>
          </FormSection>

          {/* SPECIFIC OBJECTIVES */}

          <FormSection
            icon={<GraduationCap className="h-5 w-5" />}
            title="Specific Objectives"
            description="By the end of the lesson the learner should be able to:"
          >
            <FormTextArea
              label="Specific Objectives"
              value={form.specificObjectives}
              onChange={(value) =>
                updateField('specificObjectives', value)
              }
              required
              rows={6}
              placeholder="Enter the specific objectives..."
            />
          </FormSection>

          {/* TEACHING AIDS */}

          <FormSection
            icon={<ClipboardList className="h-5 w-5" />}
            title="Teaching Aids"
            description="List the teaching aids required for the lesson."
          >
            <FormTextArea
              label="Teaching Aids"
              value={form.resources}
              onChange={(value) =>
                updateField('resources', value)
              }
              rows={5}
              placeholder="List the teaching aids..."
            />
          </FormSection>

          {/* REFERENCES */}

          <FormSection
            icon={<FileText className="h-5 w-5" />}
            title="References"
            description="Record the references used to prepare the lesson."
          >
            <FormTextArea
              label="References"
              value={form.references}
              onChange={(value) =>
                updateField('references', value)
              }
              rows={5}
              placeholder="Enter references..."
            />
          </FormSection>

          {/* PRESENTATION */}

          <FormSection
            icon={<CalendarDays className="h-5 w-5" />}
            title="Presentation"
            description="Describe the lesson presentation and estimate the time required."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <div className="md:col-span-2">
                <FormTextArea
                  label="Presentation"
                  value={form.presentation}
                  onChange={(value) =>
                    updateField('presentation', value)
                  }
                  rows={8}
                  placeholder="Enter the lesson presentation..."
                />
              </div>

              <FormInput
                label="Time Estimate (Minutes)"
                type="number"
                min="1"
                value={form.timeEstimate}
                onChange={(value) =>
                  updateField('timeEstimate', value)
                }
                required
                placeholder="e.g. 60"
              />
            </div>
          </FormSection>

          {/* STATUS */}

          <FormSection
            icon={<FileText className="h-5 w-5" />}
            title="Lesson Plan Status"
            description="Choose whether this lesson plan is still a draft or completed."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Status"
                value={form.status}
                onChange={(value) =>
                  updateField(
                    'status',
                    value as 'draft' | 'completed',
                  )
                }
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
          </FormSection>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/lecturer/dashboard/lesson-plans"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                !availableSchemeEntries.length
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
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

/* -------------------------------------------------------------------------- */
/* REUSABLE COMPONENTS                                                        */
/* -------------------------------------------------------------------------- */

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-brand-green/10 p-3 text-brand-green">
          {icon}
        </div>

        <div>
          <h2 className="font-bold text-brand-dark">
            {title}
          </h2>

          <p className="text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* INPUT                                                                      */
/* -------------------------------------------------------------------------- */

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  min,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  disabled?: boolean;
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
        required={required}
        placeholder={placeholder}
        min={min}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* TEXTAREA                                                                   */
/* -------------------------------------------------------------------------- */

function FormTextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 5,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
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
        required={required}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* SELECT                                                                     */
/* -------------------------------------------------------------------------- */

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
