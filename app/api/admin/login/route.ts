
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import pool from '@/lib/db';
import { createAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/* =========================================================
   POST /api/admin/login
========================================================= */

export async function POST(request: Request) {
  try {
    /* =====================================================
       READ REQUEST
    ===================================================== */

    let body: {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

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

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const password =
      typeof body.password === 'string'
        ? body.password
        : '';

    const rememberMe = body.rememberMe === true;

    /* =====================================================
       VALIDATE INPUT
    ===================================================== */

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please enter your email address and password.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       FIND ADMINISTRATOR AUTHENTICATION RECORD
    ===================================================== */

    let adminResult = await pool.query(
      `
        SELECT
          id,
          name,
          email,
          password_hash,
          role,
          is_active
        FROM public.admin_users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email]
    );

    let admin = adminResult.rows[0];

    /* =====================================================
       FALLBACK: CHECK MAIN USERS TABLE

       Manage Users currently creates administrator accounts
       in public.users.

       If the administrator does not yet exist in
       admin_users, provision the authentication record here.
    ===================================================== */

    if (!admin) {
      const userResult = await pool.query(
        `
          SELECT
            id,
            name,
            email,
            password_hash,
            role,
            active
          FROM public.users
          WHERE LOWER(email) = LOWER($1)
            AND role = 'admin'
          LIMIT 1
        `,
        [email]
      );

      if (userResult.rows.length > 0) {
        const existingUser = userResult.rows[0];

        if (!existingUser.active) {
          return NextResponse.json(
            {
              success: false,
              message: 'This administrator account has been disabled.',
            },
            { status: 403 }
          );
        }

        /*
         * Verify the password before provisioning the
         * administrator authentication record.
         */

        const passwordMatches = await bcrypt.compare(
          password,
          existingUser.password_hash
        );

        if (!passwordMatches) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid email or password.',
            },
            { status: 401 }
          );
        }

        /*
         * Copy the existing password hash.
         * Do not hash the password again.
         */

        const provisionResult = await pool.query(
          `
            INSERT INTO public.admin_users (
              name,
              email,
              password_hash,
              role,
              is_active
            )
            VALUES ($1, $2, $3, 'admin', $4)

            RETURNING
              id,
              name,
              email,
              password_hash,
              role,
              is_active
          `,
          [
            existingUser.name,
            existingUser.email,
            existingUser.password_hash,
            existingUser.active,
          ]
        );

        admin = provisionResult.rows[0];
      }
    }

    /* =====================================================
       ADMINISTRATOR NOT FOUND
    ===================================================== */

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       CHECK ACCOUNT STATUS
    ===================================================== */

    if (!admin.is_active) {
      return NextResponse.json(
        {
          success: false,
          message: 'This administrator account has been disabled.',
        },
        { status: 403 }
      );
    }

    /* =====================================================
       VERIFY PASSWORD

       Skip duplicate verification if this request already
       verified the password during fallback provisioning.
    ===================================================== */

    if (adminResult.rows.length > 0) {
      const passwordMatches = await bcrypt.compare(
        password,
        admin.password_hash
      );

      if (!passwordMatches) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid email or password.',
          },
          { status: 401 }
        );
      }
    }

    /* =====================================================
       UPDATE LAST LOGIN
    ===================================================== */

    await pool.query(
      `
        UPDATE public.admin_users
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [admin.id]
    );

    /* =====================================================
       CREATE ADMINISTRATOR SESSION
    ===================================================== */

    await createAdminSession({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin',
      rememberMe,
    });

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('ADMIN LOGIN ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to process login. Please try again.',
      },
      { status: 500 }
    );
  }
}
