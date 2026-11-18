
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Loader2,
  Save,
  UserRound,
  BookMarked,
  CheckCircle2,
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

type SavedReference = {
  programId: number;
  unitId: number;
  references: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  lecturerName?: string;
  programs?: Program[];
  schemeEntries?: SchemeEntry[];
  lessonPlans?: unknown[];
  savedReferences?: SavedReference[];

  lessonPlan?: {
    id?: number;
  };
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
};

/* -------------------------------------------------------------------------- */
/* INITIAL FORM                                                               */
/* -------------------------------------------------------------------------- */

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
};

/* -------------------------------------------------------------------------- */
/* DATE HELPER                                                                */
/* -------------------------------------------------------------------------- */

function getLocalDate(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, '0');

  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function NewLessonPlanPage() {
  const router = useRouter();

  /* ------------------------------------------------------------------------ */
  /* STATE                                                                    */
  /* ------------------------------------------------------------------------ */

  const [programs, setPrograms] = useState<Program[]>([]);

  const [schemeEntries, setSchemeEntries] = useState<SchemeEntry[]>([]);

  const [savedReferences, setSavedReferences] = useState<
    SavedReference[]
  >([]);

  const [lecturerName, setLecturerName] = useState('');

  const [form, setForm] = useState<LessonPlanForm>({
    ...initialForm,
  });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  /* ------------------------------------------------------------------------ */
  /* SELECTED PROGRAMME                                                       */
  /* ------------------------------------------------------------------------ */

  const selectedProgram = programs.find(
    (program) => String(program.id) === form.programId,
  );

  /* ------------------------------------------------------------------------ */
  /* SELECTED UNIT                                                            */
  /* ------------------------------------------------------------------------ */

  const selectedUnit = selectedProgram?.units.find(
    (unit) => String(unit.id) === form.unitId,
  );

  /* ------------------------------------------------------------------------ */
  /* FILTER SCHEME ENTRIES                                                    */
  /* ------------------------------------------------------------------------ */

  const availableSchemeEntries = schemeEntries.filter(
    (entry) =>
      String(entry.programId) === form.programId &&
      String(entry.unitId) === form.unitId,
  );

  /* ------------------------------------------------------------------------ */
  /* SELECTED SCHEME ENTRY                                                    */
  /* ------------------------------------------------------------------------ */

  const selectedSchemeEntry = availableSchemeEntries.find(
    (entry) => String(entry.id) === form.schemeEntryId,
  );

  /* ------------------------------------------------------------------------ */
  /* REFERENCES FOR SELECTED UNIT                                             */
  /* ------------------------------------------------------------------------ */

  const availableReferences = savedReferences.filter(
    (item) =>
      item.programId === Number(form.programId) &&
      item.unitId === Number(form.unitId),
  );

  /* ------------------------------------------------------------------------ */
  /* LOAD PROGRAMMES, UNITS, SCHEMES AND REFERENCES                           */
  /* ------------------------------------------------------------------------ */

  const loadOptions = useCallback(async () => {
    try {
      setLoading(true);

      setError('');

      const response = await fetch(
        '/api/lecturer/lesson-plans',
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        },
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Unable to load lesson planning information.',
        );
      }

      /* PROGRAMMES */

      setPrograms(
        Array.isArray(result.programs)
          ? result.programs
          : [],
      );

      /* SCHEME OF WORK */

      setSchemeEntries(
        Array.isArray(result.schemeEntries)
          ? result.schemeEntries
          : [],
      );

      /* LECTURER */

      setLecturerName(
        typeof result.lecturerName === 'string'
          ? result.lecturerName.trim()
          : '',
      );

      /* SAVED REFERENCES */

      setSavedReferences(
        Array.isArray(result.savedReferences)
          ? result.savedReferences
          : [],
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load lesson planning information.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  /* ------------------------------------------------------------------------ */
  /* DEFAULT LESSON DATE                                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setForm((current) => ({
      ...current,
      lessonDate: current.lessonDate || getLocalDate(),
    }));
  }, []);

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
  /* COURSE AND UNIT SELECTION                                                */
  /* ------------------------------------------------------------------------ */

  function handleCourseChange(value: string) {
    const [programId, unitId] = value.split(':');

    const matchingReferences = savedReferences
      .filter(
        (item) =>
          item.programId === Number(programId) &&
          item.unitId === Number(unitId),
      )
      .map((item) => item.references.trim())
      .filter(Boolean);

    /*
     * Remove duplicate reference records.
     */

    const uniqueReferences = [
      ...new Set(matchingReferences),
    ];

    setForm((current) => ({
      ...current,

      programId: programId || '',
      unitId: unitId || '',

      schemeEntryId: '',

      topic: '',
      subtopic: '',

      /*
       * Automatically retrieve references previously
       * saved for the selected programme and unit.
       */

      references: uniqueReferences.join('\n'),
    }));
  }

  /* ------------------------------------------------------------------------ */
  /* SCHEME OF WORK WEEK SELECTION                                            */
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
  /* VALIDATION                                                               */
  /* ------------------------------------------------------------------------ */

  function validateForm() {
    if (!lecturerName) {
      throw new Error(
        'Your trainer details could not be retrieved. Please refresh the page.',
      );
    }

    if (!form.programId || !form.unitId) {
      throw new Error(
        'Please select the course name and unit.',
      );
    }

    if (!form.schemeEntryId) {
      throw new Error(
        'Please select a Scheme of Work week before creating the lesson plan.',
      );
    }

    if (!selectedSchemeEntry) {
      throw new Error(
        'The selected Scheme of Work entry is invalid. Please select it again.',
      );
    }

    if (!form.lessonDate) {
      throw new Error(
        'Please enter the lesson date.',
      );
    }

    if (!form.topic.trim()) {
      throw new Error(
        'The selected Scheme of Work has no lesson topic.',
      );
    }

    if (!form.specificObjectives.trim()) {
      throw new Error(
        'Please enter the specific objectives.',
      );
    }

    if (!form.timeEstimate) {
      throw new Error(
        'Please enter the time estimate.',
      );
    }

    const duration = Number(form.timeEstimate);

    if (
      !Number.isInteger(duration) ||
      duration < 1
    ) {
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
  }

  /* ------------------------------------------------------------------------ */
  /* CREATE LESSON PLAN                                                       */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);

    setError('');

    try {
      validateForm();

      const payload = {
        programId: Number(form.programId),

        unitId: Number(form.unitId),

        schemeEntryId: Number(form.schemeEntryId),

        topicId: null,

        lessonDate: form.lessonDate,

        lessonTime: form.lessonTime,

        durationMinutes: Number(form.timeEstimate),

        topic: form.topic.trim(),

        subtopic: form.subtopic.trim(),

        generalObjective: '',

        specificObjectives: form.specificObjectives.trim(),

        priorKnowledge: '',

        resources: form.resources.trim(),

        introduction: '',

        teacherActivities: form.presentation.trim(),

        learnerActivities: '',

        assessment: '',

        conclusion: '',

        assignment: '',

        remarks: '',

        trainerPhone: form.trainerPhone.trim(),

        intake: form.intake.trim(),

        studentCount: form.studentCount
          ? Number(form.studentCount)
          : null,

        competencyArea: form.competencyArea.trim(),

        references: form.references.trim(),

        supervisorSignature: form.supervisorSignature.trim(),

        presentation: form.presentation.trim(),

        status: 'draft',
      };

      const response = await fetch(
        '/api/lecturer/lesson-plans',
        {
          method: 'POST',

          credentials: 'include',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify(payload),
        },
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Unable to create lesson plan.',
        );
      }

      const newId = result.lessonPlan?.id;

      if (newId) {
        router.push(
          `/lecturer/dashboard/lesson-plans/${newId}`,
        );
      } else {
        router.push(
          '/lecturer/dashboard/lesson-plans',
        );
      }

      router.refresh();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create lesson plan.',
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

          Loading lesson plan form...

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

        {/* BACK NAVIGATION */}

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
            Create Trainer&apos;s Lesson Plan
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/75">
            Prepare your lesson plan using the approved college
            Scheme of Work and lesson-plan format.
          </p>

        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >

          {/* ---------------------------------------------------------------- */}
          {/* TRAINER AND COURSE DETAILS                                       */}
          {/* ---------------------------------------------------------------- */}

          <FormSection
            icon={<UserRound className="h-5 w-5" />}
            title="Trainer and Course Details"
            description="Identify the trainer, course, unit and lesson schedule."
          >

            <div className="grid gap-5 md:grid-cols-2">

              {/* TRAINER NAME */}

              <div className="md:col-span-2">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Trainer&apos;s Name
                  </p>

                  <p className="mt-2 text-sm font-bold text-brand-dark">
                    {lecturerName || 'Trainer name unavailable'}
                  </p>

                </div>

              </div>

              {/* PHONE */}

              <FormInput
                label="Tel. No."
                value={form.trainerPhone}
                onChange={(value) =>
                  updateField('trainerPhone', value)
                }
                placeholder="Enter telephone number"
              />

              {/* COURSE LEVEL */}

              <div>

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Course Level
                </label>

                <div className="flex min-h-[46px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {selectedProgram?.level ||
                    'Automatically selected from course'}
                </div>

              </div>

              {/* COURSE AND UNIT */}

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

              {/* SELECTED UNIT */}

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

              {/* DATE */}

              <FormInput
                label="Date"
                type="date"
                value={form.lessonDate}
                onChange={(value) =>
                  updateField('lessonDate', value)
                }
                required
              />

              {/* TIME */}

              <FormInput
                label="Time"
                type="time"
                value={form.lessonTime}
                onChange={(value) =>
                  updateField('lessonTime', value)
                }
              />

              {/* INTAKE */}

              <FormInput
                label="Intake"
                value={form.intake}
                onChange={(value) =>
                  updateField('intake', value)
                }
                placeholder="Enter intake"
              />

              {/* STUDENT COUNT */}

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

              {/* COMPETENCY AREA */}

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

          {/* ---------------------------------------------------------------- */}
          {/* SCHEME OF WORK                                                   */}
          {/* ---------------------------------------------------------------- */}

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

                <p className="mt-1 text-xs text-slate-500">
                  Available Scheme of Work weeks will appear here.
                </p>

              </div>

            ) : availableSchemeEntries.length === 0 ? (

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

                <p className="text-sm font-bold text-amber-800">
                  No Scheme of Work entries found.
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                  There are currently no Scheme of Work entries
                  available for this course and unit. Create or
                  complete the Scheme of Work before preparing
                  this lesson plan.
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

                    label: `${entry.schemeTitle} — Week ${entry.weekNumber} — ${
                      entry.topic || 'Untitled topic'
                    }`,
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
                          {selectedSchemeEntry.topic ||
                            'No topic provided'}
                        </p>

                      </div>

                      <div className="sm:col-span-2">

                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                          Scheme Subtopic
                        </p>

                        <p className="mt-1 text-sm font-semibold text-brand-dark">
                          {selectedSchemeEntry.subtopic ||
                            'No subtopic provided'}
                        </p>

                      </div>

                    </div>

                    <p className="mt-4 border-t border-green-200 pt-3 text-xs leading-5 text-green-800">
                      The selected week, topic and subtopic will
                      be associated with this lesson plan.
                    </p>

                  </div>

                )}

              </div>

            )}

          </FormSection>

          {/* ---------------------------------------------------------------- */}
          {/* LESSON TITLE AND SUPERVISOR SIGNATURE                            */}
          {/* ---------------------------------------------------------------- */}

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
                  onChange={(value) =>
                    updateField('topic', value)
                  }
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

          {/* ---------------------------------------------------------------- */}
          {/* SPECIFIC OBJECTIVES                                               */}
          {/* ---------------------------------------------------------------- */}

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

          {/* ---------------------------------------------------------------- */}
          {/* TEACHING AIDS                                                     */}
          {/* ---------------------------------------------------------------- */}

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

          {/* ---------------------------------------------------------------- */}
          {/* REFERENCES                                                        */}
          {/* ---------------------------------------------------------------- */}

          <FormSection
            icon={<FileText className="h-5 w-5" />}
            title="References"
            description="Previously saved references for this unit are retrieved automatically. You can edit or add references."
          >

            {!form.programId || !form.unitId ? (

              <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Select a course and unit to retrieve previously
                saved references.
              </div>

            ) : availableReferences.length > 0 ? (

              <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-800">

                <CheckCircle2 className="h-4 w-4 shrink-0" />

                Previously saved references retrieved successfully.

              </div>

            ) : (

              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                No previously saved references were found for
                this unit. You can enter new references below.
              </div>

            )}

            <FormTextArea
              label="References"
              value={form.references}
              onChange={(value) =>
                updateField('references', value)
              }
              rows={6}
              placeholder="Enter references, one reference per line..."
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              References are retrieved from previously saved
              lesson plans for the selected unit. You can modify
              this list before creating your lesson plan.
            </p>

          </FormSection>

          {/* ---------------------------------------------------------------- */}
          {/* PRESENTATION AND TIME ESTIMATE                                    */}
          {/* ---------------------------------------------------------------- */}

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

          {/* ---------------------------------------------------------------- */}
          {/* ACTIONS                                                           */}
          {/* ---------------------------------------------------------------- */}

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
                !lecturerName ||
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

                  Creating Lesson Plan...
                </>

              ) : (

                <>
                  <Save size={18} />

                  Create Lesson Plan
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
        onChange={(event) =>
          onChange(event.target.value)
        }
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
        onChange={(event) =>
          onChange(event.target.value)
        }
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >

        <option value="">
          {placeholder}
        </option>

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
