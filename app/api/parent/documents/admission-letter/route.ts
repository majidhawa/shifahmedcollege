import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AdmissionRecord = {
  admission_id: number;
  application_id: number;

  admission_number: string | null;
  application_number: string | null;
  student_name: string | null;
  course: string | null;
  intake: string | null;
  admission_date: string | null;
  admission_status: string | null;

  surname: string | null;
  middle_name: string | null;
  first_name: string | null;

  postal_address: string | null;
  postal_code: string | null;
  town: string | null;
};

function formatDate(value: string | null): string {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export async function GET(request: Request) {
  try {
    /* =====================================================
       PARENT AUTHENTICATION
    ===================================================== */

    const session = await getParentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       RESOLVE CHILD THROUGH PARENT LINK
    ===================================================== */

    const result = await pool.query<AdmissionRecord>(
      `
        SELECT
          ad.id AS admission_id,
          ad.application_id,

          ad.admission_number,
          ad.application_number,
          ad.student_name,
          ad.course,
          ad.intake,
          ad.admission_date,
          ad.admission_status,

          app.surname,
          app.middle_name,
          app.first_name,

          app.postal_address,
          app.postal_code,
          app.town

        FROM parent_students ps

        INNER JOIN users u
          ON u.id = ps.parent_id
         AND u.role = 'parent'
         AND u.active = TRUE

        INNER JOIN applications app
          ON app.id = ps.application_id

        INNER JOIN admissions ad
          ON ad.application_id = app.id

        WHERE ps.parent_id = $1

        ORDER BY
          ps.is_primary DESC,
          app.created_at DESC

        LIMIT 1
      `,
      [session.parentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No child admission record was found.',
        },
        { status: 404 }
      );
    }

    const admission = result.rows[0];

    /* =====================================================
       ACTIVE ADMISSION REQUIRED
    ===================================================== */

    if (
      String(admission.admission_status || '')
        .trim()
        .toLowerCase() !== 'active'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Admission letter is only available for an active admission.',
        },
        { status: 403 }
      );
    }

    /* =====================================================
       FILE PATHS
    ===================================================== */

    const root = process.cwd();

    const regularFontPath = path.join(
      root,
      'public',
      'fonts',
      'DejaVuSans.ttf'
    );

    const boldFontPath = path.join(
      root,
      'public',
      'fonts',
      'DejaVuSans-Bold.ttf'
    );

    const logoPath = path.join(
      root,
      'public',
      'images',
      'logo.jpg'
    );

    const signaturePath = path.join(
      root,
      'public',
      'images',
      'principal_signature.png'
    );

    const stampPath = path.join(
      root,
      'public',
      'images',
      'college_stamp.png'
    );

    if (!fs.existsSync(regularFontPath)) {
      throw new Error(
        `Regular font not found: ${regularFontPath}`
      );
    }

    if (!fs.existsSync(boldFontPath)) {
      throw new Error(
        `Bold font not found: ${boldFontPath}`
      );
    }

    /* =====================================================
       APPLICANT NAME
    ===================================================== */

    const applicantName = [
      admission.surname,
      admission.middle_name,
      admission.first_name,
    ]
      .filter(
        (value): value is string =>
          typeof value === 'string' &&
          value.trim().length > 0
      )
      .join(' ')
      .trim();

    const firstName =
      admission.first_name ||
      applicantName ||
      'Student';

    /* =====================================================
       PDF
    ===================================================== */

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      font: regularFontPath,
      info: {
        Title: `SMTC Admission Letter - ${
          admission.admission_number || admission.application_number || ''
        }`,
        Author: 'Shifah Medical Training College',
        Subject: 'Official Admission Letter',
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

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const pdfPromise = new Promise<Buffer>(
      (resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        doc.on('error', reject);
      }
    );

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const left = 42;
    const right = pageWidth - 42;
    const contentWidth = right - left;

    const green = '#006B3F';
    const darkGreen = '#004D2C';
    const gold = '#D4AF37';
    const lightGreen = '#EAF5EF';
    const lightGray = '#F5F5F5';
    const gray = '#666666';
    const black = '#222222';
    const white = '#FFFFFF';

    /* =====================================================
       BACKGROUND
    ===================================================== */

    doc
      .rect(0, 0, pageWidth, pageHeight)
      .fill(white);

    doc
      .rect(0, 0, pageWidth, 8)
      .fill(green);

    doc
      .rect(0, 8, pageWidth, 3)
      .fill(gold);

    /* =====================================================
       LOGO
    ===================================================== */

    if (fs.existsSync(logoPath)) {
      try {
        doc.image(
          logoPath,
          left,
          25,
          {
            fit: [70, 70],
          }
        );
      } catch {
        // Continue without logo if the image cannot be read.
      }
    }

    /* =====================================================
       HEADER
    ===================================================== */

    doc
      .fillColor(green)
      .font('SMTC-Bold')
      .fontSize(16.5)
      .text(
        'SHIFAH MEDICAL TRAINING COLLEGE',
        120,
        30,
        {
          width: 435,
          align: 'center',
          lineBreak: false,
        }
      );

    doc
      .fillColor(gold)
      .font('SMTC-Bold')
      .fontSize(7.8)
      .text(
        'HEALTH THROUGH INNOVATION AND RESEARCH',
        120,
        52,
        {
          width: 435,
          align: 'center',
          characterSpacing: 0.4,
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(7.2)
      .text(
        'Ambwere Plaza, 2nd Floor, Kitale, Kenya',
        120,
        68,
        {
          width: 435,
          align: 'center',
          lineBreak: false,
        }
      );

    doc.text(
      'Tel: +254 142 068 933  |  shifahmedicalcollege.co.ke',
      120,
      80,
      {
        width: 435,
        align: 'center',
        lineBreak: false,
      }
    );

    doc
      .moveTo(left, 103)
      .lineTo(right, 103)
      .lineWidth(1.5)
      .strokeColor(gold)
      .stroke();

    /* =====================================================
       TITLE
    ===================================================== */

    doc
      .fillColor(green)
      .font('SMTC-Bold')
      .fontSize(15.5)
      .text(
        'ADMISSION LETTER',
        left,
        116,
        {
          width: contentWidth,
          align: 'center',
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(7.2)
      .text(
        'OFFICIAL OFFER OF ADMISSION',
        left,
        138,
        {
          width: contentWidth,
          align: 'center',
          lineBreak: false,
        }
      );

    /* =====================================================
       ADMISSION NUMBER
    ===================================================== */

    doc
      .roundedRect(
        left,
        157,
        contentWidth,
        43,
        5
      )
      .fill(lightGreen);

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(7.2)
      .text(
        'ADMISSION NUMBER',
        left + 14,
        167,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(green)
      .font('SMTC-Bold')
      .fontSize(10.5)
      .text(
        admission.admission_number || 'N/A',
        left + 14,
        181,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(7.2)
      .text(
        `Date: ${formatDate(admission.admission_date)}`,
        left + 315,
        176,
        {
          width: 145,
          align: 'right',
          lineBreak: false,
        }
      );

    /* =====================================================
       ADDRESS
    ===================================================== */

    doc
      .fillColor(black)
      .font('SMTC-Bold')
      .fontSize(8.8)
      .text(
        applicantName || 'N/A',
        left,
        216,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(7.3);

    if (admission.postal_address) {
      doc.text(
        admission.postal_address,
        left,
        230,
        {
          lineBreak: false,
        }
      );
    }

    if (admission.postal_code) {
      doc.text(
        admission.postal_code,
        left,
        241,
        {
          lineBreak: false,
        }
      );
    }

    if (admission.town) {
      doc.text(
        admission.town,
        left,
        252,
        {
          lineBreak: false,
        }
      );
    }

    /* =====================================================
       SUBJECT
    ===================================================== */

    doc
      .fillColor(black)
      .font('SMTC-Bold')
      .fontSize(8.8)
      .text(
        'RE: OFFER OF ADMISSION',
        left,
        269,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(black)
      .font('SMTC-Regular')
      .fontSize(8.3)
      .text(
        `Dear ${firstName},`,
        left,
        291,
        {
          lineBreak: false,
        }
      );

    doc
      .font('SMTC-Regular')
      .fontSize(8.3)
      .text(
        `We are pleased to inform you that you have been offered admission to Shifah Medical Training College to pursue the ${
          admission.course || 'selected programme'
        } programme.`,
        left,
        310,
        {
          width: contentWidth,
          align: 'justify',
          lineGap: 1.5,
        }
      );

    /* =====================================================
       ADMISSION DETAILS
    ===================================================== */

    const detailsY = 344;
    const detailsHeight = 89;

    doc
      .roundedRect(
        left,
        detailsY,
        contentWidth,
        detailsHeight,
        5
      )
      .fill(lightGray);

    doc
      .roundedRect(
        left,
        detailsY,
        5,
        detailsHeight,
        2
      )
      .fill(green);

    doc
      .fillColor(green)
      .font('SMTC-Bold')
      .fontSize(8.2)
      .text(
        'ADMISSION DETAILS',
        left + 17,
        detailsY + 10,
        {
          lineBreak: false,
        }
      );

    const detailX = left + 155;

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(7.3)
      .text(
        'Admission Number',
        left + 17,
        detailsY + 29,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(black)
      .font('SMTC-Bold')
      .fontSize(7.6)
      .text(
        admission.admission_number || 'N/A',
        detailX,
        detailsY + 29,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .text(
        'Programme',
        left + 17,
        detailsY + 47,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(black)
      .font('SMTC-Bold')
      .text(
        admission.course || 'N/A',
        detailX,
        detailsY + 47,
        {
          width: 340,
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .text(
        'Intake',
        left + 17,
        detailsY + 65,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(black)
      .font('SMTC-Bold')
      .text(
        admission.intake || 'N/A',
        detailX,
        detailsY + 65,
        {
          width: 340,
          lineBreak: false,
        }
      );

    /* =====================================================
       BODY
    ===================================================== */

    doc
      .fillColor(black)
      .font('SMTC-Regular')
      .fontSize(8.15)
      .text(
        `Your admission is for the ${
          admission.intake || 'selected intake'
        }. Your official admission number is ${
          admission.admission_number || 'N/A'
        }. Please quote this admission number in all future correspondence with the College.`,
        left,
        449,
        {
          width: contentWidth,
          align: 'justify',
          lineGap: 1.5,
        }
      );

    doc.text(
      'You are expected to report to the College on the official reporting date communicated by the Admissions Office. Upon reporting, you will be required to complete the necessary registration and admission procedures.',
      left,
      490,
      {
        width: contentWidth,
        align: 'justify',
        lineGap: 1.5,
      }
    );

    doc.text(
      'Please bring the relevant original academic certificates, identification documents and other required supporting documents together with copies as may be required during registration.',
      left,
      530,
      {
        width: contentWidth,
        align: 'justify',
        lineGap: 1.5,
      }
    );

    /* =====================================================
       NOTICE
    ===================================================== */

    const noticeY = 568;
    const noticeHeight = 51;

    doc
      .roundedRect(
        left,
        noticeY,
        contentWidth,
        noticeHeight,
        5
      )
      .fill(lightGreen);

    doc
      .fillColor(green)
      .font('SMTC-Bold')
      .fontSize(7.8)
      .text(
        'IMPORTANT NOTICE',
        left + 13,
        noticeY + 9,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(black)
      .font('SMTC-Regular')
      .fontSize(7)
      .text(
        'This offer of admission is subject to verification of the information and documents provided in your application and compliance with the College admission requirements.',
        left + 13,
        noticeY + 23,
        {
          width: contentWidth - 26,
          align: 'justify',
          lineGap: 1,
        }
      );

    /* =====================================================
       CLOSING
    ===================================================== */

    doc
      .fillColor(black)
      .font('SMTC-Regular')
      .fontSize(8.2)
      .text(
        'We congratulate you on your admission and look forward to welcoming you to Shifah Medical Training College.',
        left,
        632,
        {
          width: contentWidth,
          align: 'justify',
          lineGap: 1.5,
        }
      );

    doc
      .fillColor(black)
      .font('SMTC-Regular')
      .fontSize(8)
      .text(
        'Yours faithfully,',
        left,
        665,
        {
          lineBreak: false,
        }
      );

    /* =====================================================
       SIGNATURE
    ===================================================== */

    if (fs.existsSync(signaturePath)) {
      try {
        doc.image(
          signaturePath,
          left,
          680,
          {
            fit: [170, 78],
          }
        );
      } catch {
        // Continue without signature.
      }
    }

    /* =====================================================
       STAMP
    ===================================================== */

    if (fs.existsSync(stampPath)) {
      try {
        doc.image(
          stampPath,
          left + 285,
          674,
          {
            fit: [185, 185],
          }
        );
      } catch {
        // Continue without stamp.
      }
    }

    doc
      .moveTo(left, 721)
      .lineTo(left + 150, 721)
      .lineWidth(0.7)
      .strokeColor(gray)
      .stroke();

    doc
      .fillColor(green)
      .font('SMTC-Bold')
      .fontSize(8)
      .text(
        'PRINCIPAL',
        left,
        726,
        {
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(7)
      .text(
        'Shifah Medical Training College',
        left,
        739,
        {
          lineBreak: false,
        }
      );

    /* =====================================================
       FOOTER
    ===================================================== */

    const footerLineY = 766;

    doc
      .moveTo(left, footerLineY)
      .lineTo(right, footerLineY)
      .lineWidth(1)
      .strokeColor(gold)
      .stroke();

    doc
      .fillColor(green)
      .font('SMTC-Bold')
      .fontSize(7.5)
      .text(
        'SHIFAH MEDICAL TRAINING COLLEGE',
        left,
        footerLineY + 10,
        {
          width: contentWidth,
          align: 'center',
          lineBreak: false,
        }
      );

    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(6.8)
      .text(
        'Health through innovation and research',
        left,
        footerLineY + 23,
        {
          width: contentWidth,
          align: 'center',
          lineBreak: false,
        }
      );

    doc
      .fillColor(gold)
      .font('SMTC-Bold')
      .fontSize(6.2)
      .text(
        'OFFICIAL ADMISSION DOCUMENT',
        left,
        footerLineY + 35,
        {
          width: contentWidth,
          align: 'center',
          characterSpacing: 0.4,
          lineBreak: false,
        }
      );

    /* =====================================================
       FINISH
    ===================================================== */

    doc.end();

    const pdfBuffer = await pdfPromise;

    const safeAdmissionNumber = safeFileName(
      admission.admission_number ||
        admission.application_number ||
        String(admission.admission_id)
    );

    const url = new URL(request.url);

    const download =
      url.searchParams.get('download') === '1';

    const disposition = download
      ? 'attachment'
      : 'inline';

    return new NextResponse(
      new Uint8Array(pdfBuffer),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition':
            `${disposition}; filename="SMTC-Admission-Letter-${safeAdmissionNumber}.pdf"`,
          'Content-Length': String(pdfBuffer.length),
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      'PARENT ADMISSION LETTER ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to generate admission letter.',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

