import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type ParentAnnouncement = {
  id: number;
  title: string;
  message: string;

  created_by: number | null;
  created_by_role: string | null;

  program_id: number | null;
  unit_id: number | null;

  audience: string;
  priority: string;
  status: string;

  publish_at: string | null;
  expires_at: string | null;

  is_pinned: boolean;

  created_at: string;
  updated_at: string;

  program_name: string | null;
  unit_name: string | null;

  creator_name: string | null;

  is_active: boolean;
};

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

/* =========================================================
   GET
   /api/parent/announcements
========================================================= */

export async function GET(request: Request) {
  try {
    /* =====================================================
       PARENT AUTHENTICATION
    ===================================================== */

    const session = await getParentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your session has expired. Please log in again.',
        },
        { status: 401 }
      );
    }

    const parentId = Number(session.parentId);

    if (!Number.isInteger(parentId) || parentId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid parent session.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       QUERY PARAMETERS
    ===================================================== */

    const { searchParams } = new URL(request.url);

    const search = cleanString(
      searchParams.get('search')
    );

    const priority = cleanString(
      searchParams.get('priority')
    );

    const pinnedOnly =
      searchParams.get('pinned') === 'true';

    /* =====================================================
       FIND PARENT'S CHILD
       
       We only need the application ID here.

       Program/unit targeting is handled through the actual
       LMS enrollment relationships below.
    ===================================================== */

    const childResult = await pool.query<{
      application_id: number;
      course: string | null;
    }>(
      `
      SELECT
        a.id AS application_id,
        a.course
      FROM parent_students ps

      INNER JOIN applications a
        ON a.id = ps.application_id

      INNER JOIN users parent_user
        ON parent_user.id = ps.parent_id
       AND parent_user.role = 'parent'
       AND parent_user.active = TRUE

      WHERE ps.parent_id = $1

      ORDER BY
        ps.is_primary DESC,
        a.created_at DESC

      LIMIT 1
      `,
      [parentId]
    );

    const child =
      childResult.rows[0] ?? null;

    /* =====================================================
       BUILD FILTERS
       
       Only currently active announcements are returned.
    ===================================================== */

    const conditions: string[] = [
      `a.status = 'published'`,
      `a.audience IN ('parents', 'all')`,
      `a.publish_at <= NOW()`,
      `
      (
        a.expires_at IS NULL
        OR a.expires_at > NOW()
      )
      `,
    ];

    const values: unknown[] = [];

    let parameterIndex = 1;

    /* =====================================================
       SEARCH
    ===================================================== */

    if (search) {
      conditions.push(`
        (
          a.title ILIKE $${parameterIndex}
          OR a.message ILIKE $${parameterIndex}
          OR COALESCE(p.name, '') ILIKE $${parameterIndex}
          OR COALESCE(u.name, '') ILIKE $${parameterIndex}
        )
      `);

      values.push(`%${search}%`);
      parameterIndex++;
    }

    /* =====================================================
       PRIORITY
    ===================================================== */

    if (priority) {
      conditions.push(
        `a.priority = $${parameterIndex}`
      );

      values.push(priority);
      parameterIndex++;
    }

    /* =====================================================
       PINNED
    ===================================================== */

    if (pinnedOnly) {
      conditions.push(`a.is_pinned = TRUE`);
    }

    /* =====================================================
       CHILD TARGETING
       
       There are three possible announcement scopes:

       1. GLOBAL
          program_id IS NULL
          AND unit_id IS NULL

       2. PROGRAM
          program_id is specified
          AND unit_id IS NULL

          The parent sees it only when the child has an
          active LMS enrollment for that program.

       3. UNIT
          unit_id is specified

          The parent sees it only when the child has an
          active LMS enrollment containing that unit.

       If both program_id and unit_id are supplied, both
       relationships must match.
    ===================================================== */

    if (child) {
      conditions.push(`
        (
          /* -------------------------------------------------
             GLOBAL ANNOUNCEMENT
          ------------------------------------------------- */
          (
            a.program_id IS NULL
            AND a.unit_id IS NULL
          )

          OR

          /* -------------------------------------------------
             PROGRAM ANNOUNCEMENT
             
             Match against the actual LMS enrollment instead
             of comparing applications.course with a program
             name.
          ------------------------------------------------- */
          (
            a.program_id IS NOT NULL
            AND a.unit_id IS NULL

            AND EXISTS (
              SELECT 1
              FROM lms_enrollments le

              WHERE le.application_id = $${parameterIndex}
                AND le.enrollment_status = 'active'
                AND le.program_id = a.program_id
            )
          )

          OR

          /* -------------------------------------------------
             UNIT ANNOUNCEMENT
             
             The unit must actually belong to one of the
             child's active LMS enrollments.
          ------------------------------------------------- */
          (
            a.unit_id IS NOT NULL

            AND EXISTS (
              SELECT 1
              FROM lms_enrollments le

              INNER JOIN lms_unit_enrollments lue
                ON lue.enrollment_id = le.id

              WHERE le.application_id = $${parameterIndex}
                AND le.enrollment_status = 'active'
                AND lue.unit_id = a.unit_id
                AND lue.status = 'active'

                /* If the announcement also specifies a
                   program, the enrollment must match it. */
                AND (
                  a.program_id IS NULL
                  OR le.program_id = a.program_id
                )
            )
          )
        )
      `);

      values.push(child.application_id);
      parameterIndex++;
    } else {
      /* -----------------------------------------------------
         Parent has no linked child.

         Only truly global announcements are visible.
      ----------------------------------------------------- */

      conditions.push(`
        a.program_id IS NULL
        AND a.unit_id IS NULL
      `);
    }

    const whereClause =
      conditions.join(' AND ');

    /* =====================================================
       GET ANNOUNCEMENTS
    ===================================================== */

    const result =
      await pool.query<ParentAnnouncement>(
        `
        SELECT
          a.id,
          a.title,
          a.message,

          a.created_by,
          a.created_by_role,

          a.program_id,
          a.unit_id,

          a.audience,
          a.priority,
          a.status,

          a.publish_at,
          a.expires_at,

          a.is_pinned,

          a.created_at,
          a.updated_at,

          p.name AS program_name,

          u.name AS unit_name,

          creator.name AS creator_name,

          CASE
            WHEN a.status = 'published'
              AND a.publish_at <= NOW()
              AND (
                a.expires_at IS NULL
                OR a.expires_at > NOW()
              )
            THEN TRUE
            ELSE FALSE
          END AS is_active

        FROM lms_announcements a

        LEFT JOIN lms_programs p
          ON p.id = a.program_id

        LEFT JOIN lms_units u
          ON u.id = a.unit_id

        LEFT JOIN users creator
          ON creator.id = a.created_by

        WHERE ${whereClause}

        ORDER BY
          a.is_pinned DESC,

          CASE a.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,

          a.publish_at DESC,
          a.created_at DESC
        `,
        values
      );

    /* =====================================================
       STATISTICS
       
       IMPORTANT:
       Statistics use the EXACT SAME targeting rules as the
       announcement list.

       This prevents statistics from counting announcements
       belonging to another program or unit.
    ===================================================== */

    const statisticsResult =
      await pool.query<{
        total: number;
        pinned: number;
        urgent: number;
        high: number;
      }>(
        `
        SELECT
          COUNT(*)::int AS total,

          COUNT(*) FILTER (
            WHERE a.is_pinned = TRUE
          )::int AS pinned,

          COUNT(*) FILTER (
            WHERE a.priority = 'urgent'
          )::int AS urgent,

          COUNT(*) FILTER (
            WHERE a.priority = 'high'
          )::int AS high

        FROM lms_announcements a

        WHERE
          a.status = 'published'
          AND a.audience IN ('parents', 'all')
          AND a.publish_at <= NOW()

          AND (
            a.expires_at IS NULL
            OR a.expires_at > NOW()
          )

          AND
          ${
            child
              ? `
              (
                /* -------------------------------------------
                   GLOBAL
                ------------------------------------------- */
                (
                  a.program_id IS NULL
                  AND a.unit_id IS NULL
                )

                OR

                /* -------------------------------------------
                   PROGRAM
                ------------------------------------------- */
                (
                  a.program_id IS NOT NULL
                  AND a.unit_id IS NULL

                  AND EXISTS (
                    SELECT 1
                    FROM lms_enrollments le

                    WHERE le.application_id = $1
                      AND le.enrollment_status = 'active'
                      AND le.program_id = a.program_id
                  )
                )

                OR

                /* -------------------------------------------
                   UNIT
                ------------------------------------------- */
                (
                  a.unit_id IS NOT NULL

                  AND EXISTS (
                    SELECT 1
                    FROM lms_enrollments le

                    INNER JOIN lms_unit_enrollments lue
                      ON lue.enrollment_id = le.id

                    WHERE le.application_id = $1
                      AND le.enrollment_status = 'active'
                      AND lue.unit_id = a.unit_id
                      AND lue.status = 'active'

                      AND (
                        a.program_id IS NULL
                        OR le.program_id = a.program_id
                      )
                  )
                )
              )
              `
              : `
              (
                a.program_id IS NULL
                AND a.unit_id IS NULL
              )
              `
          }
        `,
        child
          ? [child.application_id]
          : []
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      announcements: result.rows,

      statistics:
        statisticsResult.rows[0] || {
          total: 0,
          pinned: 0,
          urgent: 0,
          high: 0,
        },

      child: child
        ? {
            applicationId: child.application_id,
            course: child.course,
          }
        : null,
    });
  } catch (error) {
    console.error(
      'GET /api/parent/announcements error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load announcements.',
      },
      { status: 500 }
    );
  }
}