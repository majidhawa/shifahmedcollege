"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

export const dynamic = "force-dynamic";

type Lesson = {
  id: number;
  title: string;
  description?: string | null;
  orderNumber?: number;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
};

type Topic = {
  id: number;
  title: string;
  lessons: Lesson[];
};

type Unit = {
  id: number;
  code?: string | null;
  name: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  topics: Topic[];
};

type LearningSummary = {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  remainingLessons: number;
  percentage: number;
};

type Program = {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  duration?: string | null;
  level?: string | null;
};

type LearningResponse = {
  success: boolean;
  message?: string;

  program?: Program | null;

  summary?: LearningSummary;

  units?: Unit[];
};

type Assignment = {
  id: number;
  lessonId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  totalMarks: number;
  createdAt: string | null;
  updatedAt: string | null;

  lesson: {
    id: number;
    title: string;
  };

  topic: {
    id: number;
    title: string;
  };

  unit: {
    id: number;
    name: string;
  };

  program: {
    id: number;
    name: string;
    code: string | null;
  };

  questionCount: number;
  requirementCount: number;
  isOverdue: boolean;
  daysRemaining: number | null;
};

type AssignmentResponse = {
  success: boolean;
  message?: string;

  program?: Program | null;

  assignments?: Assignment[];

  totals?: {
    assignments: number;
    active: number;
    overdue: number;
    totalMarks: number;
  };
};

