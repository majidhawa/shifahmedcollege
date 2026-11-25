
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Loader2,
  Search,
  UserCheck,
  Users,
  X,
  Trash2,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Student = {
  id: number;
  application_id: number;
  full_name: string;
  email: string;
  application_number?: string;
  admission_number?: string;
  course?: string;
  intake?: string;
  application_status?: string;
  payment_status?: string;
};

type Program = {
  id: number;
  name: string;
};

type Lecturer = {
  id: number;
  name: string;
  email: string;
};

type UnitOption = {
  id: number;
  program_id: number;
  name: string;
  code?: string | null;
  program_name: string;
};

type LecturerProgram = {
  id: number;
  lecturer_id: number;
  program_id: number;
  assigned_at?: string;
  updated_at?: string;
  lecturer_name: string;
  lecturer_email: string;
  program_name: string;
};

type Enrollment = {
  id: number;
  application_id: number;
  program_id: number;
  term_id?: number | null;
  student_number?: string;
  year_of_study?: number | null;
  enrollment_status?: string;
  enrolled_at?: string;
  completed_at?: string;
  updated_at?: string;
  lecturer_id?: number | null;
  program_name?: string;
  lecturer_name?: string;
  lecturer_email?: string;
};

type LecturerAssignment = {
  id: number;
  lecturer_id: number;
  application_id: number;
  enrollment_id?: number | null;
  program_id: number;
  unit_id?: number | null;
  unit_name?: string | null;
  unit_program_name?: string | null;
  assignment_type?: 'program' | 'unit' | string;
  assigned_at?: string;
  updated_at?: string;
  lecturer_name?: string;
  lecturer_email?: string;
  program_name?: string;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  message?: string;
  students?: Student[];
  programs?: Program[];
  units?: UnitOption[];
  lecturers?: Lecturer[];
  lecturerPrograms?: LecturerProgram[];
  enrollments?: Enrollment[];
  lecturerAssignments?: LecturerAssignment[];
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AdminAssignStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [lecturerPrograms, setLecturerPrograms] = useState<LecturerProgram[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [lecturerAssignments, setLecturerAssignments] = useState<LecturerAssignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<number | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('all');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedLecturer, setSelectedLecturer] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [assignmentType, setAssignmentType] = useState<'program' | 'unit'>('program');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      setError('');

      const response = await fetch('/api/admin/assign-students', {
        method: 'GET',
        cache: 'no-store',
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load assignment data.');
      }

      setStudents(data.students || []);
      setPrograms(data.programs || []);
      setUnits(data.units || []);
      setLecturers(data.lecturers || []);
      setLecturerPrograms(data.lecturerPrograms || []);
      setEnrollments(data.enrollments || []);
      setLecturerAssignments(data.lecturerAssignments || []);
    } catch (err) {
      console.error('Failed to load assignment data:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load assignment data.'
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* =====================================================
     ENROLLMENT HELPERS
  ===================================================== */

  const getStudentEnrollments = useCallback(
    (applicationId: number) => {
      return enrollments.filter(
        (item) =>
          Number(item.application_id) === Number(applicationId) &&
          !['inactive', 'cancelled', 'withdrawn'].includes(
            String(item.enrollment_status || '').toLowerCase()
          )
      );
    },
    [enrollments]
  );

  const getStudentEnrollment = useCallback(
    (applicationId: number) => {
      const studentEnrollments = getStudentEnrollments(applicationId);

      // Prefer an active enrolment.
      const activeEnrollment = studentEnrollments.find((item) =>
        ['active', 'enrolled', 'registered'].includes(
          String(item.enrollment_status || '').toLowerCase()
        )
      );

      return activeEnrollment || studentEnrollments[0];
    },
    [getStudentEnrollments]
  );

  const getStudentLecturers = useCallback(
    (applicationId: number) => {
      return lecturerAssignments.filter(
        (item) => Number(item.application_id) === Number(applicationId)
      );
    },
    [lecturerAssignments]
  );

  const isUnitAssignment = (assignment: LecturerAssignment) => {
    return (
      Boolean(assignment.unit_id) ||
      assignment.assignment_type === 'unit'
    );
  };

  const getAssignmentDescription = (assignment: LecturerAssignment) => {
    if (isUnitAssignment(assignment)) {
      return `Unit: ${assignment.unit_name || 'Unit assignment'}${
        assignment.unit_program_name
          ? ` · ${assignment.unit_program_name}`
          : ''
      }`;
    }

    return assignment.program_name || 'Programme-wide';
  };

  /* =====================================================
     FILTER STUDENTS
  ===================================================== */

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        String(student.full_name || '').toLowerCase().includes(query) ||
        String(student.email || '').toLowerCase().includes(query) ||
        String(student.course || '').toLowerCase().includes(query) ||
        String(student.application_number || '').toLowerCase().includes(query) ||
        String(student.admission_number || '').toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (programFilter === 'all') return true;

      return getStudentEnrollments(student.application_id).some(
        (enrollment) =>
          String(enrollment.program_id) === programFilter
      );
    });
  }, [students, search, programFilter, getStudentEnrollments]);

  /* =====================================================
     OPEN ASSIGNMENT MODAL
  ===================================================== */

  const openAssignModal = (student: Student) => {
    const enrollment = getStudentEnrollment(student.application_id);

    setSelectedStudent(student);
    setAssignmentType('program');
    setSelectedUnit('');
    setSelectedLecturer('');
    setSelectedProgram(enrollment ? String(enrollment.program_id) : '');

    setError('');
    setSuccess('');
    setShowAssignModal(true);
  };

  /* =====================================================
     LECTURER AUTHORISED PROGRAMMES
  ===================================================== */

  const authorizedPrograms = useMemo(() => {
    if (!selectedLecturer) return [];

    const lecturerProgramOptions = lecturerPrograms
      .filter(
        (item) =>
          Number(item.lecturer_id) === Number(selectedLecturer)
      )
      .map((item) => ({
        id: Number(item.program_id),
        name: item.program_name,
      }));

    return lecturerProgramOptions.filter(
      (program, index, array) =>
        array.findIndex((item) => item.id === program.id) === index
    );
  }, [selectedLecturer, lecturerPrograms]);

  /* =====================================================
     KEEP PROGRAMME SELECTION VALID
  ===================================================== */

  useEffect(() => {
    if (assignmentType !== 'program') return;

    if (!selectedLecturer) {
      setSelectedProgram('');
      return;
    }

    const selectedIsValid = authorizedPrograms.some(
      (program) => String(program.id) === selectedProgram
    );

    if (!selectedIsValid) {
      const studentEnrollment = selectedStudent
        ? getStudentEnrollment(selectedStudent.application_id)
        : undefined;

      const enrolledProgramIsAuthorized =
        studentEnrollment &&
        authorizedPrograms.some(
          (program) =>
            program.id === Number(studentEnrollment.program_id)
        );

      if (enrolledProgramIsAuthorized && studentEnrollment) {
        setSelectedProgram(String(studentEnrollment.program_id));
      } else if (authorizedPrograms.length === 1) {
        setSelectedProgram(String(authorizedPrograms[0].id));
      } else {
        setSelectedProgram('');
      }
    }
  }, [
    assignmentType,
    selectedLecturer,
    authorizedPrograms,
    selectedProgram,
    selectedStudent,
    getStudentEnrollment,
  ]);

  /* =====================================================
     ASSIGN STUDENT
  ===================================================== */

  const handleAssign = async () => {
    if (!selectedStudent) {
      setError('Please select a student.');
      return;
    }

    if (!selectedLecturer) {
      setError('Please select a lecturer.');
      return;
    }

    const enrollment = getStudentEnrollment(
      selectedStudent.application_id
    );

    /*
      A programme assignment does not require the student's
      existing enrolment ID.

      A unit assignment requires the exact existing enrolment
      because the unit registration belongs to that enrolment.
    */

    if (assignmentType === 'unit' && !enrollment) {
      setError(
        'This student does not have an active LMS enrolment. Enrol the student before assigning a unit lecturer.'
      );
      return;
    }

    if (assignmentType === 'program') {
      if (!selectedProgram) {
        setError('Please select the programme for this lecturer assignment.');
        return;
      }

      const lecturerIsAuthorized = authorizedPrograms.some(
        (program) => String(program.id) === selectedProgram
      );

      if (!lecturerIsAuthorized) {
        setError(
          'The selected lecturer is not authorized for the selected programme.'
        );
        return;
      }
    }

    if (assignmentType === 'unit') {
      if (!selectedUnit) {
        setError('Please select the unit to assign.');
        return;
      }

      const selectedUnitOption = units.find(
        (unit) => Number(unit.id) === Number(selectedUnit)
      );

      if (!selectedUnitOption) {
        setError('The selected unit could not be found. Please refresh and try again.');
        return;
      }
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const requestBody = {
        applicationId: Number(selectedStudent.application_id),

        /*
          Programme assignment:
          Use the programme selected in the modal.

          Unit assignment:
          Use the student's primary enrolment programme.
          The API determines the actual unit programme from lms_units.
        */
        programId:
          assignmentType === 'unit'
            ? Number(enrollment!.program_id)
            : Number(selectedProgram),

        /*
          IMPORTANT FIX:

          Programme assignments must send null.
          Do not send the student's existing enrolment ID,
          because it may belong to another programme.

          Unit assignments must send the exact enrolment ID.
        */
        enrollmentId:
          assignmentType === 'unit'
            ? Number(enrollment!.id)
            : null,

        lecturerId: Number(selectedLecturer),
        assignmentType,

        unitId:
          assignmentType === 'unit'
            ? Number(selectedUnit)
            : null,
      };

      console.log('Submitting lecturer assignment:', requestBody);

      const response = await fetch('/api/admin/assign-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || 'Failed to assign lecturer.'
        );
      }

      setShowAssignModal(false);
      setSelectedStudent(null);
      setSelectedLecturer('');
      setSelectedProgram('');
      setSelectedUnit('');

      setSuccess(
        data.message || 'Lecturer assigned successfully.'
      );

      await loadData(false);
    } catch (err) {
      console.error('Student assignment failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to assign lecturer.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     REMOVE ONE LECTURER ASSIGNMENT
  ===================================================== */

  const removeLecturer = async (
    assignment: LecturerAssignment
  ) => {
    const assignmentLabel =
      assignment.lecturer_name || 'this lecturer';

    if (
      !window.confirm(
        `Remove ${assignmentLabel}'s assignment from this student?`
      )
    ) {
      return;
    }

    setRemovingAssignmentId(assignment.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/assign-students', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: Number(assignment.application_id),
          type: 'lecturer',
          lecturerId: Number(assignment.lecturer_id),
          programId: Number(assignment.program_id),
          unitId: assignment.unit_id
            ? Number(assignment.unit_id)
            : null,
          enrollmentId: assignment.enrollment_id
            ? Number(assignment.enrollment_id)
            : null,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            'Failed to remove lecturer assignment.'
        );
      }

      setSuccess(
        data.message || 'Lecturer assignment removed successfully.'
      );

      await loadData(false);
    } catch (err) {
      console.error('Failed to remove lecturer:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to remove lecturer.'
      );
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  /* =====================================================
     STATISTICS
  ===================================================== */

  const assignedStudents = students.filter(
    (student) => getStudentEnrollment(student.application_id)
  ).length;

  const lecturerAssignedStudents = students.filter(
    (student) =>
      getStudentLecturers(student.application_id).length > 0
  ).length;

  const totalLecturerAssignments = lecturerAssignments.length;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-xl bg-brand-green/10 p-2 text-brand-green">
              <UserCheck size={22} />
            </div>

            <span className="text-sm font-semibold uppercase tracking-wide text-brand-green">
              Admin LMS
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Assign Students
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Enrol students into LMS programmes and assign multiple lecturers
            to each student, programme or individual unit.
          </p>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />

            <div className="flex-1 text-sm">{error}</div>

            <button
              onClick={() => setError('')}
              className="rounded-lg p-1 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

            <div className="flex-1 text-sm">{success}</div>

            <button
              onClick={() => setSuccess('')}
              className="rounded-lg p-1 hover:bg-green-100"
              aria-label="Dismiss success message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* STATISTICS */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users size={21} />}
            label="Approved Students"
            value={students.length}
          />

          <StatCard
            icon={<BookOpen size={21} />}
            label="LMS Programmes"
            value={programs.length}
          />

          <StatCard
            icon={<GraduationCap size={21} />}
            label="Programme Enrolled"
            value={assignedStudents}
          />

          <StatCard
            icon={<UserCheck size={21} />}
            label="Lecturer Assignments"
            value={totalLecturerAssignments}
            subtitle={`${lecturerAssignedStudents} students with lecturers`}
          />
        </div>

        {/* FILTERS */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student name, email, course or application number..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/20"
              />
            </div>

            <div className="relative md:w-64">
              <select
                value={programFilter}
                onChange={(event) =>
                  setProgramFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              >
                <option value="all">All Programmes</option>

                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* STUDENTS TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2
                  size={32}
                  className="animate-spin text-brand-green"
                />
                <p className="text-sm">Loading students...</p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-4">
                <Users size={30} className="text-slate-400" />
              </div>

              <h3 className="font-semibold text-slate-800">
                No students found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                No approved students match your current search or programme filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Applied Course
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      LMS Programme
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lecturer Assignments
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const enrollment = getStudentEnrollment(
                      student.application_id
                    );

                    const studentAssignments = getStudentLecturers(
                      student.application_id
                    );

                    return (
                      <tr
                        key={student.id}
                        className="align-top transition hover:bg-slate-50"
                      >
                        {/* STUDENT */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/10 font-semibold text-brand-green">
                              {(student.full_name || '?')
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {student.full_name}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {student.email}
                              </p>

                              {student.application_number && (
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {student.application_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* APPLIED COURSE */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {student.course || 'Not specified'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {student.intake || 'No intake'}
                          </p>
                        </td>

                        {/* LMS PROGRAMME */}
                        <td className="px-5 py-4">
                          {enrollment ? (
                            <div>
                              <span className="inline-flex rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-semibold text-brand-green">
                                {enrollment.program_name || 'Programme assigned'}
                              </span>

                              <p className="mt-1 text-xs font-medium text-green-600">
                                {enrollment.enrollment_status || 'Active'}
                              </p>

                              {enrollment.student_number && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {enrollment.student_number}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Not enrolled
                            </span>
                          )}
                        </td>

                        {/* ALL LECTURER ASSIGNMENTS */}
                        <td className="min-w-[280px] px-5 py-4">
                          {studentAssignments.length > 0 ? (
                            <div className="space-y-3">
                              {studentAssignments.map((assignment) => (
                                <div
                                  key={`${assignment.id}-${assignment.lecturer_id}-${assignment.unit_id || 'program'}`}
                                  className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800">
                                        {assignment.lecturer_name || 'Lecturer assigned'}
                                      </p>

                                      {assignment.lecturer_email && (
                                        <p className="mt-0.5 truncate text-xs text-slate-500">
                                          {assignment.lecturer_email}
                                        </p>
                                      )}

                                      <p className="mt-1 text-xs font-medium text-brand-green">
                                        {getAssignmentDescription(assignment)}
                                      </p>

                                      <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                        {isUnitAssignment(assignment)
                                          ? 'Unit lecturer'
                                          : 'Programme lecturer'}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => removeLecturer(assignment)}
                                      disabled={
                                        removingAssignmentId === assignment.id
                                      }
                                      title={`Remove ${assignment.lecturer_name || 'lecturer'} assignment`}
                                      aria-label={`Remove ${assignment.lecturer_name || 'lecturer'} assignment`}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {removingAssignmentId === assignment.id ? (
                                        <Loader2
                                          size={13}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Trash2 size={13} />
                                      )}

                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              No lecturer assigned
                            </span>
                          )}
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openAssignModal(student)}
                            className="whitespace-nowrap rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-green/90"
                          >
                            {studentAssignments.length > 0
                              ? 'Add Lecturer'
                              : 'Assign'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ASSIGNMENT MODAL */}
        {showAssignModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="my-6 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}
              <div className="flex items-start justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Add Lecturer Assignment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add another lecturer without replacing existing assignments.
                  </p>
                </div>

                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">

                {/* STUDENT INFORMATION */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student Information
                  </p>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Student Name
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {selectedStudent.full_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Email
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {selectedStudent.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Applied Course
                      </p>

                      <p className="mt-1 text-sm font-semibold text-brand-green">
                        {selectedStudent.course || 'Not specified'}
                      </p>
                    </div>

                    {getStudentEnrollment(selectedStudent.application_id) && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Current LMS Programme
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {getStudentEnrollment(selectedStudent.application_id)?.program_name ||
                            'Enrolled'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* EXISTING ASSIGNMENTS */}
                {getStudentLecturers(selectedStudent.application_id).length > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                      Existing lecturer assignments
                    </p>

                    <div className="mt-2 space-y-2">
                      {getStudentLecturers(
                        selectedStudent.application_id
                      ).map((assignment) => (
                        <div
                          key={`existing-${assignment.id}-${assignment.lecturer_id}-${assignment.unit_id || 'program'}`}
                          className="flex items-start justify-between gap-2 text-sm text-blue-900"
                        >
                          <span>
                            <strong>
                              {assignment.lecturer_name || 'Lecturer'}
                            </strong>

                            <span className="block text-xs text-blue-700">
                              {getAssignmentDescription(assignment)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ASSIGNMENT TYPE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Assignment Type
                  </label>

                  <select
                    value={assignmentType}
                    onChange={(event) => {
                      const next = event.target.value as 'program' | 'unit';

                      setAssignmentType(next);
                      setSelectedUnit('');
                      setSelectedLecturer('');

                      if (next === 'unit') {
                        const currentEnrollment = getStudentEnrollment(
                          selectedStudent.application_id
                        );

                        setSelectedProgram(
                          currentEnrollment
                            ? String(currentEnrollment.program_id)
                            : ''
                        );
                      } else {
                        setSelectedProgram('');
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  >
                    <option value="program">
                      Assign lecturer to a programme
                    </option>

                    <option value="unit">
                      Assign lecturer to a specific unit
                    </option>
                  </select>

                  <p className="mt-1 text-xs text-slate-500">
                    Unit assignments may use a unit from a different programme
                    from the student's main enrolment.
                  </p>
                </div>

                {/* LECTURER */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Lecturer
                  </label>

                  <select
                    value={selectedLecturer}
                    onChange={(event) => {
                      setSelectedLecturer(event.target.value);

                      if (assignmentType === 'program') {
                        setSelectedProgram('');
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  >
                    <option value="">Select lecturer</option>

                    {lecturers.map((lecturer) => {
                      const count = lecturerPrograms.filter(
                        (item) =>
                          Number(item.lecturer_id) === Number(lecturer.id)
                      ).length;

                      return (
                        <option key={lecturer.id} value={lecturer.id}>
                          {lecturer.name} — {count} authorised{' '}
                          {count === 1 ? 'programme' : 'programmes'}
                        </option>
                      );
                    })}
                  </select>

                  {lecturers.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No lecturers were returned by the API.
                    </p>
                  )}
                </div>

                {/* PROGRAMME SELECTOR */}
                {assignmentType === 'program' ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Programme for this assignment
                    </label>

                    <select
                      value={selectedProgram}
                      onChange={(event) =>
                        setSelectedProgram(event.target.value)
                      }
                      disabled={
                        !selectedLecturer ||
                        authorizedPrograms.length === 0
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">
                        {!selectedLecturer
                          ? 'Select a lecturer first'
                          : authorizedPrograms.length === 0
                            ? 'No authorised programmes'
                            : 'Select programme'}
                      </option>

                      {authorizedPrograms.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </select>

                    {selectedLecturer && authorizedPrograms.length > 0 && (
                      <div className="mt-2 rounded-lg bg-brand-green/5 p-3">
                        <p className="text-xs font-semibold text-brand-green">
                          Programmes authorised for this lecturer
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {authorizedPrograms.map((program) => (
                            <span
                              key={program.id}
                              className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-green ring-1 ring-brand-green/20"
                            >
                              {program.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedLecturer && authorizedPrograms.length === 0 && (
                      <div className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                        This lecturer has no programme authorisation recorded
                        in the lecturer-programme assignments.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* STUDENT'S PRIMARY ENROLMENT */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Student's enrolled programme
                      </label>

                      <input
                        value={
                          getStudentEnrollment(
                            selectedStudent.application_id
                          )?.program_name ||
                          programs.find(
                            (program) =>
                              program.id ===
                              getStudentEnrollment(
                                selectedStudent.application_id
                              )?.program_id
                          )?.name ||
                          'No active enrolment'
                        }
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 outline-none"
                      />

                      <p className="mt-1 text-xs text-slate-500">
                        The student's existing enrolment will be used. It will
                        not be changed.
                      </p>
                    </div>

                    {/* UNIT SELECTOR */}
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Unit to Assign
                      </label>

                      <select
                        value={selectedUnit}
                        onChange={(event) =>
                          setSelectedUnit(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                      >
                        <option value="">
                          Select a unit from any programme
                        </option>

                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.program_name} —{' '}
                            {unit.code ? `${unit.code} · ` : ''}
                            {unit.name}
                          </option>
                        ))}
                      </select>

                      <p className="mt-1 text-xs text-slate-500">
                        The API will verify that the student is registered for
                        this unit and that the lecturer is authorised to teach it.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="flex gap-3 border-t border-slate-200 bg-slate-50 p-5">
                <button
                  onClick={() => setShowAssignModal(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAssign}
                  disabled={
                    saving ||
                    !selectedLecturer ||
                    (assignmentType === 'program' && !selectedProgram) ||
                    (assignmentType === 'unit' && !selectedUnit)
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-green/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 size={17} className="animate-spin" />
                  )}

                  {saving ? 'Saving...' : 'Add Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-brand-green/10 p-3 text-brand-green">
          {icon}
        </div>
      </div>
    </div>
  );
}
