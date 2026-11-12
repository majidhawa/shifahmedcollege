
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const programId = Number(id);

    if (!Number.isInteger(programId) || programId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid course ID.' },
        { status: 400 }
      );
    }

    // Confirm that this course exists and is assigned to the lecturer.
    const courseResult = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.code,
          p.description,
          p.duration,
          p.level,
          p.status,
          lp.assigned_at,
          lp.updated_at AS assignment_updated_at
        FROM lms_lecturer_programs lp
        INNER JOIN lms_programs p
          ON p.id = lp.program_id
        WHERE lp.lecturer_id = $1
          AND p.id = $2
        LIMIT 1
      `,
      [lecturer.id, programId]
    );

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Course not found or you are not assigned to this course.',
        },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];

    // Retrieve only the units belonging to this assigned course.
    const unitsResult = await pool.query(
      `
        SELECT
          u.id,
          u.program_id,
          u.name,
          u.code,
          u.description,
          u.credit_hours,
          u.year_of_study,
          u.term_number,
          u.status,
          COUNT(DISTINCT t.id)::int AS topic_count
        FROM lms_units u
        LEFT JOIN lms_topics t
          ON t.unit_id = u.id
        WHERE u.program_id = $1
        GROUP BY
          u.id,
          u.program_id,
          u.name,
          u.code,
          u.description,
          u.credit_hours,
          u.year_of_study,
          u.term_number,
          u.status
        ORDER BY
          u.year_of_study ASC NULLS LAST,
          u.term_number ASC NULLS LAST,
          u.name ASC
      `,
      [programId]
    );

    return NextResponse.json({
      success: true,
      lecturer: {
        id: lecturer.id,
        name: lecturer.name,
        email: lecturer.email,
      },
      course,
      units: unitsResult.rows,
      unit_count: unitsResult.rows.length,
      topic_count: unitsResult.rows.reduce(
        (total: number, unit: { topic_count: number | string }) =>
          total + Number(unit.topic_count || 0),
        0
      ),
    });
  } catch (error) {
    console.error('GET LECTURER COURSE ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while retrieving the course.',
      },
      { status: 500 }
    );
  }
}
