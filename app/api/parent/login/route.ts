
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import pool from '@/lib/db';
import { createParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';

/* =========================================================
   POST /api/parent/login
========================================================= */

export async function POST(request: Request) {
  try {
    /* =====================================================
       READ REQUEST
    ===================================================== */

    let body: unknown;

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
       EXTRACT VALUES
    ===================================================== */

    const data = body as {
      identifier?: unknown;
      password?: unknown;
      rememberMe?: unknown;
    };

    const identifier = String(data.identifier || '')
      .trim()
      .toLowerCase();

    const password = String(data.password || '');

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please enter your email address or phone number.',
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please enter your password.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       NORMALIZE PHONE NUMBER

       Supports:
       0712345678
       254712345678
       +254712345678
    ===================================================== */

    const normalizedIdentifier = identifier.replace(/\s+/g, '');

    const phoneDigits = normalizedIdentifier.replace(/\D/g, '');

    const phoneVariants = new Set<string>();

    if (phoneDigits) {
      phoneVariants.add(phoneDigits);

      if (phoneDigits.startsWith('0')) {
        phoneVariants.add(
          `254${phoneDigits.substring(1)}`
        );
      }

      if (phoneDigits.startsWith('254')) {
        phoneVariants.add(
          `0${phoneDigits.substring(3)}`
        );
      }
    }

    const phoneValues = Array.from(phoneVariants);

    /* =====================================================
       FIND PARENT

       Email is OPTIONAL.

       Login can use:
       - Email address
       - Phone number

       users table uses active, NOT status.
    ===================================================== */

    const result = await pool.query(
      `
        SELECT
          id,
          name,
          email,
          phone,
          password_hash,
          role,
          active
        FROM users
        WHERE
          role = 'parent'
          AND active = true
          AND (
            LOWER(TRIM(COALESCE(email, ''))) = $1
            OR REGEXP_REPLACE(
              COALESCE(phone, ''),
              '[^0-9]',
              '',
              'g'
            ) = ANY($2::text[])
          )
        LIMIT 1
      `,
      [
        normalizedIdentifier,
        phoneValues,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email/phone or password.',
        },
        { status: 401 }
      );
    }

    const parent = result.rows[0];

    /* =====================================================
       VERIFY PASSWORD
    ===================================================== */

    if (!parent.password_hash) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Parent account is not configured correctly. Please contact the college.',
        },
        { status: 500 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      parent.password_hash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email/phone or password.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       CHECK LINKED STUDENTS

       parent_students.parent_id
       references users.id.
    ===================================================== */

    const studentsResult = await pool.query(
      `
        SELECT
          ps.id,
          ps.parent_id,
          ps.application_id,
          ps.relationship,
          ps.is_primary,

          a.application_number,

          a.first_name,
          a.middle_name,
          a.surname,

          a.mobile,
          a.email,

          a.course,
          a.intake,

          a.application_status,
          a.payment_status

        FROM parent_students ps

        INNER JOIN applications a
          ON a.id = ps.application_id

        WHERE
          ps.parent_id = $1

        ORDER BY
          ps.is_primary DESC,
          a.created_at DESC
      `,
      [parent.id]
    );

    if (studentsResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Your parent account has not been linked to any student yet. Please contact the college.',
        },
        { status: 403 }
      );
    }

    /* =====================================================
       CREATE SESSION

       Parent ID is the source of truth.
       Email is OPTIONAL.
    ===================================================== */

    await createParentSession(
      Number(parent.id),
      parent.email || null
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      message: 'Parent login successful.',

      parent: {
        id: parent.id,
        name: parent.name,
        email: parent.email || null,
        phone: parent.phone,
        role: parent.role,
      },

      students: studentsResult.rows,
    });
  } catch (error) {
    console.error('PARENT LOGIN ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to login. Please try again.',
      },
      { status: 500 }
    );
  }
}
