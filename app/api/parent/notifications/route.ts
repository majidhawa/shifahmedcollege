import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

const ALLOWED_TYPES = [
  'general',
  'announcement',
  'application',
  'payment',
  'admission',
  'document',
  'academic',
  'event',
  'system',
] as const;

type NotificationType = (typeof ALLOWED_TYPES)[number];

/* =========================================================
   HELPERS
========================================================= */

function normalizeType(value: unknown): NotificationType {
  const type = String(value ?? 'general')
    .trim()
    .toLowerCase();

  if (ALLOWED_TYPES.includes(type as NotificationType)) {
    return type as NotificationType;
  }

  return 'general';
}

function nullableString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

function parsePositiveId(value: unknown): number | null {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/* =========================================================
   ANNOUNCEMENT VISIBILITY SQL

   A notification linked to an announcement is visible only
   when that announcement is:

   - published
   - intended for parents or everyone
   - already within its publication window
   - not expired

   Notifications without announcement_id remain visible
   normally.
========================================================= */

const ANNOUNCEMENT_VISIBILITY_SQL = `
  (
    n.announcement_id IS NULL

    OR EXISTS (
      SELECT 1
      FROM lms_announcements announcement
      WHERE announcement.id = n.announcement_id
        AND announcement.status = 'published'
        AND announcement.audience IN ('parents', 'all')
        AND (
          announcement.publish_at IS NULL
          OR announcement.publish_at <= CURRENT_TIMESTAMP
        )
        AND (
          announcement.expires_at IS NULL
          OR announcement.expires_at > CURRENT_TIMESTAMP
        )
    )
  )
`;

/* =========================================================
   GET
   /api/parent/notifications

   Returns notifications belonging to the authenticated
   parent.

   Announcement notifications are only visible while their
   linked announcement is currently active and intended for
   parents/all.

   Normal notifications without announcement_id continue
   to work normally.
========================================================= */

export async function GET(request: Request) {
  try {
    const session = await getParentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
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

    const { searchParams } = new URL(request.url);

    const type = nullableString(
      searchParams.get('type')
    );

    const search = nullableString(
      searchParams.get('search')
    );

    const unreadOnly =
      searchParams.get('unread') === 'true';

    const limitRaw = Number(
      searchParams.get('limit') ?? '50'
    );

    const limit =
      Number.isInteger(limitRaw) &&
      limitRaw > 0 &&
      limitRaw <= 100
        ? limitRaw
        : 50;

    const values: unknown[] = [parentId];

    const conditions: string[] = [
      'n.parent_id = $1',
    ];

    /* -------------------------------------------------------
       TYPE FILTER
    ------------------------------------------------------- */

    if (type && type !== 'all') {
      const normalizedType = normalizeType(type);

      values.push(normalizedType);

      conditions.push(
        `n.type = $${values.length}`
      );
    }

    /* -------------------------------------------------------
       UNREAD FILTER
    ------------------------------------------------------- */

    if (unreadOnly) {
      conditions.push('n.is_read = FALSE');
    }

    /* -------------------------------------------------------
       SEARCH
    ------------------------------------------------------- */

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          n.title ILIKE $${values.length}
          OR n.message ILIKE $${values.length}
          OR n.type ILIKE $${values.length}
        )
      `);
    }

    /* -------------------------------------------------------
       ANNOUNCEMENT VISIBILITY
    ------------------------------------------------------- */

    conditions.push(
      ANNOUNCEMENT_VISIBILITY_SQL
    );

    /* -------------------------------------------------------
       LIMIT
    ------------------------------------------------------- */

    values.push(limit);

    const result = await pool.query(
      `
      SELECT
        n.id,
        n.parent_id,
        n.application_id,
        n.announcement_id,
        n.title,
        n.message,
        n.type,
        n.link,
        n.is_read,
        n.created_by,
        n.created_at,
        n.read_at,

        creator.name AS created_by_name,
        creator.email AS created_by_email,

        a.application_number,

        CONCAT_WS(
          ' ',
          a.first_name,
          a.middle_name,
          a.surname
        ) AS child_name,

        announcement.status AS announcement_status,
        announcement.priority AS announcement_priority,
        announcement.audience AS announcement_audience,
        announcement.publish_at AS announcement_publish_at,
        announcement.expires_at AS announcement_expires_at,
        announcement.is_pinned AS announcement_is_pinned,
        announcement.program_id AS announcement_program_id,
        announcement.unit_id AS announcement_unit_id,

        program.name AS announcement_program_name,
        unit.name AS announcement_unit_name

      FROM lms_parent_notifications n

      LEFT JOIN users creator
        ON creator.id = n.created_by

      LEFT JOIN applications a
        ON a.id = n.application_id

      LEFT JOIN lms_announcements announcement
        ON announcement.id = n.announcement_id

      LEFT JOIN lms_programs program
        ON program.id = announcement.program_id

      LEFT JOIN lms_units unit
        ON unit.id = announcement.unit_id

      WHERE ${conditions.join(' AND ')}

      ORDER BY
        n.is_read ASC,
        n.created_at DESC

      LIMIT $${values.length}
      `,
      values
    );

    /* -------------------------------------------------------
       UNREAD COUNT

       Uses exactly the same announcement visibility rule as
       the main notification query.
    ------------------------------------------------------- */

    const unreadResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS count

      FROM lms_parent_notifications n

      WHERE n.parent_id = $1
        AND n.is_read = FALSE
        AND ${ANNOUNCEMENT_VISIBILITY_SQL}
      `,
      [parentId]
    );

    /* -------------------------------------------------------
       TOTAL COUNT

       Counts only notifications currently visible to the
       authenticated parent.
    ------------------------------------------------------- */

    const totalResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS count

      FROM lms_parent_notifications n

      WHERE n.parent_id = $1
        AND ${ANNOUNCEMENT_VISIBILITY_SQL}
      `,
      [parentId]
    );

    return NextResponse.json({
      success: true,
      notifications: result.rows,
      unreadCount:
        unreadResult.rows[0]?.count ?? 0,
      totalCount:
        totalResult.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error(
      'Parent Notifications GET error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load notifications.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH
   /api/parent/notifications

   Supported:

   {
     id: 1,
     is_read: true
   }

   {
     id: 1,
     is_read: false
   }

   {
     markAllRead: true
   }
========================================================= */

export async function PATCH(request: Request) {
  try {
    const session = await getParentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
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

    const body: unknown = await request.json();

    if (
      typeof body !== 'object' ||
      body === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body.',
        },
        { status: 400 }
      );
    }

    const payload =
      body as Record<string, unknown>;

    /* =====================================================
       MARK ALL READ
    ===================================================== */

    if (payload.markAllRead === true) {
      const result = await pool.query(
        `
        UPDATE lms_parent_notifications n

        SET
          is_read = TRUE,
          read_at = COALESCE(
            n.read_at,
            CURRENT_TIMESTAMP
          )

        WHERE n.parent_id = $1
          AND n.is_read = FALSE
          AND ${ANNOUNCEMENT_VISIBILITY_SQL}

        RETURNING n.id
        `,
        [parentId]
      );

      return NextResponse.json({
        success: true,
        message:
          'All notifications marked as read.',
        updatedCount:
          result.rowCount ?? 0,
      });
    }

    /* =====================================================
       SINGLE NOTIFICATION
    ===================================================== */

    const notificationId =
      parsePositiveId(
        payload.id ??
          payload.notification_id ??
          payload.notificationId
      );

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Notification ID is required.',
        },
        { status: 400 }
      );
    }

    let isRead = true;

    if (
      typeof payload.is_read === 'boolean'
    ) {
      isRead = payload.is_read;
    } else if (
      typeof payload.isRead === 'boolean'
    ) {
      isRead = payload.isRead;
    } else if (
      payload.markUnread === true
    ) {
      isRead = false;
    } else if (
      payload.markRead === false
    ) {
      isRead = false;
    }

    const result = await pool.query(
      `
      UPDATE lms_parent_notifications n

      SET
        is_read = $1,

        read_at = CASE
          WHEN $1 = TRUE
            THEN COALESCE(
              n.read_at,
              CURRENT_TIMESTAMP
            )
          ELSE NULL
        END

      WHERE n.id = $2
        AND n.parent_id = $3
        AND ${ANNOUNCEMENT_VISIBILITY_SQL}

      RETURNING
        n.id,
        n.parent_id,
        n.application_id,
        n.announcement_id,
        n.title,
        n.message,
        n.type,
        n.link,
        n.is_read,
        n.created_by,
        n.created_at,
        n.read_at
      `,
      [
        isRead,
        notificationId,
        parentId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Notification not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isRead
        ? 'Notification marked as read.'
        : 'Notification marked as unread.',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Parent Notifications PATCH error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to update notification.',
      },
      { status: 500 }
    );
  }
}