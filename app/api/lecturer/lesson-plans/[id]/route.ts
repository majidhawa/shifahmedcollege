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

function parseId(
  value: string,
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

function positiveId(
  value: unknown,
): number | null {
  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}

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

        se.week_number,
        se.topic AS scheme_week_topic,

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

      LEFT JOIN lms_topics t
        ON t.id = lp.topic_id

      INNER JOIN lms_lecturer_programs lpr
        ON lpr.program_id = lp.program_id
       AND lpr.lecturer_id = $2

      WHERE lp.id = $1
        AND lp.lecturer_id = $2

      LIMIT 1
    `,
    [
      lessonPlanId,
      lecturerId,
    ],
  );

  return result.rows[0] ?? null;
}

/* =========================================================
   GET
   /api/lecturer/lesson-plans/[id]
========================================================= */

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

    const lessonPlanId =
      parseId(id);

    if (!lessonPlanId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid lesson plan ID.',
        },
        { status: 400 },
      );
    }

    const row =
      await getOwnedLessonPlan(
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

      lessonPlan: {
        id: Number(row.id),

        programId:
          Number(row.program_id),

        unitId:
          Number(row.unit_id),

        lecturerId:
          Number(row.lecturer_id),

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
          row.unit_code ?? null,

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

        academicYear:
          row.academic_year ??
          null,

        term:
          row.term ?? null,

        topicTitle:
          row.topic_title ??
          null,

        createdAt:
          row.created_at,

        updatedAt:
          row.updated_at,
      },
    });
  } catch (error: unknown) {
    console.error(
      'GET /api/lecturer/lesson-plans/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load lesson plan.',
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   PUT
   /api/lecturer/lesson-plans/[id]
========================================================= */

export async function PUT(
  request: NextRequest,
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

    const lessonPlanId =
      parseId(id);

    if (!lessonPlanId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid lesson plan ID.',
        },
        { status: 400 },
      );
    }

    const existing =
      await getOwnedLessonPlan(
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

    const body =
      (await request.json()) as LessonPlanBody;

    const programId =
      positiveId(
        body.programId ??
          existing.program_id,
      );

    const unitId =
      positiveId(
        body.unitId ??
          existing.unit_id,
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
      body.durationMinutes ??
      existing.duration_minutes;

    const durationMinutes =
      durationRaw === null ||
      durationRaw === undefined ||
      String(
        durationRaw,
      ).trim() === ''
        ? null
        : Number(durationRaw);

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
            'Lesson duration must be a positive whole number.',
        },
        { status: 400 },
      );
    }

    if (
      !(await verifyUnitAccess(
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

    if (schemeEntryId) {
      const schemeAccess =
        await pool.query(
          `
            SELECT 1
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
        schemeAccess.rows.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The selected scheme week is not available to you.',
          },
          { status: 403 },
        );
      }
    }

    if (topicId) {
      const topicAccess =
        await pool.query(
          `
            SELECT 1
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

      if (
        topicAccess.rows.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The selected topic is not available to you.',
          },
          { status: 403 },
        );
      }
    }

    const result =
      await pool.query(
        `
          UPDATE lms_lesson_plans

          SET
            program_id = $1,
            unit_id = $2,

            scheme_entry_id = $3,
            topic_id = $4,

            lesson_date =
              NULLIF($5, '')::DATE,

            duration_minutes = $6,

            topic = $7,
            subtopic =
              NULLIF($8, ''),

            general_objective =
              NULLIF($9, ''),

            specific_objectives =
              NULLIF($10, ''),

            prior_knowledge =
              NULLIF($11, ''),

            resources =
              NULLIF($12, ''),

            introduction =
              NULLIF($13, ''),

            teacher_activities =
              NULLIF($14, ''),

            learner_activities =
              NULLIF($15, ''),

            assessment =
              NULLIF($16, ''),

            conclusion =
              NULLIF($17, ''),

            assignment =
              NULLIF($18, ''),

            remarks =
              NULLIF($19, ''),

            status = $20,

            updated_at = NOW()

          WHERE id = $21
            AND lecturer_id = $22

          RETURNING id
        `,
        [
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

          lessonPlanId,
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
            'Lesson plan could not be updated.',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Lesson plan updated successfully.',
    });
  } catch (error: unknown) {
    console.error(
      'PUT /api/lecturer/lesson-plans/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to update lesson plan.',
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   DELETE
   /api/lecturer/lesson-plans/[id]
========================================================= */

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

    const lessonPlanId =
      parseId(id);

    if (!lessonPlanId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid lesson plan ID.',
        },
        { status: 400 },
      );
    }

    const result =
      await pool.query(
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

    if (
      result.rows.length === 0
    ) {
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
      message:
        'Lesson plan deleted successfully.',
    });
  } catch (error: unknown) {
    console.error(
      'DELETE /api/lecturer/lesson-plans/[id] ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to delete lesson plan.',
      },
      { status: 500 },
    );
  }
}