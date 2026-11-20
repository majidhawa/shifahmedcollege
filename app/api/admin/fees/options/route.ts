import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const YEAR = '2026/2027';
const APPLICATION_FEE = 1500;
const UNIFORM_FEE = 2000;
const SCRUB_FEE = 3000;

export async function POST(request: NextRequest) {
  if (!requireAdmin()) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const applicationId = Number(body.applicationId);
    const uniformSelected = body.uniformSelected === true;
    const scrubSelected = body.scrubSelected === true;
    const confirmFemaleUniform = body.confirmFemaleUniform === true;

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return NextResponse.json({ success: false, message: 'Select a valid student.' }, { status: 400 });
    }

    if (uniformSelected && !confirmFemaleUniform) {
      return NextResponse.json({ success: false, message: 'Confirm that the student is female before adding the school uniform.' }, { status: 400 });
    }

    const studentResult = await pool.query(
      `SELECT COALESCE(NULLIF(ad.course, ''), a.course) AS course
       FROM applications a
       INNER JOIN admissions ad ON ad.application_id = a.id
       WHERE a.id = $1
       LIMIT 1`,
      [applicationId],
    );

    if (!studentResult.rows.length) {
      return NextResponse.json({ success: false, message: 'Admitted student not found.' }, { status: 404 });
    }

    const course = String(studentResult.rows[0].course || '');
    const feeResult = await pool.query(
      `SELECT cfs.*
       FROM course_fee_structures cfs
       CROSS JOIN LATERAL unnest(cfs.course_aliases) AS aliases(alias)
       WHERE cfs.academic_year = $1
         AND NULLIF(BTRIM(aliases.alias), '') IS NOT NULL
         AND LOWER($2) LIKE '%' || LOWER(BTRIM(aliases.alias)) || '%'
       ORDER BY LENGTH(BTRIM(aliases.alias)) DESC
       LIMIT 1`,
      [YEAR, course],
    );

    if (!feeResult.rows.length) {
      return NextResponse.json({ success: false, message: `No approved fee structure is configured for ${course}.` }, { status: 400 });
    }

    const fee = feeResult.rows[0];
    const tuition = Number(fee.tuition_fee || 0);
    const admin = Number(fee.admin_charge || 0);
    const baseCourseFee = (fee.billing_type === 'PER_TERM' ? tuition * Number(fee.total_terms || 0) : tuition) + admin;
    const uniformAmount = uniformSelected ? UNIFORM_FEE : 0;
    const scrubAmount = scrubSelected ? SCRUB_FEE : 0;

    await pool.query(
      `INSERT INTO student_fee_accounts (
         application_id, total_fee, course_fee_structure_id,
         application_fee, application_fee_paid, uniform_fee, scrub_fee
       ) VALUES ($1, $2, $3, $4, $4, $5, $6)
       ON CONFLICT (application_id) DO UPDATE SET
         total_fee = EXCLUDED.total_fee,
         course_fee_structure_id = EXCLUDED.course_fee_structure_id,
         application_fee = EXCLUDED.application_fee,
         application_fee_paid = EXCLUDED.application_fee_paid,
         uniform_fee = EXCLUDED.uniform_fee,
         scrub_fee = EXCLUDED.scrub_fee,
         updated_at = NOW()`,
      [applicationId, baseCourseFee, fee.id, APPLICATION_FEE, uniformAmount, scrubAmount],
    );

    return NextResponse.json({
      success: true,
      message: 'Application fee and selected school items have been saved to the student fee account.',
      fees: {
        applicationFee: APPLICATION_FEE,
        uniformFee: uniformAmount,
        scrubFee: scrubAmount,
        totalAdditionalFees: APPLICATION_FEE + uniformAmount + scrubAmount,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/fees/options:', error);
    return NextResponse.json({ success: false, message: 'Unable to save student fee items.' }, { status: 500 });
  }
}
