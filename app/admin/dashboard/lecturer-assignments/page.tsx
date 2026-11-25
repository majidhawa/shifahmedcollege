
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Lecturer = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  active?: boolean;
};

type Program = {
  id: number;
  name: string;
  code?: string | null;
  status?: string;
};

type Unit = {
  id: number;
  program_id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  program_name: string;
  program_code?: string | null;
  year_of_study?: number | null;
  term_number?: number | null;
  status?: string;
};

type Student = {
  enrollment_id: number;
  application_id: number;
  program_id: number;
  full_name: string;
  email?: string | null;
  mobile?: string | null;
  admission_number?: string | null;
  application_number?: string | null;
  program_name?: string | null;
  program_code?: string | null;
  student_number?: string | null;
  year_of_study?: number | null;
  enrollment_status?: string;
  term_id?: number | null;
  intake?: string | null;
  enrolled_at?: string | null;
};

type LecturerProgram = {
  id: number;
  lecturer_id: number;
  program_id: number;
  program_name: string;
  program_code?: string | null;
  assigned_unit_count?: number;
  lecturer_name?: string;
  lecturer_email?: string;
};

type LecturerUnit = {
  id: number;
  lecturer_id: number;
  unit_id: number;
  program_id: number;
  unit_name: string;
  unit_code?: string | null;
  program_name: string;
  program_code?: string | null;
  program_access: boolean;
  direct_access: boolean;
  assigned_at?: string;
};

type StudentUnitAssignment = {
  id: number;
  lecturer_id: number;
  application_id: number;
  enrollment_id: number;
  unit_id: number;
  program_id: number;
  lecturer_name: string;
  student_name: string;
  student_email?: string | null;
  admission_number?: string | null;
  application_number?: string | null;
  student_program_name?: string | null;
  student_number?: string | null;
  unit_name: string;
  unit_code?: string | null;
  unit_program_name: string;
  unit_program_code?: string | null;
  enrollment_status?: string;
  term_id?: number | null;
};

type LegacyStudentAssignment = {
  id: number;
  lecturer_id: number;
  application_id: number;
  program_id: number;
  student_name: string;
  student_email?: string | null;
  assigned_program_name?: string | null;
  admission_number?: string | null;
  application_number?: string | null;
};

type Data = {
  lecturers: Lecturer[];
  programs: Program[];
  units: Unit[];
  students: Student[];
  lecturerPrograms: LecturerProgram[];
  lecturerUnits: LecturerUnit[];
  studentAssignments: StudentUnitAssignment[];
  legacyStudentAssignments: LegacyStudentAssignment[];
};

type GroupedStudent = {
  application_id: number;
  name: string;
  email?: string | null;
  admission?: string | null;
  enrolledPrograms: string[];
  units: StudentUnitAssignment[];
  legacyPrograms: string[];
};

const emptyData: Data = {
  lecturers: [],
  programs: [],
  units: [],
  students: [],
  lecturerPrograms: [],
  lecturerUnits: [],
  studentAssignments: [],
  legacyStudentAssignments: [],
};

/* =========================================================
   HELPERS
========================================================= */

function studentEnrollmentKey(student: Student): string {
  return `${student.application_id}:${student.enrollment_id}`;
}

/* =========================================================
   PAGE
========================================================= */

