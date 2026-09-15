import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

const ALLOWED_TYPES = [
  'general',
  'announcement',
  'admission',
  'payment',
  'document',
  'lesson',
  'assignment',
  'quiz',
  'result',
  'timetable',
  'system',
] as const;

type NotificationType =
  (typeof ALLOWED_TYPES)[number];

/* =========================================================
   HELPERS
========================================================= */

function normalizeType(
  value: unknown
): NotificationType {
  const type = String(value ?? 'general')
    .trim()
    .toLowerCase();

  if (
    ALLOWED_TYPES.includes(
      type as NotificationType
    )
  ) {
    return type as NotificationType;
  }

  return 'general';
}

function nullableString(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const valueString =
    String(value).trim();

  return valueString.length > 0
    ? valueString
    : null;
}

function parsePositiveId(
  value: unknown
): number | null {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

/* =========================================================
   STUDENT ANNOUNCEMENT TARGETING

   Global:
     program_id IS NULL
     unit_id IS NULL

   Program:
     active enrollment in the announcement program

   Unit:
     active unit enrollment

   Unit + Program:
     active unit enrollment must also belong
     to the selected program.
========================================================= */

const ANNOUNCEMENT_TARGETING_SQL = `
(
  (
    a.program_id IS NULL
    AND a.unit_id IS NULL
  )

  OR

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
`;

/* =========================================================
   SYNCHRONIZE PUBLISHED ANNOUNCEMENTS

   This ensures that published student-facing
   announcements exist in lms_student_notifications.

   Existing read state is preserved.
========================================================= */

async function syncStudentAnnouncementNotifications(
  applicationId: number
): Promise<void> {
  await pool.query(
    `
    INSERT INTO lms_student_notifications (
      application_id,
      announcement_id,
      title,
      message,
      type,
      link,
      created_by,
      created_at,
      is_read
    )

    SELECT
      $1,
      a.id,
      a.title,
      a.message,
      'announcement',
      '/student/dashboard/announcements',
      a.created_by,
      COALESCE(
        a.created_at,
        CURRENT_TIMESTAMP
      ),
      FALSE

    FROM lms_announcements a

    WHERE a.status = 'published'

      AND a.audience IN (
        'students',
        'all'
      )

      AND (
        a.publish_at IS NULL
        OR a.publish_at <= CURRENT_TIMESTAMP
      )

      AND (
        a.expires_at IS NULL
        OR a.expires_at > CURRENT_TIMESTAMP
      )

      AND ${ANNOUNCEMENT_TARGETING_SQL}

      AND NOT EXISTS (
        SELECT 1
        FROM lms_student_notifications existing

        WHERE existing.application_id = $1
          AND existing.announcement_id = a.id
      )
    `,
    [applicationId]
  );

  /* -------------------------------------------------------
     UPDATE ANNOUNCEMENT CONTENT

     If an administrator edits an announcement after it has
     already been synchronized, update the notification
     content without changing its read state.
  ------------------------------------------------------- */

  await pool.query(
    `
    UPDATE lms_student_notifications n

    SET
      title = a.title,
      message = a.message,
      type = 'announcement',
      link = '/student/dashboard/announcements',
      created_by = a.created_by

    FROM lms_announcements a

    WHERE n.application_id = $1
      AND n.announcement_id = a.id

      AND a.status = 'published'

      AND a.audience IN (
        'students',
        'all'
      )

      AND (
        a.publish_at IS NULL
        OR a.publish_at <= CURRENT_TIMESTAMP
      )

      AND (
        a.expires_at IS NULL
        OR a.expires_at > CURRENT_TIMESTAMP
      )

      AND ${ANNOUNCEMENT_TARGETING_SQL}
    `,
    [applicationId]
  );

  /* -------------------------------------------------------
     REMOVE ANNOUNCEMENT NOTIFICATIONS THAT ARE NO LONGER
     TARGETED TO THE STUDENT.

     This covers:
       - archived announcements
       - unpublished announcements
       - expired announcements
       - changed audience
       - changed program
       - changed unit
       - student no longer enrolled
  ------------------------------------------------------- */

  await pool.query(
    `
    DELETE FROM lms_student_notifications n

    WHERE n.application_id = $1
      AND n.announcement_id IS NOT NULL

      AND NOT EXISTS (
        SELECT 1
        FROM lms_announcements a

        WHERE a.id = n.announcement_id

          AND a.status = 'published'

          AND a.audience IN (
            'students',
            'all'
          )

          AND (
            a.publish_at IS NULL
            OR a.publish_at <= CURRENT_TIMESTAMP
          )

          AND (
            a.expires_at IS NULL
            OR a.expires_at > CURRENT_TIMESTAMP
          )

          AND ${ANNOUNCEMENT_TARGETING_SQL}
      )
    `,
    [applicationId]
  );
}

/* =========================================================
   GET /api/student/notifications

   Supported query parameters:

   ?limit=50
   ?type=assignment
   ?type=announcement
   ?type=all
   ?unread=true
   ?search=german
========================================================= */

export async function GET(
  request: Request
) {
  try {
    /* -------------------------------------------------------
       AUTHENTICATE STUDENT
    ------------------------------------------------------- */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const applicationId = Number(
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
        { status: 401 }
      );
    }

    /* -------------------------------------------------------
       SYNCHRONIZE ANNOUNCEMENTS FIRST
    ------------------------------------------------------- */

    await syncStudentAnnouncementNotifications(
      applicationId
    );

    /* -------------------------------------------------------
       QUERY PARAMETERS
    ------------------------------------------------------- */

    const { searchParams } =
      new URL(request.url);

    const type = nullableString(
      searchParams.get('type')
    );

    const unreadOnly =
      searchParams.get('unread') ===
      'true';

    const search = nullableString(
      searchParams.get('search')
    );

    const limitRaw = Number(
      searchParams.get('limit') ??
        50
    );

    const limit =
      Number.isInteger(
        limitRaw
      ) &&
      limitRaw > 0 &&
      limitRaw <= 100
        ? limitRaw
        : 50;

    /* -------------------------------------------------------
       BUILD CONDITIONS
    ------------------------------------------------------- */

    const values: unknown[] = [
      applicationId,
    ];

    const conditions: string[] = [
      'n.application_id = $1',
    ];

    /* -------------------------------------------------------
       FILTER BY TYPE
    ------------------------------------------------------- */

    if (
      type &&
      type !== 'all'
    ) {
      const normalizedType =
        normalizeType(type);

      values.push(
        normalizedType
      );

      conditions.push(
        `n.type = $${values.length}`
      );
    }

    /* -------------------------------------------------------
       FILTER UNREAD
    ------------------------------------------------------- */

    if (unreadOnly) {
      conditions.push(
        'n.is_read = FALSE'
      );
    }

    /* -------------------------------------------------------
       SEARCH
    ------------------------------------------------------- */

    if (search) {
      values.push(
        `%${search}%`
      );

      conditions.push(`
        (
          n.title ILIKE $${values.length}
          OR n.message ILIKE $${values.length}
          OR n.type ILIKE $${values.length}
        )
      `);
    }

    /* -------------------------------------------------------
       LIMIT
    ------------------------------------------------------- */

    values.push(limit);

    const result =
      await pool.query(
        `
        SELECT
          n.id,
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
          creator.email AS created_by_email

        FROM lms_student_notifications n

        LEFT JOIN users creator
          ON creator.id = n.created_by

        WHERE ${conditions.join(
          ' AND '
        )}

        ORDER BY
          n.created_at DESC,
          n.id DESC

        LIMIT $${values.length}
        `,
        values
      );

    /* -------------------------------------------------------
       UNREAD COUNT
    ------------------------------------------------------- */

    const unreadResult =
      await pool.query(
        `
        SELECT
          COUNT(*)::int AS count

        FROM lms_student_notifications

        WHERE application_id = $1
          AND is_read = FALSE
        `,
        [applicationId]
      );

    /* -------------------------------------------------------
       TOTAL COUNT
    ------------------------------------------------------- */

    const totalResult =
      await pool.query(
        `
        SELECT
          COUNT(*)::int AS count

        FROM lms_student_notifications

        WHERE application_id = $1
        `,
        [applicationId]
      );

    return NextResponse.json({
      success: true,
      notifications:
        result.rows,

      unreadCount:
        unreadResult.rows[0]
          ?.count ?? 0,

      totalCount:
        totalResult.rows[0]
          ?.count ?? 0,
    });
  } catch (error) {
    console.error(
      'Student Notifications GET error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load notifications.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH /api/student/notifications

   Supported operations:

   1. Mark one as read
      { id: 1, is_read: true }

   2. Mark one as unread
      { id: 1, is_read: false }

   3. Mark one as read
      { id: 1, markRead: true }

   4. Mark all as read
      { markAllRead: true }
========================================================= */

export async function PATCH(
  request: Request
) {
  try {
    /* -------------------------------------------------------
       AUTHENTICATE STUDENT
    ------------------------------------------------------- */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const applicationId = Number(
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
        { status: 401 }
      );
    }

    const body =
      await request.json();

    /* =====================================================
       MARK ALL READ
    ===================================================== */

    if (
      body.markAllRead === true
    ) {
      const result =
        await pool.query(
          `
          UPDATE lms_student_notifications

          SET
            is_read = TRUE,

            read_at = COALESCE(
              read_at,
              CURRENT_TIMESTAMP
            )

          WHERE application_id = $1
            AND is_read = FALSE

          RETURNING id
          `,
          [applicationId]
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
        body.id ??
          body.notification_id ??
          body.notificationId
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

    /* -------------------------------------------------------
       DETERMINE READ STATE
    ------------------------------------------------------- */

    let isRead = true;

    if (
      typeof body.is_read ===
      'boolean'
    ) {
      isRead = body.is_read;
    } else if (
      typeof body.isRead ===
      'boolean'
    ) {
      isRead = body.isRead;
    } else if (
      body.markUnread === true
    ) {
      isRead = false;
    } else if (
      body.markRead === false
    ) {
      isRead = false;
    }

    /* -------------------------------------------------------
       UPDATE ONLY THE STUDENT'S OWN NOTIFICATION
    ------------------------------------------------------- */

    const result =
      await pool.query(
        `
        UPDATE lms_student_notifications

        SET
          is_read = $1,

          read_at = CASE
            WHEN $1 = TRUE
              THEN COALESCE(
                read_at,
                CURRENT_TIMESTAMP
              )
            ELSE NULL
          END

        WHERE id = $2
          AND application_id = $3

        RETURNING
          id,
          application_id,
          announcement_id,
          title,
          message,
          type,
          link,
          is_read,
          created_by,
          created_at,
          read_at
        `,
        [
          isRead,
          notificationId,
          applicationId,
        ]
      );

    if (
      result.rowCount === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Notification not found or you are not authorized to modify it.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      message: isRead
        ? 'Notification marked as read.'
        : 'Notification marked as unread.',

      notification:
        result.rows[0],
    });
  } catch (error) {
    console.error(
      'Student Notifications PATCH error:',
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

/* =========================================================
   DELETE /api/student/notifications

   Example:

   DELETE /api/student/notifications?id=15

   Also supports JSON:

   {
     "id": 15
   }

   A student can ONLY delete their own notifications.
========================================================= */

export async function DELETE(
  request: Request
) {
  try {
    /* -------------------------------------------------------
       AUTHENTICATE STUDENT
    ------------------------------------------------------- */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const applicationId = Number(
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
        { status: 401 }
      );
    }

    /* -------------------------------------------------------
       GET NOTIFICATION ID
    ------------------------------------------------------- */

    const { searchParams } =
      new URL(request.url);

    let notificationId =
      parsePositiveId(
        searchParams.get('id')
      );

    /*
     * Also support JSON body for clients that prefer
     * sending DELETE requests with a request body.
     */

    if (!notificationId) {
      try {
        const body =
          await request.json();

        notificationId =
          parsePositiveId(
            body.id ??
              body.notification_id ??
              body.notificationId
          );
      } catch {
        /*
         * No JSON body.
         * Continue with query parameter.
         */
      }
    }

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

    /* -------------------------------------------------------
       DELETE ONLY THE STUDENT'S OWN NOTIFICATION
    ------------------------------------------------------- */

    const result =
      await pool.query(
        `
        DELETE FROM lms_student_notifications

        WHERE id = $1
          AND application_id = $2

        RETURNING
          id,
          announcement_id
        `,
        [
          notificationId,
          applicationId,
        ]
      );

    if (
      result.rowCount === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Notification not found or you are not authorized to delete it.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'Notification deleted successfully.',
      id: notificationId,
      announcementId:
        result.rows[0]
          ?.announcement_id ?? null,
    });
  } catch (error) {
    console.error(
      'Student Notifications DELETE error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to delete notification.',
      },
      { status: 500 }
    );
  }
}

