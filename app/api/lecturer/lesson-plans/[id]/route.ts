
import {
  NextRequest,
  NextResponse,
} from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type LessonPlanBody = {
  programId?: unknown;
  unitId?: unknown;
  schemeEntryId?: unknown;
  topicId?: unknown;

  lessonDate?: unknown;
  lessonTime?: unknown;
  durationMinutes?: unknown;

  topic?: unknown;
  subtopic?: unknown;

  generalObjective?: unknown;
  specificObjectives?: unknown;
  priorKnowledge?: unknown;
  resources?: unknown;

  introduction?: unknown;
  teacherActivities?: unknown;
  learnerActivities?: unknown;

  assessment?: unknown;
  conclusion?: unknown;
  assignment?: unknown;
  remarks?: unknown;

  trainerPhone?: unknown;
  intake?: unknown;
  studentCount?: unknown;
  competencyArea?: unknown;

  supervisorSignature?: unknown;
  references?: unknown;
  presentation?: unknown;

  status?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseId(value: string): number | null {
  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}

function positiveId(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}

function text(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

/**
 * When a field is omitted from an update request,
 * retain its existing database value.
 *
 * When it is supplied, use the new value.
 */
function existingText(
  newValue: unknown,
  oldValue: unknown,
): string {
  if (newValue === undefined) {
    return String(oldValue ?? '');
  }

  return text(newValue);
}

function existingId(
  newValue: unknown,
  oldValue: unknown,
): number | null {
  if (newValue === undefined) {
    return oldValue !== null && oldValue !== undefined
      ? Number(oldValue)
      : null;
  }

  return positiveId(newValue);
}

function existingDate(
  newValue: unknown,
  oldValue: unknown,
): string {
  if (newValue === undefined) {
    return oldValue
      ? String(oldValue).slice(0, 10)
      : '';
  }

  return text(newValue);
}

function existingTime(
  newValue: unknown,
  oldValue: unknown,
): string {
  if (newValue === undefined) {
    return oldValue
      ? String(oldValue).slice(0, 5)
      : '';
  }

  return text(newValue);
}

function existingInteger(
  newValue: unknown,
  oldValue: unknown,
): number | null {
  const value = newValue === undefined
    ? oldValue
    : newValue;

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number)
    ? number
    : null;
}

function validDate(value: string): boolean {
  if (!value) return true;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validTime(value: string): boolean {
  if (!value) return true;

  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Keep presentation data in the same structure used by
 * the lesson-plan creation API:
 *
 * [
 *   { content: "Lesson presentation..." }
 * ]
 *
 * This also handles older records where presentation
 * may have been saved as a plain string.
 */
function normalizePresentation(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return [
      {
        content: value.trim(),
      },
    ];
  }

  if (
    value &&
    typeof value === 'object' &&
    'content' in value
  ) {
    return [value];
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* MAP LESSON PLAN                                                            */
/* -------------------------------------------------------------------------- */

function mapLessonPlan(
  row: Record<string, unknown>,
) {
  const weekNumber =
    row.week_number !== null &&
    row.week_number !== undefined
      ? Number(row.week_number)
      : null;

  return {
    id: Number(row.id),

    programId: Number(row.program_id),
    unitId: Number(row.unit_id),
    lecturerId: Number(row.lecturer_id),

    schemeEntryId: row.scheme_entry_id
      ? Number(row.scheme_entry_id)
      : null,

    topicId: row.topic_id
      ? Number(row.topic_id)
      : null,

    /* LESSON DATE AND TIME */

    lessonDate: row.lesson_date
      ? String(row.lesson_date).slice(0, 10)
      : '',

    lessonTime: row.lesson_time
      ? String(row.lesson_time).slice(0, 5)
      : '',

    durationMinutes:
      row.duration_minutes !== null &&
      row.duration_minutes !== undefined
        ? Number(row.duration_minutes)
        : null,

    /* LESSON DETAILS */

    topic: row.topic ?? '',
    subtopic: row.subtopic ?? '',

    generalObjective: row.general_objective ?? '',
    specificObjectives: row.specific_objectives ?? '',

    priorKnowledge: row.prior_knowledge ?? '',
    resources: row.resources ?? '',

    /* PRESENTATION */

    introduction: row.introduction ?? '',
    teacherActivities: row.teacher_activities ?? '',
    learnerActivities: row.learner_activities ?? '',

    assessment: row.assessment ?? '',
    conclusion: row.conclusion ?? '',
    assignment: row.assignment ?? '',
    remarks: row.remarks ?? '',

    /* TRAINER DETAILS */

    trainerName: row.trainer_name ?? '',
    trainerPhone: row.trainer_phone ?? '',

    courseLevel:
      row.course_level ?? row.program_level ?? '',

    /* INTAKE AND STUDENTS */

    intake: row.intake ?? '',

    studentCount:
      row.student_count !== null &&
      row.student_count !== undefined
        ? Number(row.student_count)
        : null,

    competencyArea: row.competency_area ?? '',

    /* REFERENCES AND SIGNATURE */

    references: row.lesson_references ?? '',

    supervisorSignature:
      row.supervisor_signature ?? '',

    /* PRESENTATION JSON */

    presentation: normalizePresentation(
      row.presentation,
    ),

    status: row.status ?? 'draft',

    /* PROGRAMME */

    programName: row.program_name ?? '',
    programLevel: row.program_level ?? '',

    /* UNIT */

    unitCode: row.unit_code ?? null,
    unitName: row.unit_name ?? '',

    /* SCHEME OF WORK */

    schemeId: row.scheme_id
      ? Number(row.scheme_id)
      : null,

    schemeTitle: row.scheme_title ?? null,

    weekNumber,

    week: weekNumber !== null
      ? String(weekNumber)
      : '',

    schemeWeekTopic:
      row.scheme_week_topic ?? null,

    schemeWeekSubtopic:
      row.scheme_week_subtopic ?? null,

    academicYear: row.academic_year ?? null,

    term: row.term ?? null,

    /* TOPIC */

    topicTitle: row.topic_title ?? null,

    /* TIMESTAMPS */

    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* FETCH ONE LESSON PLAN OWNED BY THE AUTHENTICATED LECTURER                  */
/* -------------------------------------------------------------------------- */

async function getOwnedLessonPlan(
  lecturerId: number,
  lessonPlanId: number,
) {
  const result = await pool.query(
    `
      SELECT
        lp.id,

        lp.program_id,
        lp.unit_id,
        lp.lecturer_id,

        lp.scheme_entry_id,
        lp.topic_id,

        lp.lesson_date,
        lp.lesson_time,
        lp.duration_minutes,

        lp.topic,
        lp.subtopic,

        lp.general_objective,
        lp.specific_objectives,

        lp.prior_knowledge,
        lp.resources,

        lp.introduction,
        lp.teacher_activities,
        lp.learner_activities,

        lp.assessment,
        lp.conclusion,
        lp.assignment,
        lp.remarks,

        lp.trainer_name,
        lp.trainer_phone,
        lp.course_level,

        lp.intake,
        lp.student_count,
        lp.competency_area,

        lp.lesson_references,
        lp.supervisor_signature,
        lp.presentation,

        lp.status,

        lp.created_at,
        lp.updated_at,

        p.name AS program_name,
        p.level AS program_level,

        u.code AS unit_code,
        u.name AS unit_name,

        se.week_number,

        se.topic AS scheme_week_topic,
        se.subtopic AS scheme_week_subtopic,

        s.id AS scheme_id,
        s.title AS scheme_title,

        s.academic_year,
        s.term,

        t.title AS topic_title

      FROM lms_lesson_plans lp

      INNER JOIN lms_programs p
        ON p.id = lp.program_id

      INNER JOIN lms_units u
        ON u.id = lp.unit_id

      LEFT JOIN lms_scheme_of_work_entries se
        ON se.id = lp.scheme_entry_id

      LEFT JOIN lms_schemes_of_work s
        ON s.id = se.scheme_id
       AND s.lecturer_id = $2

      LEFT JOIN lms_topics t
        ON t.id = lp.topic_id

      WHERE lp.id = $1
        AND lp.lecturer_id = $2

        AND EXISTS (
          SELECT 1

          FROM lms_lecturer_programs lpr

          WHERE lpr.program_id = lp.program_id
            AND lpr.lecturer_id = $2
        )

      LIMIT 1
    `,
    [
      lessonPlanId,
      lecturerId,
    ],
  );

  return result.rows[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* VERIFY LECTURER ACCESS TO PROGRAMME AND UNIT                              */
/* -------------------------------------------------------------------------- */

async function verifyUnitAccess(
  lecturerId: number,
  programId: number,
  unitId: number,
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1

      FROM lms_lecturer_programs lp

      INNER JOIN lms_units u
        ON u.program_id = lp.program_id
       AND u.id = $3

      WHERE lp.lecturer_id = $1
        AND lp.program_id = $2

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
/* GET /api/lecturer/lesson-plans/[id]                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
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

    const lessonPlanId = parseId(id);

    if (!lessonPlanId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lesson plan ID.',
        },
        { status: 400 },
      );
    }

    const row = await getOwnedLessonPlan(
      lecturer.id,
      lessonPlanId,
    );

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lesson plan not found or you do not have permission to access it.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,

      lessonPlan: mapLessonPlan(row),
    });

  } catch (error: unknown) {
    console.error(
      'GET /api/lecturer/lesson-plans/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error
          ? error.message
          : 'Unable to load lesson plan.',
      },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PUT /api/lecturer/lesson-plans/[id]                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(
  request: NextRequest,
  context: RouteContext,
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

    const lessonPlanId = parseId(id);

    if (!lessonPlanId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lesson plan ID.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FETCH EXISTING RECORD                                                  */
    /* ---------------------------------------------------------------------- */

    const existing = await getOwnedLessonPlan(
      lecturer.id,
      lessonPlanId,
    );

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lesson plan not found or you do not have permission to edit it.',
        },
        { status: 404 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* READ REQUEST BODY                                                      */
    /* ---------------------------------------------------------------------- */

    let body: LessonPlanBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* IDENTIFIERS                                                            */
    /* ---------------------------------------------------------------------- */

    const programId = body.programId === undefined
      ? Number(existing.program_id)
      : positiveId(body.programId);

    const unitId = body.unitId === undefined
      ? Number(existing.unit_id)
      : positiveId(body.unitId);

    if (!programId || !unitId) {
      return NextResponse.json(
        {
          success: false,
          message: 'A valid programme and unit are required.',
        },
        { status: 400 },
      );
    }

    const schemeEntryId = existingId(
      body.schemeEntryId,
      existing.scheme_entry_id,
    );

    const topicId = existingId(
      body.topicId,
      existing.topic_id,
    );

    if (
      body.schemeEntryId !== undefined &&
      body.schemeEntryId !== null &&
      String(body.schemeEntryId).trim() !== '' &&
      schemeEntryId === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid Scheme of Work week selected.',
        },
        { status: 400 },
      );
    }

    if (
      body.topicId !== undefined &&
      body.topicId !== null &&
      String(body.topicId).trim() !== '' &&
      topicId === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid topic selected.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* LESSON DATE AND TIME                                                   */
    /* ---------------------------------------------------------------------- */

    const lessonDate = existingDate(
      body.lessonDate,
      existing.lesson_date,
    );

    const lessonTime = existingTime(
      body.lessonTime,
      existing.lesson_time,
    );

    if (!validDate(lessonDate)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide a valid lesson date.',
        },
        { status: 400 },
      );
    }

    if (!validTime(lessonTime)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please provide a valid lesson time.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DURATION                                                               */
    /* ---------------------------------------------------------------------- */

    const durationRaw =
      body.durationMinutes === undefined
        ? existing.duration_minutes
        : body.durationMinutes;

    let durationMinutes: number | null = null;

    if (
      durationRaw !== null &&
      durationRaw !== undefined &&
      String(durationRaw).trim() !== ''
    ) {
      const parsedDuration = Number(durationRaw);

      if (
        !Number.isInteger(parsedDuration) ||
        parsedDuration <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Lesson duration must be a positive whole number.',
          },
          { status: 400 },
        );
      }

      durationMinutes = parsedDuration;
    }

    /* ---------------------------------------------------------------------- */
    /* LESSON TEXT FIELDS                                                     */
    /* ---------------------------------------------------------------------- */

    let topic = existingText(
      body.topic,
      existing.topic,
    );

    let subtopic = existingText(
      body.subtopic,
      existing.subtopic,
    );

    const generalObjective = existingText(
      body.generalObjective,
      existing.general_objective,
    );

    const specificObjectives = existingText(
      body.specificObjectives,
      existing.specific_objectives,
    );

    const priorKnowledge = existingText(
      body.priorKnowledge,
      existing.prior_knowledge,
    );

    const resources = existingText(
      body.resources,
      existing.resources,
    );

    const introduction = existingText(
      body.introduction,
      existing.introduction,
    );

    const teacherActivities = existingText(
      body.teacherActivities,
      existing.teacher_activities,
    );

    const learnerActivities = existingText(
      body.learnerActivities,
      existing.learner_activities,
    );

    const assessment = existingText(
      body.assessment,
      existing.assessment,
    );

    const conclusion = existingText(
      body.conclusion,
      existing.conclusion,
    );

    const assignment = existingText(
      body.assignment,
      existing.assignment,
    );

    const remarks = existingText(
      body.remarks,
      existing.remarks,
    );

    /* ---------------------------------------------------------------------- */
    /* TRAINER AND INTAKE DETAILS                                             */
    /* ---------------------------------------------------------------------- */

    const trainerPhone = existingText(
      body.trainerPhone,
      existing.trainer_phone,
    );

    const intake = existingText(
      body.intake,
      existing.intake,
    );

    const studentCount = existingInteger(
      body.studentCount,
      existing.student_count,
    );

    if (
      body.studentCount !== undefined &&
      body.studentCount !== null &&
      String(body.studentCount).trim() !== '' &&
      (
        studentCount === null ||
        studentCount < 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Number of students must be a valid non-negative whole number.',
        },
        { status: 400 },
      );
    }

    const competencyArea = existingText(
      body.competencyArea,
      existing.competency_area,
    );

    /* ---------------------------------------------------------------------- */
    /* REFERENCES AND SIGNATURE                                               */
    /* ---------------------------------------------------------------------- */

    const lessonReferences = existingText(
      body.references,
      existing.lesson_references,
    );

    const supervisorSignature = existingText(
      body.supervisorSignature,
      existing.supervisor_signature,
    );

    /* ---------------------------------------------------------------------- */
    /* PRESENTATION                                                            */
    /* ---------------------------------------------------------------------- */

    const presentationValue =
      body.presentation === undefined
        ? existing.presentation
        : body.presentation;

    const presentationData = normalizePresentation(
      presentationValue,
    );

    /* ---------------------------------------------------------------------- */
    /* STATUS                                                                 */
    /* ---------------------------------------------------------------------- */

    const status = body.status === undefined
      ? String(existing.status ?? 'draft')
      : text(body.status);

    if (!['draft', 'completed'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lesson plan status.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* REQUIRED LESSON DETAILS                                                */
    /* ---------------------------------------------------------------------- */

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lesson topic is required.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VERIFY PROGRAMME AND UNIT ACCESS                                       */
    /* ---------------------------------------------------------------------- */

    const hasUnitAccess = await verifyUnitAccess(
      lecturer.id,
      programId,
      unitId,
    );

    if (!hasUnitAccess) {
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
    /* VERIFY SCHEME OF WORK ENTRY                                            */
    /* ---------------------------------------------------------------------- */

    if (schemeEntryId !== null) {
      const schemeResult = await pool.query(
        `
          SELECT
            se.id,
            se.scheme_id,
            se.week_number,
            se.topic,
            se.subtopic,

            s.title AS scheme_title

          FROM lms_scheme_of_work_entries se

          INNER JOIN lms_schemes_of_work s
            ON s.id = se.scheme_id

          WHERE se.id = $1
            AND s.lecturer_id = $2
            AND s.program_id = $3
            AND s.unit_id = $4

          LIMIT 1
        `,
        [
          schemeEntryId,
          lecturer.id,
          programId,
          unitId,
        ],
      );

      if (schemeResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The selected Scheme of Work week does not belong to this programme, unit or lecturer.',
          },
          { status: 403 },
        );
      }

      const selectedScheme = schemeResult.rows[0];

      /*
       * If the trainer changes the Scheme of Work entry,
       * retrieve the new topic and subtopic automatically.
       *
       * Explicitly supplied topic/subtopic values are preserved.
       */

      if (
        body.schemeEntryId !== undefined &&
        Number(existing.scheme_entry_id) !== schemeEntryId
      ) {
        if (body.topic === undefined) {
          topic = text(selectedScheme.topic);
        }

        if (body.subtopic === undefined) {
          subtopic = text(selectedScheme.subtopic);
        }
      }

      if (!topic) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The selected Scheme of Work entry has no topic.',
          },
          { status: 400 },
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* VERIFY OPTIONAL TOPIC                                                  */
    /* ---------------------------------------------------------------------- */

    if (topicId !== null) {
      const topicAccess = await pool.query(
        `
          SELECT t.id

          FROM lms_topics t

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_lecturer_programs lp
            ON lp.program_id = u.program_id
           AND lp.lecturer_id = $2

          WHERE t.id = $1
            AND u.id = $3

          LIMIT 1
        `,
        [
          topicId,
          lecturer.id,
          unitId,
        ],
      );

      if (topicAccess.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The selected topic does not belong to the selected unit.',
          },
          { status: 403 },
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* PREPARE PRESENTATION JSON                                              */
    /* ---------------------------------------------------------------------- */

    let presentationJson: string;

    try {
      presentationJson = JSON.stringify(
        presentationData,
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid presentation data.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE LESSON PLAN                                                     */
    /* ---------------------------------------------------------------------- */

    const updateResult = await pool.query(
      `
        UPDATE lms_lesson_plans

        SET
          program_id = $1,
          unit_id = $2,

          scheme_entry_id = $3,
          topic_id = $4,

          lesson_date = NULLIF($5, '')::DATE,
          lesson_time = NULLIF($6, '')::TIME,

          duration_minutes = $7,

          topic = $8,
          subtopic = NULLIF($9, ''),

          general_objective = NULLIF($10, ''),
          specific_objectives = NULLIF($11, ''),

          prior_knowledge = NULLIF($12, ''),
          resources = NULLIF($13, ''),

          introduction = NULLIF($14, ''),
          teacher_activities = NULLIF($15, ''),
          learner_activities = NULLIF($16, ''),

          assessment = NULLIF($17, ''),
          conclusion = NULLIF($18, ''),
          assignment = NULLIF($19, ''),
          remarks = NULLIF($20, ''),

          trainer_phone = NULLIF($21, ''),

          intake = NULLIF($22, ''),
          student_count = $23,

          competency_area = NULLIF($24, ''),

          lesson_references = NULLIF($25, ''),
          supervisor_signature = NULLIF($26, ''),

          presentation = $27::jsonb,

          status = $28,

          updated_at = NOW()

        WHERE id = $29
          AND lecturer_id = $30

        RETURNING id
      `,
      [
        programId,
        unitId,

        schemeEntryId,
        topicId,

        lessonDate,
        lessonTime,

        durationMinutes,

        topic,
        subtopic,

        generalObjective,
        specificObjectives,

        priorKnowledge,
        resources,

        introduction,
        teacherActivities,
        learnerActivities,

        assessment,
        conclusion,
        assignment,
        remarks,

        trainerPhone,

        intake,
        studentCount,

        competencyArea,

        lessonReferences,
        supervisorSignature,

        presentationJson,

        status,

        lessonPlanId,
        lecturer.id,
      ],
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lesson plan could not be updated.',
        },
        { status: 404 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* RETRIEVE UPDATED RECORD                                                */
    /* ---------------------------------------------------------------------- */

    const updatedRow = await getOwnedLessonPlan(
      lecturer.id,
      lessonPlanId,
    );

    return NextResponse.json({
      success: true,

      message: 'Lesson plan updated successfully.',

      lessonPlan: updatedRow
        ? mapLessonPlan(updatedRow)
        : null,
    });

  } catch (error: unknown) {
    console.error(
      'PUT /api/lecturer/lesson-plans/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error
          ? error.message
          : 'Unable to update lesson plan.',
      },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE /api/lecturer/lesson-plans/[id]                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
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

    const lessonPlanId = parseId(id);

    if (!lessonPlanId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lesson plan ID.',
        },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `
        DELETE FROM lms_lesson_plans

        WHERE id = $1
          AND lecturer_id = $2

        RETURNING id
      `,
      [
        lessonPlanId,
        lecturer.id,
      ],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lesson plan not found or you do not have permission to delete it.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,

      message: 'Lesson plan deleted successfully.',
    });

  } catch (error: unknown) {
    console.error(
      'DELETE /api/lecturer/lesson-plans/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error
          ? error.message
          : 'Unable to delete lesson plan.',
      },
      { status: 500 },
    );
  }
}
