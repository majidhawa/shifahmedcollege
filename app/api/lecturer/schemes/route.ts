import {
  NextRequest,
  NextResponse,
} from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SchemeEntryInput = {
  weekNumber?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  topic?: unknown;
  subtopic?: unknown;
  learningOutcomes?: unknown;
  activities?: unknown;
  resources?: unknown;
  assessment?: unknown;
  remarks?: unknown;
};

type SchemeBody = {
  programId?: unknown;
  unitId?: unknown;
  academicYear?: unknown;
  term?: unknown;
  title?: unknown;
  status?: unknown;
  entries?: unknown;
};

function text(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function positiveId(
  value: unknown,
): number | null {
  const number = Number(value);

  return Number.isInteger(number) &&
    number > 0
    ? number
    : null;
}

async function verifyAssignment(
  lecturerId: number,
  programId: number,
  unitId: number,
): Promise<boolean> {
  const result =
    await pool.query(
      `
        SELECT 1

        FROM lms_lecturer_programs lp

        INNER JOIN lms_units u
          ON u.program_id =
             lp.program_id

        WHERE lp.lecturer_id = $1
          AND lp.program_id = $2
          AND u.id = $3

        LIMIT 1
      `,
      [
        lecturerId,
        programId,
        unitId,
      ],
    );

  return (
    result.rows.length > 0
  );
}

export async function GET() {
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

    const result =
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

            s.created_at,
            s.updated_at,

            p.name AS program_name,

            u.code AS unit_code,
            u.name AS unit_name,

            COUNT(e.id)::INTEGER
              AS entry_count

          FROM lms_schemes_of_work s

          INNER JOIN lms_programs p
            ON p.id = s.program_id

          INNER JOIN lms_units u
            ON u.id = s.unit_id

          LEFT JOIN
            lms_scheme_of_work_entries e
            ON e.scheme_id = s.id

          WHERE s.lecturer_id = $1

          GROUP BY
            s.id,
            p.name,
            u.code,
            u.name

          ORDER BY
            s.updated_at DESC
        `,
        [lecturer.id],
      );

    return NextResponse.json({
      success: true,

      schemes:
        result.rows.map(
          (row) => ({
            id: Number(
              row.id,
            ),

            programId:
              Number(
                row.program_id,
              ),

            unitId:
              Number(
                row.unit_id,
              ),

            academicYear:
              row.academic_year,

            term:
              row.term,

            title:
              row.title,

            status:
              row.status,

            entryCount:
              Number(
                row.entry_count,
              ) || 0,

            programName:
              row.program_name,

            unitCode:
              row.unit_code ??
              null,

            unitName:
              row.unit_name,

            createdAt:
              row.created_at,

            updatedAt:
              row.updated_at,
          }),
        ),
    });
  } catch (error: unknown) {
    console.error(
      'GET /api/lecturer/schemes ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load schemes of work.',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
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

    const body =
      (await request.json()) as SchemeBody;

    const programId =
      positiveId(
        body.programId,
      );

    const unitId =
      positiveId(
        body.unitId,
      );

    const academicYear =
      text(
        body.academicYear,
      );

    const term =
      text(body.term);

    const title =
      text(body.title);

    const status =
      text(body.status) ===
      'published'
        ? 'published'
        : 'draft';

    if (!programId || !unitId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Programme and unit are required.',
        },
        { status: 400 },
      );
    }

    if (
      !academicYear ||
      !term ||
      !title
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Academic year, term and scheme title are required.',
        },
        { status: 400 },
      );
    }

    if (
      title.length > 255
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Scheme title cannot exceed 255 characters.',
        },
        { status: 400 },
      );
    }

    if (
      !(await verifyAssignment(
        lecturer.id,
        programId,
        unitId,
      ))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You are not assigned to the selected programme and unit.',
        },
        { status: 403 },
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

    const schemeResult =
      await client.query(
        `
          INSERT INTO
            lms_schemes_of_work (
              program_id,
              unit_id,
              lecturer_id,
              academic_year,
              term,
              title,
              status
            )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )

          RETURNING id
        `,
        [
          programId,
          unitId,
          lecturer.id,
          academicYear,
          term,
          title,
          status,
        ],
      );

    const schemeId =
      Number(
        schemeResult.rows[0].id,
      );

    for (
      const rawEntry
      of rawEntries
    ) {
      const entry =
        rawEntry as SchemeEntryInput;

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

    return NextResponse.json(
      {
        success: true,

        scheme: {
          id: schemeId,
        },

        message:
          'Scheme of work created successfully.',
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    try {
      await client.query(
        'ROLLBACK',
      );
    } catch {}

    console.error(
      'POST /api/lecturer/schemes ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to create scheme of work.',
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}