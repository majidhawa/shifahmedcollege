
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers3,
  Loader2,
  RefreshCw,
  Users,
  BookMarked,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

type Course = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  duration: string | number | null;
  level: string | null;
  status: string | null;
  assigned_at: string | null;
  assignment_updated_at: string | null;
};

type Unit = {
  id: number;
  program_id: number;
  name: string;
  code: string | null;
  description: string | null;
  credit_hours: number | null;
  year_of_study: number | null;
  term_number: number | null;
  status: string | null;
  topic_count: number;
};

type CourseResponse = {
  success: boolean;
  message?: string;
  course?: Course;
  units?: Unit[];
  unit_count?: number;
  topic_count?: number;
  lecturer?: {
    id: number;
    name: string;
    email: string;
  };
};

export default function LecturerCourseDetailsPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitCount, setUnitCount] = useState(0);
  const [topicCount, setTopicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/lecturer/courses/${encodeURIComponent(courseId)}`,
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        }
      );

      const data: CourseResponse = await response.json();

      if (!response.ok || !data.success || !data.course) {
        throw new Error(data.message || 'Unable to load course details.');
      }

      setCourse(data.course);
      setUnits(data.units || []);
      setUnitCount(data.unit_count || 0);
      setTopicCount(data.topic_count || 0);
    } catch (err) {
      console.error('COURSE DETAILS ERROR:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not available';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not available';
    }

    return parsedDate.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading course details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Unable to Load Course
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {error || 'The requested course could not be found.'}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={fetchCourse}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>

            <Link
              href="/lecturer/dashboard/courses"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isActive = course.status?.toLowerCase() === 'active';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Back navigation */}
      <Link
        href="/lecturer/dashboard/courses"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Courses
      </Link>

      {/* Course header */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
        <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                <GraduationCap className="h-4 w-4" />
                Assigned Course
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {course.name}
              </h1>

              {course.description && (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  {course.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {course.code && (
                  <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                    Code: {course.code}
                  </span>
                )}

                {course.level && (
                  <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                    {course.level}
                  </span>
                )}

                <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                  Program ID: {course.id}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">
              {isActive ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-300" />
              )}
              {course.status || 'Status unavailable'}
            </div>
          </div>
        </div>

        {/* Course statistics */}
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <Layers3 className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{unitCount}</p>
              <p className="text-sm text-slate-500">Course Units</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
              <BookMarked className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{topicCount}</p>
              <p className="text-sm text-slate-500">Total Topics</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Clock className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {course.duration || 'Not specified'}
              </p>
              <p className="text-sm text-slate-500">Course Duration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft lg:col-span-1">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <BookOpen className="h-5 w-5 text-brand-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Course Information
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Course Name
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {course.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Course Code
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {course.code || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Level
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {course.level || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Assigned Date
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {formatDate(course.assigned_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Course Units
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a unit to view its topics and learning content.
              </p>
            </div>

            <span className="w-fit rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
              {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
            </span>
          </div>

          {units.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-800">
                No Units Available
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                No units have been added to this course yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {units.map((unit, index) => (
                <Link
                  key={unit.id}
                  href={`/lecturer/dashboard/units/${unit.id}`}
                  className="group flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-brand-200 hover:bg-brand-50/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 transition group-hover:bg-brand-100 group-hover:text-brand-800">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 transition group-hover:text-brand-800">
                        {unit.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {unit.code && <span>Code: {unit.code}</span>}

                        {unit.year_of_study != null && (
                          <span>Year {unit.year_of_study}</span>
                        )}

                        {unit.term_number != null && (
                          <span>Term {unit.term_number}</span>
                        )}

                        {unit.credit_hours != null && (
                          <span>{unit.credit_hours} Credit Hours</span>
                        )}
                      </div>

                      {unit.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {unit.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-slate-800">
                        {Number(unit.topic_count || 0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {Number(unit.topic_count || 0) === 1 ? 'Topic' : 'Topics'}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-700" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-slate-500" />
          <p className="text-sm text-slate-600">
            You are viewing the units assigned to this course.
          </p>
        </div>

        <button
          onClick={fetchCourse}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}
