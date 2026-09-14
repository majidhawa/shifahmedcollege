'use client';

import {
  Award,
  BarChart3,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

/* =========================================================
TYPES
========================================================= */

type GradeRecord = {
  id: number;
  studentId: number;
  studentName: string;
  admissionNumber: string;
  programName: string;
  unitName: string;
  unitCode: string;
  assessmentName: string;
  assessmentType: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  gradePoint: number;
  status: string;
  submittedAt?: string | null;
};

type Summary = {
  totalStudents: number;
  totalAssessments: number;
  totalGraded: number;
  averageScore: number;
  passRate: number;
};

type GradesApiResponse = {
  success: boolean;
  message?: string;
  grades?: GradeRecord[];
  summary?: Summary;
};

/* =========================================================
HELPERS
========================================================= */

function getAssessmentTypeLabel(
  assessmentType: string
): string {
  const value = assessmentType.trim().toLowerCase();

  if (
    value === 'exam' ||
    value === 'final examination'
  ) {
    return 'Final Examination';
  }

  if (
    value === 'quiz' ||
    value === 'cat'
  ) {
    return 'CAT';
  }

  if (value === 'assignment') {
    return 'Assignment';
  }

  return assessmentType || 'Assessment';
}

function getStatusClass(
  status: string
): string {
  const value = status.trim().toLowerCase();

  if (
    value === 'passed' ||
    value === 'pass'
  ) {
    return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/10';
  }

  if (
    value === 'failed' ||
    value === 'fail'
  ) {
    return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
  }

  if (
    value === 'submitted' ||
    value === 'pending' ||
    value === 'pending grading'
  ) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10';
  }

  if (value === 'graded') {
    return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/10';
  }

  return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/10';
}

function getStatusLabel(
  status: string
): string {
  const value = status.trim().toLowerCase();

  if (
    value === 'submitted' ||
    value === 'pending' ||
    value === 'pending grading'
  ) {
    return 'Pending Grading';
  }

  if (
    value === 'passed' ||
    value === 'pass'
  ) {
    return 'Passed';
  }

  if (
    value === 'failed' ||
    value === 'fail'
  ) {
    return 'Failed';
  }

  if (value === 'graded') {
    return 'Graded';
  }

  return status || 'Pending';
}

function getGradeClass(
  grade: string
): string {
  const value = grade.trim().toUpperCase();

  if (
    value === 'A+' ||
    value === 'A' ||
    value === 'A-'
  ) {
    return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/10';
  }

  if (
    value === 'B+' ||
    value === 'B' ||
    value === 'B-'
  ) {
    return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10';
  }

  if (
    value === 'C+' ||
    value === 'C' ||
    value === 'C-'
  ) {
    return 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/10';
  }

  if (
    value === 'D+' ||
    value === 'D' ||
    value === 'D-'
  ) {
    return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/10';
  }

  if (value === '-') {
    return 'bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-600/10';
  }

  return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10';
}

/* =========================================================
PAGE
========================================================= */

