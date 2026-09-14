import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   PARENT ATTENDANCE API

   READ-ONLY PARENT VIEW

   DATABASE RELATIONSHIP

   users
      ↓
   parent_students
      ↓
   applications
      ↓
   lms_enrollments
      ↓
   lms_attendance

   IMPORTANT:
   Parents can ONLY see attendance belonging to an
   application linked to their authenticated parent account.

   Attendance statuses:
      present
      absent
      late
      excused
========================================================= */

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused';

const VALID_STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'excused',
];

type ParentStudent = {
  id: number;
  application_number: string | null;
  surname: string | null;
  middle_name: string | null;
  first_name: string | null;
  course: string | null;
  intake: string | null;
  admission_number: string | null;
};

type EnrollmentRecord = {
  enrollment_id: number;
  application_id: number;
  program_id: number;
  program_name: string | null;
  program_code: string | null;
  student_number: string | null;
  year_of_study: number | null;
  enrollment_status: string | null;
};

type AttendanceRecord = {
  id: number;
  enrollment_id: number;
  program_id: number;
  unit_id: number | null;
  lecturer_id: number | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string | null;
  updated_at: string | null;

  program_name: string | null;
  program_code: string | null;

  unit_name: string | null;
  unit_code: string | null;

  student_number: string | null;
  admission_number: string | null;
  application_number: string | null;
};

type ProgramRecord = {
  id: number;
  name: string;
  code: string | null;
};

type UnitRecord = {
  id: number;
  program_id: number;
  name: string;
  code: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function toPositiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatAttendanceDate(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return String(value ?? '');
}

function safeNumber(value: unknown): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return numberValue;
}

/* =========================================================
   GET

   GET /api/parent/attendance

   Optional query parameters:

   ?program_id=4
   ?unit_id=3
   ?status=present
   ?from=2026-09-01
   ?to=2026-09-30

   All filters are optional.
========================================================= */

