import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type AnnouncementStatus =
  | 'draft'
  | 'published'
  | 'archived';

type AnnouncementPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

type AnnouncementAudience =
  | 'students'
  | 'lecturers'
  | 'parents'
  | 'all';

type AnnouncementBody = {
  id?: unknown;
  title?: unknown;
  message?: unknown;
  audience?: unknown;
  priority?: unknown;
  status?: unknown;
  program_id?: unknown;
  unit_id?: unknown;
  publish_at?: unknown;
  expires_at?: unknown;
  is_pinned?: unknown;
};

type NotificationTarget = {
  parent_id: number | string;
  application_id: number | string;
};

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

function nullableNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function isValidStatus(
  value: unknown
): value is AnnouncementStatus {
  return (
    value === 'draft' ||
    value === 'published' ||
    value === 'archived'
  );
}

function isValidPriority(
  value: unknown
): value is AnnouncementPriority {
  return (
    value === 'low' ||
    value === 'normal' ||
    value === 'high' ||
    value === 'urgent'
  );
}

function isValidAudience(
  value: unknown
): value is AnnouncementAudience {
  return (
    value === 'students' ||
    value === 'lecturers' ||
    value === 'parents' ||
    value === 'all'
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
}

/* =========================================================
   GET ADMIN ID
========================================================= */

function getAdminId(admin: unknown): number {
  if (
    typeof admin !== 'object' ||
    admin === null
  ) {
    return 0;
  }

  const adminRecord =
    admin as Record<string, unknown>;

  const id =
    adminRecord.id ??
    adminRecord.user_id ??
    adminRecord.userId;

  const adminId = Number(id);

  if (
    !Number.isInteger(adminId) ||
    adminId <= 0
  ) {
    return 0;
  }

  return adminId;
}

/* =========================================================
   CREATE / SYNCHRONIZE PARENT NOTIFICATIONS
========================================================= */

async function createParentNotifications(
  client: {
    query: (
      text: string,
      values?: unknown[]
    ) => Promise<{
      rows: NotificationTarget[];
      rowCount: number | null;
    }>;
  },
  announcementId: number,
  title: string,
  message: string,
  audience: AnnouncementAudience,
  programId: number | null,
  unitId: number | null,
  adminId: number
): Promise<number> {
  /*
   * Only Parents and Everyone announcements generate
   * parent notifications.
   */
  if (
    audience !== 'parents' &&
    audience !== 'all'
  ) {
    /*
     * If the announcement was changed from Parents/Everyone
     * to Students/Lecturers, remove its old parent
     * notifications.
     */
    const deletedResult =
      await client.query(
        `
        DELETE FROM lms_parent_notifications
        WHERE announcement_id = $1
          AND type = 'announcement'
        `,
        [announcementId]
      );

    return -(deletedResult.rowCount ?? 0);
  }

  /* =====================================================
     FIND CURRENT TARGETS

     Targeting rules:

     1. GLOBAL
        program_id IS NULL
        AND unit_id IS NULL

     2. PROGRAM
        program_id IS NOT NULL
        AND unit_id IS NULL

        Child must have an active lms_enrollments record
        for that program.

     3. UNIT
        unit_id IS NOT NULL

        Child must have an active lms_enrollments record
        containing an active lms_unit_enrollments record
        for that unit.

        If program_id is also supplied, the active
        enrollment must match that program.
  ===================================================== */

  let targetsResult: {
    rows: NotificationTarget[];
    rowCount: number | null;
  };

  /* =====================================================
     GLOBAL
  ===================================================== */

  if (
    programId === null &&
    unitId === null
  ) {
    targetsResult =
      await client.query(
        `
        SELECT DISTINCT
          ps.parent_id,
          ps.application_id

        FROM parent_students ps

        INNER JOIN users parent_user
          ON parent_user.id = ps.parent_id
         AND parent_user.role = 'parent'
         AND parent_user.active = TRUE

        INNER JOIN applications app
          ON app.id = ps.application_id
        `
      );
  } else if (
    programId !== null &&
    unitId === null
  ) {
    /* =====================================================
       PROGRAM TARGET
    ===================================================== */

    targetsResult =
      await client.query(
        `
        SELECT DISTINCT
          ps.parent_id,
          ps.application_id

        FROM parent_students ps

        INNER JOIN users parent_user
          ON parent_user.id = ps.parent_id
         AND parent_user.role = 'parent'
         AND parent_user.active = TRUE

        INNER JOIN applications app
          ON app.id = ps.application_id

        INNER JOIN lms_enrollments le
          ON le.application_id = app.id

        WHERE le.enrollment_status = 'active'
          AND le.program_id = $1
        `,
        [programId]
      );
  } else {
    /* =====================================================
       UNIT TARGET

       The unit must belong to an active enrollment for the
       child's application.

       If a program is also supplied, it must match the
       enrollment's program.
    ===================================================== */

    targetsResult =
      await client.query(
        `
        SELECT DISTINCT
          ps.parent_id,
          ps.application_id

        FROM parent_students ps

        INNER JOIN users parent_user
          ON parent_user.id = ps.parent_id
         AND parent_user.role = 'parent'
         AND parent_user.active = TRUE

        INNER JOIN applications app
          ON app.id = ps.application_id

        INNER JOIN lms_enrollments le
          ON le.application_id = app.id

        INNER JOIN lms_unit_enrollments lue
          ON lue.enrollment_id = le.id

        WHERE le.enrollment_status = 'active'
          AND lue.status = 'active'
          AND lue.unit_id = $1

          AND (
            $2::integer IS NULL
            OR le.program_id = $2
          )
        `,
        [unitId, programId]
      );
  }

  const targets =
    targetsResult.rows.filter(
      (target) => {
        const parentId =
          Number(target.parent_id);

        const applicationId =
          Number(target.application_id);

        return (
          Number.isInteger(parentId) &&
          parentId > 0 &&
          Number.isInteger(applicationId) &&
          applicationId > 0
        );
      }
    );

  /* =====================================================
     REMOVE STALE NOTIFICATIONS
     
     If an announcement is edited from:

       Program A → Program B
       Unit A → Unit B
       Unit A → Global
       Global → Unit A

     parents who are no longer eligible should no longer
     retain the old notification.
     
     Their existing read/unread state is otherwise preserved.
  ===================================================== */

  if (targets.length === 0) {
    await client.query(
      `
      DELETE FROM lms_parent_notifications
      WHERE announcement_id = $1
        AND type = 'announcement'
      `,
      [announcementId]
    );
  } else {
    for (const target of targets) {
      /*
       * Existing eligible notifications are retained.
       * Only missing notifications are inserted below.
       */
    }

    /*
     * Build a temporary VALUES list safely using numbered
     * PostgreSQL parameters.
     */
    const staleValues: unknown[] = [
      announcementId,
    ];

    const targetConditions: string[] = [];

    targets.forEach(
      (target, index) => {
        const parentParameter =
          staleValues.length + 1;

        const applicationParameter =
          staleValues.length + 2;

        staleValues.push(
          Number(target.parent_id),
          Number(target.application_id)
        );

        targetConditions.push(
          `(n.parent_id = $${parentParameter} AND n.application_id = $${applicationParameter})`
        );

        void index;
      }
    );

    await client.query(
      `
      DELETE FROM lms_parent_notifications n
      WHERE n.announcement_id = $1
        AND n.type = 'announcement'
        AND NOT (
          ${targetConditions.join(' OR ')}
        )
      `,
      staleValues
    );
  }

  /* =====================================================
     CREATE / UPDATE CURRENT TARGETS
     
     Existing notifications are NOT duplicated.
     Existing notifications have their title/message updated
     when the announcement itself is edited.
     
     Their is_read/read_at values remain unchanged.
  ===================================================== */

  let notificationsCreated = 0;

  for (const target of targets) {
    const parentId =
      Number(target.parent_id);

    const applicationId =
      Number(target.application_id);

    /*
     * Update an existing notification first.
     */
    const updateResult =
      await client.query(
        `
        UPDATE lms_parent_notifications
        SET
          title = $1,
          message = $2,
          created_by = $3
        WHERE parent_id = $4
          AND application_id = $5
          AND announcement_id = $6
          AND type = 'announcement'
        `,
        [
          title,
          message,
          adminId,
          parentId,
          applicationId,
          announcementId,
        ]
      );

    /*
     * If nothing was updated, create the notification.
     */
    if (
      (updateResult.rowCount ?? 0) === 0
    ) {
      const insertResult =
        await client.query(
          `
          INSERT INTO lms_parent_notifications (
            parent_id,
            application_id,
            announcement_id,
            title,
            message,
            type,
            link,
            is_read,
            created_by,
            created_at
          )

          SELECT
            $1,
            $2,
            $3,
            $4,
            $5,
            'announcement',
            '/parent/dashboard/announcements',
            FALSE,
            $6,
            NOW()

          WHERE NOT EXISTS (
            SELECT 1
            FROM lms_parent_notifications existing

            WHERE existing.parent_id = $1
              AND existing.application_id = $2
              AND existing.announcement_id = $3
              AND existing.type = 'announcement'
          )
          `,
          [
            parentId,
            applicationId,
            announcementId,
            title,
            message,
            adminId,
          ]
        );

      if (
        (insertResult.rowCount ?? 0) > 0
      ) {
        notificationsCreated++;
      }
    }
  }

  return notificationsCreated;
}

/* =========================================================
   GET
   /api/admin/announcements
========================================================= */

export async function GET(request: Request) {
  try {
    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    const admin = requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       QUERY PARAMETERS
    ===================================================== */

    const { searchParams } =
      new URL(request.url);

    const search = cleanString(
      searchParams.get('search')
    );

    const status = cleanString(
      searchParams.get('status')
    );

    const audience = cleanString(
      searchParams.get('audience')
    );

    const priority = cleanString(
      searchParams.get('priority')
    );

    const programId = nullableNumber(
      searchParams.get('program_id')
    );

    /* =====================================================
       BUILD FILTERS
    ===================================================== */

    const conditions: string[] = [];
    const values: unknown[] = [];

    let parameterIndex = 1;

    if (search) {
      conditions.push(`
        (
          a.title ILIKE $${parameterIndex}
          OR a.message ILIKE $${parameterIndex}
          OR COALESCE(creator.name, '') ILIKE $${parameterIndex}
          OR COALESCE(creator.email, '') ILIKE $${parameterIndex}
        )
      `);

      values.push(`%${search}%`);
      parameterIndex++;
    }

    if (status) {
      if (!isValidStatus(status)) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid announcement status.',
          },
          { status: 400 }
        );
      }

      conditions.push(
        `a.status = $${parameterIndex}`
      );

      values.push(status);
      parameterIndex++;
    }

    if (audience) {
      if (!isValidAudience(audience)) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid announcement audience.',
          },
          { status: 400 }
        );
      }

      conditions.push(
        `a.audience = $${parameterIndex}`
      );

      values.push(audience);
      parameterIndex++;
    }

    if (priority) {
      if (!isValidPriority(priority)) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid announcement priority.',
          },
          { status: 400 }
        );
      }

      conditions.push(
        `a.priority = $${parameterIndex}`
      );

      values.push(priority);
      parameterIndex++;
    }

    if (programId !== null) {
      conditions.push(
        `a.program_id = $${parameterIndex}`
      );

      values.push(programId);
      parameterIndex++;
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    /* =====================================================
       GET ANNOUNCEMENTS
    ===================================================== */

    const announcementsResult =
      await pool.query(
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
          creator.email AS creator_email,

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

        ${whereClause}

        ORDER BY
          a.is_pinned DESC,
          a.created_at DESC
        `,
        values
      );

    /* =====================================================
       GET PROGRAMS
    ===================================================== */

    const programsResult =
      await pool.query(
        `
        SELECT
          id,
          name
        FROM lms_programs
        ORDER BY name ASC
        `
      );

    /* =====================================================
       GET UNITS
    ===================================================== */

    const unitsResult =
      await pool.query(
        `
        SELECT
          u.id,
          u.name,
          u.program_id,
          p.name AS program_name
        FROM lms_units u
        LEFT JOIN lms_programs p
          ON p.id = u.program_id
        ORDER BY
          p.name ASC,
          u.name ASC
        `
      );

    /* =====================================================
       STATISTICS
    ===================================================== */

    const statisticsResult =
      await pool.query(
        `
        SELECT
          COUNT(*)::int AS total,

          COUNT(*) FILTER (
            WHERE status = 'published'
          )::int AS published,

          COUNT(*) FILTER (
            WHERE status = 'draft'
          )::int AS drafts,

          COUNT(*) FILTER (
            WHERE status = 'archived'
          )::int AS archived,

          COUNT(*) FILTER (
            WHERE priority = 'urgent'
          )::int AS urgent,

          COUNT(*) FILTER (
            WHERE is_pinned = TRUE
          )::int AS pinned,

          COUNT(*) FILTER (
            WHERE audience = 'students'
          )::int AS student_announcements,

          COUNT(*) FILTER (
            WHERE audience = 'lecturers'
          )::int AS lecturer_announcements,

          COUNT(*) FILTER (
            WHERE audience = 'parents'
          )::int AS parent_announcements,

          COUNT(*) FILTER (
            WHERE audience = 'all'
          )::int AS all_announcements

        FROM lms_announcements
        `
      );

    return NextResponse.json({
      success: true,

      announcements:
        announcementsResult.rows,

      programs:
        programsResult.rows,

      units:
        unitsResult.rows,

      statistics:
        statisticsResult.rows[0] || {
          total: 0,
          published: 0,
          drafts: 0,
          archived: 0,
          urgent: 0,
          pinned: 0,
          student_announcements: 0,
          lecturer_announcements: 0,
          parent_announcements: 0,
          all_announcements: 0,
        },
    });
  } catch (error) {
    console.error(
      'GET /api/admin/announcements error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   /api/admin/announcements
========================================================= */

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    const admin = requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const adminId = getAdminId(admin);

    if (adminId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to determine administrator ID.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       READ BODY
    ===================================================== */

    let body: AnnouncementBody;

    try {
      body =
        (await request.json()) as AnnouncementBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALUES
    ===================================================== */

    const title =
      cleanString(body.title);

    const message =
      cleanString(body.message);

    const audience: AnnouncementAudience =
      isValidAudience(body.audience)
        ? body.audience
        : 'all';

    const priority: AnnouncementPriority =
      isValidPriority(body.priority)
        ? body.priority
        : 'normal';

    const status: AnnouncementStatus =
      isValidStatus(body.status)
        ? body.status
        : 'draft';

    const programId =
      nullableNumber(body.program_id);

    const unitId =
      nullableNumber(body.unit_id);

    const publishAt =
      cleanString(body.publish_at) || null;

    const expiresAt =
      cleanString(body.expires_at) || null;

    const isPinned =
      Boolean(body.is_pinned);

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement title is required.',
        },
        { status: 400 }
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement title cannot exceed 255 characters.',
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement message is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY PROGRAM
    ===================================================== */

    if (programId !== null) {
      const programCheck =
        await pool.query(
          `
          SELECT id
          FROM lms_programs
          WHERE id = $1
          LIMIT 1
          `,
          [programId]
        );

      if (programCheck.rowCount === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Selected program was not found.',
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       VERIFY UNIT
    ===================================================== */

    if (unitId !== null) {
      const unitCheck =
        await pool.query(
          `
          SELECT
            id,
            program_id
          FROM lms_units
          WHERE id = $1
          LIMIT 1
          `,
          [unitId]
        );

      if (unitCheck.rowCount === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Selected unit was not found.',
          },
          { status: 400 }
        );
      }

      if (
        programId !== null &&
        Number(
          unitCheck.rows[0].program_id
        ) !== Number(programId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The selected unit does not belong to the selected program.',
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await client.query('BEGIN');

    /* =====================================================
       INSERT ANNOUNCEMENT
    ===================================================== */

    const result =
      await client.query(
        `
        INSERT INTO lms_announcements (
          title,
          message,
          created_by,
          created_by_role,
          program_id,
          unit_id,
          audience,
          priority,
          status,
          publish_at,
          expires_at,
          is_pinned
        )
        VALUES (
          $1,
          $2,
          $3,
          'admin',
          $4,
          $5,
          $6,
          $7,
          $8,
          COALESCE($9::timestamptz, NOW()),
          $10::timestamptz,
          $11
        )
        RETURNING
          id,
          title,
          message,
          created_by,
          created_by_role,
          program_id,
          unit_id,
          audience,
          priority,
          status,
          publish_at,
          expires_at,
          is_pinned,
          created_at,
          updated_at
        `,
        [
          title,
          message,
          adminId,
          programId,
          unitId,
          audience,
          priority,
          status,
          publishAt,
          expiresAt,
          isPinned,
        ]
      );

    const announcement =
      result.rows[0];

    /* =====================================================
       CREATE PARENT NOTIFICATIONS
    ===================================================== */

    let parentNotificationsCreated = 0;

    if (
      announcement &&
      status === 'published' &&
      (
        audience === 'parents' ||
        audience === 'all'
      )
    ) {
      parentNotificationsCreated =
        await createParentNotifications(
          client,
          Number(announcement.id),
          title,
          message,
          audience,
          programId,
          unitId,
          adminId
        );
    }

    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        message:
          'Announcement created successfully.',
        announcement,
        parentNotificationsCreated,
      },
      { status: 201 }
    );
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors.
    }

    console.error(
      'POST /api/admin/announcements error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   PUT
   /api/admin/announcements
========================================================= */

export async function PUT(request: Request) {
  const client = await pool.connect();

  try {
    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    const admin = requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const adminId = getAdminId(admin);

    if (adminId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to determine administrator ID.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       READ BODY
    ===================================================== */

    let body: AnnouncementBody;

    try {
      body =
        (await request.json()) as AnnouncementBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body.',
        },
        { status: 400 }
      );
    }

    const id =
      nullableNumber(body.id);

    if (id === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement ID is required.',
        },
        { status: 400 }
      );
    }

    const title =
      cleanString(body.title);

    const message =
      cleanString(body.message);

    const audience: AnnouncementAudience =
      isValidAudience(body.audience)
        ? body.audience
        : 'all';

    const priority: AnnouncementPriority =
      isValidPriority(body.priority)
        ? body.priority
        : 'normal';

    const status: AnnouncementStatus =
      isValidStatus(body.status)
        ? body.status
        : 'draft';

    const programId =
      nullableNumber(body.program_id);

    const unitId =
      nullableNumber(body.unit_id);

    const publishAt =
      cleanString(body.publish_at) || null;

    const expiresAt =
      cleanString(body.expires_at) || null;

    const isPinned =
      Boolean(body.is_pinned);

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement title is required.',
        },
        { status: 400 }
      );
    }

    if (title.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement title cannot exceed 255 characters.',
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement message is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await client.query('BEGIN');

    /* =====================================================
       VERIFY ANNOUNCEMENT EXISTS
    ===================================================== */

    const existing =
      await client.query(
        `
        SELECT
          id
        FROM lms_announcements
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
        `,
        [id]
      );

    if (existing.rowCount === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement not found.',
        },
        { status: 404 }
      );
    }

    /* =====================================================
       VERIFY PROGRAM
    ===================================================== */

    if (programId !== null) {
      const programCheck =
        await client.query(
          `
          SELECT id
          FROM lms_programs
          WHERE id = $1
          LIMIT 1
          `,
          [programId]
        );

      if (programCheck.rowCount === 0) {
        await client.query('ROLLBACK');

        return NextResponse.json(
          {
            success: false,
            message:
              'Selected program was not found.',
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       VERIFY UNIT
    ===================================================== */

    if (unitId !== null) {
      const unitCheck =
        await client.query(
          `
          SELECT
            id,
            program_id
          FROM lms_units
          WHERE id = $1
          LIMIT 1
          `,
          [unitId]
        );

      if (unitCheck.rowCount === 0) {
        await client.query('ROLLBACK');

        return NextResponse.json(
          {
            success: false,
            message:
              'Selected unit was not found.',
          },
          { status: 400 }
        );
      }

      if (
        programId !== null &&
        Number(
          unitCheck.rows[0].program_id
        ) !== Number(programId)
      ) {
        await client.query('ROLLBACK');

        return NextResponse.json(
          {
            success: false,
            message:
              'The selected unit does not belong to the selected program.',
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       UPDATE ANNOUNCEMENT
    ===================================================== */

    const result =
      await client.query(
        `
        UPDATE lms_announcements
        SET
          title = $1,
          message = $2,
          program_id = $3,
          unit_id = $4,
          audience = $5,
          priority = $6,
          status = $7,
          publish_at =
            COALESCE(
              $8::timestamptz,
              publish_at
            ),
          expires_at =
            $9::timestamptz,
          is_pinned = $10,
          updated_at = NOW()

        WHERE id = $11

        RETURNING
          id,
          title,
          message,
          created_by,
          created_by_role,
          program_id,
          unit_id,
          audience,
          priority,
          status,
          publish_at,
          expires_at,
          is_pinned,
          created_at,
          updated_at
        `,
        [
          title,
          message,
          programId,
          unitId,
          audience,
          priority,
          status,
          publishAt,
          expiresAt,
          isPinned,
          id,
        ]
      );

    const announcement =
      result.rows[0];

    /* =====================================================
       SYNCHRONIZE PARENT NOTIFICATIONS
       
       This is important when an announcement is edited.

       Example:
         Unit A → Unit B

       Parents enrolled in Unit A will have their old
       notification removed.

       Parents enrolled in Unit B will receive a notification.

       Existing eligible notifications retain their
       read/unread state.
    ===================================================== */

    const parentNotificationsCreated =
      await createParentNotifications(
        client,
        Number(announcement.id),
        title,
        message,
        audience,
        programId,
        unitId,
        adminId
      );

    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message:
        'Announcement updated successfully.',
      announcement,
      parentNotificationsCreated,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors.
    }

    console.error(
      'PUT /api/admin/announcements error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE
   /api/admin/announcements?id=123
========================================================= */

export async function DELETE(request: Request) {
  try {
    const admin = requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id =
      nullableNumber(
        searchParams.get('id')
      );

    if (id === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement ID is required.',
        },
        { status: 400 }
      );
    }

    const result =
      await pool.query(
        `
        DELETE FROM lms_announcements
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Announcement not found.',
        },
        { status: 404 }
      );
    }

    /*
     * lms_parent_notifications.announcement_id has
     * ON DELETE CASCADE, so linked parent notifications
     * are automatically removed.
     */

    return NextResponse.json({
      success: true,
      message:
        'Announcement deleted successfully.',
      id,
    });
  } catch (error) {
    console.error(
      'DELETE /api/admin/announcements error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}