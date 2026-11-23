
import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const query = (
      request.nextUrl.searchParams.get('q') || ''
    ).trim();

    const searchPattern = `%${query}%`;

    const result = await pool.query(
      `
      WITH contact_records AS (
        SELECT
          a.id AS application_id,
          a.application_number,
          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          ) AS student_name,
          a.guardian_name AS name,
          NULLIF(TRIM(a.guardian_email), '') AS email,
          NULLIF(TRIM(a.guardian_mobile), '') AS phone,
          NULLIF(TRIM(a.guardian_relationship), '') AS relationship,
          'Guardian' AS contact_type
        FROM applications a
        WHERE NULLIF(TRIM(a.guardian_name), '') IS NOT NULL

        UNION ALL

        SELECT
          a.id AS application_id,
          a.application_number,
          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          ) AS student_name,
          a.sponsor_name AS name,
          NULLIF(TRIM(a.sponsor_email), '') AS email,
          NULLIF(TRIM(a.sponsor_mobile), '') AS phone,
          NULLIF(TRIM(a.sponsor_relationship), '') AS relationship,
          'Sponsor' AS contact_type
        FROM applications a
        WHERE NULLIF(TRIM(a.sponsor_name), '') IS NOT NULL
      )
      SELECT
        application_id,
        application_number,
        student_name,
        name,
        email,
        phone,
        relationship,
        contact_type
      FROM contact_records
      WHERE
        $1 = ''
        OR name ILIKE $2
        OR COALESCE(email, '') ILIKE $2
        OR COALESCE(phone, '') ILIKE $2
        OR COALESCE(student_name, '') ILIKE $2
        OR COALESCE(application_number, '') ILIKE $2
      ORDER BY name ASC, student_name ASC
      LIMIT 100
      `,
      [query, searchPattern]
    );

    return NextResponse.json({
      success: true,
      contacts: result.rows,
    });
  } catch (error) {
    console.error('PARENT CONTACTS ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to load parent and guardian contacts.',
      },
      { status: 500 }
    );
  }
}
