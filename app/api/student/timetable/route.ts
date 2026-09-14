import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type StudentSession = {
  applicationId?: number | string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_CLASS_TYPES = [
  'lecture',
  'practical',
  'tutorial',
  'exam',
  'meeting',
  'other',
] as const;

const ALLOWED_STATUSES = [
  'scheduled',
  'completed',
  'cancelled',
] as const;

/* =========================================================
   HELPERS
========================================================= */

function getApplicationId(
  session: StudentSession | null | undefined
): number | null {
  const possibleId = session?.applicationId;

  if (
    possibleId === undefined ||
    possibleId === null ||
    possibleId === ''
  ) {
    return null;
  }

  const applicationId = Number(possibleId);

  if (
    !Number.isInteger(applicationId) ||
    applicationId <= 0
  ) {
    return null;
  }

  return applicationId;
}

function cleanString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function nullableNumber(value: unknown): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ''
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

function validDate(value: unknown): boolean {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return !Number.isNaN(date.getTime());
}

/* =========================================================
   GET
   /api/student/timetable

   Query parameters:

   start_date
   end_date
   program_id
   status
========================================================= */

export async function GET(request: Request) {
  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    let session: StudentSession | null;

    try {
      session =
        (await getStudentSession()) as StudentSession | null;
    } catch (error) {
      console.error(
        'STUDENT TIMETABLE SESSION ERROR:',
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: 'Unable to authenticate student.',
        },
        { status: 401 }
      );
    }

    const applicationId =
      getApplicationId(session);

    if (!applicationId) {
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

    const url = new URL(request.url);

    const startDate =
      url.searchParams.get('start_date');

    const endDate =
      url.searchParams.get('end_date');

    const programId =
      nullableNumber(
        url.searchParams.get('program_id')
      );

    const statusParam =
      cleanString(
        url.searchParams.get('status')
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
          message: 'Invalid start date.',
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
          message: 'Invalid end date.',
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
      statusParam &&
      !ALLOWED_STATUSES.includes(
        statusParam as (typeof ALLOWED_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid timetable status.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY STUDENT / APPLICATION
    ===================================================== */

    const studentResult =
      await pool.query(
        `
          SELECT
            a.id,
            a.application_number,
            a.surname,
            a.middle_name,
            a.first_name,
            a.mobile,
            a.email,
            a.course,
            a.intake,
            ad.admission_number,
            ad.admission_status,
            ad.admission_date

          FROM applications a

          LEFT JOIN admissions ad
            ON ad.application_id = a.id

          WHERE a.id = $1

          LIMIT 1
        `,
        [applicationId]
      );

    if (studentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Student application could not be found.',
        },
        { status: 404 }
      );
    }

    const student =
      studentResult.rows[0];

    /* =====================================================
       BUILD TIMETABLE FILTERS
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
       DATE RANGE
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
       PROGRAM
    ----------------------------------------------------- */

    if (programId) {
      conditions.push(
        `t.program_id = $${parameterIndex}`
      );

      values.push(programId);
      parameterIndex++;
    }

    /* -----------------------------------------------------
       STATUS
    ----------------------------------------------------- */

    if (statusParam) {
      conditions.push(
        `t.status = $${parameterIndex}`
      );

      values.push(statusParam);
      parameterIndex++;
    }

    /* =====================================================
       TIMETABLE
    ===================================================== */

    const timetableResult =
      await pool.query(
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

          WHERE ${conditions.join(' AND ')}

          ORDER BY
            t.day_of_week ASC,
            t.start_time ASC,
            t.end_time ASC,
            t.id ASC
        `,
        values
      );

    /* =====================================================
       STUDENT PROGRAMS
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

          WHERE e.application_id = $1

          ORDER BY p.name ASC
        `,
        [applicationId]
      );

    /* =====================================================
       STUDENT UNITS

       Only units belonging to programmes in which the
       student is enrolled.
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

          WHERE e.application_id = $1

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

      statisticsValues.push(programId);
      statisticsParameter++;
    }

    if (statusParam) {
      statisticsConditions.push(
        `t.status = $${statisticsParameter}`
      );

      statisticsValues.push(statusParam);
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
                    t.end_time - t.start_time
                  )
                ) / 3600
              ) FILTER (
                WHERE t.status <> 'cancelled'
              ),
              0
            )::numeric(10,2) AS total_hours

          FROM lms_timetable t

          WHERE ${statisticsConditions.join(' AND ')}
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
      'GET STUDENT TIMETABLE ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load student timetable.',
      },
      { status: 500 }
    );
  }
}