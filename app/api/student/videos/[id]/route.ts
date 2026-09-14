import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    /* =====================================================
       AUTHENTICATE STUDENT
    ===================================================== */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
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
          error: 'Invalid student session',
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       VIDEO ID
    ===================================================== */

    const videoId = Number(params.id);

    if (
      !Number.isInteger(videoId) ||
      videoId <= 0
    ) {
      return NextResponse.json(
        {
          error: 'Invalid video ID',
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       GET VIDEO + VERIFY STUDENT ENROLLMENT
    ===================================================== */

    const result = await pool.query(
      `
        SELECT
          v.id,
          v.title,
          v.video_file_url,
          v.source_type,
          v.status,

          e.id AS enrollment_id,
          e.application_id,
          e.program_id

        FROM lms_lesson_videos v

        INNER JOIN lms_lessons l
          ON l.id = v.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_enrollments e
          ON e.program_id = u.program_id

        WHERE v.id = $1

          AND e.application_id = $2

          AND (
            e.enrollment_status IS NULL
            OR LOWER(
              e.enrollment_status::text
            ) NOT IN (
              'cancelled',
              'dropped'
            )
          )

          AND (
            v.status IS NULL
            OR LOWER(
              v.status::text
            ) = 'active'
          )

          AND (
            l.status IS NULL
            OR LOWER(
              l.status::text
            ) = 'active'
          )

          AND (
            t.status IS NULL
            OR LOWER(
              t.status::text
            ) = 'active'
          )

          AND (
            u.status IS NULL
            OR LOWER(
              u.status::text
            ) NOT IN (
              'inactive',
              'deleted',
              'archived'
            )
          )

        LIMIT 1
      `,
      [
        videoId,
        applicationId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            'Video not found or you do not have access to this video.',
        },
        {
          status: 404,
        }
      );
    }

    const video = result.rows[0];

    /* =====================================================
       ONLY SERVE UPLOADED VIDEOS
    ===================================================== */

    if (
      String(video.source_type || '').toLowerCase() !==
      'upload'
    ) {
      return NextResponse.json(
        {
          error:
            'This video is not an uploaded LMS video.',
        },
        {
          status: 400,
        }
      );
    }

    if (!video.video_file_url) {
      return NextResponse.json(
        {
          error:
            'No uploaded video file is attached to this video.',
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       REQUEST RANGE
    ===================================================== */

    const range = request.headers.get('range');

    const upstreamHeaders = new Headers();

    if (range) {
      upstreamHeaders.set(
        'Range',
        range
      );
    }

    /* =====================================================
       FETCH VIDEO FROM SUPABASE STORAGE
    ===================================================== */

    const upstreamResponse = await fetch(
      video.video_file_url,
      {
        method: 'GET',
        headers: upstreamHeaders,
        cache: 'no-store',
      }
    );

    if (
      !upstreamResponse.ok &&
      upstreamResponse.status !== 206
    ) {
      console.error(
        'STUDENT VIDEO STREAM - SUPABASE ERROR:',
        {
          videoId,
          status:
            upstreamResponse.status,
          statusText:
            upstreamResponse.statusText,
        }
      );

      return NextResponse.json(
        {
          error:
            'Unable to retrieve video from storage.',
        },
        {
          status: 502,
        }
      );
    }

    /* =====================================================
       RESPONSE HEADERS
    ===================================================== */

    const responseHeaders =
      new Headers();

    responseHeaders.set(
      'Content-Type',
      upstreamResponse.headers.get(
        'content-type'
      ) || 'video/mp4'
    );

    const contentLength =
      upstreamResponse.headers.get(
        'content-length'
      );

    if (contentLength) {
      responseHeaders.set(
        'Content-Length',
        contentLength
      );
    }

    const contentRange =
      upstreamResponse.headers.get(
        'content-range'
      );

    if (contentRange) {
      responseHeaders.set(
        'Content-Range',
        contentRange
      );
    }

    responseHeaders.set(
      'Accept-Ranges',
      'bytes'
    );

    responseHeaders.set(
      'Cache-Control',
      'private, no-store, max-age=0'
    );

    responseHeaders.set(
      'Content-Disposition',
      'inline'
    );

    /* =====================================================
       RETURN STREAM
    ===================================================== */

    return new NextResponse(
      upstreamResponse.body,
      {
        status:
          upstreamResponse.status,
        headers:
          responseHeaders,
      }
    );
  } catch (error) {
    console.error(
      'STUDENT VIDEO STREAM ERROR:',
      error
    );

    return NextResponse.json(
      {
        error:
          'An unexpected error occurred while loading the video.',
      },
      {
        status: 500,
      }
    );
  }
}