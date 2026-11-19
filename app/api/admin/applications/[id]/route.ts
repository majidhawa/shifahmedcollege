
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ApplicationStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected';

type PaymentStatus =
  | 'Pending'
  | 'Awaiting Approval'
  | 'Paid'
  | 'Rejected';

/* =========================================================
   OFFICIAL SMTC PROGRAMMES

   Keep these labels consistent with the application form,
   application edit page and course management system.
========================================================= */

const COURSE_OPTIONS = [
  'Diploma in Mortuary Science Level 6 (Technologist)',
  'Certificate in Mortuary Science Level 5 (Technician)',
  'Certificate in Caregiving Level 4',
  'Certificate in Emergency Medical Technology (EMT)',
  'Diploma in Emergency Medical Technology (EMT) Level 6',
  'Diploma in Paramedicine Level 6',
  'Certificate in Safe Phlebotomy',
  'Certificate in Dialysis Technology',
  'ACLS and BLS',
  'Certificate in German Language A1 Proficiency',
  'Certificate in German Language A2 Proficiency',
  'Certificate in German Language B1 Proficiency',
  'Certificate in German Language B2 Proficiency',
  'Certificate in Community Health Level 5',
  'Diploma in Community Health Level 6',
  'Certificate in Health Service Support Level 5',
] as const;

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(
  value: unknown,
  allowedValues: readonly string[]
): string | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  return allowedValues.find(
    (item) =>
      item.toLowerCase() === normalized.toLowerCase()
  ) ?? null;
}

function cleanValue(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    return trimmed === '' ? null : trimmed;
  }

  return value;
}

