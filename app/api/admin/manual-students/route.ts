import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { createClient } from '@supabase/supabase-js';

import pool from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type CreatedApplication = {
  id: number;
  application_number: string;
  surname: string | null;
  middle_name: string | null;
  first_name: string | null;
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

const ALLOWED_GENDERS = [
  'Male',
  'Female',
] as const;

const ALLOWED_MARITAL_STATUSES = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
] as const;

const ALLOWED_SPONSOR_TYPES = [
  'Self',
  'Parent',
  'Guardian',
  'Sponsor',
] as const;

const ALLOWED_GUARDIAN_RELATIONSHIPS = [
  'Father',
  'Mother',
  'Guardian',
  'Spouse',
  'Sibling',
  'Other',
] as const;

const KCSE_GRADES = [
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D+',
  'D',
  'D-',
  'E',
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

const STORAGE_BUCKET = 'application-documents';

/* =========================================================
   HELPERS
========================================================= */

function clean(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function cleanLower(value: FormDataEntryValue | null): string {
  return clean(value).toLowerCase();
}

function isAllowedValue<T extends readonly string[]>(
  value: string,
  allowed: T,
): boolean {
  return allowed.includes(value as T[number]);
}

function isValidEmail(email: string): boolean {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeDate(
  value: string,
  fieldName: string,
  required = false,
): string | null {
  const raw = value.trim();

  if (!raw) {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }

    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(
      `${fieldName} must use the format YYYY-MM-DD.`,
    );
  }

  const date = new Date(`${raw}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName.toLowerCase()}.`);
  }

  const normalized = date.toISOString().slice(0, 10);

  if (normalized !== raw) {
    throw new Error(`Invalid ${fieldName.toLowerCase()}.`);
  }

  return raw;
}

function normalizeInteger(
  value: string,
  fieldName: string,
  required = false,
): number | null {
  const raw = value.trim();

  if (!raw) {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }

    return null;
  }

  if (!/^\d+$/.test(raw)) {
    throw new Error(
      `${fieldName} must be a valid whole number.`,
    );
  }

  const number = Number(raw);

  if (!Number.isSafeInteger(number)) {
    throw new Error(
      `${fieldName} is outside the supported range.`,
    );
  }

  return number;
}

function parseBoolean(value: string): boolean {
  return (
    value === 'true' ||
    value === '1' ||
    value.toLowerCase() === 'yes'
  );
}

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
    .filter((value) => value.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');

  return cleaned || 'document';
}

function getFile(
  formData: FormData,
  fieldName: string,
): File | null {
  const value = formData.get(fieldName);

  if (!value || typeof value === 'string') {
    return null;
  }

  return value;
}

function formatDateForResponse(
  value: string | Date,
): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  return raw;
}

function generateApplicationNumber(): string {
  const year = new Date().getFullYear();

  const randomPart = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `SMTC/${year}/${randomPart}`;
}

