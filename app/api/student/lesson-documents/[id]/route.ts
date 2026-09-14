import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
=========================================================
STUDENT LESSON DOCUMENT DOWNLOAD
GET /api/student/lesson-documents/[id]
=========================================================

This endpoint:
1. Verifies the student session
2. Verifies that the document belongs to a lesson
   inside a program the student is enrolled in
3. Fetches the file from its storage URL
4. Sends the file to the student's browser with
   Content-Disposition: attachment
=========================================================
*/

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
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
          success: false,
          message: 'Invalid student session.',
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       DOCUMENT ID
    ===================================================== */

    const documentId = Number(params.id);

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid document ID.',
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       FIND DOCUMENT + VERIFY STUDENT ENROLLMENT
    ===================================================== */

    const result = await pool.query(
      `
        SELECT
          d.id,
          d.title,
          d.description,
          d.file_name,
          d.file_url,
          d.file_size,
          d.mime_type,

          e.id AS enrollment_id,
          e.application_id,
          e.program_id,

          u.id AS unit_id,
          t.id AS topic_id,
          l.id AS lesson_id

        FROM lms_lesson_documents d

        INNER JOIN lms_lessons l
          ON l.id = d.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_enrollments e
          ON e.program_id = u.program_id
         AND e.application_id = $1

        WHERE d.id = $2

          AND LOWER(d.status::text) = 'active'

          AND (
            e.enrollment_status IS NULL
            OR LOWER(e.enrollment_status::text)
               NOT IN ('cancelled', 'dropped')
          )

        ORDER BY e.id DESC

        LIMIT 1
      `,
      [
        applicationId,
        documentId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Document not found or you are not authorized to access it.',
        },
        {
          status: 404,
        }
      );
    }

    const document = result.rows[0];

    if (!document.file_url) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This learning material does not have a file URL.',
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       FETCH FILE FROM STORAGE
    ===================================================== */

    const fileResponse = await fetch(
      document.file_url,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    if (!fileResponse.ok) {
      console.error(
        'STUDENT DOCUMENT DOWNLOAD - STORAGE ERROR:',
        {
          documentId,
          status: fileResponse.status,
          statusText: fileResponse.statusText,
          fileUrl: document.file_url,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'The learning material could not be retrieved from storage.',
        },
        {
          status: 502,
        }
      );
    }

    /* =====================================================
       GET FILE DATA
    ===================================================== */

    const fileBuffer =
      await fileResponse.arrayBuffer();

    /* =====================================================
       MIME TYPE
    ===================================================== */

    const contentType =
      document.mime_type ||
      fileResponse.headers.get(
        'content-type'
      ) ||
      'application/octet-stream';

    /* =====================================================
       FILE NAME
    ===================================================== */

    let fileName =
      document.file_name ||
      document.title ||
      `learning-material-${document.id}`;

    /*
     * Remove characters that could cause problems in
     * Content-Disposition.
     */
    fileName = fileName
      .replace(
        /[\r\n"]/g,
        ''
      )
      .trim();

    if (!fileName) {
      fileName =
        `learning-material-${document.id}`;
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return new NextResponse(
      fileBuffer,
      {
        status: 200,

        headers: {
          'Content-Type':
            contentType,

          'Content-Length':
            String(fileBuffer.byteLength),

          'Content-Disposition':
            `attachment; filename="${fileName}"`,

          'Cache-Control':
            'private, no-store, max-age=0',

          'X-Content-Type-Options':
            'nosniff',
        },
      }
    );

  } catch (error) {
    console.error(
      'STUDENT DOCUMENT DOWNLOAD ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'An error occurred while downloading the learning material.',
      },
      {
        status: 500,
      }
    );
  }
}