export async function GET(request: NextRequest) {
  try {
    /* =======================================================
       AUTHENTICATE PARENT
    ======================================================= */

    const session = await getParentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Parent authentication required.',
        },
        { status: 401 }
      );
    }

    const parentId = Number(session.parentId);

    if (!Number.isInteger(parentId) || parentId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid parent session.',
        },
        { status: 401 }
      );
    }

    /* =======================================================
       VERIFY PARENT ACCOUNT
    ======================================================= */

    const parentResult = await pool.query<{
      id: number;
      name: string | null;
      email: string | null;
      phone: string | null;
    }>(
      `
        SELECT
          id,
          name,
          email,
          phone
        FROM users
        WHERE
          id = $1
          AND role = 'parent'
          AND active = TRUE
        LIMIT 1
      `,
      [parentId]
    );

    if (parentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Parent account not found or inactive.',
        },
        { status: 401 }
      );
    }

    const parent = parentResult.rows[0];

    /* =======================================================
       GET LINKED CHILD

       EXACT PARENT RELATIONSHIP:

       parent_students.parent_id
                    ↓
       parent_students.application_id
                    ↓
       applications.id
    ======================================================= */

    const studentResult = await pool.query<ParentStudent>(
      `
        SELECT
          a.id,
          a.application_number,

          a.surname,
          a.middle_name,
          a.first_name,

          a.course,
          a.intake,

          ad.admission_number

        FROM parent_students ps

        INNER JOIN applications a
          ON a.id = ps.application_id

        LEFT JOIN admissions ad
          ON ad.application_id = a.id

        WHERE
          ps.parent_id = $1

        ORDER BY
          ps.is_primary DESC,
          a.created_at DESC

        LIMIT 1
      `,
      [parentId]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          parent,
          student: null,
          enrollments: [],
          attendance: [],
          statistics: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attended: 0,
            percentage: 0,
          },
          programs: [],
          units: [],
        },
        { status: 200 }
      );
    }

    const student = studentResult.rows[0];

    const applicationId = Number(student.id);

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid linked child application.',
        },
        { status: 500 }
      );
    }

    /* =======================================================
       QUERY PARAMETERS
    ======================================================= */

    const searchParams = request.nextUrl.searchParams;

    const programIdParam = searchParams.get('program_id');
    const unitIdParam = searchParams.get('unit_id');
    const statusParam = searchParams.get('status');

    const fromParam =
      searchParams.get('from') ||
      searchParams.get('from_date');

    const toParam =
      searchParams.get('to') ||
      searchParams.get('to_date');

    let programId: number | null = null;
    let unitId: number | null = null;

    if (programIdParam) {
      programId = toPositiveInteger(programIdParam);

      if (programId === null) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid program_id.',
          },
          { status: 400 }
        );
      }
    }

    if (unitIdParam) {
      unitId = toPositiveInteger(unitIdParam);

      if (unitId === null) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid unit_id.',
          },
          { status: 400 }
        );
      }
    }

    let attendanceStatus: AttendanceStatus | null = null;

    if (statusParam) {
      const normalizedStatus = statusParam
        .trim()
        .toLowerCase();

      if (
        !VALID_STATUSES.includes(
          normalizedStatus as AttendanceStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid attendance status. Valid statuses are present, absent, late, and excused.',
          },
          { status: 400 }
        );
      }

      attendanceStatus =
        normalizedStatus as AttendanceStatus;
    }

    if (fromParam && !isValidDate(fromParam)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid from date. Expected YYYY-MM-DD.',
        },
        { status: 400 }
      );
    }

    if (toParam && !isValidDate(toParam)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid to date. Expected YYYY-MM-DD.',
        },
        { status: 400 }
      );
    }

    if (
      fromParam &&
      toParam &&
      fromParam > toParam
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The from date cannot be later than the to date.',
        },
        { status: 400 }
      );
    }

    /* =======================================================
       GET ENROLLMENTS

       applications.id
              ↓
       lms_enrollments.application_id
              ↓
       lms_enrollments.program_id
              ↓
       lms_programs.id
    ======================================================= */

    const enrollmentsResult =
      await pool.query<EnrollmentRecord>(
        `
          SELECT
            e.id AS enrollment_id,
            e.application_id,
            e.program_id,

            p.name AS program_name,
            p.code AS program_code,

            e.student_number,
            e.year_of_study,
            e.enrollment_status

          FROM lms_enrollments e

          INNER JOIN lms_programs p
            ON p.id = e.program_id

          WHERE
            e.application_id = $1

          ORDER BY
            p.name ASC,
            e.id ASC
        `,
        [applicationId]
      );

    const enrollments =
      enrollmentsResult.rows.map((row) => ({
        ...row,
        enrollment_id: Number(row.enrollment_id),
        application_id: Number(row.application_id),
        program_id: Number(row.program_id),
        year_of_study:
          row.year_of_study === null
            ? null
            : Number(row.year_of_study),
      }));

    /* =======================================================
       NO ENROLLMENT

       This is not an error. The child may not yet have an
       LMS enrollment.
    ======================================================= */

    if (enrollments.length === 0) {
      return NextResponse.json(
        {
          success: true,
          parent,
          student: {
            id: applicationId,
            application_number:
              student.application_number,
            admission_number:
              student.admission_number,
            name: [
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
              .join(' ') || 'Student',
            course: student.course,
            intake: student.intake,
          },
          enrollments: [],
          attendance: [],
          statistics: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attended: 0,
            percentage: 0,
          },
          programs: [],
          units: [],
        },
        { status: 200 }
      );
    }

    /* =======================================================
       GET ATTENDANCE

       IMPORTANT SECURITY RULE:

       We do NOT query attendance using only application_id.

       Attendance is linked through:

       lms_attendance.enrollment_id
              ↓
       lms_enrollments.id
              ↓
       lms_enrollments.application_id

       This guarantees that only this parent's linked child's
       attendance is returned.
    ======================================================= */

    const attendanceValues: Array<
      number | string
    > = [applicationId];

    const attendanceConditions: string[] = [
      'e.application_id = $1',
    ];

    if (programId !== null) {
      attendanceValues.push(programId);

      attendanceConditions.push(
        `att.program_id = $${attendanceValues.length}`
      );
    }

    if (unitId !== null) {
      attendanceValues.push(unitId);

      attendanceConditions.push(
        `att.unit_id = $${attendanceValues.length}`
      );
    }

    if (attendanceStatus !== null) {
      attendanceValues.push(attendanceStatus);

      attendanceConditions.push(
        `att.status = $${attendanceValues.length}`
      );
    }

    if (fromParam) {
      attendanceValues.push(fromParam);

      attendanceConditions.push(
        `att.attendance_date >= $${attendanceValues.length}`
      );
    }

    if (toParam) {
      attendanceValues.push(toParam);

      attendanceConditions.push(
        `att.attendance_date <= $${attendanceValues.length}`
      );
    }

    const attendanceResult =
      await pool.query<AttendanceRecord>(
        `
          SELECT
            att.id,
            att.enrollment_id,
            att.program_id,
            att.unit_id,
            att.lecturer_id,
            att.attendance_date,
            att.status,
            att.remarks,
            att.created_at,
            att.updated_at,

            p.name AS program_name,
            p.code AS program_code,

            u.name AS unit_name,
            u.code AS unit_code,

            e.student_number,

            ad.admission_number,
            app.application_number

          FROM lms_attendance att

          INNER JOIN lms_enrollments e
            ON e.id = att.enrollment_id

          INNER JOIN lms_programs p
            ON p.id = att.program_id

          LEFT JOIN lms_units u
            ON u.id = att.unit_id

          LEFT JOIN admissions ad
            ON ad.application_id = e.application_id

          LEFT JOIN applications app
            ON app.id = e.application_id

          WHERE
            ${attendanceConditions.join('\n            AND ')}

          ORDER BY
            att.attendance_date DESC,
            att.id DESC
        `,
        attendanceValues
      );

    /* =======================================================
       FORMAT ATTENDANCE

       Explicit conversion prevents PostgreSQL numeric/date
       values from leaking into the API in inconsistent forms.
    ======================================================= */

    const attendance: AttendanceRecord[] =
      attendanceResult.rows.map((row) => ({
        id: Number(row.id),
        enrollment_id: Number(
          row.enrollment_id
        ),
        program_id: Number(
          row.program_id
        ),
        unit_id:
          row.unit_id === null
            ? null
            : Number(row.unit_id),
        lecturer_id:
          row.lecturer_id === null
            ? null
            : Number(row.lecturer_id),

        attendance_date:
          formatAttendanceDate(
            row.attendance_date
          ),

        status:
          row.status as AttendanceStatus,

        remarks:
          row.remarks === null
            ? null
            : String(row.remarks),

        created_at:
          row.created_at === null
            ? null
            : String(row.created_at),

        updated_at:
          row.updated_at === null
            ? null
            : String(row.updated_at),

        program_name:
          row.program_name === null
            ? null
            : String(row.program_name),

        program_code:
          row.program_code === null
            ? null
            : String(row.program_code),

        unit_name:
          row.unit_name === null
            ? null
            : String(row.unit_name),

        unit_code:
          row.unit_code === null
            ? null
            : String(row.unit_code),

        student_number:
          row.student_number === null
            ? null
            : String(row.student_number),

        admission_number:
          row.admission_number === null
            ? null
            : String(row.admission_number),

        application_number:
          row.application_number === null
            ? null
            : String(row.application_number),
      }));

    /* =======================================================
       STATISTICS

       Same attendance interpretation used on the student side:

       present = attended
       late    = attended
       absent  = not attended
       excused = separate category

       Attendance percentage:

       (present + late) / total × 100
    ======================================================= */

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const record of attendance) {
      if (record.status === 'present') {
        present += 1;
      } else if (record.status === 'absent') {
        absent += 1;
      } else if (record.status === 'late') {
        late += 1;
      } else if (record.status === 'excused') {
        excused += 1;
      }
    }

    const total =
      present +
      absent +
      late +
      excused;

    const attended =
      present + late;

    const percentage =
      total > 0
        ? Number(
            (
              (attended / total) *
              100
            ).toFixed(2)
          )
        : 0;

    /* =======================================================
       PROGRAMME LIST

       Built from the child's actual LMS enrollments.
    ======================================================= */

    const programsMap =
      new Map<number, ProgramRecord>();

    for (const enrollment of enrollments) {
      if (!programsMap.has(enrollment.program_id)) {
        programsMap.set(
          enrollment.program_id,
          {
            id: enrollment.program_id,
            name:
              enrollment.program_name ||
              'Programme',
            code:
              enrollment.program_code ||
              null,
          }
        );
      }
    }

    const programs =
      Array.from(
        programsMap.values()
      ).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    /* =======================================================
       UNIT LIST

       Units come only from attendance records belonging to
       this child's enrollment(s).

       This avoids exposing units belonging to unrelated
       students/programmes.
    ======================================================= */

    const unitsMap =
      new Map<number, UnitRecord>();

    for (const record of attendance) {
      if (
        record.unit_id === null ||
        unitsMap.has(record.unit_id)
      ) {
        continue;
      }

      unitsMap.set(
        record.unit_id,
        {
          id: record.unit_id,
          program_id:
            record.program_id,
          name:
            record.unit_name ||
            'Unit',
          code:
            record.unit_code ||
            null,
        }
      );
    }

    const units =
      Array.from(
        unitsMap.values()
      ).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    /* =======================================================
       UNIT SUMMARY

       Useful for parent dashboard reporting.

       The attendance page can use the raw records, while this
       summary provides an aggregated view for each unit.
    ======================================================= */

    const unitSummaryMap =
      new Map<
        number,
        {
          unit_id: number;
          program_id: number;
          unit_name: string;
          unit_code: string | null;
          total: number;
          present: number;
          absent: number;
          late: number;
          excused: number;
          attended: number;
          percentage: number;
        }
      >();

    for (const record of attendance) {
      if (record.unit_id === null) {
        continue;
      }

      const existing =
        unitSummaryMap.get(
          record.unit_id
        );

      if (existing) {
        existing.total += 1;

        if (record.status === 'present') {
          existing.present += 1;
        }

        if (record.status === 'absent') {
          existing.absent += 1;
        }

        if (record.status === 'late') {
          existing.late += 1;
        }

        if (record.status === 'excused') {
          existing.excused += 1;
        }

        existing.attended =
          existing.present +
          existing.late;

        existing.percentage =
          existing.total > 0
            ? Number(
                (
                  (existing.attended /
                    existing.total) *
                  100
                ).toFixed(2)
              )
            : 0;
      } else {
        const initialPresent =
          record.status === 'present'
            ? 1
            : 0;

        const initialAbsent =
          record.status === 'absent'
            ? 1
            : 0;

        const initialLate =
          record.status === 'late'
            ? 1
            : 0;

        const initialExcused =
          record.status === 'excused'
            ? 1
            : 0;

        const initialAttended =
          initialPresent +
          initialLate;

        unitSummaryMap.set(
          record.unit_id,
          {
            unit_id:
              record.unit_id,
            program_id:
              record.program_id,
            unit_name:
              record.unit_name ||
              'Unit',
            unit_code:
              record.unit_code ||
              null,
            total: 1,
            present:
              initialPresent,
            absent:
              initialAbsent,
            late:
              initialLate,
            excused:
              initialExcused,
            attended:
              initialAttended,
            percentage:
              Number(
                (
                  (initialAttended /
                    1) *
                  100
                ).toFixed(2)
              ),
          }
        );
      }
    }

    const unitSummary =
      Array.from(
        unitSummaryMap.values()
      ).sort((a, b) =>
        a.unit_name.localeCompare(
          b.unit_name
        )
      );

    /* =======================================================
       STUDENT RESPONSE OBJECT
    ======================================================= */

    const studentName = [
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

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        parent: {
          id: Number(parent.id),
          name:
            parent.name === null
              ? null
              : String(parent.name),
          email:
            parent.email === null
              ? null
              : String(parent.email),
          phone:
            parent.phone === null
              ? null
              : String(parent.phone),
        },

        student: {
          id: applicationId,

          application_number:
            student.application_number,

          admission_number:
            student.admission_number,

          name:
            studentName || 'Student',

          course:
            student.course,

          intake:
            student.intake,
        },

        enrollments,

        attendance,

        statistics: {
          total: safeNumber(total),
          present: safeNumber(present),
          absent: safeNumber(absent),
          late: safeNumber(late),
          excused: safeNumber(excused),
          attended: safeNumber(attended),
          percentage: safeNumber(
            percentage
          ),
        },

        programs,

        units,

        unitSummary,
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'private, no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error(
      'PARENT ATTENDANCE GET ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load parent attendance records.',
      },
      { status: 500 }
    );
  }
}