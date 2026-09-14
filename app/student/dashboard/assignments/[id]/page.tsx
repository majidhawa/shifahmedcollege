'use client';
import AssignmentSubmissionForm from './AssignmentSubmissionForm';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileQuestion,
  Loader2,
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

  questions: Question[];

  requirements: Requirement[];

  questionCount: number;
  requirementCount: number;

  isOverdue: boolean;
  daysRemaining: number | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;

  student?: {
    applicationId: number;
    name: string;
    applicationNumber: string | null;
  };

  assignment?: Assignment;

  program?: {
    id: number;
    name: string;
    code: string | null;
    enrollmentId: number;
    studentNumber: string | null;
    yearOfStudy: number | null;
    enrollmentStatus: string;
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );
}

function formatTime(
  date: string | null
) {
  if (!date) {
    return '';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleTimeString(
    'en-KE',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AssignmentDetailsPage() {
  const params = useParams();

  const assignmentId =
    params?.id;

  const [assignment, setAssignment] =
    useState<Assignment | null>(null);

  const [program, setProgram] =
  useState<ApiResponse['program'] | null>(
    null
  );
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  /* =======================================================
     LOAD ASSIGNMENT
  ======================================================= */

  const loadAssignment =
    useCallback(async () => {
      if (!assignmentId) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response =
          await fetch(
            `/api/student/assignments/${assignmentId}`,
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
              'Unable to load assignment.'
          );
        }

        if (!data.success) {
          throw new Error(
            data.message ||
              'Unable to load assignment.'
          );
        }

        setAssignment(
          data.assignment || null
        );

        setProgram(
          data.program || null
        );
      } catch (error) {
        console.error(
          'ASSIGNMENT DETAILS ERROR:',
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : 'Unable to load assignment.'
        );
      } finally {
        setLoading(false);
      }
    }, [assignmentId]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-green" />

              <p className="mt-4 text-sm text-slate-500">
                Loading assignment...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/student/dashboard/assignments"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Assignments
          </Link>

          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Assignment unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {error ||
                'The assignment could not be found.'}
            </p>

            <Link
              href="/student/dashboard/assignments"
              className="mt-6 inline-flex rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Back to Assignments
            </Link>
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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            BACK
        ================================================= */}

        <Link
          href="/student/dashboard/assignments"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-green"
        >
          <ArrowLeft className="h-4 w-4" />

          Back to Assignments
        </Link>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-brand-green px-6 py-8 text-white sm:px-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-white/80">
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

            <h1 className="text-2xl font-bold sm:text-3xl">
              {assignment.title}
            </h1>

            {program && (
              <p className="mt-3 text-sm text-white/80">
                {program.code
                  ? `${program.code} — `
                  : ''}
                {program.name}
              </p>
            )}
          </div>

          {/* =================================================
              META
          ================================================= */}

          <div className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
            <div className="bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <FileQuestion className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Questions
                  </p>

                  <p className="font-bold text-slate-900">
                    {assignment.questionCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Total Marks
                  </p>

                  <p className="font-bold text-slate-900">
                    {assignment.totalMarks}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-2.5 ${
                    assignment.isOverdue
                      ? 'bg-red-50'
                      : 'bg-emerald-50'
                  }`}
                >
                  {assignment.isOverdue ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Calendar className="h-5 w-5 text-emerald-600" />
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Deadline
                  </p>

                  <p
                    className={`font-bold ${
                      assignment.isOverdue
                        ? 'text-red-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatDate(
                      assignment.dueDate
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              DEADLINE NOTICE
          ================================================= */}

          <div className="p-6 sm:p-8">
            {assignment.isOverdue ? (
              <div className="mb-8 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="font-semibold text-red-800">
                    This assignment is overdue
                  </p>

                  <p className="mt-1 text-sm text-red-700">
                    The deadline was{' '}
                    {formatDate(
                      assignment.dueDate
                    )}
                    {formatTime(
                      assignment.dueDate
                    ) &&
                      ` at ${formatTime(
                        assignment.dueDate
                      )}`}
                    .
                  </p>
                </div>
              </div>
            ) : assignment.dueDate ? (
              <div className="mb-8 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="font-semibold text-emerald-800">
                    Assignment deadline
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    Due on{' '}
                    {formatDate(
                      assignment.dueDate
                    )}
                    {formatTime(
                      assignment.dueDate
                    ) &&
                      ` at ${formatTime(
                        assignment.dueDate
                      )}`}
                    .
                  </p>

                  {assignment.daysRemaining !==
                    null && (
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      {assignment.daysRemaining ===
                      0
                        ? 'Due today'
                        : assignment.daysRemaining ===
                            1
                          ? '1 day remaining'
                          : `${assignment.daysRemaining} days remaining`}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            {assignment.description && (
              <section className="mb-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-brand-green/10 p-2.5">
                    <BookOpen className="h-5 w-5 text-brand-green" />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Instructions
                  </h2>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {assignment.description}
                  </p>
                </div>
              </section>
            )}

            {/* =================================================
                REQUIREMENTS
            ================================================= */}

            {assignment.requirements.length >
              0 && (
              <section className="mb-10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-purple-50 p-2.5">
                    <ClipboardCheck className="h-5 w-5 text-purple-600" />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Requirements
                  </h2>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                  {assignment.requirements.map(
                    (
                      requirement,
                      index
                    ) => (
                      <div
                        key={
                          requirement.id
                        }
                        className={`flex gap-4 p-5 ${
                          index <
                          assignment
                            .requirements
                            .length -
                            1
                            ? 'border-b border-slate-100'
                            : ''
                        }`}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-bold text-purple-700">
                          {
                            requirement.requirementNumber
                          }
                        </div>

                        <p className="text-sm leading-6 text-slate-700">
                          {
                            requirement.requirement
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* =================================================
                QUESTIONS
            ================================================= */}

            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5">
                    <FileQuestion className="h-5 w-5 text-blue-600" />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Assignment Questions
                  </h2>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {assignment.totalMarks}{' '}
                  Marks
                </div>
              </div>

              {assignment.questions.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <FileQuestion className="mx-auto h-8 w-8 text-slate-400" />

                  <p className="mt-3 text-sm text-slate-500">
                    No questions have been
                    added to this assignment
                    yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignment.questions.map(
                    (question) => (
                      <div
                        key={
                          question.id
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                      >
                        <div className="flex gap-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green text-sm font-bold text-white">
                            {
                              question.questionNumber
                            }
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <p className="text-sm font-medium leading-7 text-slate-800 sm:text-base">
                                {
                                  question.question
                                }
                              </p>

                              <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                {
                                  question.marks
                                }{' '}
                                {question.marks ===
                                1
                                  ? 'Mark'
                                  : 'Marks'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

          {/* =================================================
    STUDENT SUBMISSION
================================================= */}

<AssignmentSubmissionForm
  assignmentId={assignment.id}
  questions={assignment.questions}
  totalMarks={assignment.totalMarks}
  dueDate={assignment.dueDate}
  isOverdue={assignment.isOverdue}
/>
          </div>
        </div>
      </div>
    </div>
  );
}