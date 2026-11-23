
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { linkParentsToApplication } from '@/lib/parent-student-linking';
import { supabaseAdmin } from '@/lib/supabase-server';

/* =========================================================
   CONFIGURATION
========================================================= */

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_COURSES = [
  'Diploma in Mortuary Science Level 6 (Technologist)',
  'Certificate in Mortuary Science Level 5 (Technician)',
  'Certificate in Caregiving Level 4',
  'Phlebotomy',
  'Certificate in EMT',
  'Diploma in EMT',
  'Paramedicine Level 6',
  'Dialysis Technology',
  'ACLS and BLS',
  'German Language (A1) Proficiency',
  'German Language (A2) Proficiency',
  'German Language (B1) Proficiency',
  'German Language (B2) Proficiency',
  'Certificate in Community Health Level 5',
  'Diploma in Community Health Level 6',
  'Certificate in Health Service Support Level 5',
];

const ALLOWED_INTAKES = [
  'January 2027 Intake',
  'March 2027 Intake',
  'May 2027 Intake',
];

/* =========================================================
   HELPERS
========================================================= */

function clean(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function generateApplicationNumber(): string {
  const year = new Date().getFullYear();

  const randomPart = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `SMTC/${year}/${randomPart}`;
}

function getSafeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function getExtensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';

    case 'image/jpeg':
      return '.jpg';

    case 'image/png':
      return '.png';

    default:
      return '';
  }
}

/* =========================================================
   SUPABASE FILE UPLOAD
========================================================= */

async function saveUploadedFile(
  value: FormDataEntryValue | null,
  applicationNumber: string,
  documentName: string
): Promise<string | null> {
  if (!(value instanceof File)) {
    return null;
  }

  if (value.size === 0) {
    return null;
  }

  // Validate file type.
  if (!ALLOWED_FILE_TYPES.includes(value.type)) {
    throw new Error(
      `${documentName} must be a PDF, JPG or PNG file.`
    );
  }

  // Validate file size.
  if (value.size > MAX_FILE_SIZE) {
    throw new Error(
      `${documentName} exceeds the maximum file size of 5 MB.`
    );
  }

  // Determine file extension.
  const extension =
    getExtensionFromMime(value.type) ||
    '.bin';

  // Generate a safe filename.
  const safeApplicationNumber =
    getSafeFileName(applicationNumber);

  const fileName =
    `${safeApplicationNumber}_${documentName}_${Date.now()}${extension}`;

  // Supabase storage path.
  const storagePath =
    `applications/${fileName}`;

  // Read file.
  const buffer = Buffer.from(
    await value.arrayBuffer()
  );

  console.log(
    `Uploading ${documentName} to Supabase:`,
    storagePath
  );

  // Upload to Supabase.
  const { error } = await supabaseAdmin.storage
    .from('application-documents')
    .upload(
      storagePath,
      buffer,
      {
        contentType: value.type,
        upsert: false,
      }
    );

  if (error) {
    console.error(
      `SUPABASE ${documentName} UPLOAD ERROR:`,
      error
    );

    throw new Error(
      `Failed to upload ${documentName}: ${error.message}`
    );
  }

  console.log(
    `${documentName} uploaded successfully:`,
    storagePath
  );

  // Preserve the existing database URL structure.
  return `/uploads/applications/${fileName}`;
}

/* =========================================================
   POST APPLICATION
========================================================= */

