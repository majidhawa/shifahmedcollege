
import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import pool from '@/lib/db';
import fs from 'node:fs';
import path from 'node:path';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RecordEntry = {
  date?: string;
  topic?: string;
  subTopic?: string;
  remarks?: string;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    /* =====================================================
       LECTURER AUTHENTICATION
    ===================================================== */

    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       VALIDATE RECORD ID
    ===================================================== */

    const { id } = await context.params;
    const recordId = Number(id);

    if (!Number.isInteger(recordId) || recordId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid record ID.',
        },
        { status: 400 }
      );
    }

    console.log('====================================');
    console.log('SMTC RECORD OF WORK PDF REQUEST');
    console.log('Record ID:', recordId);
    console.log('Lecturer ID:', lecturer.id);
    console.log('====================================');

    /* =====================================================
       FETCH RECORD

       A lecturer can only download their own record.
    ===================================================== */

    const result = await pool.query(
      `
        SELECT *
        FROM lms_records_of_work
        WHERE id = $1
          AND lecturer_id = $2
        LIMIT 1
      `,
      [recordId, lecturer.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Record not found.',
        },
        { status: 404 }
      );
    }

    const record = result.rows[0];

    /* =====================================================
       FONT PATHS

       Use custom fonts to prevent PDFKit from attempting
       to load its missing built-in Helvetica.afm file.
    ===================================================== */

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
       LOGO PATH
    ===================================================== */

    const logoPath = path.join(
      process.cwd(),
      'public',
      'images',
      'logo.png'
    );

    const logoExists = fs.existsSync(logoPath);

    console.log('SMTC logo:', logoExists);

    /* =====================================================
       SMTC BRAND COLOURS
    ===================================================== */

    const COLORS = {
      green: '#0F4F3F',
      darkGreen: '#0C1F1A',
      gold: '#D7A93B',
      lightGreen: '#EAF3EF',
      cream: '#F8F6EF',
      white: '#FFFFFF',
      black: '#222222',
      gray: '#666666',
      border: '#B8C8C0',
      lightGray: '#F5F6F4',
    };

    /* =====================================================
       HELPER FUNCTIONS
    ===================================================== */

    const safeText = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }

      return String(value).trim();
    };

    const formatDate = (value: unknown): string => {
      if (!value) return '';

      const date = new Date(
        typeof value === 'string'
          ? value.includes('T')
            ? value
            : `${value}T00:00:00`
          : value as Date
      );

      if (Number.isNaN(date.getTime())) {
        return safeText(value);
      }

      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    };

    const referenceNumber =
      safeText(record.reference_number) ||
      `SMTC-RWC-${recordId}`;

    const safeFilename = referenceNumber.replace(
      /[^a-zA-Z0-9_-]/g,
      '-'
    );

    /* =====================================================
       CREATE PDF DOCUMENT

       Explicitly supply the custom regular font.
       This avoids PDFKit's built-in Helvetica font lookup.
    ===================================================== */

    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 38,
        bottom: 42,
        left: 38,
        right: 38,
      },
      bufferPages: true,
      font: regularFontPath,
      info: {
        Title: `SMTC Record of Work - ${referenceNumber}`,
        Author: 'Shifah Medical Training College',
        Subject: 'Official Record of Work Covered',
      },
    });

    /* =====================================================
       REGISTER FONTS
    ===================================================== */

    doc.registerFont(
      'SMTC-Regular',
      regularFontPath
    );

    doc.registerFont(
      'SMTC-Bold',
      boldFontPath
    );

    doc.font('SMTC-Regular');

    /* =====================================================
       PDF BUFFER
    ===================================================== */

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

    /* =====================================================
       PAGE DIMENSIONS
    ===================================================== */

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const left = 38;
    const right = pageWidth - 38;
    const width = right - left;

    const bottomLimit = 790;

    /* =====================================================
       REUSABLE TEXT STYLES
    ===================================================== */

    const setRegular = (size = 9) => {
      doc
        .font('SMTC-Regular')
        .fontSize(size)
        .fillColor(COLORS.black);
    };

    const setBold = (size = 9) => {
      doc
        .font('SMTC-Bold')
        .fontSize(size)
        .fillColor(COLORS.black);
    };

    /* =====================================================
       CELL DRAWING FUNCTION
    ===================================================== */

    const drawCell = (
      x: number,
      y: number,
      cellWidth: number,
      cellHeight: number,
      label: string,
      value = ''
    ) => {
      doc
        .rect(x, y, cellWidth, cellHeight)
        .lineWidth(0.65)
        .strokeColor(COLORS.border)
        .stroke();

      setBold(7);

      doc.text(
        label.toUpperCase(),
        x + 5,
        y + 5,
        {
          width: cellWidth - 10,
          height: 12,
          lineBreak: true,
        }
      );

      if (value) {
        setRegular(8);

        doc.text(
          value,
          x + 5,
          y + 21,
          {
            width: cellWidth - 10,
            height: cellHeight - 24,
            lineBreak: true,
            ellipsis: true,
          }
        );
      }
    };

    /* =====================================================
       PAGE BRANDING
    ===================================================== */

    const drawPageBranding = () => {
      doc
        .rect(0, 0, pageWidth, 8)
        .fill(COLORS.green);

      doc
        .rect(0, 8, pageWidth, 3)
        .fill(COLORS.gold);

      if (logoExists) {
        try {
          doc.image(
            logoPath,
            left,
            23,
            {
              fit: [66, 66],
            }
          );
        } catch (error) {
          console.error(
            'Unable to load SMTC logo:',
            error
          );
        }
      }

      setBold(15);

      doc
        .fillColor(COLORS.green)
        .text(
          'SHIFAH MEDICAL TRAINING COLLEGE',
          112,
          29,
          {
            width: 445,
            align: 'center',
            lineBreak: false,
          }
        );

      setBold(7.5);

      doc
        .fillColor(COLORS.gold)
        .text(
          'HEALTH THROUGH INNOVATION AND RESEARCH',
          112,
          51,
          {
            width: 445,
            align: 'center',
            characterSpacing: 0.4,
            lineBreak: false,
          }
        );

      setRegular(7);

      doc
        .fillColor(COLORS.gray)
        .text(
          'Ambwere Plaza, 2nd Floor, Kitale, Kenya',
          112,
          66,
          {
            width: 445,
            align: 'center',
            lineBreak: false,
          }
        );

      doc.text(
        'Tel: +254 142 068 933',
        112,
        78,
        {
          width: 445,
          align: 'center',
          lineBreak: false,
        }
      );

      doc
        .moveTo(left, 101)
        .lineTo(right, 101)
        .lineWidth(1.4)
        .strokeColor(COLORS.gold)
        .stroke();
    };

    /* =====================================================
       FIRST PAGE HEADER
    ===================================================== */

    drawPageBranding();

    let y = 117;

    setBold(13);

    doc
      .fillColor(COLORS.green)
      .text(
        'RECORD OF WORK COVERED',
        left,
        y,
        {
          width,
          align: 'center',
          lineBreak: false,
        }
      );

    y += 23;

    setBold(8);

    doc
      .fillColor(COLORS.gray)
      .text(
        `REFERENCE: ${referenceNumber}`,
        left,
        y,
        {
          width,
          align: 'center',
          lineBreak: false,
        }
      );

    y += 25;

    /* =====================================================
       TRAINER AND COURSE DETAILS
    ===================================================== */

    const h1 = 54;
    const h2 = 54;
    const h3 = 40;

    const c1 = 180;
    const c2 = 112;
    const c3 = 112;
    const c4 = width - c1 - c2 - c3;

    drawCell(
      left,
      y,
      c1,
      h1,
      'Trainer’s Name',
      safeText(record.trainer_name)
    );

    drawCell(
      left + c1,
      y,
      c2,
      h1,
      'Course Name',
      safeText(record.program_name)
    );

    drawCell(
      left + c1 + c2,
      y,
      c3,
      h1,
      'Course Level',
      safeText(record.course_level)
    );

    drawCell(
      left + c1 + c2 + c3,
      y,
      c4,
      h1,
      'Date / Time',
      `${formatDate(record.record_date)}${
        record.record_time
          ? `\n${safeText(record.record_time)}`
          : ''
      }`
    );

    y += h1;

    drawCell(
      left,
      y,
      c1,
      h2,
      'Tel. No.',
      safeText(record.trainer_phone)
    );

    drawCell(
      left + c1,
      y,
      c2,
      h2,
      'Intake',
      safeText(record.intake)
    );

    drawCell(
      left + c1 + c2,
      y,
      c3 + c4,
      h2,
      'No. of Students',
      record.student_count == null
        ? ''
        : String(record.student_count)
    );

    y += h2;

    drawCell(
      left,
      y,
      width,
      h3,
      'Competency Area',
      safeText(record.competency_area)
    );

    y += h3;

    drawCell(
      left,
      y,
      width,
      35,
      'Supervisor’s Signature',
      safeText(
        record.supervisor_signature ||
        record.supervisor_name
      )
    );

    y += 50;

    /* =====================================================
       WORK COVERED TABLE
    ===================================================== */

    const columns = [
      58,
      130,
      205,
      width - 58 - 130 - 205,
    ];

    const headers = [
      'DATE',
      'TOPIC',
      'SUB-TOPIC',
      'REMARKS',
    ];

    const headerHeight = 30;
    const rowHeight = 42;

    const drawTableHeader = (tableY: number) => {
      let x = left;

      headers.forEach((header, index) => {
        doc
          .rect(
            x,
            tableY,
            columns[index],
            headerHeight
          )
          .fillAndStroke(
            COLORS.green,
            COLORS.green
          );

        setBold(7.5);

        doc
          .fillColor(COLORS.white)
          .text(
            header,
            x + 3,
            tableY + 10,
            {
              width: columns[index] - 6,
              align: 'center',
              lineBreak: false,
            }
          );

        x += columns[index];
      });
    };

    const entries: RecordEntry[] =
      Array.isArray(record.entries)
        ? record.entries
        : [];

    drawTableHeader(y);
    y += headerHeight;

    /* =====================================================
       TABLE ROWS
    ===================================================== */

    const rows = Math.max(entries.length, 9);

    for (let i = 0; i < rows; i++) {
      if (y + rowHeight > bottomLimit) {
        doc.addPage();

        drawPageBranding();

        y = 119;

        setBold(10);

        doc
          .fillColor(COLORS.green)
          .text(
            'RECORD OF WORK COVERED (CONTINUED)',
            left,
            y,
            {
              width,
              align: 'center',
              lineBreak: false,
            }
          );

        y += 22;

        drawTableHeader(y);
        y += headerHeight;
      }

      const entry = entries[i] || {};

      const values = [
        formatDate(entry.date),
        safeText(entry.topic),
        safeText(entry.subTopic),
        safeText(entry.remarks),
      ];

      let x = left;

      values.forEach((value, index) => {
        doc
          .rect(
            x,
            y,
            columns[index],
            rowHeight
          )
          .lineWidth(0.6)
          .strokeColor(COLORS.border)
          .stroke();

        setRegular(8);

        doc
          .fillColor(COLORS.black)
          .text(
            value,
            x + 4,
            y + 5,
            {
              width: columns[index] - 8,
              height: rowHeight - 9,
              lineGap: 1,
              ellipsis: true,
            }
          );

        x += columns[index];
      });

      y += rowHeight;
    }

    /* =====================================================
       FOOTER ON ALL PAGES
    ===================================================== */

    const range = doc.bufferedPageRange();

    for (
      let page = range.start;
      page < range.start + range.count;
      page++
    ) {
      doc.switchToPage(page);

      const footerY = pageHeight - 34;

      doc
        .moveTo(left, footerY)
        .lineTo(right, footerY)
        .lineWidth(0.8)
        .strokeColor(COLORS.gold)
        .stroke();

      setRegular(6.5);

      doc
        .fillColor(COLORS.gray)
        .text(
          'SHIFAH MEDICAL TRAINING COLLEGE | RECORD OF WORK COVERED',
          left,
          footerY + 8,
          {
            width: width - 65,
            lineBreak: false,
          }
        );

      doc.text(
        `Page ${page + 1} of ${range.count}`,
        right - 60,
        footerY + 8,
        {
          width: 60,
          align: 'right',
          lineBreak: false,
        }
      );
    }

    /* =====================================================
       FINISH PDF GENERATION
    ===================================================== */

    doc.end();

    const pdfBuffer = await pdfPromise;

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error(
        'Generated Record of Work PDF is empty.'
      );
    }

    console.log(
      'Record of Work PDF generated successfully.'
    );

    console.log('Record ID:', recordId);
    console.log('Reference:', referenceNumber);
    console.log('PDF size:', pdfBuffer.length, 'bytes');

    /* =====================================================
       RETURN DOWNLOADABLE PDF

       This preserves the existing behaviour.
       No database columns are assumed for PDF storage.
    ===================================================== */

    return new NextResponse(
      new Uint8Array(pdfBuffer),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',

          'Content-Disposition':
            `attachment; filename="SMTC-Record-of-Work-${safeFilename}.pdf"`,

          'Content-Length':
            String(pdfBuffer.length),

          'Cache-Control':
            'private, no-store, no-cache, must-revalidate',

          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    console.error('====================================');
    console.error('RECORD OF WORK PDF ERROR');
    console.error('====================================');
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to generate Record of Work PDF.',
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
