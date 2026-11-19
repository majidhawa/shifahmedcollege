
import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   TYPES
========================================================= */

type AdmissionRow = {
  admission_id: number;
  application_id: number;

  admission_number: string | null;
  application_number: string | null;

  student_name: string | null;
  course: string | null;
  intake: string | null;
  admission_date: string | Date | null;
  admission_status: string | null;

  admission_letter_path: string | null;
  admission_letter_pdf: Buffer | Uint8Array | null;

  surname: string | null;
  middle_name: string | null;
  first_name: string | null;

  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  country: string | null;
  id_passport_number: string | null;

  postal_address: string | null;
  postal_code: string | null;
  town: string | null;
  county: string | null;

  mobile: string | null;
  email: string | null;

  kcse_index: string | null;
  kcse_year: string | null;
  kcse_mean_grade: string | null;

  application_fee: number | null;
  payment_status: string | null;
};

/* =========================================================
   SMTC BRANDING
========================================================= */

const COLORS = {
  green: '#075B35',
  darkGreen: '#003F27',
  red: '#B64E52',
  orange: '#F58232',
  black: '#171717',
  gray: '#555555',
  lightGray: '#E5E5E5',
  white: '#FFFFFF',
};

/* =========================================================
   PAGE CONFIGURATION
========================================================= */

const PAGE = {
  width: 595.28,
  height: 841.89,

  left: 55,
  right: 540,

  headerTop: 15,
  contentStart: 235,

  footerY: 812,
  footerHeight: 19,

  contentBottom: 795,
};

/* =========================================================
   COMMON ADMISSION REQUIREMENTS
========================================================= */

const COMMON_REQUIREMENTS: string[] = [
  'KCSE Certificate or result slip (photocopy)',
  'colored passports photos (recently taken)',
  'This admission letter.',
  'One ream foolscap paper',
  'One ream of photocopying paper',
];

/* =========================================================
   PROGRAMME-SPECIFIC REQUIREMENTS

   Add approved requirements for other programmes here.
========================================================= */