export async function POST(request: Request) {
  try {
    /* =====================================================
       READ FORM DATA
    ===================================================== */

    const formData = await request.formData();

    /* =====================================================
       PERSONAL INFORMATION
    ===================================================== */

    const surname = clean(formData.get('surname'));
    const middleName = clean(formData.get('middleName'));
    const firstName = clean(formData.get('firstName'));

    const dateOfBirth = clean(formData.get('dateOfBirth'));
    const gender = clean(formData.get('gender'));
    const nationality = clean(formData.get('nationality'));
    const country = clean(formData.get('country'));

    const idPassportNumber = clean(
      formData.get('idPassportNumber')
    );

    const maritalStatus = clean(
      formData.get('maritalStatus')
    );

    /* =====================================================
       CONTACT INFORMATION
    ===================================================== */

    const postalAddress = clean(
      formData.get('postalAddress')
    );

    const postalCode = clean(
      formData.get('postalCode')
    );

    const town = clean(formData.get('town'));
    const county = clean(formData.get('county'));

    const mobile = clean(formData.get('mobile'));
    const email = clean(formData.get('email'));

    /* =====================================================
       ACADEMIC INFORMATION
    ===================================================== */

    const kcseIndex = clean(formData.get('kcseIndex'));
    const kcseYear = clean(formData.get('kcseYear'));

    const kcseMeanGrade = clean(
      formData.get('kcseMeanGrade')
    );

    const englishGrade = clean(
      formData.get('englishGrade')
    );

    const kiswahiliGrade = clean(
      formData.get('kiswahiliGrade')
    );

    const biologyGrade = clean(
      formData.get('biologyGrade')
    );

    const chemistryGrade = clean(
      formData.get('chemistryGrade')
    );

    const physicsGrade = clean(
      formData.get('physicsGrade')
    );

    const mathematicsGrade = clean(
      formData.get('mathematicsGrade')
    );

    const previousInstitution = clean(
      formData.get('previousInstitution')
    );

    const highestQualification = clean(
      formData.get('highestQualification')
    );

    /* =====================================================
       COURSE INFORMATION
    ===================================================== */

    const course = clean(formData.get('course'));
    const intake = clean(formData.get('intake'));

    /* =====================================================
       SPONSOR INFORMATION
    ===================================================== */

    const sponsorType = clean(
      formData.get('sponsorType')
    );

    const sponsorName = clean(
      formData.get('sponsorName')
    );

    const sponsorRelationship = clean(
      formData.get('sponsorRelationship')
    );

    const sponsorMobile = clean(
      formData.get('sponsorMobile')
    );

    const sponsorEmail = clean(
      formData.get('sponsorEmail')
    );

    /* =====================================================
       GUARDIAN INFORMATION
    ===================================================== */

    const guardianName = clean(
      formData.get('guardianName')
    );

    const guardianRelationship = clean(
      formData.get('guardianRelationship')
    );

    const guardianMobile = clean(
      formData.get('guardianMobile')
    );

    const guardianEmail = clean(
      formData.get('guardianEmail')
    );

    /* =====================================================
       DECLARATION
    ===================================================== */

    const declaration =
      clean(formData.get('declaration')) === 'true';

    /* =====================================================
       PERSONAL INFORMATION VALIDATION
    ===================================================== */

    if (
      !surname ||
      !firstName ||
      !dateOfBirth ||
      !gender ||
      !idPassportNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide all required personal information.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CONTACT VALIDATION
    ===================================================== */

    if (!mobile || !email || !county) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide all required contact information.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       ACADEMIC VALIDATION
    ===================================================== */

    if (
      !kcseIndex ||
      !kcseYear ||
      !kcseMeanGrade
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide the required KCSE information.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       COURSE VALIDATION
    ===================================================== */

    if (!ALLOWED_COURSES.includes(course)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected course is not valid.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       INTAKE VALIDATION
    ===================================================== */

    if (!ALLOWED_INTAKES.includes(intake)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected intake is not valid.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       SPONSOR VALIDATION
    ===================================================== */

    if (!sponsorType) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please select the sponsor type.',
        },
        { status: 400 }
      );
    }

    if (
      sponsorType !== 'Self' &&
      !sponsorName
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Sponsor name is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       GUARDIAN VALIDATION
    ===================================================== */

    if (!guardianName || !guardianMobile) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Parent/Guardian name and mobile number are required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       DECLARATION VALIDATION
    ===================================================== */

    if (!declaration) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You must accept the declaration before submitting.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       EMAIL VALIDATION
    ===================================================== */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid email address.',
        },
        { status: 400 }
      );
    }

    if (
      sponsorEmail &&
      !emailRegex.test(sponsorEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid sponsor email address.',
        },
        { status: 400 }
      );
    }

    if (
      guardianEmail &&
      !emailRegex.test(guardianEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid guardian email address.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       APPLICATION NUMBER
    ===================================================== */

    const applicationNumber =
      generateApplicationNumber();

    /* =====================================================
       DOCUMENT UPLOADS
    ===================================================== */

    const idDocument = await saveUploadedFile(
      formData.get('idDocument'),
      applicationNumber,
      'ID'
    );

    const kcseCertificate = await saveUploadedFile(
      formData.get('kcseCertificate'),
      applicationNumber,
      'KCSE'
    );

    const passportPhoto = await saveUploadedFile(
      formData.get('passportPhoto'),
      applicationNumber,
      'PHOTO'
    );

    /* =====================================================
       APPLICATION INSERT QUERY
    ===================================================== */

    const query = `
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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,

        $11, $12, $13, $14, $15, $16,

        $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27,

        $28, $29,

        $30, $31, $32, $33, $34,

        $35, $36, $37, $38,

        $39, $40, $41,

        $42, $43, $44, $45
      )

      RETURNING
        id,
        application_number,
        course,
        intake,
        application_fee,
        payment_status,
        application_status,
        created_at
    `;

    /* =====================================================
       QUERY VALUES
    ===================================================== */

    const values = [
      // PERSONAL
      applicationNumber,
      surname,
      middleName,
      firstName,
      dateOfBirth,
      gender,
      nationality,
      country,
      idPassportNumber,
      maritalStatus,

      // CONTACT
      postalAddress,
      postalCode,
      town,
      county,
      mobile,
      email,

      // ACADEMIC
      kcseIndex,
      kcseYear,
      kcseMeanGrade,
      englishGrade,
      kiswahiliGrade,
      biologyGrade,
      chemistryGrade,
      physicsGrade,
      mathematicsGrade,
      previousInstitution,
      highestQualification,

      // COURSE
      course,
      intake,

      // SPONSOR
      sponsorType,
      sponsorName,
      sponsorRelationship,
      sponsorMobile,
      sponsorEmail,

      // GUARDIAN
      guardianName,
      guardianRelationship,
      guardianMobile,
      guardianEmail,

      // DOCUMENTS
      idDocument,
      kcseCertificate,
      passportPhoto,

      // APPLICATION STATUS
      declaration,
      1500,
      'Pending',
      'Pending',
    ];

    /* =====================================================
       DATABASE TRANSACTION
       
       IMPORTANT:
       The application and parent-student relationships
       are saved in the same transaction.
    ===================================================== */

    const client = await pool.connect();

    let savedApplication: Record<string, any>;
    let linkedParentIds: number[] = [];

    try {
      await client.query('BEGIN');

      console.log(
        'Inserting application into PostgreSQL:',
        applicationNumber
      );

      /* ================================================
         INSERT APPLICATION
      ================================================ */

      const result = await client.query(
        query,
        values
      );

      savedApplication = result.rows[0];

      if (!savedApplication?.id) {
        throw new Error(
          'The application could not be saved.'
        );
      }

      console.log(
        'Application successfully inserted:',
        savedApplication.application_number
      );

      /* ================================================
         AUTOMATIC PARENT-STUDENT LINKING
         
         Match existing active parent accounts using
         guardian/sponsor contact information.

         Ambiguous matches are skipped by the helper.
      ================================================ */

      linkedParentIds = await linkParentsToApplication(
        client,
        {
          applicationId: Number(savedApplication.id),

          guardian: {
            name: guardianName,
            phone: guardianMobile,
            email: guardianEmail,
            relationship: guardianRelationship,
          },

          sponsor:
            sponsorType !== 'Self'
              ? {
                  name: sponsorName,
                  phone: sponsorMobile,
                  email: sponsorEmail,
                  relationship: sponsorRelationship,
                }
              : null,
        }
      );

      console.log(
        'Parent accounts linked to application:',
        linkedParentIds
      );

      /* ================================================
         COMMIT TRANSACTION
      ================================================ */

      await client.query('COMMIT');

      console.log(
        'Application transaction committed successfully.'
      );

    } catch (transactionError) {
      /* ================================================
         ROLLBACK
      ================================================ */

      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'APPLICATION TRANSACTION ROLLBACK ERROR:',
          rollbackError
        );
      }

      throw transactionError;

    } finally {
      client.release();
    }

    /* =====================================================
       SUCCESS RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          'Application submitted successfully.',

        application: {
          id: savedApplication.id,

          application_number:
            savedApplication.application_number,

          course:
            savedApplication.course,

          intake:
            savedApplication.intake,

          application_fee:
            savedApplication.application_fee,

          payment_status:
            savedApplication.payment_status,

          application_status:
            savedApplication.application_status,
        },

        parent_linking: {
          linked: linkedParentIds.length > 0,

          linked_parents:
            linkedParentIds.length,

          message:
            linkedParentIds.length > 0
              ? 'Matching parent account(s) linked successfully.'
              : 'No existing parent account was matched automatically.',
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error(
      'APPLICATION SUBMISSION ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while submitting your application.',
      },
      { status: 500 }
    );
  }
}
