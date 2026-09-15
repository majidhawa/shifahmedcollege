import {
  NextRequest,
  NextResponse,
} from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseId(
  value: string,
): number | null {
  const id = Number(value);

  return Number.isInteger(id) &&
    id > 0
    ? id
    : null;
}

function text(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Authentication required.',
        },
        { status: 401 },
      );
    }

    const { id } =
      await context.params;

    const schemeId =
      parseId(id);

    if (!schemeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid scheme ID.',
        },
        { status: 400 },
      );
    }

    const schemeResult =
      await pool.query(
        `
          SELECT
            s.id,
            s.program_id,
            s.unit_id,
            s.academic_year,
            s.term,
            s.title,
            s.status,

            p.name AS program_name,

            u.code AS unit_code,
            u.name AS unit_name

          FROM lms_schemes_of_work s

          INNER JOIN lms_programs p
            ON p.id = s.program_id

          INNER JOIN lms_units u
            ON u.id = s.unit_id

          INNER JOIN lms_lecturer_programs lp
            ON lp.program_id =
               p.id
           AND lp.lecturer_id =
               $2

          WHERE s.id = $1
            AND s.lecturer_id =
                $2

          LIMIT 1
        `,
        [
          schemeId,
          lecturer.id,
        ],
      );

    if (
      schemeResult.rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Scheme not found or you do not have permission to access it.',
        },
        { status: 404 },
      );
    }

    const entriesResult =
      await pool.query(
        `
          SELECT
            id,
            week_number,
            start_date,
            end_date,
            topic,
            subtopic,
            learning_outcomes,
            activities,
            resources,
            assessment,
            remarks

          FROM
            lms_scheme_of_work_entries

          WHERE scheme_id = $1

          ORDER BY
            week_number ASC
        `,
        [schemeId],
      );

    const scheme =
      schemeResult.rows[0];

    return NextResponse.json({
      success: true,

      scheme: {
        id: Number(
          scheme.id,
        ),

        programId:
          Number(
            scheme.program_id,
          ),

        unitId:
          Number(
            scheme.unit_id,
          ),

        academicYear:
          scheme.academic_year,

        term:
          scheme.term,

        title:
          scheme.title,

        status:
          scheme.status,

        programName:
          scheme.program_name,

        unitCode:
          scheme.unit_code ??
          null,

        unitName:
          scheme.unit_name,

        entries:
          entriesResult.rows.map(
            (entry) => ({
              id: Number(
                entry.id,
              ),

              weekNumber:
                Number(
                  entry.week_number,
                ),

              startDate:
                entry.start_date
                  ? String(
                      entry.start_date,
                    ).slice(0, 10)
                  : '',

              endDate:
                entry.end_date
                  ? String(
                      entry.end_date,
                    ).slice(0, 10)
                  : '',

              topic:
                entry.topic,

              subtopic:
                entry.subtopic ??
                '',

              learningOutcomes:
                entry.learning_outcomes ??
                '',

              activities:
                entry.activities ??
                '',

              resources:
                entry.resources ??
                '',

              assessment:
                entry.assessment ??
                '',

              remarks:
                entry.remarks ??
                '',
            }),
          ),
      },
    });
  } catch (error: unknown) {
    console.error(
      'GET /api/lecturer/schemes/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load scheme of work.',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const client =
    await pool.connect();

  try {
    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Authentication required.',
        },
        { status: 401 },
      );
    }

    const { id } =
      await context.params;

    const schemeId =
      parseId(id);

    if (!schemeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid scheme ID.',
        },
        { status: 400 },
      );
    }

    const body =
      (await request.json()) as {
        title?: unknown;
        academicYear?: unknown;
        term?: unknown;
        status?: unknown;
        entries?: unknown;
      };

    const title =
      text(body.title);

    const academicYear =
      text(
        body.academicYear,
      );

    const term =
      text(body.term);

    const status =
      text(body.status) ===
      'published'
        ? 'published'
        : 'draft';

    if (
      !title ||
      !academicYear ||
      !term
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Title, academic year and term are required.',
        },
        { status: 400 },
      );
    }

    const ownership =
      await client.query(
        `
          SELECT
            id

          FROM
            lms_schemes_of_work

          WHERE id = $1
            AND lecturer_id = $2

          LIMIT 1
        `,
        [
          schemeId,
          lecturer.id,
        ],
      );

    if (
      ownership.rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Scheme not found or you do not have permission to edit it.',
        },
        { status: 404 },
      );
    }

    const rawEntries =
      Array.isArray(
        body.entries,
      )
        ? body.entries
        : [];

    await client.query(
      'BEGIN',
    );

    await client.query(
      `
        UPDATE
          lms_schemes_of_work

        SET
          title = $1,
          academic_year = $2,
          term = $3,
          status = $4,
          updated_at = NOW()

        WHERE id = $5
      `,
      [
        title,
        academicYear,
        term,
        status,
        schemeId,
      ],
    );

    await client.query(
      `
        DELETE FROM
          lms_scheme_of_work_entries

        WHERE scheme_id = $1
      `,
      [schemeId],
    );

    for (
      const rawEntry
      of rawEntries
    ) {
      if (
        !rawEntry ||
        typeof rawEntry !==
          'object'
      ) {
        continue;
      }

      const entry =
        rawEntry as Record<
          string,
          unknown
        >;

      const weekNumber =
        Number(
          entry.weekNumber,
        );

      const topic =
        text(entry.topic);

      if (
        !Number.isInteger(
          weekNumber,
        ) ||
        weekNumber <= 0 ||
        !topic
      ) {
        continue;
      }

      await client.query(
        `
          INSERT INTO
            lms_scheme_of_work_entries (
              scheme_id,
              week_number,
              start_date,
              end_date,
              topic,
              subtopic,
              learning_outcomes,
              activities,
              resources,
              assessment,
              remarks
            )

          VALUES (
            $1,
            $2,
            NULLIF($3, '')::DATE,
            NULLIF($4, '')::DATE,
            $5,
            NULLIF($6, ''),
            NULLIF($7, ''),
            NULLIF($8, ''),
            NULLIF($9, ''),
            NULLIF($10, ''),
            NULLIF($11, '')
          )
        `,
        [
          schemeId,
          weekNumber,
          text(
            entry.startDate,
          ),
          text(
            entry.endDate,
          ),
          topic,
          text(
            entry.subtopic,
          ),
          text(
            entry.learningOutcomes,
          ),
          text(
            entry.activities,
          ),
          text(
            entry.resources,
          ),
          text(
            entry.assessment,
          ),
          text(
            entry.remarks,
          ),
        ],
      );
    }

    await client.query(
      'COMMIT',
    );

    return NextResponse.json({
      success: true,
      message:
        'Scheme of work updated successfully.',
    });
  } catch (error: unknown) {
    try {
      await client.query(
        'ROLLBACK',
      );
    } catch {}

    console.error(
      'PUT /api/lecturer/schemes/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to update scheme of work.',
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Authentication required.',
        },
        { status: 401 },
      );
    }

    const { id } =
      await context.params;

    const schemeId =
      parseId(id);

    if (!schemeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid scheme ID.',
        },
        { status: 400 },
      );
    }

    const result =
      await pool.query(
        `
          DELETE FROM
            lms_schemes_of_work

          WHERE id = $1
            AND lecturer_id = $2

          RETURNING id
        `,
        [
          schemeId,
          lecturer.id,
        ],
      );

    if (
      result.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Scheme not found or you do not have permission to delete it.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Scheme of work deleted successfully.',
    });
  } catch (error: unknown) {
    console.error(
      'DELETE /api/lecturer/schemes/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to delete scheme of work.',
      },
      { status: 500 },
    );
  }
}