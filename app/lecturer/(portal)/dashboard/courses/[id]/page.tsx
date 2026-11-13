
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Layers3,
  Loader2,
  RefreshCw,
  BookMarked,
  AlertCircle,
  ChevronRight,
  Hash,
  Sparkles,
  FileText,
  LibraryBig,
  CircleDot,
  ShieldCheck,
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
      month: 'long',
      year: 'numeric',
    });
  };

  const isActive = course?.status?.toLowerCase() === 'active';

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f5f7f4]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f4f3f]/10">
            <Loader2 className="h-8 w-8 animate-spin text-[#0f4f3f]" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-800">
            Loading your course
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Preparing your learning management workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f5f7f4] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Unable to Load Course
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || 'The requested course could not be found.'}
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              onClick={fetchCourse}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b3e31]"
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

  return (
    <div className="min-h-screen bg-[#f5f7f4]">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">

        {/* Breadcrumb and navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
              <Link
                href="/lecturer/dashboard"
                className="transition hover:text-[#0f4f3f]"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link
                href="/lecturer/dashboard/courses"
                className="transition hover:text-[#0f4f3f]"
              >
                My Courses
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#0f4f3f]">Course Details</span>
            </div>

            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Course Overview
            </h1>
          </div>

          <Link
            href="/lecturer/dashboard/courses"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#0f4f3f]/30 hover:text-[#0f4f3f]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Courses</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>

        {/* Main course banner */}
        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#0f4f3f] shadow-lg shadow-[#0f4f3f]/10">
          {/* Decorative background */}
          <div className="pointer-events-none absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-5 -top-16 -z-10 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 right-1/4 -z-10 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />

          <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[#d7a93b]" />
                SHIFAH MEDICAL TRAINING COLLEGE
              </div>

              <div className="mt-6 flex items-start gap-4">
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#e6c36c] shadow-inner sm:flex">
                  <GraduationCap className="h-9 w-9" />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e6c36c]">
                    Assigned Learning Programme
                  </p>

                  <h2 className="max-w-2xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                    {course.name}
                  </h2>

                  {course.description && (
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                      {course.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-2">
                {course.code && (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                    <Hash className="h-3.5 w-3.5 text-[#e6c36c]" />
                    {course.code}
                  </span>
                )}

                {course.level && (
                  <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                    {course.level}
                  </span>
                )}

                <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                  Programme #{course.id}
                </span>
              </div>
            </div>

            <div className="flex flex-row items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur sm:justify-start lg:min-w-[190px] lg:flex-col lg:items-start lg:p-5">
              <div>
                <p className="text-xs font-medium text-white/60">
                  Course Status
                </p>

                <div className="mt-2 flex items-center gap-2">
                  {isActive ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[#e6c36c]" />
                  )}

                  <span className="text-sm font-bold text-white">
                    {course.status || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="hidden h-px w-full bg-white/15 lg:block" />

              <div>
                <p className="text-xs font-medium text-white/60">
                  Course Duration
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {course.duration || 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Gold accent */}
          <div className="h-1 w-full bg-gradient-to-r from-[#d7a93b] via-[#f1d58c] to-transparent" />
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Layers3 className="h-5 w-5" />}
            label="Course Units"
            value={unitCount}
            description="Units in this programme"
            iconClass="bg-blue-50 text-blue-700"
          />

          <StatCard
            icon={<BookMarked className="h-5 w-5" />}
            label="Learning Topics"
            value={topicCount}
            description="Topics across all units"
            iconClass="bg-amber-50 text-amber-700"
          />

          <StatCard
            icon={<LibraryBig className="h-5 w-5" />}
            label="Learning Resources"
            value="—"
            description="Available through unit lessons"
            iconClass="bg-emerald-50 text-[#0f4f3f]"
          />
        </section>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">

          {/* Course information */}
          <aside className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Course Information
                    </h3>
                    <p className="text-xs text-slate-400">
                      Programme details
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <InfoItem
                  label="Programme Name"
                  value={course.name}
                />

                <InfoItem
                  label="Course Code"
                  value={course.code || 'Not specified'}
                />

                <InfoItem
                  label="Academic Level"
                  value={course.level || 'Not specified'}
                />

                <InfoItem
                  label="Duration"
                  value={course.duration || 'Not specified'}
                />

                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Assignment Date
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatDate(course.assigned_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f5f7f4] p-4">
                  <div className="flex items-center gap-2 text-[#0f4f3f]">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-bold">
                      Lecturer Access
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    You are viewing the course and learning units assigned to your lecturer account.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Units */}
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:px-7">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Course Units
                  </h3>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Explore the units and their learning topics.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-xl border border-[#0f4f3f]/10 bg-[#0f4f3f]/5 px-3 py-2 text-xs font-bold text-[#0f4f3f]">
                  {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
                </span>

                <button
                  onClick={fetchCourse}
                  title="Refresh course information"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-[#0f4f3f]/30 hover:bg-[#0f4f3f]/5 hover:text-[#0f4f3f]"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {units.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
                    <BookOpen className="h-8 w-8" />
                  </div>

                  <h4 className="mt-5 font-bold text-slate-800">
                    No Units Added Yet
                  </h4>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    There are currently no learning units registered under this course.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {units.map((unit, index) => (
                    <Link
                      key={unit.id}
                      href={`/lecturer/dashboard/units/${unit.id}`}
                      className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#0f4f3f]/30 hover:shadow-md sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f1f5f2] text-sm font-bold text-[#0f4f3f] transition group-hover:bg-[#0f4f3f] group-hover:text-white">
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold leading-6 text-slate-900 transition group-hover:text-[#0f4f3f]">
                                {unit.name}
                              </h4>

                              {unit.status && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  unit.status.toLowerCase() === 'active'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {unit.status}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                              {unit.code && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Hash className="h-3.5 w-3.5" />
                                  {unit.code}
                                </span>
                              )}

                              {unit.year_of_study != null && (
                                <span>Year {unit.year_of_study}</span>
                              )}

                              {unit.term_number != null && (
                                <span>Term {unit.term_number}</span>
                              )}

                              {unit.credit_hours != null && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {unit.credit_hours} Credit Hours
                                </span>
                              )}
                            </div>

                            {unit.description && (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                {unit.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                              <BookMarked className="h-4 w-4" />
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {Number(unit.topic_count || 0)}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {Number(unit.topic_count || 0) === 1 ? 'Topic' : 'Topics'}
                              </p>
                            </div>
                          </div>

                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition group-hover:bg-[#0f4f3f] group-hover:text-white">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {units.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
                <p className="text-xs text-slate-500">
                  Showing <strong className="text-slate-700">{units.length}</strong>{' '}
                  {units.length === 1 ? 'learning unit' : 'learning units'} assigned to this programme.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 py-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Shifah Medical Training College
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Health through Innovation and Research
            </p>
          </div>

          <p className="text-[11px] text-slate-400">
            Lecturer Learning Management System
          </p>
        </footer>
      </div>
    </div>
  );
}

/* Reusable statistics card */
function StatCard({
  icon,
  label,
  value,
  description,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  iconClass: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* Reusable information item */
function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}
