
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SchemeRow = {
  id: number;
  lecturer_id: number;
  academic_year: string | null;
  term: string | null;
  title: string | null;
  status: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type EntryRow = {
  id: number;
  week_number: number | null;
  start_date: string | Date | null;
  end_date: string | Date | null;
  topic: string | null;
  subtopic: string | null;
  learning_outcomes: string | null;
  activities: string | null;
  resources: string | null;
  assessment: string | null;
  remarks: string | null;
};

const GREEN = '#0F4F3F';
const DARK_GREEN = '#0C1F1A';
const GOLD = '#D7A93B';
const GREY = '#64748B';
const LIGHT_GREY = '#F1F5F9';

function formatDate(value: string | Date | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function safeText(value: string | null | undefined) {
  return value?.trim() || '—';
}

async function generatePdf(
  scheme: SchemeRow,
  entries: EntryRow[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: {
        top: 35,
        bottom: 35,
        left: 35,
        right: 35,
      },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: scheme.title || 'Scheme of Work',
        Author: 'Shifah Medical Training College',
        Subject: 'Academic Scheme of Work',
      },
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 35;
    const right = pageWidth - 35;
    const contentWidth = right - left;

    let y = 35;

    const drawHeader = () => {
      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor(GREEN)
        .text('SHIFAH MEDICAL TRAINING COLLEGE', left, y, {
          width: contentWidth,
          align: 'center',
        });

      y += 23;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(GREY)
        .text('Health through Innovation and Research', left, y, {
          width: contentWidth,
          align: 'center',
        });

      y += 18;

      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(2)
        .strokeColor(GOLD)
        .stroke();

      y += 13;

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(DARK_GREEN)
        .text('SCHEMES OF WORK', left, y, {
          width: contentWidth,
          align: 'center',
        });

      y += 25;
    };

    const drawFooter = () => {
      const range = doc.bufferedPageRange();

      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(GREY)
          .text(
            'Shifah Medical Training College | Academic Documentation',
            left,
            pageHeight - 24,
            {
              width: contentWidth / 2,
              align: 'left',
              lineBreak: false,
            }
          );

        doc.text(
          `Page ${i + 1} of ${range.count}`,
          left + contentWidth / 2,
          pageHeight - 24,
          {
            width: contentWidth / 2,
            align: 'right',
            lineBreak: false,
          }
        );
      }
    };

    const drawMetadata = () => {
      const columnGap = 18;
      const columnWidth = (contentWidth - columnGap) / 2;

      const metadata = [
        [
          ['Reference / Scheme ID', `SMTC/SW/${scheme.id}`],
          ['Scheme Title', safeText(scheme.title)],
          ['Academic Year', safeText(scheme.academic_year)],
        ],
        [
          ['Term', safeText(scheme.term)],
          ['Status', safeText(scheme.status).toUpperCase()],
          ['Date Last Updated', formatDate(scheme.updated_at)],
        ],
      ];

      const startY = y;

      metadata.forEach((column, columnIndex) => {
        const x = left + columnIndex * (columnWidth + columnGap);
        let columnY = startY;

        column.forEach(([label, value]) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(DARK_GREEN)
            .text(`${label}:`, x, columnY, {
              width: 105,
              continued: true,
            });

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#334155')
            .text(` ${value}`, {
              width: columnWidth - 105,
            });

          columnY += 19;
        });
      });

      y = startY + 62;
    };

    const columns = [
      { key: 'week_number', label: 'WEEK', width: 38 },
      { key: 'topic', label: 'LESSON TITLE / TOPIC', width: 95 },
      { key: 'subtopic', label: 'SUBTOPIC', width: 78 },
      { key: 'learning_outcomes', label: 'OBJECTIVES', width: 112 },
      { key: 'activities', label: 'APPLICATION / ACTIVITIES', width: 115 },
      { key: 'resources', label: 'REF. & AIDS', width: 95 },
      { key: 'assessment', label: 'ASSESSMENT', width: 95 },
      { key: 'remarks', label: 'REMARKS', width: 107 },
    ] as const;

    const tableWidth = columns.reduce(
      (total, column) => total + column.width,
      0
    );

    const cellPadding = 5;
    const headerHeight = 32;
    const minimumRowHeight = 38;

    const drawTableHeader = () => {
      let x = left;

      doc
        .rect(left, y, tableWidth, headerHeight)
        .fill(GREEN);

      columns.forEach((column) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor('#FFFFFF')
          .text(
            column.label,
            x + cellPadding,
            y + 8,
            {
              width: column.width - cellPadding * 2,
              height: headerHeight - 10,
              align: 'center',
            }
          );

        x += column.width;
      });

      y += headerHeight;
    };

    const getCellValue = (
      entry: EntryRow,
      key: (typeof columns)[number]['key']
    ) => {
      if (key === 'week_number') {
        return entry.week_number ? `Week ${entry.week_number}` : '—';
      }

      return safeText(entry[key] as string | null);
    };

    const drawEntry = (entry: EntryRow) => {
      const values = columns.map((column) =>
        getCellValue(entry, column.key)
      );

      const heights = values.map((value, index) => {
        const column = columns[index];

        doc.font('Helvetica').fontSize(7);

        return doc.heightOfString(value, {
          width: column.width - cellPadding * 2,
          lineGap: 2,
        });
      });

      const rowHeight = Math.max(
        minimumRowHeight,
        ...heights.map((height) => height + cellPadding * 2)
      );

      if (y + rowHeight > pageHeight - 48) {
        doc.addPage();
        y = 35;
        drawHeader();
        drawTableHeader();
      }

      const rowTop = y;

      doc
        .rect(left, rowTop, tableWidth, rowHeight)
        .fill('#FFFFFF');

      doc
        .rect(left, rowTop, tableWidth, rowHeight)
        .lineWidth(0.5)
        .strokeColor('#CBD5E1')
        .stroke();

      let x = left;

      values.forEach((value, index) => {
        const column = columns[index];

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#1E293B')
          .text(
            value,
            x + cellPadding,
            rowTop + cellPadding,
            {
              width: column.width - cellPadding * 2,
              lineGap: 2,
            }
          );

        if (index > 0) {
          doc
            .moveTo(x, rowTop)
            .lineTo(x, rowTop + rowHeight)
            .lineWidth(0.5)
            .strokeColor('#CBD5E1')
            .stroke();
        }

        x += column.width;
      });

      y += rowHeight;
    };

    try {
      drawHeader();
      drawMetadata();

      // Weekly teaching schedule heading
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(DARK_GREEN)
        .text('WEEKLY TEACHING SCHEDULE', left, y);

      y += 18;

      if (entries.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(GREY)
          .text(
            'No weekly entries have been added to this scheme.',
            left,
            y
          );

        y += 25;
      } else {
        drawTableHeader();

        entries.forEach((entry) => {
          drawEntry(entry);
        });
      }

      // Supervisor section
      if (y + 75 > pageHeight - 45) {
        doc.addPage();
        y = 35;
        drawHeader();
      }

      y += 18;

      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(0.7)
        .strokeColor('#CBD5E1')
        .stroke();

      y += 15;

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(DARK_GREEN)
        .text('SUPERVISOR VERIFICATION', left, y);

      y += 24;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#334155')
        .text('Supervisor Name: __________________________________________', left, y);

      doc.text(
        'Supervisor Signature: __________________________________________',
        left + 370,
        y
      );

      y += 22;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#334155')
        .text('Date: ______________________________', left, y);

      drawFooter();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        { error: 'You must be logged in to download this scheme.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const schemeId = Number(id);

    if (!Number.isInteger(schemeId) || schemeId <= 0) {
      return NextResponse.json(
        { error: 'Invalid scheme ID.' },
        { status: 400 }
      );
    }

    // Verify that the scheme belongs to the signed-in lecturer.
    const schemeResult = await pool.query(
      `SELECT
          id,
          lecturer_id,
          academic_year,
          term,
          title,
          status,
          created_at,
          updated_at
       FROM lms_schemes_of_work
       WHERE id = $1 AND lecturer_id = $2
       LIMIT 1`,
      [schemeId, lecturer.id]
    );

    if (schemeResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Scheme not found or you do not have permission to access it.' },
        { status: 404 }
      );
    }

    const scheme = schemeResult.rows[0] as SchemeRow;

    // Retrieve the weekly teaching entries.
    const entriesResult = await pool.query(
      `SELECT
          id,
          week_number,
          start_date,
          end_date,
          topic,
          subtopic,
          learning_outcomes,
          activities,
          resources,
          assessment,
          remarks
       FROM lms_scheme_of_work_entries
       WHERE scheme_id = $1
       ORDER BY week_number ASC, id ASC`,
      [schemeId]
    );

    const entries = entriesResult.rows as EntryRow[];

    const pdfBuffer = await generatePdf(scheme, entries);

    const filename = `SMTC-Scheme-of-Work-${scheme.id}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Generate scheme of work PDF:', error);

    return NextResponse.json(
      { error: 'An error occurred while generating the scheme PDF.' },
      { status: 500 }
    );
  }
}
