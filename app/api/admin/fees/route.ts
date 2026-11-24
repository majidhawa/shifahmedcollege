import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import type { PoolClient } from 'pg';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES AND CONFIGURATION
========================================================= */

type Component =
  | 'TUITION'
  | 'ADMIN'
  | 'PROGRAMME'
  | 'UNIFORM'
  | 'SCRUB';

type Method = 'Bank' | 'M-Pesa';

const YEAR = '2026/2027';

const VALID_COMPONENTS: Component[] = [
  'TUITION',
  'ADMIN',
  'PROGRAMME',
  'UNIFORM',
  'SCRUB',
];

const VALID_METHODS: Method[] = ['Bank', 'M-Pesa'];

const VALID_ACADEMIC_STATUSES = [
  'IN_PROGRESS',
  'COMPLETED',
  'SUSPENDED',
  'WITHDRAWN',
] as const;

/* =========================================================
   COMMON HELPERS
========================================================= */

function authError() {
  if (!requireAdmin()) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized.',
      },
      { status: 401 },
    );
  }

  return null;
}

function validDate(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
    ? value
    : null;
}

/**
 * COURSE FEE STRUCTURE LOOKUP
 *
 * $1 = Academic year
 * $2 = Course name
 *
 * This query is standalone and must not reference
 * aliases from another SQL query.
 */
function courseMatchSql() {
  return `
    SELECT cfs.*
    FROM course_fee_structures cfs

    CROSS JOIN LATERAL
      unnest(cfs.course_aliases) AS aliases(alias)

    WHERE
      cfs.academic_year = $1
      AND NULLIF(BTRIM(aliases.alias), '') IS NOT NULL
      AND LOWER($2) LIKE '%' || LOWER(BTRIM(aliases.alias)) || '%'

    ORDER BY LENGTH(BTRIM(aliases.alias)) DESC

    LIMIT 1
  `;
}

/**
 * Calculate the complete programme fee.
 *
 * PER_TERM:
 * Tuition × total terms + admin charge
 *
 * ONE_TIME:
 * Programme tuition + admin charge
 */
function totalProgrammeFee(fee: {
  billing_type: string;
  tuition_fee: string | number;
  total_terms: number;
  admin_charge: string | number;
}) {
  const tuition = Number(fee.tuition_fee);
  const admin = Number(fee.admin_charge);

  const totalTuition =
    fee.billing_type === 'PER_TERM'
      ? tuition * Number(fee.total_terms)
      : tuition;

  return totalTuition + admin;
}

/**
 * Get the allocation limit for a payment category.
 *
 * UNIFORM and SCRUB use the amounts selected for the
 * individual student in student_fee_accounts.
 */
function getAllocationLimit(
  component: Component,
  amounts: {
    tuition: number;
    admin: number;
    uniform: number;
    scrub: number;
  },
) {
  switch (component) {
    case 'ADMIN':
      return amounts.admin;

    case 'PROGRAMME':
    case 'TUITION':
      return amounts.tuition;

    case 'UNIFORM':
      return amounts.uniform;

    case 'SCRUB':
      return amounts.scrub;

    default:
      return 0;
  }
}

/**
 * Validate whether the selected category is available
 * for the student and programme.
 */
function validatePaymentCategory(
  component: Component,
  fee: {
    billing_type: string;
    total_terms: number;
  },
  amounts: {
    admin: number;
    uniform: number;
    scrub: number;
  },
  termNumber: number | null,
): string | null {
  if (component === 'ADMIN' && amounts.admin <= 0) {
    return 'This programme does not have an administrative charge.';
  }

  if (
    component === 'PROGRAMME' &&
    fee.billing_type !== 'ONE_TIME'
  ) {
    return 'This course is billed by academic term, not as a one-time programme.';
  }

  if (
    component === 'TUITION' &&
    fee.billing_type !== 'PER_TERM'
  ) {
    return 'This course uses a one-time programme tuition fee. Select Programme instead.';
  }

  if (
    component === 'TUITION' &&
    (
      termNumber === null ||
      !Number.isInteger(termNumber) ||
      termNumber < 1 ||
      termNumber > Number(fee.total_terms)
    )
  ) {
    return `Select a valid term between 1 and ${fee.total_terms}.`;
  }

  if (component === 'UNIFORM' && amounts.uniform <= 0) {
    return 'Uniform has not been selected or added to this student’s charges.';
  }

  if (component === 'SCRUB' && amounts.scrub <= 0) {
    return 'Scrub has not been selected or added to this student’s charges.';
  }

  return null;
}