export default function LecturerAssignmentsPage() {
  const [data, setData] = useState<Data>(emptyData);

  const [selectedLecturerId, setSelectedLecturerId] = useState('');

  const [programId, setProgramId] = useState('');
  const [unitId, setUnitId] = useState('');

  // Exact enrolment selection, not just application/programme.
  const [selectedStudentKey, setSelectedStudentKey] = useState('');

  const [studentUnitId, setStudentUnitId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData = useCallback(async (keepSelection = true) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        '/api/admin/lecturer-assignments',
        { cache: 'no-store' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Unable to load lecturer assignments.'
        );
      }

      const next: Data = {
        lecturers: result.lecturers || [],
        programs: result.programs || [],
        units: result.units || [],
        students: result.students || [],
        lecturerPrograms: result.lecturerPrograms || [],
        lecturerUnits: result.lecturerUnits || [],
        studentAssignments: result.studentAssignments || [],
        legacyStudentAssignments:
          result.legacyStudentAssignments || [],
      };

      setData(next);

      setSelectedLecturerId((current) => {
        if (
          !keepSelection ||
          !current ||
          !next.lecturers.some(
            (item) => String(item.id) === current
          )
        ) {
          return next.lecturers[0]
            ? String(next.lecturers[0].id)
            : '';
        }

        return current;
      });

      // Preserve selection only while the exact enrolment exists.
      setSelectedStudentKey((current) => {
        if (!current) return '';

        const exists = next.students.some(
          (student) => studentEnrollmentKey(student) === current
        );

        return exists ? current : '';
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load lecturer assignments.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  /* =======================================================
     SELECTED LECTURER
  ======================================================= */

  const lecturerId = Number(selectedLecturerId);

  const lecturer =
    data.lecturers.find(
      (item) => item.id === lecturerId
    ) || null;

  const assignedPrograms = useMemo(
    () =>
      data.lecturerPrograms.filter(
        (item) => item.lecturer_id === lecturerId
      ),
    [data.lecturerPrograms, lecturerId]
  );

  const assignedUnits = useMemo(
    () =>
      data.lecturerUnits.filter(
        (item) => item.lecturer_id === lecturerId
      ),
    [data.lecturerUnits, lecturerId]
  );

  const assignedStudentUnits = useMemo(
    () =>
      data.studentAssignments.filter(
        (item) => item.lecturer_id === lecturerId
      ),
    [data.studentAssignments, lecturerId]
  );

  const legacyStudentRows = useMemo(
    () =>
      data.legacyStudentAssignments.filter(
        (item) => item.lecturer_id === lecturerId
      ),
    [data.legacyStudentAssignments, lecturerId]
  );

  /* =======================================================
     GROUP STUDENTS BY APPLICATION
  ======================================================= */

  const lecturerStudents = useMemo(() => {
    const grouped = new Map<number, GroupedStudent>();

    for (const item of assignedStudentUnits) {
      const existing = grouped.get(item.application_id) || {
        application_id: item.application_id,
        name: item.student_name,
        email: item.student_email,
        admission:
          item.admission_number || item.application_number,
        enrolledPrograms: [],
        units: [],
        legacyPrograms: [],
      };

      if (
        item.student_program_name &&
        !existing.enrolledPrograms.includes(
          item.student_program_name
        )
      ) {
        existing.enrolledPrograms.push(
          item.student_program_name
        );
      }

      existing.units.push(item);

      grouped.set(item.application_id, existing);
    }

    for (const item of legacyStudentRows) {
      const existing = grouped.get(item.application_id) || {
        application_id: item.application_id,
        name: item.student_name,
        email: item.student_email,
        admission:
          item.admission_number || item.application_number,
        enrolledPrograms: [],
        units: [],
        legacyPrograms: [],
      };

      if (
        item.assigned_program_name &&
        !existing.legacyPrograms.includes(
          item.assigned_program_name
        )
      ) {
        existing.legacyPrograms.push(
          item.assigned_program_name
        );
      }

      grouped.set(item.application_id, existing);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [assignedStudentUnits, legacyStudentRows]);

  /* =======================================================
     UNITS THE LECTURER CAN TEACH
  ======================================================= */

  const availableUnitsForStudents = useMemo(() => {
    const accessibleUnitIds = new Set(
      assignedUnits
        .filter(
          (item) =>
            item.direct_access || item.program_access
        )
        .map((item) => item.unit_id)
    );

    const wholeProgramIds = new Set(
      assignedPrograms.map((item) => item.program_id)
    );

    return data.units.filter(
      (unit) =>
        accessibleUnitIds.has(unit.id) ||
        wholeProgramIds.has(unit.program_id)
    );
  }, [data.units, assignedUnits, assignedPrograms]);

  /* =======================================================
     STUDENT SEARCH
  ======================================================= */

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) return data.students;

    return data.students.filter((student) =>
      [
        student.full_name,
        student.admission_number,
        student.application_number,
        student.program_name,
        student.email,
        student.student_number,
      ].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [data.students, studentSearch]);

  /* =======================================================
     SELECTED STUDENT AND EXACT ENROLMENT
  ======================================================= */

  const selectedStudent = useMemo(() => {
    if (!selectedStudentKey) return null;

    return (
      data.students.find(
        (student) =>
          studentEnrollmentKey(student) === selectedStudentKey
      ) || null
    );
  }, [data.students, selectedStudentKey]);

  // Only show units belonging to the selected enrolment's programme.
  const unitsForSelectedStudent = useMemo(() => {
    if (!selectedStudent) return [];

    return availableUnitsForStudents.filter(
      (unit) =>
        unit.program_id === selectedStudent.program_id
    );
  }, [availableUnitsForStudents, selectedStudent]);

  /* =======================================================
     UNIT STUDENT COUNTS
  ======================================================= */

  const unitStudentCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const assignment of assignedStudentUnits) {
      counts.set(
        assignment.unit_id,
        (counts.get(assignment.unit_id) || 0) + 1
      );
    }

    return counts;
  }, [assignedStudentUnits]);

  /* =======================================================
     SUBMIT ACTION
  ======================================================= */

  async function submitAction(
    action: string,
    extra: Record<string, number>
  ) {
    if (!lecturerId) return;

    try {
      setSaving(true);
      setError('');
      setNotice('');

      const response = await fetch(
        '/api/admin/lecturer-assignments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            lecturerId,
            ...extra,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Unable to update assignment.'
        );
      }

      setNotice(
        result.message || 'Assignment updated successfully.'
      );

      if (action === 'assign-student-unit') {
        setStudentUnitId('');
      }

      await loadData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update assignment.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading && data.lecturers.length === 0) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center gap-3 text-brand-dark">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading lecturer assignments…
      </div>
    );
  }

  /* =======================================================
     PAGE UI
  ======================================================= */

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
              LMS Administration
            </p>

            <h1 className="mt-2 text-2xl font-extrabold text-brand-dark sm:text-3xl">
              Manage Lecturers
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Manage lecturer programme access, teaching units
              and student allocations. A student can have
              multiple lecturers and multiple programme enrolments
              under one application.
            </p>
          </div>

          <button
            onClick={() => void loadData(true)}
            disabled={loading || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />
            Refresh data
          </button>
        </header>

        {/* ERROR */}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}

        {/* SELECT LECTURER */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="lecturer-select"
            className="mb-2 block text-sm font-bold text-slate-800"
          >
            1. Select lecturer
          </label>

          <div className="relative max-w-2xl">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <select
              id="lecturer-select"
              value={selectedLecturerId}
              onChange={(event) => {
                setSelectedLecturerId(event.target.value);
                setNotice('');
                setError('');
              }}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            >
              <option value="">Choose a lecturer</option>

              {data.lecturers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.email}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {!data.lecturers.length && (
            <p className="mt-3 text-sm text-amber-700">
              No active lecturer accounts were found.
            </p>
          )}
        </section>

        {/* LECTURER WORKSPACE */}

        {lecturer && (
          <>
            {/* LECTURER SUMMARY */}

            <section className="rounded-2xl border border-brand-green/15 bg-gradient-to-r from-brand-green to-brand-dark p-5 text-white shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <GraduationCap className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-lg font-extrabold">
                      {lecturer.name}
                    </h2>

                    <p className="text-sm text-white/75">
                      {lecturer.email}
                      {lecturer.phone
                        ? ` · ${lecturer.phone}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                  <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
                    <p className="text-2xl font-extrabold">
                      {assignedPrograms.length}
                    </p>
                    <p className="text-[11px] text-white/75">
                      Programmes
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
                    <p className="text-2xl font-extrabold">
                      {availableUnitsForStudents.length}
                    </p>
                    <p className="text-[11px] text-white/75">
                      Teaching units
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
                    <p className="text-2xl font-extrabold">
                      {lecturerStudents.length}
                    </p>
                    <p className="text-[11px] text-white/75">
                      Students
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* PROGRAMME AND UNIT ASSIGNMENTS */}

            <section className="grid gap-5 xl:grid-cols-2">

              {/* PROGRAMMES */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand-green" />
                  <h2 className="font-extrabold text-slate-900">
                    Programme assignments
                  </h2>
                </div>

                <p className="mb-4 text-xs leading-5 text-slate-500">
                  A programme assignment gives the lecturer
                  access to all units in that programme.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={programId}
                    onChange={(event) =>
                      setProgramId(event.target.value)
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">Select programme</option>

                    {data.programs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <button
                    disabled={!programId || saving}
                    onClick={() =>
                      void submitAction('assign-program', {
                        programId: Number(programId),
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Assign
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {assignedPrograms.map((item) => (
                    <div
                      key={`${item.lecturer_id}-${item.program_id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {item.program_name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {item.program_code ||
                            `Programme #${item.program_id}`}
                          {' · All programme units'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.assigned_unit_count || 0} units covered
                        </p>
                      </div>

                      <button
                        title="Remove programme-wide access"
                        disabled={saving}
                        onClick={() =>
                          void submitAction('remove-program', {
                            programId: item.program_id,
                          })
                        }
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {!assignedPrograms.length && (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No whole-programme assignments yet.
                    </p>
                  )}
                </div>
              </div>

              {/* INDIVIDUAL UNITS */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand-green" />
                  <h2 className="font-extrabold text-slate-900">
                    Individual unit assignments
                  </h2>
                </div>

                <p className="mb-4 text-xs leading-5 text-slate-500">
                  Assign specific units from any programme,
                  including units outside the lecturer's main programme.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={unitId}
                    onChange={(event) =>
                      setUnitId(event.target.value)
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">Select unit</option>

                    {data.units.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.program_name} — {item.name}
                        {item.code ? ` (${item.code})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    disabled={!unitId || saving}
                    onClick={() =>
                      void submitAction('assign-unit', {
                        unitId: Number(unitId),
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Assign
                  </button>
                </div>

                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                  {assignedUnits.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {item.unit_name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {item.program_name}
                          {item.unit_code
                            ? ` · ${item.unit_code}`
                            : ''}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.program_access && (
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                              Programme access
                            </span>
                          )}

                          {item.direct_access && (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                              Direct unit access
                            </span>
                          )}
                        </div>
                      </div>

                      {item.direct_access && (
                        <button
                          title="Remove direct unit access"
                          disabled={saving}
                          onClick={() =>
                            void submitAction('remove-unit', {
                              unitId: item.unit_id,
                            })
                          }
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {!assignedUnits.length && (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No individual units assigned yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ASSIGN STUDENTS */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-green" />

                    <h2 className="font-extrabold text-slate-900">
                      Assign students to teaching units
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Assign students individually to the units this
                    lecturer teaches. Each assignment belongs to
                    a specific programme enrolment.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {availableUnitsForStudents.length} eligible units
                </span>
              </div>

              {/* STUDENT SEARCH */}

              <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                <Search className="h-4 w-4 shrink-0" />

                <input
                  value={studentSearch}
                  onChange={(event) => {
                    setStudentSearch(event.target.value);
                    setSelectedStudentKey('');
                    setStudentUnitId('');
                  }}
                  placeholder="Search by student name, admission number or programme..."
                  className="w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-green"
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">

                {/* STUDENT AND ENROLMENT */}

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Student and programme enrolment
                  </label>

                  <select
                    value={selectedStudentKey}
                    onChange={(event) => {
                      setSelectedStudentKey(event.target.value);
                      setStudentUnitId('');
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">
                      Select student enrolment
                    </option>

                    {filteredStudents.map((item) => (
                      <option
                        key={studentEnrollmentKey(item)}
                        value={studentEnrollmentKey(item)}
                      >
                        {item.full_name}
                        {' — '}
                        {item.program_name || 'Programme not listed'}
                        {' ('}
                        {item.admission_number ||
                          item.application_number ||
                          item.student_number ||
                          item.application_id}
                        {')'}
                      </option>
                    ))}
                  </select>

                  {selectedStudent && (
                    <div className="mt-2 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800">
                      <p>
                        <strong>Programme:</strong>{' '}
                        {selectedStudent.program_name}
                      </p>
                      <p className="mt-1">
                        <strong>Enrolment ID:</strong>{' '}
                        {selectedStudent.enrollment_id}
                      </p>
                      {selectedStudent.student_number && (
                        <p className="mt-1">
                          <strong>Student number:</strong>{' '}
                          {selectedStudent.student_number}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* UNIT */}

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">
                    Unit to assign
                  </label>

                  <select
                    value={studentUnitId}
                    onChange={(event) =>
                      setStudentUnitId(event.target.value)
                    }
                    disabled={!selectedStudent}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100"
                  >
                    <option value="">
                      {!selectedStudent
                        ? 'Select a student first'
                        : unitsForSelectedStudent.length
                          ? 'Select unit'
                          : 'No eligible units for this programme'}
                    </option>

                    {unitsForSelectedStudent.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.code ? ` (${item.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SUBMIT */}

                <div className="flex items-end">
                  <button
                    disabled={
                      !selectedStudent ||
                      !studentUnitId ||
                      saving
                    }
                    onClick={() => {
                      if (!selectedStudent) return;

                      void submitAction(
                        'assign-student-unit',
                        {
                          applicationId:
                            selectedStudent.application_id,
                          enrollmentId:
                            selectedStudent.enrollment_id,
                          unitId: Number(studentUnitId),
                        }
                      );
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50 lg:w-auto"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Assign student
                  </button>
                </div>
              </div>

              {selectedStudent && !unitsForSelectedStudent.length && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  This lecturer has no assigned teaching units
                  in {selectedStudent.program_name || 'the selected programme'}.
                  Assign the lecturer to a unit or the programme first.
                </div>
              )}

              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                <strong>Assignment rule:</strong> Students must
                have an active enrolment in the programme offering
                the selected unit. The enrolment ID ensures that
                assignments for different programmes remain separate.
                Multiple lecturers can be assigned to the same student.
              </div>
            </section>

            {/* ASSIGNED STUDENTS */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-green" />

                    <h2 className="font-extrabold text-slate-900">
                      Students assigned to {lecturer.name}
                    </h2>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Each student is shown with their programme
                    enrolments and the units assigned to this lecturer.
                  </p>
                </div>

                <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">
                  {lecturerStudents.length} students
                </span>
              </div>

              {lecturerStudents.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Programmes</th>
                        <th className="px-5 py-3">Assigned units</th>
                        <th className="px-5 py-3">Total</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {lecturerStudents.map((student) => (
                        <tr
                          key={student.application_id}
                          className="align-top"
                        >
                          {/* STUDENT DETAILS */}

                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-800">
                              {student.name}
                            </p>

                            <p className="text-xs text-slate-500">
                              {student.admission ||
                                `Application #${student.application_id}`}
                            </p>

                            {student.email && (
                              <p className="text-xs text-slate-500">
                                {student.email}
                              </p>
                            )}
                          </td>

                          {/* PROGRAMMES */}

                          <td className="px-5 py-4 text-slate-700">
                            {student.enrolledPrograms.length ? (
                              student.enrolledPrograms.map((name) => (
                                <p
                                  key={name}
                                  className="mb-1 text-sm"
                                >
                                  {name}
                                </p>
                              ))
                            ) : (
                              <span className="text-slate-400">
                                Not available
                              </span>
                            )}

                            {student.legacyPrograms.map((name) => (
                              <p
                                key={name}
                                className="mt-1 text-xs text-amber-700"
                              >
                                Legacy assignment: {name}
                              </p>
                            ))}
                          </td>

                          {/* UNITS */}

                          <td className="px-5 py-4">
                            <div className="space-y-2">
                              {student.units.map((unit) => (
                                <div
                                  key={unit.id}
                                  className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                >
                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {unit.unit_name}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {unit.unit_program_name}
                                      {unit.unit_code
                                        ? ` · ${unit.unit_code}`
                                        : ''}
                                    </p>

                                    {unit.student_number && (
                                      <p className="mt-1 text-[11px] text-slate-400">
                                        Student number: {unit.student_number}
                                      </p>
                                    )}

                                    <p className="mt-1 text-[11px] text-slate-400">
                                      Enrolment #{unit.enrollment_id}
                                    </p>
                                  </div>

                                  <button
                                    title="Remove student from this unit and enrolment"
                                    disabled={saving}
                                    onClick={() =>
                                      void submitAction(
                                        'remove-student-unit',
                                        {
                                          applicationId:
                                            student.application_id,
                                          enrollmentId:
                                            unit.enrollment_id,
                                          unitId: unit.unit_id,
                                        }
                                      )
                                    }
                                    className="rounded-md p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}

                              {!student.units.length && (
                                <span className="text-xs text-amber-700">
                                  Existing programme-level assignment;
                                  no individual unit recorded.
                                </span>
                              )}
                            </div>
                          </td>

                          {/* TOTAL */}

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                              {student.units.length} units
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-2 font-semibold text-slate-700">
                    No students assigned yet
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Assign a student to one of this lecturer's
                    teaching units above.
                  </p>
                </div>
              )}
            </section>

            {/* UNIT ALLOCATION SUMMARY */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-green" />

                <h2 className="font-extrabold text-slate-900">
                  Teaching unit allocation summary
                </h2>
              </div>

              {availableUnitsForStudents.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {availableUnitsForStudents.map((unit) => {
                    const access = assignedUnits.find(
                      (item) => item.unit_id === unit.id
                    );

                    return (
                      <div
                        key={unit.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-800">
                              {unit.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {unit.program_name}
                              {unit.code ? ` · ${unit.code}` : ''}
                            </p>

                            <p className="mt-2 text-[10px] font-semibold text-slate-500">
                              {access?.program_access
                                ? 'Programme access'
                                : 'Direct unit access'}
                            </p>
                          </div>

                          <span className="rounded-lg bg-brand-green/10 px-2.5 py-1 text-sm font-extrabold text-brand-green">
                            {unitStudentCounts.get(unit.id) || 0}
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                          Assigned students
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No teaching units have been assigned to this lecturer.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
