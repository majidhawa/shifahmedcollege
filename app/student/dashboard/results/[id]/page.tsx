'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  MessageSquare,
  Paperclip,
  Target,
  XCircle,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type ResultType =
  | 'assignment'
  | 'quiz'
  | 'exam';

type Program = {
  id: number;
  name: string;
  code: string | null;
};

type AcademicContext = {
  id: number | null;
  name?: string | null;
  title?: string | null;
};

type AssignmentQuestion = {
  id: number;
  questionNumber: number;
  question: string;
  marks: number;
  marksAwarded: number;
  answer: {
    id: number;
    answerText: string | null;
    fileName: string | null;
    fileUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
    lecturerFeedback: string | null;
    gradedAt: string | null;
  } | null;
};

type QuizOption = {
  id: number;
  text: string;
  order: number;
  isCorrect?: boolean;
};

type QuizQuestion = {
  id: number;
  questionNumber: number;
  question: string;
  questionType: string;
  marks: number;
  marksAwarded: number;
  selectedOptionId: number | null;
  answerText: string | null;
  isCorrect: boolean | null;
  lecturerFeedback: string | null;
  gradedAt: string | null;
  options: QuizOption[];
  explanation?: string | null;
  correctAnswer?: unknown;
};

type Result = {
  id: string;

  type: ResultType;

  sourceId: number;

  submissionId?: number;

  quizId?: number;

  attemptId?: number;

  attemptNumber?: number;

  title: string;

  description?: string | null;

  instructions?: string | null;

  status: string;

  showResults?: boolean;

  showCorrectAnswers?: boolean;

  marksObtained?: number | null;

  totalMarks?: number | null;

  percentage?: number | null;

  grade?: string | null;

  passed?: boolean | null;

  passingScore?: number | null;

  submittedAt?: string | null;

  startedAt?: string | null;

  gradedAt?: string | null;

  dueDate?: string | null;

  feedback?: string | null;

  submission?: {
    submissionText: string | null;
    fileName: string | null;
    fileUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
  };

  program: Program;

  unit?: AcademicContext;

  topic?: AcademicContext;

  lesson?: AcademicContext;

  questions?: AssignmentQuestion[] | QuizQuestion[];
};

