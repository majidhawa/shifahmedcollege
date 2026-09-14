'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  GraduationCap,
  Info,
  ListChecks,
  MapPin,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Program = {
  id: number;
  name: string;
  code?: string | null;
};

type Unit = {
  id: number;
  program_id: number;
  name: string;
  code?: string | null;
};

type TimetableEntry = {
  id: number;
  program_id: number;
  unit_id: number | null;
  lecturer_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  description: string | null;
  room: string | null;
  class_type:
    | 'lecture'
    | 'practical'
    | 'tutorial'
    | 'exam'
    | 'meeting'
    | 'other';
  status:
    | 'scheduled'
    | 'completed'
    | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  program_name?: string | null;
  program_code?: string | null;
  unit_name?: string | null;
  unit_code?: string | null;
};

type Student = {
  id: number;
  application_number: string | null;
  surname: string | null;
  middle_name: string | null;
  first_name: string | null;
  course: string | null;
  intake: string | null;
  admission_number: string | null;
};

type Statistics = {
  total_classes: number;
  scheduled_classes: number;
  completed_classes: number;
  cancelled_classes: number;
  programs_count: number;
  total_hours: number | string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  student?: Student | null;
  timetable?: TimetableEntry[];
  programs?: Program[];
  units?: Unit[];
  statistics?: Statistics;
};

/* =========================================================
   CONSTANTS
========================================================= */

const DAYS = [
  {
    value: 1,
    name: 'Monday',
    short: 'Mon',
  },
  {
    value: 2,
    name: 'Tuesday',
    short: 'Tue',
  },
  {
    value: 3,
    name: 'Wednesday',
    short: 'Wed',
  },
  {
    value: 4,
    name: 'Thursday',
    short: 'Thu',
  },
  {
    value: 5,
    name: 'Friday',
    short: 'Fri',
  },
] as const;

const CLASS_TYPES = [
  'lecture',
  'practical',
  'tutorial',
  'exam',
  'meeting',
  'other',
] as const;

const STATUSES = [
  'scheduled',
  'completed',
  'cancelled',
] as const;

/* =========================================================
   DATE HELPERS
========================================================= */

function getMonday(date: Date): Date {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  const day = result.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() + difference
  );

  return result;
}

function addDays(
  date: Date,
  amount: number
): Date {
  const result = new Date(date);

  result.setDate(
    result.getDate() + amount
  );

  return result;
}

