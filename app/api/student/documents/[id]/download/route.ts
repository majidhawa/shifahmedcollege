import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

const STORAGE_BUCKET =
  'lms-documents';

/* =========================================================
   SUPABASE CLIENT
========================================================= */

const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

/* =========================================================
   DOWNLOAD DOCUMENT
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
       CHECK SUPABASE CONFIGURATION
    ===================================================== */

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Supabase Storage is not configured.',
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       AUTHENTICATE STUDENT
    ===================================================== */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unauthorized. Please log in.',
        },
        {
          status: 401,
        }
      );
    }

    const applicationId =
      Number(
        session.applicationId
      );

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
            'Invalid student session.',
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       GET DOCUMENT ID
========================================================= */

    const { id } =
      await context.params;

    const documentId =
      Number(id);

    if (
      !Number.isInteger(
        documentId
      ) ||
      documentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid document ID.',
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       GET DOCUMENT
       AND VERIFY STUDENT ACCESS
========================================================= */

    const result =
      await pool.query(
        `
        SELECT
          d.id,
          d.lesson_id,
          d.title,
          d.description,
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

        INNER JOIN lms_enrollments e
          ON e.program_id = u.program_id

        WHERE d.id = $1

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
            d.status IS NULL
            OR LOWER(
              d.status::text
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
          documentId,
          applicationId,
        ]
      );

    /* =====================================================
       DOCUMENT NOT FOUND
========================================================= */

    if (
      result.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Document not found or you do not have access to this document.',
        },
        {
          status: 404,
        }
      );
    }

    const document =
      result.rows[0];

    /* =====================================================
       CHECK STATUS
========================================================= */

    if (
      document.status &&
      String(
        document.status
      ).toLowerCase() !==
        'active'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This document is no longer available.',
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       GET STORAGE PATH
========================================================= */

    let storagePath:
      | string
      | null = null;

    if (
      document.file_url
    ) {
      try {
        const parsedUrl =
          new URL(
            document.file_url
          );

        const pathname =
          parsedUrl.pathname;

        const marker =
          `/storage/v1/object/public/${STORAGE_BUCKET}/`;

        const index =
          pathname.indexOf(
            marker
          );

        if (
          index !== -1
        ) {
          storagePath =
            decodeURIComponent(
              pathname.substring(
                index +
                  marker.length
              )
            );
        }
      } catch (error) {
        console.error(
          'STUDENT DOCUMENT URL PARSE ERROR:',
          error
        );
      }
    }

    /* =====================================================
       FALLBACK
========================================================= */

    if (
      !storagePath &&
      document.file_name
    ) {
      storagePath =
        `lessons/${document.lesson_id}/${document.file_name}`;
    }

    /* =====================================================
       VALIDATE PATH
========================================================= */

    if (!storagePath) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Document storage path could not be determined.',
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       LOG
========================================================= */

    console.log(
      'STUDENT DOCUMENT DOWNLOAD:',
      {
        applicationId,
        documentId,
        lessonId:
          document.lesson_id,
        bucket:
          STORAGE_BUCKET,
        storagePath,
      }
    );

    /* =====================================================
       DOWNLOAD FROM SUPABASE
========================================================= */

    const {
      data: fileData,
      error: downloadError,
    } =
      await supabase.storage
        .from(
          STORAGE_BUCKET
        )
        .download(
          storagePath
        );

    /* =====================================================
       HANDLE STORAGE ERROR
========================================================= */

    if (
      downloadError ||
      !fileData
    ) {
      console.error(
        'STUDENT SUPABASE DOCUMENT DOWNLOAD ERROR:',
        {
          documentId,
          bucket:
            STORAGE_BUCKET,
          storagePath,
          error:
            downloadError?.message,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Document could not be retrieved from Supabase Storage.',
          bucket:
            STORAGE_BUCKET,
          storagePath,
          error:
            downloadError?.message ||
            'Unknown Storage error.',
        },
        {
          status: 404,
        }
      );
    }

    /* =====================================================
       MIME TYPE
========================================================= */

    const contentType =
      document.mime_type ||
      'application/octet-stream';

    /* =====================================================
       SAFE FILE NAME
========================================================= */

    let fileName =
      document.file_name ||
      document.title ||
      'document';

    fileName = String(
      fileName
    )
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        '_'
      )
      .trim();

    if (!fileName) {
      fileName = 'document';
    }

    /* =====================================================
       RETURN AS DOWNLOAD
========================================================= */

    return new NextResponse(
      fileData,
      {
        status: 200,

        headers: {
          'Content-Type':
            contentType,

          'Content-Disposition':
            `attachment; filename="${fileName.replace(
              /"/g,
              ''
            )}"`,

          'Cache-Control':
            'private, no-store, max-age=0',

          'X-Content-Type-Options':
            'nosniff',
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      'STUDENT DOCUMENT DOWNLOAD ERROR:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to download document.';

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}