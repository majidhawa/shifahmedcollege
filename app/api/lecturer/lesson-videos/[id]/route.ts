import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';

/* =========================================================
   GET /api/lecturer/lesson-videos/[id]

   GET SINGLE VIDEO

   SECURITY:
   Lecturer
      ↓
   Program
      ↓
   Unit
      ↓
   Topic
      ↓
   Lesson
      ↓
   Video
========================================================= */

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    /* =====================================================
       REQUIRE LECTURER AUTHENTICATION
    ===================================================== */

    const lecturer = await requireLecturer();

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
       GET VIDEO ID
    ===================================================== */

    const { id } = await context.params;

    const videoId = Number(id);

    if (
      !Number.isInteger(videoId) ||
      videoId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid video ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       GET VIDEO + VERIFY LECTURER ACCESS

       Video
          ↓
       Lesson
          ↓
       Topic
          ↓
       Unit
          ↓
       Program
          ↓
       Lecturer
    ===================================================== */

    const result = await pool.query(
      `
        SELECT
          v.id,
          v.lesson_id,

          v.title,
          v.description,
          v.video_url,
          v.thumbnail_url,
          v.duration_seconds,
          v.order_number,
          v.status,
          v.created_at,
          v.updated_at,

          v.video_file_name,
          v.video_file_url,
          v.source_type,

          l.topic_id,
          t.unit_id,
          u.program_id,

          p.name AS program_name,

          u.name AS unit_name,
          u.code AS unit_code,

          t.title AS topic_title,

          l.title AS lesson_title

        FROM lms_lesson_videos v

        INNER JOIN lms_lessons l
          ON l.id = v.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_programs p
          ON p.id = u.program_id

        INNER JOIN lms_lecturer_programs lp
          ON lp.program_id = u.program_id

        WHERE
          v.id = $1
          AND lp.lecturer_id = $2

        LIMIT 1
      `,
      [
        videoId,
        lecturer.id,
      ]
    );

    /* =====================================================
       NOT FOUND / NO ACCESS
    ===================================================== */

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Video not found or you do not have permission to access it.',
        },
        { status: 404 }
      );
    }

    const video = result.rows[0];

    /* =====================================================
       NORMALIZE VIDEO DATA
    ===================================================== */

    const normalizedVideo = {
      id: video.id,

      lesson_id:
        video.lesson_id,

      title:
        video.title ?? '',

      description:
        video.description ?? '',

      video_url:
        video.video_url ?? '',

      thumbnail_url:
        video.thumbnail_url ?? '',

      duration_seconds:
        video.duration_seconds ?? null,

      order_number:
        video.order_number ?? 1,

      status:
        video.status ?? 'active',

      created_at:
        video.created_at,

      updated_at:
        video.updated_at,

      video_file_name:
        video.video_file_name ?? '',

      video_file_url:
        video.video_file_url ?? '',

      source_type:
        video.source_type === 'upload'
          ? 'upload'
          : 'url',
    };

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        hierarchy: {
          program_id:
            video.program_id,

          program_name:
            video.program_name,

          unit_id:
            video.unit_id,

          unit_name:
            video.unit_name,

          unit_code:
            video.unit_code,

          topic_id:
            video.topic_id,

          topic_title:
            video.topic_title,

          lesson_id:
            video.lesson_id,

          lesson_title:
            video.lesson_title,
        },

        video:
          normalizedVideo,
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error(
      'GET LECTURER VIDEO ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to load video.',
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   PUT /api/lecturer/lesson-videos/[id]

   UPDATE VIDEO
========================================================= */

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    /* =====================================================
       REQUIRE LECTURER AUTHENTICATION
    ===================================================== */

    const lecturer = await requireLecturer();

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
       GET VIDEO ID
    ===================================================== */

    const { id } = await context.params;

    const videoId = Number(id);

    if (
      !Number.isInteger(videoId) ||
      videoId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid video ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CHECK EXISTING VIDEO + LECTURER ACCESS

       We verify the complete hierarchy before allowing
       the lecturer to modify the video.
    ===================================================== */

    const existingResult =
      await pool.query(
        `
          SELECT
            v.id,
            v.lesson_id,

            v.source_type,
            v.video_url,
            v.video_file_name,
            v.video_file_url,

            l.topic_id,

            t.unit_id,

            u.program_id

          FROM lms_lesson_videos v

          INNER JOIN lms_lessons l
            ON l.id = v.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_lecturer_programs lp
            ON lp.program_id = u.program_id

          WHERE
            v.id = $1
            AND lp.lecturer_id = $2

          LIMIT 1
        `,
        [
          videoId,
          lecturer.id,
        ]
      );

    /* =====================================================
       NOT FOUND / NO ACCESS
    ===================================================== */

    if (
      existingResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Video not found or you do not have permission to modify it.',
        },
        { status: 404 }
      );
    }

    const existingVideo =
      existingResult.rows[0];

    /* =====================================================
       READ JSON
    ===================================================== */

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid JSON request body.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       OPTIONAL UNIT / TOPIC VALIDATION

       The edit page may send these values.

       We do not store them in the video table.
       They are only used to verify the hierarchy.
    ===================================================== */

    const submittedUnitId =
      body.unit_id !== undefined &&
      body.unit_id !== null &&
      body.unit_id !== ''
        ? Number(body.unit_id)
        : null;

    const submittedTopicId =
      body.topic_id !== undefined &&
      body.topic_id !== null &&
      body.topic_id !== ''
        ? Number(body.topic_id)
        : null;

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
       VERIFY UNIT
    ===================================================== */

    if (
      submittedUnitId !== null &&
      submittedUnitId !==
        existingVideo.unit_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected unit does not match this video lesson.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY TOPIC
    ===================================================== */

    if (
      submittedTopicId !== null &&
      submittedTopicId !==
        existingVideo.topic_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected topic does not match this video lesson.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CLEAN VALUES
    ===================================================== */

    const cleanTitle =
      typeof body.title === 'string'
        ? body.title.trim()
        : '';

    const cleanDescription =
      typeof body.description === 'string'
        ? body.description.trim()
        : '';

    const cleanVideoUrl =
      typeof body.video_url === 'string'
        ? body.video_url.trim()
        : '';

    const cleanThumbnailUrl =
      typeof body.thumbnail_url === 'string'
        ? body.thumbnail_url.trim()
        : '';

    const cleanVideoFileName =
      typeof body.video_file_name === 'string'
        ? body.video_file_name.trim()
        : '';

    const cleanVideoFileUrl =
      typeof body.video_file_url === 'string'
        ? body.video_file_url.trim()
        : '';

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
       SOURCE TYPE
    ===================================================== */

    const requestedSource =
      typeof body.source_type === 'string'
        ? body.source_type
            .trim()
            .toLowerCase()
        : existingVideo.source_type;

    const sourceType =
      requestedSource === 'upload'
        ? 'upload'
        : 'url';

    /* =====================================================
       DETERMINE VIDEO URL
    ===================================================== */

    let finalVideoUrl = '';

    let finalVideoFileName:
      | string
      | null = null;

    let finalVideoFileUrl:
      | string
      | null = null;

    if (
      sourceType === 'upload'
    ) {
      /*
       * New uploaded video.
       */

      if (cleanVideoFileUrl) {
        finalVideoUrl =
          cleanVideoFileUrl;

        finalVideoFileUrl =
          cleanVideoFileUrl;

        finalVideoFileName =
          cleanVideoFileName ||
          null;
      } else {
        /*
         * No new upload.
         *
         * Keep existing uploaded file.
         */

        finalVideoUrl =
          existingVideo.video_file_url ||
          existingVideo.video_url ||
          '';

        finalVideoFileUrl =
          existingVideo.video_file_url ||
          null;

        finalVideoFileName =
          existingVideo.video_file_name ||
          null;
      }
    } else {
      /*
       * External URL.
       */

      finalVideoUrl =
        cleanVideoUrl;

      finalVideoFileUrl = null;

      finalVideoFileName = null;
    }

    /* =====================================================
       VALIDATE FINAL VIDEO URL
    ===================================================== */

    if (!finalVideoUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            sourceType === 'upload'
              ? 'Uploaded video file is required.'
              : 'Video URL is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       DURATION
    ===================================================== */

    let finalDuration:
      | number
      | null = null;

    if (
      body.duration_seconds !==
        null &&
      body.duration_seconds !==
        undefined &&
      body.duration_seconds !== ''
    ) {
      const duration =
        Number(
          body.duration_seconds
        );

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
      body.order_number !==
        null &&
      body.order_number !==
        undefined &&
      body.order_number !== ''
    ) {
      const order =
        Number(
          body.order_number
        );

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

    const requestedStatus =
      typeof body.status === 'string'
        ? body.status
            .trim()
            .toLowerCase()
        : 'active';

    const finalStatus =
      requestedStatus === 'inactive'
        ? 'inactive'
        : 'active';

    /* =====================================================
       UPDATE VIDEO
    ===================================================== */

    const result =
      await pool.query(
        `
          UPDATE lms_lesson_videos

          SET
            title = $1,

            description = $2,

            video_url = $3,

            thumbnail_url = $4,

            duration_seconds = $5,

            order_number = $6,

            status = $7,

            video_file_name = $8,

            video_file_url = $9,

            source_type = $10,

            updated_at =
              CURRENT_TIMESTAMP

          WHERE id = $11

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
          cleanTitle,

          cleanDescription ||
            null,

          finalVideoUrl,

          cleanThumbnailUrl ||
            null,

          finalDuration,

          finalOrder,

          finalStatus,

          finalVideoFileName,

          finalVideoFileUrl,

          sourceType,

          videoId,
        ]
      );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          'Video updated successfully.',

        hierarchy: {
          program_id:
            existingVideo.program_id,

          unit_id:
            existingVideo.unit_id,

          topic_id:
            existingVideo.topic_id,

          lesson_id:
            existingVideo.lesson_id,
        },

        video:
          result.rows[0],
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error(
      'UPDATE LECTURER VIDEO ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update video.',
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   DELETE /api/lecturer/lesson-videos/[id]

   DELETE VIDEO
========================================================= */

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    /* =====================================================
       REQUIRE LECTURER AUTHENTICATION
    ===================================================== */

    const lecturer = await requireLecturer();

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
       GET VIDEO ID
    ===================================================== */

    const { id } = await context.params;

    const videoId = Number(id);

    if (
      !Number.isInteger(videoId) ||
      videoId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid video ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CHECK VIDEO + LECTURER ACCESS
    ===================================================== */

    const existingVideo =
      await pool.query(
        `
          SELECT
            v.id,
            v.lesson_id,
            v.title,

            v.source_type,
            v.video_file_name,
            v.video_file_url,

            l.topic_id,

            t.unit_id,

            u.program_id

          FROM lms_lesson_videos v

          INNER JOIN lms_lessons l
            ON l.id = v.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_lecturer_programs lp
            ON lp.program_id = u.program_id

          WHERE
            v.id = $1
            AND lp.lecturer_id = $2

          LIMIT 1
        `,
        [
          videoId,
          lecturer.id,
        ]
      );

    /* =====================================================
       NOT FOUND / NO ACCESS
    ===================================================== */

    if (
      existingVideo.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Video not found or you do not have permission to delete it.',
        },
        { status: 404 }
      );
    }

    /* =====================================================
       DELETE DATABASE RECORD
    ===================================================== */

    await pool.query(
      `
        DELETE FROM lms_lesson_videos
        WHERE id = $1
      `,
      [videoId]
    );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          'Video deleted successfully.',

        video_id:
          videoId,
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error(
      'DELETE LECTURER VIDEO ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete video.',
      },
      { status: 500 }
    );
  }
}