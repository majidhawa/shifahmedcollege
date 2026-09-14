import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

/* =========================================================
   GET /api/student/units

   STUDENT LMS STRUCTURE

   applications
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
        ↓
   ┌───────────────────────┐
   │                       │
   ↓                       ↓
   lms_lesson_documents    lms_lesson_videos

   IMPORTANT:
   - The student must have an enrollment for the program.
   - If program_id is supplied, it must belong to the student.
   - If program_id is not supplied, the latest active enrollment
     is selected.
   - Units are curriculum belonging to the selected program.
   - Unit enrollment determines assignment status only.
   - Topics and lessons must be ACTIVE to be visible.
   - Documents and videos must be ACTIVE to be visible.
========================================================= */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   GET STUDENT UNITS
========================================================= */

export async function GET(request: Request) {
  try {
    /* =======================================================
       AUTHENTICATION
    ======================================================= */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Student session has expired.',
        },
        { status: 401 }
      );
    }

    const applicationId = Number(
      session.applicationId
    );

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid student session.',
        },
        { status: 401 }
      );
    }

    /* =======================================================
       PROGRAM FILTER
    ======================================================= */

    const url = new URL(request.url);

    const rawProgramId =
      url.searchParams.get('program_id');

    let requestedProgramId: number | null = null;

    if (rawProgramId) {
      const parsedProgramId =
        Number(rawProgramId);

      if (
        !Number.isInteger(parsedProgramId) ||
        parsedProgramId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid program ID.',
          },
          { status: 400 }
        );
      }

      requestedProgramId =
        parsedProgramId;
    }

    /* =======================================================
       FIND STUDENT ENROLLMENT
       
       IMPORTANT:
       If a program_id is supplied, we first try to find that
       exact program in the student's enrollments.

       If it does not exist, we safely fall back to the
       student's latest active enrollment.

       This prevents a student from accidentally accessing
       curriculum belonging to another student's program.
    ======================================================= */

    let enrollmentResult;

    if (requestedProgramId !== null) {
      enrollmentResult =
        await pool.query(
          `
            SELECT
              e.id AS enrollment_id,
              e.program_id,

              e.student_number,
              e.year_of_study,
              e.enrollment_status,
              e.enrolled_at,

              p.name AS program_name,
              p.code AS program_code,
              p.description AS program_description,
              p.duration,
              p.level,
              p.status AS program_status,

              (
                SELECT
                  u2.name
                FROM lms_lecturer_programs lp2

                INNER JOIN users u2
                  ON u2.id = lp2.lecturer_id

                WHERE lp2.program_id = p.id

                ORDER BY
                  lp2.lecturer_id ASC

                LIMIT 1
              ) AS lecturer_name

            FROM lms_enrollments e

            INNER JOIN lms_programs p
              ON p.id = e.program_id

            WHERE e.application_id = $1

              AND e.program_id = $2

              AND (
                e.enrollment_status IS NULL
                OR LOWER(
                  e.enrollment_status::text
                ) NOT IN (
                  'cancelled',
                  'dropped'
                )
              )

            ORDER BY
              e.enrolled_at DESC NULLS LAST,
              e.id DESC

            LIMIT 1
          `,
          [
            applicationId,
            requestedProgramId,
          ]
        );

      /* =====================================================
         REQUESTED PROGRAM NOT FOUND

         Fall back to the latest valid enrollment.
      ===================================================== */

      if (enrollmentResult.rows.length === 0) {
        enrollmentResult =
          await pool.query(
            `
              SELECT
                e.id AS enrollment_id,
                e.program_id,

                e.student_number,
                e.year_of_study,
                e.enrollment_status,
                e.enrolled_at,

                p.name AS program_name,
                p.code AS program_code,
                p.description AS program_description,
                p.duration,
                p.level,
                p.status AS program_status,

                (
                  SELECT
                    u2.name
                  FROM lms_lecturer_programs lp2

                  INNER JOIN users u2
                    ON u2.id = lp2.lecturer_id

                  WHERE lp2.program_id = p.id

                  ORDER BY
                    lp2.lecturer_id ASC

                  LIMIT 1
                ) AS lecturer_name

              FROM lms_enrollments e

              INNER JOIN lms_programs p
                ON p.id = e.program_id

              WHERE e.application_id = $1

                AND (
                  e.enrollment_status IS NULL
                  OR LOWER(
                    e.enrollment_status::text
                  ) NOT IN (
                    'cancelled',
                    'dropped'
                  )
                )

              ORDER BY
                e.enrolled_at DESC NULLS LAST,
                e.id DESC

              LIMIT 1
            `,
            [applicationId]
          );
      }
    } else {
      /* =====================================================
         NO PROGRAM REQUESTED

         Use the student's latest active enrollment.
      ===================================================== */

      enrollmentResult =
        await pool.query(
          `
            SELECT
              e.id AS enrollment_id,
              e.program_id,

              e.student_number,
              e.year_of_study,
              e.enrollment_status,
              e.enrolled_at,

              p.name AS program_name,
              p.code AS program_code,
              p.description AS program_description,
              p.duration,
              p.level,
              p.status AS program_status,

              (
                SELECT
                  u2.name
                FROM lms_lecturer_programs lp2

                INNER JOIN users u2
                  ON u2.id = lp2.lecturer_id

                WHERE lp2.program_id = p.id

                ORDER BY
                  lp2.lecturer_id ASC

                LIMIT 1
              ) AS lecturer_name

            FROM lms_enrollments e

            INNER JOIN lms_programs p
              ON p.id = e.program_id

            WHERE e.application_id = $1

              AND (
                e.enrollment_status IS NULL
                OR LOWER(
                  e.enrollment_status::text
                ) NOT IN (
                  'cancelled',
                  'dropped'
                )
              )

            ORDER BY
              e.enrolled_at DESC NULLS LAST,
              e.id DESC

            LIMIT 1
          `,
          [applicationId]
        );
    }

    /* =======================================================
       NO ENROLLMENT
    ======================================================= */

    if (enrollmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: true,

          student: {
            applicationId,

            name: 'Student',

            applicationNumber:
              session.applicationNumber || null,

            admissionNumber:
              null,
          },

          program: null,

          units: [],

          totals: {
            units: 0,
            assignedUnits: 0,
            topics: 0,
            lessons: 0,
            materials: 0,
            videos: 0,
          },
        },
        { status: 200 }
      );
    }

    const enrollment =
      enrollmentResult.rows[0];

    const enrollmentId =
      Number(
        enrollment.enrollment_id
      );

    const selectedProgramId =
      Number(
        enrollment.program_id
      );

    /* =======================================================
       DEBUG LOG
    ======================================================= */

    console.log(
      'STUDENT UNITS - SELECTED PROGRAM:',
      {
        applicationId,

        requestedProgramId,

        enrollmentId,

        programId:
          selectedProgramId,

        programName:
          enrollment.program_name,

        lecturerName:
          enrollment.lecturer_name,
      }
    );

    /* =======================================================
       STUDENT INFORMATION
    ======================================================= */

    let studentName =
      'Student';

    let applicationNumber =
      session.applicationNumber ||
      null;

    let admissionNumber:
      string | null =
      null;

    try {
      const studentResult =
        await pool.query(
          `
            SELECT
              a.id AS application_id,

              a.application_number,

              CONCAT_WS(
                ' ',
                a.first_name,
                a.middle_name,
                a.surname
              ) AS student_name,

              COALESCE(
                ad.admission_number,
                a.admission_number
              ) AS admission_number

            FROM applications a

            LEFT JOIN admissions ad
              ON ad.application_id = a.id

            WHERE a.id = $1

            LIMIT 1
          `,
          [applicationId]
        );

      if (
        studentResult.rows.length > 0
      ) {
        const studentRow =
          studentResult.rows[0];

        studentName =
          studentRow.student_name?.trim() ||
          'Student';

        applicationNumber =
          studentRow.application_number ||
          applicationNumber ||
          null;

        admissionNumber =
          studentRow.admission_number ||
          null;
      }
    } catch (error) {
      console.error(
        'STUDENT UNITS - STUDENT INFORMATION ERROR:',
        error
      );
    }

    /* =======================================================
       GET ALL UNITS
       
       IMPORTANT:
       lms_unit_enrollments does NOT determine whether the
       curriculum unit exists.

       It only determines whether the unit has been assigned
       to this student's enrollment.

       LATERAL ensures that if duplicate unit-enrollment
       records exist, only the newest one is selected.
    ======================================================= */

    const unitsResult =
      await pool.query(
        `
          SELECT
            u.id AS unit_id,
            u.program_id,

            u.name AS unit_name,
            u.description AS unit_description,

            ue.id AS unit_enrollment_id,
            ue.status AS unit_enrollment_status,

            COUNT(DISTINCT t.id)::int
              AS topic_count,

            COUNT(DISTINCT l.id)::int
              AS lesson_count

          FROM lms_units u

          LEFT JOIN LATERAL (
            SELECT
              ue1.id,
              ue1.status

            FROM lms_unit_enrollments ue1

            WHERE ue1.unit_id = u.id
              AND ue1.enrollment_id = $1

            ORDER BY
              ue1.id DESC

            LIMIT 1
          ) ue ON TRUE

          LEFT JOIN lms_topics t
            ON t.unit_id = u.id

           AND LOWER(
             COALESCE(
               t.status::text,
               'active'
             )
           ) = 'active'

          LEFT JOIN lms_lessons l
            ON l.topic_id = t.id

           AND LOWER(
             COALESCE(
               l.status::text,
               'active'
             )
           ) = 'active'

          WHERE u.program_id = $2

          GROUP BY
            u.id,
            u.program_id,
            u.name,
            u.description,
            ue.id,
            ue.status

          ORDER BY
            u.id ASC
        `,
        [
          enrollmentId,
          selectedProgramId,
        ]
      );

    /* =======================================================
       GET ACTIVE TOPICS
       
       Only active topics are returned.
    ======================================================= */

    const topicsResult =
      await pool.query(
        `
          SELECT
            t.id AS topic_id,
            t.unit_id,

            t.title AS topic_title,
            t.description AS topic_description,

            t.order_number,
            t.status,

            COUNT(
              DISTINCT l.id
            )::int AS lesson_count

          FROM lms_topics t

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          LEFT JOIN lms_lessons l
            ON l.topic_id = t.id

           AND LOWER(
             COALESCE(
               l.status::text,
               'active'
             )
           ) = 'active'

          WHERE u.program_id = $1

            AND LOWER(
              COALESCE(
                t.status::text,
                'active'
              )
            ) = 'active'

          GROUP BY
            t.id,
            t.unit_id,
            t.title,
            t.description,
            t.order_number,
            t.status

          ORDER BY
            t.unit_id ASC,
            t.order_number ASC NULLS LAST,
            t.id ASC
        `,
        [
          selectedProgramId,
        ]
      );

    /* =======================================================
       GET ACTIVE LESSONS
       
       Only active lessons are returned.
    ======================================================= */

    const lessonsResult =
      await pool.query(
        `
          SELECT
            l.id AS lesson_id,
            l.topic_id,

            l.title AS lesson_title,
            l.description AS lesson_description,
            l.content AS lesson_content,

            l.order_number,
            l.status

          FROM lms_lessons l

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          WHERE u.program_id = $1

            AND LOWER(
              COALESCE(
                t.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                l.status::text,
                'active'
              )
            ) = 'active'

          ORDER BY
            u.id ASC,
            t.order_number ASC NULLS LAST,
            t.id ASC,
            l.order_number ASC NULLS LAST,
            l.id ASC
        `,
        [
          selectedProgramId,
        ]
      );

    /* =======================================================
       GET ACTIVE LESSON DOCUMENTS / MATERIALS
       
       Only ACTIVE documents are visible to students.

       This means:
       active   → visible
       NULL     → treated as active
       deleted  → hidden
       inactive → hidden
       draft    → hidden
    ======================================================= */

    const documentsResult =
      await pool.query(
        `
          SELECT
            d.id AS document_id,
            d.lesson_id,

            d.title AS document_title,
            d.description AS document_description,

            d.file_name,
            d.file_url,
            d.file_size,
            d.mime_type,

            d.status,

            d.created_at,
            d.updated_at

          FROM lms_lesson_documents d

          INNER JOIN lms_lessons l
            ON l.id = d.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          WHERE u.program_id = $1

            AND LOWER(
              COALESCE(
                t.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                l.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                d.status::text,
                'active'
              )
            ) = 'active'

          ORDER BY
            l.id ASC,
            d.created_at ASC,
            d.id ASC
        `,
        [
          selectedProgramId,
        ]
      );

    /* =======================================================
       GET ACTIVE LESSON VIDEOS
       
       Only ACTIVE videos are visible to students.

       This means:
       active   → visible
       NULL     → treated as active
       deleted  → hidden
       inactive → hidden
       draft    → hidden
    ======================================================= */

    const videosResult =
      await pool.query(
        `
          SELECT
            v.id AS video_id,
            v.lesson_id,

            v.title AS video_title,
            v.description AS video_description,

            v.video_url,
            v.thumbnail_url,
            v.duration_seconds,

            v.order_number,
            v.status,

            v.video_file_name,
            v.video_file_url,

            v.source_type,

            v.created_at,
            v.updated_at

          FROM lms_lesson_videos v

          INNER JOIN lms_lessons l
            ON l.id = v.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          WHERE u.program_id = $1

            AND LOWER(
              COALESCE(
                t.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                l.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                v.status::text,
                'active'
              )
            ) = 'active'

          ORDER BY
            l.id ASC,
            v.order_number ASC NULLS LAST,
            v.id ASC
        `,
        [
          selectedProgramId,
        ]
      );

    /* =======================================================
       GROUP DOCUMENTS BY LESSON
    ======================================================= */

    const documentsByLesson =
      new Map<number, any[]>();

    for (
      const document
      of documentsResult.rows
    ) {
      const lessonId =
        Number(
          document.lesson_id
        );

      if (
        !documentsByLesson.has(
          lessonId
        )
      ) {
        documentsByLesson.set(
          lessonId,
          []
        );
      }

      documentsByLesson
        .get(lessonId)!
        .push({
          id:
            Number(
              document.document_id
            ),

          title:
            document.document_title ||
            document.file_name ||
            'Learning Material',

          description:
            document.document_description ||
            null,

          fileName:
            document.file_name ||
            null,

          fileUrl:
            document.file_url ||
            null,

          fileSize:
            document.file_size !== null
              ? Number(
                  document.file_size
                )
              : null,

          mimeType:
            document.mime_type ||
            null,

          status:
            document.status ||
            'active',

          createdAt:
            document.created_at ||
            null,

          updatedAt:
            document.updated_at ||
            null,
        });
    }

    /* =======================================================
       GROUP VIDEOS BY LESSON
    ======================================================= */

    const videosByLesson =
      new Map<number, any[]>();

    for (
      const video
      of videosResult.rows
    ) {
      const lessonId =
        Number(
          video.lesson_id
        );

      if (
        !videosByLesson.has(
          lessonId
        )
      ) {
        videosByLesson.set(
          lessonId,
          []
        );
      }

      videosByLesson
        .get(lessonId)!
        .push({
          id:
            Number(
              video.video_id
            ),

          title:
            video.video_title ||
            'Lesson Video',

          description:
            video.video_description ||
            null,

          videoUrl:
            video.video_url ||
            null,

          thumbnailUrl:
            video.thumbnail_url ||
            null,

          durationSeconds:
            video.duration_seconds !== null
              ? Number(
                  video.duration_seconds
                )
              : null,

          orderNumber:
            video.order_number !== null
              ? Number(
                  video.order_number
                )
              : 0,

          status:
            video.status ||
            'active',

          videoFileName:
            video.video_file_name ||
            null,

          videoFileUrl:
            video.video_file_url ||
            null,

          sourceType:
            video.source_type ||
            null,

          createdAt:
            video.created_at ||
            null,

          updatedAt:
            video.updated_at ||
            null,
        });
    }

    /* =======================================================
       BUILD LESSON TREE
    ======================================================= */

    const lessonsByTopic =
      new Map<number, any[]>();

    for (
      const lesson
      of lessonsResult.rows
    ) {
      const topicId =
        Number(
          lesson.topic_id
        );

      const lessonId =
        Number(
          lesson.lesson_id
        );

      if (
        !lessonsByTopic.has(
          topicId
        )
      ) {
        lessonsByTopic.set(
          topicId,
          []
        );
      }

      const documents =
        documentsByLesson.get(
          lessonId
        ) || [];

      const videos =
        videosByLesson.get(
          lessonId
        ) || [];

      lessonsByTopic
        .get(topicId)!
        .push({
          id:
            lessonId,

          title:
            lesson.lesson_title ||
            'Untitled Lesson',

          description:
            lesson.lesson_description ||
            null,

          content:
            lesson.lesson_content ||
            null,

          orderNumber:
            lesson.order_number !== null
              ? Number(
                  lesson.order_number
                )
              : 0,

          status:
            lesson.status ||
            'active',

          documents,

          videos,

          documentCount:
            documents.length,

          videoCount:
            videos.length,
        });
    }

    /* =======================================================
       BUILD TOPIC TREE
    ======================================================= */

    const topicsByUnit =
      new Map<number, any[]>();

    for (
      const topic
      of topicsResult.rows
    ) {
      const unitId =
        Number(
          topic.unit_id
        );

      const topicId =
        Number(
          topic.topic_id
        );

      if (
        !topicsByUnit.has(
          unitId
        )
      ) {
        topicsByUnit.set(
          unitId,
          []
        );
      }

      const lessons =
        lessonsByTopic.get(
          topicId
        ) || [];

      topicsByUnit
        .get(unitId)!
        .push({
          id:
            topicId,

          title:
            topic.topic_title ||
            'Untitled Topic',

          description:
            topic.topic_description ||
            null,

          orderNumber:
            topic.order_number !== null
              ? Number(
                  topic.order_number
                )
              : 0,

          status:
            topic.status ||
            'active',

          lessonCount:
            lessons.length,

          lessons,
        });
    }

    /* =======================================================
       BUILD UNIT TREE
    ======================================================= */

    const units =
      unitsResult.rows.map(
        (unit) => {
          const unitId =
            Number(
              unit.unit_id
            );

          const unitEnrollmentId =
            unit.unit_enrollment_id !== null
              ? Number(
                  unit.unit_enrollment_id
                )
              : null;

          const unitEnrollmentStatus =
            unit.unit_enrollment_status ||
            null;

          /* =================================================
             UNIT ASSIGNMENT

             Assignment is separate from curriculum visibility.

             The unit belongs to the student's program even
             when it has not yet been specifically assigned
             through lms_unit_enrollments.
          ================================================= */

          const normalizedUnitStatus =
            unitEnrollmentStatus
              ? String(
                  unitEnrollmentStatus
                ).toLowerCase()
              : null;

          const isAssigned =
            unitEnrollmentId !== null &&
            normalizedUnitStatus !== null &&
            ![
              'cancelled',
              'dropped',
            ].includes(
              normalizedUnitStatus
            );

          const topics =
            topicsByUnit.get(
              unitId
            ) || [];

          const lessonCount =
            topics.reduce(
              (
                total: number,
                topic: any
              ) =>
                total +
                topic.lessonCount,
              0
            );

          return {
            id:
              unitId,

            programId:
              Number(
                unit.program_id
              ),

            name:
              unit.unit_name ||
              'Untitled Unit',

            description:
              unit.unit_description ||
              null,

            enrollmentId:
              unitEnrollmentId,

            enrollmentStatus:
              unitEnrollmentStatus ||
              'not_assigned',

            assigned:
              isAssigned,

            topicCount:
              topics.length,

            lessonCount,

            topics,
          };
        }
      );

    /* =======================================================
       DEBUG LOG
    ======================================================= */

    console.log(
      'STUDENT UNITS - UNITS FOUND:',
      units.map(
        (unit) => ({
          unit_id:
            unit.id,

          program_id:
            unit.programId,

          unit_name:
            unit.name,

          topic_count:
            unit.topicCount,

          lesson_count:
            unit.lessonCount,
        })
      )
    );

    /* =======================================================
       TOTALS
    ======================================================= */

    const totalUnits =
      units.length;

    const assignedUnits =
      units.filter(
        (unit) =>
          unit.assigned
      ).length;

    const totalTopics =
      units.reduce(
        (total, unit) =>
          total +
          unit.topicCount,
        0
      );

    const totalLessons =
      units.reduce(
        (total, unit) =>
          total +
          unit.lessonCount,
        0
      );

    /* =======================================================
       TOTAL MATERIALS
    ======================================================= */

    const totalMaterials =
      units.reduce(
        (
          total,
          unit
        ) =>
          total +
          unit.topics.reduce(
            (
              topicTotal: number,
              topic: any
            ) =>
              topicTotal +
              topic.lessons.reduce(
                (
                  lessonTotal: number,
                  lesson: any
                ) =>
                  lessonTotal +
                  lesson.documentCount,
                0
              ),
            0
          ),
        0
      );

    /* =======================================================
       TOTAL VIDEOS
    ======================================================= */

    const totalVideos =
      units.reduce(
        (
          total,
          unit
        ) =>
          total +
          unit.topics.reduce(
            (
              topicTotal: number,
              topic: any
            ) =>
              topicTotal +
              topic.lessons.reduce(
                (
                  lessonTotal: number,
                  lesson: any
                ) =>
                  lessonTotal +
                  lesson.videoCount,
                0
              ),
            0
          ),
        0
      );

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        student: {
          applicationId,

          name:
            studentName,

          applicationNumber,

          admissionNumber,
        },

        program: {
          id:
            selectedProgramId,

          name:
            enrollment.program_name,

          code:
            enrollment.program_code ||
            null,

          description:
            enrollment.program_description ||
            null,

          duration:
            enrollment.duration ||
            null,

          level:
            enrollment.level ||
            null,

          status:
            enrollment.program_status ||
            null,

          enrollmentId,

          studentNumber:
            enrollment.student_number ||
            null,

          yearOfStudy:
            enrollment.year_of_study !== null
              ? Number(
                  enrollment.year_of_study
                )
              : null,

          enrollmentStatus:
            enrollment.enrollment_status ||
            'active',

          lecturerName:
            enrollment.lecturer_name ||
            null,
        },

        units,

        totals: {
          units:
            totalUnits,

          assignedUnits:
            assignedUnits,

          topics:
            totalTopics,

          lessons:
            totalLessons,

          materials:
            totalMaterials,

          videos:
            totalVideos,
        },
      },
      {
        status: 200,
      }
    );

  } catch (error) {
    console.error(
      'STUDENT UNITS API ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          'Unable to load your learning units at the moment.',
      },
      {
        status: 500,
      }
    );
  }
}

