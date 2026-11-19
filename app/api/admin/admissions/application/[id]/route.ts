
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Resolve either:
 * 1. Numeric application database ID
 * 2. Application number, e.g. SMTC/2026/0EC71D68
 *
 * Always return the numeric applications.id because
 * admissions.application_id references that column.
 */
async function resolveApplicationId(identifier: string) {
  const value = decodeURIComponent(identifier).trim();

  if (!value) {
    return null;
  }

  if (/^\d+$/.test(value)) {
    const numericId = Number(value);

    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      return null;
    }

    const result = await pool.query(
      `SELECT id FROM applications WHERE id = $1 LIMIT 1`,
      [numericId]
    );

    return result.rows[0]?.id ?? null;
  }

  const result = await pool.query(
    `SELECT id FROM applications WHERE application_number = $1 LIMIT 1`,
    [value]
  );

  return result.rows[0]?.id ?? null;
}

/* =========================================================
   GET ADMISSION BY APPLICATION ID OR APPLICATION NUMBER
========================================================= */

export async function GET(
  request: Request,
  context: RouteContext
) {
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

    const { id: identifier } = await context.params;

    const applicationId = await resolveApplicationId(identifier);

    if (!applicationId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Application not found. Check the application ID or application number.',
        },
        { status: 404 }
      );
    }

    const result = await pool.query(
      `
        SELECT
          id,
          application_id,
          admission_number,
          application_number,
          student_name,
          course,
          intake,
          admission_date,
          admission_status,
          admission_letter_path,
          created_at,
          updated_at
        FROM admissions
        WHERE application_id = $1
        LIMIT 1
      `,
      [applicationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No admission exists for this application.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admission: result.rows[0],
    });
  } catch (error) {
    console.error('GET ADMISSION ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load admission.',
      },
      { status: 500 }
    );
  }
}
