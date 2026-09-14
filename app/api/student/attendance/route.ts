import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'excused';

interface AttendanceRow {
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

interface EnrollmentRow {
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

const VALID_STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'excused',
];

function isValidStatus(
  value: string
): value is AttendanceStatus {
  return VALID_STATUSES.includes(
    value as AttendanceStatus
  );
}

function formatAttendanceDate(
  value: unknown
): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return '';
}

function formatDateTime(
  value: unknown
): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function safeNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function getPercentage(
  attended: number,
  total: number
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round(
    (attended / total) * 1000
  ) / 10;
}

export async function GET(
  request: Request
) {
  try {
    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const applicationId = Number(
      session.applicationId
    );

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid student session.',
        },
        { status: 401 }
      );
    }

    /*
     * ---------------------------------------------------------
     * GET REQUEST FILTERS
     * ---------------------------------------------------------
     */

    const { searchParams } =
      new URL(request.url);

    const programIdParam =
      searchParams.get('program_id');

    const unitIdParam =
      searchParams.get('unit_id');

    const fromDate =
      searchParams.get('from');

    const toDate =
      searchParams.get('to');

    let programId: number | null = null;
    let unitId: number | null = null;

    if (programIdParam) {
      const parsed = Number(
        programIdParam
      );

      if (
        !Number.isInteger(parsed) ||
        parsed <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid program_id.',
          },
          { status: 400 }
        );
      }

      programId = parsed;
    }

    if (unitIdParam) {
      const parsed = Number(
        unitIdParam
      );

      if (
        !Number.isInteger(parsed) ||
        parsed <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid unit_id.',
          },
          { status: 400 }
        );
      }

      unitId = parsed;
    }

    /*
     * ---------------------------------------------------------
     * STUDENT INFORMATION
     * ---------------------------------------------------------
     *
     * We deliberately use the student's LMS enrollment and
     * admissions relationship instead of relying on guessed
     * application columns.
     * ---------------------------------------------------------
     */

    const studentResult =
      await pool.query<{
        student_name: string | null;
        application_number: string | null;
        admission_number: string | null;
      }>(
        `
          SELECT
            a.student_name,
            app.application_number,
            a.admission_number

          FROM admissions a

          LEFT JOIN applications app
            ON app.id = a.application_id

          WHERE a.application_id = $1

          ORDER BY a.id DESC

          LIMIT 1
        `,
        [applicationId]
      );

    const studentRow =
      studentResult.rows[0];

    const student: StudentInfo = {
      name:
        studentRow?.student_name ||
        'Student',

      application_number:
        studentRow?.application_number ||
        session.applicationNumber ||
        null,

      admission_number:
        studentRow?.admission_number ||
        null,
    };

    /*
     * ---------------------------------------------------------
     * STUDENT ENROLLMENTS
     * ---------------------------------------------------------
     */

    const enrollmentResult =
      await pool.query<EnrollmentRow>(
        `
          SELECT
            e.id,
            e.program_id,
            e.student_number,
            e.year_of_study,
            e.enrollment_status,
            e.enrolled_at,

            p.name AS program_name,
            p.code AS program_code

          FROM lms_enrollments e

          INNER JOIN lms_programs p
            ON p.id = e.program_id

          WHERE e.application_id = $1

          ORDER BY
            e.enrolled_at DESC,
            e.id DESC
        `,
        [applicationId]
      );

    const enrollments =
      enrollmentResult.rows;

    /*
     * ---------------------------------------------------------
     * NO ENROLLMENT
     * ---------------------------------------------------------
     */

    if (enrollments.length === 0) {
      return NextResponse.json({
        success: true,
        student,
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
      });
    }

    const enrollmentIds =
      enrollments.map(
        (enrollment) => enrollment.id
      );

    /*
     * ---------------------------------------------------------
     * ATTENDANCE
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     *
     * We filter directly through the student's enrollment IDs.
     * This prevents one student from seeing another student's
     * attendance even if the same program/unit is selected.
     * ---------------------------------------------------------
     */

    const conditions: string[] = [
      'att.enrollment_id = ANY($1::int[])',
    ];

    const values: unknown[] = [
      enrollmentIds,
    ];

    if (programId !== null) {
      values.push(programId);

      conditions.push(
        `att.program_id = $${values.length}`
      );
    }

    if (unitId !== null) {
      values.push(unitId);

      conditions.push(
        `att.unit_id = $${values.length}`
      );
    }

    if (fromDate) {
      values.push(fromDate);

      conditions.push(
        `att.attendance_date >= $${values.length}`
      );
    }

    if (toDate) {
      values.push(toDate);

      conditions.push(
        `att.attendance_date <= $${values.length}`
      );
    }

    const attendanceResult =
      await pool.query<AttendanceRow>(
        `
          SELECT
            att.id,
            att.enrollment_id,
            att.program_id,
            att.unit_id,
            att.attendance_date,
            att.status,
            att.remarks,
            att.created_at,
            att.updated_at,

            p.name AS program_name,
            p.code AS program_code,

            u.name AS unit_name,
            u.code AS unit_code

          FROM lms_attendance att

          INNER JOIN lms_programs p
            ON p.id = att.program_id

          LEFT JOIN lms_units u
            ON u.id = att.unit_id

          WHERE ${conditions.join('\n            AND ')}

          ORDER BY
            att.attendance_date DESC,
            att.id DESC
        `,
        values
      );

    /*
     * ---------------------------------------------------------
     * FORMAT ATTENDANCE
     * ---------------------------------------------------------
     */

    const attendance =
      attendanceResult.rows
        .filter((row) =>
          isValidStatus(
            String(row.status)
          )
        )
        .map((row) => ({
          id: row.id,
          enrollment_id:
            row.enrollment_id,
          program_id:
            row.program_id,
          unit_id:
            row.unit_id,

          attendance_date:
            formatAttendanceDate(
              row.attendance_date
            ),

          status: row.status,

          remarks:
            row.remarks || null,

          created_at:
            formatDateTime(
              row.created_at
            ),

          updated_at:
            formatDateTime(
              row.updated_at
            ),

          program_name:
            row.program_name,

          program_code:
            row.program_code,

          unit_name:
            row.unit_name,

          unit_code:
            row.unit_code,
        }));

    /*
     * ---------------------------------------------------------
     * OVERALL STATISTICS
     * ---------------------------------------------------------
     */

    const total =
      attendance.length;

    const present =
      attendance.filter(
        (row) => row.status === 'present'
      ).length;

    const absent =
      attendance.filter(
        (row) => row.status === 'absent'
      ).length;

    const late =
      attendance.filter(
        (row) => row.status === 'late'
      ).length;

    const excused =
      attendance.filter(
        (row) => row.status === 'excused'
      ).length;

    /*
     * Present + Late are treated as attendance.
     * Excused is not treated as an attended class.
     */
    const attended =
      present + late;

    const percentage =
      getPercentage(
        attended,
        total
      );

    /*
     * ---------------------------------------------------------
     * PROGRAM SUMMARY
     * ---------------------------------------------------------
     */

    const programMap =
      new Map<
        number,
        {
          program_id: number;
          program_name: string;
          program_code: string | null;
          total: number;
          present: number;
          absent: number;
          late: number;
          excused: number;
        }
      >();

    attendance.forEach((record) => {
      const existing =
        programMap.get(
          record.program_id
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

        return;
      }

      programMap.set(
        record.program_id,
        {
          program_id:
            record.program_id,

          program_name:
            record.program_name ||
            'Programme',

          program_code:
            record.program_code ||
            null,

          total: 1,

          present:
            record.status === 'present'
              ? 1
              : 0,

          absent:
            record.status === 'absent'
              ? 1
              : 0,

          late:
            record.status === 'late'
              ? 1
              : 0,

          excused:
            record.status === 'excused'
              ? 1
              : 0,
        }
      );
    });

    const programs =
      Array.from(
        programMap.values()
      ).map((program) => ({
        ...program,

        attended:
          program.present +
          program.late,

        percentage:
          getPercentage(
            program.present +
              program.late,
            program.total
          ),
      }));

    /*
     * ---------------------------------------------------------
     * UNIT SUMMARY
     * ---------------------------------------------------------
     */

    const unitMap =
      new Map<
        string,
        {
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
        }
      >();

    attendance.forEach((record) => {
      const key =
        `${record.program_id}:${record.unit_id ?? 'none'}`;

      const existing =
        unitMap.get(key);

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

        return;
      }

      unitMap.set(
        key,
        {
          unit_id:
            record.unit_id,

          program_id:
            record.program_id,

          unit_name:
            record.unit_name ||
            'General Attendance',

          unit_code:
            record.unit_code ||
            null,

          program_name:
            record.program_name ||
            'Programme',

          program_code:
            record.program_code ||
            null,

          total: 1,

          present:
            record.status === 'present'
              ? 1
              : 0,

          absent:
            record.status === 'absent'
              ? 1
              : 0,

          late:
            record.status === 'late'
              ? 1
              : 0,

          excused:
            record.status === 'excused'
              ? 1
              : 0,
        }
      );
    });

    const units =
      Array.from(
        unitMap.values()
      ).map((unit) => ({
        ...unit,

        attended:
          unit.present +
          unit.late,

        percentage:
          getPercentage(
            unit.present +
              unit.late,
            unit.total
          ),
      }));

    /*
     * ---------------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      student,

      enrollments:
        enrollments.map(
          (enrollment) => ({
            id: enrollment.id,
            program_id:
              enrollment.program_id,

            student_number:
              enrollment.student_number,

            year_of_study:
              enrollment.year_of_study,

            enrollment_status:
              enrollment.enrollment_status,

            enrolled_at:
              formatDateTime(
                enrollment.enrolled_at
              ),

            program_name:
              enrollment.program_name,

            program_code:
              enrollment.program_code,
          })
        ),

      attendance,

      statistics: {
        total,
        present,
        absent,
        late,
        excused,
        attended,
        percentage,
      },

      programs,

      units,
    });
  } catch (error) {
    console.error(
      'STUDENT ATTENDANCE GET ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load attendance at this time.',
      },
      { status: 500 }
    );
  }
}