"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceRecord = {
  id: number;
  enrollment_id: number;
  program_id: number;
  unit_id: number | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
  program_name: string | null;
  program_code: string | null;
  unit_name: string | null;
  unit_code: string | null;
  student_number: string | null;
  admission_number: string | null;
};

type Program = {
  id: number;
  name: string;
  code: string | null;
};

type Unit = {
  id: number;
  program_id: number;
  name: string;
  code: string | null;
};

type Student = {
  id: number;
  application_number: string | null;
  admission_number: string | null;
  name: string;
  course: string | null;
  intake: string | null;
};

type Statistics = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attended: number;
  percentage: number;
};

type ApiResponse = {
  success: boolean;
  student: Student | null;
  attendance: AttendanceRecord[];
  statistics: Statistics;
  programs: Program[];
  units: Unit[];
  message?: string;
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

function formatDate(value: string): string {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClasses(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "late":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "absent":
      return "bg-red-50 text-red-700 border-red-200";
    case "excused":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function getStatusIcon(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "✓";
    case "late":
      return "◷";
    case "absent":
      return "×";
    case "excused":
      return "E";
    default:
      return "•";
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  className,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  className: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <p className="mt-3 text-3xl font-bold text-brand-dark">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg ${className}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ParentAttendancePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [programId, setProgramId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [status, setStatus] = useState("");

  const loadAttendance = useCallback(async () => {
    try {
      setError("");

      const params = new URLSearchParams();

      if (programId) {
        params.set("program_id", programId);
      }

      if (unitId) {
        params.set("unit_id", unitId);
      }

      if (status) {
        params.set("status", status);
      }

      const query = params.toString();

      const response = await fetch(
        `/api/parent/attendance${query ? `?${query}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load attendance."
        );
      }

      setData(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load attendance records.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [programId, unitId, status]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
  };

  const availableUnits = useMemo(() => {
    if (!data) return [];

    if (!programId) {
      return data.units;
    }

    return data.units.filter(
      (unit) =>
        String(unit.program_id) === String(programId)
    );
  }, [data, programId]);

  const statistics = data?.statistics ?? {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attended: 0,
    percentage: 0,
  };

  const attendance = data?.attendance ?? [];

  useEffect(() => {
    if (
      unitId &&
      !availableUnits.some(
        (unit) => String(unit.id) === String(unitId)
      )
    ) {
      setUnitId("");
    }
  }, [availableUnits, unitId]);

  if (loading) {
    return (
      <div className="space-y-7 px-3 py-2 sm:px-5 lg:px-8 xl:px-10">
        <div className="h-44 animate-pulse rounded-3xl bg-white shadow-sm" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-3xl bg-white shadow-sm"
            />
          ))}
        </div>

        <div className="h-96 animate-pulse rounded-3xl bg-white shadow-sm" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="px-3 py-2 sm:px-5 lg:px-8 xl:px-10">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
            !
          </div>

          <h2 className="mt-5 text-xl font-bold text-red-800">
            Unable to load attendance
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            className="mt-6 rounded-xl bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const studentName = data?.student?.name || "Your Child";

  const studentCourse =
    data?.student?.course ||
    "Programme not available";

  const admissionNumber =
    data?.student?.admission_number ||
    data?.student?.application_number ||
    "Admission number unavailable";

  return (
    <div className="space-y-7 px-3 py-2 sm:px-5 lg:px-8 xl:px-10">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl bg-brand-dark text-white shadow-lg">
        <div className="relative p-7 sm:p-9 lg:p-10">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-gold/10" />

          <div className="absolute -bottom-20 right-16 h-52 w-52 rounded-full bg-brand-green/40" />

          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-brand-gold">
                <span className="h-2 w-2 rounded-full bg-brand-gold" />
                Parent Attendance Overview
              </div>

              <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
                My Child&apos;s Attendance
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Monitor your child&apos;s attendance, punctuality,
                and class participation at Shifah Medical Training
                College.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-dark shadow-sm transition hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={
                  refreshing ? "animate-spin" : ""
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          CHILD SUMMARY
      ====================================================== */}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-green text-xl font-bold text-white shadow-sm">
              {studentName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">
                Linked Child
              </p>

              <h2 className="mt-1 truncate text-lg font-bold text-brand-dark sm:text-xl">
                {studentName}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {studentCourse}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0 sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Admission / Application
            </p>

            <p className="mt-2 font-semibold text-brand-dark">
              {admissionNumber}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <section>
        <div className="mb-5 px-1">
          <h2 className="text-lg font-bold text-brand-dark sm:text-xl">
            Attendance Summary
          </h2>

          <p className="mt-1.5 text-sm text-gray-500">
            Overall attendance recorded for your child.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Attendance Rate"
            value={`${statistics.percentage.toFixed(1)}%`}
            subtitle={`${statistics.attended} attended sessions`}
            icon="%"
            className="bg-brand-green/10 text-brand-green"
          />

          <StatCard
            title="Present"
            value={statistics.present}
            subtitle="Sessions attended on time"
            icon="✓"
            className="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="Late"
            value={statistics.late}
            subtitle="Late attendance records"
            icon="◷"
            className="bg-amber-50 text-amber-700"
          />

          <StatCard
            title="Absent"
            value={statistics.absent}
            subtitle={`${statistics.excused} excused absence${
              statistics.excused === 1
                ? ""
                : "s"
            }`}
            icon="×"
            className="bg-red-50 text-red-700"
          />
        </div>
      </section>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-brand-dark sm:text-xl">
              Attendance Records
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Filter your child&apos;s attendance by programme,
              unit, or attendance status.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-3xl">
            <div>
              <label
                htmlFor="attendance-program"
                className="mb-2 block text-xs font-semibold text-gray-600"
              >
                Programme
              </label>

              <select
                id="attendance-program"
                value={programId}
                onChange={(event) =>
                  setProgramId(event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
              >
                <option value="">
                  All Programmes
                </option>

                {data?.programs.map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {program.name}
                    {program.code
                      ? ` (${program.code})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="attendance-unit"
                className="mb-2 block text-xs font-semibold text-gray-600"
              >
                Unit
              </label>

              <select
                id="attendance-unit"
                value={unitId}
                onChange={(event) =>
                  setUnitId(event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
              >
                <option value="">
                  All Units
                </option>

                {availableUnits.map((unit) => (
                  <option
                    key={unit.id}
                    value={unit.id}
                  >
                    {unit.name}
                    {unit.code
                      ? ` (${unit.code})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="attendance-status"
                className="mb-2 block text-xs font-semibold text-gray-600"
              >
                Status
              </label>

              <select
                id="attendance-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
              >
                <option value="">
                  All Statuses
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
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ATTENDANCE HISTORY
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h2 className="font-bold text-brand-dark sm:text-lg">
                Attendance History
              </h2>

              <p className="mt-1.5 text-xs text-gray-500">
                {attendance.length} record
                {attendance.length === 1
                  ? ""
                  : "s"}{" "}
                displayed
              </p>
            </div>

            <div className="hidden rounded-xl bg-brand-cream px-4 py-2 text-xs font-semibold text-brand-green sm:block">
              Read Only
            </div>
          </div>
        </div>

        {attendance.length === 0 ? (
          <div className="px-6 py-16 text-center sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-400">
              ✓
            </div>

            <h3 className="mt-5 font-semibold text-brand-dark">
              No attendance records found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              There are no attendance records matching
              the selected filters.
            </p>

            {(programId ||
              unitId ||
              status) && (
              <button
                type="button"
                onClick={() => {
                  setProgramId("");
                  setUnitId("");
                  setStatus("");
                }}
                className="mt-5 rounded-xl border border-brand-green px-5 py-2.5 text-sm font-semibold text-brand-green transition hover:bg-brand-green hover:text-white"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>

                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Programme
                    </th>

                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Unit
                    </th>

                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-8 py-5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {attendance.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-gray-50/60"
                    >
                      <td className="px-8 py-5">
                        <p className="text-sm font-semibold text-brand-dark">
                          {formatDate(
                            record.attendance_date
                          )}
                        </p>
                      </td>

                      <td className="px-8 py-5">
                        <p className="text-sm font-medium text-gray-800">
                          {record.program_name ||
                            "—"}
                        </p>

                        {record.program_code && (
                          <p className="mt-1 text-xs text-gray-400">
                            {record.program_code}
                          </p>
                        )}
                      </td>

                      <td className="px-8 py-5">
                        <p className="text-sm font-medium text-gray-800">
                          {record.unit_name ||
                            "General Attendance"}
                        </p>

                        {record.unit_code && (
                          <p className="mt-1 text-xs text-gray-400">
                            {record.unit_code}
                          </p>
                        )}
                      </td>

                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClasses(
                            record.status
                          )}`}
                        >
                          <span>
                            {getStatusIcon(
                              record.status
                            )}
                          </span>

                          {
                            STATUS_LABELS[
                              record.status
                            ]
                          }
                        </span>
                      </td>

                      <td className="max-w-[260px] px-8 py-5">
                        <p className="truncate text-sm text-gray-500">
                          {record.remarks ||
                            "—"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-gray-100 md:hidden">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="p-6"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-brand-dark">
                        {formatDate(
                          record.attendance_date
                        )}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {record.unit_name ||
                          "General Attendance"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {record.program_name ||
                          "Programme not available"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${getStatusClasses(
                        record.status
                      )}`}
                    >
                      <span>
                        {getStatusIcon(
                          record.status
                        )}
                      </span>

                      {
                        STATUS_LABELS[
                          record.status
                        ]
                      }
                    </span>
                  </div>

                  {record.remarks && (
                    <div className="mt-5 rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-semibold text-gray-500">
                        Remarks
                      </p>

                      <p className="mt-1.5 text-sm leading-6 text-gray-700">
                        {record.remarks}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* =====================================================
          ATTENDANCE EXPLANATION
      ====================================================== */}

      <section className="rounded-3xl border border-brand-green/10 bg-brand-green/[0.04] p-6 sm:p-8">
        <div className="flex gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green text-lg text-white">
            i
          </div>

          <div className="max-w-4xl">
            <h3 className="font-bold text-brand-dark">
              Understanding the attendance rate
            </h3>

            <p className="mt-2.5 text-sm leading-7 text-gray-600">
              Present and late records count as attended
              sessions when the attendance rate is calculated.
              Excused absences are displayed separately. This
              page is read-only for parents; attendance is
              recorded and managed by the college.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK LINKS
      ====================================================== */}

      <section className="grid grid-cols-1 gap-5 pb-4 sm:grid-cols-2">
        <Link
          href="/parent/dashboard/academic"
          className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-md sm:p-7"
        >
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-brand-dark sm:text-base">
                Academic Performance
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                View your child&apos;s academic progress and
                results.
              </p>
            </div>

            <span className="shrink-0 text-xl text-brand-green transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>

        <Link
          href="/parent/dashboard/child"
          className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-md sm:p-7"
        >
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-sm font-bold text-brand-dark sm:text-base">
                My Child
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                View your child&apos;s personal and admission
                information.
              </p>
            </div>

            <span className="shrink-0 text-xl text-brand-green transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>
      </section>
    </div>
  );
}