export default function LecturerGradesPage() {
  const [grades, setGrades] =
    useState<GradeRecord[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      totalStudents: 0,
      totalAssessments: 0,
      totalGraded: 0,
      averageScore: 0,
      passRate: 0,
    });

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>('');

  const [search, setSearch] =
    useState<string>('');

  const [programFilter, setProgramFilter] =
    useState<string>('all');

  const [unitFilter, setUnitFilter] =
    useState<string>('all');

  const [assessmentFilter, setAssessmentFilter] =
    useState<string>('all');

  const [page, setPage] =
    useState<number>(1);

  const itemsPerPage = 10;

  /* =====================================================
  LOAD GRADES
  ===================================================== */

  const loadGrades = useCallback(
    async (
      signal?: AbortSignal
    ): Promise<void> => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          '/api/lecturer/grades',
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            signal,
            headers: {
              Accept: 'application/json',
            },
          }
        );

        let data: GradesApiResponse;

        try {
          data =
            (await response.json()) as GradesApiResponse;
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
              'Failed to load grades.'
          );
        }

        setGrades(
          Array.isArray(data.grades)
            ? data.grades
            : []
        );

        setSummary({
          totalStudents:
            Number(
              data.summary?.totalStudents
            ) || 0,

          totalAssessments:
            Number(
              data.summary?.totalAssessments
            ) || 0,

          totalGraded:
            Number(
              data.summary?.totalGraded
            ) || 0,

          averageScore:
            Number(
              data.summary?.averageScore
            ) || 0,

          passRate:
            Number(
              data.summary?.passRate
            ) || 0,
        });
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Failed to load grades.';

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadGrades(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [loadGrades]);

  /* =====================================================
  FILTER OPTIONS
  ===================================================== */

  const programs = useMemo(
    () =>
      Array.from(
        new Set(
          grades
            .map(
              (
                grade: GradeRecord
              ) => grade.programName
            )
            .filter(Boolean)
        )
      ).sort(),
    [grades]
  );

  const units = useMemo(() => {
    const filteredByProgram =
      programFilter === 'all'
        ? grades
        : grades.filter(
            (
              grade: GradeRecord
            ) =>
              grade.programName ===
              programFilter
          );

    return Array.from(
      new Set(
        filteredByProgram
          .map(
            (
              grade: GradeRecord
            ) => grade.unitName
          )
          .filter(Boolean)
      )
    ).sort();
  }, [
    grades,
    programFilter,
  ]);

  const assessmentTypes =
    useMemo(
      () =>
        Array.from(
          new Set(
            grades
              .map(
                (
                  grade: GradeRecord
                ) =>
                  getAssessmentTypeLabel(
                    grade.assessmentType
                  )
              )
              .filter(Boolean)
          )
        ).sort(),
      [grades]
    );

  /* =====================================================
  FILTERED RESULTS
  ===================================================== */

  const filteredGrades =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return grades.filter(
        (
          grade: GradeRecord
        ) => {
          const matchesSearch =
            !query ||
            grade.studentName
              .toLowerCase()
              .includes(query) ||
            grade.admissionNumber
              .toLowerCase()
              .includes(query) ||
            grade.programName
              .toLowerCase()
              .includes(query) ||
            grade.unitName
              .toLowerCase()
              .includes(query) ||
            grade.unitCode
              .toLowerCase()
              .includes(query) ||
            grade.assessmentName
              .toLowerCase()
              .includes(query);

          const matchesProgram =
            programFilter === 'all' ||
            grade.programName ===
              programFilter;

          const matchesUnit =
            unitFilter === 'all' ||
            grade.unitName ===
              unitFilter;

          const matchesAssessment =
            assessmentFilter ===
              'all' ||
            getAssessmentTypeLabel(
              grade.assessmentType
            ) ===
              assessmentFilter;

          return (
            matchesSearch &&
            matchesProgram &&
            matchesUnit &&
            matchesAssessment
          );
        }
      );
    }, [
      grades,
      search,
      programFilter,
      unitFilter,
      assessmentFilter,
    ]);

  /* =====================================================
  PAGINATION
  ===================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredGrades.length /
          itemsPerPage
      )
    );

  const safePage =
    Math.min(
      page,
      totalPages
    );

  const paginatedGrades =
    filteredGrades.slice(
      (safePage - 1) *
        itemsPerPage,
      safePage *
        itemsPerPage
    );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    programFilter,
    unitFilter,
    assessmentFilter,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [
    page,
    totalPages,
  ]);

  /* =====================================================
  FILTER HANDLERS
  ===================================================== */

  function handleProgramChange(
    value: string
  ): void {
    setProgramFilter(value);
    setUnitFilter('all');
  }

  /* =====================================================
  LOADING STATE
  ===================================================== */

  if (
    loading &&
    grades.length === 0
  ) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-100" />
          <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({
            length: 5,
          }).map(
            (
              _: unknown,
              index: number
            ) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-soft"
              />
            )
          )}
        </div>

        <div className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-soft" />

        <div className="h-96 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-soft" />
      </div>
    );
  }

  /* =====================================================
  ERROR STATE
  ===================================================== */

  if (
    error &&
    grades.length === 0
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">
            Grades & Results
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and monitor student assessment
            results.
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-red-600" />

            <div>
              <h2 className="font-semibold text-red-800">
                Unable to load grades
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadGrades()
                }
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
  PAGE UI
  ===================================================== */

  return (
    <div className="space-y-6 pb-8">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-green/5 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-green/5 px-3 py-1 text-xs font-semibold text-brand-green">
              <GraduationCap className="h-3.5 w-3.5" />
              Academic Performance
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
              Grades & Results
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm text-gray-500">
              View and monitor student assessment
              results across your assigned programs.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadGrades()
            }
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-green/20 bg-brand-green/5 px-4 py-2.5 text-sm font-semibold text-brand-green transition hover:border-brand-green/30 hover:bg-brand-green/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TrendingUp
              className={`h-4 w-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            {loading
              ? 'Refreshing...'
              : 'Refresh Results'}
          </button>
        </div>
      </div>

      {/* =================================================
          ERROR BANNER
      ================================================= */}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FileText className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* STUDENTS */}

        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-green" />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Students
              </p>

              <p className="mt-2 text-3xl font-bold text-brand-dark">
                {summary.totalStudents}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Students represented
              </p>
            </div>

            <div className="rounded-xl bg-brand-green/10 p-3 transition group-hover:scale-105">
              <Users className="h-5 w-5 text-brand-green" />
            </div>
          </div>
        </div>

        {/* ASSESSMENTS */}

        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Assessments
              </p>

              <p className="mt-2 text-3xl font-bold text-brand-dark">
                {summary.totalAssessments}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Submitted assessments
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 transition group-hover:scale-105">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* GRADED */}

        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-gold" />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Graded
              </p>

              <p className="mt-2 text-3xl font-bold text-brand-dark">
                {summary.totalGraded}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Finalized results
              </p>
            </div>

            <div className="rounded-xl bg-brand-gold/10 p-3 transition group-hover:scale-105">
              <Award className="h-5 w-5 text-brand-gold" />
            </div>
          </div>
        </div>

        {/* AVERAGE */}

        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-yellow-500" />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Average Score
              </p>

              <p className="mt-2 text-3xl font-bold text-brand-dark">
                {summary.averageScore.toFixed(2)}
                <span className="ml-0.5 text-lg text-gray-400">
                  %
                </span>
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Across finalized results
              </p>
            </div>

            <div className="rounded-xl bg-yellow-50 p-3 transition group-hover:scale-105">
              <BarChart3 className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* PASS RATE */}

        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Pass Rate
              </p>

              <p className="mt-2 text-3xl font-bold text-brand-dark">
                {summary.passRate.toFixed(2)}
                <span className="ml-0.5 text-lg text-gray-400">
                  %
                </span>
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Finalized assessments
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 transition group-hover:scale-105">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
        <div className="border-b border-gray-100 bg-gradient-to-r from-brand-green/[0.03] to-transparent px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-brand-dark">
                Filter Results
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Search and narrow down assessment records.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full bg-brand-green/5 px-3 py-1 text-xs font-semibold text-brand-green">
              {filteredGrades.length} result
              {filteredGrades.length === 1
                ? ''
                : 's'}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* SEARCH */}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(
                  event: React.ChangeEvent<HTMLInputElement>
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search student, admission no..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 hover:bg-white focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
              />
            </div>

            {/* PROGRAM */}

            <div className="relative">
              <select
                value={programFilter}
                onChange={(
                  event: React.ChangeEvent<HTMLSelectElement>
                ) =>
                  handleProgramChange(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 pr-9 text-sm text-gray-700 outline-none transition hover:bg-white focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
              >
                <option value="all">
                  All Programs
                </option>

                {programs.map(
                  (
                    program: string
                  ) => (
                    <option
                      key={program}
                      value={program}
                    >
                      {program}
                    </option>
                  )
                )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {/* UNIT */}

            <div className="relative">
              <select
                value={unitFilter}
                onChange={(
                  event: React.ChangeEvent<HTMLSelectElement>
                ) =>
                  setUnitFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 pr-9 text-sm text-gray-700 outline-none transition hover:bg-white focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
              >
                <option value="all">
                  All Units
                </option>

                {units.map(
                  (
                    unit: string
                  ) => (
                    <option
                      key={unit}
                      value={unit}
                    >
                      {unit}
                    </option>
                  )
                )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {/* ASSESSMENT TYPE */}

            <div className="relative">
              <select
                value={assessmentFilter}
                onChange={(
                  event: React.ChangeEvent<HTMLSelectElement>
                ) =>
                  setAssessmentFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 pr-9 text-sm text-gray-700 outline-none transition hover:bg-white focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
              >
                <option value="all">
                  All Assessments
                </option>

                {assessmentTypes.map(
                  (
                    type: string
                  ) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          RESULTS TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 bg-white px-5 py-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-green/10 p-2.5">
              <ClipboardList className="h-5 w-5 text-brand-green" />
            </div>

            <div>
              <h2 className="font-semibold text-brand-dark">
                Assessment Results
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {filteredGrades.length}{' '}
                result
                {filteredGrades.length ===
                1
                  ? ''
                  : 's'}{' '}
                matching your current filters
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700 ring-1 ring-inset ring-amber-600/10">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Pending Grading
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 font-medium text-green-700 ring-1 ring-inset ring-green-600/10">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Finalized
            </span>
          </div>
        </div>

        {paginatedGrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="rounded-2xl bg-gray-100 p-4">
              <ClipboardList className="h-8 w-8 text-gray-400" />
            </div>

            <h3 className="mt-4 font-semibold text-gray-700">
              No results found
            </h3>

            <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">
              There are no assessment results
              matching the current search and
              filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Student
                    </th>

                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Program
                    </th>

                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Unit
                    </th>

                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Assessment
                    </th>

                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Score
                    </th>

                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      %
                    </th>

                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Grade
                    </th>

                    <th className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedGrades.map(
                    (
                      grade: GradeRecord
                    ) => {
                      const assessmentType =
                        getAssessmentTypeLabel(
                          grade.assessmentType
                        );

                      const status =
                        getStatusLabel(
                          grade.status
                        );

                      return (
                        <tr
                          key={`${grade.assessmentType}-${grade.id}`}
                          className="group transition hover:bg-brand-green/[0.025]"
                        >
                          {/* STUDENT */}

                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-xs font-bold text-brand-green">
                                {grade.studentName
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase() ||
                                  '?'}
                              </div>

                              <div>
                                <p className="font-semibold text-gray-800">
                                  {grade.studentName}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-500">
                                  {grade.admissionNumber ||
                                    'No admission number'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* PROGRAM */}

                          <td className="px-5 py-4">
                            <p className="max-w-[220px] text-sm leading-5 text-gray-700">
                              {grade.programName}
                            </p>
                          </td>

                          {/* UNIT */}

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-gray-700">
                              {grade.unitName}
                            </p>

                            {grade.unitCode && (
                              <p className="mt-0.5 text-xs font-medium text-brand-green/70">
                                {grade.unitCode}
                              </p>
                            )}
                          </td>

                          {/* ASSESSMENT */}

                          <td className="px-5 py-4">
                            <div>
                              <p className="max-w-[220px] text-sm font-semibold leading-5 text-gray-700">
                                {grade.assessmentName}
                              </p>

                              <span
                                className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  assessmentType ===
                                  'Final Examination'
                                    ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/10'
                                    : assessmentType ===
                                      'CAT'
                                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10'
                                    : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-600/10'
                                }`}
                              >
                                {assessmentType}
                              </span>
                            </div>
                          </td>

                          {/* SCORE */}

                          <td className="whitespace-nowrap px-5 py-4">
                            <div>
                              <span className="text-sm font-bold text-brand-dark">
                                {grade.score}
                              </span>

                              <span className="text-sm text-gray-400">
                                {' '}
                                /{' '}
                                {grade.totalMarks}
                              </span>
                            </div>
                          </td>

                          {/* PERCENTAGE */}

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="text-sm font-semibold text-gray-700">
                              {Number(
                                grade.percentage
                              ).toFixed(2)}
                              %
                            </span>
                          </td>

                          {/* GRADE */}

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex min-w-[44px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${getGradeClass(
                                grade.grade
                              )}`}
                            >
                              {grade.grade ||
                                '-'}
                            </span>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                grade.status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 bg-gray-50/40 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-semibold text-gray-700">
                  {filteredGrades.length ===
                  0
                    ? 0
                    : (safePage - 1) *
                        itemsPerPage +
                      1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-700">
                  {Math.min(
                    safePage *
                      itemsPerPage,
                    filteredGrades.length
                  )}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-gray-700">
                  {filteredGrades.length}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (
                        current: number
                      ) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                  disabled={
                    safePage <= 1
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-brand-green/30 hover:bg-brand-green/5 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="rounded-xl border border-gray-100 bg-white px-3.5 py-2 text-sm text-gray-500 shadow-sm">
                  Page{' '}
                  <span className="font-semibold text-brand-dark">
                    {safePage}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-brand-dark">
                    {totalPages}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (
                        current: number
                      ) =>
                        Math.min(
                          totalPages,
                          current + 1
                        )
                    )
                  }
                  disabled={
                    safePage >=
                    totalPages
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-brand-green/30 hover:bg-brand-green/5 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

