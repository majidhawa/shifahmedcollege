'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileQuestion,
  Loader2,
  Search,
  Target,
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

type Requirement = {
  id: number;
  requirementNumber: number;
  requirement: string;
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

  questions: Question[];

  requirements: Requirement[];

  questionCount: number;
  requirementCount: number;

  isOverdue: boolean;
  daysRemaining: number | null;
};

type Program = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  duration: string | null;
  level: string | null;
  status: string | null;
  enrollmentId: number;
  studentNumber: string | null;
  yearOfStudy: number | null;
  enrollmentStatus: string;
};

type Student = {
  applicationId: number;
  name: string;
  applicationNumber: string | null;
  admissionNumber: string | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;

  student?: Student;

  program?: Program | null;

  assignments?: Assignment[];

  totals?: {
    assignments: number;
    active: number;
    overdue: number;
    totalMarks: number;
  };
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  date: string | null
) {
  if (!date) {
    return 'No deadline';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'No deadline';
  }

  return parsed.toLocaleDateString(
    'en-KE',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

function getDeadlineText(
  assignment: Assignment
) {
  if (!assignment.dueDate) {
    return 'No deadline';
  }

  if (assignment.isOverdue) {
    return 'Overdue';
  }

  if (
    assignment.daysRemaining === 0
  ) {
    return 'Due today';
  }

  if (
    assignment.daysRemaining === 1
  ) {
    return 'Due tomorrow';
  }

  return `${assignment.daysRemaining} days remaining`;
}

/* =========================================================
   PAGE
========================================================= */

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [program, setProgram] =
    useState<Program | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState<
      'all' | 'pending' | 'overdue'
    >('all');

  /* =======================================================
     LOAD ASSIGNMENTS
  ======================================================= */

  const loadAssignments =
    useCallback(async () => {
      try {
        setLoading(true);
        setError('');

        const response =
          await fetch(
            '/api/student/assignments',
            {
              method: 'GET',
              cache: 'no-store',
            }
          );

        const data =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              'Unable to load assignments.'
          );
        }

        if (!data.success) {
          throw new Error(
            data.message ||
              'Unable to load assignments.'
          );
        }

        setStudent(
          data.student || null
        );

        setProgram(
          data.program || null
        );

        setAssignments(
          data.assignments || []
        );
      } catch (error) {
        console.error(
          'STUDENT ASSIGNMENTS PAGE ERROR:',
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : 'Unable to load assignments.'
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  /* =======================================================
     FILTER ASSIGNMENTS
  ======================================================= */

  const filteredAssignments =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return assignments.filter(
        (assignment) => {
          const matchesSearch =
            !normalizedSearch ||
            assignment.title
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            assignment.description
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            assignment.unit.name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            assignment.topic.title
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            assignment.lesson.title
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          if (!matchesSearch) {
            return false;
          }

          if (
            filter === 'overdue'
          ) {
            return assignment.isOverdue;
          }

          if (
            filter === 'pending'
          ) {
            return !assignment.isOverdue;
          }

          return true;
        }
      );
    }, [
      assignments,
      search,
      filter,
    ]);

  /* =======================================================
     STATS
  ======================================================= */

  const totalAssignments =
    assignments.length;

  const overdueAssignments =
    assignments.filter(
      (assignment) =>
        assignment.isOverdue
    ).length;

  const pendingAssignments =
    assignments.filter(
      (assignment) =>
        !assignment.isOverdue
    ).length;

  const totalMarks =
    assignments.reduce(
      (total, assignment) =>
        total +
        assignment.totalMarks,
      0
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-green" />

              <p className="mt-4 text-sm text-slate-500">
                Loading your assignments...
              </p>
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <BookOpen className="h-4 w-4" />

                <span>
                  {program?.name ||
                    'My Course'}
                </span>

                {program?.code && (
                  <>
                    <span>•</span>

                    <span>
                      {program.code}
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                My Assignments
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                View your assignments,
                questions, requirements
                and submission deadlines.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Student
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {student?.name ||
                  'Student'}
              </p>

              {student?.admissionNumber && (
                <p className="mt-1 text-xs text-slate-500">
                  Admission No:{' '}
                  {student.admissionNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="font-semibold text-red-800">
                  Unable to load assignments
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={
                    loadAssignments
                  }
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            STATS
        ================================================= */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total Assignments
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {totalAssignments}
                </p>
              </div>

              <div className="rounded-xl bg-brand-green/10 p-3">
                <ClipboardList className="h-6 w-6 text-brand-green" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Pending
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {pendingAssignments}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Overdue
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {overdueAssignments}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total Marks
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {totalMarks}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-3">
                <Target className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            SEARCH + FILTERS
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search assignments, units, topics or lessons..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/20"
              />
            </div>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() =>
                  setFilter('all')
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-white text-brand-green shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter('pending')
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === 'pending'
                    ? 'bg-white text-brand-green shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter('overdue')
                }
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === 'overdue'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overdue
              </button>
            </div>
          </div>
        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {filteredAssignments.length ===
          0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ClipboardList className="h-8 w-8 text-slate-400" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              No assignments found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {search
                ? 'Try a different search term.'
                : 'Your lecturer has not published any assignments for your course yet.'}
            </p>
          </div>
        )}

        {/* =================================================
            ASSIGNMENT LIST
        ================================================= */}

        <div className="space-y-4">
          {filteredAssignments.map(
            (assignment) => (
              <div
                key={assignment.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      {/* COURSE PATH */}

                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-brand-green">
                          {assignment.program.code ||
                            assignment.program.name}
                        </span>

                        <span>•</span>

                        <span>
                          {assignment.unit.name}
                        </span>

                        <span>•</span>

                        <span>
                          {assignment.topic.title}
                        </span>

                        <span>•</span>

                        <span>
                          {assignment.lesson.title}
                        </span>
                      </div>

                      {/* TITLE */}

                      <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                        {assignment.title}
                      </h2>

                      {/* DESCRIPTION */}

                      {assignment.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                          {assignment.description}
                        </p>
                      )}

                      {/* META */}

                      <div className="mt-5 flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <FileQuestion className="h-4 w-4 text-slate-400" />

                          <span>
                            {
                              assignment.questionCount
                            }{' '}
                            {assignment.questionCount ===
                            1
                              ? 'Question'
                              : 'Questions'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <Target className="h-4 w-4 text-slate-400" />

                          <span>
                            {assignment.totalMarks}{' '}
                            Marks
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <Calendar className="h-4 w-4 text-slate-400" />

                          <span>
                            {formatDate(
                              assignment.dueDate
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE */}

                    <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                      {assignment.isOverdue ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                          <AlertCircle className="h-4 w-4" />

                          Overdue
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />

                          {getDeadlineText(
                            assignment
                          )}
                        </div>
                      )}

                      <Link
                        href={`/student/dashboard/assignments/${assignment.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      >
                        View Assignment

                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}