type Result = {
  id: string;
  sourceId: number;
  type: "assignment" | "quiz" | "exam";
  title: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  status: string;
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

type ResultsResponse = {
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

  programs?: Array<{
    id: number;
    name: string;
    code: string | null;
    marksObtained: number;
    totalMarks: number;
    assessmentCount: number;
    percentage: number;
    grade: string;
    passed: boolean;
  }>;

  results?: Result[];
};

type PageState = {
  learning: LearningResponse | null;
  assignments: AssignmentResponse | null;
  results: ResultsResponse | null;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

function getPercentageClass(
  percentage: number
): string {
  if (percentage >= 80) {
    return "text-green-700";
  }

  if (percentage >= 50) {
    return "text-amber-700";
  }

  return "text-red-600";
}

function getProgressBarClass(
  percentage: number
): string {
  if (percentage >= 80) {
    return "bg-green-600";
  }

  if (percentage >= 50) {
    return "bg-[#0f4f3f]";
  }

  return "bg-amber-500";
}

function getGradeDescription(
  grade: string | null
): string {
  if (!grade) {
    return "No graded assessments yet";
  }

  if (grade === "A") {
    return "Excellent performance";
  }

  if (grade === "B") {
    return "Very good performance";
  }

  if (grade === "C") {
    return "Good performance";
  }

  if (grade === "D") {
    return "Keep improving";
  }

  return "Needs improvement";
}

function StatIcon({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}

function ProgressBar({
  percentage,
  height = "h-2.5",
}: {
  percentage: number;
  height?: string;
}) {
  const safePercentage = Math.min(
    100,
    Math.max(0, percentage)
  );

  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full bg-gray-100`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${getProgressBarClass(
          safePercentage
        )}`}
        style={{
          width: `${safePercentage}%`,
        }}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-2xl">
        {icon}
      </div>

      <h3 className="mt-4 font-semibold text-[#0c1f1a]">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default function LearningProgressPage() {
  const [data, setData] =
    useState<PageState>({
      learning: null,
      assignments: null,
      results: null,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProgress() {
      try {
        setLoading(true);
        setError(null);

        const [
          learningResponse,
          assignmentsResponse,
          resultsResponse,
        ] = await Promise.all([
          fetch(
            "/api/student/learning-progress",
            {
              method: "GET",
              cache: "no-store",
            }
          ),

          fetch(
            "/api/student/assignments",
            {
              method: "GET",
              cache: "no-store",
            }
          ),

          fetch(
            "/api/student/results",
            {
              method: "GET",
              cache: "no-store",
            }
          ),
        ]);

        const learningData =
          (await learningResponse.json()) as LearningResponse;

        const assignmentsData =
          (await assignmentsResponse.json()) as AssignmentResponse;

        const resultsData =
          (await resultsResponse.json()) as ResultsResponse;

        if (!mounted) {
          return;
        }

        if (
          learningResponse.status === 401 ||
          assignmentsResponse.status === 401 ||
          resultsResponse.status === 401
        ) {
          window.location.href =
            "/student/login";

          return;
        }

        if (
          !learningResponse.ok &&
          !assignmentsResponse.ok &&
          !resultsResponse.ok
        ) {
          throw new Error(
            "Unable to load your learning progress."
          );
        }

        setData({
          learning:
            learningResponse.ok
              ? learningData
              : null,

          assignments:
            assignmentsResponse.ok
              ? assignmentsData
              : null,

          results:
            resultsResponse.ok
              ? resultsData
              : null,
        });
      } catch (loadError) {
        console.error(
          "STUDENT PROGRESS PAGE ERROR:",
          loadError
        );

        if (mounted) {
          setError(
            "We could not load your progress right now. Please try again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProgress();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * IMPORTANT:
   * The learning API is now responsible for determining
   * which programme units belong to the student's active
   * programme. We simply consume the returned units here.
   *
   * Therefore:
   *
   * German Language
   * ├── Unit 1 → 1 lesson
   * └── Unit 2 → 0 lessons
   *
   * = 2 units tracked
   * = 1 total lesson
   */

  const learningSummary =
    data.learning?.summary ?? {
      totalLessons: 0,
      completedLessons: 0,
      inProgressLessons: 0,
      remainingLessons: 0,
      percentage: 0,
    };

  const units =
    data.learning?.units ?? [];

  const assignments =
    data.assignments?.assignments ?? [];

  const assignmentTotals =
    data.assignments?.totals ?? {
      assignments: 0,
      active: 0,
      overdue: 0,
      totalMarks: 0,
    };

  const resultSummary =
    data.results?.summary ?? {
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

  const results =
    data.results?.results ?? [];

  const program = useMemo<Program | null>(() => {
    if (data.learning?.program) {
      return data.learning.program;
    }

    if (data.assignments?.program) {
      return data.assignments.program;
    }

    if (
      data.results?.programs &&
      data.results.programs.length > 0
    ) {
      const firstProgram =
        data.results.programs[0];

      return {
        id: firstProgram.id,
        name: firstProgram.name,
        code: firstProgram.code,
        description: null,
        duration: null,
        level: null,
      };
    }

    if (assignments.length > 0) {
      const source =
        assignments[0].program;

      return {
        id: source.id,
        name: source.name,
        code: source.code,
      };
    }

    if (results.length > 0) {
      const source =
        results[0].program;

      return {
        id: source.id,
        name: source.name,
        code: source.code,
      };
    }

    return null;
  }, [
    data.learning?.program,
    data.assignments?.program,
    data.results?.programs,
    assignments,
    results,
  ]);

  const assignmentCompletionPercentage =
    assignmentTotals.assignments > 0
      ? Math.round(
          (resultSummary.assignments /
            assignmentTotals.assignments) *
            100
        )
      : 0;

  const quizExamTotal =
    resultSummary.quizzes +
    resultSummary.exams;

  const assessmentSuccessPercentage =
    resultSummary.totalAssessments > 0
      ? Math.round(
          (resultSummary.passed /
            resultSummary.totalAssessments) *
            100
        )
      : 0;

  const recentResults =
    results.slice(0, 5);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f6ef]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />

            <div className="mt-4 h-9 w-64 animate-pulse rounded bg-gray-200" />

            <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-gray-200" />
          </div>

          <div className="h-52 animate-pulse rounded-3xl bg-[#0f4f3f]/10" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"
                />
              )
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-2xl bg-white lg:col-span-2" />

            <div className="h-80 animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8f6ef]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <Link
            href="/student/dashboard"
            className="text-sm font-semibold text-[#0f4f3f] hover:underline"
          >
            ← Back to Dashboard
          </Link>

          <div className="mt-8 rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl">
              !
            </div>

            <h1 className="mt-5 text-xl font-bold text-[#0c1f1a]">
              Unable to load progress
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 rounded-lg bg-[#0f4f3f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c1f1a]"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6ef]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* PAGE HEADER */}

        <header className="mb-7">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center text-sm font-semibold text-[#0f4f3f] transition hover:text-[#0c1f1a] hover:underline"
          >
            ← Back to Dashboard
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7a93b]">
                Student Academic Portal
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0c1f1a] sm:text-3xl">
                Academic Progress
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Monitor your learning progress,
                assessments, assignments and
                academic performance in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/student/dashboard/courses"
                className="inline-flex items-center justify-center rounded-lg border border-[#0f4f3f] bg-white px-4 py-2.5 text-sm font-semibold text-[#0f4f3f] transition hover:bg-[#0f4f3f] hover:text-white"
              >
                My Courses
              </Link>

              <Link
                href="/student/dashboard/quizzes"
                className="inline-flex items-center justify-center rounded-lg bg-[#0f4f3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c1f1a]"
              >
                Assessments
              </Link>
            </div>
          </div>
        </header>

        {/* PROGRAM HERO */}

        <section className="relative mb-6 overflow-hidden rounded-3xl bg-[#0f4f3f] shadow-lg">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5" />

          <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-[#d7a93b]/5" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

              <div className="max-w-2xl">

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#d7a93b]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#d7a93b]">
                    Current Programme
                  </span>

                  {program?.code && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                      {program.code}
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                  {program?.name ||
                    "Your Academic Programme"}
                </h2>

                {program?.description && (
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                    {program.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">

                  {program?.level && (
                    <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/80">
                      Level: {program.level}
                    </span>
                  )}

                  {program?.duration && (
                    <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/80">
                      Duration: {program.duration}
                    </span>
                  )}

                  <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/80">
                    {units.length}{" "}
                    {units.length === 1
                      ? "unit"
                      : "units"}{" "}
                    tracked
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-5 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm sm:p-6">

                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/10">

                  <div className="absolute inset-2 rounded-full border-8 border-white/10" />

                  <div
                    className="absolute inset-2 rounded-full border-8 border-[#d7a93b]"
                    style={{
                      clipPath: `inset(${
                        100 -
                        learningSummary.percentage
                      }% 0 0 0)`,
                    }}
                  />

                  <div className="relative text-center">
                    <p className="text-3xl font-bold text-white">
                      {learningSummary.percentage}%
                    </p>

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                      Complete
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Course Progress
                  </p>

                  <p className="mt-1 text-lg font-bold text-white">
                    {learningSummary.completedLessons}{" "}
                    of{" "}
                    {learningSummary.totalLessons}
                  </p>

                  <p className="mt-1 text-xs text-white/60">
                    lessons completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KEY METRICS */}

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <StatIcon className="bg-[#0f4f3f]/10 text-[#0f4f3f]">
                📚
              </StatIcon>

              <span className="text-xs font-semibold text-gray-400">
                Learning
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-[#0c1f1a]">
              {learningSummary.totalLessons}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Total lessons
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <StatIcon className="bg-green-50 text-green-700">
                ✓
              </StatIcon>

              <span className="text-xs font-semibold text-green-600">
                Completed
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-green-700">
              {learningSummary.completedLessons}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Lessons completed
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <StatIcon className="bg-amber-50 text-amber-700">
                📝
              </StatIcon>

              <span className="text-xs font-semibold text-amber-600">
                Assessments
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-[#0c1f1a]">
              {resultSummary.totalAssessments}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Graded assessments
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <StatIcon className="bg-blue-50 text-blue-700">
                🎯
              </StatIcon>

              <span className="text-xs font-semibold text-blue-600">
                Performance
              </span>
            </div>

            <p
              className={`mt-4 text-3xl font-bold ${getPercentageClass(
                resultSummary.overallPercentage
              )}`}
            >
              {resultSummary.totalAssessments > 0
                ? `${resultSummary.overallPercentage}%`
                : "—"}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Overall academic score
            </p>
          </div>
        </section>

        {/* MAIN DASHBOARD */}

        <section className="mb-6 grid gap-6 lg:grid-cols-3">

          {/* LEARNING */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-bold text-[#0c1f1a]">
                  Learning Progress
                </h2>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Your completion status across
                  lessons in your programme units.
                </p>
              </div>

              <div className="rounded-xl bg-[#0f4f3f]/10 px-3 py-2 text-right">
                <p className="text-xl font-bold text-[#0f4f3f]">
                  {learningSummary.percentage}%
                </p>

                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Complete
                </p>
              </div>
            </div>

            <div className="mt-6">
              <ProgressBar
                percentage={
                  learningSummary.percentage
                }
                height="h-3"
              />
            </div>

            <div className="mt-6 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50">

              <div className="px-3 py-4 text-center">
                <p className="text-xl font-bold text-green-700">
                  {learningSummary.completedLessons}
                </p>

                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  Completed
                </p>
              </div>

              <div className="px-3 py-4 text-center">
                <p className="text-xl font-bold text-amber-700">
                  {learningSummary.inProgressLessons}
                </p>

                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  In Progress
                </p>
              </div>

              <div className="px-3 py-4 text-center">
                <p className="text-xl font-bold text-gray-700">
                  {learningSummary.remainingLessons}
                </p>

                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  Remaining
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-5">
              <p className="text-xs text-gray-500">
                Keep progressing through your
                lessons to complete your programme.
              </p>

              <Link
                href="/student/dashboard/courses"
                className="text-xs font-bold text-[#0f4f3f] hover:underline"
              >
                Continue learning →
              </Link>
            </div>
          </div>

          {/* ACADEMIC PERFORMANCE */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div>
              <h2 className="text-lg font-bold text-[#0c1f1a]">
                Academic Performance
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Based on your graded assessments.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-5">

              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-[#0f4f3f]/10 bg-[#0f4f3f]/5">
                <div className="text-center">
                  <p
                    className={`text-2xl font-bold ${getPercentageClass(
                      resultSummary.overallPercentage
                    )}`}
                  >
                    {resultSummary.totalAssessments > 0
                      ? `${Math.round(
                          resultSummary.overallPercentage
                        )}%`
                      : "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Current Grade
                </p>

                <p className="mt-1 text-3xl font-bold text-[#0c1f1a]">
                  {resultSummary.overallGrade ||
                    "—"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {getGradeDescription(
                    resultSummary.overallGrade
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Passed
                </span>

                <span className="font-bold text-green-700">
                  {resultSummary.passed}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Failed
                </span>

                <span className="font-bold text-red-600">
                  {resultSummary.failed}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Total graded
                </span>

                <span className="font-bold text-[#0c1f1a]">
                  {resultSummary.totalAssessments}
                </span>
              </div>
            </div>

            {resultSummary.totalAssessments > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-5">

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Pass rate
                  </span>

                  <span className="font-bold text-[#0f4f3f]">
                    {assessmentSuccessPercentage}%
                  </span>
                </div>

                <div className="mt-2">
                  <ProgressBar
                    percentage={
                      assessmentSuccessPercentage
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ASSIGNMENTS + ASSESSMENTS */}

        <section className="mb-6 grid gap-6 lg:grid-cols-2">

          {/* ASSIGNMENTS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-bold text-[#0c1f1a]">
                  Assignment Progress
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Your assignment workload and
                  graded submissions.
                </p>
              </div>

              <Link
                href="/student/dashboard/assignments"
                className="text-xs font-bold text-[#0f4f3f] hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-6">

              <div className="flex items-end justify-between">

                <div>
                  <p className="text-3xl font-bold text-[#0c1f1a]">
                    {resultSummary.assignments}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    graded of{" "}
                    {assignmentTotals.assignments}{" "}
                    assignments
                  </p>
                </div>

                <p className="text-sm font-bold text-[#0f4f3f]">
                  {assignmentCompletionPercentage}%
                </p>
              </div>

              <div className="mt-3">
                <ProgressBar
                  percentage={
                    assignmentCompletionPercentage
                  }
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                  Pending / Active
                </p>

                <p className="mt-1 text-xl font-bold text-[#0c1f1a]">
                  {assignmentTotals.active}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-xs text-red-600">
                  Overdue
                </p>

                <p className="mt-1 text-xl font-bold text-red-700">
                  {assignmentTotals.overdue}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-100 p-4">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-semibold text-gray-500">
                    Assignment marks available
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#0c1f1a]">
                    {assignmentTotals.totalMarks}
                  </p>
                </div>

                <span className="text-2xl">
                  📝
                </span>
              </div>
            </div>
          </div>

          {/* QUIZZES / EXAMS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-bold text-[#0c1f1a]">
                  Assessments
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Your quizzes, examinations and
                  graded assessment results.
                </p>
              </div>

              <Link
                href="/student/dashboard/quizzes"
                className="text-xs font-bold text-[#0f4f3f] hover:underline"
              >
                Take assessment →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-[#0f4f3f]/5 p-4">
                <p className="text-xs text-gray-500">
                  Quizzes
                </p>

                <p className="mt-1 text-2xl font-bold text-[#0f4f3f]">
                  {resultSummary.quizzes}
                </p>

                <p className="mt-1 text-[10px] text-gray-400">
                  graded
                </p>
              </div>

              <div className="rounded-xl bg-purple-50 p-4">
                <p className="text-xs text-gray-500">
                  Exams
                </p>

                <p className="mt-1 text-2xl font-bold text-purple-700">
                  {resultSummary.exams}
                </p>

                <p className="mt-1 text-[10px] text-gray-400">
                  graded
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-100 p-4">

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Quiz & exam results
                </span>

                <span className="font-bold text-[#0c1f1a]">
                  {quizExamTotal}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-green-600">
                  Passed
                </span>

                <span className="font-bold text-green-700">
                  {resultSummary.passed}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-red-600">
                  Failed
                </span>

                <span className="font-bold text-red-700">
                  {resultSummary.failed}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-4">

              <div>
                <p className="text-xs text-gray-500">
                  Total marks
                </p>

                <p className="mt-1 font-bold text-[#0c1f1a]">
                  {resultSummary.totalMarksObtained}{" "}
                  /{" "}
                  {resultSummary.totalPossibleMarks}
                </p>
              </div>

              <span className="text-xl">
                🎯
              </span>
            </div>
          </div>
        </section>

        {/* UNIT PROGRESS */}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 p-6">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <h2 className="text-lg font-bold text-[#0c1f1a]">
                  Unit Progress
                </h2>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Detailed completion across your
                  programme units and topics.
                </p>
              </div>

              <span className="text-xs font-semibold text-gray-400">
                {units.length}{" "}
                {units.length === 1
                  ? "unit"
                  : "units"}
              </span>
            </div>
          </div>

          {units.length === 0 ? (
            <div className="p-6">

              <EmptyState
                icon="📖"
                title="No unit progress available"
                description="Your programme units and lessons will appear here once they are available in the LMS."
              />

            </div>
          ) : (
            <div className="divide-y divide-gray-100">

              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="p-6"
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        {unit.code && (
                          <span className="rounded-md bg-[#0f4f3f]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0f4f3f]">
                            {unit.code}
                          </span>
                        )}

                        <h3 className="text-base font-bold text-[#0c1f1a]">
                          {unit.name}
                        </h3>
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        {unit.completedLessons}{" "}
                        of{" "}
                        {unit.totalLessons}{" "}
                        lessons completed
                      </p>
                    </div>

                    <div className="flex min-w-[220px] items-center gap-3">

                      <div className="flex-1">
                        <ProgressBar
                          percentage={
                            unit.percentage
                          }
                        />
                      </div>

                      <span className="w-12 text-right text-sm font-bold text-[#0f4f3f]">
                        {unit.percentage}%
                      </span>
                    </div>
                  </div>

                  {unit.topics.length > 0 && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">

                      {unit.topics.map(
                        (topic) => {
                          const topicTotal =
                            topic.lessons.length;

                          const topicCompleted =
                            topic.lessons.filter(
                              (lesson) =>
                                lesson.status ===
                                "completed"
                            ).length;

                          const topicPercentage =
                            topicTotal > 0
                              ? Math.round(
                                  (topicCompleted /
                                    topicTotal) *
                                    100
                                )
                              : 0;

                          return (
                            <div
                              key={topic.id}
                              className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                            >

                              <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0">
                                  <h4 className="truncate text-sm font-semibold text-[#0c1f1a]">
                                    {topic.title}
                                  </h4>

                                  <p className="mt-1 text-[11px] text-gray-500">
                                    {topicCompleted}{" "}
                                    of{" "}
                                    {topicTotal}{" "}
                                    completed
                                  </p>
                                </div>

                                <span className="shrink-0 text-xs font-bold text-[#0f4f3f]">
                                  {topicPercentage}%
                                </span>
                              </div>

                              <div className="mt-3">
                                <ProgressBar
                                  percentage={
                                    topicPercentage
                                  }
                                />
                              </div>

                              <div className="mt-4 space-y-2">

                                {topic.lessons.map(
                                  (lesson) => (
                                    <div
                                      key={
                                        lesson.id
                                      }
                                      className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5"
                                    >

                                      <div
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                          lesson.status ===
                                          "completed"
                                            ? "bg-green-100 text-green-700"
                                            : lesson.status ===
                                                "in_progress"
                                              ? "bg-amber-100 text-amber-700"
                                              : "bg-gray-100 text-gray-500"
                                        }`}
                                      >
                                        {lesson.status ===
                                        "completed"
                                          ? "✓"
                                          : lesson.orderNumber ||
                                            "•"}
                                      </div>

                                      <div className="min-w-0 flex-1">

                                        <p className="truncate text-xs font-medium text-[#0c1f1a]">
                                          {
                                            lesson.title
                                          }
                                        </p>

                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                          {lesson.status ===
                                          "completed"
                                            ? `Completed ${formatShortDate(
                                                lesson.completedAt ??
                                                  null
                                              )}`
                                            : lesson.status ===
                                                "in_progress"
                                              ? `Last accessed ${formatShortDate(
                                                  lesson.lastAccessedAt ??
                                                    null
                                                )}`
                                              : "Not started"}
                                        </p>
                                      </div>

                                      <span
                                        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                                          lesson.status ===
                                          "completed"
                                            ? "bg-green-50 text-green-700"
                                            : lesson.status ===
                                                "in_progress"
                                              ? "bg-amber-50 text-amber-700"
                                              : "bg-gray-100 text-gray-500"
                                        }`}
                                      >
                                        {lesson.status ===
                                        "completed"
                                          ? "Done"
                                          : lesson.status ===
                                              "in_progress"
                                            ? "Active"
                                            : "Pending"}
                                      </span>
                                    </div>
                                  )
                                )}

                              </div>
                            </div>
                          );
                        }
                      )}

                      {unit.topics.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center md:col-span-2">
                          <p className="text-xs font-medium text-gray-500">
                            No lessons have been added
                            to this unit yet.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECENT RESULTS */}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 p-6">

            <div className="flex items-center justify-between gap-4">

              <div>
                <h2 className="text-lg font-bold text-[#0c1f1a]">
                  Recent Assessment Results
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Your latest graded academic
                  results.
                </p>
              </div>

              <Link
                href="/student/dashboard/results"
                className="text-xs font-bold text-[#0f4f3f] hover:underline"
              >
                View all results →
              </Link>
            </div>
          </div>

          {recentResults.length === 0 ? (
            <div className="p-6">

              <EmptyState
                icon="📊"
                title="No graded results yet"
                description="Your academic results will appear here after your assessments have been graded."
              />

            </div>
          ) : (
            <div className="divide-y divide-gray-100">

              {recentResults.map(
                (result) => (
                  <div
                    key={result.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >

                    <div className="flex min-w-0 items-center gap-4">

                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          result.type ===
                          "assignment"
                            ? "bg-blue-50 text-blue-700"
                            : result.type ===
                                "exam"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-[#0f4f3f]/10 text-[#0f4f3f]"
                        }`}
                      >
                        {result.type ===
                        "assignment"
                          ? "A"
                          : result.type ===
                              "exam"
                            ? "E"
                            : "Q"}
                      </div>

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="truncate text-sm font-bold text-[#0c1f1a]">
                            {result.title}
                          </h3>

                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-500">
                            {result.type}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                          {result.unit.name ||
                            "Academic assessment"}
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          Submitted{" "}
                          {formatDate(
                            result.submittedAt
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">

                      <div className="text-right">

                        <p
                          className={`text-xl font-bold ${getPercentageClass(
                            result.percentage
                          )}`}
                        >
                          {Math.round(
                            result.percentage
                          )}
                          %
                        </p>

                        <p className="text-[10px] text-gray-400">
                          {result.marksObtained}{" "}
                          /{" "}
                          {result.totalMarks}{" "}
                          marks
                        </p>
                      </div>

                      <div
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          result.passed
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {result.passed
                          ? "Passed"
                          : "Failed"}
                      </div>

                      <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-sm font-bold text-[#0c1f1a] sm:flex">
                        {result.grade}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}

        <section className="mb-6">

          <h2 className="mb-4 text-lg font-bold text-[#0c1f1a]">
            Continue Your Learning
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <Link
              href="/student/dashboard/courses"
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f4f3f]/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-lg">
                📚
              </div>

              <h3 className="mt-4 text-sm font-bold text-[#0c1f1a]">
                My Courses
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Continue with your lessons and
                course materials.
              </p>

              <span className="mt-3 inline-block text-xs font-bold text-[#0f4f3f] group-hover:underline">
                Open courses →
              </span>
            </Link>

            <Link
              href="/student/dashboard/assignments"
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f4f3f]/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                📝
              </div>

              <h3 className="mt-4 text-sm font-bold text-[#0c1f1a]">
                Assignments
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Check your assignments and
                submission deadlines.
              </p>

              <span className="mt-3 inline-block text-xs font-bold text-[#0f4f3f] group-hover:underline">
                View assignments →
              </span>
            </Link>

            <Link
              href="/student/dashboard/quizzes"
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f4f3f]/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-lg">
                🎯
              </div>

              <h3 className="mt-4 text-sm font-bold text-[#0c1f1a]">
                Assessments
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Take available quizzes and
                assessments.
              </p>

              <span className="mt-3 inline-block text-xs font-bold text-[#0f4f3f] group-hover:underline">
                Open assessments →
              </span>
            </Link>

            <Link
              href="/student/dashboard/results"
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f4f3f]/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-lg">
                📊
              </div>

              <h3 className="mt-4 text-sm font-bold text-[#0c1f1a]">
                Results
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Review your academic results and
                performance.
              </p>

              <span className="mt-3 inline-block text-xs font-bold text-[#0f4f3f] group-hover:underline">
                View results →
              </span>
            </Link>
          </div>
        </section>

        {/* FOOTER NOTE */}

        <div className="rounded-2xl border border-[#d7a93b]/20 bg-[#d7a93b]/5 p-5 text-center">
          <p className="text-xs leading-5 text-gray-600">
            Keep attending your lessons,
            completing assignments and taking
            assessments consistently. Your progress
            is updated from your LMS activity.
          </p>
        </div>

      </div>
    </main>
  );
}