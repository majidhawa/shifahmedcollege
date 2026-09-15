import {
  NextRequest,
  NextResponse,
} from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LessonPlanBody = {
  programId?: unknown;
  unitId?: unknown;
  schemeEntryId?: unknown;
  topicId?: unknown;

  lessonDate?: unknown;
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

  status?: unknown;
};

function positiveId(
  value: unknown,
): number | null {
  const id = Number(value);

  return Number.isInteger(id) && id > 0
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

/* =========================================================
   GET
   /api/lecturer/lesson-plans
========================================================= */

export async function GET(
  _request: NextRequest,
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

    const result =
      await pool.query(
        `
          SELECT
            lp.id,

            lp.program_id,
            lp.unit_id,

            lp.lecturer_id,

            lp.scheme_entry_id,
            lp.topic_id,

            lp.lesson_date,
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

            lp.status,

            lp.created_at,
            lp.updated_at,

            p.name AS program_name,

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

          INNER JOIN lms_lecturer_programs lpr
            ON lpr.program_id = lp.program_id
           AND lpr.lecturer_id = $1

          LEFT JOIN lms_scheme_of_work_entries se
            ON se.id = lp.scheme_entry_id

          LEFT JOIN lms_schemes_of_work s
            ON s.id = se.scheme_id

          WHERE lp.lecturer_id = $1

          ORDER BY
            lp.lesson_date DESC NULLS LAST,
            lp.created_at DESC
        `,
        [lecturer.id],
      );

    const lessonPlans =
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

          lecturerId:
            Number(
              row.lecturer_id,
            ),

          schemeEntryId:
            row.scheme_entry_id
              ? Number(
                  row.scheme_entry_id,
                )
              : null,

          topicId:
            row.topic_id
              ? Number(
                  row.topic_id,
                )
              : null,

          lessonDate:
            row.lesson_date
              ? String(
                  row.lesson_date,
                ).slice(0, 10)
              : '',

          durationMinutes:
            row.duration_minutes
              ? Number(
                  row.duration_minutes,
                )
              : null,

          topic:
            row.topic,

          subtopic:
            row.subtopic ?? '',

          generalObjective:
            row.general_objective ??
            '',

          specificObjectives:
            row.specific_objectives ??
            '',

          priorKnowledge:
            row.prior_knowledge ??
            '',

          resources:
            row.resources ??
            '',

          introduction:
            row.introduction ??
            '',

          teacherActivities:
            row.teacher_activities ??
            '',

          learnerActivities:
            row.learner_activities ??
            '',

          assessment:
            row.assessment ??
            '',

          conclusion:
            row.conclusion ??
            '',

          assignment:
            row.assignment ??
            '',

          remarks:
            row.remarks ?? '',

          status:
            row.status,

          programName:
            row.program_name,

          unitCode:
            row.unit_code ??
            null,

          unitName:
            row.unit_name,

          schemeId:
            row.scheme_id
              ? Number(
                  row.scheme_id,
                )
              : null,

          schemeTitle:
            row.scheme_title ??
            null,

          weekNumber:
            row.week_number
              ? Number(
                  row.week_number,
                )
              : null,

          schemeWeekTopic:
            row.scheme_week_topic ??
            null,

          schemeWeekSubtopic:
            row.scheme_week_subtopic ??
            null,

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,
        }),
      );

    return NextResponse.json({
      success: true,
      lessonPlans,
    });
  } catch (error: unknown) {
    console.error(
      'GET /api/lecturer/lesson-plans ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load lesson plans.',
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST
   /api/lecturer/lesson-plans
========================================================= */

export async function POST(
  request: NextRequest,
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

    const body =
      (await request.json()) as LessonPlanBody;

    const programId =
      positiveId(
        body.programId,
      );

    const unitId =
      positiveId(
        body.unitId,
      );

    const schemeEntryId =
      positiveId(
        body.schemeEntryId,
      );

    const topicId =
      positiveId(
        body.topicId,
      );

    const lessonDate =
      text(body.lessonDate);

    const durationRaw =
      body.durationMinutes;

    const durationMinutes =
      durationRaw === null ||
      durationRaw === undefined ||
      String(
        durationRaw,
      ).trim() === ''
        ? null
        : Number(
            durationRaw,
          );

    const topic =
      text(body.topic);

    const subtopic =
      text(body.subtopic);

    const generalObjective =
      text(
        body.generalObjective,
      );

    const specificObjectives =
      text(
        body.specificObjectives,
      );

    const priorKnowledge =
      text(
        body.priorKnowledge,
      );

    const resources =
      text(body.resources);

    const introduction =
      text(body.introduction);

    const teacherActivities =
      text(
        body.teacherActivities,
      );

    const learnerActivities =
      text(
        body.learnerActivities,
      );

    const assessment =
      text(body.assessment);

    const conclusion =
      text(body.conclusion);

    const assignment =
      text(body.assignment);

    const remarks =
      text(body.remarks);

    const status =
      text(body.status) ===
      'completed'
        ? 'completed'
        : 'draft';

    /* -------------------------------------------------------
       BASIC VALIDATION
    ------------------------------------------------------- */

    if (!programId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Programme is required.',
        },
        { status: 400 },
      );
    }

    if (!unitId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unit is required.',
        },
        { status: 400 },
      );
    }

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lesson topic is required.',
        },
        { status: 400 },
      );
    }

    if (
      durationMinutes !==
        null &&
      (
        !Number.isInteger(
          durationMinutes,
        ) ||
        durationMinutes <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Duration must be a positive whole number.',
        },
        { status: 400 },
      );
    }

    /* -------------------------------------------------------
       VERIFY PROGRAMME ACCESS
    ------------------------------------------------------- */

    const assignmentResult =
      await pool.query(
        `
          SELECT 1
          FROM lms_lecturer_programs lp
          INNER JOIN lms_units u
            ON u.program_id =
              lp.program_id
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

    if (
      assignmentResult.rows.length ===
      0
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

    /* -------------------------------------------------------
       VERIFY SCHEME WEEK
    ------------------------------------------------------- */

    if (schemeEntryId) {
      const schemeEntryResult =
        await pool.query(
          `
            SELECT
              se.id,
              se.scheme_id,
              s.program_id,
              s.unit_id,
              s.lecturer_id
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

      if (
        schemeEntryResult.rows.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The selected scheme week does not belong to this programme, unit or lecturer.',
          },
          { status: 403 },
        );
      }
    }

    /* -------------------------------------------------------
       VERIFY TOPIC
    ------------------------------------------------------- */

    if (topicId) {
      const topicResult =
        await pool.query(
          `
            SELECT
              t.id
            FROM lms_topics t
            INNER JOIN lms_units u
              ON u.id = t.unit_id
            INNER JOIN lms_lecturer_programs lp
              ON lp.program_id =
                u.program_id
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

      if (
        topicResult.rows.length ===
        0
      ) {
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

    /* -------------------------------------------------------
       CREATE LESSON PLAN
    ------------------------------------------------------- */

    const result =
      await pool.query(
        `
          INSERT INTO lms_lesson_plans (
            program_id,
            unit_id,
            lecturer_id,

            scheme_entry_id,
            topic_id,

            lesson_date,
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

            status
          )

          VALUES (
            $1,
            $2,
            $3,

            $4,
            $5,

            NULLIF($6, '')::DATE,
            $7,

            $8,
            NULLIF($9, ''),

            NULLIF($10, ''),
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

            $21
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

          status,
        ],
      );

    const lessonPlanId =
      Number(
        result.rows[0].id,
      );

    return NextResponse.json(
      {
        success: true,
        message:
          'Lesson plan created successfully.',

        lessonPlan: {
          id: lessonPlanId,

          programId,
          unitId,

          schemeEntryId,
          topicId,

          lessonDate,
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
        message:
          error instanceof Error
            ? error.message
            : 'Unable to create lesson plan.',
      },
      { status: 500 },
    );
  }
}