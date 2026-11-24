
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { linkParentsToApplication } from '@/lib/parent-student-linking';
import { supabaseAdmin } from '@/lib/supabase-server';

/* =========================================================
   CONFIGURATION
========================================================= */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STORAGE_BUCKET = 'application-documents';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const APPLICATION_FEE = 1500;

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
   TYPES
========================================================= */

type UploadedDocument = {
  name: string;
  url: string;
  mimeType: string;
  size: number;
};

type SupportingDocuments = {
  birthCertificate: UploadedDocument | null;
  leavingCertificate: UploadedDocument | null;
  schoolTestimonials: UploadedDocument | null;
  additionalAcademicCertificates: UploadedDocument[];
  otherSupportingDocuments: UploadedDocument[];
};

type UploadedFileResult = {
  url: string;
  storagePath: string;
  document: UploadedDocument;
};

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
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function isFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof File !== 'undefined' &&
    value instanceof File
  );
}

/* =========================================================
   SUPABASE FILE UPLOAD

   Existing database fields continue storing URLs in the
   same format:

   /uploads/applications/filename.pdf

   Optional supporting documents use the same format.
========================================================= */

async function saveUploadedFile(
  value: FormDataEntryValue | null,
  applicationNumber: string,
  documentName: string,
  uploadedStoragePaths: string[],
  required = false
): Promise<UploadedFileResult | null> {
  if (!isFile(value)) {
    if (required) {
      throw new Error(
        `${documentName} is required. Please upload the document.`
      );
    }

    if (typeof value === 'string' && value.trim()) {
      throw new Error(
        `${documentName} must be uploaded as a file.`
      );
    }

    return null;
  }

  // Ignore empty optional file inputs.
  if (value.size === 0) {
    if (required) {
      throw new Error(
        `${documentName} is required. Please upload the document.`
      );
    }

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

  const extension = getExtensionFromMime(value.type);

  const safeApplicationNumber =
    getSafeFileName(applicationNumber);

  const safeDocumentName =
    getSafeFileName(documentName);

  const originalName =
    getSafeFileName(value.name.replace(/\.[^/.]+$/, ''));

  const uniquePart = crypto
    .randomBytes(6)
    .toString('hex');

  const fileName =
    `${safeApplicationNumber}_${safeDocumentName}_${Date.now()}_${uniquePart}_${originalName}${extension}`;

  const storagePath =
    `applications/${fileName}`;

  const buffer = Buffer.from(
    await value.arrayBuffer()
  );

  console.log(
    `Uploading ${documentName} to Supabase:`,
    storagePath
  );

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
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

  // Track successful uploads for cleanup if the
  // database transaction subsequently fails.
  uploadedStoragePaths.push(storagePath);

  const url = `/uploads/applications/${fileName}`;

  console.log(
    `${documentName} uploaded successfully:`,
    storagePath
  );

  return {
    url,
    storagePath,
    document: {
      name: value.name,
      url,
      mimeType: value.type,
      size: value.size,
    },
  };
}

/* =========================================================
   OPTIONAL SINGLE DOCUMENT UPLOAD
========================================================= */

async function uploadOptionalDocument(
  formData: FormData,
  fieldName: string,
  documentName: string,
  applicationNumber: string,
  uploadedStoragePaths: string[]
): Promise<UploadedDocument | null> {
  const uploaded = await saveUploadedFile(
    formData.get(fieldName),
    applicationNumber,
    documentName,
    uploadedStoragePaths,
    false
  );

  return uploaded?.document ?? null;
}

/* =========================================================
   OPTIONAL MULTIPLE DOCUMENT UPLOAD
========================================================= */

async function uploadMultipleDocuments(
  formData: FormData,
  fieldName: string,
  documentName: string,
  applicationNumber: string,
  uploadedStoragePaths: string[]
): Promise<UploadedDocument[]> {
  const entries = formData.getAll(fieldName);

  const uploadedDocuments: UploadedDocument[] = [];

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];

    // Ignore empty browser file inputs.
    if (
      isFile(entry) &&
      entry.size === 0
    ) {
      continue;
    }

    const uploaded = await saveUploadedFile(
      entry,
      applicationNumber,
      `${documentName}_${index + 1}`,
      uploadedStoragePaths,
      false
    );

    if (uploaded) {
      uploadedDocuments.push(uploaded.document);
    }
  }

  return uploadedDocuments;
}

/* =========================================================
   CLEANUP UPLOADED FILES

   If an upload succeeds but the database transaction
   fails, remove the uploaded files to avoid orphaned
   documents in Supabase.
========================================================= */

