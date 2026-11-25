
import { NextRequest, NextResponse } from 'next/server';

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

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function positiveId(value: unknown): number | null {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalInteger(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number) ? number : null;
}

function validDate(value: string): boolean {
  if (!value) return true;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

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

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* /api/lecturer/lesson-plans                                                 */
/*                                                                            */
/* Returns programmes, units, Scheme of Work entries, lesson plans and        */
/* previously saved references.                                              */
/* -------------------------------------------------------------------------- */

export async function GET(_request: NextRequest) {
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

    /* ---------------------------------------------------------------------- */
    /* ASSIGNED PROGRAMMES AND UNITS                                          */
    /* ---------------------------------------------------------------------- */

    const programsResult = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.level,

          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', u.id,
                'code', u.code,
                'name', u.name
              )
              ORDER BY u.name
            ) FILTER (WHERE u.id IS NOT NULL),
            '[]'::json
          ) AS units

        FROM lms_units u

        INNER JOIN lms_programs p
          ON p.id = u.program_id

        INNER JOIN lms_lecturer_units lpr
          ON lpr.unit_id = u.id

        WHERE lpr.lecturer_id = $1

        GROUP BY
          p.id,
          p.name,
          p.level

        ORDER BY p.name
      `,
      [lecturer.id],
    );

    const programs = programsResult.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      level: row.level ?? '',

      units: Array.isArray(row.units)
        ? row.units.map((unit: {
            id: number | string;
            code: string | null;
            name: string;
          }) => ({
            id: Number(unit.id),
            code: unit.code ?? null,
            name: unit.name,
          }))
        : [],
    }));

    /* ---------------------------------------------------------------------- */
    /* SCHEME OF WORK ENTRIES                                                 */
    /* ---------------------------------------------------------------------- */

    const schemesResult = await pool.query(
      `
        SELECT
          se.id,
          se.scheme_id,
          se.week_number,
          se.topic,
          se.subtopic,

          s.title AS scheme_title,
          s.program_id,
          s.unit_id

        FROM lms_scheme_of_work_entries se

        INNER JOIN lms_schemes_of_work s
          ON s.id = se.scheme_id

        WHERE s.lecturer_id = $1
          AND (
            (s.unit_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM lms_lecturer_units lu
              WHERE lu.lecturer_id = $1 AND lu.unit_id = s.unit_id
            ))
            OR (s.unit_id IS NULL AND EXISTS (
              SELECT 1 FROM lms_lecturer_programs lp
              WHERE lp.lecturer_id = $1 AND lp.program_id = s.program_id
            ))
          )

        ORDER BY
          s.program_id,
          s.unit_id,
          s.title,
          se.week_number,
          se.id
      `,
      [lecturer.id],
    );

    const schemeEntries = schemesResult.rows.map((row) => ({
      id: Number(row.id),
      schemeId: Number(row.scheme_id),

      weekNumber: Number(row.week_number),

      topic: row.topic ?? '',
      subtopic: row.subtopic ?? '',

      schemeTitle: row.scheme_title ?? '',

      programId: Number(row.program_id),
      unitId: Number(row.unit_id),
    }));

    /* ---------------------------------------------------------------------- */
    /* PREVIOUSLY SAVED REFERENCES                                            */
    /* ---------------------------------------------------------------------- */

    const referencesResult = await pool.query(
      `
        SELECT DISTINCT
          program_id,
          unit_id,
          lesson_references

        FROM lms_lesson_plans

        WHERE lecturer_id = $1

          AND lesson_references IS NOT NULL

          AND BTRIM(lesson_references) <> ''

        ORDER BY
          program_id,
          unit_id,
          lesson_references
      `,
      [lecturer.id],
    );

    const savedReferences = referencesResult.rows.map((row) => ({
      programId: Number(row.program_id),
      unitId: Number(row.unit_id),
      references: row.lesson_references ?? '',
    }));

    /* ---------------------------------------------------------------------- */
    /* LESSON PLANS                                                           */
    /* ---------------------------------------------------------------------- */

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

          s.id AS scheme_id,
          s.title AS scheme_title,

          se.week_number,
          se.topic AS scheme_week_topic,
          se.subtopic AS scheme_week_subtopic

        FROM lms_lesson_plans lp

        INNER JOIN lms_programs p
          ON p.id = lp.program_id

        INNER JOIN lms_units u
          ON u.id = lp.unit_id

        INNER JOIN lms_lecturer_units lpr
          ON lpr.unit_id = lp.unit_id
         AND lpr.lecturer_id = $1

        LEFT JOIN lms_scheme_of_work_entries se
          ON se.id = lp.scheme_entry_id

        LEFT JOIN lms_schemes_of_work s
          ON s.id = se.scheme_id
         AND s.lecturer_id = $1

        WHERE lp.lecturer_id = $1

        ORDER BY
          lp.lesson_date DESC NULLS LAST,
          lp.created_at DESC
      `,
      [lecturer.id],
    );

    const lessonPlans = result.rows.map((row) => ({
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

      lessonDate: row.lesson_date
        ? String(row.lesson_date).slice(0, 10)
        : '',

      lessonTime: row.lesson_time
        ? String(row.lesson_time).slice(0, 5)
        : '',

      durationMinutes: row.duration_minutes !== null
        ? Number(row.duration_minutes)
        : null,

      topic: row.topic ?? '',
      subtopic: row.subtopic ?? '',

      generalObjective: row.general_objective ?? '',
      specificObjectives: row.specific_objectives ?? '',

      priorKnowledge: row.prior_knowledge ?? '',
      resources: row.resources ?? '',

      introduction: row.introduction ?? '',
      teacherActivities: row.teacher_activities ?? '',
      learnerActivities: row.learner_activities ?? '',

      assessment: row.assessment ?? '',
      conclusion: row.conclusion ?? '',
      assignment: row.assignment ?? '',
      remarks: row.remarks ?? '',

      trainerName: row.trainer_name ?? '',
      trainerPhone: row.trainer_phone ?? '',
      courseLevel: row.course_level ?? row.program_level ?? '',

      week: row.week_number !== null &&
        row.week_number !== undefined
        ? String(row.week_number)
        : '',

      weekNumber: row.week_number !== null &&
        row.week_number !== undefined
        ? Number(row.week_number)
        : null,

      intake: row.intake ?? '',

      studentCount: row.student_count !== null
        ? Number(row.student_count)
        : null,

      competencyArea: row.competency_area ?? '',
      references: row.lesson_references ?? '',

      supervisorSignature: row.supervisor_signature ?? '',

      presentation: row.presentation ?? [],

      status: row.status,

      programName: row.program_name,
      programLevel: row.program_level ?? '',

      unitCode: row.unit_code ?? null,
      unitName: row.unit_name,

      schemeId: row.scheme_id
        ? Number(row.scheme_id)
        : null,

      schemeTitle: row.scheme_title ?? null,

      schemeWeekTopic: row.scheme_week_topic ?? null,
      schemeWeekSubtopic: row.scheme_week_subtopic ?? null,

      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    /* ---------------------------------------------------------------------- */
    /* SUCCESS RESPONSE                                                       */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      success: true,

      lecturerName: lecturer.name,

      programs,
      schemeEntries,

      lessonPlans,

      savedReferences,
    });

  } catch (error: unknown) {
    console.error(
      'GET /api/lecturer/lesson-plans ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error
          ? error.message
          : 'Unable to load lesson plans.',
      },
      { status: 500 },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* /api/lecturer/lesson-plans                                                 */
/*                                                                            */
/* Creates a lesson plan linked to a Scheme of Work entry.                    */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
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

    const programId = positiveId(body.programId);
    const unitId = positiveId(body.unitId);
    const schemeEntryId = positiveId(body.schemeEntryId);
    const topicId = positiveId(body.topicId);

    /* ---------------------------------------------------------------------- */
    /* LESSON DETAILS                                                         */
    /* ---------------------------------------------------------------------- */

    const lessonDate = text(body.lessonDate);
    const lessonTime = text(body.lessonTime);

    const durationRaw = body.durationMinutes;

    const durationMinutes =
      durationRaw === null ||
      durationRaw === undefined ||
      String(durationRaw).trim() === ''
        ? null
        : Number(durationRaw);

    let topic = text(body.topic);
    let subtopic = text(body.subtopic);

    const generalObjective = text(body.generalObjective);
    const specificObjectives = text(body.specificObjectives);

    const priorKnowledge = text(body.priorKnowledge);
    const resources = text(body.resources);

    const introduction = text(body.introduction);
    const teacherActivities = text(body.teacherActivities);
    const learnerActivities = text(body.learnerActivities);

    const assessment = text(body.assessment);
    const conclusion = text(body.conclusion);
    const assignment = text(body.assignment);
    const remarks = text(body.remarks);

    /* ---------------------------------------------------------------------- */
    /* ADDITIONAL TEMPLATE DETAILS                                            */
    /* ---------------------------------------------------------------------- */

    const trainerPhone = text(body.trainerPhone);
    const intake = text(body.intake);

    const studentCount = optionalInteger(body.studentCount);

    const competencyArea = text(body.competencyArea);
    const lessonReferences = text(body.references);

    const supervisorSignature = text(
      body.supervisorSignature,
    );

    const presentation = text(body.presentation);

    const status = text(body.status) === 'completed'
      ? 'completed'
      : 'draft';

    /* ---------------------------------------------------------------------- */
    /* BASIC VALIDATION                                                       */
    /* ---------------------------------------------------------------------- */

    if (!programId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Course name is required.',
        },
        { status: 400 },
      );
    }

    if (!unitId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Course unit is required.',
        },
        { status: 400 },
      );
    }

    if (!schemeEntryId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please select a Scheme of Work week before creating the lesson plan.',
        },
        { status: 400 },
      );
    }

    if (
      durationMinutes !== null &&
      (
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Time estimate must be a positive whole number.',
        },
        { status: 400 },
      );
    }

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

    if (
      body.studentCount !== null &&
      body.studentCount !== undefined &&
      String(body.studentCount).trim() !== '' &&
      (
        studentCount === null ||
        studentCount < 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Number of students must be a valid non-negative whole number.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VERIFY PROGRAMME AND UNIT ACCESS                                       */
    /* ---------------------------------------------------------------------- */

    const assignmentResult = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.level

        FROM lms_lecturer_programs lp

        INNER JOIN lms_programs p
          ON p.id = lp.program_id

        INNER JOIN lms_units u
          ON u.program_id = lp.program_id
         AND u.id = $3

        WHERE lp.lecturer_id = $1
          AND lp.program_id = $2

        LIMIT 1
      `,
      [
        lecturer.id,
        programId,
        unitId,
      ],
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not assigned to the selected course and unit.',
        },
        { status: 403 },
      );
    }

    const selectedProgram = assignmentResult.rows[0];

    const courseLevel = text(selectedProgram.level);

    /* ---------------------------------------------------------------------- */
    /* VERIFY AND RETRIEVE SCHEME OF WORK ENTRY                               */
    /* ---------------------------------------------------------------------- */

    const schemeEntryResult = await pool.query(
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

    if (schemeEntryResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'The selected Scheme of Work week does not belong to this course, unit or lecturer.',
        },
        { status: 403 },
      );
    }

    const selectedSchemeEntry = schemeEntryResult.rows[0];

    topic = topic || text(selectedSchemeEntry.topic);
    subtopic = subtopic || text(selectedSchemeEntry.subtopic);

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          message: 'The selected Scheme of Work entry has no topic. Please update the scheme first.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VERIFY OPTIONAL TOPIC                                                  */
    /* ---------------------------------------------------------------------- */

    if (topicId) {
      const topicResult = await pool.query(
        `
          SELECT t.id

          FROM lms_topics t

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_lecturer_units lp
            ON lp.unit_id = u.id
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

      if (topicResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'The selected topic does not belong to the selected unit.',
          },
          { status: 403 },
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* PREPARE PRESENTATION JSON                                              */
    /* ---------------------------------------------------------------------- */

    const presentationData = presentation
      ? [{ content: presentation }]
      : [];

    /* ---------------------------------------------------------------------- */
    /* CREATE LESSON PLAN                                                     */
    /* ---------------------------------------------------------------------- */

    const result = await pool.query(
      `
        INSERT INTO lms_lesson_plans (
          program_id,
          unit_id,
          lecturer_id,

          scheme_entry_id,
          topic_id,

          lesson_date,
          lesson_time,
          duration_minutes,

          topic,
          subtopic,

          general_objective,
          specific_objectives,

          prior_knowledge,
          resources,

          introduction,
          teacher_activities,
          learner_activities,

          assessment,
          conclusion,
          assignment,
          remarks,

          trainer_name,
          trainer_phone,
          course_level,

          intake,
          student_count,
          competency_area,

          lesson_references,
          supervisor_signature,
          presentation,

          status
        )

        VALUES (
          $1, $2, $3,
          $4, $5,
          NULLIF($6, '')::DATE,
          NULLIF($7, '')::TIME,
          $8,
          $9, NULLIF($10, ''),
          NULLIF($11, ''),
          NULLIF($12, ''),
          NULLIF($13, ''),
          NULLIF($14, ''),
          NULLIF($15, ''),
          NULLIF($16, ''),
          NULLIF($17, ''),
          NULLIF($18, ''),
          NULLIF($19, ''),
          NULLIF($20, ''),
          NULLIF($21, ''),
          NULLIF($22, ''),
          NULLIF($23, ''),
          NULLIF($24, ''),
          NULLIF($25, ''),
          $26,
          NULLIF($27, ''),
          NULLIF($28, ''),
          NULLIF($29, ''),
          $30::jsonb,
          $31
        )

        RETURNING id
      `,
      [
        programId,
        unitId,
        lecturer.id,

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
        teacherActivities || presentation,
        learnerActivities,

        assessment,
        conclusion,
        assignment,
        remarks,

        lecturer.name,
        trainerPhone,
        courseLevel,

        intake,
        studentCount,
        competencyArea,

        lessonReferences,
        supervisorSignature,
        JSON.stringify(presentationData),

        status,
      ],
    );

    const lessonPlanId = Number(result.rows[0].id);

    /* ---------------------------------------------------------------------- */
    /* SUCCESS RESPONSE                                                       */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,
        message: 'Lesson plan created successfully.',

        lessonPlan: {
          id: lessonPlanId,

          programId,
          programName: selectedProgram.name,
          courseLevel,

          unitId,

          lecturerId: lecturer.id,
          trainerName: lecturer.name,
          trainerPhone,

          schemeEntryId,
          schemeId: Number(selectedSchemeEntry.scheme_id),
          schemeTitle: selectedSchemeEntry.scheme_title,

          week: String(selectedSchemeEntry.week_number),
          weekNumber: Number(selectedSchemeEntry.week_number),

          topic,
          subtopic,

          topicId,

          lessonDate,
          lessonTime,
          durationMinutes,

          generalObjective,
          specificObjectives,

          priorKnowledge,
          resources,

          introduction,
          teacherActivities: teacherActivities || presentation,
          learnerActivities,

          assessment,
          conclusion,
          assignment,
          remarks,

          intake,
          studentCount,
          competencyArea,

          references: lessonReferences,
          supervisorSignature,

          presentation: presentationData,

          status,
        },
      },
      { status: 201 },
    );

  } catch (error: unknown) {
    console.error(
      'POST /api/lecturer/lesson-plans ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error
          ? error.message
          : 'Unable to create lesson plan.',
      },
      { status: 500 },
    );
  }
}
