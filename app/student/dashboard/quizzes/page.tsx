'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileQuestion,
  Loader2,
  Play,
  RotateCcw,
  Trophy,
  AlertCircle,
  CalendarClock,
  CalendarDays,
  Lock,
  History,
} from 'lucide-react';

type Quiz = {
  id: number;
  title: string;
  description: string | null;

  totalMarks: number;
  timeLimitMinutes: number;

  attemptsAllowed: number;
  attemptsUsed: number;
  attemptsRemaining: number;

  passingScore: number;

  questionCount: number;

  availableFrom: string | null;
  availableUntil: string | null;

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
  };

  activeAttempt: {
    id: number;
  } | null;

  latestResult: {
    score: number;
    percentage: number;
    submittedAt: string;
  } | null;
};

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/student/quizzes', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load quizzes'
        );
      }

      setQuizzes(data.quizzes || []);
    } catch (err: any) {
      console.error(err);

      setError(
        err.message || 'Failed to load quizzes'
      );
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();

  /*
   * A quiz is upcoming when:
   * - it has an opening date
   * - the opening date is still in the future
   */
  const upcoming = quizzes.filter((quiz) => {
    if (!quiz.availableFrom) return false;

    return new Date(quiz.availableFrom).getTime() > now.getTime();
  });

  /*
   * A quiz is past when:
   * - it has an ending date
   * - the ending date has already passed
   */
  const past = quizzes.filter((quiz) => {
    if (!quiz.availableUntil) return false;

    return (
      new Date(quiz.availableUntil).getTime() <
      now.getTime()
    );
  });

  /*
   * In-progress quizzes always take priority.
   */
  const inProgress = quizzes.filter(
    (quiz) => quiz.activeAttempt
  );

  /*
   * Available quizzes:
   * - no active attempt
   * - attempts remaining
   * - not upcoming
   * - not past
   */
  const available = quizzes.filter((quiz) => {
    if (quiz.activeAttempt) return false;

    if (quiz.attemptsRemaining <= 0) return false;

    const startsInFuture =
      quiz.availableFrom &&
      new Date(quiz.availableFrom).getTime() >
        now.getTime();

    const hasEnded =
      quiz.availableUntil &&
      new Date(quiz.availableUntil).getTime() <
        now.getTime();

    return !startsInFuture && !hasEnded;
  });

  /*
   * Completed quizzes:
   * No active attempt + at least one submitted result.
   */
  const completed = quizzes.filter(
    (quiz) =>
      !quiz.activeAttempt &&
      quiz.latestResult
  );

  /*
   * Quizzes that have ended are also shown in Past Quizzes.
   * This allows students to review the assessment history.
   */
  const pastOnly = past.filter(
    (quiz) => !completed.some((item) => item.id === quiz.id)
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />

          <p className="text-sm text-gray-500">
            Loading your quizzes...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />

            <div>
              <h2 className="font-semibold text-red-800">
                Unable to load quizzes
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>

          <button
            onClick={loadQuizzes}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
                <FileQuestion className="h-6 w-6 text-green-700" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                  My Quizzes
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Complete your quizzes, prepare for upcoming
                  assessments, and review your quiz history.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadQuizzes}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          icon={
            <FileQuestion className="h-5 w-5" />
          }
          label="Total Quizzes"
          value={quizzes.length}
        />

        <SummaryCard
          icon={
            <Play className="h-5 w-5" />
          }
          label="Available"
          value={available.length}
        />

        <SummaryCard
          icon={
            <CalendarClock className="h-5 w-5" />
          }
          label="Upcoming"
          value={upcoming.length}
        />

        <SummaryCard
          icon={
            <Clock className="h-5 w-5" />
          }
          label="In Progress"
          value={inProgress.length}
        />

        <SummaryCard
          icon={
            <History className="h-5 w-5" />
          }
          label="Past"
          value={pastOnly.length}
        />
      </div>

      {/* Empty */}
      {quizzes.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <FileQuestion className="h-8 w-8 text-gray-400" />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-gray-900">
            No quizzes yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Your lecturers have not assigned any quizzes to
            your enrolled programs yet.
          </p>
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <QuizSection
          title="Continue Quiz"
          subtitle="You have started these quizzes. Continue where you left off."
          icon={
            <Clock className="h-5 w-5 text-orange-600" />
          }
          quizzes={inProgress}
          type="progress"
        />
      )}

      {/* Available */}
      {available.length > 0 && (
        <QuizSection
          title="Available Quizzes"
          subtitle="These assessments are currently open."
          icon={
            <Play className="h-5 w-5 text-green-600" />
          }
          quizzes={available}
          type="available"
        />
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <QuizSection
          title="Upcoming Quizzes"
          subtitle="Prepare early. These assessments will become available at the scheduled time."
          icon={
            <CalendarClock className="h-5 w-5 text-blue-600" />
          }
          quizzes={upcoming}
          type="upcoming"
        />
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <QuizSection
          title="Completed Quizzes"
          subtitle="Review your latest quiz results and performance."
          icon={
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          }
          quizzes={completed}
          type="completed"
        />
      )}

      {/* Past */}
      {pastOnly.length > 0 && (
        <QuizSection
          title="Past Quizzes"
          subtitle="These assessments have passed their closing date."
          icon={
            <History className="h-5 w-5 text-gray-600" />
          }
          quizzes={pastOnly}
          type="past"
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-green-700">
          {icon}
        </div>

        <span className="text-2xl font-bold text-gray-900">
          {value}
        </span>
      </div>

      <p className="mt-2 text-xs font-medium text-gray-500">
        {label}
      </p>
    </div>
  );
}