async function cleanupUploadedFiles(
  storagePaths: string[]
): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }

  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths);

    if (error) {
      console.error(
        'SUPABASE UPLOAD CLEANUP ERROR:',
        error
      );
    } else {
      console.log(
        'Cleaned up uploaded application documents:',
        storagePaths.length
      );
    }
  } catch (error) {
    console.error(
      'UNEXPECTED DOCUMENT CLEANUP ERROR:',
      error
    );
  }
}

/* =========================================================
   POST APPLICATION
========================================================= */

export async function POST(request: Request) {
  // Keep track of uploads so they can be removed if
  // application creation fails.
  const uploadedStoragePaths: string[] = [];

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
       REQUIRED DOCUMENT UPLOADS

       These three documents remain mandatory.
    ===================================================== */

    const idUpload = await saveUploadedFile(
      formData.get('idDocument'),
      applicationNumber,
      'ID',
      uploadedStoragePaths,
      true
    );

    const kcseUpload = await saveUploadedFile(
      formData.get('kcseCertificate'),
      applicationNumber,
      'KCSE',
      uploadedStoragePaths,
      true
    );

    const passportUpload = await saveUploadedFile(
      formData.get('passportPhoto'),
      applicationNumber,
      'PHOTO',
      uploadedStoragePaths,
      true
    );

    const idDocument = idUpload!.url;
    const kcseCertificate = kcseUpload!.url;
    const passportPhoto = passportUpload!.url;

    /* =====================================================
       OPTIONAL SINGLE DOCUMENT UPLOADS
    ===================================================== */

    const birthCertificate =
      await uploadOptionalDocument(
        formData,
        'birthCertificate',
        'BIRTH_CERTIFICATE',
        applicationNumber,
        uploadedStoragePaths
      );

    const leavingCertificate =
      await uploadOptionalDocument(
        formData,
        'leavingCertificate',
        'LEAVING_CERTIFICATE',
        applicationNumber,
        uploadedStoragePaths
      );

    const schoolTestimonials =
      await uploadOptionalDocument(
        formData,
        'schoolTestimonials',
        'SCHOOL_TESTIMONIALS',
        applicationNumber,
        uploadedStoragePaths
      );

    /* =====================================================
       OPTIONAL MULTIPLE DOCUMENT UPLOADS
    ===================================================== */

    const additionalAcademicCertificates =
      await uploadMultipleDocuments(
        formData,
        'additionalAcademicCertificates',
        'ADDITIONAL_ACADEMIC_CERTIFICATE',
        applicationNumber,
        uploadedStoragePaths
      );

    const otherSupportingDocuments =
      await uploadMultipleDocuments(
        formData,
        'otherSupportingDocuments',
        'OTHER_SUPPORTING_DOCUMENT',
        applicationNumber,
        uploadedStoragePaths
      );

    /* =====================================================
       SUPPORTING DOCUMENTS JSONB

       Only uploaded optional documents are stored.
       Empty categories are represented by null or [].
    ===================================================== */

    const supportingDocuments: SupportingDocuments = {
      birthCertificate,
      leavingCertificate,
      schoolTestimonials,
      additionalAcademicCertificates,
      otherSupportingDocuments,
    };

    /* =====================================================
       APPLICATION INSERT QUERY

       supporting_documents is the new JSONB column.
       All existing application columns are preserved.
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
        supporting_documents,

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

        $39, $40, $41, $42,

        $43, $44, $45, $46
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

      // REQUIRED DOCUMENTS
      idDocument,
      kcseCertificate,
      passportPhoto,

      // OPTIONAL SUPPORTING DOCUMENTS
      JSON.stringify(supportingDocuments),

      // APPLICATION STATUS
      declaration,
      APPLICATION_FEE,
      'Pending',
      'Pending',
    ];

    /* =====================================================
       DATABASE TRANSACTION

       Application and parent-student relationships are
       saved in the same transaction.
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

        documents: {
          required: {
            idDocument: true,
            kcseCertificate: true,
            passportPhoto: true,
          },

          optional: {
            birthCertificate: Boolean(birthCertificate),

            leavingCertificate: Boolean(leavingCertificate),

            schoolTestimonials: Boolean(schoolTestimonials),

            additionalAcademicCertificates:
              additionalAcademicCertificates.length,

            otherSupportingDocuments:
              otherSupportingDocuments.length,
          },
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

    // Remove any files uploaded before the failure.
    await cleanupUploadedFiles(uploadedStoragePaths);

    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred while submitting your application.';

    const isValidationError =
      /required|must be|exceeds the maximum|valid|not valid|please provide|please select|you must accept/i.test(
        message
      );

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: isValidationError ? 400 : 500,
      }
    );
  }
}
