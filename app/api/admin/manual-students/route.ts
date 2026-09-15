import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { PoolClient, QueryResult } from 'pg';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type ManualStudentBody = {
  first_name?: unknown;
  middle_name?: unknown;
  surname?: unknown;
  mobile?: unknown;
  email?: unknown;
  course?: unknown;
  intake?: unknown;
  admission_number?: unknown;
  admission_date?: unknown;
  application_fee?: unknown;
  payment_status?: unknown;
};

type CreatedApplication = {
  id: number;
  application_number: string;
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
  mobile: string | null;
  email: string | null;
  course: string;
  intake: string;
  application_fee: number | string | null;
  payment_status: string | null;
  application_status: string | null;
  created_at: string | Date;
};

type CreatedAdmission = {
  id: number;
  application_id: number;
  admission_number: string;
  application_number: string;
  student_name: string;
  course: string;
  intake: string;
  admission_date: string | Date;
  admission_status: string;
};

/* =========================================================
   CONSTANTS

   These must match the values stored by the application
   system.
========================================================= */

const ALLOWED_COURSES = [
  'EMT',
  'Diploma in Paramedicine',
  'Safe Phlebotomy',
  'German Language',
  'Caregiving Level 4',
  'Dialysis Technology',
] as const;

const ALLOWED_INTAKES = [
  'September 2026 Intake',
  'January 2027 Intake',
  'March 2027 Intake',
  'May 2027 Intake',
] as const;

const ALLOWED_PAYMENT_STATUSES = [
  'paid',
  'pending',
] as const;

/* =========================================================
   HELPERS
========================================================= */