/**
 * Roll back a transaction and return a JSON error response.
 */
async function rollbackResponse(
  client: PoolClient,
  message: string,
  status = 400,
) {
  await client.query('ROLLBACK');

  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

/* =========================================================
   GET: STUDENTS, COURSE FEES, TERM PAYMENTS AND HISTORY
========================================================= */

export async function GET() {
  const denied = authError();
  if (denied) return denied;

  try {
    /**
     * STUDENT FEE RECORDS
     */
    const studentsResult = await pool.query(
      `
      SELECT
        a.id AS application_id,
        a.application_number,
        ad.admission_number,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(
            ' ',
            a.surname,
            a.middle_name,
            a.first_name
          )
        ) AS student_name,

        a.mobile AS phone_number,

        COALESCE(
          NULLIF(ad.course, ''),
          a.course
        ) AS course,

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

        COALESCE(fa.application_fee, 1500) AS application_fee,
        COALESCE(fa.application_fee_paid, 1500) AS application_fee_paid,

        COALESCE(fa.uniform_fee, 0) AS uniform_fee,
        COALESCE(fa.scrub_fee, 0) AS scrub_fee,

        (
          CASE
            WHEN fee.id IS NULL
              THEN COALESCE(fa.total_fee, 0)

            WHEN fee.billing_type = 'PER_TERM'
              THEN (fee.tuition_fee * fee.total_terms) + fee.admin_charge

            ELSE fee.tuition_fee + fee.admin_charge
          END
          + COALESCE(fa.application_fee, 1500)
          + COALESCE(fa.uniform_fee, 0)
          + COALESCE(fa.scrub_fee, 0)
        ) AS total_fee,

        COALESCE(paid.tuition_paid, 0) AS tuition_paid,
        COALESCE(paid.admin_paid, 0) AS admin_paid,
        COALESCE(paid.programme_paid, 0) AS programme_paid,
        COALESCE(paid.uniform_paid, 0) AS uniform_paid,
        COALESCE(paid.scrub_paid, 0) AS scrub_paid,

        (
          COALESCE(paid.total_paid, 0)
          + COALESCE(fa.application_fee_paid, 1500)
        ) AS total_paid,

        GREATEST(
          CASE
            WHEN fee.id IS NULL
              THEN COALESCE(fa.total_fee, 0)

            WHEN fee.billing_type = 'PER_TERM'
              THEN (fee.tuition_fee * fee.total_terms) + fee.admin_charge

            ELSE fee.tuition_fee + fee.admin_charge
          END
          + COALESCE(fa.application_fee, 1500)
          + COALESCE(fa.uniform_fee, 0)
          + COALESCE(fa.scrub_fee, 0)
          - COALESCE(paid.total_paid, 0)
          - COALESCE(fa.application_fee_paid, 1500),
          0
        ) AS balance,

        COALESCE(
          fa.academic_current_term,
          1
        ) AS academic_current_term,

        COALESCE(
          fa.academic_completed_terms,
          0
        ) AS academic_completed_terms,

        COALESCE(
          fa.academic_progress_percent,
          0
        ) AS academic_progress_percent,

        COALESCE(
          fa.academic_status,
          'IN_PROGRESS'
        ) AS academic_status,

        fa.course_start_date,
        fa.expected_completion_date,

        COALESCE(
          term_data.term_payments,
          '[]'::json
        ) AS term_payments,

        COALESCE(
          paid.unallocated_tuition,
          0
        ) AS unallocated_tuition,

        (fee.id IS NOT NULL) AS fee_configured

      FROM admissions ad

      INNER JOIN applications a
        ON a.id = ad.application_id

      LEFT JOIN student_fee_accounts fa
        ON fa.application_id = a.id

      /**
       * COURSE FEE STRUCTURE
       */
      LEFT JOIN LATERAL (
        SELECT cfs.*
        FROM course_fee_structures cfs

        CROSS JOIN LATERAL
          unnest(cfs.course_aliases) AS aliases(alias)

        WHERE
          cfs.academic_year = $1

          AND NULLIF(
            BTRIM(aliases.alias),
            ''
          ) IS NOT NULL

          AND LOWER(
            COALESCE(
              NULLIF(ad.course, ''),
              a.course,
              ''
            )
          ) LIKE '%' || LOWER(
            BTRIM(aliases.alias)
          ) || '%'

        ORDER BY LENGTH(
          BTRIM(aliases.alias)
        ) DESC

        LIMIT 1
      ) fee ON TRUE

      /**
       * PAYMENT TOTALS
       *
       * Each payment category is calculated separately.
       */
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            SUM(amount_paid) FILTER (
              WHERE payment_component = 'TUITION'
            ),
            0
          ) AS tuition_paid,

          COALESCE(
            SUM(amount_paid) FILTER (
              WHERE payment_component = 'ADMIN'
            ),
            0
          ) AS admin_paid,

          COALESCE(
            SUM(amount_paid) FILTER (
              WHERE payment_component = 'PROGRAMME'
            ),
            0
          ) AS programme_paid,

          COALESCE(
            SUM(amount_paid) FILTER (
              WHERE payment_component = 'UNIFORM'
            ),
            0
          ) AS uniform_paid,

          COALESCE(
            SUM(amount_paid) FILTER (
              WHERE payment_component = 'SCRUB'
            ),
            0
          ) AS scrub_paid,

          COALESCE(
            SUM(amount_paid),
            0
          ) AS total_paid,

          COALESCE(
            SUM(amount_paid) FILTER (
              WHERE
                payment_component = 'TUITION'
                AND term_number IS NULL
            ),
            0
          ) AS unallocated_tuition

        FROM student_fee_payments

        WHERE application_id = a.id
      ) paid ON TRUE

      /**
       * TERM PAYMENT BREAKDOWN
       */
      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'term_number',
              term_number,

              'amount_paid',
              amount_paid
            )
            ORDER BY term_number
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

    /**
     * PAYMENT HISTORY
     */
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
        fp.recorded_at,

        fp.payment_component,
        fp.term_number,

        ad.admission_number,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(
            ' ',
            a.surname,
            a.middle_name,
            a.first_name
          )
        ) AS student_name,

        COALESCE(
          NULLIF(ad.course, ''),
          a.course
        ) AS course

      FROM student_fee_payments fp

      INNER JOIN applications a
        ON a.id = fp.application_id

      INNER JOIN admissions ad
        ON ad.application_id = a.id

      ORDER BY
        COALESCE(fp.payment_date, fp.recorded_at::date) DESC,
        fp.id DESC

      LIMIT 500
    `);

    /**
     * COLLECTION TOTALS
     */
    const totalsResult = await pool.query(`
      SELECT
        (
          SELECT COUNT(*)::INTEGER
          FROM student_fee_payments
        ) AS transactions,

        (
          COALESCE(
            (
              SELECT SUM(amount_paid)
              FROM student_fee_payments
            ),
            0
          )
          +
          COALESCE(
            (
              SELECT SUM(
                COALESCE(fa.application_fee_paid, 1500)
              )
              FROM admissions ad

              INNER JOIN applications a
                ON a.id = ad.application_id

              LEFT JOIN student_fee_accounts fa
                ON fa.application_id = a.id

              WHERE
                ad.admission_number IS NOT NULL
                AND BTRIM(ad.admission_number) <> ''
            ),
            0
          )
        ) AS total_collected
    `);

    /**
     * TOTAL BILLED FEES
     */
    const billedResult = await pool.query(
      `
      SELECT
        COALESCE(
          SUM(
            (
              CASE
                WHEN fee.id IS NULL
                  THEN COALESCE(fa.total_fee, 0)

                WHEN fee.billing_type = 'PER_TERM'
                  THEN (fee.tuition_fee * fee.total_terms) + fee.admin_charge

                ELSE fee.tuition_fee + fee.admin_charge
              END
              + COALESCE(fa.application_fee, 1500)
              + COALESCE(fa.uniform_fee, 0)
              + COALESCE(fa.scrub_fee, 0)
            )
          ),
          0
        ) AS total_billed

      FROM admissions ad

      INNER JOIN applications a
        ON a.id = ad.application_id

      LEFT JOIN student_fee_accounts fa
        ON fa.application_id = a.id

      LEFT JOIN LATERAL (
        SELECT cfs.*
        FROM course_fee_structures cfs

        CROSS JOIN LATERAL
          unnest(cfs.course_aliases) AS aliases(alias)

        WHERE
          cfs.academic_year = $1

          AND NULLIF(
            BTRIM(aliases.alias),
            ''
          ) IS NOT NULL

          AND LOWER(
            COALESCE(
              NULLIF(ad.course, ''),
              a.course,
              ''
            )
          ) LIKE '%' || LOWER(
            BTRIM(aliases.alias)
          ) || '%'

        ORDER BY LENGTH(
          BTRIM(aliases.alias)
        ) DESC

        LIMIT 1
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
        transactions: Number(
          totalsResult.rows[0]?.transactions || 0,
        ),

        total_collected: Number(
          totalsResult.rows[0]?.total_collected || 0,
        ),

        total_billed: Number(
          billedResult.rows[0]?.total_billed || 0,
        ),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/fees:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load fee records.',
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST: RECORD STUDENT PAYMENT
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
      body.termNumber === null ||
      body.termNumber === undefined ||
      body.termNumber === ''
        ? null
        : Number(body.termNumber);

    const reference = String(
      body.referenceCode || '',
    )
      .trim()
      .toUpperCase();

    const paidDate = validDate(body.paymentDate);

    /* ---------------- VALIDATION ---------------- */

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select a valid student.',
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid payment amount.',
        },
        { status: 400 },
      );
    }

    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select Bank or M-Pesa.',
        },
        { status: 400 },
      );
    }

    if (!VALID_COMPONENTS.includes(component)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select a valid payment category.',
        },
        { status: 400 },
      );
    }

    if (!/^[A-Z0-9-]{4,40}$/.test(reference)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid transaction/reference code.',
        },
        { status: 400 },
      );
    }

    if (!paidDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select the date paid.',
        },
        { status: 400 },
      );
    }

    if (
      component === 'TUITION' &&
      (
        termNumber === null ||
        !Number.isInteger(termNumber) ||
        termNumber < 1
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select a valid academic term.',
        },
        { status: 400 },
      );
    }

    if (
      component !== 'TUITION' &&
      termNumber !== null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'A term should only be selected for term tuition payments.',
        },
        { status: 400 },
      );
    }

    await client.query('BEGIN');
    begun = true;

    /* ---------------- FIND AND LOCK STUDENT ---------------- */

    const studentResult = await client.query(
      `
      SELECT
        a.id,
        a.mobile,

        ad.admission_number,

        COALESCE(
          NULLIF(ad.student_name, ''),
          CONCAT_WS(
            ' ',
            a.surname,
            a.middle_name,
            a.first_name
          )
        ) AS student_name,

        COALESCE(
          NULLIF(ad.course, ''),
          a.course
        ) AS course

      FROM applications a

      INNER JOIN admissions ad
        ON ad.application_id = a.id

      WHERE
        a.id = $1
        AND ad.admission_number IS NOT NULL
        AND BTRIM(ad.admission_number) <> ''

      LIMIT 1

      FOR UPDATE OF a
      `,
      [applicationId],
    );

    if (!studentResult.rows.length) {
      return await rollbackResponse(
        client,
        'Student record not found.',
        404,
      );
    }

    const student = studentResult.rows[0];

    /* ---------------- COURSE FEE STRUCTURE ---------------- */

    const feeResult = await client.query(
      courseMatchSql(),
      [
        YEAR,
        student.course || '',
      ],
    );

    if (!feeResult.rows.length) {
      return await rollbackResponse(
        client,
        `No approved fee structure is configured for ${student.course}.`,
      );
    }

    const fee = feeResult.rows[0];

    const tuition = Number(fee.tuition_fee);
    const admin = Number(fee.admin_charge);
    const totalTerms = Number(fee.total_terms);

    const totalFee = totalProgrammeFee(fee);

    if (
      !Number.isFinite(tuition) ||
      tuition < 0 ||
      !Number.isFinite(admin) ||
      admin < 0 ||
      !Number.isFinite(totalTerms) ||
      totalTerms < 0
    ) {
      return await rollbackResponse(
        client,
        'The configured course fee structure contains invalid amounts.',
      );
    }

    /* ---------------- CREATE OR UPDATE FEE ACCOUNT ---------------- */

    /**
     * IMPORTANT:
     * Do not overwrite uniform_fee or scrub_fee here.
     * Those amounts are selected separately for each student.
     */
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

      RETURNING
        id,
        COALESCE(uniform_fee, 0) AS uniform_fee,
        COALESCE(scrub_fee, 0) AS scrub_fee
      `,
      [
        applicationId,
        totalFee,
        fee.id,
      ],
    );

    const account = accountResult.rows[0];
    const accountId = account.id;

    const uniformFee = Number(account.uniform_fee || 0);
    const scrubFee = Number(account.scrub_fee || 0);

    /* ---------------- CATEGORY VALIDATION ---------------- */

    const categoryError = validatePaymentCategory(
      component,
      fee,
      {
        admin,
        uniform: uniformFee,
        scrub: scrubFee,
      },
      termNumber,
    );

    if (categoryError) {
      return await rollbackResponse(
        client,
        categoryError,
      );
    }

    /* ---------------- CHECK EXISTING ALLOCATION ---------------- */

    /**
     * ADMIN:
     * One administrative allocation for the programme.
     *
     * PROGRAMME:
     * One allocation for one-time programme tuition.
     *
     * TUITION:
     * Separate allocation for each academic term.
     *
     * UNIFORM:
     * One allocation for the selected uniform charge.
     *
     * SCRUB:
     * One allocation for the selected scrub charge.
     */
    const allocationResult = await client.query(
      `
      SELECT
        COALESCE(
          SUM(amount_paid),
          0
        ) AS paid

      FROM student_fee_payments

      WHERE
        application_id = $1
        AND payment_component = $2

        AND (
          (
            $2 = 'TUITION'
            AND term_number = $3
          )

          OR

          (
            $2 <> 'TUITION'
            AND term_number IS NULL
          )
        )
      `,
      [
        applicationId,
        component,
        termNumber,
      ],
    );

    const alreadyAllocated = Number(
      allocationResult.rows[0]?.paid || 0,
    );

    /* ---------------- DETERMINE PAYMENT LIMIT ---------------- */

    const allocationLimit = getAllocationLimit(
      component,
      {
        tuition,
        admin,
        uniform: uniformFee,
        scrub: scrubFee,
      },
    );

    const remaining = Math.max(
      allocationLimit - alreadyAllocated,
      0,
    );

    if (amount > remaining) {
      return await rollbackResponse(
        client,
        `The amount exceeds the outstanding amount for this allocation: KSh ${remaining.toLocaleString('en-KE')}.`,
      );
    }

    /* ---------------- GENERATE RECEIPT NUMBER ---------------- */

    const receiptNumber =
      `SMTC-FEE-${Date.now()}-${randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

    /* ---------------- RECORD PAYMENT ---------------- */

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

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::date,
        $9,
        $10
      )

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

    /* ---------------- COMMIT ---------------- */

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
    if (begun) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'POST /api/admin/fees rollback error:',
          rollbackError,
        );
      }
    }

    const pgError = error as {
      code?: string;
      message?: string;
      detail?: string;
    };

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
      {
        success: false,
        message: 'Failed to record payment.',
      },
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

  const client = await pool.connect();

  let begun = false;

  try {
    const body = await request.json();

    const applicationId = Number(body.applicationId);

    const currentTerm = Number(body.currentTerm);

    const completedTerms = Number(body.completedTerms);

    const progress = Number(body.progressPercent);

    const status = String(
      body.status || 'IN_PROGRESS',
    );

    const startDate = body.courseStartDate
      ? validDate(body.courseStartDate)
      : null;

    const completionDate = body.expectedCompletionDate
      ? validDate(body.expectedCompletionDate)
      : null;

    /* ---------------- VALIDATION ---------------- */

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid student.',
        },
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
        {
          success: false,
          message: 'Enter valid academic term progress.',
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Progress must be between 0 and 100.',
        },
        { status: 400 },
      );
    }

    if (
      !VALID_ACADEMIC_STATUSES.includes(
        status as (typeof VALID_ACADEMIC_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid academic status.',
        },
        { status: 400 },
      );
    }

    if (
      status === 'COMPLETED' &&
      progress !== 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'A completed course must have 100% progress.',
        },
        { status: 400 },
      );
    }

    await client.query('BEGIN');
    begun = true;

    /* ---------------- FIND AND LOCK STUDENT ---------------- */

    const studentResult = await client.query(
      `
      SELECT
        a.id,

        COALESCE(
          NULLIF(ad.course, ''),
          a.course
        ) AS course

      FROM applications a

      INNER JOIN admissions ad
        ON ad.application_id = a.id

      WHERE a.id = $1

      FOR UPDATE OF a
      `,
      [applicationId],
    );

    if (!studentResult.rows.length) {
      return await rollbackResponse(
        client,
        'Student not found.',
        404,
      );
    }

    /* ---------------- COURSE FEE STRUCTURE ---------------- */

    const feeResult = await client.query(
      courseMatchSql(),
      [
        YEAR,
        studentResult.rows[0].course || '',
      ],
    );

    const fee = feeResult.rows[0];

    if (!fee) {
      return await rollbackResponse(
        client,
        'Course fee structure not found.',
      );
    }

    const maxTerms = Number(
      fee.total_terms || 0,
    );

    /* ---------------- TERM VALIDATION ---------------- */

    if (
      maxTerms > 0 &&
      (
        currentTerm > maxTerms ||
        completedTerms > maxTerms
      )
    ) {
      return await rollbackResponse(
        client,
        `This course has ${maxTerms} terms.`,
      );
    }

    if (
      maxTerms > 0 &&
      completedTerms >= currentTerm &&
      status !== 'COMPLETED'
    ) {
      return await rollbackResponse(
        client,
        'Current term must be after the completed terms.',
      );
    }

    /* ---------------- CALCULATE COURSE FEE ---------------- */

    const accountTotal = totalProgrammeFee(fee);

    /* ---------------- UPDATE ACADEMIC PROGRESS ---------------- */

    /**
     * This updates academic progress only.
     * It does not change selected uniform or scrub charges.
     */
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

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        NOW()
      )

      ON CONFLICT (application_id)

      DO UPDATE SET
        total_fee = EXCLUDED.total_fee,

        course_fee_structure_id =
          EXCLUDED.course_fee_structure_id,

        academic_current_term =
          EXCLUDED.academic_current_term,

        academic_completed_terms =
          EXCLUDED.academic_completed_terms,

        academic_progress_percent =
          EXCLUDED.academic_progress_percent,

        academic_status =
          EXCLUDED.academic_status,

        course_start_date =
          EXCLUDED.course_start_date,

        expected_completion_date =
          EXCLUDED.expected_completion_date,

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
    begun = false;

    return NextResponse.json({
      success: true,
      message: 'Academic progress updated successfully.',
    });
  } catch (error) {
    if (begun) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'PATCH /api/admin/fees rollback error:',
          rollbackError,
        );
      }
    }

    console.error('PATCH /api/admin/fees:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update academic progress.',
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   PUT: EDIT AN EXISTING STUDENT FEE PAYMENT
========================================================= */

export async function PUT(request: NextRequest) {
  const denied = authError();
  if (denied) return denied;

  const client = await pool.connect();

  let begun = false;

  try {
    const body = await request.json();

    const paymentId = Number(body.id);
    const amount = Number(body.amountPaid);

    const method = body.paymentMethod as Method;
    const component = body.paymentComponent as Component;

    const reference = String(body.referenceCode || '')
      .trim()
      .toUpperCase();

    const phoneNumber = String(body.phoneNumber || '').trim();
    const paidDate = validDate(body.paymentDate);

    const termNumber =
      body.termNumber === null ||
      body.termNumber === undefined ||
      body.termNumber === ''
        ? null
        : Number(body.termNumber);

    /* ---------------- VALIDATION ---------------- */

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payment record.',
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid payment amount.',
        },
        { status: 400 },
      );
    }

    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select Bank or M-Pesa.',
        },
        { status: 400 },
      );
    }

    if (!VALID_COMPONENTS.includes(component)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select a valid payment category.',
        },
        { status: 400 },
      );
    }

    if (!/^[A-Z0-9-]{4,40}$/.test(reference)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid transaction/reference code (4–40 letters, numbers or hyphens).',
        },
        { status: 400 },
      );
    }

    if (!paidDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select a valid payment date.',
        },
        { status: 400 },
      );
    }

    if (
      phoneNumber &&
      !/^\+?[0-9\s-]{7,20}$/.test(phoneNumber)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Enter a valid phone number.',
        },
        { status: 400 },
      );
    }

    if (
      component === 'TUITION' &&
      (
        termNumber === null ||
        !Number.isInteger(termNumber) ||
        termNumber < 1
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Select a valid academic term.',
        },
        { status: 400 },
      );
    }

    if (
      component !== 'TUITION' &&
      termNumber !== null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'A term should only be selected for tuition payments.',
        },
        { status: 400 },
      );
    }

    await client.query('BEGIN');
    begun = true;

    /* ---------------- LOCK PAYMENT AND STUDENT ---------------- */

    const paymentResult = await client.query(
      `
      SELECT
        fp.id,
        fp.application_id,
        fp.fee_account_id,
        fp.amount_paid,
        fp.payment_component,
        fp.term_number,

        a.mobile,

        COALESCE(
          NULLIF(ad.course, ''),
          a.course
        ) AS course

      FROM student_fee_payments fp

      INNER JOIN applications a
        ON a.id = fp.application_id

      INNER JOIN admissions ad
        ON ad.application_id = a.id

      WHERE fp.id = $1

      LIMIT 1

      FOR UPDATE OF fp, a
      `,
      [paymentId],
    );

    if (!paymentResult.rows.length) {
      return await rollbackResponse(
        client,
        'Payment record not found.',
        404,
      );
    }

    const existingPayment = paymentResult.rows[0];

    const applicationId = Number(
      existingPayment.application_id,
    );

    /* ---------------- CHECK DUPLICATE REFERENCE ---------------- */

    const duplicateResult = await client.query(
      `
      SELECT id
      FROM student_fee_payments

      WHERE
        UPPER(BTRIM(mpesa_code)) = $1
        AND id <> $2

      LIMIT 1
      `,
      [
        reference,
        paymentId,
      ],
    );

    if (duplicateResult.rows.length) {
      return await rollbackResponse(
        client,
        'This transaction/reference code is already in use.',
        409,
      );
    }

    /* ---------------- COURSE FEE STRUCTURE ---------------- */

    const feeResult = await client.query(
      courseMatchSql(),
      [
        YEAR,
        existingPayment.course || '',
      ],
    );

    if (!feeResult.rows.length) {
      return await rollbackResponse(
        client,
        `No approved fee structure is configured for ${existingPayment.course || 'this course'}.`,
      );
    }

    const fee = feeResult.rows[0];

    const tuition = Number(fee.tuition_fee);
    const admin = Number(fee.admin_charge);
    const totalTerms = Number(fee.total_terms);

    if (
      !Number.isFinite(tuition) ||
      tuition < 0 ||
      !Number.isFinite(admin) ||
      admin < 0 ||
      !Number.isFinite(totalTerms) ||
      totalTerms < 0
    ) {
      return await rollbackResponse(
        client,
        'The configured course fee structure contains invalid amounts.',
      );
    }

    /* ---------------- GET STUDENT FEE ACCOUNT ---------------- */

    /**
     * The selected Uniform and Scrub amounts must come
     * from this student's fee account.
     *
     * Locking the row also prevents concurrent edits to
     * the selected additional charges during this update.
     */
    const accountCheckResult = await client.query(
      `
      SELECT
        id,

        COALESCE(uniform_fee, 0) AS uniform_fee,
        COALESCE(scrub_fee, 0) AS scrub_fee

      FROM student_fee_accounts

      WHERE application_id = $1

      LIMIT 1

      FOR UPDATE
      `,
      [applicationId],
    );

    if (!accountCheckResult.rows.length) {
      return await rollbackResponse(
        client,
        'The student fee account could not be found. Add the student fee account before recording this payment.',
      );
    }

    const existingAccount = accountCheckResult.rows[0];

    const uniformFee = Number(
      existingAccount.uniform_fee || 0,
    );

    const scrubFee = Number(
      existingAccount.scrub_fee || 0,
    );

    /* ---------------- CATEGORY VALIDATION ---------------- */

    const categoryError = validatePaymentCategory(
      component,
      fee,
      {
        admin,
        uniform: uniformFee,
        scrub: scrubFee,
      },
      termNumber,
    );

    if (categoryError) {
      return await rollbackResponse(
        client,
        categoryError,
      );
    }

    /* ---------------- DETERMINE ALLOCATION LIMIT ---------------- */

    const allocationLimit = getAllocationLimit(
      component,
      {
        tuition,
        admin,
        uniform: uniformFee,
        scrub: scrubFee,
      },
    );

    /**
     * Exclude the payment being edited from the allocation.
     * This ensures its existing amount does not count against
     * the new amount.
     */
    const allocationResult = await client.query(
      `
      SELECT
        COALESCE(
          SUM(amount_paid),
          0
        ) AS paid

      FROM student_fee_payments

      WHERE
        application_id = $1
        AND payment_component = $2
        AND id <> $3

        AND (
          (
            $2 = 'TUITION'
            AND term_number = $4
          )

          OR

          (
            $2 <> 'TUITION'
            AND term_number IS NULL
          )
        )
      `,
      [
        applicationId,
        component,
        paymentId,
        termNumber,
      ],
    );

    const alreadyAllocated = Number(
      allocationResult.rows[0]?.paid || 0,
    );

    const remaining = Math.max(
      allocationLimit - alreadyAllocated,
      0,
    );

    if (amount > remaining) {
      return await rollbackResponse(
        client,
        `The amount exceeds the outstanding allocation: KSh ${remaining.toLocaleString('en-KE')}.`,
      );
    }

    /* ---------------- UPDATE FEE ACCOUNT ---------------- */

    const totalFee = totalProgrammeFee(fee);

    /**
     * Update the programme fee structure without changing
     * the student's selected uniform or scrub charges.
     */
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
      [
        applicationId,
        totalFee,
        fee.id,
      ],
    );

    const accountId = accountResult.rows[0].id;

    /* ---------------- UPDATE PAYMENT ---------------- */

    const updatedResult = await client.query(
      `
      UPDATE student_fee_payments

      SET
        fee_account_id = $1,
        mpesa_code = $2,
        phone_number = $3,
        amount_paid = $4,
        payment_method = $5,
        payment_date = $6::date,
        payment_component = $7,
        term_number = $8

      WHERE id = $9

      RETURNING
        id,
        receipt_number,
        application_id,
        fee_account_id,
        mpesa_code,
        phone_number,
        amount_paid,
        payment_method,
        payment_date,
        payment_component,
        term_number,
        recorded_at
      `,
      [
        accountId,
        reference,
        phoneNumber || existingPayment.mobile || '',
        amount,
        method,
        paidDate,
        component,
        termNumber,
        paymentId,
      ],
    );

    await client.query('COMMIT');
    begun = false;

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully.',
      payment: updatedResult.rows[0],
    });
  } catch (error: unknown) {
    if (begun) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'PUT /api/admin/fees rollback error:',
          rollbackError,
        );
      }
    }

    const pgError = error as {
      code?: string;
    };

    if (pgError.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          message: 'This transaction/reference code already exists.',
        },
        { status: 409 },
      );
    }

    console.error('PUT /api/admin/fees:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update payment.',
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE: DELETE AN INDIVIDUAL STUDENT FEE PAYMENT
========================================================= */

export async function DELETE(request: NextRequest) {
  const denied = authError();
  if (denied) return denied;

  const client = await pool.connect();

  let begun = false;

  try {
    const { searchParams } = new URL(request.url);

    const paymentId = Number(
      searchParams.get('id'),
    );

    if (
      !Number.isInteger(paymentId) ||
      paymentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payment record.',
        },
        { status: 400 },
      );
    }

    await client.query('BEGIN');
    begun = true;

    const paymentResult = await client.query(
      `
      SELECT
        id,
        receipt_number,
        application_id,
        amount_paid

      FROM student_fee_payments

      WHERE id = $1

      FOR UPDATE
      `,
      [paymentId],
    );

    if (!paymentResult.rows.length) {
      return await rollbackResponse(
        client,
        'Payment record not found.',
        404,
      );
    }

    const payment = paymentResult.rows[0];

    /**
     * Delete only the selected transaction.
     * The application, admission and fee account remain intact.
     *
     * This also restores the outstanding balance for
     * Uniform and Scrub when either payment is deleted.
     */
    await client.query(
      `
      DELETE FROM student_fee_payments
      WHERE id = $1
      `,
      [paymentId],
    );

    await client.query('COMMIT');
    begun = false;

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully.',

      deleted: {
        id: payment.id,
        receipt_number: payment.receipt_number,
        application_id: payment.application_id,
        amount_paid: payment.amount_paid,
      },
    });
  } catch (error) {
    if (begun) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'DELETE /api/admin/fees rollback error:',
          rollbackError,
        );
      }
    }

    console.error('DELETE /api/admin/fees:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete payment.',
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}