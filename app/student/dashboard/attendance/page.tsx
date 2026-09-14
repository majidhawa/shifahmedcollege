'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  AlertCircle,
  XCircle,
  BookOpen,
  GraduationCap,
  RefreshCw,
  ChevronRight,
  Info,
} from 'lucide-react';

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused';

interface Enrollment {
  id: number;
  program_id: number;
  student_number: string | null;
  year_of_study: number | null;
  enrollment_status: string;
  enrolled_at: string | null;
  program_name: string | null;
  program_code: string | null;
}

interface StudentInfo {
  name: string;
  application_number: string | null;
  admission_number: string | null;
}

interface AttendanceRecord {
  id: number;
  enrollment_id: number;
  program_id: number;
  unit_id: number | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string | null;
  updated_at: string | null;
  program_name: string | null;
  program_code: string | null;
  unit_name: string | null;
  unit_code: string | null;
}

interface AttendanceStatistics {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attended: number;
  percentage: number;
}

interface ProgramSummary {
  program_id: number;
  program_name: string;
  program_code: string | null;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attended: number;
  percentage: number;
}

interface UnitSummary {
  unit_id: number | null;
  program_id: number;
  unit_name: string;
  unit_code: string | null;
  program_name: string;
  program_code: string | null;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attended: number;
  percentage: number;
}

interface AttendanceResponse {
  success: boolean;
  message?: string;
  student: StudentInfo;
  enrollments: Enrollment[];
  attendance: AttendanceRecord[];
  statistics: AttendanceStatistics;
  programs: ProgramSummary[];
  units: UnitSummary[];
}

