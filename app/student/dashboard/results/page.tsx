'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type ResultType =
  | 'assignment'
  | 'quiz'
  | 'exam';

type ResultStatus =
  | 'graded'
  | 'submitted'
  | 'pending'
  | 'awaiting_grading'
  | 'manual_grading'
  | 'in_progress'
  | string;

type Result = {
  id: string;

  sourceId: number;

  type: ResultType;

  title: string;

  marksObtained: number;

  totalMarks: number;

  percentage: number;

  grade: string;

  passed: boolean;

  status: ResultStatus;

  submittedAt: string | null;

  gradedAt: string | null;

  attemptNumber: number | null;

  program: {
    id: number;
    name: string;
    code: string | null;
  };

  unit: {
    id: number | null;
    name: string | null;
  };

  topic: {
    id: number | null;
    title: string | null;
  };

  lesson: {
    id: number | null;
    title: string | null;
  };

  feedback: string | null;
};

type ProgramSummary = {
  id: number;

  name: string;

  code: string | null;

  marksObtained: number;

  totalMarks: number;

  assessmentCount: number;

  percentage: number;

  grade: string;

  passed: boolean;
};

type ApiResponse = {
  success: boolean;

  message?: string;

  student?: {
    applicationId: number;

    name: string;

    applicationNumber: string | null;

    admissionNumber: string | null;
  };

  summary?: {
    totalAssessments: number;

    assignments: number;

    quizzes: number;

    exams: number;

    passed: number;

    failed: number;

    totalMarksObtained: number;

    totalPossibleMarks: number;

    overallPercentage: number;

    overallGrade: string | null;
  };

  programs?: ProgramSummary[];

  results?: Result[];
};

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTypeLabel(type: ResultType): string {
  switch (type) {
    case 'assignment':
      return 'Assignment';

    case 'exam':
      return 'Final Examination';

    default:
      return 'Quiz / CAT';
  }
}

function getTypeIcon(type: ResultType) {
  switch (type) {
    case 'assignment':
      return <ClipboardCheck className="h-5 w-5" />;

    case 'exam':
      return <GraduationCap className="h-5 w-5" />;

    default:
      return <BarChart3 className="h-5 w-5" />;
  }
}

function getTypeClasses(type: ResultType): string {
  switch (type) {
    case 'assignment':
      return 'bg-blue-50 text-blue-700';

    case 'exam':
      return 'bg-purple-50 text-purple-700';

    default:
      return 'bg-emerald-50 text-emerald-700';
  }
}

function getGradeClasses(grade: string): string {
  switch (grade.toUpperCase()) {
    case 'A':
      return 'bg-emerald-100 text-emerald-800';

    case 'B':
      return 'bg-blue-100 text-blue-800';

    case 'C':
      return 'bg-amber-100 text-amber-800';

    case 'D':
      return 'bg-orange-100 text-orange-800';

    default:
      return 'bg-red-100 text-red-800';
  }
}

/* =========================================================
   RESULT STATUS HELPERS
========================================================= */

function isResultFinalized(result: Result): boolean {
  return result.status.toLowerCase() === 'graded';
}

function isResultPending(result: Result): boolean {
  return !isResultFinalized(result);
}

function getStatusLabel(result: Result): string {
  if (isResultFinalized(result)) {
    return result.passed ? 'Passed' : 'Failed';
  }

  switch (result.status.toLowerCase()) {
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

    default:
      return 'Awaiting Grading';
  }
}

function getStatusClasses(result: Result): string {
  if (!isResultFinalized(result)) {
    return 'bg-amber-50 text-amber-700 border border-amber-100';
  }

  return result.passed
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    : 'bg-red-50 text-red-700 border border-red-100';
}

/* =========================================================
   PAGE
========================================================= */