type ApiResponse = {
  success: boolean;

  message?: string;

  result?: Result;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-KE',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(
    'en-KE',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function formatNumber(
  value: number
): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function formatFileSize(
  bytes?: number | null
): string {
  if (
    bytes === null ||
    bytes === undefined ||
    Number.isNaN(bytes)
  ) {
    return '';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function getResultTypeLabel(
  type: ResultType
): string {
  switch (type) {
    case 'assignment':
      return 'Assignment';

    case 'exam':
      return 'Final Examination';

    default:
      return 'Quiz / CAT';
  }
}

function getStatusLabel(
  status: string
): string {
  switch (
    status.toLowerCase()
  ) {
    case 'graded':
      return 'Graded';

    case 'submitted':
      return 'Awaiting Grading';

    case 'pending':
      return 'Awaiting Grading';

    case 'awaiting_grading':
      return 'Awaiting Grading';

    case 'manual_grading':
      return 'Manual Grading';

    case 'in_progress':
      return 'In Progress';

    case 'draft':
      return 'Draft';

    default:
      return 'Awaiting Grading';
  }
}

function isFinalized(
  result: Result
): boolean {
  return (
    result.status.toLowerCase() ===
    'graded'
  );
}

function getPercentage(
  result: Result
): number | null {
  if (
    result.percentage !==
      null &&
    result.percentage !==
      undefined &&
    Number.isFinite(
      Number(result.percentage)
    )
  ) {
    return Number(
      result.percentage
    );
  }

  if (
    result.marksObtained !==
      null &&
    result.marksObtained !==
      undefined &&
    result.totalMarks !==
      null &&
    result.totalMarks !==
      undefined &&
    Number(result.totalMarks) > 0
  ) {
    return Number(
      (
        (Number(
          result.marksObtained
        ) /
          Number(
            result.totalMarks
          )) *
        100
      ).toFixed(2)
    );
  }

  return null;
}

function isWrittenQuestion(
  questionType: string
): boolean {
  const normalized =
    questionType
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

  return (
    normalized ===
      'short_answer' ||
    normalized ===
      'essay' ||
    normalized ===
      'long_answer' ||
    normalized ===
      'written' ||
    normalized.includes(
      'short_answer'
    ) ||
    normalized.includes(
      'essay'
    ) ||
    normalized.includes(
      'long_answer'
    )
  );
}

function getQuestionStatus(
  question: QuizQuestion,
  assessmentFinalized: boolean
): 'correct' | 'incorrect' | 'pending' {
  /*
   * Written questions are controlled by lecturer grading.
   *
   * A written question can legitimately receive 0 marks,
   * therefore marksAwarded === 0 must NOT automatically
   * mean that the question is ungraded.
   */
  if (
    isWrittenQuestion(
      question.questionType
    )
  ) {
    if (
      question.gradedAt ||
      question.isCorrect !== null
    ) {
      return question.marksAwarded > 0
        ? 'correct'
        : 'incorrect';
    }

    /*
     * If the complete assessment is already finalized,
     * treat the written question as graded even when the
     * older API does not expose a per-question graded flag.
     */
    if (assessmentFinalized) {
      return question.marksAwarded > 0
        ? 'correct'
        : 'incorrect';
    }

    return 'pending';
  }

  if (
    question.isCorrect ===
    true
  ) {
    return 'correct';
  }

  if (
    question.isCorrect ===
    false
  ) {
    return 'incorrect';
  }

  return assessmentFinalized
    ? question.marksAwarded > 0
      ? 'correct'
      : 'incorrect'
    : 'pending';
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ResultDetailsPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const resultId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const [result, setResult] =
    useState<Result | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    expandedQuestions,
    setExpandedQuestions,
  ] = useState<
    Set<number>
  >(new Set());

  /* =======================================================
     FETCH RESULT
  ======================================================= */

  const fetchResult =
    useCallback(
      async () => {
        if (!resultId) {
          setError(
            'Invalid result.'
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);

          setError('');

          const response =
            await fetch(
              `/api/student/results/${encodeURIComponent(
                resultId
              )}`,
              {
                method: 'GET',

                credentials:
                  'include',

                cache: 'no-store',

                headers: {
                  Accept:
                    'application/json',

                  'Cache-Control':
                    'no-cache',
                },
              }
            );

          const data =
            (await response.json()) as ApiResponse;

          if (!response.ok) {
            throw new Error(
              data.message ||
                'Unable to load this result.'
            );
          }

          if (
            !data.success ||
            !data.result
          ) {
            throw new Error(
              data.message ||
                'Result was not found.'
            );
          }

          setResult(
            data.result
          );
        } catch (err: unknown) {
          console.error(
            'RESULT DETAILS ERROR:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load this result.'
          );
        } finally {
          setLoading(false);
        }
      },
      [resultId]
    );

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  /* =======================================================
     QUESTION DATA
  ======================================================= */

  const questions =
    useMemo(() => {
      return (
        result?.questions ||
        []
      );
    }, [result]);

  const quizQuestions =
    result?.type ===
    'assignment'
      ? []
      : (questions as QuizQuestion[]);

  const assignmentQuestions =
    result?.type ===
    'assignment'
      ? (questions as AssignmentQuestion[])
      : [];

  /* =======================================================
     GRADING STATE
  ======================================================= */

  const assessmentFinalized =
    result
      ? isFinalized(result)
      : false;

  const hasWrittenQuestions =
    useMemo(() => {
      if (
        result?.type ===
        'assignment'
      ) {
        return true;
      }

      return quizQuestions.some(
        (question) =>
          isWrittenQuestion(
            question.questionType
          )
      );
    }, [
      result?.type,
      quizQuestions,
    ]);

  const pendingWrittenQuestions =
    useMemo(() => {
      if (
        result?.type ===
        'assignment'
      ) {
        return false;
      }

      return quizQuestions.some(
        (question) =>
          isWrittenQuestion(
            question.questionType
          ) &&
          !question.gradedAt &&
          question.isCorrect === null &&
          !assessmentFinalized
      );
    }, [
      result?.type,
      quizQuestions,
      assessmentFinalized,
    ]);

  /*
   * The assessment status is authoritative.
   *
   * This prevents a temporary score such as 0/10 from
   * being displayed as a final failed result while the
   * lecturer is still grading written questions.
   */
  const gradingState = useMemo(() => {
    if (!result) {
      return 'pending' as const;
    }

    if (assessmentFinalized) {
      return 'finalized' as const;
    }

    if (
      result.status.toLowerCase() ===
      'manual_grading'
    ) {
      return 'manual' as const;
    }

    if (
      pendingWrittenQuestions ||
      hasWrittenQuestions
    ) {
      return 'pending' as const;
    }

    return 'pending' as const;
  }, [
    result,
    assessmentFinalized,
    pendingWrittenQuestions,
    hasWrittenQuestions,
  ]);

  const percentage =
    result
      ? getPercentage(result)
      : null;

  const hasFinalScore =
    assessmentFinalized &&
    result?.marksObtained !==
      null &&
    result?.marksObtained !==
      undefined &&
    result?.totalMarks !==
      null &&
    result?.totalMarks !==
      undefined;

  const isPassed =
    assessmentFinalized &&
    result?.passed === true;

  const isFailed =
    assessmentFinalized &&
    result?.passed === false;

  const resultTypeLabel =
    result
      ? getResultTypeLabel(
          result.type
        )
      : '';

  /* =======================================================
     TOGGLE QUESTION
  ======================================================= */

  function toggleQuestion(
    questionId: number
  ) {
    setExpandedQuestions(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(
            questionId
          )
        ) {
          next.delete(
            questionId
          );
        } else {
          next.add(
            questionId
          );
        }

        return next;
      }
    );
  }

  function expandAll() {
    setExpandedQuestions(
      new Set(
        questions.map(
          (question) =>
            Number(
              question.id
            )
        )
      )
    );
  }

  function collapseAll() {
    setExpandedQuestions(
      new Set()
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9f8]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Loading result...
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please wait while we retrieve your assessment result.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error ||
    !result
  ) {
    return (
      <div className="min-h-screen bg-[#f7f9f8]">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Result unavailable
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                'We could not find the requested result.'}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  fetchResult
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f4f3f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c4235]"
              >
                Try Again
              </button>

              <Link
                href="/student/dashboard/results"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />

                Back to Results
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/student/dashboard/results"
                className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0f4f3f] transition hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />

                Back to Results
              </Link>

              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  {result.type ===
                  'assignment' ? (
                    <FileText className="h-5 w-5 text-emerald-700" />
                  ) : result.type ===
                    'exam' ? (
                    <GraduationCap className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <BookOpen className="h-5 w-5 text-emerald-700" />
                  )}
                </div>

                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      {resultTypeLabel}
                    </span>

                    <StatusBadge
                      result={result}
                    />
                  </div>

                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {result.title}
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    {result.program.name}

                    {result.program.code
                      ? ` • ${result.program.code}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>

            {result.type !==
              'assignment' &&
              result.attemptNumber && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-slate-500">
                    Attempt
                  </span>

                  <span className="ml-2 font-bold text-slate-900">
                    #
                    {
                      result.attemptNumber
                    }
                  </span>
                </div>
              )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* =================================================
            FINAL GRADING STATUS
        ================================================= */}

        {!assessmentFinalized && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 bg-amber-50/70 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Clock3 className="h-5 w-5 text-amber-700" />
                </div>

                <div>
                  <h2 className="font-bold text-amber-900">
                    {gradingState ===
                    'manual'
                      ? 'Manual grading in progress'
                      : 'Awaiting lecturer grading'}
                  </h2>

                  <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-800/80">
                    {result.type ===
                    'assignment'
                      ? 'Your submission has been received. Your final marks will appear after the lecturer completes the required grading.'
                      : hasWrittenQuestions
                        ? 'Your assessment has been submitted successfully. Written questions such as short answers and essays must be graded by the lecturer before your final result is released.'
                        : 'Your assessment has been submitted and is awaiting final result processing.'}
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold text-amber-700">
                Final result pending
              </span>
            </div>
          </section>
        )}

        {/* =================================================
            RESULT HERO
        ================================================= */}

        {result.showResults !==
          false && (
          <section className="overflow-hidden rounded-3xl bg-[#0f4f3f] shadow-xl">
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />

              <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-white/5" />

              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="text-white">
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/60">
                    {assessmentFinalized
                      ? 'Final Assessment Result'
                      : 'Assessment Submission'}
                  </p>

                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    {result.title}
                  </h2>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {result.program && (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90">
                        <GraduationCap className="h-4 w-4" />

                        {result.program.name}
                      </div>
                    )}

                    {result.unit?.name && (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90">
                        <BookOpen className="h-4 w-4" />

                        {result.unit.name}
                      </div>
                    )}
                  </div>

                  {!assessmentFinalized && (
                    <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/90">
                      <Clock3 className="h-4 w-4 text-[#d7a93b]" />

                      Awaiting Lecturer Grading
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center rounded-3xl bg-white p-6 text-center shadow-xl sm:min-w-[230px]">
                  {hasFinalScore ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Final Score
                      </p>

                      <div className="mt-2 text-5xl font-black text-[#0f4f3f]">
                        {formatNumber(
                          Number(
                            result.marksObtained
                          )
                        )}

                        <span className="text-2xl text-slate-400">
                          /
                          {
                            result.totalMarks
                          }
                        </span>
                      </div>

                      {percentage !==
                        null && (
                        <div className="mt-2 text-lg font-bold text-slate-700">
                          {percentage.toFixed(
                            2
                          )}
                          %
                        </div>
                      )}

                      {result.grade && (
                        <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7a93b]/20 text-2xl font-black text-[#a47b13]">
                          {
                            result.grade
                          }
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                        <Clock3 className="h-7 w-7 text-amber-600" />
                      </div>

                      <p className="mt-3 text-base font-bold text-slate-900">
                        Awaiting grading
                      </p>

                      <p className="mt-1 max-w-[190px] text-xs leading-5 text-slate-500">
                        Your final score will appear after all required grading is completed.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            RESULTS HIDDEN NOTICE
        ================================================= */}

        {result.showResults ===
          false && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                <Info className="h-6 w-6 text-amber-700" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-amber-900">
                  Results are currently hidden
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  You have submitted this assessment, but the lecturer has configured the assessment so that results are not currently visible to students.
                </p>

                {result.submittedAt && (
                  <p className="mt-3 text-xs font-semibold text-amber-700">
                    Submitted:{' '}
                    {formatDateTime(
                      result.submittedAt
                    )}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        {result.showResults !==
          false && (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={
                <Target className="h-5 w-5" />
              }
              label="Marks Obtained"
              value={
                hasFinalScore
                  ? `${formatNumber(
                      Number(
                        result.marksObtained
                      )
                    )}/${formatNumber(
                      Number(
                        result.totalMarks
                      )
                    )}`
                  : 'Pending'
              }
            />

            <SummaryCard
              icon={
                <Award className="h-5 w-5" />
              }
              label="Percentage"
              value={
                assessmentFinalized &&
                percentage !==
                  null
                  ? `${percentage.toFixed(
                      2
                    )}%`
                  : 'Pending'
              }
            />

            <SummaryCard
              icon={
                <GraduationCap className="h-5 w-5" />
              }
              label="Grade"
              value={
                assessmentFinalized &&
                result.grade
                  ? result.grade
                  : 'Pending'
              }
            />

            <SummaryCard
              icon={
                isPassed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isFailed ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <Clock3 className="h-5 w-5" />
                )
              }
              label="Result"
              value={
                isPassed
                  ? 'Passed'
                  : isFailed
                    ? 'Failed'
                    : 'Pending'
              }
            />
          </section>
        )}

        {/* =================================================
            ASSESSMENT INFORMATION
        ================================================= */}

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Info className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Assessment Information
                </h2>

                <p className="text-xs text-slate-500">
                  Details about this assessment
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem
                label="Assessment Type"
                value={
                  resultTypeLabel
                }
              />

              <InfoItem
                label="Program"
                value={
                  result.program.name
                }
              />

              <InfoItem
                label="Unit"
                value={
                  result.unit?.name ||
                  '—'
                }
              />

              <InfoItem
                label="Topic"
                value={
                  result.topic
                    ?.title ||
                  '—'
                }
              />

              <InfoItem
                label="Lesson"
                value={
                  result.lesson
                    ?.title ||
                  '—'
                }
              />

              {result.type !==
                'assignment' && (
                <>
                  <InfoItem
                    label="Attempt"
                    value={
                      result.attemptNumber
                        ? `Attempt #${result.attemptNumber}`
                        : '—'
                    }
                  />

                  <InfoItem
                    label="Passing Score"
                    value={
                      result.passingScore !==
                      null &&
                      result.passingScore !==
                        undefined
                        ? `${result.passingScore}%`
                        : '50%'
                    }
                  />
                </>
              )}

              <InfoItem
                label="Submitted"
                value={formatDateTime(
                  result.submittedAt
                )}
              />

              <InfoItem
                label="Grading Status"
                value={
                  assessmentFinalized
                    ? 'Finalized'
                    : 'Awaiting Lecturer Grading'
                }
              />

              {assessmentFinalized && (
                <InfoItem
                  label="Graded"
                  value={formatDateTime(
                    result.gradedAt
                  )}
                />
              )}

              {result.type ===
                'assignment' && (
                <InfoItem
                  label="Due Date"
                  value={formatDateTime(
                    result.dueDate
                  )}
                />
              )}
            </div>
          </div>

          {/* STATUS CARD */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">
              Result Status
            </h2>

            <div className="mt-5">
              {isPassed ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />

                  <h3 className="mt-3 font-bold text-emerald-900">
                    Congratulations!
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    You achieved the required passing score for this assessment.
                  </p>
                </div>
              ) : isFailed ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <XCircle className="h-8 w-8 text-red-600" />

                  <h3 className="mt-3 font-bold text-red-900">
                    Assessment not passed
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-red-800">
                    Review the feedback and continue working on the areas that need improvement.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <Clock3 className="h-8 w-8 text-amber-600" />

                  <h3 className="mt-3 font-bold text-amber-900">
                    Awaiting final result
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {hasWrittenQuestions
                      ? 'The lecturer must complete the required written-question grading before the final score is released.'
                      : 'This assessment is still awaiting final result processing.'}
                  </p>
                </div>
              )}
            </div>

            {result.feedback && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-700" />

                  <span className="text-sm font-bold text-slate-900">
                    Lecturer Feedback
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {
                    result.feedback
                  }
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            ASSIGNMENT SUBMISSION
        ================================================= */}

        {result.type ===
          'assignment' &&
          result.submission && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <FileText className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  My Submission
                </h2>

                <p className="text-xs text-slate-500">
                  Your submitted assignment
                </p>
              </div>
            </div>

            {result.submission
              .submissionText && (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Submission
                </p>

                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {
                    result
                      .submission
                      .submissionText
                  }
                </p>
              </div>
            )}

            {result.submission
              .fileName && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Paperclip className="h-5 w-5 text-slate-500" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {
                        result
                          .submission
                          .fileName
                      }
                    </p>

                    {result
                      .submission
                      .fileSize && (
                      <p className="text-xs text-slate-500">
                        {formatFileSize(
                          result
                            .submission
                            .fileSize
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {result.submission
                  .fileUrl && (
                  <a
                    href={
                      result
                        .submission
                        .fileUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />

                    Open File
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        {/* =================================================
            QUESTIONS
        ================================================= */}

        {result.showResults !==
          false &&
          questions.length >
            0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">
                      {result.type ===
                      'assignment'
                        ? 'Question Breakdown'
                        : 'Question Results'}
                    </h2>

                    {!assessmentFinalized &&
                      result.type !==
                        'assignment' && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          Grading in progress
                        </span>
                      )}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {assessmentFinalized
                      ? 'Review your answers, awarded marks and feedback for each question.'
                      : 'Your submitted answers are shown below. Final marks will be released after required grading is completed.'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={
                      expandAll
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Expand All
                  </button>

                  <button
                    type="button"
                    onClick={
                      collapseAll
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {result.type ===
                'assignment' &&
                assignmentQuestions.map(
                  (
                    question
                  ) => {
                    const open =
                      expandedQuestions.has(
                        question.id
                      );

                    const awarded =
                      Number(
                        question.marksAwarded ||
                          0
                      );

                    const max =
                      Number(
                        question.marks ||
                          0
                      );

                    return (
                      <AssignmentQuestionRow
                        key={
                          question.id
                        }
                        question={
                          question
                        }
                        open={
                          open
                        }
                        awarded={
                          awarded
                        }
                        max={max}
                        assessmentFinalized={
                          assessmentFinalized
                        }
                        onToggle={() =>
                          toggleQuestion(
                            question.id
                          )
                        }
                      />
                    );
                  }
                )}

              {result.type !==
                'assignment' &&
                quizQuestions.map(
                  (
                    question
                  ) => {
                    const open =
                      expandedQuestions.has(
                        question.id
                      );

                    return (
                      <QuizQuestionRow
                        key={
                          question.id
                        }
                        question={
                          question
                        }
                        open={
                          open
                        }
                        assessmentFinalized={
                          assessmentFinalized
                        }
                        showCorrectAnswers={
                          result.showCorrectAnswers ===
                          true
                        }
                        onToggle={() =>
                          toggleQuestion(
                            question.id
                          )
                        }
                      />
                    );
                  }
                )}
            </div>
          </section>
        )}

        {/* =================================================
            FINAL NOTE
        ================================================= */}

        {!assessmentFinalized && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

            <p className="text-xs leading-5 text-amber-800">
              This assessment has been submitted successfully.
              {hasWrittenQuestions
                ? ' Written responses are awaiting lecturer grading. Your final score, percentage, grade and pass/fail status will be updated once grading is complete.'
                : ' The final result is still being processed.'}
            </p>
          </div>
        )}

        {assessmentFinalized && (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

            <p className="text-xs leading-5 text-slate-600">
              This result has been finalized by the Shifah Medical Training College learning management system. If you believe there is an error in your marks, please contact your lecturer or academic administration.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  result,
}: {
  result: Result;
}) {
  const finalized =
    isFinalized(result);

  if (finalized) {
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          result.passed
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-red-50 text-red-700'
        }`}
      >
        {result.passed
          ? 'Passed'
          : 'Failed'}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
      {getStatusLabel(
        result.status
      )}
    </span>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;

  label: string;

  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   ASSIGNMENT QUESTION
========================================================= */

function AssignmentQuestionRow({
  question,
  open,
  awarded,
  max,
  assessmentFinalized,
  onToggle,
}: {
  question: AssignmentQuestion;

  open: boolean;

  awarded: number;

  max: number;

  assessmentFinalized: boolean;

  onToggle: () => void;
}) {
  const percentage =
    max > 0
      ? (awarded / max) * 100
      : 0;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 sm:p-6"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">
          {
            question.questionNumber
          }
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-slate-800">
            {question.question}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {assessmentFinalized
              ? `${awarded} / ${max} marks`
              : 'Marks pending'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {assessmentFinalized ? (
            <ScoreBadge
              awarded={awarded}
              max={max}
              percentage={
                percentage
              }
            />
          ) : (
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-700">
              Pending
            </span>
          )}

          {open ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
          <div className="rounded-2xl bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Question
            </p>

            <p className="mt-2 text-sm leading-7 text-slate-800">
              {question.question}
            </p>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Your Answer
              </p>

              {question.answer
                ?.answerText ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {
                    question
                      .answer
                      .answerText
                  }
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-400">
                  No written answer submitted.
                </p>
              )}
            </div>

            {question.answer
              ?.fileName && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <Paperclip className="h-4 w-4 text-slate-400" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {
                      question
                        .answer
                        .fileName
                    }
                  </p>

                  {question
                    .answer
                    .fileSize && (
                    <p className="text-xs text-slate-400">
                      {formatFileSize(
                        question
                          .answer
                          .fileSize
                      )}
                    </p>
                  )}
                </div>

                {question
                  .answer
                  .fileUrl && (
                  <a
                    href={
                      question
                        .answer
                        .fileUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Open
                  </a>
                )}
              </div>
            )}

            {assessmentFinalized && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Marks Awarded
                  </span>

                  <span className="text-lg font-black text-slate-900">
                    {awarded} / {max}
                  </span>
                </div>
              </div>
            )}

            {!assessmentFinalized && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />

                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Awaiting Lecturer Grading
                  </p>
                </div>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Your written response has been submitted. The lecturer will award marks before this question contributes to your final result.
                </p>
              </div>
            )}

            {question.answer
              ?.lecturerFeedback && (
              <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-700" />

                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Lecturer Feedback
                  </p>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {
                    question
                      .answer
                      .lecturerFeedback
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   QUIZ QUESTION
========================================================= */

function QuizQuestionRow({
  question,
  open,
  assessmentFinalized,
  showCorrectAnswers,
  onToggle,
}: {
  question: QuizQuestion;

  open: boolean;

  assessmentFinalized: boolean;

  showCorrectAnswers: boolean;

  onToggle: () => void;
}) {
  const status =
    getQuestionStatus(
      question,
      assessmentFinalized
    );

  const written =
    isWrittenQuestion(
      question.questionType
    );

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 sm:p-6"
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
            status ===
            'correct'
              ? 'bg-emerald-50 text-emerald-700'
              : status ===
                  'incorrect'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
          }`}
        >
          {
            question.questionNumber
          }
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-slate-800">
            {question.question}
          </p>

          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {assessmentFinalized ? (
              <span className="text-slate-400">
                {question.marksAwarded} /{' '}
                {question.marks}{' '}
                marks
              </span>
            ) : written ? (
              <span className="font-semibold text-amber-600">
                Marks pending
              </span>
            ) : (
              <span className="text-slate-400">
                {question.marksAwarded} /{' '}
                {question.marks}{' '}
                marks
              </span>
            )}

            {status ===
              'correct' && (
              <span className="font-semibold text-emerald-600">
                {written
                  ? 'Graded'
                  : 'Correct'}
              </span>
            )}

            {status ===
              'incorrect' && (
              <span className="font-semibold text-red-600">
                {written
                  ? 'Graded'
                  : 'Incorrect'}
              </span>
            )}

            {status ===
              'pending' && (
              <span className="font-semibold text-amber-600">
                Pending
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status ===
            'correct' && (
            <CheckCircle2 className="hidden h-5 w-5 text-emerald-500 sm:block" />
          )}

          {status ===
            'incorrect' && (
            <XCircle className="hidden h-5 w-5 text-red-500 sm:block" />
          )}

          {status ===
            'pending' && (
            <Clock3 className="hidden h-5 w-5 text-amber-500 sm:block" />
          )}

          {open ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
          <div className="rounded-2xl bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                {question.questionType}
              </span>

              {assessmentFinalized ? (
                <span className="text-sm font-bold text-slate-700">
                  {
                    question.marksAwarded
                  } /{' '}
                  {
                    question.marks
                  }{' '}
                  marks
                </span>
              ) : written ? (
                <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  Awaiting grading
                </span>
              ) : (
                <span className="text-sm font-bold text-slate-700">
                  {
                    question.marksAwarded
                  } /{' '}
                  {
                    question.marks
                  }{' '}
                  marks
                </span>
              )}
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-800">
              {question.question}
            </p>

            {/* OPTIONS */}

            {question.options &&
              question.options
                .length > 0 && (
                <div className="mt-5 space-y-2">
                  {question.options.map(
                    (
                      option
                    ) => {
                      const selected =
                        question.selectedOptionId ===
                        option.id;

                      const correct =
                        option.isCorrect ===
                        true;

                      let className =
                        'border-slate-200 bg-white';

                      if (
                        selected &&
                        correct
                      ) {
                        className =
                          'border-emerald-300 bg-emerald-50';
                      } else if (
                        selected &&
                        !correct
                      ) {
                        className =
                          'border-red-300 bg-red-50';
                      } else if (
                        showCorrectAnswers &&
                        correct
                      ) {
                        className =
                          'border-emerald-200 bg-emerald-50/50';
                      }

                      return (
                        <div
                          key={
                            option.id
                          }
                          className={`rounded-xl border p-3 ${className}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {String.fromCharCode(
                                65 +
                                  option.order -
                                  1
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-700">
                                {
                                  option.text
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap gap-2">
                                {selected && (
                                  <span className="text-xs font-bold text-emerald-700">
                                    Your answer
                                  </span>
                                )}

                                {showCorrectAnswers &&
                                  correct && (
                                  <span className="text-xs font-bold text-emerald-600">
                                    Correct answer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

            {/* TEXT ANSWER */}

            {question.answerText && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Your Answer
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {
                    question.answerText
                  }
                </p>
              </div>
            )}

            {/* WRITTEN QUESTION PENDING */}

            {written &&
              !assessmentFinalized && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />

                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Awaiting Lecturer Grading
                  </p>
                </div>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  This written response has been submitted but has not yet been finalized by the lecturer.
                </p>
              </div>
            )}

            {/* CORRECT ANSWER */}

            {showCorrectAnswers &&
              question.correctAnswer !==
                undefined &&
              question.correctAnswer !==
                null && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Correct Answer
                </p>

                <p className="mt-2 text-sm font-semibold text-emerald-900">
                  {String(
                    question.correctAnswer
                  )}
                </p>
              </div>
            )}

            {/* EXPLANATION */}

            {showCorrectAnswers &&
              question.explanation && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Explanation
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-900">
                  {
                    question.explanation
                  }
                </p>
              </div>
            )}

            {/* FEEDBACK */}

            {question.lecturerFeedback && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-700" />

                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Lecturer Feedback
                  </p>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {
                    question.lecturerFeedback
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SCORE BADGE
========================================================= */

function ScoreBadge({
  awarded,
  max,
  percentage,
}: {
  awarded: number;

  max: number;

  percentage: number;
}) {
  let classes =
    'bg-slate-100 text-slate-600';

  if (percentage >= 80) {
    classes =
      'bg-emerald-50 text-emerald-700';
  } else if (
    percentage >= 50
  ) {
    classes =
      'bg-amber-50 text-amber-700';
  } else {
    classes =
      'bg-red-50 text-red-700';
  }

  return (
    <div
      className={`rounded-xl px-3 py-2 text-center ${classes}`}
    >
      <p className="text-xs font-black">
        {awarded}/{max}
      </p>

      <p className="text-[10px] font-semibold opacity-75">
        {percentage.toFixed(0)}%
      </p>
    </div>
  );
}