function formatDate(
  value: string
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
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

function getStatusLabel(
  status: AttendanceStatus
): string {
  switch (status) {
    case 'present':
      return 'Present';

    case 'absent':
      return 'Absent';

    case 'late':
      return 'Late';

    case 'excused':
      return 'Excused';

    default:
      return status;
  }
}

function getStatusClasses(
  status: AttendanceStatus
): string {
  switch (status) {
    case 'present':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'absent':
      return 'bg-red-50 text-red-700 ring-red-200';

    case 'late':
      return 'bg-amber-50 text-amber-700 ring-amber-200';

    case 'excused':
      return 'bg-blue-50 text-blue-700 ring-blue-200';

    default:
      return 'bg-slate-50 text-slate-700 ring-slate-200';
  }
}

function getStatusIcon(
  status: AttendanceStatus
) {
  switch (status) {
    case 'present':
      return (
        <CheckCircle2 className="h-4 w-4" />
      );

    case 'absent':
      return (
        <XCircle className="h-4 w-4" />
      );

    case 'late':
      return (
        <Clock3 className="h-4 w-4" />
      );

    case 'excused':
      return (
        <Info className="h-4 w-4" />
      );

    default:
      return (
        <CalendarCheck className="h-4 w-4" />
      );
  }
}

function getAttendanceMessage(
  percentage: number
): string {
  if (percentage >= 90) {
    return 'Excellent attendance. Keep up the good work.';
  }

  if (percentage >= 80) {
    return 'Good attendance. Continue attending your classes consistently.';
  }

  if (percentage >= 75) {
    return 'Your attendance is satisfactory. Try to maintain regular attendance.';
  }

  return 'Your attendance needs attention. Aim to attend your scheduled classes consistently.';
}

export default function StudentAttendancePage() {
  const [
    data,
    setData,
  ] =
    useState<AttendanceResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    selectedProgram,
    setSelectedProgram,
  ] =
    useState('all');

  const [
    selectedUnit,
    setSelectedUnit,
  ] =
    useState('all');

  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState('all');

  async function loadAttendance(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const response =
        await fetch(
          '/api/student/attendance',
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

      const result =
        (await response.json()) as AttendanceResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Unable to load attendance.'
        );
      }

      setData(result);
    } catch (err) {
      console.error(
        'STUDENT ATTENDANCE PAGE ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load attendance.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAttendance();
  }, []);

  const filteredAttendance =
    useMemo(() => {
      if (!data) {
        return [];
      }

      return data.attendance.filter(
        (record) => {
          const matchesProgram =
            selectedProgram === 'all' ||
            String(
              record.program_id
            ) === selectedProgram;

          const matchesUnit =
            selectedUnit === 'all' ||
            String(
              record.unit_id
            ) === selectedUnit;

          const matchesStatus =
            selectedStatus === 'all' ||
            record.status ===
              selectedStatus;

          return (
            matchesProgram &&
            matchesUnit &&
            matchesStatus
          );
        }
      );
    }, [
      data,
      selectedProgram,
      selectedUnit,
      selectedStatus,
    ]);

  const filteredStatistics =
    useMemo(() => {
      const total =
        filteredAttendance.length;

      const present =
        filteredAttendance.filter(
          (record) =>
            record.status === 'present'
        ).length;

      const absent =
        filteredAttendance.filter(
          (record) =>
            record.status === 'absent'
        ).length;

      const late =
        filteredAttendance.filter(
          (record) =>
            record.status === 'late'
        ).length;

      const excused =
        filteredAttendance.filter(
          (record) =>
            record.status === 'excused'
        ).length;

      const attended =
        present + late;

      const percentage =
        total > 0
          ? Math.round(
              (attended / total) *
                1000
            ) / 10
          : 0;

      return {
        total,
        present,
        absent,
        late,
        excused,
        attended,
        percentage,
      };
    }, [filteredAttendance]);

  const filteredUnits =
    useMemo(() => {
      if (!data) {
        return [];
      }

      return data.units.filter(
        (unit) => {
          if (
            selectedProgram !==
              'all' &&
            String(
              unit.program_id
            ) !== selectedProgram
          ) {
            return false;
          }

          if (
            selectedUnit !==
              'all' &&
            String(
              unit.unit_id
            ) !== selectedUnit
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      data,
      selectedProgram,
      selectedUnit,
    ]);

  const availableUnits =
    useMemo(() => {
      if (!data) {
        return [];
      }

      return data.units.filter(
        (unit) => {
          if (
            selectedProgram ===
              'all'
          ) {
            return true;
          }

          return (
            String(
              unit.program_id
            ) === selectedProgram
          );
        }
      );
    }, [
      data,
      selectedProgram,
    ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-slate-200" />
            <div className="h-4 w-96 max-w-full rounded bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl bg-white shadow-sm"
                />
              ))}
            </div>

            <div className="h-80 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12">
          <div className="w-full rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Unable to load attendance
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {error ||
                'Attendance information is currently unavailable.'}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadAttendance(
                  true
                )
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0c1f1a]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  const statistics =
    filteredStatistics;

  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                href="/student/dashboard"
                className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#0f4f3f] transition hover:text-[#a67d13]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>

              <div className="flex items-center gap-2 text-sm font-medium text-[#0f4f3f]">
                <CalendarCheck className="h-4 w-4" />
                <span>
                  Student Portal
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0c1f1a] sm:text-3xl">
                My Attendance
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                Track your class attendance,
                punctuality and attendance
                record across your enrolled
                programmes.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadAttendance(
                  true
                )
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#0f4f3f]/30 hover:text-[#0f4f3f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =================================================
            STUDENT IDENTITY
        ================================================= */}

        <section className="mb-6 overflow-hidden rounded-2xl bg-[#0c1f1a] shadow-lg">
          <div className="relative p-6 sm:p-7">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-[#d7a93b]/5" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f4f3f] text-lg font-bold text-white ring-1 ring-[#d7a93b]/50">
                  {data.student.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d7a93b]">
                    Attendance Record
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                    {data.student.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
                    {data.student.admission_number && (
                      <span>
                        Admission:{' '}
                        <strong className="text-white/85">
                          {
                            data.student
                              .admission_number
                          }
                        </strong>
                      </span>
                    )}

                    {data.student.application_number && (
                      <span>
                        Application:{' '}
                        <strong className="text-white/85">
                          {
                            data.student
                              .application_number
                          }
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Attendance Status
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {getAttendanceMessage(
                    statistics.percentage
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AttendanceStat
            icon={
              <CalendarCheck className="h-5 w-5" />
            }
            label="Attendance Rate"
            value={`${statistics.percentage}%`}
            description={`${statistics.attended} attended of ${statistics.total} recorded`}
            featured
          />

          <AttendanceStat
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Present"
            value={statistics.present}
            description="Classes attended on time"
          />

          <AttendanceStat
            icon={
              <Clock3 className="h-5 w-5" />
            }
            label="Late"
            value={statistics.late}
            description="Late attendance records"
          />

          <AttendanceStat
            icon={
              <XCircle className="h-5 w-5" />
            }
            label="Absent"
            value={statistics.absent}
            description="Classes missed"
          />
        </section>

        {/* =================================================
            FILTERS
        ================================================= */}

        <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="font-bold text-[#0c1f1a]">
              Attendance Records
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Filter your attendance history
              by programme, unit or status.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FilterSelect
              label="Programme"
              value={selectedProgram}
              onChange={(value) => {
                setSelectedProgram(
                  value
                );
                setSelectedUnit(
                  'all'
                );
              }}
            >
              <option value="all">
                All programmes
              </option>

              {data.programs.map(
                (program) => (
                  <option
                    key={
                      program.program_id
                    }
                    value={String(
                      program.program_id
                    )}
                  >
                    {program.program_name}
                  </option>
                )
              )}
            </FilterSelect>

            <FilterSelect
              label="Unit"
              value={selectedUnit}
              onChange={
                setSelectedUnit
              }
            >
              <option value="all">
                All units
              </option>

              {availableUnits
                .filter(
                  (unit) =>
                    unit.unit_id !==
                    null
                )
                .map((unit) => (
                  <option
                    key={`${unit.program_id}-${unit.unit_id}`}
                    value={String(
                      unit.unit_id
                    )}
                  >
                    {unit.unit_code
                      ? `${unit.unit_code} — `
                      : ''}
                    {unit.unit_name}
                  </option>
                ))}
            </FilterSelect>

            <FilterSelect
              label="Attendance Status"
              value={selectedStatus}
              onChange={
                setSelectedStatus
              }
            >
              <option value="all">
                All statuses
              </option>

              <option value="present">
                Present
              </option>

              <option value="late">
                Late
              </option>

              <option value="absent">
                Absent
              </option>

              <option value="excused">
                Excused
              </option>
            </FilterSelect>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <strong className="text-gray-800">
                {filteredAttendance.length}
              </strong>{' '}
              attendance record
              {filteredAttendance.length ===
              1
                ? ''
                : 's'}
            </p>

            {(selectedProgram !==
              'all' ||
              selectedUnit !==
                'all' ||
              selectedStatus !==
                'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProgram(
                    'all'
                  );
                  setSelectedUnit(
                    'all'
                  );
                  setSelectedStatus(
                    'all'
                  );
                }}
                className="text-xs font-semibold text-[#0f4f3f] hover:text-[#a67d13]"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        {/* =================================================
            UNIT PERFORMANCE
        ================================================= */}

        <section className="mb-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0c1f1a]">
                Attendance by Unit
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                See how consistently you have
                attended each recorded unit.
              </p>
            </div>

            <span className="hidden rounded-full bg-[#0f4f3f]/5 px-3 py-1.5 text-xs font-semibold text-[#0f4f3f] sm:inline-flex">
              {filteredUnits.length}{' '}
              {filteredUnits.length === 1
                ? 'Unit'
                : 'Units'}
            </span>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
              <BookOpen className="mx-auto h-8 w-8 text-gray-300" />

              <p className="mt-3 text-sm font-semibold text-gray-700">
                No unit attendance found
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Unit attendance will appear
                here once your lecturer records
                attendance.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredUnits.map(
                (unit) => (
                  <UnitCard
                    key={`${unit.program_id}-${unit.unit_id ?? 'general'}`}
                    unit={unit}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* =================================================
            RECENT ATTENDANCE
        ================================================= */}

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#0c1f1a]">
              Attendance History
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your most recent attendance
              records are shown below.
            </p>
          </div>

          {filteredAttendance.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f4f3f]/5 text-[#0f4f3f]">
                <CalendarCheck className="h-7 w-7" />
              </div>

              <h3 className="mt-4 font-bold text-gray-800">
                No attendance records yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Your attendance history will
                appear here after attendance has
                been recorded by your lecturer.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-100 bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                          Date
                        </th>

                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                          Programme
                        </th>

                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                          Unit
                        </th>

                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                          Status
                        </th>

                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                          Remarks
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredAttendance
                        .slice(0, 50)
                        .map(
                          (record) => (
                            <tr
                              key={
                                record.id
                              }
                              className="transition hover:bg-gray-50/70"
                            >
                              <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <CalendarCheck className="h-4 w-4 text-gray-400" />

                                  <span className="text-sm font-semibold text-gray-800">
                                    {formatDate(
                                      record.attendance_date
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-gray-800">
                                  {record.program_name ||
                                    'Programme'}
                                </p>

                                {record.program_code && (
                                  <p className="mt-0.5 text-xs text-gray-400">
                                    {
                                      record.program_code
                                    }
                                  </p>
                                )}
                              </td>

                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-gray-700">
                                  {record.unit_name ||
                                    'General Attendance'}
                                </p>

                                {record.unit_code && (
                                  <p className="mt-0.5 text-xs text-gray-400">
                                    {
                                      record.unit_code
                                    }
                                  </p>
                                )}
                              </td>

                              <td className="px-6 py-4">
                                <StatusBadge
                                  status={
                                    record.status
                                  }
                                />
                              </td>

                              <td className="max-w-xs px-6 py-4">
                                <p className="truncate text-sm text-gray-500">
                                  {record.remarks ||
                                    '—'}
                                </p>
                              </td>
                            </tr>
                          )
                        )}
                    </tbody>
                  </table>
                </div>

                {filteredAttendance.length >
                  50 && (
                  <div className="border-t border-gray-100 px-6 py-4 text-xs text-gray-500">
                    Showing the latest 50
                    records.
                  </div>
                )}
              </div>

              {/* MOBILE CARDS */}

              <div className="space-y-3 md:hidden">
                {filteredAttendance
                  .slice(0, 50)
                  .map(
                    (record) => (
                      <article
                        key={
                          record.id
                        }
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="h-4 w-4 text-[#0f4f3f]" />

                              <p className="text-sm font-bold text-gray-800">
                                {formatDate(
                                  record.attendance_date
                                )}
                              </p>
                            </div>

                            <p className="mt-3 text-sm font-semibold text-gray-800">
                              {record.unit_name ||
                                'General Attendance'}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {record.program_name ||
                                'Programme'}
                            </p>
                          </div>

                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        </div>

                        {record.remarks && (
                          <div className="mt-4 border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                              Remarks
                            </p>

                            <p className="mt-1 text-sm leading-5 text-gray-600">
                              {record.remarks}
                            </p>
                          </div>
                        )}
                      </article>
                    )
                  )}
              </div>
            </>
          )}
        </section>

        {/* =================================================
            INFORMATION NOTE
        ================================================= */}

        <section className="mt-8 rounded-2xl border border-[#d7a93b]/20 bg-[#d7a93b]/5 p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#a67d13]" />

            <div>
              <h3 className="text-sm font-bold text-[#0c1f1a]">
                Attendance information
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                Attendance records are entered
                by your lecturers through the
                college LMS. Present and late
                records count toward your
                attendance rate, while excused
                records are shown separately.
                If you believe an attendance record
                is incorrect, please contact the
                relevant lecturer or the college
                administration.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            QUICK ACCESS
        ================================================= */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/student/dashboard/courses"
            className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f4f3f]/20 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f4f3f]/5 text-[#0f4f3f]">
                <GraduationCap className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  My Courses
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  View your enrolled programmes
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#0f4f3f]" />
          </Link>

          <Link
            href="/student/dashboard/units"
            className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0f4f3f]/20 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f4f3f]/5 text-[#0f4f3f]">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Units & Lessons
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Continue your learning
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#0f4f3f]" />
          </Link>
        </section>
      </main>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function AttendanceStat({
  icon,
  label,
  value,
  description,
  featured = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        featured
          ? 'border-[#0f4f3f]/10 bg-[#0f4f3f]'
          : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            featured
              ? 'bg-white/10 text-[#d7a93b]'
              : 'bg-[#0f4f3f]/5 text-[#0f4f3f]'
          }`}
        >
          {icon}
        </div>

        <span
          className={`text-2xl font-bold ${
            featured
              ? 'text-white'
              : 'text-[#0c1f1a]'
          }`}
        >
          {value}
        </span>
      </div>

      <p
        className={`mt-4 text-sm font-bold ${
          featured
            ? 'text-white'
            : 'text-gray-800'
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-xs leading-5 ${
          featured
            ? 'text-white/60'
            : 'text-gray-500'
        }`}
      >
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#0f4f3f] focus:ring-2 focus:ring-[#0f4f3f]/10"
      >
        {children}
      </select>
    </label>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: AttendanceStatus;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${getStatusClasses(
        status
      )}`}
    >
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </span>
  );
}

/* =========================================================
   UNIT CARD
========================================================= */

function UnitCard({
  unit,
}: {
  unit: UnitSummary;
}) {
  const percentage =
    Math.min(
      100,
      Math.max(
        0,
        unit.percentage
      )
    );

  const percentageClass =
    percentage >= 80
      ? 'text-emerald-700'
      : percentage >= 75
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/5 text-[#0f4f3f]">
            <BookOpen className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            {unit.unit_code && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#a67d13]">
                {unit.unit_code}
              </p>
            )}

            <h3 className="mt-1 truncate text-sm font-bold text-gray-800 sm:text-base">
              {unit.unit_name}
            </h3>

            <p className="mt-1 truncate text-xs text-gray-500">
              {unit.program_name}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p
            className={`text-xl font-bold ${percentageClass}`}
          >
            {percentage}%
          </p>

          <p className="text-[11px] text-gray-400">
            attendance
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#0f4f3f] transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <MiniMetric
          value={unit.present}
          label="Present"
        />

        <MiniMetric
          value={unit.late}
          label="Late"
        />

        <MiniMetric
          value={unit.absent}
          label="Absent"
        />

        <MiniMetric
          value={unit.excused}
          label="Excused"
        />
      </div>
    </article>
  );
}

/* =========================================================
   MINI METRIC
========================================================= */

function MiniMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-2 py-3 text-center">
      <p className="text-sm font-bold text-gray-800">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-medium text-gray-400">
        {label}
      </p>
    </div>
  );
}