function clean(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

/* =========================================================
   APPLICATION NUMBER

   Example:
   SMTC/2026/A1B2C3D4
========================================================= */

function generateApplicationNumber(): string {
  const year = new Date().getFullYear();

  const randomPart = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `SMTC/${year}/${randomPart}`;
}

/* =========================================================
   EMAIL VALIDATION
========================================================= */

function isValidEmail(email: string): boolean {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================================
   DATE VALIDATION
========================================================= */

function normalizeAdmissionDate(value: unknown): string {
  const raw = clean(value);

  if (!raw) {
    return new Date().toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(
      'Admission date must use the format YYYY-MM-DD.',
    );
  }

  const date = new Date(`${raw}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid admission date.');
  }

  const normalized = date.toISOString().slice(0, 10);

  if (normalized !== raw) {
    throw new Error('Invalid admission date.');
  }

  return raw;
}

/* =========================================================
   APPLICATION NUMBER COLLISION CHECK
========================================================= */

async function generateUniqueApplicationNumber(
  client: PoolClient,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const applicationNumber =
      generateApplicationNumber();

    const result = await client.query<{ id: number }>(
      `
        SELECT id
        FROM applications
        WHERE application_number = $1
        LIMIT 1
      `,
      [applicationNumber],
    );

    if (result.rows.length === 0) {
      return applicationNumber;
    }
  }

  throw new Error(
    'Unable to generate a unique application number. Please try again.',
  );
}

/* =========================================================
   FULL NAME
========================================================= */

function buildFullName(
  firstName: string,
  middleName: string,
  surname: string,
): string {
  return [
    firstName,
    middleName,
    surname,
  ]
    .filter(
      (value) => value.trim().length > 0,
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* =========================================================
   POST /api/admin/manual-students

   Creates:

   1. applications record
   2. admissions record

   The supplied admission number is preserved.
========================================================= */

export async function POST(
  request: NextRequest,
) {
  try {
    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    await requireAdmin();

    /* =====================================================
       READ JSON
    ===================================================== */

    let body: ManualStudentBody;

    try {
      body =
        (await request.json()) as ManualStudentBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON request body.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       CLEAN INPUT
    ===================================================== */

    const firstName = clean(
      body.first_name,
    );

    const middleName = clean(
      body.middle_name,
    );

    const surname = clean(
      body.surname,
    );

    const mobile = clean(
      body.mobile,
    );

    const email = clean(
      body.email,
    ).toLowerCase();

    const course = clean(
      body.course,
    );

    const intake = clean(
      body.intake,
    );

    /*
     * Only surrounding whitespace is removed.
     *
     * The actual admission number is otherwise
     * preserved exactly as supplied.
     */
    const admissionNumber = clean(
      body.admission_number,
    );

    const paymentStatus =
      clean(body.payment_status).toLowerCase() ||
      'paid';

    /* =====================================================
       BASIC VALIDATION
    ===================================================== */

    if (!firstName) {
      return NextResponse.json(
        {
          success: false,
          message: 'First name is required.',
        },
        { status: 400 },
      );
    }

    if (!surname) {
      return NextResponse.json(
        {
          success: false,
          message: 'Surname is required.',
        },
        { status: 400 },
      );
    }

    if (!mobile) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Student phone number is required because it is used for portal login.',
        },
        { status: 400 },
      );
    }

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: 'Course is required.',
        },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_COURSES.includes(
        course as (typeof ALLOWED_COURSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected course is not valid.',
        },
        { status: 400 },
      );
    }

    if (!intake) {
      return NextResponse.json(
        {
          success: false,
          message: 'Intake is required.',
        },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_INTAKES.includes(
        intake as (typeof ALLOWED_INTAKES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected intake is not valid.',
        },
        { status: 400 },
      );
    }

    if (!admissionNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The existing/manual admission number is required.',
        },
        { status: 400 },
      );
    }

    if (admissionNumber.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The admission number is too long.',
        },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid email address.',
        },
        { status: 400 },
      );
    }

    if (
      !ALLOWED_PAYMENT_STATUSES.includes(
        paymentStatus as (typeof ALLOWED_PAYMENT_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payment status.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       APPLICATION FEE
    ===================================================== */

    let applicationFee = 0;

    if (
      body.application_fee !== undefined &&
      body.application_fee !== null &&
      String(body.application_fee).trim() !== ''
    ) {
      applicationFee = Number(
        body.application_fee,
      );

      if (
        !Number.isFinite(applicationFee) ||
        applicationFee < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Application fee must be a valid non-negative amount.',
          },
          { status: 400 },
        );
      }
    }

    /* =====================================================
       ADMISSION DATE
    ===================================================== */

    let admissionDate: string;

    try {
      admissionDate =
        normalizeAdmissionDate(
          body.admission_date,
        );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Invalid admission date.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       STUDENT NAME
    ===================================================== */

    const studentName =
      buildFullName(
        firstName,
        middleName,
        surname,
      );

    if (!studentName) {
      return NextResponse.json(
        {
          success: false,
          message:
            'A valid student name is required.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       DATABASE CONNECTION
    ===================================================== */

    const client =
      await pool.connect();

    try {
      /* ===================================================
         BEGIN TRANSACTION
      =================================================== */

      await client.query('BEGIN');

      /* ===================================================
         NORMALIZE ADMISSION NUMBER FOR DUPLICATE CHECK

         Example:

         SMTC/GEM01/026
         smtc/gem01/026
         " SMTC/GEM01/026 "

         are considered the same number.
      =================================================== */

      const normalizedAdmissionNumber =
        admissionNumber
          .trim()
          .toLowerCase();

      /* ===================================================
         ADMISSION NUMBER ADVISORY LOCK

         Prevents two administrators from creating the
         same admission number simultaneously.
      =================================================== */

      await client.query(
        `
          SELECT pg_advisory_xact_lock(
            hashtextextended($1, 0)
          )
        `,
        [
          `manual-admission:${normalizedAdmissionNumber}`,
        ],
      );

      /* ===================================================
         DUPLICATE ADMISSION CHECK

         This happens BEFORE creating the application.
      =================================================== */

      const existingAdmission =
        await client.query<{
          id: number;
          application_id: number;
          admission_number: string;
          student_name: string;
        }>(
          `
            SELECT
              id,
              application_id,
              admission_number,
              student_name
            FROM admissions
            WHERE LOWER(BTRIM(admission_number)) = $1
            LIMIT 1
          `,
          [normalizedAdmissionNumber],
        );

      if (
        existingAdmission.rows.length > 0
      ) {
        await client.query(
          'ROLLBACK',
        );

        const existing =
          existingAdmission.rows[0];

        return NextResponse.json(
          {
            success: false,
            duplicate: true,
            message:
              `Admission number "${admissionNumber}" already exists in the database.`,
            existing_admission: {
              id: Number(existing.id),
              application_id:
                Number(
                  existing.application_id,
                ),
              admission_number:
                existing.admission_number,
              student_name:
                existing.student_name,
            },
          },
          { status: 409 },
        );
      }

      /* ===================================================
         GENERATE SYSTEM APPLICATION NUMBER
      =================================================== */

      const applicationNumber =
        await generateUniqueApplicationNumber(
          client,
        );

      /* ===================================================
         CREATE APPLICATION

         Manual students are already approved.

         application_status = Approved
      =================================================== */

      const applicationResult =
        await client.query<CreatedApplication>(
          `
            INSERT INTO applications (
              application_number,
              surname,
              middle_name,
              first_name,
              mobile,
              email,
              course,
              intake,
              declaration,
              application_fee,
              payment_status,
              application_status
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
              TRUE,
              $9,
              $10,
              'Approved'
            )
            RETURNING
              id,
              application_number,
              first_name,
              middle_name,
              surname,
              mobile,
              email,
              course,
              intake,
              application_fee,
              payment_status,
              application_status,
              created_at
          `,
          [
            applicationNumber,
            surname || null,
            middleName || null,
            firstName,
            mobile,
            email || null,
            course,
            intake,
            applicationFee,
            paymentStatus,
          ],
        );

      const application =
        applicationResult.rows[0];

      if (!application) {
        throw new Error(
          'Failed to create the application record.',
        );
      }

      /* ===================================================
         CREATE ADMISSION

         IMPORTANT:

         admissionNumber comes directly from the admin.

         It is NOT regenerated.
      =================================================== */

      let admissionResult: QueryResult<CreatedAdmission>;

      try {
        admissionResult =
          await client.query<CreatedAdmission>(
            `
              INSERT INTO admissions (
                application_id,
                admission_number,
                application_number,
                student_name,
                course,
                intake,
                admission_date,
                admission_status,
                admission_letter_path,
                admission_letter_pdf
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                'Active',
                NULL,
                NULL
              )
              RETURNING
                id,
                application_id,
                admission_number,
                application_number,
                student_name,
                course,
                intake,
                admission_date,
                admission_status
            `,
            [
              application.id,
              admissionNumber,
              applicationNumber,
              studentName,
              course,
              intake,
              admissionDate,
            ],
          );
      } catch (error: unknown) {
        const pgError =
          error as {
            code?: string;
          };

        /*
         * PostgreSQL unique constraint violation.
         */
        if (pgError.code === '23505') {
          await client.query(
            'ROLLBACK',
          );

          const duplicate =
            await pool.query<{
              id: number;
              application_id: number;
              admission_number: string;
              student_name: string;
            }>(
              `
                SELECT
                  id,
                  application_id,
                  admission_number,
                  student_name
                FROM admissions
                WHERE LOWER(BTRIM(admission_number)) = $1
                LIMIT 1
              `,
              [
                normalizedAdmissionNumber,
              ],
            );

          return NextResponse.json(
            {
              success: false,
              duplicate: true,
              message:
                `Admission number "${admissionNumber}" already exists in the database.`,
              existing_admission:
                duplicate.rows[0] ?? null,
            },
            { status: 409 },
          );
        }

        throw error;
      }

      const admission =
        admissionResult.rows[0];

      if (!admission) {
        throw new Error(
          'Failed to create the admission record.',
        );
      }

      /* ===================================================
         OPTIONAL COMPATIBILITY SYNC

         Some versions of the applications table have an
         admission_number column.

         If the column does not exist, the admission record
         remains authoritative.
      =================================================== */

      try {
        await client.query(
          `
            UPDATE applications
            SET admission_number = $1
            WHERE id = $2
          `,
          [
            admissionNumber,
            application.id,
          ],
        );
      } catch (syncError: unknown) {
        console.warn(
          'Could not synchronize applications.admission_number. The value in admissions.admission_number remains authoritative.',
          syncError,
        );
      }

      /* ===================================================
         COMMIT
      =================================================== */

      await client.query(
        'COMMIT',
      );

      /* ===================================================
         SUCCESS RESPONSE
      =================================================== */

      return NextResponse.json(
        {
          success: true,
          manual: true,

          application: {
            id: Number(
              application.id,
            ),
            application_number:
              application.application_number,
            student_name:
              studentName,
            mobile:
              application.mobile,
            email:
              application.email,
            course:
              application.course,
            intake:
              application.intake,
            application_fee:
              application.application_fee,
            payment_status:
              application.payment_status,
            application_status:
              application.application_status,
          },

          admission: {
            id: Number(
              admission.id,
            ),
            admission_number:
              admission.admission_number,
            admission_date:
              admission.admission_date,
            admission_status:
              admission.admission_status,
          },

          portal_login: {
            application_number:
              application.application_number,
            phone:
              application.mobile,
            login_url:
              '/student/login',
          },

          message:
            'Manual student created successfully. The supplied admission number has been preserved and the student can use the generated application number and phone number to access the student portal.',
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      /* ===================================================
         ROLLBACK
      =================================================== */

      try {
        await client.query(
          'ROLLBACK',
        );
      } catch (rollbackError) {
        console.error(
          'Manual student rollback error:',
          rollbackError,
        );
      }

      throw error;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error(
      'POST /api/admin/manual-students error:',
      error,
    );

    const pgError =
      error as {
        code?: string;
        message?: string;
      };

    /* =====================================================
       UNIQUE CONSTRAINT ERROR
    ===================================================== */

    if (
      pgError.code === '23505'
    ) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          message:
            'The supplied admission number or generated application number already exists. Please try again.',
        },
        { status: 409 },
      );
    }

    /* =====================================================
       GENERAL ERROR
    ===================================================== */

    return NextResponse.json(
      {
        success: false,
        message:
          pgError.message ||
          'Failed to create manual student.',
      },
      { status: 500 },
    );
  }
}