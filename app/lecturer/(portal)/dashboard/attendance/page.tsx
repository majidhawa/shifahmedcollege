
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';

type Program = {
  id: number;
  name: string;
  code?: string | null;
  level?: string | null;
};

type Unit = {
  id: number;
  program_id: number;
  code?: string | null;
  name: string;
  year_of_study?: number | null;
  term_number?: number | null;
  status?: string | null;
};

type Student = {
  id: number | string;
  name: string;
  admission_number?: string | null;
  student_number?: string | null;
  email?: string | null;
  phone?: string | null;
  course?: string | null;
  status?: string | null;
  application_id?: number | null;
  enrollment_id?: number | null;
  program?: {
    id?: number;
    name?: string | null;
    code?: string | null;
  } | null;
};

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused';

type AttendanceRecord = {
  enrollment_id: number;
  status: AttendanceStatus;
  remarks?: string | null;
};

type AttendanceMap = Record<
  string,
  {
    status: AttendanceStatus;
    remarks: string;
  }
>;

type ExportPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';

const STATUS_OPTIONS: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'excused',
];

export default function LecturerAttendancePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(getToday());

  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [search, setSearch] = useState('');

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Attendance report settings
  const [exportPeriod, setExportPeriod] =
    useState<ExportPeriod>('day');
  const [customStartDate, setCustomStartDate] =
    useState(getToday());
  const [customEndDate, setCustomEndDate] =
    useState(getToday());

  const selectedProgramData = programs.find(
    (program) => String(program.id) === selectedProgram
  );

  const selectedUnitData = units.find(
    (unit) => String(unit.id) === selectedUnit
  );

  const selectedWeekday = useMemo(() => {
    if (!attendanceDate) return '—';

    return new Date(
      `${attendanceDate}T00:00:00`
    ).toLocaleDateString('en-GB', {
      weekday: 'long',
    });
  }, [attendanceDate]);

  /* -------------------------------------------------------
     LOAD PROGRAMS
  ------------------------------------------------------- */

  const loadPrograms = async () => {
    try {
      setLoadingPrograms(true);
      setError('');

      const response = await fetch('/api/lecturer/programs', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to load programs (${response.status})`);
      }

      const data = await response.json();

      setPrograms(
        Array.isArray(data)
          ? data
          : Array.isArray(data.programs)
            ? data.programs
            : []
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Failed to load programs.'
      );
    } finally {
      setLoadingPrograms(false);
    }
  };

  /* -------------------------------------------------------
     LOAD UNITS
  ------------------------------------------------------- */

  const loadUnits = async (programId: string) => {
    if (!programId) {
      setUnits([]);
      setSelectedUnit('');
      return;
    }

    try {
      setLoadingUnits(true);
      setError('');
      setUnits([]);
      setSelectedUnit('');

      const response = await fetch(
        `/api/lecturer/units?program_id=${encodeURIComponent(programId)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load units (${response.status})`);
      }

      const data = await response.json();

      setUnits(
        Array.isArray(data)
          ? data
          : Array.isArray(data.units)
            ? data.units
            : []
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Failed to load units.'
      );
    } finally {
      setLoadingUnits(false);
    }
  };

  /* -------------------------------------------------------
     LOAD EXISTING ATTENDANCE FOR A CLASS SESSION
  ------------------------------------------------------- */

  const loadExistingAttendance = async (
    unitId: string,
    date: string,
    studentList: Student[] = students
  ) => {
    if (!unitId || !date) return;

    try {
      setLoadingAttendance(true);

      const response = await fetch(
        `/api/lecturer/attendance?unit_id=${encodeURIComponent(
          unitId
        )}&attendance_date=${encodeURIComponent(date)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error('Could not retrieve saved attendance.');
      }

      const data = await response.json();

      const records: AttendanceRecord[] = Array.isArray(data)
        ? data
        : Array.isArray(data.attendance)
          ? data.attendance
          : [];

      const existing: AttendanceMap = {};

      // Default students to present until their saved record is loaded.
      studentList.forEach((student) => {
        const enrollmentId =
          student.enrollment_id || student.id;

        existing[String(enrollmentId)] = {
          status: 'present',
          remarks: '',
        };
      });

      records.forEach((record) => {
        existing[String(record.enrollment_id)] = {
          status: record.status,
          remarks: record.remarks || '',
        };
      });

      setAttendance(existing);
    } catch (err) {
      console.error('LOAD ATTENDANCE ERROR:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load attendance.'
      );
    } finally {
      setLoadingAttendance(false);
    }
  };

  /* -------------------------------------------------------
     LOAD STUDENTS
  ------------------------------------------------------- */

  const loadStudents = async () => {
    if (!selectedProgram) {
      setError('Please select a program.');
      return;
    }

    try {
      setLoadingStudents(true);
      setError('');
      setSuccess('');
      setStudents([]);
      setAttendance({});

      const response = await fetch('/api/lecturer/students', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to load students (${response.status})`);
      }

      const data = await response.json();

      const studentData: Student[] = Array.isArray(data)
        ? data
        : Array.isArray(data.students)
          ? data.students
          : [];

      const filtered = studentData.filter(
        (student) =>
          Number(student.program?.id) === Number(selectedProgram)
      );

      setStudents(filtered);

      const initialAttendance: AttendanceMap = {};

      filtered.forEach((student) => {
        const enrollmentId =
          student.enrollment_id || student.id;

        initialAttendance[String(enrollmentId)] = {
          status: 'present',
          remarks: '',
        };
      });

      setAttendance(initialAttendance);

      if (selectedUnit) {
        await loadExistingAttendance(
          selectedUnit,
          attendanceDate,
          filtered
        );
      }
    } catch (err) {
      console.error(err);
      setStudents([]);
      setError(
        err instanceof Error ? err.message : 'Failed to load students.'
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  /* -------------------------------------------------------
     EFFECTS
  ------------------------------------------------------- */

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadUnits(selectedProgram);
      setStudents([]);
      setAttendance({});
    } else {
      setUnits([]);
      setSelectedUnit('');
      setStudents([]);
      setAttendance({});
    }
  }, [selectedProgram]);

  useEffect(() => {
    if (selectedUnit && students.length > 0) {
      loadExistingAttendance(selectedUnit, attendanceDate);
    }
  }, [selectedUnit, attendanceDate]);

  /* -------------------------------------------------------
     FILTER STUDENTS
  ------------------------------------------------------- */

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) =>
      [
        student.name,
        student.admission_number,
        student.student_number,
        student.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [students, search]);

  /* -------------------------------------------------------
     STATISTICS
  ------------------------------------------------------- */

  const attendanceStats = useMemo(() => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: students.length,
    };

    students.forEach((student) => {
      const enrollmentId =
        student.enrollment_id || student.id;

      const status =
        attendance[String(enrollmentId)]?.status || 'present';

      stats[status]++;
    });

    return stats;
  }, [students, attendance]);

  /* -------------------------------------------------------
     CHANGE STUDENT STATUS
  ------------------------------------------------------- */

  const setStudentStatus = (
    student: Student,
    status: AttendanceStatus
  ) => {
    const enrollmentId =
      student.enrollment_id || student.id;

    setAttendance((previous) => ({
      ...previous,
      [String(enrollmentId)]: {
        status,
        remarks:
          previous[String(enrollmentId)]?.remarks || '',
      },
    }));
  };

  /* -------------------------------------------------------
     CHANGE STUDENT REMARKS
  ------------------------------------------------------- */

  const setStudentRemark = (
    student: Student,
    remarks: string
  ) => {
    const enrollmentId =
      student.enrollment_id || student.id;

    setAttendance((previous) => ({
      ...previous,
      [String(enrollmentId)]: {
        status:
          previous[String(enrollmentId)]?.status || 'present',
        remarks,
      },
    }));
  };

  /* -------------------------------------------------------
     MARK ALL STUDENTS
  ------------------------------------------------------- */

  const markAll = (status: AttendanceStatus) => {
    const updated: AttendanceMap = {};

    students.forEach((student) => {
      const enrollmentId =
        student.enrollment_id || student.id;

      updated[String(enrollmentId)] = {
        status,
        remarks:
          attendance[String(enrollmentId)]?.remarks || '',
      };
    });

    setAttendance(updated);
  };

  /* -------------------------------------------------------
     SAVE ATTENDANCE
  ------------------------------------------------------- */

  const saveAttendance = async () => {
    if (!selectedProgram || !selectedUnit || !attendanceDate) {
      setError('Select a program, unit and attendance date.');
      return;
    }

    if (students.length === 0) {
      setError('There are no students to mark.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const records = students.map((student) => {
        const enrollmentId =
          student.enrollment_id || student.id;

        const record = attendance[String(enrollmentId)];

        return {
          enrollment_id: Number(enrollmentId),
          program_id: Number(selectedProgram),
          unit_id: Number(selectedUnit),
          attendance_date: attendanceDate,
          status: record?.status || 'present',
          remarks: record?.remarks || null,
        };
      });

      const response = await fetch('/api/lecturer/attendance', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          program_id: Number(selectedProgram),
          unit_id: Number(selectedUnit),
          attendance_date: attendanceDate,
          records,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || `Failed to save attendance (${response.status})`
        );
      }

      setSuccess(
        data?.message || 'Attendance saved successfully.'
      );

      await loadExistingAttendance(selectedUnit, attendanceDate);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Failed to save attendance.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------
     CALCULATE EXPORT DATE RANGE
  ------------------------------------------------------- */

  const getExportDateRange = () => {
    const selected = parseLocalDate(attendanceDate);

    if (exportPeriod === 'custom') {
      return {
        start: customStartDate,
        end: customEndDate,
      };
    }

    if (exportPeriod === 'day') {
      return {
        start: attendanceDate,
        end: attendanceDate,
      };
    }

    if (exportPeriod === 'week') {
      const day = selected.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;

      const monday = new Date(selected);
      monday.setDate(selected.getDate() + mondayOffset);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        start: toDateInputValue(monday),
        end: toDateInputValue(sunday),
      };
    }

    if (exportPeriod === 'month') {
      const first = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        1
      );

      const last = new Date(
        selected.getFullYear(),
        selected.getMonth() + 1,
        0
      );

      return {
        start: toDateInputValue(first),
        end: toDateInputValue(last),
      };
    }

    const first = new Date(selected.getFullYear(), 0, 1);
    const last = new Date(selected.getFullYear(), 11, 31);

    return {
      start: toDateInputValue(first),
      end: toDateInputValue(last),
    };
  };

  /* -------------------------------------------------------
     DOWNLOAD ATTENDANCE REPORT
     
     Uses the existing GET endpoint one date at a time.
     Downloads only saved attendance records.
  ------------------------------------------------------- */

  const downloadAttendance = async () => {
    if (!selectedProgram || !selectedUnit) {
      setError('Select a program and unit before downloading.');
      return;
    }

    if (students.length === 0) {
      setError('Load the students for this class before downloading.');
      return;
    }

    const { start, end } = getExportDateRange();

    if (!start || !end || start > end) {
      setError('Please provide a valid attendance date range.');
      return;
    }

    try {
      setDownloading(true);
      setError('');
      setSuccess('');

      const dates = getDateList(start, end);

      const studentLookup = new Map(
        students.map((student) => [
          String(student.enrollment_id || student.id),
          student,
        ])
      );

      const exportRows: Array<{
        date: string;
        weekday: string;
        student: Student;
        status: string;
        remarks: string;
      }> = [];

      // Process a small group of dates at a time.
      // This avoids sending hundreds of requests simultaneously.
      const batchSize = 8;

      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);

        const results = await Promise.all(
          batch.map(async (date) => {
            const response = await fetch(
              `/api/lecturer/attendance?unit_id=${encodeURIComponent(
                selectedUnit
              )}&attendance_date=${encodeURIComponent(date)}`,
              {
                credentials: 'include',
                cache: 'no-store',
              }
            );

            if (!response.ok) {
              throw new Error(
                `Could not retrieve attendance for ${date}.`
              );
            }

            const data = await response.json();

            const records: AttendanceRecord[] = Array.isArray(data)
              ? data
              : Array.isArray(data.attendance)
                ? data.attendance
                : [];

            return { date, records };
          })
        );

        results.forEach(({ date, records }) => {
          const weekday = parseLocalDate(date).toLocaleDateString(
            'en-GB',
            { weekday: 'long' }
          );

          records.forEach((record) => {
            const student = studentLookup.get(
              String(record.enrollment_id)
            );

            if (!student) return;

            exportRows.push({
              date,
              weekday,
              student,
              status: record.status,
              remarks: record.remarks || '',
            });
          });
        });
      }

      if (exportRows.length === 0) {
        throw new Error(
          'No saved attendance records were found for the selected period.'
        );
      }

      exportRows.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;

        return a.student.name.localeCompare(b.student.name);
      });

      const headers = [
        'Attendance Date',
        'Day',
        'Program',
        'Unit',
        'Admission Number',
        'Student Number',
        'Student Name',
        'Attendance Status',
        'Remarks',
      ];

      const rows = exportRows.map((row) => [
        row.date,
        row.weekday,
        selectedProgramData?.name || '',
        selectedUnitData?.name || '',
        row.student.admission_number || '',
        row.student.student_number || '',
        row.student.name || '',
        row.status.toUpperCase(),
        row.remarks,
      ]);

      const csv = [
        headers,
        ...rows,
      ]
        .map((row) => row.map(csvEscape).join(','))
        .join('\r\n');

      // BOM helps Excel display the CSV correctly.
      const blob = new Blob(
        ['\uFEFF', csv],
        { type: 'text/csv;charset=utf-8;' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const periodLabel =
        exportPeriod === 'custom'
          ? `${start}_to_${end}`
          : `${exportPeriod}_${start}`;

      link.href = url;
      link.download = `SMTC_Attendance_${safeFileName(
        selectedUnitData?.code || selectedUnitData?.name || 'Class'
      )}_${periodLabel}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setSuccess(
        `Attendance report downloaded. ${exportRows.length} saved attendance records included.`
      );
    } catch (err) {
      console.error('ATTENDANCE EXPORT ERROR:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to download attendance report.'
      );
    } finally {
      setDownloading(false);
    }
  };

  /* -------------------------------------------------------
     REFRESH PAGE DATA
  ------------------------------------------------------- */

  const refreshPage = async () => {
    await loadPrograms();

    if (selectedProgram) {
      await loadUnits(selectedProgram);
    }

    if (selectedProgram) {
      await loadStudents();
    }
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
              <ClipboardCheck size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Class Attendance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage class sessions, record attendance and generate reports.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshPage}
            disabled={loadingPrograms || loadingUnits || loadingStudents}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-green/20 hover:bg-brand-green/5 hover:text-brand-green disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                loadingPrograms || loadingUnits || loadingStudents
                  ? 'animate-spin'
                  : ''
              }
            />
            Refresh
          </button>
        </div>

        {/* ALERTS */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <Check size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* SESSION SETUP */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-brand-green/10 p-2.5 text-brand-green">
              <CalendarDays size={21} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Class Session Setup
              </h2>

              <p className="text-sm text-slate-500">
                Choose the class and the date on which the session took place.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* PROGRAM */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Program
              </label>

              <div className="relative">
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  disabled={loadingPrograms}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10 disabled:opacity-60"
                >
                  <option value="">
                    {loadingPrograms ? 'Loading programs...' : 'Select program'}
                  </option>

                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            {/* UNIT */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Unit / Class
              </label>

              <div className="relative">
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  disabled={!selectedProgram || loadingUnits}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10 disabled:opacity-60"
                >
                  <option value="">
                    {!selectedProgram
                      ? 'Select program first'
                      : loadingUnits
                        ? 'Loading units...'
                        : 'Select unit'}
                  </option>

                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code ? `${unit.code} — ${unit.name}` : unit.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            {/* SESSION DATE */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Session Date
              </label>

              <div className="relative">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10"
                />
              </div>
            </div>
          </div>

          {/* SESSION DETAILS */}

          <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-brand-green/10 bg-brand-green/5 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Session day
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {selectedWeekday}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Session date
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {formatDate(attendanceDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Class
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {selectedUnitData?.name || 'No unit selected'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={loadStudents}
              disabled={!selectedProgram || loadingStudents}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {loadingStudents ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Users size={18} />
              )}
              Load Class Students
            </button>
          </div>
        </div>

        {/* CURRENT SESSION SUMMARY */}

        {selectedProgramData && selectedUnitData && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-green">
                  Active class session
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedUnitData.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedProgramData.name}
                  {selectedUnitData.code
                    ? ` • ${selectedUnitData.code}`
                    : ''}
                </p>
              </div>

              <div className="rounded-xl bg-brand-green/5 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Class session
                </p>
                <p className="mt-1 font-bold text-brand-green">
                  {selectedWeekday}, {formatDate(attendanceDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATISTICS */}

        {students.length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <AttendanceStat
              title="Present"
              value={attendanceStats.present}
              icon={<UserCheck size={20} />}
              className="border-green-100 bg-green-50 text-green-700"
            />

            <AttendanceStat
              title="Absent"
              value={attendanceStats.absent}
              icon={<UserX size={20} />}
              className="border-red-100 bg-red-50 text-red-700"
            />

            <AttendanceStat
              title="Late"
              value={attendanceStats.late}
              icon={<Clock3 size={20} />}
              className="border-amber-100 bg-amber-50 text-amber-700"
            />

            <AttendanceStat
              title="Excused"
              value={attendanceStats.excused}
              icon={<ClipboardCheck size={20} />}
              className="border-brand-green/10 bg-brand-green/5 text-brand-green"
            />
          </div>
        )}

        {/* ATTENDANCE REGISTER */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Class Attendance Register
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {students.length > 0
                  ? `${students.length} students • ${selectedWeekday}, ${formatDate(attendanceDate)}`
                  : 'Load students to begin recording this class session.'}
              </p>
            </div>

            {students.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markAll('present')}
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                >
                  Mark All Present
                </button>

                <button
                  type="button"
                  onClick={() => markAll('absent')}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Mark All Absent
                </button>
              </div>
            )}
          </div>

          {/* SEARCH */}

          {students.length > 0 && (
            <div className="border-b border-slate-100 p-4">
              <div className="relative max-w-md">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10"
                />
              </div>
            </div>
          )}

          {loadingStudents ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <Loader2
                  size={34}
                  className="mx-auto animate-spin text-brand-green"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Loading class students...
                </p>
              </div>
            </div>
          ) : students.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="rounded-full bg-brand-green/10 p-5">
                <Users size={30} className="text-brand-green" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No class register loaded
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Select a program, unit and session date, then load the students.
              </p>
            </div>
          ) : loadingAttendance ? (
            <div className="flex min-h-[250px] items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 size={22} className="animate-spin text-brand-green" />
              Loading saved attendance...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
              No students match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">No.</th>
                    <th className="px-5 py-4 font-semibold">Student</th>
                    <th className="px-5 py-4 font-semibold">Admission No.</th>
                    <th className="px-5 py-4 font-semibold">Student Number</th>
                    <th className="px-5 py-4 font-semibold">Attendance Status</th>
                    <th className="px-5 py-4 font-semibold">Remarks</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student, index) => {
                    const enrollmentId =
                      student.enrollment_id || student.id;

                    const record = attendance[String(enrollmentId)];
                    const status = record?.status || 'present';

                    return (
                      <tr
                        key={student.id}
                        className="transition hover:bg-brand-green/[0.03]"
                      >
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {String(index + 1).padStart(2, '0')}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 font-bold text-brand-green">
                              {student.name?.charAt(0).toUpperCase() || 'S'}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {student.name}
                              </p>

                              {student.email && (
                                <p className="text-xs text-slate-500">
                                  {student.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-700">
                          {student.admission_number || '—'}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {student.student_number || '—'}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((option) => (
                              <AttendanceButton
                                key={option}
                                label={capitalize(option)}
                                active={status === option}
                                type={option}
                                onClick={() =>
                                  setStudentStatus(student, option)
                                }
                              />
                            ))}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={record?.remarks || ''}
                            onChange={(e) =>
                              setStudentRemark(student, e.target.value)
                            }
                            placeholder="Optional remarks..."
                            className="w-full min-w-[170px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SAVE BAR */}

          {students.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {students.length}
                </span>{' '}
                students in this class session.

                <span className="ml-2 text-slate-500">
                  {selectedWeekday}, {formatDate(attendanceDate)}
                </span>
              </div>

              <button
                type="button"
                onClick={saveAttendance}
                disabled={
                  saving ||
                  !selectedProgram ||
                  !selectedUnit ||
                  loadingAttendance
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}

                {saving ? 'Saving Attendance...' : 'Save Class Attendance'}
              </button>
            </div>
          )}
        </div>

        {/* ATTENDANCE REPORT DOWNLOAD */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-5">
            <div className="rounded-xl bg-brand-green/10 p-3 text-brand-green">
              <FileSpreadsheet size={23} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Attendance Reports & Downloads
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Download saved attendance records for a selected class and period.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Report period
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {(
                  [
                    ['day', 'Daily'],
                    ['week', 'Weekly'],
                    ['month', 'Monthly'],
                    ['year', 'Yearly'],
                    ['custom', 'Custom range'],
                  ] as [ExportPeriod, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setExportPeriod(value)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      exportPeriod === value
                        ? 'border-brand-green bg-brand-green text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-green/40 hover:bg-brand-green/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {exportPeriod === 'custom' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-green focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    End date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    min={customStartDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-green focus:bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reference date
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedWeekday}, {formatDate(attendanceDate)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  The selected date determines the day, week, month or year report.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-4 rounded-xl border border-brand-green/10 bg-brand-green/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  Download class attendance
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {selectedUnitData?.name || 'Select a unit'} •{' '}
                  {exportPeriod === 'custom'
                    ? `${formatDate(customStartDate)} – ${formatDate(customEndDate)}`
                    : `${exportPeriod.charAt(0).toUpperCase()}${exportPeriod.slice(1)} report`}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  CSV format — compatible with Microsoft Excel and Google Sheets.
                </p>
              </div>

              <button
                type="button"
                onClick={downloadAttendance}
                disabled={
                  downloading ||
                  !selectedProgram ||
                  !selectedUnit ||
                  students.length === 0
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}

                {downloading ? 'Preparing report...' : 'Download Attendance'}
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-500">
              Reports contain saved attendance records for the selected unit.
              Save the current class session before downloading if you have made
              changes that should appear in the report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ATTENDANCE BUTTON
========================================================= */

function AttendanceButton({
  label,
  active,
  type,
  onClick,
}: {
  label: string;
  active: boolean;
  type: AttendanceStatus;
  onClick: () => void;
}) {
  const styles: Record<AttendanceStatus, string> = {
    present:
      'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    absent:
      'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    late:
      'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    excused:
      'border-brand-green/20 bg-brand-green/5 text-brand-green hover:bg-brand-green/10',
  };

  const activeStyles: Record<AttendanceStatus, string> = {
    present: 'border-green-600 bg-green-600 text-white',
    absent: 'border-red-600 bg-red-600 text-white',
    late: 'border-amber-500 bg-amber-500 text-white',
    excused: 'border-brand-green bg-brand-green text-white',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        active ? activeStyles[type] : styles[type]
      }`}
    >
      {label}
    </button>
  );
}

/* =========================================================
   ATTENDANCE STAT CARD
========================================================= */

function AttendanceStat({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>

        <div className="rounded-xl bg-white/70 p-2.5">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getToday() {
  const date = new Date();
  return toDateInputValue(date);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return '—';

  return parseLocalDate(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getDateList(start: string, end: string) {
  const dates: string[] = [];
  const current = parseLocalDate(start);
  const last = parseLocalDate(end);

  while (current <= last) {
    dates.push(toDateInputValue(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function csvEscape(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
