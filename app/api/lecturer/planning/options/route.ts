import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProgramUnit = {
  id: number;
  code: string | null;
  name: string;
};

type PlanningProgram = {
  id: number;
  name: string;
  units: ProgramUnit[];
};

type SchemeEntry = {
  id: number;
  schemeId: number;
  weekNumber: number;
  topic: string;
  subtopic: string | null;
  schemeTitle: string;
  academicYear: string;
  term: string;
  programId: number;
  unitId: number;
};

export async function GET() {
  try {
    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required.',
        },
        { status: 401 },
      );
    }

    const programResult = await pool.query(
      `
        SELECT
          p.id AS program_id,
          p.name AS program_name,

          u.id AS unit_id,
          u.code AS unit_code,
          u.name AS unit_name

        FROM lms_programs p

        INNER JOIN lms_lecturer_programs lp
          ON lp.program_id = p.id
         AND lp.lecturer_id = $1

        INNER JOIN lms_units u
          ON u.program_id = p.id

        ORDER BY
          p.name ASC,
          u.name ASC
      `,
      [lecturer.id],
    );

    const programMap = new Map<
      number,
      PlanningProgram
    >();

    for (const row of programResult.rows) {
      const programId = Number(
        row.program_id,
      );

      if (!programMap.has(programId)) {
        programMap.set(programId, {
          id: programId,
          name: String(
            row.program_name,
          ),
          units: [],
        });
      }

      programMap
        .get(programId)
        ?.units.push({
          id: Number(
            row.unit_id,
          ),
          code:
            row.unit_code ??
            null,
          name: String(
            row.unit_name,
          ),
        });
    }

    const schemeResult =
      await pool.query(
        `
          SELECT
            e.id,
            e.scheme_id,
            e.week_number,
            e.topic,
            e.subtopic,

            s.title AS scheme_title,
            s.academic_year,
            s.term,

            s.program_id,
            s.unit_id

          FROM lms_scheme_of_work_entries e

          INNER JOIN lms_schemes_of_work s
            ON s.id = e.scheme_id

          INNER JOIN lms_lecturer_programs lp
            ON lp.program_id = s.program_id
           AND lp.lecturer_id = $1

          WHERE s.lecturer_id = $1

          ORDER BY
            s.academic_year DESC,
            s.term ASC,
            s.title ASC,
            e.week_number ASC
        `,
        [lecturer.id],
      );

    const schemeEntries: SchemeEntry[] =
      schemeResult.rows.map(
        (row) => ({
          id: Number(row.id),
          schemeId: Number(
            row.scheme_id,
          ),
          weekNumber: Number(
            row.week_number,
          ),
          topic: row.topic,
          subtopic:
            row.subtopic ??
            null,
          schemeTitle:
            row.scheme_title,
          academicYear:
            row.academic_year,
          term: row.term,
          programId: Number(
            row.program_id,
          ),
          unitId: Number(
            row.unit_id,
          ),
        }),
      );

    return NextResponse.json({
      success: true,

      programs:
        Array.from(
          programMap.values(),
        ),

      schemeEntries,
    });
  } catch (error: unknown) {
    console.error(
      'GET /api/lecturer/planning/options ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load planning options.',
      },
      { status: 500 },
    );
  }
}