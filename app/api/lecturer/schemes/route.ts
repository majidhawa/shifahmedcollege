
import {
  NextRequest,
  NextResponse,
} from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';
import type { PoolClient } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SchemeEntryInput = {
  weekNumber?: unknown;

  // Official SMTC fields
  lessonTitle?: unknown;
  objectives?: unknown;
  keyPoints?: unknown;
  applicationActivities?: unknown;
  referencesAids?: unknown;
  dateTaught?: unknown;

  // Legacy fields
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

  referenceNumber?: unknown;
  trainerName?: unknown;
  trainerTelephone?: unknown;
  trainerEmail?: unknown;
  courseNameLevel?: unknown;
  competencyArea?: unknown;
  dateOfPreparation?: unknown;
  institution?: unknown;
  intake?: unknown;
  module?: unknown;
  supervisorName?: unknown;
  supervisorSignature?: unknown;

  entries?: unknown;
};

type NormalizedEntry = {
  weekNumber: number;
  lessonTitle: string;
  objectives: string;
  keyPoints: string;
  applicationActivities: string;
  referencesAids: string;
  remarks: string;
  dateTaught: string | null;
  subtopic: string;
  assessment: string;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function text(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function positiveId(value: unknown): number | null {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : null;
}

function validDate(value: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function nullableDate(value: unknown): string | null {
  const date = text(value);

  if (!date) {
    return null;
  }

  return validDate(date) ? date : null;
}

function getEntryValue(
  preferred: unknown,
  legacy: unknown,
): string {
  return text(preferred) || text(legacy);
}

function formatReferenceNumber(
  year: number,
  sequence: number,
): string {
  return `SMTC/SW/${year}/${String(sequence).padStart(3, '0')}`;
}

/* -------------------------------------------------------------------------- */
/* REFERENCE NUMBER GENERATOR                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Generates a unique reference number for each year.
 *
 * Uses a PostgreSQL transaction-level advisory lock.
 *
 * This means:
 * - No separate PostgreSQL sequence is required.
 * - Concurrent scheme submissions are serialized for that year.
 * - The next available reference is determined from existing records.
 * - Different years have independent reference numbering.
 *
 * IMPORTANT:
 * Call this function only after BEGIN.
 */

async function generateReferenceNumber(
  client: {
    query: (
      queryText: string,
      values?: unknown[],
    ) => Promise<{
      rows: Array<{
        next_number: number | string;
      }>;
    }>;
  },
  year: number,
): Promise<string> {
  const prefix = `SMTC/SW/${year}`;

  // Lock reference generation for this year.
  await client.query(
    `
      SELECT pg_advisory_xact_lock(
        hashtext($1)
      )
    `,
    [prefix],
  );

  // Find the highest existing reference number for this year.
  const result = await client.query(
    `
      SELECT
        COALESCE(
          MAX(
            substring(
              reference_number
              FROM '([0-9]+)$'
            )::INTEGER
          ),
          0
        ) + 1 AS next_number

      FROM lms_schemes_of_work

      WHERE reference_number
        LIKE $1 || '/%'

        AND reference_number
        ~ ('^' || $1 || '/[0-9]+$')
    `,
    [prefix],
  );

  const nextNumber = Number(
    result.rows[0].next_number,
  );

  return formatReferenceNumber(
    year,
    nextNumber,
  );
}

/* -------------------------------------------------------------------------- */
/* VERIFY LECTURER PROGRAMME AND UNIT ASSIGNMENT                              */
/* -------------------------------------------------------------------------- */

async function verifyAssignment(
  lecturerId: number,
  programId: number,
  unitId: number,
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1

      FROM lms_units u
      WHERE u.program_id = $2
        AND u.id = $3
        AND (
          EXISTS (
            SELECT 1 FROM lms_lecturer_units lu
            WHERE lu.lecturer_id = $1 AND lu.unit_id = u.id
          )
          OR EXISTS (
            SELECT 1 FROM lms_lecturer_programs lp
            WHERE lp.lecturer_id = $1 AND lp.program_id = u.program_id
          )
        )

      LIMIT 1
    `,
    [
      lecturerId,
      programId,
      unitId,
    ],
  );

  return result.rows.length > 0;
}

/* -------------------------------------------------------------------------- */
/* GET: LIST THE LOGGED-IN LECTURER'S SCHEMES                                 */
/* -------------------------------------------------------------------------- */

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

    const result = await pool.query(
      `
        SELECT
          s.id,
          s.program_id,
          s.unit_id,

          s.reference_number,
          s.academic_year,
          s.term,
          s.title,
          s.status,

          s.trainer_name,
          s.trainer_telephone,
          s.trainer_email,

          s.course_name_level,
          s.competency_area,
          s.date_of_preparation,

          s.institution,
          s.intake,
          s.module,

          s.supervisor_name,
          s.supervisor_signature,

          s.created_at,
          s.updated_at,

          p.name AS program_name,

          u.code AS unit_code,
          u.name AS unit_name,

          COUNT(e.id)::INTEGER AS entry_count

        FROM lms_schemes_of_work s

        INNER JOIN lms_programs p
          ON p.id = s.program_id

        INNER JOIN lms_units u
          ON u.id = s.unit_id

        LEFT JOIN lms_scheme_of_work_entries e
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

      schemes: result.rows.map((row) => ({
        id: Number(row.id),

        programId: Number(row.program_id),
        unitId: Number(row.unit_id),

        referenceNumber: row.reference_number,

        academicYear: row.academic_year,
        term: row.term,
        title: row.title,
        status: row.status,

        trainerName: row.trainer_name,
        trainerTelephone: row.trainer_telephone,
        trainerEmail: row.trainer_email,

        courseNameLevel: row.course_name_level,
        competencyArea: row.competency_area,
        dateOfPreparation: row.date_of_preparation,

        institution: row.institution,
        intake: row.intake,
        module: row.module,

        supervisorName: row.supervisor_name,
        supervisorSignature: row.supervisor_signature,

        entryCount: Number(row.entry_count) || 0,

        programName: row.program_name,
        unitCode: row.unit_code ?? null,
        unitName: row.unit_name,

        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
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

/* -------------------------------------------------------------------------- */
/* POST: CREATE OFFICIAL SMTC SCHEME OF WORK                                  */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  let client: PoolClient | null = null;
  let transactionStarted = false;

  try {
    /* ---------------------------------------------------------------------- */
    /* AUTHENTICATION                                                         */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* READ REQUEST BODY                                                      */
    /* ---------------------------------------------------------------------- */

    const body = (await request.json()) as SchemeBody;

    const programId = positiveId(body.programId);
    const unitId = positiveId(body.unitId);

    const academicYear = text(body.academicYear);
    const term = text(body.term);
    const title = text(body.title);

    const trainerName = text(body.trainerName);
    const trainerTelephone = text(body.trainerTelephone);
    const trainerEmail = text(body.trainerEmail);

    const courseNameLevel = text(body.courseNameLevel);
    const competencyArea = text(body.competencyArea);

    const dateOfPreparation = text(
      body.dateOfPreparation,
    );

    const institution =
      text(body.institution) ||
      'Shifah Medical Training College';

    const intake = text(body.intake);
    const module = text(body.module);

    const supervisorName = text(body.supervisorName);
    const supervisorSignature = text(
      body.supervisorSignature,
    );

    const status =
      text(body.status) === 'published'
        ? 'published'
        : 'draft';

    /* ---------------------------------------------------------------------- */
    /* VALIDATE REQUIRED FIELDS                                               */
    /* ---------------------------------------------------------------------- */

    if (!programId || !unitId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Programme and unit are required.',
        },
        { status: 400 },
      );
    }

    if (!academicYear || !term || !title) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Academic year, term and scheme title are required.',
        },
        { status: 400 },
      );
    }

    if (title.length > 255) {
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
      !trainerName ||
      !courseNameLevel ||
      !competencyArea ||
      !dateOfPreparation ||
      !intake ||
      !module
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please complete the trainer, course, competency area, preparation date, intake and module details.',
        },
        { status: 400 },
      );
    }

    if (!validDate(dateOfPreparation)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid preparation date.',
        },
        { status: 400 },
      );
    }

    if (
      trainerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trainerEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid trainer email address.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VERIFY PROGRAMME AND UNIT ASSIGNMENT                                   */
    /* ---------------------------------------------------------------------- */

    const assigned = await verifyAssignment(
      Number(lecturer.id),
      programId,
      unitId,
    );

    if (!assigned) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You are not assigned to the selected programme and unit.',
        },
        { status: 403 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE WEEKLY ENTRIES                                                */
    /* ---------------------------------------------------------------------- */

    const rawEntries = Array.isArray(body.entries)
      ? body.entries
      : [];

    const entries: NormalizedEntry[] = [];

    for (const rawEntry of rawEntries) {
      if (
        !rawEntry ||
        typeof rawEntry !== 'object' ||
        Array.isArray(rawEntry)
      ) {
        continue;
      }

      const entry = rawEntry as SchemeEntryInput;

      const lessonTitle = getEntryValue(
        entry.lessonTitle,
        entry.topic,
      );

      const objectives = getEntryValue(
        entry.objectives,
        entry.learningOutcomes,
      );

      const keyPoints = text(entry.keyPoints);

      const applicationActivities = getEntryValue(
        entry.applicationActivities,
        entry.activities,
      );

      const referencesAids = getEntryValue(
        entry.referencesAids,
        entry.resources,
      );

      const remarks = text(entry.remarks);

      const weekNumber = Number(entry.weekNumber);

      // Ignore completely empty rows.
      if (
        !lessonTitle &&
        !objectives &&
        !keyPoints &&
        !applicationActivities &&
        !referencesAids &&
        !remarks
      ) {
        continue;
      }

      if (
        !Number.isInteger(weekNumber) ||
        weekNumber <= 0 ||
        !lessonTitle ||
        !objectives ||
        !keyPoints ||
        !applicationActivities ||
        !referencesAids
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Each completed weekly entry must have a valid week number, lesson title, objectives, key points, application/activities and references/aids.',
          },
          { status: 400 },
        );
      }

      const rawDateTaught =
        entry.dateTaught || entry.startDate;

      const dateTaught = nullableDate(rawDateTaught);

      if (
        text(rawDateTaught) &&
        !dateTaught
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Enter a valid date taught for week ${weekNumber}.`,
          },
          { status: 400 },
        );
      }

      entries.push({
        weekNumber,
        lessonTitle,
        objectives,
        keyPoints,
        applicationActivities,
        referencesAids,
        remarks,
        dateTaught,

        subtopic: text(entry.subtopic),
        assessment: text(entry.assessment),
      });
    }

    if (entries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Add at least one completed weekly lesson entry.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* START DATABASE TRANSACTION                                             */
    /* ---------------------------------------------------------------------- */

    const transactionClient = await pool.connect();
    client = transactionClient;

    await transactionClient.query('BEGIN');
    transactionStarted = true;

    /* ---------------------------------------------------------------------- */
    /* GENERATE UNIQUE REFERENCE NUMBER                                       */
    /* ---------------------------------------------------------------------- */

    const referenceYear = new Date(
      `${dateOfPreparation}T00:00:00.000Z`,
    ).getUTCFullYear();

    const referenceNumber = await generateReferenceNumber(
      transactionClient,
      referenceYear,
    );

    /* ---------------------------------------------------------------------- */
    /* INSERT SCHEME METADATA                                                 */
    /* ---------------------------------------------------------------------- */

    const schemeResult = await transactionClient.query(
      `
        INSERT INTO lms_schemes_of_work (
          program_id,
          unit_id,
          lecturer_id,

          reference_number,
          academic_year,
          term,
          title,
          status,

          trainer_name,
          trainer_telephone,
          trainer_email,

          course_name_level,
          competency_area,
          date_of_preparation,

          institution,
          intake,
          module,

          supervisor_name,
          supervisor_signature
        )

        VALUES (
          $1, $2, $3,
          $4, $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14::DATE,
          $15, $16, $17,
          $18, $19
        )

        RETURNING id
      `,
      [
        programId,
        unitId,
        lecturer.id,

        referenceNumber,
        academicYear,
        term,
        title,
        status,

        trainerName,
        trainerTelephone || null,
        trainerEmail || null,

        courseNameLevel,
        competencyArea,
        dateOfPreparation,

        institution,
        intake,
        module,

        supervisorName || null,
        supervisorSignature || null,
      ],
    );

    const schemeId = Number(
      schemeResult.rows[0].id,
    );

    /* ---------------------------------------------------------------------- */
    /* INSERT WEEKLY LESSON ENTRIES                                           */
    /* ---------------------------------------------------------------------- */

    for (const entry of entries) {
      await transactionClient.query(
        `
          INSERT INTO lms_scheme_of_work_entries (
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
            remarks,

            lesson_title,
            objectives,
            key_points,
            application_activities,
            references_aids,
            date_taught
          )

          VALUES (
            $1,
            $2,

            $3::DATE,
            NULL,

            $4,
            NULLIF($5, ''),
            $6,
            $7,
            $8,
            NULLIF($9, ''),
            NULLIF($10, ''),

            $11,
            $12,
            $13,
            $14,
            $15,
            $16::DATE
          )
        `,
        [
          schemeId,
          entry.weekNumber,

          // Legacy start date
          entry.dateTaught,

          // Legacy columns
          entry.lessonTitle,
          entry.subtopic,
          entry.objectives,
          entry.applicationActivities,
          entry.referencesAids,
          entry.assessment,
          entry.remarks,

          // Official SMTC columns
          entry.lessonTitle,
          entry.objectives,
          entry.keyPoints,
          entry.applicationActivities,
          entry.referencesAids,
          entry.dateTaught,
        ],
      );
    }

    /* ---------------------------------------------------------------------- */
    /* COMMIT                                                                  */
    /* ---------------------------------------------------------------------- */

    await transactionClient.query('COMMIT');
    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,

        scheme: {
          id: schemeId,

          referenceNumber,

          programId,
          unitId,

          academicYear,
          term,
          title,
          status,

          trainerName,
          trainerTelephone,
          trainerEmail,

          courseNameLevel,
          competencyArea,
          dateOfPreparation,

          institution,
          intake,
          module,

          supervisorName,
          supervisorSignature,

          entryCount: entries.length,
        },

        message:
          `Scheme of work ${referenceNumber} created successfully.`,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Scheme transaction rollback failed:',
          rollbackError,
        );
      }
    }

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
    client?.release();
  }
}
