import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type ParentSession = {
  parentId?: number | string;
};

type StudentRow = {
  id: number;
  application_number: string | null;
  surname: string | null;
  middle_name: string | null;
  first_name: string | null;
  course: string | null;
  intake: string | null;
  admission_number: string | null;
};

type TimetableRow = {
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
  class_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  program_name: string | null;
  program_code: string | null;
  unit_name: string | null;
  unit_code: string | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_STATUSES = [
  'scheduled',
  'completed',
  'cancelled',
] as const;

/* =========================================================
   HELPERS
========================================================= */

function getParentId(
  session: ParentSession | null | undefined
): number | null {
  const possibleId = session?.parentId;

  if (
    possibleId === undefined ||
    possibleId === null ||
    possibleId === ''
  ) {
    return null;
  }

  const parentId = Number(possibleId);

  if (
    !Number.isInteger(parentId) ||
    parentId <= 0
  ) {
    return null;
  }

  return parentId;
}

function nullableNumber(
  value: string | null
): number | null {
  if (
    value === null ||
    value.trim() === ''
  ) {
    return null;
  }

  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
}

function validDate(
  value: string | null
): boolean {
  if (
    !value ||
    !value.trim()
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return !Number.isNaN(
    date.getTime()
  );
}

/* =========================================================
   GET
   /api/parent/timetable

   Query parameters:

   start_date
   end_date
   program_id
   status
========================================================= */

export async function GET(
  request: Request
) {
  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    let session: ParentSession | null;

    try {
      session =
        (await getParentSession()) as ParentSession | null;
    } catch (error) {
      console.error(
        'PARENT TIMETABLE SESSION ERROR:',
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to authenticate parent.',
        },
        { status: 401 }
      );
    }

    const parentId =
      getParentId(session);

    if (!parentId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       QUERY PARAMETERS
    ===================================================== */

    const url =
      new URL(request.url);

    const startDate =
      url.searchParams.get(
        'start_date'
      );

    const endDate =
      url.searchParams.get(
        'end_date'
      );

    const programId =
      nullableNumber(
        url.searchParams.get(
          'program_id'
        )
      );

    const status =
      url.searchParams.get(
        'status'
      );

    /* =====================================================
       VALIDATE DATES
    ===================================================== */

    if (
      startDate &&
      !validDate(startDate)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid start date.',
        },
        { status: 400 }
      );
    }

    if (
      endDate &&
      !validDate(endDate)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid end date.',
        },
        { status: 400 }
      );
    }

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'End date cannot be earlier than start date.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE STATUS
    ===================================================== */

    if (
      status &&
      !ALLOWED_STATUSES.includes(
        status as (typeof ALLOWED_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid timetable status.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FIND LINKED CHILD
    ===================================================== */

    const studentResult =
      await pool.query<StudentRow>(
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

    if (
      studentResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: true,
          student: null,
          timetable: [],
          programs: [],
          units: [],
          statistics: {
            total_classes: 0,
            scheduled_classes: 0,
            completed_classes: 0,
            cancelled_classes: 0,
            programs_count: 0,
            total_hours: 0,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const student =
      studentResult.rows[0];

    const applicationId =
      student.id;

    /* =====================================================
       BUILD TIMETABLE CONDITIONS
    ===================================================== */

    const conditions: string[] = [
      `
        EXISTS (
          SELECT 1

          FROM lms_enrollments e

          WHERE
            e.application_id = $1
            AND e.program_id = t.program_id
        )
      `,
      't.day_of_week BETWEEN 1 AND 5',
    ];

    const values: unknown[] = [
      applicationId,
    ];

    let parameterIndex = 2;

    /* -----------------------------------------------------
       DATE FILTER
    ----------------------------------------------------- */

    if (
      startDate &&
      validDate(startDate)
    ) {
      conditions.push(`
        (
          t.start_date IS NULL
          OR t.end_date IS NULL
          OR t.end_date >= $${parameterIndex}::date
        )
      `);

      values.push(startDate);
      parameterIndex++;
    }

    if (
      endDate &&
      validDate(endDate)
    ) {
      conditions.push(`
        (
          t.start_date IS NULL
          OR t.start_date <= $${parameterIndex}::date
        )
      `);

      values.push(endDate);
      parameterIndex++;
    }

    /* -----------------------------------------------------
       PROGRAM FILTER
    ----------------------------------------------------- */

    if (programId) {
      conditions.push(
        `t.program_id = $${parameterIndex}`
      );

      values.push(programId);
      parameterIndex++;
    }

    /* -----------------------------------------------------
       STATUS FILTER
    ----------------------------------------------------- */

    if (status) {
      conditions.push(
        `t.status = $${parameterIndex}`
      );

      values.push(status);
      parameterIndex++;
    }

    /* =====================================================
       TIMETABLE
    ===================================================== */

    const timetableResult =
      await pool.query<TimetableRow>(
        `
          SELECT
            t.id,
            t.program_id,
            t.unit_id,
            t.lecturer_id,
            t.day_of_week,
            t.start_time,
            t.end_time,
            t.title,
            t.description,
            t.room,
            t.class_type,
            t.status,
            t.start_date,
            t.end_date,
            t.created_at,
            t.updated_at,

            p.name AS program_name,
            p.code AS program_code,

            u.name AS unit_name,
            u.code AS unit_code

          FROM lms_timetable t

          INNER JOIN lms_programs p
            ON p.id = t.program_id

          LEFT JOIN lms_units u
            ON u.id = t.unit_id

          WHERE ${conditions.join(
            ' AND '
          )}

          ORDER BY
            t.day_of_week ASC,
            t.start_time ASC,
            t.end_time ASC,
            t.id ASC
        `,
        values
      );

    /* =====================================================
       PROGRAMMES LINKED TO CHILD
    ===================================================== */

    const programsResult =
      await pool.query(
        `
          SELECT DISTINCT
            p.id,
            p.name,
            p.code

          FROM lms_enrollments e

          INNER JOIN lms_programs p
            ON p.id = e.program_id

          WHERE
            e.application_id = $1

          ORDER BY
            p.name ASC
        `,
        [applicationId]
      );

    /* =====================================================
       UNITS LINKED TO CHILD'S PROGRAMMES
    ===================================================== */

    const unitsResult =
      await pool.query(
        `
          SELECT DISTINCT
            u.id,
            u.program_id,
            u.name,
            u.code

          FROM lms_units u

          INNER JOIN lms_enrollments e
            ON e.program_id = u.program_id

          WHERE
            e.application_id = $1

          ORDER BY
            u.program_id ASC,
            u.name ASC
        `,
        [applicationId]
      );

    /* =====================================================
       STATISTICS
    ===================================================== */

    const statisticsConditions: string[] = [
      `
        EXISTS (
          SELECT 1

          FROM lms_enrollments e

          WHERE
            e.application_id = $1
            AND e.program_id = t.program_id
        )
      `,
      't.day_of_week BETWEEN 1 AND 5',
    ];

    const statisticsValues: unknown[] = [
      applicationId,
    ];

    let statisticsParameter = 2;

    if (
      startDate &&
      validDate(startDate)
    ) {
      statisticsConditions.push(`
        (
          t.start_date IS NULL
          OR t.end_date IS NULL
          OR t.end_date >= $${statisticsParameter}::date
        )
      `);

      statisticsValues.push(startDate);
      statisticsParameter++;
    }

    if (
      endDate &&
      validDate(endDate)
    ) {
      statisticsConditions.push(`
        (
          t.start_date IS NULL
          OR t.start_date <= $${statisticsParameter}::date
        )
      `);

      statisticsValues.push(endDate);
      statisticsParameter++;
    }

    if (programId) {
      statisticsConditions.push(
        `t.program_id = $${statisticsParameter}`
      );

      statisticsValues.push(
        programId
      );

      statisticsParameter++;
    }

    if (status) {
      statisticsConditions.push(
        `t.status = $${statisticsParameter}`
      );

      statisticsValues.push(
        status
      );

      statisticsParameter++;
    }

    const statisticsResult =
      await pool.query(
        `
          SELECT
            COUNT(*)::int AS total_classes,

            COUNT(*) FILTER (
              WHERE t.status = 'scheduled'
            )::int AS scheduled_classes,

            COUNT(*) FILTER (
              WHERE t.status = 'completed'
            )::int AS completed_classes,

            COUNT(*) FILTER (
              WHERE t.status = 'cancelled'
            )::int AS cancelled_classes,

            COUNT(
              DISTINCT t.program_id
            )::int AS programs_count,

            COALESCE(
              SUM(
                EXTRACT(
                  EPOCH FROM (
                    t.end_time -
                    t.start_time
                  )
                ) / 3600
              ) FILTER (
                WHERE t.status <> 'cancelled'
              ),
              0
            )::numeric(10,2) AS total_hours

          FROM lms_timetable t

          WHERE ${statisticsConditions.join(
            ' AND '
          )}
        `,
        statisticsValues
      );

    const statistics =
      statisticsResult.rows[0] || {
        total_classes: 0,
        scheduled_classes: 0,
        completed_classes: 0,
        cancelled_classes: 0,
        programs_count: 0,
        total_hours: 0,
      };

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,
        student,
        timetable:
          timetableResult.rows,
        programs:
          programsResult.rows,
        units:
          unitsResult.rows,
        statistics,
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      'GET PARENT TIMETABLE ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load child timetable.',
      },
      { status: 500 }
    );
  }
}