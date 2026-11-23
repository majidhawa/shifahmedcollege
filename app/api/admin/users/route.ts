
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { linkApplicationsToParent } from '@/lib/parent-student-linking';

export const runtime = 'nodejs';

type UserRole = 'admin' | 'lecturer' | 'parent';
type UserStatus = 'active' | 'inactive';

function normalizeRole(role: unknown): UserRole | null {
  const value = String(role || '').trim().toLowerCase();

  if (
    value === 'admin' ||
    value === 'lecturer' ||
    value === 'parent'
  ) {
    return value;
  }

  return null;
}

function normalizeStatus(status: unknown): UserStatus | null {
  const value = String(status || '').trim().toLowerCase();

  if (value === 'active' || value === 'inactive') {
    return value;
  }

  return null;
}

function cleanString(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeProgramIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  return [...new Set(ids)];
}

/* =========================================================
   GET USERS
   GET /api/admin/users

   Supports:
   - Administrators
   - Lecturers
   - Parents
   - Lecturer course assignments
   - Parent linked students
   - User statistics
========================================================= */

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const search = cleanString(searchParams.get('search'));
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    /* =====================================================
       VALIDATE FILTERS
    ===================================================== */

    if (role && !normalizeRole(role)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid role. Use admin, lecturer or parent.',
        },
        { status: 400 }
      );
    }

    if (status && !normalizeStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid user status.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       BUILD DYNAMIC FILTERS
    ===================================================== */

    const conditions: string[] = [];
    const values: unknown[] = [];

    let parameterIndex = 1;

    if (search) {
      conditions.push(`
        (
          u.name ILIKE $${parameterIndex}
          OR COALESCE(u.email, '') ILIKE $${parameterIndex}
          OR COALESCE(u.phone, '') ILIKE $${parameterIndex}
        )
      `);

      values.push(`%${search}%`);
      parameterIndex++;
    }

    if (role) {
      conditions.push(`u.role = $${parameterIndex}`);

      values.push(normalizeRole(role));
      parameterIndex++;
    }

    if (status) {
      conditions.push(`u.active = $${parameterIndex}`);

      values.push(normalizeStatus(status) === 'active');
      parameterIndex++;
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    /* =====================================================
       FETCH USERS
    ===================================================== */

    const result = await pool.query(
      `
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.active,
          u.created_at,
          u.updated_at,

          COALESCE(
            ARRAY_AGG(DISTINCT lp.program_id)
              FILTER (WHERE lp.program_id IS NOT NULL),
            '{}'
          ) AS program_ids,

          COALESCE(
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'id', p.id,
                'name', p.name,
                'code', p.code
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) AS programs,

          CASE
            WHEN u.role = 'parent' THEN (
              SELECT COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'application_id', linked.application_id,
                    'student_name', linked.student_name,
                    'admission_number', linked.admission_number,
                    'application_number', linked.application_number,
                    'relationship', linked.relationship
                  )
                  ORDER BY linked.student_name
                ),
                '[]'::json
              )
              FROM (
                SELECT DISTINCT
                  a.id AS application_id,

                  COALESCE(
                    NULLIF(
                      TRIM(
                        CONCAT_WS(
                          ' ',
                          a.first_name,
                          a.surname
                        )
                      ),
                      ''
                    ),
                    'Unnamed student'
                  ) AS student_name,

                  a.admission_number,
                  a.application_number,
                  ps.relationship

                FROM public.parent_students ps

                INNER JOIN public.applications a
                  ON a.id = ps.application_id

                WHERE ps.parent_id = u.id
              ) linked
            )
            ELSE '[]'::json
          END AS linked_students,

          CASE
            WHEN u.role = 'parent' THEN (
              SELECT COUNT(DISTINCT ps.application_id)::int
              FROM public.parent_students ps
              WHERE ps.parent_id = u.id
            )
            ELSE 0
          END AS linked_students_count

        FROM public.users u

        LEFT JOIN public.lms_lecturer_programs lp
          ON lp.lecturer_id = u.id

        LEFT JOIN public.lms_programs p
          ON p.id = lp.program_id

        ${whereClause}

        GROUP BY u.id

        ORDER BY u.created_at DESC
      `,
      values
    );

    /* =====================================================
       FETCH USER STATISTICS
    ===================================================== */

    const statisticsResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE role = 'admin'
        )::int AS admins,

        COUNT(*) FILTER (
          WHERE role = 'lecturer'
        )::int AS lecturers,

        COUNT(*) FILTER (
          WHERE role = 'parent'
        )::int AS parents,

        COUNT(*) FILTER (
          WHERE active = true
        )::int AS active,

        COUNT(*) FILTER (
          WHERE active = false
        )::int AS inactive

      FROM public.users

      WHERE role IN ('admin', 'lecturer', 'parent')
    `);

    return NextResponse.json(
      {
        success: true,
        users: result.rows,
        statistics: statisticsResult.rows[0] || {
          total: 0,
          admins: 0,
          lecturers: 0,
          parents: 0,
          active: 0,
          inactive: 0,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('GET ADMIN USERS ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load users.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   CREATE USER
   POST /api/admin/users

   ADMIN:
   - Insert into public.admin_users
   - Insert into public.users
   - Use the same password hash in both tables
   - Both inserts happen in one transaction

   LECTURER:
   - Insert into public.users
   - Assign selected programmes

   PARENT:
   - Insert into public.users
   - Automatically link matching applications
========================================================= */

export async function POST(request: Request) {
  let client: PoolClient | null = null;
  let transactionStarted = false;

  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const admin = await requireAdmin();

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
       PARSE REQUEST BODY
    ===================================================== */

    let body: Record<string, unknown>;

    try {
      body = await request.json();
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
       NORMALIZE INPUT
    ===================================================== */

    const name = cleanString(body.name);

    const email = cleanString(body.email).toLowerCase() || null;

    const phone = cleanString(body.phone);

    // Do not trim passwords. Spaces may be intentional.
    const password =
      typeof body.password === 'string'
        ? body.password
        : '';

    const role = normalizeRole(body.role);

    const status = normalizeStatus(body.status || 'active');

    const programIds = normalizeProgramIds(body.programIds);

    /* =====================================================
       VALIDATE REQUIRED FIELDS
    ===================================================== */

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: 'Name is required.',
        },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          message: 'Role must be admin, lecturer or parent.',
        },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          message: 'Status must be active or inactive.',
        },
        { status: 400 }
      );
    }

    if ((role === 'admin' || role === 'lecturer') && !email) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Email address is required for administrators and lecturers.',
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password is required.',
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 8 characters.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE COURSE ASSIGNMENTS
    ===================================================== */

    if (role !== 'lecturer' && programIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Courses can only be assigned to lecturers.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CONNECT TO DATABASE
    ===================================================== */

    client = await pool.connect();

    const active = status === 'active';

    /* =====================================================
       HASH PASSWORD
    ===================================================== */

    const passwordHash = await bcrypt.hash(password, 12);

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await client.query('BEGIN');
    transactionStarted = true;

    /* =====================================================
       CHECK DUPLICATE EMAIL

       Check both account tables.

       This is important because administrator login uses
       public.admin_users, while Manage Users uses public.users.
    ===================================================== */

    if (email) {
      const existingUser = await client.query(
        `
          SELECT id
          FROM public.users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [email]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return NextResponse.json(
          {
            success: false,
            message: 'A user with this email address already exists.',
          },
          { status: 409 }
        );
      }

      const existingAdmin = await client.query(
        `
          SELECT id
          FROM public.admin_users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [email]
      );

      if (existingAdmin.rows.length > 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return NextResponse.json(
          {
            success: false,
            message:
              'This email address is already registered as an administrator.',
          },
          { status: 409 }
        );
      }
    }

    /* =====================================================
       VALIDATE LECTURER PROGRAMMES
    ===================================================== */

    if (role === 'lecturer' && programIds.length > 0) {
      const programsResult = await client.query(
        `
          SELECT id
          FROM public.lms_programs
          WHERE id = ANY($1::integer[])
        `,
        [programIds]
      );

      if (programsResult.rows.length !== programIds.length) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return NextResponse.json(
          {
            success: false,
            message: 'One or more selected courses do not exist.',
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       CREATE ADMIN AUTHENTICATION RECORD

       IMPORTANT:
       Admin login authenticates against public.admin_users.

       Therefore, every newly created administrator must
       also have an authentication record in that table.

       The password hash is identical to the one stored
       in public.users.

       Expected admin_users columns:
       id, name, email, password_hash, role, is_active,
       last_login.
    ===================================================== */

    let administratorAuthId: number | null = null;

    if (role === 'admin') {
      const adminAuthResult = await client.query(
        `
          INSERT INTO public.admin_users (
            name,
            email,
            password_hash,
            role,
            is_active
          )
          VALUES ($1, $2, $3, 'admin', $4)

          RETURNING id
        `,
        [
          name,
          email,
          passwordHash,
          active,
        ]
      );

      administratorAuthId = Number(
        adminAuthResult.rows[0].id
      );
    }

    /* =====================================================
       CREATE MAIN USER RECORD

       All roles are stored in public.users.

       This keeps Manage Users and user statistics working.
    ===================================================== */

    const userResult = await client.query(
      `
        INSERT INTO public.users (
          name,
          email,
          phone,
          password_hash,
          role,
          active
        )
        VALUES ($1, $2, $3, $4, $5, $6)

        RETURNING
          id,
          name,
          email,
          phone,
          role,
          active,
          created_at,
          updated_at
      `,
      [
        name,
        email,
        phone || null,
        passwordHash,
        role,
        active,
      ]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new Error('The user account could not be created.');
    }

    /* =====================================================
       ASSIGN PROGRAMMES TO LECTURERS
    ===================================================== */

    if (role === 'lecturer' && programIds.length > 0) {
      for (const programId of programIds) {
        await client.query(
          `
            INSERT INTO public.lms_lecturer_programs (
              lecturer_id,
              program_id
            )
            VALUES ($1, $2)

            ON CONFLICT (lecturer_id, program_id)
            DO NOTHING
          `,
          [user.id, programId]
        );
      }
    }

    /* =====================================================
       AUTOMATIC PARENT-STUDENT LINKING
    ===================================================== */

    let linkedApplicationIds: number[] = [];

    if (role === 'parent') {
      linkedApplicationIds = await linkApplicationsToParent(
        client,
        {
          parentId: Number(user.id),
        }
      );
    }

    /* =====================================================
       COMMIT TRANSACTION
    ===================================================== */

    await client.query('COMMIT');
    transactionStarted = false;

    console.log(
      `Admin ${admin.email} created user #${user.id} (${user.email || 'No email'}) with role ${user.role}.`
    );

    /* =====================================================
       RETURN CREATED USER
    ===================================================== */

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully.',

        user: {
          ...user,
          program_ids: role === 'lecturer' ? programIds : [],
          linked_applications_count: linkedApplicationIds.length,
          linked_application_ids: linkedApplicationIds,
        },

        administrator_auth:
          role === 'admin'
            ? {
                created: true,
                id: administratorAuthId,
              }
            : null,

        parent_linking: {
          attempted: role === 'parent',
          linked_count: linkedApplicationIds.length,
          application_ids: linkedApplicationIds,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    /* =====================================================
       ROLLBACK FAILED TRANSACTION
    ===================================================== */

    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
        transactionStarted = false;
      } catch (rollbackError) {
        console.error(
          'USER CREATION ROLLBACK ERROR:',
          rollbackError
        );
      }
    }

    const dbError = error as {
      code?: string;
      constraint?: string;
    };

    console.error('CREATE LMS USER ERROR:', error);

    if (dbError?.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          message: 'A user with this email already exists.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to create user.',
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
