import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';

/* =========================================================
   GET VIDEOS FOR A LESSON

   GET /api/lecturer/lesson-videos?lesson_id=1
========================================================= */

export async function GET(request: Request) {
  try {
    /* =====================================================
       REQUIRE LECTURER AUTHENTICATION
    ===================================================== */

    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lecturer authentication required.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       GET LESSON ID
    ===================================================== */

    const { searchParams } = new URL(request.url);

    const lessonIdValue =
      searchParams.get('lesson_id');

    if (!lessonIdValue) {
      return NextResponse.json(
        {
          success: false,
          message: 'lesson_id is required.',
        },
        { status: 400 }
      );
    }

    const lessonId =
      Number(lessonIdValue);

    if (
      !Number.isInteger(lessonId) ||
      lessonId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lesson_id.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY COMPLETE LESSON HIERARCHY

       Lecturer
          ↓
       Program
          ↓
       Unit
          ↓
       Topic
          ↓
       Lesson
    ===================================================== */

    const lessonAccess =
      await pool.query(
        `
        SELECT
          l.id AS lesson_id,
          l.topic_id,

          t.unit_id,

          u.program_id,

          p.name AS program_name,

          u.name AS unit_name,

          t.title AS topic_title,

          l.title AS lesson_title

        FROM lms_lessons l

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_programs p
          ON p.id = u.program_id

        INNER JOIN lms_lecturer_programs lp
          ON lp.program_id = u.program_id

        WHERE
          l.id = $1
          AND lp.lecturer_id = $2

        LIMIT 1
        `,
        [
          lessonId,
          lecturer.id,
        ]
      );

    /* =====================================================
       LESSON NOT ACCESSIBLE
    ===================================================== */

    if (
      lessonAccess.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You do not have permission to access this lesson.',
        },
        { status: 403 }
      );
    }

    const hierarchy =
      lessonAccess.rows[0];

    /* =====================================================
       GET VIDEOS
    ===================================================== */

    const result =
      await pool.query(
        `
        SELECT
          id,
          lesson_id,
          title,
          description,
          video_url,
          thumbnail_url,
          duration_seconds,
          order_number,
          status,
          created_at,
          updated_at,
          video_file_name,
          video_file_url,
          source_type

        FROM lms_lesson_videos

        WHERE lesson_id = $1

        ORDER BY
          order_number ASC,
          created_at ASC,
          id ASC
        `,
        [lessonId]
      );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        hierarchy: {
          program_id:
            hierarchy.program_id,

          program_name:
            hierarchy.program_name,

          unit_id:
            hierarchy.unit_id,

          unit_name:
            hierarchy.unit_name,

          topic_id:
            hierarchy.topic_id,

          topic_title:
            hierarchy.topic_title,

          lesson_id:
            hierarchy.lesson_id,

          lesson_title:
            hierarchy.lesson_title,
        },

        videos:
          result.rows,
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error(
      'LECTURER LESSON VIDEOS GET ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : 'Failed to load lesson videos.',
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   CREATE VIDEO

   POST /api/lecturer/lesson-videos
========================================================= */

export async function POST(request: Request) {
  try {
    /* =====================================================
       REQUIRE LECTURER AUTHENTICATION
    ===================================================== */

    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lecturer authentication required.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       READ REQUEST BODY
    ===================================================== */

    const body =
      await request.json();

    const {
      lesson_id,
      unit_id,
      topic_id,

      title,
      description,

      video_url,
      thumbnail_url,

      duration_seconds,
      order_number,
      status,

      video_file_name,
      video_file_url,

      source_type,
    } = body;

    /* =====================================================
       CONVERT IDS
    ===================================================== */

    const lessonId =
      Number(lesson_id);

    const submittedUnitId =
      unit_id !== undefined &&
      unit_id !== null &&
      unit_id !== ''
        ? Number(unit_id)
        : null;

    const submittedTopicId =
      topic_id !== undefined &&
      topic_id !== null &&
      topic_id !== ''
        ? Number(topic_id)
        : null;

    /* =====================================================
       VALIDATE LESSON ID
    ===================================================== */

    if (
      !Number.isInteger(lessonId) ||
      lessonId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Valid lesson_id is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE UNIT ID
    ===================================================== */

    if (
      submittedUnitId !== null &&
      (
        !Number.isInteger(
          submittedUnitId
        ) ||
        submittedUnitId <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid unit_id.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE TOPIC ID
    ===================================================== */

    if (
      submittedTopicId !== null &&
      (
        !Number.isInteger(
          submittedTopicId
        ) ||
        submittedTopicId <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid topic_id.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CLEAN TEXT VALUES
    ===================================================== */

    const cleanTitle =
      typeof title === 'string'
        ? title.trim()
        : '';

    const cleanDescription =
      typeof description === 'string'
        ? description.trim()
        : '';

    const cleanVideoUrl =
      typeof video_url === 'string'
        ? video_url.trim()
        : '';

    const cleanThumbnailUrl =
      typeof thumbnail_url === 'string'
        ? thumbnail_url.trim()
        : '';

    const cleanVideoFileName =
      typeof video_file_name === 'string'
        ? video_file_name.trim()
        : '';

    const cleanVideoFileUrl =
      typeof video_file_url === 'string'
        ? video_file_url.trim()
        : '';

    const cleanSourceType =
      typeof source_type === 'string'
        ? source_type
            .trim()
            .toLowerCase()
        : 'url';

    const cleanStatus =
      typeof status === 'string'
        ? status
            .trim()
            .toLowerCase()
        : 'active';

    /* =====================================================
       VALIDATE TITLE
    ===================================================== */

    if (!cleanTitle) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Video title is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VIDEO SOURCE
    ===================================================== */

    const allowedSources = [
      'url',
      'upload',
    ];

    const finalSourceType =
      allowedSources.includes(
        cleanSourceType
      )
        ? cleanSourceType
        : 'url';

    /* =====================================================
       VALIDATE URL VIDEO
    ===================================================== */

    if (
      finalSourceType === 'url' &&
      !cleanVideoUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Video URL is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE UPLOADED VIDEO
    ===================================================== */

    if (
      finalSourceType === 'upload' &&
      !cleanVideoFileUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Uploaded video file URL is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FINAL VIDEO URL
    ===================================================== */

    const finalVideoUrl =
      finalSourceType === 'url'
        ? cleanVideoUrl
        : cleanVideoFileUrl;

    /* =====================================================
       DURATION
    ===================================================== */

    let finalDuration:
      number | null = null;

    if (
      duration_seconds !== null &&
      duration_seconds !== undefined &&
      duration_seconds !== ''
    ) {
      const duration =
        Number(duration_seconds);

      if (
        !Number.isFinite(duration) ||
        duration < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid video duration.',
          },
          { status: 400 }
        );
      }

      finalDuration =
        Math.trunc(duration);
    }

    /* =====================================================
       ORDER NUMBER
    ===================================================== */

    let finalOrder = 1;

    if (
      order_number !== null &&
      order_number !== undefined &&
      order_number !== ''
    ) {
      const order =
        Number(order_number);

      if (
        !Number.isInteger(order) ||
        order <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Order number must be a positive integer.',
          },
          { status: 400 }
        );
      }

      finalOrder = order;
    }

    /* =====================================================
       STATUS
    ===================================================== */

    const validStatuses = [
      'active',
      'inactive',
    ];

    const finalStatus =
      validStatuses.includes(
        cleanStatus
      )
        ? cleanStatus
        : 'active';

    /* =====================================================
       VERIFY COMPLETE HIERARCHY

       Lecturer
          ↓
       Program
          ↓
       Unit
          ↓
       Topic
          ↓
       Lesson
    ===================================================== */

    const lessonAccess =
      await pool.query(
        `
        SELECT
          l.id AS lesson_id,

          l.topic_id,

          t.unit_id,

          u.program_id,

          p.name AS program_name,

          u.name AS unit_name,

          u.code AS unit_code,

          t.title AS topic_title,

          l.title AS lesson_title

        FROM lms_lessons l

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_programs p
          ON p.id = u.program_id

        INNER JOIN lms_lecturer_programs lp
          ON lp.program_id = u.program_id

        WHERE
          l.id = $1

          AND lp.lecturer_id = $2

        LIMIT 1
        `,
        [
          lessonId,
          lecturer.id,
        ]
      );

    /* =====================================================
       LESSON DOES NOT BELONG TO LECTURER
    ===================================================== */

    if (
      lessonAccess.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You do not have permission to add a video to this lesson.',
        },
        { status: 403 }
      );
    }

    const hierarchy =
      lessonAccess.rows[0];

    /* =====================================================
       VERIFY UNIT → LESSON RELATIONSHIP
    ===================================================== */

    if (
      submittedUnitId !== null &&
      submittedUnitId !==
        hierarchy.unit_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected unit does not match the selected lesson.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY TOPIC → LESSON RELATIONSHIP
    ===================================================== */

    if (
      submittedTopicId !== null &&
      submittedTopicId !==
        hierarchy.topic_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected topic does not match the selected lesson.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       INSERT VIDEO
    ===================================================== */

    const result =
      await pool.query(
        `
        INSERT INTO lms_lesson_videos
        (
          lesson_id,
          title,
          description,
          video_url,
          thumbnail_url,
          duration_seconds,
          order_number,
          status,
          video_file_name,
          video_file_url,
          source_type
        )

        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11
        )

        RETURNING
          id,
          lesson_id,
          title,
          description,
          video_url,
          thumbnail_url,
          duration_seconds,
          order_number,
          status,
          created_at,
          updated_at,
          video_file_name,
          video_file_url,
          source_type
        `,
        [
          lessonId,

          cleanTitle,

          cleanDescription || null,

          finalVideoUrl,

          cleanThumbnailUrl || null,

          finalDuration,

          finalOrder,

          finalStatus,

          cleanVideoFileName || null,

          cleanVideoFileUrl || null,

          finalSourceType,
        ]
      );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          'Video created successfully.',

        hierarchy: {
          program_id:
            hierarchy.program_id,

          program_name:
            hierarchy.program_name,

          unit_id:
            hierarchy.unit_id,

          unit_name:
            hierarchy.unit_name,

          topic_id:
            hierarchy.topic_id,

          topic_title:
            hierarchy.topic_title,

          lesson_id:
            hierarchy.lesson_id,

          lesson_title:
            hierarchy.lesson_title,
        },

        video:
          result.rows[0],
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error(
      'LECTURER LESSON VIDEOS POST ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : 'Failed to create video.',
      },
      { status: 500 }
    );
  }
}