
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ParentRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

/* -------------------------------------------------------------------------- */
/* AUTHENTICATE PARENT                                                        */
/* -------------------------------------------------------------------------- */

async function getAuthenticatedParent() {
  const session = await getParentSession();

  if (!session?.parentId) {
    return {
      error: jsonError('Your session has expired. Please log in again.', 401),
      parent: null,
    };
  }

  const result = await pool.query<ParentRow>(
    `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        active
      FROM users
      WHERE id = $1
        AND role = 'parent'
      LIMIT 1
    `,
    [session.parentId]
  );

  if (result.rows.length === 0) {
    return {
      error: jsonError('Parent account not found.', 404),
      parent: null,
    };
  }

  const parent = result.rows[0];

  if (!parent.active) {
    return {
      error: jsonError(
        'Your parent account has been deactivated. Please contact the college.',
        403
      ),
      parent: null,
    };
  }

  return {
    error: null,
    parent,
  };
}

/* -------------------------------------------------------------------------- */
/* GET /api/parent/profile                                                    */
/* Retrieve authenticated parent's profile                                   */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const { error, parent } = await getAuthenticatedParent();

    if (error || !parent) {
      return error;
    }

    return NextResponse.json({
      success: true,
      parent: {
        id: parent.id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        role: parent.role,
        active: parent.active,
      },
    });
  } catch (error) {
    console.error('PARENT PROFILE GET ERROR:', error);

    return jsonError(
      'Unable to retrieve your profile. Please try again.',
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH /api/parent/profile                                                  */
/* Update parent's personal information                                       */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: Request) {
  try {
    const { error, parent } = await getAuthenticatedParent();

    if (error || !parent) {
      return error;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid request body.', 400);
    }

    const data = body as {
      name?: unknown;
      email?: unknown;
      phone?: unknown;
    };

    const name =
      data.name === undefined
        ? parent.name
        : String(data.name).trim();

    const email =
      data.email === undefined
        ? parent.email
        : String(data.email).trim().toLowerCase();

    const phone =
      data.phone === undefined
        ? parent.phone
        : String(data.phone).trim();

    if (!name) {
      return jsonError('Please enter your full name.', 400);
    }

    if (name.length < 2 || name.length > 150) {
      return jsonError(
        'Your name must be between 2 and 150 characters.',
        400
      );
    }

    if (!email) {
      return jsonError('Please enter your email address.', 400);
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError('Please enter a valid email address.', 400);
    }

    if (phone && phone.length > 30) {
      return jsonError('Please enter a valid phone number.', 400);
    }

    // Prevent another account from using this email.
    const duplicateEmail = await pool.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
          AND id <> $2
        LIMIT 1
      `,
      [email, parent.id]
    );

    if (duplicateEmail.rows.length > 0) {
      return jsonError(
        'This email address is already being used by another account.',
        409
      );
    }

    const result = await pool.query<ParentRow>(
      `
        UPDATE users
        SET
          name = $1,
          email = $2,
          phone = $3
        WHERE id = $4
          AND role = 'parent'
          AND active = true
        RETURNING
          id,
          name,
          email,
          phone,
          role,
          active
      `,
      [
        name,
        email,
        phone || null,
        parent.id,
      ]
    );

    if (result.rows.length === 0) {
      return jsonError(
        'Unable to update your profile. Please try again.',
        400
      );
    }

    const updatedParent = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Your profile has been updated successfully.',
      parent: updatedParent,
    });
  } catch (error) {
    console.error('PARENT PROFILE UPDATE ERROR:', error);

    return jsonError(
      'Unable to update your profile. Please try again.',
      500
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST /api/parent/profile                                                   */
/* Change parent's password                                                  */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const { error, parent } = await getAuthenticatedParent();

    if (error || !parent) {
      return error;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid request body.', 400);
    }

    const data = body as {
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };

    const currentPassword = String(
      data.currentPassword || ''
    );

    const newPassword = String(
      data.newPassword || ''
    );

    const confirmPassword =
      data.confirmPassword === undefined
        ? ''
        : String(data.confirmPassword);

    if (!currentPassword || !newPassword) {
      return jsonError(
        'Please provide your current password and new password.',
        400
      );
    }

    if (newPassword.length < 8) {
      return jsonError(
        'Your new password must contain at least 8 characters.',
        400
      );
    }

    if (newPassword.length > 128) {
      return jsonError(
        'Your new password is too long.',
        400
      );
    }

    if (
      confirmPassword &&
      newPassword !== confirmPassword
    ) {
      return jsonError(
        'Your new password and confirmation do not match.',
        400
      );
    }

    // Retrieve the password hash for this authenticated parent only.
    const passwordResult = await pool.query(
      `
        SELECT password_hash
        FROM users
        WHERE id = $1
          AND role = 'parent'
          AND active = true
        LIMIT 1
      `,
      [parent.id]
    );

    if (
      passwordResult.rows.length === 0 ||
      !passwordResult.rows[0].password_hash
    ) {
      return jsonError(
        'Unable to verify your account password. Please contact the college.',
        500
      );
    }

    const passwordValid = await bcrypt.compare(
      currentPassword,
      passwordResult.rows[0].password_hash
    );

    if (!passwordValid) {
      return jsonError(
        'Your current password is incorrect.',
        401
      );
    }

    if (currentPassword === newPassword) {
      return jsonError(
        'Your new password must be different from your current password.',
        400
      );
    }

    // Use bcryptjs, matching the existing parent login implementation.
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      12
    );

    await pool.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
          AND role = 'parent'
          AND active = true
      `,
      [
        newPasswordHash,
        parent.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Your password has been changed successfully.',
    });
  } catch (error) {
    console.error('PARENT PASSWORD CHANGE ERROR:', error);

    return jsonError(
      'Unable to change your password. Please try again.',
      500
    );
  }
}