const PROGRAMME_REQUIREMENTS: Record<string, string[]> = {
  caregiving: [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  'mortuary science': [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  'emergency medical technology': [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  emt: [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  paramedicine: [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  'community health': [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  'dialysis technology': [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  phlebotomy: [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  'german language': [
    ...COMMON_REQUIREMENTS,
  ],

  'health service support': [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  'advanced cardiovascular life support': [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],

  'basic life support': [
    ...COMMON_REQUIREMENTS,
    'SMTC School uniform for female students (Available at school @2000/-)',
    'SMTC Purple medical Scrub (Available at school @3000/-)',
  ],
};

/* =========================================================
   NORMALIZE PROGRAMME NAME
========================================================= */

function normalizeProgramme(
  value: string | null | undefined
): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* =========================================================
   GET PROGRAMME REQUIREMENTS
========================================================= */

function getProgrammeRequirements(
  course: string | null
): string[] {
  const normalizedCourse =
    normalizeProgramme(course);

  if (!normalizedCourse) {
    return [...COMMON_REQUIREMENTS];
  }

  const matchingProgramme =
    Object.keys(PROGRAMME_REQUIREMENTS).find(
      (programme) =>
        normalizedCourse.includes(programme)
    );

  if (matchingProgramme) {
    return [
      ...PROGRAMME_REQUIREMENTS[matchingProgramme],
    ];
  }

  return [...COMMON_REQUIREMENTS];
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  value: string | Date | null
): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
}

/* =========================================================
   SAFE FILE NAME
========================================================= */

function safeFileName(value: string): string {
  return value.replace(
    /[^a-zA-Z0-9_-]/g,
    '-'
  );
}

/* =========================================================
   GENERATE SINGLE-PAGE ADMISSION LETTER
========================================================= */

function generateAdmissionLetter(
  admission: AdmissionRow
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      /* =================================================
         FONT PATHS
      ================================================= */

      const regularFontPath = path.join(
        process.cwd(),
        'public',
        'fonts',
        'DejaVuSans.ttf'
      );

      const boldFontPath = path.join(
        process.cwd(),
        'public',
        'fonts',
        'DejaVuSans-Bold.ttf'
      );

      if (
        !fs.existsSync(regularFontPath) ||
        !fs.existsSync(boldFontPath)
      ) {
        throw new Error(
          'SMTC PDF fonts are missing from public/fonts.'
        );
      }

      /* =================================================
         IMAGE PATHS
      ================================================= */

      const logoPath = path.join(
        process.cwd(),
        'public',
        'images',
        'logo.jpg'
      );

      const signaturePath = path.join(
        process.cwd(),
        'public',
        'images',
        'principal_signature.png'
      );

      const stampPath = path.join(
        process.cwd(),
        'public',
        'images',
        'college_stamp.png'
      );

      const logoExists = fs.existsSync(logoPath);
      const signatureExists = fs.existsSync(signaturePath);
      const stampExists = fs.existsSync(stampPath);

      /* =================================================
         STUDENT DETAILS
      ================================================= */

      const applicantName = [
        admission.surname,
        admission.middle_name,
        admission.first_name,
      ]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const studentName =
        applicantName ||
        admission.student_name ||
        'Student';

      const firstName =
        admission.first_name ||
        studentName.split(' ')[0] ||
        'Student';

      const admissionNumber =
        admission.admission_number || 'N/A';

      const programme =
        admission.course || 'selected programme';

      const admissionDate =
        formatDate(admission.admission_date);

      const reportingDate =
        process.env.SMTC_REPORTING_DATE ||
        '……………….2026';

      const requirements =
        getProgrammeRequirements(admission.course);

      const isCaregiving =
        normalizeProgramme(admission.course)
          .includes('caregiving');

      /* =================================================
         DOCUMENT
      ================================================= */

      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        bufferPages: false,

        font: regularFontPath,

        info: {
          Title:
            `SMTC Admission Letter - ${admissionNumber}`,

          Author:
            'Shifah Medical Training College',

          Subject:
            'Official Admission Letter',
        },
      });

      doc.registerFont(
        'SMTC-Regular',
        regularFontPath
      );

      doc.registerFont(
        'SMTC-Bold',
        boldFontPath
      );

      doc.font('SMTC-Regular');

      /* =================================================
         PDF BUFFER
      ================================================= */

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('error', reject);

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      /* =================================================
         PAGE DIMENSIONS
      ================================================= */

      const pageWidth = PAGE.width;
      const pageHeight = PAGE.height;

      const left = PAGE.left;
      const right = PAGE.right;

      const contentWidth = right - left;

      /* =================================================
         WHITE BACKGROUND
      ================================================= */

      doc
        .rect(0, 0, pageWidth, pageHeight)
        .fill(COLORS.white);

      /* =================================================
         DRAW HEADER
      ================================================= */

      if (logoExists) {
        try {
          doc.image(
            logoPath,
            pageWidth / 2 - 37,
            PAGE.headerTop,
            {
              fit: [74, 74],
            }
          );
        } catch (error) {
          console.error(
            'Unable to load college logo:',
            error
          );
        }
      }

      function fixedText(
        text: string,
        x: number,
        y: number,
        width: number,
        size: number,
        font = 'SMTC-Regular',
        align: 'left' | 'center' | 'right' = 'left'
      ) {
        doc
          .font(font)
          .fontSize(size)
          .fillColor(COLORS.black)
          .text(text, x, y, {
            width,
            align,
            lineBreak: false,
          });
      }

      fixedText(
        'SHIFAH MEDICAL TRAINING COLLEGE',
        left,
        95,
        contentWidth,
        12.5,
        'SMTC-Bold',
        'center'
      );

      fixedText(
        'P.O BOX 37-40308, AMBWERE PLAZA, KITALE, KENYA.',
        left,
        113,
        contentWidth,
        8,
        'SMTC-Bold',
        'center'
      );

      fixedText(
        'TEL: (+254 (0) 142 068 933)',
        left,
        126,
        contentWidth,
        8,
        'SMTC-Bold',
        'center'
      );

      /* =================================================
         RED HEADER DIVIDER
      ================================================= */

      doc
        .moveTo(left, 143)
        .lineTo(right, 143)
        .lineWidth(2)
        .strokeColor(COLORS.red)
        .stroke();

      /* =================================================
         OFFICE OF THE PRINCIPAL
      ================================================= */

      fixedText(
        'OFFICE OF THE PRINCIPAL',
        left,
        153,
        contentWidth,
        9,
        'SMTC-Bold',
        'center'
      );

      fixedText(
        'EMAIL: admissions.smtc@gmail.com',
        left,
        166,
        contentWidth,
        8,
        'SMTC-Bold',
        'center'
      );

      fixedText(
        'Health through innovation and research',
        left,
        179,
        contentWidth,
        8,
        'SMTC-Bold',
        'center'
      );

      /* =================================================
         ADMISSION LETTER TITLE
      ================================================= */

      fixedText(
        'ADMISSION LETTER',
        left,
        204,
        contentWidth,
        10.5,
        'SMTC-Bold',
        'center'
      );

      doc
        .moveTo(
          pageWidth / 2 - 52,
          219
        )
        .lineTo(
          pageWidth / 2 + 52,
          219
        )
        .lineWidth(0.8)
        .strokeColor(COLORS.black)
        .stroke();

      /* =================================================
         MEASURE TEXT
      ================================================= */

      function measureText(
        text: string,
        width: number,
        size: number,
        font = 'SMTC-Regular',
        align: 'left' | 'center' | 'justify' = 'left'
      ): number {
        doc
          .font(font)
          .fontSize(size);

        return doc.heightOfString(text, {
          width,
          align,
          lineGap: 0.8,
        });
      }

      /* =================================================
         BODY CONTENT MODEL
      ================================================= */

      type ContentItem =
        | {
            type: 'heading';
            text: string;
          }
        | {
            type: 'text';
            text: string;
            bold?: boolean;
            spacing?: number;
          }
        | {
            type: 'bullet';
            text: string;
          }
        | {
            type: 'numbered';
            number: number;
            text: string;
          };

      const items: ContentItem[] = [];

      items.push({
        type: 'heading',
        text: 'TO:',
      });

      items.push({
        type: 'text',
        text: studentName,
        bold: true,
        spacing: 2,
      });

      if (admission.postal_address) {
        items.push({
          type: 'text',
          text: admission.postal_address,
          spacing: 1,
        });
      }

      if (admission.postal_code || admission.town) {
        items.push({
          type: 'text',
          text: [
            admission.postal_code,
            admission.town,
          ]
            .filter(Boolean)
            .join(' '),
          spacing: 1,
        });
      }

      if (admission.county) {
        items.push({
          type: 'text',
          text: admission.county,
          spacing: 1,
        });
      }

      items.push({
        type: 'text',
        text: `ADMISSION NO: ${admissionNumber}`,
        bold: true,
        spacing: 7,
      });

      items.push({
        type: 'text',
        text: 'DATED',
        bold: true,
        spacing: 1,
      });

      items.push({
        type: 'text',
        text: admissionDate,
        spacing: 6,
      });

      items.push({
        type: 'text',
        text: 'RE: Admission',
        bold: true,
        spacing: 5,
      });

      items.push({
        type: 'text',
        text:
          'Reference is made to the above cited subject matter.',
        spacing: 4,
      });

      items.push({
        type: 'text',
        text:
          `This is to inform you that application to pursue ${programme} is Successful and we are happy to inform you that you have been selected to join Shifah Medical Training College.`,
        spacing: 4,
      });

      items.push({
        type: 'text',
        text:
          `The reporting date will later be communicated to you.`,
        spacing: 5,
      });

      items.push({
        type: 'heading',
        text:
          'PLEASE BRING WITH YOU THE FOLLOWING ON ADMISSION DAY:',
      });

      requirements.forEach((requirement) => {
        items.push({
          type: 'bullet',
          text: requirement,
        });
      });

      items.push({
        type: 'heading',
        text: 'NOTE:',
      });

      items.push({
        type: 'numbered',
        number: 1,
        text:
          "Tuition fees should be paid directly to the institution’s Bank account. Personal cheques and cash are not accepted.",
      });

      if (isCaregiving) {
        items.push({
          type: 'numbered',
          number: 2,
          text:
            'Medical scrub shall be issued in the college upon admission.',
        });
      }

      items.push({
        type: 'text',
        text:
          "We are looking forward to seeing you at the college and wish you God’s blessings as you prepare to join our vibrant team of students. Thank you in advance for choosing Shifah Medical Training College for your course.",
        spacing: 4,
      });

      items.push({
        type: 'text',
        text:
          'Please find attached the fee structure for your course.',
        spacing: 8,
      });

      items.push({
        type: 'text',
        text: 'Yours Faithfully,',
        spacing: 2,
      });

      /* =================================================
         DYNAMIC LAYOUT MEASUREMENT

         The content is measured before drawing.

         The font scale is reduced only when needed,
         ensuring the content fits the first A4 page.
      ================================================= */

      const bodyStartY = PAGE.contentStart;

      const signatureAreaHeight = 100;

      const availableBodyHeight =
        PAGE.contentBottom -
        bodyStartY -
        signatureAreaHeight;

      function calculateContentHeight(
        scale: number
      ): number {
        let totalHeight = 0;

        for (const item of items) {
          if (item.type === 'heading') {
            const size = 8.5 * scale;

            totalHeight +=
              measureText(
                item.text,
                contentWidth,
                size,
                'SMTC-Bold'
              ) + 3 * scale;

          } else if (item.type === 'text') {
            const size =
              (item.bold ? 8.2 : 8.1) * scale;

            const width =
              contentWidth - 2;

            totalHeight +=
              measureText(
                item.text,
                width,
                size,
                item.bold
                  ? 'SMTC-Bold'
                  : 'SMTC-Regular',
                'justify'
              ) +
              (item.spacing ?? 3) * scale;

          } else if (item.type === 'bullet') {
            const size = 7.8 * scale;

            totalHeight +=
              measureText(
                item.text,
                contentWidth - 35,
                size
              ) +
              2 * scale;

          } else if (item.type === 'numbered') {
            const size = 7.6 * scale;

            totalHeight +=
              measureText(
                item.text,
                contentWidth - 38,
                size,
                'SMTC-Regular',
                'justify'
              ) +
              3 * scale;
          }
        }

        return totalHeight;
      }

      /* =================================================
         FIND BEST FONT SCALE

         Binary search selects the largest scale that
         fits the available content area.

         Minimum font scale: 0.75
      ================================================= */

      let low = 0.75;
      let high = 1;

      let fontScale = 1;

      if (
        calculateContentHeight(1) >
        availableBodyHeight
      ) {
        for (let i = 0; i < 20; i++) {
          const middle = (low + high) / 2;

          if (
            calculateContentHeight(middle) <=
            availableBodyHeight
          ) {
            low = middle;
          } else {
            high = middle;
          }
        }

        fontScale = low;
      }

      const requiredHeight =
        calculateContentHeight(fontScale);

      console.log(
        'Admission letter layout:',
        {
          student: studentName,
          programme,
          requirements: requirements.length,
          fontScale,
          requiredHeight,
          availableBodyHeight,
        }
      );

      /* =================================================
         DRAW BODY CONTENT
      ================================================= */

      let y = bodyStartY;

      for (const item of items) {
        if (item.type === 'heading') {
          const size = 8.5 * fontScale;

          doc
            .font('SMTC-Bold')
            .fontSize(size)
            .fillColor(COLORS.black);

          const height =
            doc.heightOfString(item.text, {
              width: contentWidth,
              lineGap: 0.8,
            });

          doc.text(
            item.text,
            left,
            y,
            {
              width: contentWidth,
              lineGap: 0.8,
            }
          );

          y += height + 3 * fontScale;

        } else if (item.type === 'text') {
          const size =
            (item.bold ? 8.2 : 8.1) * fontScale;

          const font = item.bold
            ? 'SMTC-Bold'
            : 'SMTC-Regular';

          doc
            .font(font)
            .fontSize(size)
            .fillColor(COLORS.black);

          const height =
            doc.heightOfString(item.text, {
              width: contentWidth - 2,
              align: 'justify',
              lineGap: 0.8,
            });

          doc.text(
            item.text,
            left,
            y,
            {
              width: contentWidth - 2,
              align: 'justify',
              lineGap: 0.8,
            }
          );

          y +=
            height +
            (item.spacing ?? 3) * fontScale;

        } else if (item.type === 'bullet') {
          const size = 7.8 * fontScale;

          const textX = left + 34;
          const textWidth = contentWidth - 35;

          doc
            .font('SMTC-Regular')
            .fontSize(size)
            .fillColor(COLORS.black);

          const height =
            doc.heightOfString(item.text, {
              width: textWidth,
              lineGap: 0.5,
            });

          doc.text(
            '▪',
            left + 17,
            y,
            {
              lineBreak: false,
            }
          );

          doc.text(
            item.text,
            textX,
            y,
            {
              width: textWidth,
              lineGap: 0.5,
            }
          );

          y += height + 2 * fontScale;

        } else if (item.type === 'numbered') {
          const size = 7.6 * fontScale;

          const textX = left + 36;
          const textWidth = contentWidth - 38;

          doc
            .font('SMTC-Regular')
            .fontSize(size)
            .fillColor(COLORS.black);

          const height =
            doc.heightOfString(item.text, {
              width: textWidth,
              align: 'justify',
              lineGap: 0.5,
            });

          doc.text(
            `${item.number}.`,
            left + 15,
            y
          );

          doc.text(
            item.text,
            textX,
            y,
            {
              width: textWidth,
              align: 'justify',
              lineGap: 0.5,
            }
          );

          y += height + 3 * fontScale;
        }
      }

      /* =================================================
         PRINCIPAL SIGNATURE AND STAMP

         Keep both within the first page.
      ================================================= */

      y += 3;

      doc
        .font('SMTC-Regular')
        .fontSize(8 * fontScale)
        .fillColor(COLORS.black)
        .text(
          'FOR PRINCIPAL',
          left,
          y,
          {
            lineBreak: false,
          }
        );

      const signatureY = y + 12;

      if (signatureExists) {
        try {
          doc.image(
            signaturePath,
            left,
            signatureY,
            {
              fit: [125, 42],
            }
          );
        } catch (error) {
          console.error(
            'Unable to load principal signature:',
            error
          );
        }
      }

      if (stampExists) {
        try {
          doc.image(
            stampPath,
            right - 135,
            signatureY - 7,
            {
              fit: [135, 75],
            }
          );
        } catch (error) {
          console.error(
            'Unable to load college stamp:',
            error
          );
        }
      }

      /* =================================================
         SINGLE-PAGE FOOTER
      ================================================= */

      const footerY = PAGE.footerY;

      doc
        .rect(
          left,
          footerY,
          contentWidth,
          PAGE.footerHeight
        )
        .fill(COLORS.orange);

      doc
        .fillColor(COLORS.white)
        .font('SMTC-Regular')
        .fontSize(7)
        .text(
          'Education through innovation & Research',
          left + 7,
          footerY + 5,
          {
            width: contentWidth - 14,
            align: 'center',
            lineBreak: false,
          }
        );

      /* =================================================
         FINAL PAGE VALIDATION
      ================================================= */

      if (
        y + 12 > PAGE.contentBottom
      ) {
        console.warn(
          'Admission letter content is close to the page boundary.',
          {
            finalY: y,
            contentBottom: PAGE.contentBottom,
            fontScale,
          }
        );
      }

      console.log(
        'SMTC admission letter generated as one A4 page.'
      );

      /* =================================================
         FINISH PDF
      ================================================= */

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/* =========================================================
   RETURN PDF RESPONSE
========================================================= */

function pdfResponse(
  pdf: Buffer,
  filename: string
): NextResponse {
  return new NextResponse(
    new Uint8Array(pdf),
    {
      status: 200,

      headers: {
        'Content-Type': 'application/pdf',

        'Content-Disposition':
          `attachment; filename="${filename}"`,

        'Content-Length':
          String(pdf.length),

        'Cache-Control':
          'private, no-store, no-cache, must-revalidate',

        'Pragma': 'no-cache',

        'Expires': '0',
      },
    }
  );
}

/* =========================================================
   GET /api/admin/admissions/[id]/letter

   WORKFLOW

   1. Authenticate administrator.
   2. Validate admission ID.
   3. Fetch admission and application.
   4. Verify active admission.
   5. Return existing saved PDF if available.
   6. Generate one-page PDF if unavailable.
   7. Save generated PDF in admissions table.
   8. Return PDF.

   Admission number is never regenerated.
========================================================= */

export async function GET(
  request: Request,
  context: RouteContext
) {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    /* =====================================================
       ADMIN AUTHENTICATION
    ===================================================== */

    const admin = requireAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       ADMISSION ID
    ===================================================== */

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Admission ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    const admissionId = Number(id);

    if (
      !Number.isInteger(admissionId) ||
      admissionId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid admission ID.',
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      '===================================='
    );

    console.log(
      'SMTC ADMISSION LETTER REQUEST'
    );

    console.log(
      'Admission ID:',
      admissionId
    );

    console.log(
      '===================================='
    );

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await client.query('BEGIN');

    transactionStarted = true;

    /* =====================================================
       FETCH ADMISSION AND APPLICATION
    ===================================================== */

    const result =
      await client.query<AdmissionRow>(
        `
          SELECT
            a.id AS admission_id,
            a.application_id,
            a.admission_number,
            a.application_number,
            a.student_name,
            a.course,
            a.intake,
            a.admission_date,
            a.admission_status,
            a.admission_letter_path,
            a.admission_letter_pdf,

            app.surname,
            app.middle_name,
            app.first_name,

            app.date_of_birth,
            app.gender,
            app.nationality,
            app.country,
            app.id_passport_number,

            app.postal_address,
            app.postal_code,
            app.town,
            app.county,

            app.mobile,
            app.email,

            app.kcse_index,
            app.kcse_year,
            app.kcse_mean_grade,

            app.application_fee,
            app.payment_status

          FROM admissions a

          INNER JOIN applications app
            ON app.id = a.application_id

          WHERE a.id = $1

          LIMIT 1

          FOR UPDATE OF a
        `,
        [admissionId]
      );

    /* =====================================================
       ADMISSION NOT FOUND
    ===================================================== */

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');

      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: 'Admission not found.',
        },
        {
          status: 404,
        }
      );
    }

    const admission = result.rows[0];

    console.log(
      'Admission number:',
      admission.admission_number
    );

    /* =====================================================
       VERIFY ADMISSION STATUS
    ===================================================== */

    if (
      String(admission.admission_status || '')
        .trim()
        .toLowerCase() !== 'active'
    ) {
      await client.query('ROLLBACK');

      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            'Admission letter is only available for active admissions.',
        },
        {
          status: 403,
        }
      );
    }

    /* =====================================================
       SAFE FILENAME
    ===================================================== */

    const safeAdmissionNumber =
      safeFileName(
        String(
          admission.admission_number ||
          admission.application_number ||
          admissionId
        )
      );

    const filename =
      `SMTC-Admission-Letter-${safeAdmissionNumber}.pdf`;

    /* =====================================================
       RETURN EXISTING PDF
    ===================================================== */

    if (admission.admission_letter_pdf) {
      console.log(
        'Existing admission letter found.'
      );

      const savedPdf = Buffer.from(
        admission.admission_letter_pdf
      );

      await client.query('COMMIT');

      transactionStarted = false;

      return pdfResponse(
        savedPdf,
        filename
      );
    }

    /* =====================================================
       GENERATE NEW PDF
    ===================================================== */

    console.log(
      'No existing admission letter found.'
    );

    console.log(
      'Generating one-page admission letter.'
    );

    const pdfBuffer =
      await generateAdmissionLetter(admission);

    if (
      !pdfBuffer ||
      pdfBuffer.length === 0
    ) {
      throw new Error(
        'Generated admission letter PDF is empty.'
      );
    }

    /* =====================================================
       VERIFY PDF PAGE COUNT

       The PDF generator is configured for a single page.
       This also provides a basic structural verification.
    ===================================================== */

    const pdfText = pdfBuffer.toString('latin1');

    const pageCountMatches =
      pdfText.match(/\/Type\s*\/Page\b/g);

    const pageCount =
      pageCountMatches?.length ?? 0;

    if (pageCount !== 1) {
      throw new Error(
        `Expected exactly one PDF page, but generated ${pageCount}.`
      );
    }

    console.log(
      'One-page PDF verified.'
    );

    console.log(
      'PDF size:',
      pdfBuffer.length
    );

    /* =====================================================
       SAVE PDF PATH
    ===================================================== */

    const letterPath =
      `/api/admin/admissions/${admissionId}/letter`;

    /* =====================================================
       SAVE PDF TO DATABASE
    ===================================================== */

    const updateResult =
      await client.query(
        `
          UPDATE admissions

          SET
            admission_letter_pdf = $1,
            admission_letter_path = $2,
            updated_at = CURRENT_TIMESTAMP

          WHERE id = $3

          RETURNING
            id,
            admission_number,
            admission_letter_path,
            admission_letter_pdf IS NOT NULL AS letter_saved
        `,
        [
          pdfBuffer,
          letterPath,
          admissionId,
        ]
      );

    if (
      updateResult.rowCount === 0
    ) {
      throw new Error(
        'Failed to save admission letter.'
      );
    }

    if (
      !updateResult.rows[0].letter_saved
    ) {
      throw new Error(
        'Admission letter could not be confirmed as saved.'
      );
    }

    console.log(
      'Admission letter saved successfully.'
    );

    console.log(
      'Filename:',
      filename
    );

    /* =====================================================
       COMMIT TRANSACTION
    ===================================================== */

    await client.query('COMMIT');

    transactionStarted = false;

    /* =====================================================
       RETURN GENERATED PDF
    ===================================================== */

    return pdfResponse(
      pdfBuffer,
      filename
    );

  } catch (error) {
    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Admission letter rollback failed:',
          rollbackError
        );
      }
    }

    console.error(
      '===================================='
    );

    console.error(
      'SMTC ADMISSION LETTER ERROR'
    );

    console.error(
      '===================================='
    );

    console.error(error);

    return NextResponse.json(
      {
        success: false,

        message:
          'Unable to generate admission letter.',

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );

  } finally {
    client.release();
  }
}
