import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminRequired() {
  const admin = requireAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 },
    );
  }

  return null;
}

/* =========================================================
   GET STUDENTS AND FEE PAYMENT RECORDS
========================================================= */

export async function GET() {
  const authError = adminRequired();

  if (authError) return authError;

  try {
    const studentsResult = await pool.query(`
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

        COALESCE(fa.total_fee, 0) AS total_fee,

        COALESCE(
          SUM(fp.amount_paid),
          0
        ) AS total_paid,

        GREATEST(
          COALESCE(fa.total_fee, 0) - COALESCE(SUM(fp.amount_paid), 0),
          0
        ) AS balance

      FROM admissions ad

      INNER JOIN applications a
        ON a.id = ad.application_id

      LEFT JOIN student_fee_accounts fa
        ON fa.application_id = a.id

      LEFT JOIN student_fee_payments fp
        ON fp.application_id = a.id

      WHERE
        ad.admission_number IS NOT NULL
        AND BTRIM(ad.admission_number) <> ''

      GROUP BY
        a.id,
        a.application_number,
        a.surname,
        a.middle_name,
        a.first_name,
        a.mobile,
        a.course,
        ad.admission_number,
        ad.student_name,
        ad.course,
        ad.intake,
        fa.total_fee

      ORDER BY student_name ASC
    `);

    const paymentsResult = await pool.query(`
      SELECT
        fp.id,
        fp.receipt_number,
        fp.application_id,
        fp.mpesa_code,
        fp.phone_number,
        fp.amount_paid,
        fp.payment_method,
        fp.payment_date,

        ad.admission_number,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(' ', a.surname, a.middle_name, a.first_name)
        ) AS student_name,

        COALESCE(NULLIF(ad.course, ''), a.course) AS course

      FROM student_fee_payments fp

      INNER JOIN applications a
        ON a.id = fp.application_id

      INNER JOIN admissions ad
        ON ad.application_id = a.id

      ORDER BY fp.payment_date DESC
      LIMIT 500
    `);

    const totalsResult = await pool.query(`
      SELECT
        COUNT(*)::INTEGER AS transactions,
        COALESCE(SUM(amount_paid), 0) AS total_collected
      FROM student_fee_payments
    `);

    const billedResult = await pool.query(`
      SELECT
        COALESCE(SUM(total_fee), 0) AS total_billed
      FROM student_fee_accounts
    `);

    return NextResponse.json({
      success: true,
      students: studentsResult.rows,
      payments: paymentsResult.rows,
      summary: {
        transactions: Number(totalsResult.rows[0]?.transactions || 0),
        total_collected: Number(
          totalsResult.rows[0]?.total_collected || 0,
        ),
        total_billed: Number(
          billedResult.rows[0]?.total_billed || 0,
        ),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/fees error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load student fee records.',
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   RECORD A STUDENT PAYMENT
========================================================= */

export async function POST(request: NextRequest) {
  const authError = adminRequired();

  if (authError) return authError;

  const client = await pool.connect();

  try {
    const body = await request.json();

    const applicationId = Number(body.applicationId);
    const totalFee = Number(body.totalFee);
    const amountPaid = Number(body.amountPaid);
    const mpesaCode = String(body.mpesaCode || '')
      .trim()
      .toUpperCase();

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        { success: false, message: 'Select a valid student.' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(totalFee) || totalFee < 0) {
      return NextResponse.json(
        { success: false, message: 'Enter a valid total course fee.' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return NextResponse.json(
        { success: false, message: 'Enter a valid payment amount.' },
        { status: 400 },
      );
    }

    if (!/^[A-Z0-9]{6,30}$/.test(mpesaCode)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid M-Pesa transaction code.',
        },
        { status: 400 },
      );
    }

    await client.query('BEGIN');

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

        INNER JOIN admissions ad
          ON ad.application_id = a.id

        WHERE a.id = $1
        LIMIT 1
        FOR UPDATE OF a
      `,
      [applicationId],
    );

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        { success: false, message: 'Student record was not found.' },
        { status: 404 },
      );
    }

    const student = studentResult.rows[0];

    const accountResult = await client.query(
      `
        INSERT INTO student_fee_accounts (
          application_id,
          total_fee
        )
        VALUES ($1, $2)

        ON CONFLICT (application_id)
        DO UPDATE SET
          total_fee = EXCLUDED.total_fee,
          updated_at = NOW()

        RETURNING id, total_fee
      `,
      [applicationId, totalFee],
    );

    const feeAccount = accountResult.rows[0];

    const paidResult = await client.query(
      `
        SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
        FROM student_fee_payments
        WHERE application_id = $1
      `,
      [applicationId],
    );

    const alreadyPaid = Number(paidResult.rows[0].total_paid);

    if (alreadyPaid + amountPaid > Number(feeAccount.total_fee)) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message:
            `This payment exceeds the remaining balance of KSh ${
              Math.max(Number(feeAccount.total_fee) - alreadyPaid, 0)
                .toLocaleString('en-KE')
            }.`,
        },
        { status: 400 },
      );
    }

    const receiptNumber =
      `SMTC-FEE-${Date.now()}-${randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

    const paymentResult = await client.query(
      `
        INSERT INTO student_fee_payments (
          receipt_number,
          application_id,
          fee_account_id,
          mpesa_code,
          phone_number,
          amount_paid,
          payment_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'M-Pesa')

        RETURNING
          id,
          receipt_number,
          mpesa_code,
          amount_paid,
          phone_number,
          payment_date
      `,
      [
        receiptNumber,
        applicationId,
        feeAccount.id,
        mpesaCode,
        student.mobile || '',
        amountPaid,
      ],
    );

    const payment = paymentResult.rows[0];

    await client.query('COMMIT');

    const newTotalPaid = alreadyPaid + amountPaid;

    return NextResponse.json(
      {
        success: true,
        message: 'Student payment recorded successfully.',
        payment: {
          ...payment,
          student_name: student.student_name,
          admission_number: student.admission_number,
          course: student.course,
          total_fee: Number(feeAccount.total_fee),
          total_paid: newTotalPaid,
          balance: Number(feeAccount.total_fee) - newTotalPaid,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    await client.query('ROLLBACK');

    const pgError = error as { code?: string };

    if (pgError.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          message:
            'This M-Pesa transaction code has already been recorded.',
        },
        { status: 409 },
      );
    }

    console.error('POST /api/admin/fees error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to record student payment.',
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}