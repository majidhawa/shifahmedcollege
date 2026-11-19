
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Component = 'TUITION' | 'ADMIN' | 'PROGRAMME';
type Method = 'Bank' | 'M-Pesa';

const YEAR = '2026/2027';

function authError() {
  if (!requireAdmin()) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 },
    );
  }
  return null;
}

function validDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function courseMatchSql(courseExpression = '$2') {
  return `
    SELECT cfs.*
    FROM course_fee_structures cfs
    CROSS JOIN LATERAL
      unnest(cfs.course_aliases) AS aliases(alias)
    WHERE
      cfs.academic_year = $1
      AND LOWER(${courseExpression}) LIKE '%' || LOWER(aliases.alias) || '%'
    ORDER BY LENGTH(aliases.alias) DESC
    LIMIT 1
  `;
}

function totalProgrammeFee(fee: {
  billing_type: string;
  tuition_fee: string | number;
  total_terms: number;
  admin_charge: string | number;
}) {
  const tuition = Number(fee.tuition_fee);
  const admin = Number(fee.admin_charge);

  return (
    (fee.billing_type === 'PER_TERM'
      ? tuition * Number(fee.total_terms)
      : tuition) + admin
  );
}

/* =========================================================
   GET: STUDENTS, COURSE FEES, TERM PAYMENTS AND HISTORY
========================================================= */

