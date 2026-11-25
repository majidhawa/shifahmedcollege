
import {
  NextRequest,
  NextResponse,
} from 'next/server';
import type { PoolClient } from 'pg';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================
// TYPES
// ============================================

type SchemeEntryInput = {
  id?: unknown;
  weekNumber?: unknown;

  lessonTitle?: unknown;
  objectives?: unknown;
  keyPoints?: unknown;
  applicationActivities?: unknown;
  referencesAids?: unknown;
  remarks?: unknown;
  dateTaught?: unknown;

  // Legacy compatibility
  topic?: unknown;
  subtopic?: unknown;
  learningOutcomes?: unknown;
  activities?: unknown;
  resources?: unknown;
  assessment?: unknown;
  startDate?: unknown;
  endDate?: unknown;
};

type SchemeUpdateInput = {
  title?: unknown;
  academicYear?: unknown;
  term?: unknown;
  status?: unknown;

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
  dateTaught: string;
};

// ============================================
// HELPERS
// ============================================

function parseId(value: string): number | null {
  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}

function text(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function dateString(value: unknown): string {
  if (!value) return '';

  const raw = String(value);

  // PostgreSQL DATE values should not shift because of timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function isValidDate(value: string): boolean {
  if (!value) return true;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function normalizeEntry(
  raw: SchemeEntryInput,
  index: number,
): NormalizedEntry {
  const weekNumber = Number(raw.weekNumber);

  return {
    weekNumber:
      Number.isInteger(weekNumber) && weekNumber > 0
        ? weekNumber
        : index + 1,

    lessonTitle:
      text(raw.lessonTitle) ||
      text(raw.topic),

    objectives:
      text(raw.objectives) ||
      text(raw.learningOutcomes),

    keyPoints:
      text(raw.keyPoints) ||
      text(raw.subtopic),

    applicationActivities:
      text(raw.applicationActivities) ||
      text(raw.activities),

    referencesAids:
      text(raw.referencesAids) ||
      text(raw.resources),

    remarks: text(raw.remarks),

    dateTaught:
      text(raw.dateTaught) ||
      text(raw.startDate),
  };
}

// ============================================
// GET: FETCH ONE SCHEME
// ============================================

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
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

    const { id } = await context.params;
    const schemeId = parseId(id);

    if (!schemeId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid scheme ID.',
        },
        { status: 400 },
      );
    }

    // ----------------------------------------
    // FETCH SCHEME INFORMATION
    // ----------------------------------------

    const schemeResult = await pool.query(
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
          u.name AS unit_name

        FROM lms_schemes_of_work s

        INNER JOIN lms_programs p
          ON p.id = s.program_id

        INNER JOIN lms_units u
          ON u.id = s.unit_id

        INNER JOIN lms_lecturer_units lp
          ON lp.unit_id = u.id
         AND lp.lecturer_id = $2

        WHERE s.id = $1
          AND s.lecturer_id = $2

        LIMIT 1
      `,
      [
        schemeId,
        lecturer.id,
      ],
    );

    if (schemeResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Scheme not found or you do not have permission to access it.',
        },
        { status: 404 },
      );
    }

    // ----------------------------------------
    // FETCH WEEKLY TEACHING ENTRIES
    // ----------------------------------------

    const entriesResult = await pool.query(
      `
        SELECT
          id,
          week_number,

          -- Official SMTC fields
          lesson_title,
          objectives,
          key_points,
          application_activities,
          references_aids,
          date_taught,

          -- Legacy fields
          start_date,
          end_date,
          topic,
          subtopic,
          learning_outcomes,
          activities,
          resources,
          assessment,
          remarks

        FROM lms_scheme_of_work_entries

        WHERE scheme_id = $1

        ORDER BY
          week_number ASC,
          id ASC
      `,
      [schemeId],
    );

    const scheme = schemeResult.rows[0];

    // ----------------------------------------
    // RETURN NORMALIZED SCHEME
    // ----------------------------------------

    return NextResponse.json({
      success: true,

      scheme: {
        id: Number(scheme.id),

        programId: Number(scheme.program_id),
        unitId: Number(scheme.unit_id),

        programName: scheme.program_name || '',
        unitCode: scheme.unit_code ?? null,
        unitName: scheme.unit_name || '',

        referenceNumber: scheme.reference_number || '',

        academicYear: scheme.academic_year || '',
        term: scheme.term || '',
        title: scheme.title || '',
        status: scheme.status || 'draft',

        trainerName: scheme.trainer_name || '',
        trainerTelephone: scheme.trainer_telephone || '',
        trainerEmail: scheme.trainer_email || '',

        courseNameLevel: scheme.course_name_level || '',
        competencyArea: scheme.competency_area || '',

        dateOfPreparation: dateString(
          scheme.date_of_preparation,
        ),

        institution:
          scheme.institution ||
          'Shifah Medical Training College',

        intake: scheme.intake || '',
        module: scheme.module || '',

        supervisorName: scheme.supervisor_name || '',
        supervisorSignature: scheme.supervisor_signature || '',

        createdAt: scheme.created_at,
        updatedAt: scheme.updated_at,

        entries: entriesResult.rows.map((entry) => {
          const lessonTitle =
            entry.lesson_title || entry.topic || '';

          const objectives =
            entry.objectives ||
            entry.learning_outcomes ||
            '';

          const keyPoints =
            entry.key_points ||
            entry.subtopic ||
            '';

          const applicationActivities =
            entry.application_activities ||
            entry.activities ||
            '';

          const referencesAids =
            entry.references_aids ||
            entry.resources ||
            '';

          const dateTaught = dateString(
            entry.date_taught || entry.start_date,
          );

          return {
            id: Number(entry.id),

            weekNumber: Number(entry.week_number),

            // Official fields
            lessonTitle,
            objectives,
            keyPoints,
            applicationActivities,
            referencesAids,
            dateTaught,
            remarks: entry.remarks || '',

            // Legacy aliases for compatibility
            startDate: dateTaught,
            endDate: dateString(entry.end_date),
            topic: lessonTitle,
            subtopic: keyPoints,
            learningOutcomes: objectives,
            activities: applicationActivities,
            resources: referencesAids,
            assessment: entry.assessment || '',
          };
        }),
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

// ============================================
// PUT: UPDATE SCHEME
// ============================================

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  let client: PoolClient | null = null;

  let transactionStarted = false;

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

    const { id } = await context.params;
    const schemeId = parseId(id);

    if (!schemeId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid scheme ID.',
        },
        { status: 400 },
      );
    }

    const body = (
      await request.json()
    ) as SchemeUpdateInput;

    // ----------------------------------------
    // VALIDATE MAIN SCHEME INFORMATION
    // ----------------------------------------

    const title = text(body.title);
    const academicYear = text(body.academicYear);
    const term = text(body.term);

    const status =
      text(body.status).toLowerCase() === 'published'
        ? 'published'
        : 'draft';

    const trainerName = text(body.trainerName);
    const trainerTelephone = text(body.trainerTelephone);
    const trainerEmail = text(body.trainerEmail);

    const courseNameLevel = text(body.courseNameLevel);
    const competencyArea = text(body.competencyArea);

    const dateOfPreparation = text(body.dateOfPreparation);

    const institution =
      text(body.institution) ||
      'Shifah Medical Training College';

    const intake = text(body.intake);
    const module = text(body.module);

    const supervisorName = text(body.supervisorName);
    const supervisorSignature = text(body.supervisorSignature);

    if (!title || !academicYear || !term) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Scheme title, academic year and term are required.',
        },
        { status: 400 },
      );
    }

    if (!trainerName) {
      return NextResponse.json(
        {
          success: false,
          message: 'Trainer name is required.',
        },
        { status: 400 },
      );
    }

    if (!courseNameLevel || !competencyArea) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Course name and competency area are required.',
        },
        { status: 400 },
      );
    }

    if (!isValidDate(dateOfPreparation)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid date of preparation.',
        },
        { status: 400 },
      );
    }

    // ----------------------------------------
    // VALIDATE WEEKLY ENTRIES
    // ----------------------------------------

    if (!Array.isArray(body.entries)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Weekly entries must be provided as an array.',
        },
        { status: 400 },
      );
    }

    const normalizedEntries: NormalizedEntry[] = [];

    const usedWeekNumbers = new Set<number>();

    for (let index = 0; index < body.entries.length; index++) {
      const rawEntry = body.entries[index];

      if (
        !rawEntry ||
        typeof rawEntry !== 'object' ||
        Array.isArray(rawEntry)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid weekly entry at position ${index + 1}.`,
          },
          { status: 400 },
        );
      }

      const entry = normalizeEntry(
        rawEntry as SchemeEntryInput,
        index,
      );

      if (!entry.lessonTitle) {
        return NextResponse.json(
          {
            success: false,
            message: `Lesson title is required for Week ${entry.weekNumber}.`,
          },
          { status: 400 },
        );
      }

      if (
        !Number.isInteger(entry.weekNumber) ||
        entry.weekNumber <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid week number at entry ${index + 1}.`,
          },
          { status: 400 },
        );
      }

      if (usedWeekNumbers.has(entry.weekNumber)) {
        return NextResponse.json(
          {
            success: false,
            message: `Week ${entry.weekNumber} has been entered more than once.`,
          },
          { status: 400 },
        );
      }

      usedWeekNumbers.add(entry.weekNumber);

      if (!isValidDate(entry.dateTaught)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid date taught for Week ${entry.weekNumber}.`,
          },
          { status: 400 },
        );
      }

      normalizedEntries.push(entry);
    }

    if (normalizedEntries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'At least one weekly teaching entry is required.',
        },
        { status: 400 },
      );
    }

    // ----------------------------------------
    // START TRANSACTION
    // ----------------------------------------

    client = await pool.connect();

    await client.query('BEGIN');
    transactionStarted = true;

    // ----------------------------------------
    // VERIFY SCHEME OWNERSHIP
    // ----------------------------------------

    const ownership = await client.query(
      `
        SELECT
          id

        FROM lms_schemes_of_work

        WHERE id = $1
          AND lecturer_id = $2

        FOR UPDATE
      `,
      [
        schemeId,
        lecturer.id,
      ],
    );

    if (ownership.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            'Scheme not found or you do not have permission to edit it.',
        },
        { status: 404 },
      );
    }

    // ----------------------------------------
    // UPDATE SCHEME INFORMATION
    // ----------------------------------------

    await client.query(
      `
        UPDATE lms_schemes_of_work

        SET
          title = $1,
          academic_year = $2,
          term = $3,
          status = $4,

          trainer_name = $5,
          trainer_telephone = $6,
          trainer_email = $7,

          course_name_level = $8,
          competency_area = $9,
          date_of_preparation =
            NULLIF($10::TEXT, '')::DATE,

          institution = $11,
          intake = $12,
          module = $13,

          supervisor_name = $14,
          supervisor_signature = $15,

          updated_at = NOW()

        WHERE id = $16
          AND lecturer_id = $17
      `,
      [
        title,
        academicYear,
        term,
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

        schemeId,
        lecturer.id,
      ],
    );

    // ----------------------------------------
    // REPLACE WEEKLY ENTRIES
    // ----------------------------------------

    await client.query(
      `
        DELETE FROM lms_scheme_of_work_entries

        WHERE scheme_id = $1
      `,
      [schemeId],
    );

    for (const entry of normalizedEntries) {
      await client.query(
        `
          INSERT INTO lms_scheme_of_work_entries (
            scheme_id,
            week_number,

            -- Official SMTC fields
            lesson_title,
            objectives,
            key_points,
            application_activities,
            references_aids,
            date_taught,

            -- Legacy fields retained for compatibility
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

            NULLIF($3::TEXT, ''),
            NULLIF($4::TEXT, ''),
            NULLIF($5::TEXT, ''),
            NULLIF($6::TEXT, ''),
            NULLIF($7::TEXT, ''),
            NULLIF($8::TEXT, '')::DATE,

            NULLIF($8::TEXT, '')::DATE,
            NULL,

            NULLIF($3::TEXT, ''),
            NULLIF($5::TEXT, ''),
            NULLIF($4::TEXT, ''),
            NULLIF($6::TEXT, ''),
            NULLIF($7::TEXT, ''),
            NULL,
            NULLIF($9::TEXT, '')
          )
        `,
        [
          schemeId,
          entry.weekNumber,

          entry.lessonTitle,
          entry.objectives,
          entry.keyPoints,
          entry.applicationActivities,
          entry.referencesAids,
          entry.dateTaught,
          entry.remarks,
        ],
      );
    }

    // ----------------------------------------
    // COMMIT TRANSACTION
    // ----------------------------------------

    await client.query('COMMIT');
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: 'Scheme of Work updated successfully.',
    });
  } catch (error: unknown) {
    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Scheme update rollback error:',
          rollbackError,
        );
      }
    }

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
    client?.release();
  }
}

// ============================================
// DELETE: DELETE SCHEME
// ============================================

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
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

    const { id } = await context.params;
    const schemeId = parseId(id);

    if (!schemeId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid scheme ID.',
        },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `
        DELETE FROM lms_schemes_of_work

        WHERE id = $1
          AND lecturer_id = $2

        RETURNING id
      `,
      [
        schemeId,
        lecturer.id,
      ],
    );

    if (result.rows.length === 0) {
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
      message: 'Scheme of Work deleted successfully.',
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