function normalizeNullableString(value: unknown) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function getApplicationId(idParam: string) {
  const id = Number(idParam);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function getPaymentDetails(application: Record<string, any>) {
  const paymentStatus = String(
    application.payment_status || 'Pending'
  ).trim();

  const normalizedStatus = paymentStatus
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const manualMpesaCode = normalizeNullableString(
    application.manual_mpesa_code
  );

  const manualMpesaPhone = normalizeNullableString(
    application.manual_mpesa_phone
  );

  const rejectionReason = normalizeNullableString(
    application.manual_payment_rejection_reason
  );

  const submittedAt =
    application.manual_payment_submitted_at || null;

  const verifiedAt =
    application.manual_payment_verified_at || null;

  const verifiedBy =
    application.manual_payment_verified_by || null;

  return {
    manualMpesaCode,
    manualMpesaPhone,

    manualPaymentSubmittedAt: submittedAt,
    manualPaymentVerifiedAt: verifiedAt,
    manualPaymentVerifiedBy: verifiedBy,
    manualPaymentRejectionReason: rejectionReason,

    manualMpesaPayment: {
      code: manualMpesaCode,
      phone: manualMpesaPhone,

      submittedAt,
      verifiedAt,
      verifiedBy,
      rejectionReason,

      status: paymentStatus,

      awaitingApproval:
        normalizedStatus === 'awaiting_approval',

      approved: [
        'paid',
        'approved',
        'verified',
      ].includes(normalizedStatus),

      rejected:
        normalizedStatus === 'rejected',

      submitted:
        Boolean(manualMpesaCode),
    },
  };
}

function applicationResponse(
  application: Record<string, any>
) {
  return {
    ...application,
    ...getPaymentDetails(application),
  };
}

function isValidEmail(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  return (
    typeof value === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

/* =========================================================
   EDITABLE APPLICATION FIELDS

   Only fields listed here can be changed through PATCH.
========================================================= */

const EDITABLE_FIELDS = [
  /* PERSONAL */
  'surname',
  'middle_name',
  'first_name',
  'date_of_birth',
  'gender',
  'nationality',
  'country',
  'id_passport_number',
  'marital_status',

  /* CONTACT */
  'postal_address',
  'postal_code',
  'town',
  'county',
  'mobile',
  'email',

  /* ACADEMIC */
  'kcse_index',
  'kcse_year',
  'kcse_mean_grade',
  'english_grade',
  'kiswahili_grade',
  'biology_grade',
  'chemistry_grade',
  'physics_grade',
  'mathematics_grade',
  'previous_institution',
  'highest_qualification',

  /* COURSE */
  'course',
  'intake',

  /* SPONSOR */
  'sponsor_type',
  'sponsor_name',
  'sponsor_relationship',
  'sponsor_mobile',
  'sponsor_email',

  /* GUARDIAN */
  'guardian_name',
  'guardian_relationship',
  'guardian_mobile',
  'guardian_email',

  /* DOCUMENTS */
  'id_document',
  'kcse_certificate',
  'passport_photo',
  'previous_qualification_certificate',
  'academic_transcripts',

  /* DECLARATION */
  'declaration',

  /* APPLICATION */
  'application_fee',

  /* ADMISSION */
  'admission_number',
] as const;

/* =========================================================
   GET SINGLE APPLICATION
========================================================= */

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    /* ADMIN AUTHENTICATION */

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

    /* APPLICATION ID */

    const { id: idParam } = await context.params;
    const id = getApplicationId(idParam);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid application ID.',
        },
        { status: 400 }
      );
    }

    /* FETCH APPLICATION */

    const result = await pool.query(
      `
        SELECT
          id,
          application_number,

          surname,
          middle_name,
          first_name,

          date_of_birth,
          gender,
          nationality,
          country,
          id_passport_number,
          marital_status,

          postal_address,
          postal_code,
          town,
          county,
          mobile,
          email,

          kcse_index,
          kcse_year,
          kcse_mean_grade,
          english_grade,
          kiswahili_grade,
          biology_grade,
          chemistry_grade,
          physics_grade,
          mathematics_grade,
          previous_institution,
          highest_qualification,

          course,
          intake,

          sponsor_type,
          sponsor_name,
          sponsor_relationship,
          sponsor_mobile,
          sponsor_email,

          guardian_name,
          guardian_relationship,
          guardian_mobile,
          guardian_email,

          id_document,
          kcse_certificate,
          passport_photo,
          previous_qualification_certificate,
          academic_transcripts,

          declaration,

          application_fee,

          payment_status,

          manual_mpesa_code,
          manual_mpesa_phone,
          manual_payment_submitted_at,
          manual_payment_verified_at,
          manual_payment_verified_by,
          manual_payment_rejection_reason,

          mpesa_checkout_request_id,
          mpesa_merchant_request_id,
          mpesa_transaction_code,
          mpesa_receipt_number,
          mpesa_phone_number,
          mpesa_transaction_date,
          mpesa_result_code,
          mpesa_result_description,
          mpesa_amount,
          paid_at,

          payment_receipt_number,
          payment_verified_at,

          application_status,
          approved_at,
          rejection_reason,

          admission_number,

          created_at,
          updated_at

        FROM applications

        WHERE id = $1

        LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Application not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: applicationResponse(
        result.rows[0]
      ),
    });
  } catch (error) {
    console.error(
      'GET ADMIN APPLICATION ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to load application.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH APPLICATION
========================================================= */

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    /* ADMIN AUTHENTICATION */

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

    /* APPLICATION ID */

    const { id: idParam } = await context.params;
    const id = getApplicationId(idParam);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid application ID.',
        },
        { status: 400 }
      );
    }

    /* READ REQUEST BODY */

    let body: Record<string, unknown>;

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

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body.',
        },
        { status: 400 }
      );
    }

    /* FETCH EXISTING APPLICATION */

    const existingResult = await pool.query(
      `
        SELECT *
        FROM applications
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Application not found.',
        },
        { status: 404 }
      );
    }

    const existingApplication =
      existingResult.rows[0];

    /* =====================================================
       NORMALIZE STATUS VALUES
    ===================================================== */

    const validApplicationStatuses: ApplicationStatus[] = [
      'Pending',
      'Approved',
      'Rejected',
    ];

    const validPaymentStatuses: PaymentStatus[] = [
      'Pending',
      'Awaiting Approval',
      'Paid',
      'Rejected',
    ];

    const applicationStatus = normalizeStatus(
      body.application_status,
      validApplicationStatuses
    );

    const paymentStatus = normalizeStatus(
      body.payment_status,
      validPaymentStatuses
    );

    if (
      applicationStatus === null &&
      body.application_status !== undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid application status.',
          allowedStatuses: validApplicationStatuses,
        },
        { status: 400 }
      );
    }

    if (
      paymentStatus === null &&
      body.payment_status !== undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid payment status.',
          allowedStatuses: validPaymentStatuses,
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE COURSE
    ===================================================== */

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'course'
      )
    ) {
      const course = normalizeNullableString(
        body.course
      );

      if (!course) {
        return NextResponse.json(
          {
            success: false,
            message: 'Please select a programme.',
          },
          { status: 400 }
        );
      }

      /*
       * Allow an existing legacy course to remain unchanged.
       * New course selections must match the official catalogue.
       */

      const existingCourse = String(
        existingApplication.course || ''
      ).trim();

      if (
        !COURSE_OPTIONS.includes(
          course as (typeof COURSE_OPTIONS)[number]
        ) &&
        course !== existingCourse
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid programme selected.',
            allowedCourses: COURSE_OPTIONS,
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       VALIDATE INTAKE
    ===================================================== */

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'intake'
      )
    ) {
      const intake = normalizeNullableString(
        body.intake
      );

      if (!intake) {
        return NextResponse.json(
          {
            success: false,
            message: 'Please select an intake.',
          },
          { status: 400 }
        );
      }

      if (intake.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message: 'Intake value is too long.',
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       VALIDATE EMAIL ADDRESSES
    ===================================================== */

    const emailFields = [
      'email',
      'sponsor_email',
      'guardian_email',
    ] as const;

    for (const field of emailFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        ) &&
        !isValidEmail(body[field])
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Please provide a valid ${field.replace('_', ' ')}.`,
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       VALIDATE APPLICATION FEE
    ===================================================== */

    let applicationFee: number | null | undefined;

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'application_fee'
      )
    ) {
      const rawFee = body.application_fee;

      if (
        rawFee === null ||
        rawFee === ''
      ) {
        applicationFee = null;
      } else {
        applicationFee = Number(rawFee);

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
            { status: 400 }
          );
        }
      }
    }

    /* =====================================================
       BUILD SAFE SQL UPDATE

       A Map prevents duplicate column assignments when
       multiple status-related updates are requested.
    ===================================================== */

    const updates = new Map<string, unknown>();

    for (const field of EDITABLE_FIELDS) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        if (field === 'application_fee') {
          updates.set(
            field,
            applicationFee
          );
        } else {
          updates.set(
            field,
            cleanValue(body[field])
          );
        }
      }
    }

    /* =====================================================
       APPLICATION STATUS
    ===================================================== */

    if (applicationStatus !== undefined) {
      updates.set(
        'application_status',
        applicationStatus
      );

      if (applicationStatus === 'Approved') {
        updates.set(
          'approved_at',
          new Date()
        );

        updates.set(
          'rejection_reason',
          null
        );
      }

      if (applicationStatus === 'Rejected') {
        updates.set(
          'approved_at',
          null
        );

        if (
          Object.prototype.hasOwnProperty.call(
            body,
            'rejection_reason'
          )
        ) {
          updates.set(
            'rejection_reason',
            cleanValue(
              body.rejection_reason
            )
          );
        }
      }

      if (applicationStatus === 'Pending') {
        updates.set(
          'approved_at',
          null
        );

        updates.set(
          'rejection_reason',
          null
        );
      }
    }

    /* =====================================================
       PAYMENT STATUS
    ===================================================== */

    if (paymentStatus !== undefined) {
      updates.set(
        'payment_status',
        paymentStatus
      );
    }

    /* =====================================================
       PAYMENT APPROVED

       Supports both:
       1. Manually submitted M-Pesa payments.
       2. Daraja STK Push payments.

       A valid existing M-Pesa transaction or receipt is
       accepted even when no manual code was submitted.
    ===================================================== */

    if (paymentStatus === 'Paid') {
      const manualCode = normalizeNullableString(
        existingApplication.manual_mpesa_code
      );

      const existingTransactionCode =
        normalizeNullableString(
          existingApplication.mpesa_transaction_code
        );

      const existingReceiptNumber =
        normalizeNullableString(
          existingApplication.mpesa_receipt_number
        );

      const paymentProof =
        manualCode ||
        existingTransactionCode ||
        existingReceiptNumber;

      if (!paymentProof) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Cannot approve payment because no M-Pesa transaction code or receipt number has been recorded.',
          },
          { status: 400 }
        );
      }

      updates.set(
        'manual_payment_verified_at',
        new Date()
      );

      updates.set(
        'manual_payment_verified_by',
        admin.email
      );

      updates.set(
        'payment_verified_at',
        new Date()
      );

      updates.set(
        'paid_at',
        new Date()
      );

      updates.set(
        'manual_payment_rejection_reason',
        null
      );

      /*
       * If a manual M-Pesa code exists, save it as the
       * official transaction code.
       */

      if (manualCode) {
        updates.set(
          'mpesa_transaction_code',
          manualCode
        );
      }

      const manualPhone = normalizeNullableString(
        existingApplication.manual_mpesa_phone
      );

      if (manualPhone) {
        updates.set(
          'mpesa_phone_number',
          manualPhone
        );
      }
    }

    /* =====================================================
       PAYMENT REJECTED
    ===================================================== */

    if (paymentStatus === 'Rejected') {
      updates.set(
        'manual_payment_verified_at',
        null
      );

      updates.set(
        'manual_payment_verified_by',
        null
      );

      updates.set(
        'payment_verified_at',
        null
      );

      updates.set(
        'paid_at',
        null
      );

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          'manual_payment_rejection_reason'
        )
      ) {
        updates.set(
          'manual_payment_rejection_reason',
          cleanValue(
            body.manual_payment_rejection_reason
          )
        );
      }
    }

    /* =====================================================
       PAYMENT RESET TO PENDING
    ===================================================== */

    if (paymentStatus === 'Pending') {
      updates.set(
        'manual_payment_verified_at',
        null
      );

      updates.set(
        'manual_payment_verified_by',
        null
      );

      updates.set(
        'manual_payment_rejection_reason',
        null
      );

      updates.set(
        'payment_verified_at',
        null
      );

      updates.set(
        'paid_at',
        null
      );
    }

    /* =====================================================
       PAYMENT AWAITING APPROVAL
    ===================================================== */

    if (
      paymentStatus === 'Awaiting Approval'
    ) {
      updates.set(
        'manual_payment_verified_at',
        null
      );

      updates.set(
        'manual_payment_verified_by',
        null
      );

      updates.set(
        'manual_payment_rejection_reason',
        null
      );

      updates.set(
        'payment_verified_at',
        null
      );

      updates.set(
        'paid_at',
        null
      );
    }

    /* =====================================================
       CHECK FOR CHANGES
    ===================================================== */

    if (updates.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'No editable fields were provided.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       BUILD PARAMETERIZED SQL
    ===================================================== */

    const values: unknown[] = [];
    const assignments: string[] = [];

    let parameterIndex = 1;

    for (const [column, value] of updates.entries()) {
      /*
       * Column names are safe because they originate
       * exclusively from the hard-coded allowlists and
       * status-handling code above.
       */

      assignments.push(
        `${column} = $${parameterIndex}`
      );

      values.push(value);
      parameterIndex++;
    }

    assignments.push(
      'updated_at = NOW()'
    );

    values.push(id);

    /* =====================================================
       EXECUTE UPDATE
    ===================================================== */

    const result = await pool.query(
      `
        UPDATE applications

        SET
          ${assignments.join(', ')}

        WHERE id = $${parameterIndex}

        RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Application could not be updated.',
        },
        { status: 404 }
      );
    }

    const updatedApplication =
      result.rows[0];

    /* =====================================================
       ADMIN LOGGING
    ===================================================== */

    console.log(
      `Admin ${admin.email} updated application #${id}`
    );

    if (applicationStatus !== undefined) {
      console.log(
        `Application #${id} status changed to ${applicationStatus}`
      );
    }

    if (paymentStatus !== undefined) {
      console.log(
        `Application #${id} payment status changed to ${paymentStatus}`
      );
    }

    /* =====================================================
       RESPONSE MESSAGE
    ===================================================== */

    let message =
      'Application updated successfully.';

    if (paymentStatus === 'Paid') {
      message =
        'M-Pesa payment verified and approved successfully.';
    } else if (paymentStatus === 'Rejected') {
      message =
        'M-Pesa payment has been rejected.';
    } else if (
      paymentStatus === 'Awaiting Approval'
    ) {
      message =
        'Payment marked as awaiting approval.';
    } else if (paymentStatus === 'Pending') {
      message =
        'Payment status reset to pending.';
    } else if (applicationStatus === 'Approved') {
      message =
        'Application approved successfully.';
    } else if (applicationStatus === 'Rejected') {
      message =
        'Application rejected successfully.';
    }

    /* =====================================================
       RETURN UPDATED APPLICATION
    ===================================================== */

    return NextResponse.json({
      success: true,
      message,
      application: applicationResponse(
        updatedApplication
      ),
    });
  } catch (error) {
    console.error(
      'UPDATE ADMIN APPLICATION ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to update application.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE APPLICATION
========================================================= */

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    /* ADMIN AUTHENTICATION */

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

    /* APPLICATION ID */

    const { id: idParam } = await context.params;
    const id = getApplicationId(idParam);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid application ID.',
        },
        { status: 400 }
      );
    }

    /* CHECK APPLICATION */

    const existingResult = await pool.query(
      `
        SELECT
          id,
          application_number,
          first_name,
          middle_name,
          surname,
          application_status,
          payment_status

        FROM applications

        WHERE id = $1

        LIMIT 1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Application not found.',
        },
        { status: 404 }
      );
    }

    const application =
      existingResult.rows[0];

    /* DELETE APPLICATION */

    await pool.query(
      `
        DELETE FROM applications

        WHERE id = $1
      `,
      [id]
    );

    /* ADMIN LOGGING */

    console.log(
      `Admin ${admin.email} deleted application #${id} (${application.application_number})`
    );

    /* RESPONSE */

    return NextResponse.json({
      success: true,

      message:
        'Application deleted successfully.',

      application: {
        id: application.id,

        application_number:
          application.application_number,

        applicant_name: [
          application.first_name,
          application.middle_name,
          application.surname,
        ]
          .filter(Boolean)
          .join(' '),
      },
    });
  } catch (error) {
    console.error(
      'DELETE ADMIN APPLICATION ERROR:',
      error
    );

    /* FOREIGN KEY CONSTRAINT */

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23503'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This application cannot be deleted because it has related records in the system. Remove or handle the related records first.',
        },
        { status: 409 }
      );
    }

    /* GENERAL ERROR */

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to delete application.',
      },
      { status: 500 }
    );
  }
}