function formatISODate(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(
  date: Date
): string {
  return date.toLocaleDateString(
    'en-KE',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
}

function formatDateRange(
  start: Date,
  end: Date
): string {
  return `${formatDate(
    start
  )} – ${formatDate(end)}`;
}

function isSameDate(
  first: Date,
  second: Date
): boolean {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

/* =========================================================
   TIME HELPERS
========================================================= */

function formatTime(
  value: string
): string {
  if (!value) {
    return '';
  }

  const parts = value
    .slice(0, 5)
    .split(':');

  if (parts.length !== 2) {
    return value;
  }

  const hour = Number(
    parts[0]
  );

  const minute = Number(
    parts[1]
  );

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return value;
  }

  const period =
    hour >= 12 ? 'PM' : 'AM';

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, '0')} ${period}`;
}

function timeToMinutes(
  value: string
): number {
  const parts = value
    .slice(0, 5)
    .split(':');

  if (parts.length !== 2) {
    return 0;
  }

  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );
}

function formatDuration(
  start: string,
  end: string
): string {
  const difference =
    timeToMinutes(end) -
    timeToMinutes(start);

  if (difference <= 0) {
    return '';
  }

  const hours = Math.floor(
    difference / 60
  );

  const minutes =
    difference % 60;

  if (
    hours > 0 &&
    minutes > 0
  ) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

/* =========================================================
   LABELS
========================================================= */

function getDayName(
  dayOfWeek: number
): string {
  return (
    DAYS.find(
      (day) =>
        day.value === dayOfWeek
    )?.name || 'Unknown'
  );
}

function getClassTypeLabel(
  type: TimetableEntry['class_type']
): string {
  switch (type) {
    case 'lecture':
      return 'Lecture';

    case 'practical':
      return 'Practical';

    case 'tutorial':
      return 'Tutorial';

    case 'exam':
      return 'Exam';

    case 'meeting':
      return 'Meeting';

    default:
      return 'Other';
  }
}

function getStatusLabel(
  status: TimetableEntry['status']
): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';

    case 'completed':
      return 'Completed';

    case 'cancelled':
      return 'Cancelled';

    default:
      return status;
  }
}

function getClassTypeClasses(
  type: TimetableEntry['class_type']
): string {
  switch (type) {
    case 'lecture':
      return 'bg-blue-50 text-blue-700 border-blue-200';

    case 'practical':
      return 'bg-purple-50 text-purple-700 border-purple-200';

    case 'tutorial':
      return 'bg-amber-50 text-amber-700 border-amber-200';

    case 'exam':
      return 'bg-red-50 text-red-700 border-red-200';

    case 'meeting':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';

    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getStatusClasses(
  status: TimetableEntry['status']
): string {
  switch (status) {
    case 'scheduled':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    case 'completed':
      return 'bg-blue-50 text-blue-700 border-blue-200';

    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';

    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function ParentTimetablePage() {
  const [weekStart, setWeekStart] =
    useState<Date>(() =>
      getMonday(new Date())
    );

  const [timetable, setTimetable] =
    useState<TimetableEntry[]>([]);

  const [programs, setPrograms] =
    useState<Program[]>([]);

  const [units, setUnits] =
    useState<Unit[]>([]);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [statistics, setStatistics] =
    useState<Statistics>({
      total_classes: 0,
      scheduled_classes: 0,
      completed_classes: 0,
      cancelled_classes: 0,
      programs_count: 0,
      total_hours: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [programFilter, setProgramFilter] =
    useState('all');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [selectedEntry, setSelectedEntry] =
    useState<TimetableEntry | null>(null);

  const [showDetails, setShowDetails] =
    useState(false);

  /* =======================================================
     WEEK
  ======================================================= */

  const weekEnd = useMemo(
    () =>
      addDays(
        weekStart,
        4
      ),
    [weekStart]
  );

  const weekDates = useMemo(
    () =>
      DAYS.map(
        (day) => ({
          ...day,
          date: addDays(
            weekStart,
            day.value - 1
          ),
        })
      ),
    [weekStart]
  );

  /* =======================================================
     FETCH
  ======================================================= */

  const fetchTimetable =
    useCallback(
      async (
        showRefreshState = false
      ) => {
        try {
          if (showRefreshState) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError('');

          const params =
            new URLSearchParams();

          params.set(
            'start_date',
            formatISODate(
              weekStart
            )
          );

          params.set(
            'end_date',
            formatISODate(
              weekEnd
            )
          );

          if (
            programFilter !==
            'all'
          ) {
            params.set(
              'program_id',
              programFilter
            );
          }

          if (
            statusFilter !==
            'all'
          ) {
            params.set(
              'status',
              statusFilter
            );
          }

          const response =
            await fetch(
              `/api/parent/timetable?${params.toString()}`,
              {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
              }
            );

          let data: ApiResponse;

          try {
            data =
              (await response.json()) as ApiResponse;
          } catch {
            throw new Error(
              'The server returned an invalid response.'
            );
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                'Unable to load your child’s timetable.'
            );
          }

          setStudent(
            data.student ?? null
          );

          setTimetable(
            data.timetable ?? []
          );

          setPrograms(
            data.programs ?? []
          );

          setUnits(
            data.units ?? []
          );

          setStatistics(
            data.statistics ?? {
              total_classes: 0,
              scheduled_classes: 0,
              completed_classes: 0,
              cancelled_classes: 0,
              programs_count: 0,
              total_hours: 0,
            }
          );
        } catch (fetchError) {
          console.error(
            'PARENT TIMETABLE FETCH ERROR:',
            fetchError
          );

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Unable to load your child’s timetable.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        weekStart,
        weekEnd,
        programFilter,
        statusFilter,
      ]
    );

  useEffect(() => {
    void fetchTimetable();
  }, [fetchTimetable]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredTimetable =
    useMemo(
      () =>
        timetable.filter(
          (entry) => {
            if (
              programFilter !==
                'all' &&
              String(
                entry.program_id
              ) !==
                programFilter
            ) {
              return false;
            }

            if (
              statusFilter !==
                'all' &&
              entry.status !==
                statusFilter
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        timetable,
        programFilter,
        statusFilter,
      ]
    );

  /* =======================================================
     BY DAY
  ======================================================= */

  const entriesByDay =
    useMemo(() => {
      const map: Record<
        number,
        TimetableEntry[]
      > = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
      };

      filteredTimetable.forEach(
        (entry) => {
          if (
            map[
              entry.day_of_week
            ]
          ) {
            map[
              entry.day_of_week
            ].push(entry);
          }
        }
      );

      Object.values(map).forEach(
        (entries) => {
          entries.sort(
            (first, second) =>
              timeToMinutes(
                first.start_time
              ) -
              timeToMinutes(
                second.start_time
              )
          );
        }
      );

      return map;
    }, [filteredTimetable]);

  /* =======================================================
     CURRENT WEEK
  ======================================================= */

  const today = new Date();

  const todayDay =
    today.getDay();

  const isCurrentWeek =
    isSameDate(
      getMonday(today),
      weekStart
    );

  const actualTodayEntries =
    isCurrentWeek &&
    todayDay >= 1 &&
    todayDay <= 5
      ? entriesByDay[
          todayDay
        ] ?? []
      : [];

  /* =======================================================
     NEXT CLASS
  ======================================================= */

  const nextClass =
    useMemo(() => {
      const now = new Date();

      if (!isCurrentWeek) {
        return (
          filteredTimetable
            .filter(
              (entry) =>
                entry.status ===
                'scheduled'
            )
            .sort(
              (
                first,
                second
              ) => {
                if (
                  first.day_of_week !==
                  second.day_of_week
                ) {
                  return (
                    first.day_of_week -
                    second.day_of_week
                  );
                }

                return (
                  timeToMinutes(
                    first.start_time
                  ) -
                  timeToMinutes(
                    second.start_time
                  )
                );
              }
            )[0] ?? null
        );
      }

      const currentDay =
        now.getDay();

      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

      return (
        filteredTimetable
          .filter(
            (entry) => {
              if (
                entry.status !==
                'scheduled'
              ) {
                return false;
              }

              if (
                entry.day_of_week <
                currentDay
              ) {
                return false;
              }

              if (
                entry.day_of_week ===
                currentDay
              ) {
                return (
                  timeToMinutes(
                    entry.end_time
                  ) >
                  currentMinutes
                );
              }

              return true;
            }
          )
          .sort(
            (
              first,
              second
            ) => {
              if (
                first.day_of_week !==
                second.day_of_week
              ) {
                return (
                  first.day_of_week -
                  second.day_of_week
                );
              }

              return (
                timeToMinutes(
                  first.start_time
                ) -
                timeToMinutes(
                  second.start_time
                )
              );
            }
          )[0] ?? null
      );
    }, [
      filteredTimetable,
      isCurrentWeek,
    ]);

  /* =======================================================
     STUDENT NAME
  ======================================================= */

  const childName =
    useMemo(() => {
      if (!student) {
        return 'My Child';
      }

      const name = [
        student.first_name,
        student.middle_name,
        student.surname,
      ]
        .filter(
          (
            value
          ): value is string =>
            Boolean(
              value &&
                value.trim()
            )
        )
        .join(' ');

      return name || 'My Child';
    }, [student]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function goToPreviousWeek() {
    setWeekStart(
      (current) =>
        addDays(
          current,
          -7
        )
    );
  }

  function goToNextWeek() {
    setWeekStart(
      (current) =>
        addDays(
          current,
          7
        )
    );
  }

  function goToToday() {
    setWeekStart(
      getMonday(new Date())
    );
  }

  /* =======================================================
     DETAILS
  ======================================================= */

  function openDetails(
    entry: TimetableEntry
  ) {
    setSelectedEntry(entry);
    setShowDetails(true);
  }

  function closeDetails() {
    setShowDetails(false);
    setSelectedEntry(null);
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-7 px-3 py-2 sm:px-5 lg:px-8 xl:px-10">
      {/* ===================================================
          HEADER
      =================================================== */}

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-green via-brand-green to-brand-dark p-7 text-white shadow-lg sm:p-9 lg:p-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <CalendarDays className="h-6 w-6 text-brand-gold" />
              </div>

              <div>
                <p className="text-sm font-medium text-white/70">
                  Parent Portal
                </p>

                <h1 className="text-2xl font-bold sm:text-3xl">
                  My Child’s Timetable
                </h1>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              View your child’s weekly class
              schedule, practical sessions,
              tutorials, examinations and
              other academic activities.
            </p>

            {student && (
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className="rounded-full bg-white/10 px-4 py-2">
                  {childName}
                </span>

                {student.admission_number && (
                  <span className="rounded-full bg-white/10 px-4 py-2">
                    {
                      student.admission_number
                    }
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void fetchTimetable(
                true
              )
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-dark shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={
                refreshing
                  ? 'h-4 w-4 animate-spin'
                  : 'h-4 w-4'
              }
            />

            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>
        </div>
      </section>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Unable to load timetable
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
            className="rounded-lg p-1 hover:bg-red-100"
            aria-label="Close error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===================================================
          NO LINKED CHILD
      =================================================== */}

      {!loading && !student && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-amber-600" />

          <h2 className="mt-4 text-xl font-bold text-brand-dark">
            No Child Linked
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
            There is currently no student linked
            to your parent account. Please
            contact the college if you believe
            this is incorrect.
          </p>
        </section>
      )}

      {student && (
        <>
          {/* ===============================================
              WEEK NAVIGATION
          =============================================== */}

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/70">
                  Weekly Schedule
                </p>

                <h2 className="mt-1 text-xl font-bold text-brand-dark">
                  {formatDateRange(
                    weekStart,
                    weekEnd
                  )}
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    goToPreviousWeek
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand-green hover:text-brand-green"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={
                    goToToday
                  }
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                    isCurrentWeek
                      ? 'bg-brand-green text-white'
                      : 'border border-brand-green text-brand-green hover:bg-brand-green hover:text-white'
                  }`}
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={
                    goToNextWeek
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand-green hover:text-brand-green"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* ===============================================
              FILTERS
          =============================================== */}

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10">
                <ListChecks className="h-5 w-5 text-brand-green" />
              </div>

              <div>
                <h2 className="font-bold text-brand-dark">
                  Timetable Filters
                </h2>

                <p className="text-sm text-gray-500">
                  Filter your child’s
                  timetable by programme
                  or status.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="parent-program-filter"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Programme
                </label>

                <select
                  id="parent-program-filter"
                  value={
                    programFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setProgramFilter(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                >
                  <option value="all">
                    All Programmes
                  </option>

                  {programs.map(
                    (program) => (
                      <option
                        key={
                          program.id
                        }
                        value={String(
                          program.id
                        )}
                      >
                        {
                          program.name
                        }

                        {program.code
                          ? ` (${program.code})`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="parent-status-filter"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Status
                </label>

                <select
                  id="parent-status-filter"
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                >
                  <option value="all">
                    All Statuses
                  </option>

                  {STATUSES.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {getStatusLabel(
                          status
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* ===============================================
              STATISTICS
          =============================================== */}

          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Classes
                  </p>

                  <p className="mt-2 text-3xl font-bold text-brand-dark">
                    {
                      statistics.total_classes
                    }
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10">
                  <CalendarCheck2 className="h-6 w-6 text-brand-green" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Scheduled
                  </p>

                  <p className="mt-2 text-3xl font-bold text-brand-dark">
                    {
                      statistics.scheduled_classes
                    }
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <Clock3 className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Academic Hours
                  </p>

                  <p className="mt-2 text-3xl font-bold text-brand-dark">
                    {Number(
                      statistics.total_hours
                    ).toFixed(1)}
                    h
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <Clock3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Programmes
                  </p>

                  <p className="mt-2 text-3xl font-bold text-brand-dark">
                    {
                      statistics.programs_count
                    }
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
                  <GraduationCap className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Completed
                  </p>

                  <p className="mt-2 text-3xl font-bold text-brand-dark">
                    {
                      statistics.completed_classes
                    }
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </section>

          {/* ===============================================
              TODAY / NEXT CLASS
          =============================================== */}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10">
                  <CalendarDays className="h-5 w-5 text-brand-green" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green/70">
                    Today
                  </p>

                  <h2 className="font-bold text-brand-dark">
                    {today.toLocaleDateString(
                      'en-KE',
                      {
                        weekday:
                          'long',
                        day: 'numeric',
                        month: 'long',
                      }
                    )}
                  </h2>
                </div>
              </div>

              {!isCurrentWeek ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                  Navigate to the
                  current week to
                  view today’s
                  classes.
                </div>
              ) : actualTodayEntries.length ===
                0 ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                  No timetable
                  entries are
                  scheduled for
                  your child today.
                </div>
              ) : (
                <div className="space-y-3">
                  {actualTodayEntries
                    .slice(0, 4)
                    .map(
                      (entry) => (
                        <button
                          type="button"
                          key={
                            entry.id
                          }
                          onClick={() =>
                            openDetails(
                              entry
                            )
                          }
                          className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-brand-green/30 hover:bg-brand-green/[0.03]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-brand-dark">
                                {
                                  entry.title
                                }
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {entry.unit_name ||
                                  'Academic Session'}
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-semibold text-brand-green">
                              {formatTime(
                                entry.start_time
                              )}
                            </span>
                          </div>
                        </button>
                      )
                    )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-brand-green/20 bg-brand-green/[0.035] p-7 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10">
                  <Clock3 className="h-5 w-5 text-brand-green" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-green/70">
                    Next Class
                  </p>

                  <h2 className="font-bold text-brand-dark">
                    Upcoming Schedule
                  </h2>
                </div>
              </div>

              {!nextClass ? (
                <div className="rounded-2xl bg-white p-5 text-sm text-gray-500">
                  No upcoming scheduled
                  classes found in
                  this week.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openDetails(
                      nextClass
                    )
                  }
                  className="w-full rounded-2xl border border-brand-green/10 bg-white p-5 text-left transition hover:border-brand-green/30"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getClassTypeClasses(
                            nextClass.class_type
                          )}`}
                        >
                          {getClassTypeLabel(
                            nextClass.class_type
                          )}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            nextClass.status
                          )}`}
                        >
                          {getStatusLabel(
                            nextClass.status
                          )}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-brand-dark">
                        {
                          nextClass.title
                        }
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {nextClass.unit_name ||
                          'Academic Session'}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl bg-brand-green/5 px-4 py-3 text-center">
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        {getDayName(
                          nextClass.day_of_week
                        )}
                      </p>

                      <p className="mt-1 font-bold text-brand-green">
                        {formatTime(
                          nextClass.start_time
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </section>

          {/* ===============================================
              LOADING
          =============================================== */}

          {loading ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-brand-green" />

                  <p className="mt-4 font-semibold text-brand-dark">
                    Loading timetable...
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Retrieving your
                    child’s weekly
                    schedule.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* =============================================
                  DESKTOP
              ============================================= */}

              <section className="hidden overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm lg:block">
                <div className="grid grid-cols-5 divide-x divide-gray-200">
                  {weekDates.map(
                    (day) => {
                      const entries =
                        entriesByDay[
                          day.value
                        ] ?? [];

                      const isToday =
                        isSameDate(
                          day.date,
                          today
                        );

                      return (
                        <div
                          key={
                            day.value
                          }
                          className="min-h-[520px]"
                        >
                          <div
                            className={`border-b border-gray-200 p-5 ${
                              isToday
                                ? 'bg-brand-green/[0.06]'
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                  {
                                    day.short
                                  }
                                </p>

                                <p
                                  className={`mt-1 text-lg font-bold ${
                                    isToday
                                      ? 'text-brand-green'
                                      : 'text-brand-dark'
                                  }`}
                                >
                                  {day.date.getDate()}
                                </p>
                              </div>

                              {isToday && (
                                <span className="rounded-full bg-brand-green px-3 py-1 text-xs font-semibold text-white">
                                  Today
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 p-4">
                            {entries.length ===
                            0 ? (
                              <div className="flex min-h-[150px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 text-center">
                                <p className="text-sm text-gray-400">
                                  No classes
                                </p>
                              </div>
                            ) : (
                              entries.map(
                                (
                                  entry
                                ) => (
                                  <button
                                    type="button"
                                    key={
                                      entry.id
                                    }
                                    onClick={() =>
                                      openDetails(
                                        entry
                                      )
                                    }
                                    className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${getClassTypeClasses(
                                      entry.class_type
                                    )}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-[11px] font-bold uppercase tracking-wide">
                                        {getClassTypeLabel(
                                          entry.class_type
                                        )}
                                      </span>

                                      {entry.status ===
                                        'completed' && (
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                      )}

                                      {entry.status ===
                                        'cancelled' && (
                                        <XCircle className="h-4 w-4 shrink-0" />
                                      )}
                                    </div>

                                    <h3 className="mt-2 line-clamp-2 font-bold">
                                      {
                                        entry.title
                                      }
                                    </h3>

                                    {entry.unit_name && (
                                      <p className="mt-1 line-clamp-2 text-xs opacity-80">
                                        {
                                          entry.unit_name
                                        }
                                      </p>
                                    )}

                                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
                                      <Clock3 className="h-3.5 w-3.5" />

                                      <span>
                                        {formatTime(
                                          entry.start_time
                                        )}{' '}
                                        –{' '}
                                        {formatTime(
                                          entry.end_time
                                        )}
                                      </span>
                                    </div>

                                    {entry.room && (
                                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                                        <MapPin className="h-3.5 w-3.5" />

                                        <span className="truncate">
                                          {
                                            entry.room
                                          }
                                        </span>
                                      </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-between border-t border-current/10 pt-3 text-[11px] font-semibold">
                                      <span>
                                        {getStatusLabel(
                                          entry.status
                                        )}
                                      </span>

                                      <span>
                                        {formatDuration(
                                          entry.start_time,
                                          entry.end_time
                                        )}
                                      </span>
                                    </div>
                                  </button>
                                )
                              )
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              {/* =============================================
                  MOBILE
              ============================================= */}

              <section className="space-y-5 lg:hidden">
                {weekDates.map(
                  (day) => {
                    const entries =
                      entriesByDay[
                        day.value
                      ] ?? [];

                    const isToday =
                      isSameDate(
                        day.date,
                        today
                      );

                    return (
                      <div
                        key={
                          day.value
                        }
                        className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
                      >
                        <div
                          className={`border-b border-gray-200 p-6 ${
                            isToday
                              ? 'bg-brand-green/[0.06]'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                {
                                  day.short
                                }
                              </p>

                              <h2
                                className={`mt-1 text-xl font-bold ${
                                  isToday
                                    ? 'text-brand-green'
                                    : 'text-brand-dark'
                                }`}
                              >
                                {
                                  day.name
                                }
                              </h2>

                              <p className="mt-1 text-sm text-gray-500">
                                {formatDate(
                                  day.date
                                )}
                              </p>
                            </div>

                            {isToday && (
                              <span className="rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white">
                                Today
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          {entries.length ===
                          0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                              <CalendarDays className="mx-auto h-7 w-7 text-gray-300" />

                              <p className="mt-2 text-sm text-gray-400">
                                No classes
                                scheduled
                                for this
                                day.
                              </p>
                            </div>
                          ) : (
                            entries.map(
                              (
                                entry
                              ) => (
                                <button
                                  type="button"
                                  key={
                                    entry.id
                                  }
                                  onClick={() =>
                                    openDetails(
                                      entry
                                    )
                                  }
                                  className={`w-full rounded-2xl border p-5 text-left transition hover:shadow-md ${getClassTypeClasses(
                                    entry.class_type
                                  )}`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <span className="text-[11px] font-bold uppercase tracking-wide">
                                        {getClassTypeLabel(
                                          entry.class_type
                                        )}
                                      </span>

                                      <h3 className="mt-2 text-base font-bold">
                                        {
                                          entry.title
                                        }
                                      </h3>

                                      {entry.unit_name && (
                                        <p className="mt-1 text-sm opacity-80">
                                          {
                                            entry.unit_name
                                          }
                                        </p>
                                      )}
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <p className="text-sm font-bold">
                                        {formatTime(
                                          entry.start_time
                                        )}
                                      </p>

                                      <p className="mt-1 text-xs opacity-70">
                                        {formatDuration(
                                          entry.start_time,
                                          entry.end_time
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-3 border-t border-current/10 pt-4 text-xs font-semibold">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock3 className="h-3.5 w-3.5" />

                                      {formatTime(
                                        entry.start_time
                                      )}{' '}
                                      –{' '}
                                      {formatTime(
                                        entry.end_time
                                      )}
                                    </span>

                                    {entry.room && (
                                      <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5" />

                                        {
                                          entry.room
                                        }
                                      </span>
                                    )}

                                    <span>
                                      {getStatusLabel(
                                        entry.status
                                      )}
                                    </span>
                                  </div>
                                </button>
                              )
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </section>
            </>
          )}

          {/* ===============================================
              LEGEND
          =============================================== */}

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10">
                <Info className="h-5 w-5 text-brand-green" />
              </div>

              <div>
                <h2 className="font-bold text-brand-dark">
                  Class Type Legend
                </h2>

                <p className="text-sm text-gray-500">
                  These labels identify
                  the type of academic
                  activity.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {CLASS_TYPES.map(
                (type) => (
                  <span
                    key={type}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold ${getClassTypeClasses(
                      type
                    )}`}
                  >
                    {getClassTypeLabel(
                      type
                    )}
                  </span>
                )
              )}
            </div>
          </section>
        </>
      )}

      {/* ===================================================
          DETAILS MODAL
      =================================================== */}

      {showDetails &&
        selectedEntry && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDetails();
              }
            }}
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="border-b border-gray-200 p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getClassTypeClasses(
                          selectedEntry.class_type
                        )}`}
                      >
                        {getClassTypeLabel(
                          selectedEntry.class_type
                        )}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          selectedEntry.status
                        )}`}
                      >
                        {getStatusLabel(
                          selectedEntry.status
                        )}
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-bold text-brand-dark">
                      {
                        selectedEntry.title
                      }
                    </h2>

                    {selectedEntry.unit_name && (
                      <p className="mt-1 text-sm text-gray-500">
                        {
                          selectedEntry.unit_name
                        }

                        {selectedEntry.unit_code
                          ? ` • ${selectedEntry.unit_code}`
                          : ''}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeDetails
                    }
                    className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Close details"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 p-5">
                    <div className="flex items-center gap-3">
                      <Clock3 className="h-5 w-5 text-brand-green" />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Time
                        </p>

                        <p className="mt-1 font-bold text-brand-dark">
                          {formatTime(
                            selectedEntry.start_time
                          )}{' '}
                          –{' '}
                          {formatTime(
                            selectedEntry.end_time
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDuration(
                            selectedEntry.start_time,
                            selectedEntry.end_time
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-5">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-brand-green" />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Day
                        </p>

                        <p className="mt-1 font-bold text-brand-dark">
                          {getDayName(
                            selectedEntry.day_of_week
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-5">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-brand-green" />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Programme
                        </p>

                        <p className="mt-1 font-bold text-brand-dark">
                          {selectedEntry.program_name ||
                            'Programme'}
                        </p>

                        {selectedEntry.program_code && (
                          <p className="mt-1 text-xs text-gray-500">
                            {
                              selectedEntry.program_code
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-5">
                    <div className="flex items-center gap-3">
                      <DoorOpen className="h-5 w-5 text-brand-green" />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Venue
                        </p>

                        <p className="mt-1 font-bold text-brand-dark">
                          {selectedEntry.room ||
                            'Venue not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedEntry.description && (
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start gap-3">
                      <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />

                      <div>
                        <p className="font-semibold text-brand-dark">
                          Class Information
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                          {
                            selectedEntry.description
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedEntry.start_date ||
                  selectedEntry.end_date) && (
                  <div className="rounded-2xl border border-brand-green/15 bg-brand-green/[0.035] p-5">
                    <div className="flex items-start gap-3">
                      <CalendarCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />

                      <div>
                        <p className="font-semibold text-brand-dark">
                          Teaching Period
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          {selectedEntry.start_date
                            ? formatDate(
                                new Date(
                                  `${selectedEntry.start_date}T00:00:00`
                                )
                              )
                            : 'Start date not specified'}

                          {' – '}

                          {selectedEntry.end_date
                            ? formatDate(
                                new Date(
                                  `${selectedEntry.end_date}T00:00:00`
                                )
                              )
                            : 'End date not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Schedule Status
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full border px-4 py-2 text-xs font-semibold ${getStatusClasses(
                        selectedEntry.status
                      )}`}
                    >
                      {getStatusLabel(
                        selectedEntry.status
                      )}
                    </span>

                    <span className="text-sm text-gray-500">
                      This timetable is
                      provided by the
                      college.
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 sm:p-7">
                <button
                  type="button"
                  onClick={
                    closeDetails
                  }
                  className="w-full rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}