export async function GET() {
  const denied = authError();
  if (denied) return denied;

  try {
    const studentsResult = await pool.query(
      `
      SELECT
        a.id AS application_id,
        a.application_number,
        ad.admission_number,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(' ', a.surname, a.middle_name, a.first_name)
        ) AS student_name,

        a.mobile AS phone_number,
        COALESCE(NULLIF(ad.course, ''), a.course) AS course,
        ad.intake,

        fee.id AS fee_structure_id,
        fee.course_name AS fee_course_name,
        fee.course_duration,
        fee.duration_months,
        fee.billing_type,
        fee.tuition_fee,
        fee.admin_charge,
        fee.total_terms,
        fee.terms_per_year,

        CASE
          WHEN fee.id IS NULL THEN COALESCE(fa.total_fee, 0)
          ELSE
            CASE
              WHEN fee.billing_type = 'PER_TERM'
                THEN fee.tuition_fee * fee.total_terms
              ELSE fee.tuition_fee
            END + fee.admin_charge
        END AS total_fee,

        COALESCE(paid.tuition_paid, 0) AS tuition_paid,
        COALESCE(paid.admin_paid, 0) AS admin_paid,
        COALESCE(paid.programme_paid, 0) AS programme_paid,
        COALESCE(paid.total_paid, 0) AS total_paid,

        GREATEST(
          CASE
            WHEN fee.id IS NULL THEN COALESCE(fa.total_fee, 0)
            ELSE
              CASE
                WHEN fee.billing_type = 'PER_TERM'
                  THEN fee.tuition_fee * fee.total_terms
                ELSE fee.tuition_fee
              END + fee.admin_charge
          END - COALESCE(paid.total_paid, 0),
          0
        ) AS balance,

        COALESCE(fa.academic_current_term, 1) AS academic_current_term,
        COALESCE(fa.academic_completed_terms, 0) AS academic_completed_terms,
        COALESCE(fa.academic_progress_percent, 0) AS academic_progress_percent,
        COALESCE(fa.academic_status, 'IN_PROGRESS') AS academic_status,
        fa.course_start_date,
        fa.expected_completion_date,

        COALESCE(term_data.term_payments, '[]'::json) AS term_payments,
        COALESCE(paid.unallocated_tuition, 0) AS unallocated_tuition,

        (fee.id IS NOT NULL) AS fee_configured

      FROM admissions ad
      INNER JOIN applications a
        ON a.id = ad.application_id

      LEFT JOIN student_fee_accounts fa
        ON fa.application_id = a.id

    LEFT JOIN LATERAL (
  ${courseMatchSql("COALESCE(NULLIF(ad.course, ''), a.course)")}
) fee ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(amount_paid) FILTER (
            WHERE payment_component = 'TUITION'
          ), 0) AS tuition_paid,

          COALESCE(SUM(amount_paid) FILTER (
            WHERE payment_component = 'ADMIN'
          ), 0) AS admin_paid,

          COALESCE(SUM(amount_paid) FILTER (
            WHERE payment_component = 'PROGRAMME'
          ), 0) AS programme_paid,

          COALESCE(SUM(amount_paid), 0) AS total_paid,

          COALESCE(SUM(amount_paid) FILTER (
            WHERE payment_component = 'TUITION'
              AND term_number IS NULL
          ), 0) AS unallocated_tuition

        FROM student_fee_payments
        WHERE application_id = a.id
      ) paid ON TRUE

      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'term_number', term_number,
            'amount_paid', amount_paid
          ) ORDER BY term_number
        ) AS term_payments
        FROM (
          SELECT
            term_number,
            SUM(amount_paid) AS amount_paid
          FROM student_fee_payments
          WHERE
            application_id = a.id
            AND payment_component = 'TUITION'
            AND term_number IS NOT NULL
          GROUP BY term_number
        ) grouped_terms
      ) term_data ON TRUE

      WHERE
        ad.admission_number IS NOT NULL
        AND BTRIM(ad.admission_number) <> ''

      ORDER BY student_name ASC
      `,
      [YEAR],
    );

    const paymentsResult = await pool.query(`
      SELECT
        fp.id,
        fp.receipt_number,
        fp.application_id,
        fp.mpesa_code AS reference_code,
        fp.mpesa_code,
        fp.phone_number,
        fp.amount_paid,
        fp.payment_method,
        fp.payment_date,
        fp.payment_component,
        fp.term_number,

        ad.admission_number,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(' ', a.surname, a.middle_name, a.first_name)
        ) AS student_name,

        COALESCE(NULLIF(ad.course, ''), a.course) AS course

      FROM student_fee_payments fp
      INNER JOIN applications a ON a.id = fp.application_id
      INNER JOIN admissions ad ON ad.application_id = a.id

      ORDER BY fp.payment_date DESC, fp.id DESC
      LIMIT 500
    `);

    const totalsResult = await pool.query(`
      SELECT
        COUNT(*)::INTEGER AS transactions,
        COALESCE(SUM(amount_paid), 0) AS total_collected
      FROM student_fee_payments
    `);

    const billedResult = await pool.query(
      `
      SELECT COALESCE(SUM(
        CASE
          WHEN fee.id IS NULL THEN COALESCE(fa.total_fee, 0)
          WHEN fee.billing_type = 'PER_TERM'
            THEN fee.tuition_fee * fee.total_terms + fee.admin_charge
          ELSE fee.tuition_fee + fee.admin_charge
        END
      ), 0) AS total_billed

      FROM admissions ad
      INNER JOIN applications a ON a.id = ad.application_id
      LEFT JOIN student_fee_accounts fa ON fa.application_id = a.id

     LEFT JOIN LATERAL (
  ${courseMatchSql("COALESCE(NULLIF(ad.course, ''), a.course)")}
) fee ON TRUE

      WHERE
        ad.admission_number IS NOT NULL
        AND BTRIM(ad.admission_number) <> ''
      `,
      [YEAR],
    );

    return NextResponse.json({
      success: true,
      students: studentsResult.rows,
      payments: paymentsResult.rows,
      summary: {
        transactions: Number(totalsResult.rows[0]?.transactions || 0),
        total_collected: Number(totalsResult.rows[0]?.total_collected || 0),
        total_billed: Number(billedResult.rows[0]?.total_billed || 0),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/fees:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to load fee records.' },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST: RECORD PAYMENT
========================================================= */

export async function POST(request: NextRequest) {
  const denied = authError();
  if (denied) return denied;

  const client = await pool.connect();
  let begun = false;

  try {
    const body = await request.json();

    const applicationId = Number(body.applicationId);
    const amount = Number(body.amountPaid);
    const method = body.paymentMethod as Method;
    const component = body.paymentComponent as Component;
    const termNumber =
      body.termNumber === null || body.termNumber === undefined
        ? null
        : Number(body.termNumber);

    const reference = String(body.referenceCode || '')
      .trim()
      .toUpperCase();

    const paidDate = validDate(body.paymentDate);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Select a valid student.' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Enter a valid payment amount.' },
        { status: 400 },
      );
    }

    if (!['Bank', 'M-Pesa'].includes(method)) {
      return NextResponse.json(
        { success: false, message: 'Select Bank or M-Pesa.' },
        { status: 400 },
      );
    }

    if (!['TUITION', 'ADMIN', 'PROGRAMME'].includes(component)) {
      return NextResponse.json(
        { success: false, message: 'Select a valid payment category.' },
        { status: 400 },
      );
    }

    if (!/^[A-Z0-9-]{4,40}$/.test(reference)) {
      return NextResponse.json(
        { success: false, message: 'Enter a valid transaction/reference code.' },
        { status: 400 },
      );
    }

    if (!paidDate) {
      return NextResponse.json(
        { success: false, message: 'Select the date paid.' },
        { status: 400 },
      );
    }

    await client.query('BEGIN');
    begun = true;

    const studentResult = await client.query(
      `
      SELECT
        a.id,
        a.mobile,
        ad.admission_number,
        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(' ', a.surname, a.middle_name, a.first_name)
        ) AS student_name,
        COALESCE(NULLIF(ad.course, ''), a.course) AS course

      FROM applications a
      INNER JOIN admissions ad ON ad.application_id = a.id
      WHERE a.id = $1
      LIMIT 1
      FOR UPDATE OF a
      `,
      [applicationId],
    );

    if (!studentResult.rows.length) {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        { success: false, message: 'Student record not found.' },
        { status: 404 },
      );
    }

    const student = studentResult.rows[0];

    const feeResult = await client.query(
      courseMatchSql(),
      [YEAR, student.course || ''],
    );

    if (!feeResult.rows.length) {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        {
          success: false,
          message: `No approved fee structure is configured for ${student.course}.`,
        },
        { status: 400 },
      );
    }

    const fee = feeResult.rows[0];
    const tuition = Number(fee.tuition_fee);
    const admin = Number(fee.admin_charge);
    const totalFee = totalProgrammeFee(fee);

    if (component === 'ADMIN' && admin <= 0) {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        {
          success: false,
          message: 'This programme does not have an administrative charge.',
        },
        { status: 400 },
      );
    }

    if (component === 'PROGRAMME' && fee.billing_type !== 'ONE_TIME') {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        {
          success: false,
          message: 'This course is billed by academic term, not as a one-time programme.',
        },
        { status: 400 },
      );
    }

    if (component === 'TUITION' && fee.billing_type !== 'PER_TERM') {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        {
          success: false,
          message: 'This course uses a one-time programme tuition fee.',
        },
        { status: 400 },
      );
    }

    if (
      component === 'TUITION' &&
      (!Number.isInteger(termNumber) ||
        termNumber! < 1 ||
        termNumber! > Number(fee.total_terms))
    ) {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        {
          success: false,
          message: `Select a valid term between 1 and ${fee.total_terms}.`,
        },
        { status: 400 },
      );
    }

    if (component !== 'TUITION' && termNumber !== null) {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        {
          success: false,
          message: 'A term should only be selected for term tuition payments.',
        },
        { status: 400 },
      );
    }

    const accountResult = await client.query(
      `
      INSERT INTO student_fee_accounts (
        application_id,
        total_fee,
        course_fee_structure_id
      )
      VALUES ($1, $2, $3)

      ON CONFLICT (application_id)
      DO UPDATE SET
        total_fee = EXCLUDED.total_fee,
        course_fee_structure_id = EXCLUDED.course_fee_structure_id,
        updated_at = NOW()

      RETURNING id
      `,
      [applicationId, totalFee, fee.id],
    );

    const accountId = accountResult.rows[0].id;

    const allocationResult = await client.query(
      `
      SELECT COALESCE(SUM(amount_paid), 0) AS paid
      FROM student_fee_payments
      WHERE
        application_id = $1
        AND payment_component = $2
        AND (
          ($2 = 'TUITION' AND term_number = $3)
          OR ($2 <> 'TUITION' AND term_number IS NULL)
        )
      `,
      [applicationId, component, termNumber],
    );

    const alreadyAllocated = Number(allocationResult.rows[0].paid || 0);

    let allocationLimit = 0;

    if (component === 'ADMIN') {
      allocationLimit = admin;
    } else if (component === 'PROGRAMME') {
      allocationLimit = tuition;
    } else {
      allocationLimit = tuition;
    }

    const remaining = Math.max(allocationLimit - alreadyAllocated, 0);

    if (amount > remaining) {
      await client.query('ROLLBACK');
      begun = false;

      return NextResponse.json(
        {
          success: false,
          message: `The amount exceeds the outstanding amount for this allocation: KSh ${remaining.toLocaleString('en-KE')}.`,
        },
        { status: 400 },
      );
    }

    const receiptNumber =
      `SMTC-FEE-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const paymentResult = await client.query(
      `
      INSERT INTO student_fee_payments (
        receipt_number,
        application_id,
        fee_account_id,
        mpesa_code,
        phone_number,
        amount_paid,
        payment_method,
        payment_date,
        payment_component,
        term_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10)

      RETURNING
        id,
        receipt_number,
        mpesa_code,
        amount_paid,
        payment_method,
        payment_date,
        payment_component,
        term_number
      `,
      [
        receiptNumber,
        applicationId,
        accountId,
        reference,
        student.mobile || '',
        amount,
        method,
        paidDate,
        component,
        termNumber,
      ],
    );

    await client.query('COMMIT');
    begun = false;

    return NextResponse.json(
      {
        success: true,
        message: 'Student payment recorded successfully.',
        payment: {
          ...paymentResult.rows[0],
          reference_code: reference,
          student_name: student.student_name,
          admission_number: student.admission_number,
          course: student.course,
          total_fee: totalFee,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (begun) await client.query('ROLLBACK');

    const pgError = error as { code?: string };

    if (pgError.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          message: 'This transaction/reference code has already been recorded.',
        },
        { status: 409 },
      );
    }

    console.error('POST /api/admin/fees:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to record payment.' },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   PATCH: UPDATE ACADEMIC COURSE COMPLETION
========================================================= */

export async function PATCH(request: NextRequest) {
  const denied = authError();
  if (denied) return denied;

  try {
    const body = await request.json();

    const applicationId = Number(body.applicationId);
    const currentTerm = Number(body.currentTerm);
    const completedTerms = Number(body.completedTerms);
    const progress = Number(body.progressPercent);
    const status = String(body.status || 'IN_PROGRESS');

    const startDate = body.courseStartDate
      ? validDate(body.courseStartDate)
      : null;

    const completionDate = body.expectedCompletionDate
      ? validDate(body.expectedCompletionDate)
      : null;

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid student.' },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(currentTerm) ||
      currentTerm < 1 ||
      !Number.isInteger(completedTerms) ||
      completedTerms < 0
    ) {
      return NextResponse.json(
        { success: false, message: 'Enter valid academic term progress.' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return NextResponse.json(
        { success: false, message: 'Progress must be between 0 and 100.' },
        { status: 400 },
      );
    }

    if (!['IN_PROGRESS', 'COMPLETED', 'SUSPENDED', 'WITHDRAWN'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid academic status.' },
        { status: 400 },
      );
    }

    if (status === 'COMPLETED' && progress !== 100) {
      return NextResponse.json(
        { success: false, message: 'A completed course must have 100% progress.' },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const studentResult = await client.query(
        `
        SELECT
          a.id,
          COALESCE(NULLIF(ad.course, ''), a.course) AS course
        FROM applications a
        INNER JOIN admissions ad ON ad.application_id = a.id
        WHERE a.id = $1
        FOR UPDATE OF a
        `,
        [applicationId],
      );

      if (!studentResult.rows.length) {
        await client.query('ROLLBACK');

        return NextResponse.json(
          { success: false, message: 'Student not found.' },
          { status: 404 },
        );
      }

      const feeResult = await client.query(
        courseMatchSql(),
        [YEAR, studentResult.rows[0].course || ''],
      );

      const maxTerms = Number(feeResult.rows[0]?.total_terms || 0);

      if (maxTerms > 0 && (currentTerm > maxTerms || completedTerms > maxTerms)) {
        await client.query('ROLLBACK');

        return NextResponse.json(
          { success: false, message: `This course has ${maxTerms} terms.` },
          { status: 400 },
        );
      }

      if (maxTerms > 0 && completedTerms >= currentTerm && status !== 'COMPLETED') {
        await client.query('ROLLBACK');

        return NextResponse.json(
          { success: false, message: 'Current term must be after the completed terms.' },
          { status: 400 },
        );
      }

      const fee = feeResult.rows[0];

      if (!fee) {
        await client.query('ROLLBACK');

        return NextResponse.json(
          { success: false, message: 'Course fee structure not found.' },
          { status: 400 },
        );
      }

      const accountTotal = totalProgrammeFee(fee);

      await client.query(
        `
        INSERT INTO student_fee_accounts (
          application_id,
          total_fee,
          course_fee_structure_id,
          academic_current_term,
          academic_completed_terms,
          academic_progress_percent,
          academic_status,
          course_start_date,
          expected_completion_date,
          academic_updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())

        ON CONFLICT (application_id)
        DO UPDATE SET
          total_fee = EXCLUDED.total_fee,
          course_fee_structure_id = EXCLUDED.course_fee_structure_id,
          academic_current_term = EXCLUDED.academic_current_term,
          academic_completed_terms = EXCLUDED.academic_completed_terms,
          academic_progress_percent = EXCLUDED.academic_progress_percent,
          academic_status = EXCLUDED.academic_status,
          course_start_date = EXCLUDED.course_start_date,
          expected_completion_date = EXCLUDED.expected_completion_date,
          academic_updated_at = NOW()
        `,
        [
          applicationId,
          accountTotal,
          fee.id,
          currentTerm,
          completedTerms,
          progress,
          status,
          startDate,
          completionDate,
        ],
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Academic progress updated successfully.',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('PATCH /api/admin/fees:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to update academic progress.' },
      { status: 500 },
    );
  }
}