function QuizSection({
  title,
  subtitle,
  icon,
  quizzes,
  type,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  quizzes: Quiz[];
  type:
    | 'available'
    | 'progress'
    | 'upcoming'
    | 'completed'
    | 'past';
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {icon}

          <h2 className="text-lg font-bold text-gray-900">
            {title}
          </h2>

          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
            {quizzes.length}
          </span>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          {subtitle}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {quizzes.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            type={type}
          />
        ))}
      </div>
    </section>
  );
}

function QuizCard({
  quiz,
  type,
}: {
  quiz: Quiz;
  type:
    | 'available'
    | 'progress'
    | 'upcoming'
    | 'completed'
    | 'past';
}) {
  const isUpcoming = type === 'upcoming';
  const isPast = type === 'past';

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      {/* Top */}
      <div
        className={`border-b border-gray-100 p-5 ${
          isUpcoming
            ? 'bg-gradient-to-br from-blue-50 to-white'
            : isPast
            ? 'bg-gradient-to-br from-gray-100 to-white'
            : 'bg-gradient-to-br from-green-50 to-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${
              isUpcoming
                ? 'bg-blue-600'
                : isPast
                ? 'bg-gray-600'
                : 'bg-green-700'
            }`}
          >
            {isUpcoming ? (
              <CalendarClock className="h-5 w-5" />
            ) : isPast ? (
              <History className="h-5 w-5" />
            ) : (
              <BookOpen className="h-5 w-5" />
            )}
          </div>

          {/* Status */}
          {type === 'completed' &&
            quiz.latestResult && (
              <div
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  quiz.latestResult.percentage >=
                  quiz.passingScore
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {quiz.latestResult.percentage >=
                quiz.passingScore
                  ? 'PASSED'
                  : 'FAILED'}
              </div>
            )}

          {isUpcoming && (
            <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
              UPCOMING
            </div>
          )}

          {isPast && (
            <div className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600">
              CLOSED
            </div>
          )}
        </div>

        <h3 className="mt-4 line-clamp-2 text-lg font-bold text-gray-900">
          {quiz.title}
        </h3>

        {quiz.description && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-500">
            {quiz.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 p-5">
        <div className="space-y-3 text-sm">
          <Detail
            label="Program"
            value={quiz.program.name}
          />

          <Detail
            label="Unit"
            value={quiz.unit.name}
          />

          <Detail
            label="Lesson"
            value={quiz.lesson.title}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniStat
            icon={
              <FileQuestion className="h-4 w-4" />
            }
            value={quiz.questionCount}
            label="Questions"
          />

          <MiniStat
            icon={
              <Trophy className="h-4 w-4" />
            }
            value={`${quiz.totalMarks}`}
            label="Marks"
          />

          <MiniStat
            icon={
              <Clock className="h-4 w-4" />
            }
            value={
              quiz.timeLimitMinutes
                ? `${quiz.timeLimitMinutes}m`
                : '∞'
            }
            label="Time"
          />
        </div>

        {/* Upcoming schedule */}
        {isUpcoming && quiz.availableFrom && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Opens
                </p>

                <p className="mt-1 text-sm font-bold text-blue-900">
                  {formatDateTime(
                    quiz.availableFrom
                  )}
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  Use this time to prepare for your
                  assessment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Closing date for available quizzes */}
        {type === 'available' &&
          quiz.availableUntil && (
            <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />

                <div>
                  <p className="text-xs font-semibold text-orange-700">
                    Closes
                  </p>

                  <p className="text-sm font-bold text-orange-900">
                    {formatDateTime(
                      quiz.availableUntil
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Past quiz closing date */}
        {isPast && quiz.availableUntil && (
          <div className="mt-5 rounded-xl bg-gray-100 p-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Closed
                </p>

                <p className="mt-1 text-sm font-bold text-gray-800">
                  {formatDateTime(
                    quiz.availableUntil
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completed result */}
        {type === 'completed' &&
          quiz.latestResult && (
            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Latest Score
                </span>

                <span className="font-bold text-gray-900">
                  {quiz.latestResult.score}/
                  {quiz.totalMarks}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-600"
                  style={{
                    width: `${Math.min(
                      100,
                      Number(
                        quiz.latestResult
                          .percentage
                      )
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-right text-xs font-semibold text-gray-600">
                {
                  quiz.latestResult
                    .percentage
                }
                %
              </p>
            </div>
          )}

        {/* Attempts */}
        {type !== 'completed' &&
          type !== 'past' && (
            <div className="mt-5 rounded-xl bg-green-50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700">
                  Attempts remaining
                </span>

                <span className="font-bold text-green-800">
                  {quiz.attemptsRemaining}
                </span>
              </div>
            </div>
          )}

        {/* Upcoming preparation message */}
        {isUpcoming && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3">
            <p className="text-xs leading-5 text-amber-800">
              <strong>Prepare early:</strong> Review the
              lesson, topics, learning materials and notes
              before the quiz opens.
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="border-t border-gray-100 p-5">
        {isUpcoming ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-500">
            <Lock className="h-4 w-4" />
            Opens {formatShortDate(quiz.availableFrom)}
          </div>
        ) : isPast ? (
          <Link
            href={`/student/dashboard/quizzes/${quiz.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <History className="h-4 w-4" />
            View Quiz
          </Link>
        ) : (
          <Link
            href={`/student/dashboard/quizzes/${quiz.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            {type === 'progress' && (
              <>
                <Play className="h-4 w-4" />
                Continue Quiz
              </>
            )}

            {type === 'available' && (
              <>
                <Play className="h-4 w-4" />
                Start Quiz
              </>
            )}

            {type === 'completed' && (
              <>
                <Trophy className="h-4 w-4" />
                View Quiz
              </>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-gray-400">
        {label}
      </span>

      <span className="line-clamp-1 text-right font-medium text-gray-700">
        {value}
      </span>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 text-center">
      <div className="flex justify-center text-gray-500">
        {icon}
      </div>

      <p className="mt-1 text-sm font-bold text-gray-900">
        {value}
      </p>

      <p className="text-[10px] text-gray-400">
        {label}
      </p>
    </div>
  );
}

/**
 * Format a full date and time for the student.
 *
 * Example:
 * September 12, 2026 at 9:00 AM
 */
function formatDateTime(
  value: string | null
) {
  if (!value) return 'Not scheduled';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Short date used on the locked upcoming button.
 */
function formatShortDate(
  value: string | null
) {
  if (!value) return 'soon';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'soon';
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
  }).format(date);
}