async function generateUniqueApplicationNumber(
  client: PoolClient,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const applicationNumber =
      generateApplicationNumber();

    const result =
      await client.query<{ id: number }>(
        `
          SELECT id
          FROM applications
          WHERE UPPER(BTRIM(application_number)) =
                UPPER(BTRIM($1))
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

function validateFile(
  file: File | null,
  fieldName: string,
): asserts file is File {
  if (!file) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  if (file.size <= 0) {
    throw new Error(
      `${fieldName} cannot be empty.`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `${fieldName} exceeds the maximum file size of 5 MB.`,
    );
  }

  if (
    !ALLOWED_DOCUMENT_TYPES.includes(
      file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number],
    )
  ) {
    throw new Error(
      `${fieldName} must be a PDF, JPG or PNG file.`,
    );
  }
}

async function uploadApplicationDocument(
  file: File,
  applicationKey: string,
  documentType: string,
): Promise<{
  storagePath: string;
  databasePath: string;
}> {
  const safeName = sanitizeFileName(file.name);

  const extension =
    safeName.includes('.')
      ? safeName.substring(
          safeName.lastIndexOf('.'),
        )
      : '';

  const uniquePart = crypto
    .randomBytes(8)
    .toString('hex');

  const generatedName =
    `${documentType}-${uniquePart}${extension}`;

  const storagePath =
    `applications/${applicationKey}/${generatedName}`;

  const buffer = Buffer.from(
    await file.arrayBuffer(),
  );

  const { error } =
    await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(
        storagePath,
        buffer,
        {
          contentType: file.type,
          upsert: false,
        },
      );

  if (error) {
    throw new Error(
      `Unable to upload ${documentType.replace(
        /-/g,
        ' ',
      )}: ${error.message}`,
    );
  }

  return {
    storagePath,
    databasePath:
      `/uploads/applications/${applicationKey}/${generatedName}`,
  };
}

async function removeUploadedFiles(
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }

  try {
    await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths);
  } catch (error) {
    console.error(
      'Failed to clean up uploaded manual-student documents:',
      error,
    );
  }
}

/* =========================================================
   POST
   /api/admin/manual-students

   Creates:

   1. applications record
   2. admissions record

   IMPORTANT:
   - admission_number is supplied by the administrator
   - admission_number is NEVER regenerated
   - application_number is generated separately
   - uploaded documents are stored in Supabase
========================================================= */

export async function POST(
  request: NextRequest,
) {
  let client: PoolClient | null = null;

  const uploadedStoragePaths: string[] = [];

  try {
    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    await requireAdmin();

    /* =====================================================
       CONTENT TYPE
    ===================================================== */

    const contentType =
      request.headers.get('content-type') || '';

    if (
      !contentType
        .toLowerCase()
        .includes('multipart/form-data')
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This endpoint expects multipart/form-data because the manual-student form includes supporting documents.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       READ FORM DATA
    ===================================================== */

    const formData =
      await request.formData();

    /* =====================================================
       PERSONAL INFORMATION
    ===================================================== */

    const surname = clean(
      formData.get('surname'),
    );

    const middleName = clean(
      formData.get('middleName'),
    );

    const firstName = clean(
      formData.get('firstName'),
    );

    const dateOfBirth = clean(
      formData.get('dateOfBirth'),
    );

    const gender = clean(
      formData.get('gender'),
    );

    const nationality = clean(
      formData.get('nationality'),
    );

    const country = clean(
      formData.get('country'),
    );

    const idPassportNumber = clean(
      formData.get('idPassportNumber'),
    );

    const maritalStatus = clean(
      formData.get('maritalStatus'),
    );

    /* =====================================================
       CONTACT DETAILS
    ===================================================== */

    const postalAddress = clean(
      formData.get('postalAddress'),
    );

    const postalCode = clean(
      formData.get('postalCode'),
    );

    const town = clean(
      formData.get('town'),
    );

    const county = clean(
      formData.get('county'),
    );

    const mobile = clean(
      formData.get('mobile'),
    );

    const email = cleanLower(
      formData.get('email'),
    );

    /* =====================================================
       ACADEMIC INFORMATION
    ===================================================== */

    const kcseIndex = clean(
      formData.get('kcseIndex'),
    );

    const kcseYearRaw = clean(
      formData.get('kcseYear'),
    );

    const kcseMeanGrade = clean(
      formData.get('kcseMeanGrade'),
    );

    const englishGrade = clean(
      formData.get('englishGrade'),
    );

    const kiswahiliGrade = clean(
      formData.get('kiswahiliGrade'),
    );

    const biologyGrade = clean(
      formData.get('biologyGrade'),
    );

    const chemistryGrade = clean(
      formData.get('chemistryGrade'),
    );

    const physicsGrade = clean(
      formData.get('physicsGrade'),
    );

    const mathematicsGrade = clean(
      formData.get('mathematicsGrade'),
    );

    const previousInstitution = clean(
      formData.get('previousInstitution'),
    );

    const highestQualification = clean(
      formData.get('highestQualification'),
    );

    /* =====================================================
       COURSE & INTAKE
    ===================================================== */

    const course = clean(
      formData.get('course'),
    );

    const intake = clean(
      formData.get('intake'),
    );

    /* =====================================================
       SPONSOR
    ===================================================== */

    const sponsorType = clean(
      formData.get('sponsorType'),
    );

    const sponsorName = clean(
      formData.get('sponsorName'),
    );

    const sponsorRelationship = clean(
      formData.get('sponsorRelationship'),
    );

    const sponsorMobile = clean(
      formData.get('sponsorMobile'),
    );

    const sponsorEmail = cleanLower(
      formData.get('sponsorEmail'),
    );

    /* =====================================================
       PARENT / GUARDIAN
    ===================================================== */

    const guardianName = clean(
      formData.get('guardianName'),
    );

    const guardianRelationship = clean(
      formData.get('guardianRelationship'),
    );

    const guardianMobile = clean(
      formData.get('guardianMobile'),
    );

    const guardianEmail = cleanLower(
      formData.get('guardianEmail'),
    );

    /* =====================================================
       DECLARATION
    ===================================================== */

    const declaration = parseBoolean(
      clean(formData.get('declaration')),
    );

    /* =====================================================
       ADMISSION DETAILS
    ===================================================== */

    const admissionNumber = clean(
      formData.get('admissionNumber'),
    );

    const admissionDate = clean(
      formData.get('admissionDate'),
    );

    /* =====================================================
       PAYMENT
    ===================================================== */

    const paymentStatus =
      (
        clean(
          formData.get('paymentStatus'),
        ) || 'paid'
      ).toLowerCase();

    const applicationFeeRaw = clean(
      formData.get('applicationFee'),
    );

    let applicationFee = 1500;

    if (applicationFeeRaw) {
      applicationFee =
        Number(applicationFeeRaw);

      if (
        !Number.isFinite(
          applicationFee,
        ) ||
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
       DOCUMENTS
    ===================================================== */

    const idDocument = getFile(
      formData,
      'idDocument',
    );

    const kcseCertificate = getFile(
      formData,
      'kcseCertificate',
    );

    const passportPhoto = getFile(
      formData,
      'passportPhoto',
    );

    /* =====================================================
       REQUIRED FIELD VALIDATION
    ===================================================== */

    const requiredFields: Array<[
      string,
      string,
    ]> = [
      ['Surname', surname],
      ['First name', firstName],
      ['Date of birth', dateOfBirth],
      ['Gender', gender],
      ['ID / Passport number', idPassportNumber],
      ['County', county],
      ['Mobile number', mobile],
      ['Email address', email],
      ['KCSE index number', kcseIndex],
      ['KCSE year', kcseYearRaw],
      ['KCSE mean grade', kcseMeanGrade],
      ['Course', course],
      ['Intake', intake],
      ['Sponsor type', sponsorType],
      ['Guardian / next of kin name', guardianName],
      ['Guardian / next of kin mobile', guardianMobile],
      ['Official admission number', admissionNumber],
      ['Admission date', admissionDate],
    ];

    for (const [
      fieldLabel,
      fieldValue,
    ] of requiredFields) {
      if (!fieldValue) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${fieldLabel} is required.`,
          },
          { status: 400 },
        );
      }
    }

    if (!declaration) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The declaration must be accepted before the student can be registered.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       ENUM VALIDATION
    ===================================================== */

    if (
      !isAllowedValue(
        course,
        ALLOWED_COURSES,
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

    if (
      !isAllowedValue(
        intake,
        ALLOWED_INTAKES,
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

    if (
      !isAllowedValue(
        gender,
        ALLOWED_GENDERS,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected gender is not valid.',
        },
        { status: 400 },
      );
    }

    if (
      maritalStatus &&
      !isAllowedValue(
        maritalStatus,
        ALLOWED_MARITAL_STATUSES,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected marital status is not valid.',
        },
        { status: 400 },
      );
    }

    if (
      !isAllowedValue(
        sponsorType,
        ALLOWED_SPONSOR_TYPES,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected sponsor type is not valid.',
        },
        { status: 400 },
      );
    }

    if (
      guardianRelationship &&
      !isAllowedValue(
        guardianRelationship,
        ALLOWED_GUARDIAN_RELATIONSHIPS,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected guardian relationship is not valid.',
        },
        { status: 400 },
      );
    }

    if (
      !isAllowedValue(
        paymentStatus,
        ALLOWED_PAYMENT_STATUSES,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid payment status.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       SPONSOR VALIDATION
    ===================================================== */

    if (
      sponsorType !== 'Self' &&
      !sponsorName
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Sponsor name is required for the selected sponsor type.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       EMAIL VALIDATION
    ===================================================== */

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
      sponsorEmail &&
      !isValidEmail(sponsorEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid sponsor email address.',
        },
        { status: 400 },
      );
    }

    if (
      guardianEmail &&
      !isValidEmail(guardianEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid guardian email address.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       DATE VALIDATION
    ===================================================== */

    let normalizedDateOfBirth: string;

    let normalizedAdmissionDate: string;

    try {
      normalizedDateOfBirth =
        normalizeDate(
          dateOfBirth,
          'Date of Birth',
          true,
        ) as string;

      normalizedAdmissionDate =
        normalizeDate(
          admissionDate,
          'Admission Date',
          true,
        ) as string;
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Invalid date.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       KCSE YEAR
    ===================================================== */

    let kcseYear: number;

    try {
      kcseYear =
        normalizeInteger(
          kcseYearRaw,
          'KCSE Year',
          true,
        ) as number;
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Invalid KCSE year.',
        },
        { status: 400 },
      );
    }

    if (
      kcseYear < 1990 ||
      kcseYear >
        new Date().getFullYear()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'KCSE Year is outside the allowed range.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       KCSE GRADE VALIDATION
    ===================================================== */

    const gradeFields = [
      {
        label: 'KCSE Mean Grade',
        value: kcseMeanGrade,
      },
      {
        label: 'English Grade',
        value: englishGrade,
      },
      {
        label: 'Kiswahili Grade',
        value: kiswahiliGrade,
      },
      {
        label: 'Biology Grade',
        value: biologyGrade,
      },
      {
        label: 'Chemistry Grade',
        value: chemistryGrade,
      },
      {
        label: 'Physics Grade',
        value: physicsGrade,
      },
      {
        label: 'Mathematics Grade',
        value: mathematicsGrade,
      },
    ];

    for (const gradeField of gradeFields) {
      if (
        gradeField.value &&
        !isAllowedValue(
          gradeField.value,
          KCSE_GRADES,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${gradeField.label} is not a valid KCSE grade.`,
          },
          { status: 400 },
        );
      }
    }

    /* =====================================================
       ADMISSION NUMBER VALIDATION
    ===================================================== */

    if (
      admissionNumber.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The admission number is too long.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       DOCUMENT VALIDATION
    ===================================================== */

    try {
      validateFile(
        idDocument,
        'National ID / Passport document',
      );

      validateFile(
        kcseCertificate,
        'KCSE Certificate / Result Slip',
      );

      validateFile(
        passportPhoto,
        'Passport photo',
      );
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'One or more documents are invalid.',
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
       APPLICATION NUMBER KEY

       Used only for uploaded-document organization.
    ===================================================== */

    const documentApplicationKey =
      `${new Date().getFullYear()}-${crypto
        .randomBytes(6)
        .toString('hex')}`;

    /* =====================================================
       UPLOAD SUPPORTING DOCUMENTS
    ===================================================== */

    let idDocumentPath: string;
    let kcseCertificatePath: string;
    let passportPhotoPath: string;

    try {
      const idUpload =
        await uploadApplicationDocument(
          idDocument,
          documentApplicationKey,
          'id-passport',
        );

      uploadedStoragePaths.push(
        idUpload.storagePath,
      );

      idDocumentPath =
        idUpload.databasePath;

      const kcseUpload =
        await uploadApplicationDocument(
          kcseCertificate,
          documentApplicationKey,
          'kcse-certificate',
        );

      uploadedStoragePaths.push(
        kcseUpload.storagePath,
      );

      kcseCertificatePath =
        kcseUpload.databasePath;

      const photoUpload =
        await uploadApplicationDocument(
          passportPhoto,
          documentApplicationKey,
          'passport-photo',
        );

      uploadedStoragePaths.push(
        photoUpload.storagePath,
      );

      passportPhotoPath =
        photoUpload.databasePath;
    } catch (error: unknown) {
      await removeUploadedFiles(
        uploadedStoragePaths,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to upload supporting documents.',
        },
        { status: 500 },
      );
    }

    /* =====================================================
       DATABASE
    ===================================================== */

    client = await pool.connect();

    try {
      await client.query('BEGIN');

      /* ===================================================
         NORMALIZED ADMISSION NUMBER
      =================================================== */

      const normalizedAdmissionNumber =
        admissionNumber
          .trim()
          .toLowerCase();

      /* ===================================================
         ADMISSION NUMBER LOCK
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
            WHERE admission_number IS NOT NULL
              AND BTRIM(admission_number) <> ''
              AND LOWER(BTRIM(admission_number)) = $1
            LIMIT 1
          `,
          [
            normalizedAdmissionNumber,
          ],
        );

      if (
        existingAdmission.rows.length > 0
      ) {
        await client.query('ROLLBACK');

        await removeUploadedFiles(
          uploadedStoragePaths,
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
      =================================================== */

      const applicationResult =
        await client.query<CreatedApplication>(
          `
            INSERT INTO applications (
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
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              $15,
              $16,
              $17,
              $18,
              $19,
              $20,
              $21,
              $22,
              $23,
              $24,
              $25,
              $26,
              $27,
              $28,
              $29,
              $30,
              $31,
              $32,
              $33,
              $34,
              $35,
              $36,
              $37,
              $38,
              $39,
              $40,
              $41,
              $42,
              $43,
              $44,
              $45,
              'Approved'
            )
            RETURNING
              id,
              application_number,
              surname,
              middle_name,
              first_name,
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
            applicationNumber,      // $1
            surname || null,        // $2
            middleName || null,     // $3
            firstName,              // $4
            normalizedDateOfBirth,  // $5
            gender || null,         // $6
            nationality || null,    // $7
            country || null,        // $8
            idPassportNumber || null, // $9
            maritalStatus || null,  // $10
            postalAddress || null,  // $11
            postalCode || null,     // $12
            town || null,           // $13
            county || null,         // $14
            mobile,                 // $15
            email || null,          // $16
            kcseIndex || null,      // $17
            kcseYear,               // $18
            kcseMeanGrade || null,  // $19
            englishGrade || null,   // $20
            kiswahiliGrade || null, // $21
            biologyGrade || null,   // $22
            chemistryGrade || null, // $23
            physicsGrade || null,   // $24
            mathematicsGrade || null, // $25
            previousInstitution || null, // $26
            highestQualification || null, // $27
            course,                 // $28
            intake,                 // $29
            sponsorType || null,    // $30
            sponsorName || null,    // $31
            sponsorRelationship || null, // $32
            sponsorMobile || null,  // $33
            sponsorEmail || null,   // $34
            guardianName || null,   // $35
            guardianRelationship || null, // $36
            guardianMobile || null, // $37
            guardianEmail || null,  // $38
            idDocumentPath,         // $39
            kcseCertificatePath,    // $40
            passportPhotoPath,      // $41
            declaration,            // $42
            applicationFee,         // $43
            paymentStatus,          // $44
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
         admissionNumber is the administrator-supplied
         official number and is never regenerated.
      =================================================== */

      let admission: CreatedAdmission;

      try {
        const admissionResult =
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
              normalizedAdmissionDate,
            ],
          );

        const createdAdmission =
          admissionResult.rows[0];

        if (!createdAdmission) {
          throw new Error(
            'Failed to create the admission record.',
          );
        }

        admission =
          createdAdmission;
      } catch (error: unknown) {
        const pgError =
          error as {
            code?: string;
          };

        if (
          pgError.code === '23505'
        ) {
          await client.query(
            'ROLLBACK',
          );

          await removeUploadedFiles(
            uploadedStoragePaths,
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
                WHERE admission_number IS NOT NULL
                  AND BTRIM(admission_number) <> ''
                  AND LOWER(BTRIM(admission_number)) = $1
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
                duplicate.rows[0]
                  ? {
                      id: Number(
                        duplicate.rows[0].id,
                      ),
                      application_id:
                        Number(
                          duplicate.rows[0]
                            .application_id,
                        ),
                      admission_number:
                        duplicate.rows[0]
                          .admission_number,
                      student_name:
                        duplicate.rows[0]
                          .student_name,
                    }
                  : null,
            },
            { status: 409 },
          );
        }

        throw error;
      }

      /* ===================================================
         OPTIONAL APPLICATION ADMISSION NUMBER SYNC
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
          'Could not synchronize applications.admission_number. admissions.admission_number remains authoritative.',
          syncError,
        );
      }

      /* ===================================================
         COMMIT
      =================================================== */

      await client.query('COMMIT');

      /* ===================================================
         SUCCESS
      =================================================== */

      return NextResponse.json(
        {
          success: true,
          manual: true,

          student: {
            application: {
              id: Number(
                application.id,
              ),
              application_number:
                application.application_number,
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
              admission_status:
                admission.admission_status,
              admission_date:
                formatDateForResponse(
                  admission.admission_date,
                ),
            },

            portal: {
              application_number:
                application.application_number,
              phone:
                application.mobile || mobile,
              login_url:
                '/student/login',
            },
          },

          message:
            'Manual student created successfully. The supplied admission number has been preserved and the student can use the generated application number and phone number to access the existing student portal.',
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      if (client) {
        try {
          await client.query(
            'ROLLBACK',
          );
        } catch (
          rollbackError: unknown
        ) {
          console.error(
            'Manual student rollback error:',
            rollbackError,
          );
        }
      }

      await removeUploadedFiles(
        uploadedStoragePaths,
      );

      throw error;
    } finally {
      if (client) {
        client.release();
        client = null;
      }
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

    if (
      pgError.code === '23505'
    ) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          message:
            'The supplied admission number or generated application number already exists. Please check the admission number and try again.',
        },
        { status: 409 },
      );
    }

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
