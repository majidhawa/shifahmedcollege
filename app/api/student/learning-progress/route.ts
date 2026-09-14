import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/db";
import { getStudentSession } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type ProgressStatus = "in_progress" | "completed";

type ProgressRow = {
  id: number | string;
  enrollment_id: number | string;
  lesson_id: number | string;
  status: string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  last_accessed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type LessonProgressRow = {
  unit_id: number | string;
  unit_code: string | null;
  unit_name: string | null;

  topic_id: number | string | null;
  topic_title: string | null;
  topic_order_number: number | string | null;

  lesson_id: number | string | null;
  lesson_title: string | null;
  lesson_description: string | null;
  lesson_order: number | string | null;

  progress_status: string | null;

  started_at: Date | string | null;
  completed_at: Date | string | null;
  last_accessed_at: Date | string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function serializeDate(
  value: Date | string | null | undefined
): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

/* =========================================================
   GET /api/student/learning-progress
========================================================= */

export async function GET(request: NextRequest) {
  try {
    /* =======================================================
       AUTHENTICATION
    ======================================================= */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const applicationId = Number(session.applicationId);

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid student session.",
        },
        { status: 401 }
      );
    }

    /* =======================================================
       OPTIONAL PROGRAM FILTER

       Example:
       /api/student/learning-progress?program_id=4
    ======================================================= */

    const rawProgramId =
      request.nextUrl.searchParams.get("program_id");

    let programId: number | null = null;

    if (rawProgramId) {
      const parsedProgramId = Number(rawProgramId);

      if (
        !Number.isInteger(parsedProgramId) ||
        parsedProgramId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid program_id.",
          },
          { status: 400 }
        );
      }

      programId = parsedProgramId;
    }

    /* =======================================================
       FIND THE STUDENT'S ACTIVE ENROLLMENT

       IMPORTANT:
       The student is considered enrolled through
       lms_enrollments.

       We do NOT require lms_unit_enrollments here.
    ======================================================= */

    const enrollmentResult = await pool.query(
      `
        SELECT
          e.id AS enrollment_id,
          e.application_id,
          e.program_id,

          e.student_number,
          e.year_of_study,
          e.enrollment_status,
          e.enrolled_at,

          p.id AS program_id,
          p.name AS program_name,
          p.code AS program_code,
          p.description AS program_description,
          p.duration AS program_duration,
          p.level AS program_level

        FROM lms_enrollments e

        INNER JOIN lms_programs p
          ON p.id = e.program_id

        WHERE e.application_id = $1

          AND e.enrollment_status NOT IN (
            'cancelled',
            'dropped'
          )

          AND p.status = 'active'

          AND (
            $2::integer IS NULL
            OR e.program_id = $2
          )

        ORDER BY
          e.enrolled_at DESC NULLS LAST,
          e.id DESC

        LIMIT 1
      `,
      [applicationId, programId]
    );

    /* =======================================================
       NO ACTIVE ENROLLMENT
    ======================================================= */

    if (enrollmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: true,

          hasEnrollment: false,

          enrollment: null,

          summary: {
            totalLessons: 0,
            completedLessons: 0,
            inProgressLessons: 0,
            remainingLessons: 0,
            percentage: 0,
          },

          units: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const enrollment =
      enrollmentResult.rows[0];

    const enrollmentId =
      Number(enrollment.enrollment_id);

    const selectedProgramId =
      Number(enrollment.program_id);

    /* =======================================================
       GET PROGRAM UNITS → TOPICS → LESSONS

       IMPORTANT CHANGE:

       We intentionally DO NOT join
       lms_unit_enrollments.

       The student's lms_enrollments record already establishes
       that the student is enrolled in this program.

       Therefore all active units belonging to that program
       are tracked.

       LEFT JOIN is used for topics and lessons so that a unit
       with no lessons is still displayed.

       Example with the current German data:

       Unit 3
       └── Topic 3
           └── Lesson 3

       Unit 4
       └── No lessons yet

       Result:
       2 units
       1 lesson
    ======================================================= */

    const lessonsResult = await pool.query(
      `
        SELECT
          u.id AS unit_id,
          u.code AS unit_code,
          u.name AS unit_name,

          t.id AS topic_id,
          t.title AS topic_title,
          t.order_number AS topic_order_number,

          l.id AS lesson_id,
          l.title AS lesson_title,
          l.description AS lesson_description,
          l.order_number AS lesson_order,

          COALESCE(
            lp.status,
            'not_started'
          ) AS progress_status,

          lp.started_at,
          lp.completed_at,
          lp.last_accessed_at

        FROM lms_units u

        LEFT JOIN lms_topics t
          ON t.unit_id = u.id
          AND t.status = 'active'

        LEFT JOIN lms_lessons l
          ON l.topic_id = t.id
          AND l.status = 'active'

        LEFT JOIN lms_lesson_progress lp
          ON lp.enrollment_id = $1
          AND lp.lesson_id = l.id

        WHERE u.program_id = $2

          AND u.status = 'active'

        ORDER BY
          u.year_of_study ASC NULLS LAST,
          u.term_number ASC NULLS LAST,
          u.id ASC,

          t.order_number ASC NULLS LAST,
          t.id ASC,

          l.order_number ASC NULLS LAST,
          l.id ASC
      `,
      [
        enrollmentId,
        selectedProgramId,
      ]
    );

    const rows =
      lessonsResult.rows as LessonProgressRow[];

    /* =======================================================
       STRUCTURE TYPES
    ======================================================= */

    type LessonItem = {
      id: number;
      title: string;
      description: string | null;
      orderNumber: number;
      status: string;
      startedAt: string | null;
      completedAt: string | null;
      lastAccessedAt: string | null;
    };

    type TopicItem = {
      id: number;
      title: string;
      lessons: LessonItem[];
    };

    type UnitItem = {
      id: number;
      code: string | null;
      name: string;
      totalLessons: number;
      completedLessons: number;
      percentage: number;
      topics: TopicItem[];
    };

    /* =======================================================
       BUILD UNIT → TOPIC → LESSON STRUCTURE

       Units are created even when they have no topics or
       lessons.
    ======================================================= */

    const unitsMap =
      new Map<number, UnitItem>();

    for (const row of rows) {
      const unitId =
        Number(row.unit_id);

      /* =====================================================
         CREATE UNIT
      ===================================================== */

      if (!unitsMap.has(unitId)) {
        unitsMap.set(
          unitId,
          {
            id: unitId,

            code:
              typeof row.unit_code === "string"
                ? row.unit_code
                : null,

            name:
              String(
                row.unit_name || ""
              ),

            totalLessons: 0,

            completedLessons: 0,

            percentage: 0,

            topics: [],
          }
        );
      }

      const unit =
        unitsMap.get(unitId);

      if (!unit) {
        continue;
      }

      /* =====================================================
         NO TOPIC / LESSON

         This is important for units such as:

         Greetings & Introductions

         which currently exists but does not yet contain
         a topic or lesson.
      ===================================================== */

      if (
        row.topic_id === null ||
        row.lesson_id === null
      ) {
        continue;
      }

      const topicId =
        Number(row.topic_id);

      const lessonId =
        Number(row.lesson_id);

      /* =====================================================
         FIND OR CREATE TOPIC
      ===================================================== */

      let topic =
        unit.topics.find(
          (item) =>
            item.id === topicId
        );

      if (!topic) {
        topic = {
          id: topicId,

          title:
            String(
              row.topic_title || ""
            ),

          lessons: [],
        };

        unit.topics.push(topic);
      }

      /* =====================================================
         LESSON STATUS
      ===================================================== */

      const progressStatus =
        String(
          row.progress_status ||
            "not_started"
        );

      /* =====================================================
         ADD LESSON
      ===================================================== */

      topic.lessons.push({
        id: lessonId,

        title:
          String(
            row.lesson_title || ""
          ),

        description:
          row.lesson_description !== null
            ? String(
                row.lesson_description
              )
            : null,

        orderNumber:
          Number(
            row.lesson_order ?? 1
          ),

        status:
          progressStatus,

        startedAt:
          serializeDate(
            row.started_at
          ),

        completedAt:
          serializeDate(
            row.completed_at
          ),

        lastAccessedAt:
          serializeDate(
            row.last_accessed_at
          ),
      });

      /* =====================================================
         UPDATE UNIT COUNTERS
      ===================================================== */

      unit.totalLessons += 1;

      if (
        progressStatus ===
        "completed"
      ) {
        unit.completedLessons += 1;
      }
    }

    /* =======================================================
       CALCULATE UNIT PERCENTAGES
    ======================================================= */

    const units =
      Array.from(
        unitsMap.values()
      ).map(
        (unit) => ({
          ...unit,

          percentage:
            unit.totalLessons > 0
              ? Math.round(
                  (unit.completedLessons /
                    unit.totalLessons) *
                    100
                )
              : 0,
        })
      );

    /* =======================================================
       OVERALL LESSON SUMMARY

       Count only actual lessons.

       Units without lessons are still displayed but do not
       artificially increase totalLessons.
    ======================================================= */

    let totalLessons = 0;
    let completedLessons = 0;
    let inProgressLessons = 0;

    for (const unit of units) {
      totalLessons +=
        unit.totalLessons;

      completedLessons +=
        unit.completedLessons;

      for (const topic of unit.topics) {
        for (const lesson of topic.lessons) {
          if (
            lesson.status ===
            "in_progress"
          ) {
            inProgressLessons += 1;
          }
        }
      }
    }

    const remainingLessons =
      Math.max(
        totalLessons -
          completedLessons,
        0
      );

    const percentage =
      totalLessons > 0
        ? Math.round(
            (completedLessons /
              totalLessons) *
              100
          )
        : 0;

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        hasEnrollment: true,

        enrollment: {
          enrollmentId,

          applicationId:
            Number(
              enrollment.application_id
            ),

          programId:
            selectedProgramId,

          studentNumber:
            enrollment.student_number ||
            null,

          yearOfStudy:
            enrollment.year_of_study !==
            null
              ? Number(
                  enrollment.year_of_study
                )
              : null,

          enrollmentStatus:
            enrollment.enrollment_status,

          enrolledAt:
            serializeDate(
              enrollment.enrolled_at
            ),

          program: {
            id:
              selectedProgramId,

            name:
              String(
                enrollment.program_name ||
                  ""
              ),

            code:
              enrollment.program_code ||
              null,

            description:
              enrollment.program_description ||
              null,

            duration:
              enrollment.program_duration ||
              null,

            level:
              enrollment.program_level ||
              null,
          },
        },

        summary: {
          totalLessons,

          completedLessons,

          inProgressLessons,

          remainingLessons,

          percentage,
        },

        units,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "STUDENT LEARNING PROGRESS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load learning progress.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST /api/student/learning-progress

   Saves progress for one lesson.
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /* =======================================================
       AUTHENTICATION
    ======================================================= */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const applicationId =
      Number(session.applicationId);

    if (
      !Number.isInteger(
        applicationId
      ) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid student session.",
        },
        { status: 401 }
      );
    }

    /* =======================================================
       PARSE REQUEST BODY
    ======================================================= */

    let body: {
      lessonId?: unknown;
      status?: unknown;
    };

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const lessonId =
      Number(body.lessonId);

    const status =
      String(
        body.status || ""
      ) as ProgressStatus;

    /* =======================================================
       VALIDATE LESSON ID
    ======================================================= */

    if (
      !Number.isInteger(
        lessonId
      ) ||
      lessonId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid lessonId is required.",
        },
        { status: 400 }
      );
    }

    /* =======================================================
       VALIDATE STATUS
    ======================================================= */

    if (
      status !== "in_progress" &&
      status !== "completed"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status must be either in_progress or completed.",
        },
        { status: 400 }
      );
    }

    /* =======================================================
       FIND STUDENT'S ACTIVE ENROLLMENT

       We intentionally do NOT use lms_unit_enrollments.

       The student's authorization comes from:

       application
          ↓
       lms_enrollments
          ↓
       lms_programs
          ↓
       lms_units
          ↓
       lms_topics
          ↓
       lms_lessons
    ======================================================= */

    const enrollmentResult =
      await pool.query(
        `
          SELECT
            e.id AS enrollment_id,
            e.program_id,

            l.id AS lesson_id

          FROM lms_enrollments e

          INNER JOIN lms_programs p
            ON p.id = e.program_id

          INNER JOIN lms_units u
            ON u.program_id = e.program_id

          INNER JOIN lms_topics t
            ON t.unit_id = u.id

          INNER JOIN lms_lessons l
            ON l.topic_id = t.id

          WHERE e.application_id = $1

            AND e.enrollment_status NOT IN (
              'cancelled',
              'dropped'
            )

            AND p.status = 'active'

            AND u.status = 'active'

            AND t.status = 'active'

            AND l.status = 'active'

            AND l.id = $2

          ORDER BY
            e.enrolled_at DESC NULLS LAST,
            e.id DESC

          LIMIT 1
        `,
        [
          applicationId,
          lessonId,
        ]
      );

    /* =======================================================
       UNAUTHORIZED LESSON
    ======================================================= */

    if (
      enrollmentResult.rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authorized to update progress for this lesson.",
        },
        { status: 403 }
      );
    }

    const enrollmentId =
      Number(
        enrollmentResult.rows[0]
          .enrollment_id
      );

    /* =======================================================
       SAVE PROGRESS

       INSERT:
       Creates the first progress record.

       ON CONFLICT:
       Updates an existing record.

       completed:
       Sets completed_at.

       in_progress:
       Clears completed_at if the lesson is moved back
       to in-progress.
    ======================================================= */

    const progressResult =
      await pool.query(
        `
          INSERT INTO lms_lesson_progress (
            enrollment_id,
            lesson_id,
            status,
            started_at,
            completed_at,
            last_accessed_at
          )

          VALUES (
            $1,
            $2,
            $3,

            CURRENT_TIMESTAMP,

            CASE
              WHEN $3 = 'completed'
              THEN CURRENT_TIMESTAMP
              ELSE NULL
            END,

            CURRENT_TIMESTAMP
          )

          ON CONFLICT (
            enrollment_id,
            lesson_id
          )

          DO UPDATE SET

            status =
              EXCLUDED.status,

            started_at =
              COALESCE(
                lms_lesson_progress.started_at,
                EXCLUDED.started_at
              ),

            completed_at =
              CASE
                WHEN EXCLUDED.status =
                  'completed'

                THEN COALESCE(
                  lms_lesson_progress.completed_at,
                  CURRENT_TIMESTAMP
                )

                ELSE NULL
              END,

            last_accessed_at =
              CURRENT_TIMESTAMP,

            updated_at =
              CURRENT_TIMESTAMP

          RETURNING
            id,
            enrollment_id,
            lesson_id,
            status,
            started_at,
            completed_at,
            last_accessed_at,
            created_at,
            updated_at
        `,
        [
          enrollmentId,
          lessonId,
          status,
        ]
      );

    const row =
      progressResult.rows[0] as ProgressRow;

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        message:
          status === "completed"
            ? "Lesson marked as completed."
            : "Lesson progress saved.",

        progress: {
          id:
            Number(row.id),

          enrollmentId:
            Number(
              row.enrollment_id
            ),

          lessonId:
            Number(
              row.lesson_id
            ),

          status:
            row.status,

          startedAt:
            serializeDate(
              row.started_at
            ),

          completedAt:
            serializeDate(
              row.completed_at
            ),

          lastAccessedAt:
            serializeDate(
              row.last_accessed_at
            ),

          createdAt:
            serializeDate(
              row.created_at
            ),

          updatedAt:
            serializeDate(
              row.updated_at
            ),
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "STUDENT LEARNING PROGRESS POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to save lesson progress.",
      },
      { status: 500 }
    );
  }
}