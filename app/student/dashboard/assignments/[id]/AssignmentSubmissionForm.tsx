'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck2,
  Loader2,
  Save,
  Send,
  Trophy,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Question = {
  id: number;
  questionNumber: number;
  question: string;
  marks: number;
};

type ExistingAnswer = {
  id: number;
  submissionId: number;
  questionId: number;
  answerText: string | null;
  marksAwarded: number | null;
  lecturerFeedback: string | null;
  gradedAt: string | null;
};

type Submission = {
  id: number;
  assignmentId: number;
  applicationId: number;
  submissionText: string | null;
  status: string;
  submittedAt: string | null;
  totalMarks: number | null;
  marksAwarded: number | null;
  lecturerFeedback: string | null;
  gradedAt: string | null;
};

type Props = {
  assignmentId: number;
  questions: Question[];
  totalMarks: number;
  dueDate: string | null;
  isOverdue: boolean;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function AssignmentSubmissionForm({
  assignmentId,
  questions,
  totalMarks,
  dueDate,
  isOverdue,
}: Props) {
  const [answers, setAnswers] =
    useState<Record<number, string>>({});

  const [submission, setSubmission] =
    useState<Submission | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  /* =======================================================
     NORMALIZED STATUS
  ======================================================= */

  const normalizedStatus =
    String(submission?.status || 'draft')
      .toLowerCase()
      .trim();

  const isDraft =
    normalizedStatus === 'draft' ||
    normalizedStatus === '';

  const isSubmitted =
    normalizedStatus === 'submitted' ||
    normalizedStatus === 'graded';

  const isGraded =
    normalizedStatus === 'graded';

  const isLocked =
    isSubmitted || isGraded;

  /* =======================================================
     EFFECTIVE TOTAL MARKS
  ======================================================= */

  const effectiveTotalMarks =
    submission?.totalMarks !== null &&
    submission?.totalMarks !== undefined
      ? Number(submission.totalMarks)
      : Number(totalMarks);

  /* =======================================================
     LOAD SUBMISSION
  ======================================================= */

  const loadSubmission =
    useCallback(
      async (
        showLoading = true
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          setError('');

          const response =
            await fetch(
              `/api/student/assignments/${assignmentId}/submit`,
              {
                method: 'GET',
                cache: 'no-store',
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
                'Unable to load submission.'
            );
          }

          if (!data.success) {
            throw new Error(
              data.message ||
                'Unable to load submission.'
            );
          }

          setSubmission(
            data.submission || null
          );

          const loadedAnswers: Record<
            number,
            string
          > = {};

          if (
            Array.isArray(
              data.answers
            )
          ) {
            for (
              const answer of
                data.answers as ExistingAnswer[]
            ) {
              loadedAnswers[
                Number(
                  answer.questionId
                )
              ] =
                answer.answerText || '';
            }
          }

          setAnswers(
            loadedAnswers
          );
        } catch (error) {
          console.error(
            'LOAD STUDENT SUBMISSION ERROR:',
            error
          );

          setError(
            error instanceof Error
              ? error.message
              : 'Unable to load submission.'
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [assignmentId]
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  /* =======================================================
     ANSWER COUNT
  ======================================================= */

  const answeredCount =
    useMemo(() => {
      return questions.filter(
        (question) =>
          Boolean(
            answers[
              question.id
            ]?.trim()
          )
      ).length;
    }, [
      answers,
      questions,
    ]);

  const allAnswered =
    questions.length > 0 &&
    answeredCount ===
      questions.length;

  /* =======================================================
     PROGRESS
  ======================================================= */

  const answerPercentage =
    questions.length > 0
      ? Math.round(
          (answeredCount /
            questions.length) *
            100
        )
      : 0;

  /* =======================================================
     UPDATE ANSWER
  ======================================================= */

  function updateAnswer(
    questionId: number,
    value: string
  ) {
    if (isLocked) {
      return;
    }

    setAnswers(
      (current) => ({
        ...current,
        [questionId]: value,
      })
    );

    setMessage('');
    setError('');
  }

  /* =======================================================
     SAVE / SUBMIT
  ======================================================= */

  async function saveSubmission(
    action: 'draft' | 'submit'
  ) {
    /* -----------------------------------------------------
       PREVENT DUPLICATE ACTIONS
    ----------------------------------------------------- */

    if (
      saving ||
      submitting
    ) {
      return;
    }

    /* -----------------------------------------------------
       PREVENT EDITING SUBMITTED WORK
    ----------------------------------------------------- */

    if (isLocked) {
      setError(
        'This assignment has already been submitted and can no longer be edited.'
      );

      return;
    }

    /* -----------------------------------------------------
       SUBMIT VALIDATION
    ----------------------------------------------------- */

    if (
      action === 'submit' &&
      !allAnswered
    ) {
      setError(
        `Please answer all questions. You have answered ${answeredCount} of ${questions.length}.`
      );

      return;
    }

    /* -----------------------------------------------------
       DEADLINE
    ----------------------------------------------------- */

    if (
      action === 'submit' &&
      isOverdue
    ) {
      setError(
        'The deadline for this assignment has passed.'
      );

      return;
    }

    try {
      setError('');
      setMessage('');

      if (
        action === 'submit'
      ) {
        setSubmitting(true);
      } else {
        setSaving(true);
      }

      const response =
        await fetch(
          `/api/student/assignments/${assignmentId}/submit`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              action,

              answers:
                questions.map(
                  (question) => ({
                    questionId:
                      question.id,

                    answerText:
                      answers[
                        question.id
                      ] || '',
                  })
                ),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to save assignment.'
        );
      }

      if (!data.success) {
        throw new Error(
          data.message ||
            'Unable to save assignment.'
        );
      }

      /* ---------------------------------------------------
         SUCCESS MESSAGE
      --------------------------------------------------- */

      setMessage(
        data.message ||
          (action === 'submit'
            ? 'Assignment submitted successfully.'
            : 'Draft saved successfully.')
      );

      /*
       * Reload the actual server state.
       *
       * This is important because the server is the
       * source of truth for submission status.
       */
      await loadSubmission(false);

    } catch (error) {
      console.error(
        'SAVE STUDENT ASSIGNMENT ERROR:',
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to save assignment.'
      );
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  /* =======================================================
     DATE FORMATTER
  ======================================================= */

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return 'Not available';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Not available';
    }

    return date.toLocaleString(
      'en-KE',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    );
  }

  /* =======================================================
     PERCENTAGE
  ======================================================= */

  const percentage =
    effectiveTotalMarks > 0 &&
    submission?.marksAwarded !==
      null &&
    submission?.marksAwarded !==
      undefined
      ? Math.round(
          (Number(
            submission.marksAwarded
          ) /
            effectiveTotalMarks) *
            100
        )
      : 0;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-green" />

        <p className="mt-3 text-sm text-slate-500">
          Checking your submission...
        </p>
      </div>
    );
  }

  /* =======================================================
     ERROR WITHOUT SUBMISSION
  ======================================================= */

  if (
    error &&
    !submission
  ) {
    return (
      <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />

          <div>
            <p className="font-semibold text-red-800">
              Submission unavailable
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadSubmission()
              }
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     GRADED NOTICE
  ======================================================= */

  if (isGraded) {
    const awarded =
      Number(
        submission?.marksAwarded ??
          0
      );

    return (
      <section className="mt-10 space-y-6">
        {/* SCORE CARD */}

        <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
          <div className="bg-emerald-600 px-6 py-6 text-white sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Trophy className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Assignment Result
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Assignment Graded
                  </h2>

                  <p className="mt-1 text-sm text-white/80">
                    Your lecturer has reviewed
                    and graded your work.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white px-6 py-4 text-center text-emerald-700">
                <p className="text-xs font-bold uppercase tracking-wider">
                  Score
                </p>

                <p className="mt-1 text-3xl font-black">
                  {awarded}
                  <span className="text-base font-bold text-slate-400">
                    /{effectiveTotalMarks}
                  </span>
                </p>

                <p className="text-sm font-bold">
                  {percentage}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Submitted
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {formatDate(
                  submission?.submittedAt ??
                    null
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Graded
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {formatDate(
                  submission?.gradedAt ??
                    null
                )}
              </p>
            </div>
          </div>
        </div>

        {/* GENERAL FEEDBACK */}

        {submission?.lecturerFeedback && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green/10">
                <FileCheck2 className="h-5 w-5 text-brand-green" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Lecturer Feedback
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Feedback from your lecturer
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {
                  submission.lecturerFeedback
                }
              </p>
            </div>
          </div>
        )}

        {/* STATUS */}

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

          <p className="text-sm font-medium text-emerald-800">
            This assignment has been graded.
            Your submission is locked.
          </p>
        </div>
      </section>
    );
  }

  /* =======================================================
     SUBMITTED NOTICE
  ======================================================= */

  if (isSubmitted) {
    return (
      <section className="mt-10 rounded-3xl border border-emerald-200 bg-white shadow-sm">
        <div className="rounded-t-3xl bg-emerald-50 p-6 sm:p-8">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Submission Status
              </p>

              <h2 className="mt-1 text-xl font-bold text-emerald-900">
                Assignment Submitted
              </h2>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                Your answers have been
                successfully submitted and are
                now awaiting grading.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Status
            </p>

            <p className="mt-1 font-bold capitalize text-emerald-600">
              {normalizedStatus}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Submitted
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {formatDate(
                submission?.submittedAt ??
                  null
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Result
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Awaiting grading
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 p-6 sm:p-8">
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <p className="text-sm leading-6 text-amber-800">
              Your lecturer will review your
              answers and enter your marks.
              Once graded, your result and
              feedback will appear here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* =======================================================
     DRAFT / ANSWER FORM
  ======================================================= */

  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
              {submission
                ? 'Draft'
                : 'Not Submitted'}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-bold text-slate-900">
            Your Answers
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Answer each question carefully.
            You can save your work as a draft
            and continue later.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-5 py-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Progress
          </p>

          <p className="mt-1 text-xl font-bold text-slate-800">
            {answeredCount}/
            {questions.length}
          </p>

          <p className="text-xs text-slate-500">
            {answerPercentage}% answered
          </p>
        </div>
      </div>

      {/* PROGRESS BAR */}

      <div className="mt-6">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-green transition-all duration-300"
            style={{
              width: `${answerPercentage}%`,
            }}
          />
        </div>
      </div>

      {/* DRAFT NOTICE */}

      {submission && isDraft && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <Save className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

          <div>
            <p className="font-semibold text-blue-900">
              Draft saved
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Your previous answers have been
              loaded. Continue working and save
              your draft whenever you need.
            </p>
          </div>
        </div>
      )}

      {/* OVERDUE */}

      {isOverdue && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div>
            <p className="font-semibold text-red-800">
              Assignment deadline has passed
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              You can no longer submit this
              assignment.
            </p>
          </div>
        </div>
      )}

      {/* QUESTIONS */}

      <div className="mt-8 space-y-6">
        {questions.map(
          (question) => {
            const currentAnswer =
              answers[
                question.id
              ] || '';

            return (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
              >
                <div className="flex gap-4">
                  {/* QUESTION NUMBER */}

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green text-sm font-bold text-white">
                    {
                      question.questionNumber
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* QUESTION HEADER */}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-semibold leading-7 text-slate-800 sm:text-base">
                        {
                          question.question
                        }
                      </p>

                      <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                        {question.marks}{' '}
                        {question.marks ===
                        1
                          ? 'Mark'
                          : 'Marks'}
                      </span>
                    </div>

                    {/* ANSWER */}

                    <label
                      htmlFor={`answer-${question.id}`}
                      className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      Your Answer
                    </label>

                    <textarea
                      id={`answer-${question.id}`}
                      value={
                        currentAnswer
                      }
                      onChange={(
                        event
                      ) =>
                        updateAnswer(
                          question.id,
                          event.target
                            .value
                        )
                      }
                      disabled={
                        saving ||
                        submitting ||
                        isLocked
                      }
                      rows={7}
                      placeholder="Write your answer here..."
                      className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    {/* CHARACTER COUNT */}

                    <p className="mt-2 text-right text-xs text-slate-400">
                      {
                        currentAnswer.length
                      }{' '}
                      characters
                    </p>
                  </div>
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <p className="text-sm leading-6 text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* SUCCESS */}

      {message && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <p className="text-sm leading-6 text-emerald-700">
            {message}
          </p>
        </div>
      )}

      {/* ACTIONS */}

      <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-4 w-4" />

            <span>
              {dueDate
                ? `Deadline: ${formatDate(
                    dueDate
                  )}`
                : 'No deadline specified'}
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* SAVE DRAFT */}

            <button
              type="button"
              onClick={() =>
                saveSubmission(
                  'draft'
                )
              }
              disabled={
                saving ||
                submitting
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-green hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? 'Saving...'
                : 'Save Draft'}
            </button>

            {/* SUBMIT */}

            <button
              type="button"
              onClick={() =>
                saveSubmission(
                  'submit'
                )
              }
              disabled={
                saving ||
                submitting ||
                !allAnswered ||
                isOverdue
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}

              {submitting
                ? 'Submitting...'
                : 'Submit Assignment'}
            </button>
          </div>
        </div>

        {/* ANSWER STATUS */}

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Answer progress
            </p>

            <p className="text-xs font-medium text-slate-500">
              {answeredCount} of{' '}
              {questions.length}{' '}
              questions answered
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-green transition-all duration-300"
              style={{
                width: `${answerPercentage}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* SUBMIT WARNING */}

      <div className="mt-5 rounded-2xl bg-amber-50 p-4">
        <p className="text-xs leading-5 text-amber-800">
          <strong>Before submitting:</strong>{' '}
          Make sure you have answered every
          question. Once submitted, your
          answers cannot be changed.
        </p>
      </div>
    </section>
  );
}