export default function StudentResultsPage() {
  const [data, setData] =
    useState<ApiResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [filter, setFilter] =
    useState<'all' | ResultType>('all');

  /* =======================================================
     LOAD RESULTS
  ======================================================= */

  async function loadResults(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response =
        await fetch(
          '/api/student/results',
          {
            method: 'GET',

            credentials: 'include',

            cache: 'no-store',

            headers: {
              'Cache-Control':
                'no-cache',
            },
          }
        );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            'Unable to load results.'
        );
      }

      if (!result.success) {
        throw new Error(
          result.message ||
            'Unable to load results.'
        );
      }

      setData(result);
    } catch (err: unknown) {
      console.error(
        'STUDENT RESULTS PAGE ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your results.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  /* =======================================================
     FILTER RESULTS
  ======================================================= */

  const filteredResults =
    useMemo(() => {
      const results =
        data?.results || [];

      if (filter === 'all') {
        return results;
      }

      return results.filter(
        (result) =>
          result.type === filter
      );
    }, [
      data?.results,
      filter,
    ]);

  /* =======================================================
     RESULT COUNTS
  ======================================================= */

  const resultStats =
    useMemo(() => {
      const results =
        data?.results || [];

      const finalized =
        results.filter(
          isResultFinalized
        );

      const pending =
        results.filter(
          isResultPending
        );

      return {
        total: results.length,
        finalized: finalized.length,
        pending: pending.length,
        passed: finalized.filter(
          (result) =>
            result.passed
        ).length,
        failed: finalized.filter(
          (result) =>
            !result.passed
        ).length,
      };
    }, [data?.results]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9f8]">
        <div className="flex min-h-[70vh] items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Loading your results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please wait while we prepare your academic performance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f9f8]">
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Unable to load results
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadResults()
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c4235]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const summary =
    data?.summary || {
      totalAssessments: 0,
      assignments: 0,
      quizzes: 0,
      exams: 0,
      passed: 0,
      failed: 0,
      totalMarksObtained: 0,
      totalPossibleMarks: 0,
      overallPercentage: 0,
      overallGrade: null,
    };

  const programs =
    data?.programs || [];

  const overallPercentage =
    Number(
      summary.overallPercentage || 0
    );

  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="mb-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Award className="h-3.5 w-3.5" />
                Academic Results
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                My Results
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                View your performance across assignments, quizzes and final examinations.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadResults(true)
              }
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />

              {refreshing
                ? 'Refreshing...'
                : 'Refresh'}
            </button>
          </div>
        </section>

        {/* =================================================
            STUDENT INFO
        ================================================= */}

        {data?.student && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f4f3f] text-sm font-bold text-white ring-2 ring-[#d7a93b]/60">
                  {data.student.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="font-bold text-slate-900">
                    {data.student.name}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {data.student.admissionNumber
                      ? `Admission No. ${data.student.admissionNumber}`
                      : data.student.applicationNumber
                        ? `Application No. ${data.student.applicationNumber}`
                        : 'Student Portal'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:flex sm:items-center sm:gap-8">
                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Assessments
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {summary.totalAssessments}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Awaiting Grading
                  </p>

                  <p className="mt-1 text-xl font-bold text-amber-600">
                    {resultStats.pending}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            PENDING GRADING NOTICE
        ================================================= */}

        {resultStats.pending > 0 && (
          <section className="mb-7 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 bg-amber-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-amber-900">
                    {resultStats.pending}{' '}
                    assessment
                    {resultStats.pending ===
                    1
                      ? ''
                      : 's'}{' '}
                    awaiting grading
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-800/80">
                    Your assessment has been submitted successfully. If it contains written questions, the lecturer must grade those questions before the final result is released.
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold text-amber-700">
                Final result pending
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            OVERALL PERFORMANCE
        ================================================= */}

        <section className="mb-7 overflow-hidden rounded-3xl bg-[#0c1f1a] text-white shadow-xl">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">

            {/* LEFT */}
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/60">
                <TrendingUp className="h-4 w-4" />
                Overall Academic Performance
              </div>

              <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                    Finalized Score
                  </p>

                  <p className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                    {formatNumber(
                      summary.totalMarksObtained
                    )}

                    <span className="ml-2 text-2xl font-medium text-white/40">
                      /
                      {formatNumber(
                        summary.totalPossibleMarks
                      )}
                    </span>
                  </p>
                </div>

                <div className="sm:pb-1">
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white">
                    {overallPercentage.toFixed(
                      2
                    )}
                    %
                  </span>
                </div>
              </div>

              <p className="mt-5 max-w-xl text-sm leading-6 text-white/60">
                Your overall performance is based on assessments whose grading has been finalized. Assessments still awaiting lecturer grading are not treated as final results.
              </p>

              <div className="mt-7 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#d7a93b] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        overallPercentage
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* RIGHT */}
            <div className="border-t border-white/10 bg-white/5 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Overall Grade
              </p>

              <div className="mt-4 flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#d7a93b] text-4xl font-black text-[#0c1f1a]">
                  {summary.overallGrade ||
                    '—'}
                </div>

                <div>
                  <p className="text-lg font-bold">
                    {summary.overallGrade
                      ? 'Current Performance'
                      : 'No Final Results Yet'}
                  </p>

                  <p className="mt-1 text-sm text-white/50">
                    {resultStats.passed}{' '}
                    passed ·{' '}
                    {resultStats.failed}{' '}
                    failed
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <MiniDarkStat
                  label="Assignments"
                  value={
                    summary.assignments
                  }
                />

                <MiniDarkStat
                  label="Quizzes / CATs"
                  value={
                    summary.quizzes
                  }
                />

                <MiniDarkStat
                  label="Examinations"
                  value={
                    summary.exams
                  }
                />

                <MiniDarkStat
                  label="Pending"
                  value={
                    resultStats.pending
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            PERFORMANCE STATS
        ================================================= */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              <ClipboardCheck className="h-5 w-5" />
            }
            label="Assignments"
            value={
              summary.assignments
            }
            description="Submitted assignments"
          />

          <StatCard
            icon={
              <BarChart3 className="h-5 w-5" />
            }
            label="Quizzes / CATs"
            value={
              summary.quizzes
            }
            description="Completed assessments"
          />

          <StatCard
            icon={
              <GraduationCap className="h-5 w-5" />
            }
            label="Examinations"
            value={
              summary.exams
            }
            description="Final examinations"
          />

          <StatCard
            icon={
              <Clock3 className="h-5 w-5" />
            }
            label="Awaiting Grading"
            value={
              resultStats.pending
            }
            description="Awaiting lecturer grading"
            highlight={
              resultStats.pending > 0
            }
          />
        </section>

        {/* =================================================
            PROGRAM PERFORMANCE
        ================================================= */}

        {programs.length > 0 && (
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Performance by Course
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your combined finalized assessment performance in each enrolled course.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {programs.map(
                (program) => (
                  <div
                    key={program.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-900">
                            {program.name}
                          </h3>

                          {program.code && (
                            <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                              {program.code}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`rounded-lg px-2.5 py-1 text-sm font-bold ${getGradeClasses(
                          program.grade
                        )}`}
                      >
                        {program.grade}
                      </span>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-2xl font-black text-slate-900">
                          {formatNumber(
                            program.marksObtained
                          )}

                          <span className="ml-1 text-sm font-medium text-slate-400">
                            /
                            {formatNumber(
                              program.totalMarks
                            )}
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {program.assessmentCount}{' '}
                          {program.assessmentCount ===
                          1
                            ? 'finalized assessment'
                            : 'finalized assessments'}
                        </p>
                      </div>

                      <p className="text-lg font-bold text-emerald-700">
                        {program.percentage.toFixed(
                          2
                        )}
                        %
                      </p>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              program.percentage
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* =================================================
            RESULTS
        ================================================= */}

        <section>
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Assessment Results
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View finalized results and assessments awaiting lecturer grading.
              </p>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={
                  filter === 'all'
                }
                onClick={() =>
                  setFilter('all')
                }
                label="All"
              />

              <FilterButton
                active={
                  filter ===
                  'assignment'
                }
                onClick={() =>
                  setFilter(
                    'assignment'
                  )
                }
                label="Assignments"
              />

              <FilterButton
                active={
                  filter === 'quiz'
                }
                onClick={() =>
                  setFilter('quiz')
                }
                label="Quizzes / CATs"
              />

              <FilterButton
                active={
                  filter === 'exam'
                }
                onClick={() =>
                  setFilter('exam')
                }
                label="Exams"
              />
            </div>
          </div>

          {filteredResults.length ===
          0 ? (
            <EmptyResults
              hasAnyResults={
                (data?.results
                  ?.length || 0) >
                0
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Assessment
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        Course
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        Score
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        %
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        Result
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-4"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.map(
                      (result) => (
                        <ResultTableRow
                          key={result.id}
                          result={result}
                        />
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}

              <div className="divide-y divide-slate-100 md:hidden">
                {filteredResults.map(
                  (result) => (
                    <ResultMobileCard
                      key={result.id}
                      result={result}
                    />
                  )
                )}
              </div>
            </div>
          )}
        </section>

        {/* =================================================
            FOOTNOTE
        ================================================= */}

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

          <p className="text-xs leading-5 text-amber-800">
            Assessments containing written questions may remain
            <strong> Awaiting Grading </strong>
            until the lecturer has graded all required written responses.
            Once grading is complete, the final score, percentage and
            pass/fail result will be released.
          </p>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  description,
  highlight = false,
}: {
  icon: React.ReactNode;

  label: string;

  value: string | number;

  description: string;

  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? 'border-amber-200'
          : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            highlight
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {icon}
        </div>

        <span
          className={`text-2xl font-black ${
            highlight
              ? 'text-amber-600'
              : 'text-slate-900'
          }`}
        >
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-800">
        {label}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   DARK STAT
========================================================= */

function MiniDarkStat({
  label,
  value,
}: {
  label: string;

  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] font-medium text-white/40">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-white">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;

  onClick: () => void;

  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
        active
          ? 'bg-[#0f4f3f] text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
      }`}
    >
      {label}
    </button>
  );
}

/* =========================================================
   TABLE ROW
========================================================= */

function ResultTableRow({
  result,
}: {
  result: Result;
}) {
  const finalized =
    isResultFinalized(result);

  return (
    <tr className="group transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getTypeClasses(
              result.type
            )}`}
          >
            {getTypeIcon(
              result.type
            )}
          </div>

          <div className="min-w-0">
            <p className="max-w-[250px] truncate text-sm font-bold text-slate-900">
              {result.title}
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {getTypeLabel(
                result.type
              )}

              {result.attemptNumber
                ? ` · Attempt ${result.attemptNumber}`
                : ''}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[180px] truncate text-sm font-medium text-slate-700">
          {result.program.name}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          {result.unit.name ||
            'Course assessment'}
        </p>
      </td>

      <td className="px-5 py-4 text-center">
        {finalized ? (
          <span className="text-sm font-bold text-slate-900">
            {formatNumber(
              result.marksObtained
            )}

            <span className="font-medium text-slate-400">
              /
              {formatNumber(
                result.totalMarks
              )}
            </span>
          </span>
        ) : (
          <span className="text-xs font-bold text-amber-600">
            Pending
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-center">
        {finalized ? (
          <span className="text-sm font-bold text-slate-800">
            {result.percentage.toFixed(
              2
            )}
            %
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-400">
            —
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-center">
        {finalized ? (
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={`inline-flex min-w-9 items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black ${getGradeClasses(
                result.grade
              )}`}
            >
              {result.grade}
            </span>

            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                result.passed
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {result.passed
                ? 'Passed'
                : 'Failed'}
            </span>
          </div>
        ) : (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
              result
            )}`}
          >
            <Clock3 className="mr-1 h-3 w-3" />
            {getStatusLabel(
              result
            )}
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-right">
        <span className="whitespace-nowrap text-xs font-medium text-slate-500">
          {formatDate(
            result.submittedAt
          )}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <ResultLink result={result} />
      </td>
    </tr>
  );
}

/* =========================================================
   MOBILE RESULT CARD
========================================================= */

function ResultMobileCard({
  result,
}: {
  result: Result;
}) {
  const finalized =
    isResultFinalized(result);

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getTypeClasses(
            result.type
          )}`}
        >
          {getTypeIcon(
            result.type
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {result.title}
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                {getTypeLabel(
                  result.type
                )}

                {result.attemptNumber
                  ? ` · Attempt ${result.attemptNumber}`
                  : ''}
              </p>
            </div>

            {finalized ? (
              <span
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${getGradeClasses(
                  result.grade
                )}`}
              >
                {result.grade}
              </span>
            ) : (
              <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                Pending
              </span>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {result.program.name}

            {result.unit.name
              ? ` · ${result.unit.name}`
              : ''}
          </p>
        </div>
      </div>

      {finalized ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Score
            </p>

            <p className="mt-1 text-sm font-black text-slate-900">
              {formatNumber(
                result.marksObtained
              )}

              <span className="font-medium text-slate-400">
                /
                {formatNumber(
                  result.totalMarks
                )}
              </span>
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Percentage
            </p>

            <p className="mt-1 text-sm font-black text-slate-900">
              {result.percentage.toFixed(
                1
              )}
              %
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Result
            </p>

            <p
              className={`mt-1 text-xs font-bold ${
                result.passed
                  ? 'text-emerald-700'
                  : 'text-red-700'
              }`}
            >
              {result.passed
                ? 'Passed'
                : 'Failed'}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <div className="flex items-start gap-2.5">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

            <div>
              <p className="text-xs font-bold text-amber-800">
                {getStatusLabel(
                  result
                )}
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700/80">
                Your final score will appear after the required grading is completed.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">
          Submitted{' '}
          {formatDate(
            result.submittedAt
          )}
        </span>

        <ResultLink result={result} />
      </div>
    </div>
  );
}

/* =========================================================
   RESULT LINK
========================================================= */

function ResultLink({
  result,
}: {
  result: Result;
}) {
  return (
    <Link
      href={`/student/dashboard/results/${encodeURIComponent(
        result.id
      )}`}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 transition hover:text-emerald-900"
    >
      {isResultFinalized(result)
        ? 'View Result'
        : 'View Submission'}

      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/* =========================================================
   EMPTY RESULTS
========================================================= */

function EmptyResults({
  hasAnyResults,
}: {
  hasAnyResults: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <FileText className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {hasAnyResults
          ? 'No results in this category'
          : 'No results available yet'}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasAnyResults
          ? 'Try selecting another assessment category.'
          : 'Once you complete and your assessments are graded, your results will appear here.'}
      </p>

      {!hasAnyResults && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/student/dashboard/assignments"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c4235]"
          >
            <ClipboardCheck className="h-4 w-4" />
            Assignments
          </Link>

          <Link
            href="/student/dashboard/quizzes"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
          >
            <BarChart3 className="h-4 w-4" />
            Quizzes / CATs
          </Link>
        </div>
      )}
    </div>
  );
}
