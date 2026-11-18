
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SchemeRow = {
  id: number;
  lecturer_id: number;

  reference_number: string | null;
  academic_year: string | null;
  term: string | null;
  title: string | null;
  status: string | null;

  trainer_name: string | null;
  trainer_telephone: string | null;
  trainer_email: string | null;

  course_name_level: string | null;
  competency_area: string | null;
  date_of_preparation: string | Date | null;

  institution: string | null;
  intake: string | null;
  module: string | null;

  supervisor_name: string | null;
  supervisor_signature: string | null;

  created_at: string | Date;
  updated_at: string | Date;
};

type EntryRow = {
  id: number;
  week_number: number | null;

  // New official SMTC fields
  lesson_title: string | null;
  objectives: string | null;
  key_points: string | null;
  application_activities: string | null;
  references_aids: string | null;
  date_taught: string | Date | null;

  // Legacy fields
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

type TableColumn = {
  key: string;
  label: string;
  width: number;
};

type MetadataItem = {
  label: string;
  value: string;
};

/* -------------------------------------------------------------------------- */
/* COLORS                                                                     */
/* -------------------------------------------------------------------------- */

const GREEN = '#0F4F3F';
const DARK_GREEN = '#0C1F1A';
const GOLD = '#D7A93B';

const GREY = '#64748B';
const TEXT = '#1E293B';
const LIGHT_GREY = '#F1F5F9';
const BORDER = '#CBD5E1';
const WHITE = '#FFFFFF';

/* -------------------------------------------------------------------------- */
/* PAGE SETTINGS                                                              */
/* -------------------------------------------------------------------------- */

const PAGE_MARGIN = 35;
const FOOTER_HEIGHT = 30;
const CELL_PADDING_X = 5;
const CELL_PADDING_Y = 6;

const BODY_FONT_SIZE = 7.2;
const BODY_LINE_GAP = 2;

const MIN_ROW_HEIGHT = 35;
const TABLE_HEADER_HEIGHT = 36;

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function safeText(
  value: string | null | undefined,
): string {
  return value?.trim() || '—';
}

function formatDate(
  value: string | Date | null | undefined,
): string {
  if (!value) return '—';

  let date: Date;

  // Avoid timezone shifts for PostgreSQL DATE values.
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    date = new Date(`${value}T00:00:00.000Z`);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function normalizeEntry(entry: EntryRow) {
  return {
    week: entry.week_number
      ? `Week ${entry.week_number}`
      : '—',

    lessonTitle:
      safeText(entry.lesson_title) !== '—'
        ? safeText(entry.lesson_title)
        : safeText(entry.topic),

    objectives:
      safeText(entry.objectives) !== '—'
        ? safeText(entry.objectives)
        : safeText(entry.learning_outcomes),

    keyPoints: safeText(entry.key_points),

    activities:
      safeText(entry.application_activities) !== '—'
        ? safeText(entry.application_activities)
        : safeText(entry.activities),

    references:
      safeText(entry.references_aids) !== '—'
        ? safeText(entry.references_aids)
        : safeText(entry.resources),

    remarks: safeText(entry.remarks),

    dateTaught: formatDate(
      entry.date_taught || entry.start_date,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* PDF GENERATOR                                                              */
/* -------------------------------------------------------------------------- */

async function generatePdf(
  scheme: SchemeRow,
  entries: EntryRow[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',

      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
      },

      bufferPages: true,
      autoFirstPage: true,

      info: {
        Title: scheme.title || 'Scheme of Work',
        Author: 'Shifah Medical Training College',
        Subject: 'Official Academic Scheme of Work',
      },
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const left = PAGE_MARGIN;
    const right = pageWidth - PAGE_MARGIN;

    const contentWidth = right - left;

    const footerY = pageHeight - FOOTER_HEIGHT;
    const bottomLimit = footerY - 12;

    let y = PAGE_MARGIN;

    /* ---------------------------------------------------------------------- */
    /* HEADER                                                                 */
    /* ---------------------------------------------------------------------- */

    const drawHeader = () => {
      y = PAGE_MARGIN;

      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor(GREEN)
        .text(
          'SHIFAH MEDICAL TRAINING COLLEGE',
          left,
          y,
          {
            width: contentWidth,
            align: 'center',
            lineBreak: false,
          },
        );

      y += 23;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(GREY)
        .text(
          'Health through Innovation and Research',
          left,
          y,
          {
            width: contentWidth,
            align: 'center',
            lineBreak: false,
          },
        );

      y += 17;

      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(2)
        .strokeColor(GOLD)
        .stroke();

      y += 11;

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(DARK_GREEN)
        .text(
          'SCHEMES OF WORK',
          left,
          y,
          {
            width: contentWidth,
            align: 'center',
            lineBreak: false,
          },
        );

      y += 24;
    };

    /* ---------------------------------------------------------------------- */
    /* FOOTER                                                                  */
    /* ---------------------------------------------------------------------- */

    const drawFooter = () => {
      const range = doc.bufferedPageRange();

      for (
        let i = range.start;
        i < range.start + range.count;
        i++
      ) {
        doc.switchToPage(i);

        doc
          .moveTo(left, footerY - 8)
          .lineTo(right, footerY - 8)
          .lineWidth(0.5)
          .strokeColor(BORDER)
          .stroke();

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(GREY)
          .text(
            'Shifah Medical Training College | Academic Documentation',
            left,
            footerY,
            {
              width: contentWidth / 2,
              lineBreak: false,
            },
          );

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(GREY)
          .text(
            `Page ${i + 1} of ${range.count}`,
            left + contentWidth / 2,
            footerY,
            {
              width: contentWidth / 2,
              align: 'right',
              lineBreak: false,
            },
          );
      }
    };

    /* ---------------------------------------------------------------------- */
    /* PAGE BREAK                                                             */
    /* ---------------------------------------------------------------------- */

    const newPage = (
      repeatTableHeader = false,
    ) => {
      doc.addPage();

      drawHeader();

      if (repeatTableHeader) {
        drawTableHeader();
      }
    };

    /* ---------------------------------------------------------------------- */
    /* SECTION HEADING                                                        */
    /* ---------------------------------------------------------------------- */

    const drawSectionHeading = (
      heading: string,
    ) => {
      const height = 23;

      doc
        .roundedRect(
          left,
          y,
          contentWidth,
          height,
          3,
        )
        .fill(LIGHT_GREY);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(DARK_GREEN)
        .text(
          heading,
          left + 8,
          y + 7,
          {
            width: contentWidth - 16,
            lineBreak: false,
          },
        );

      y += height + 8;
    };

    /* ---------------------------------------------------------------------- */
    /* METADATA                                                                */
    /* ---------------------------------------------------------------------- */

    const metadataItems: MetadataItem[] = [
      {
        label: 'Reference Number',
        value: safeText(scheme.reference_number),
      },
      {
        label: 'Academic Year',
        value: safeText(scheme.academic_year),
      },
      {
        label: 'Term',
        value: safeText(scheme.term),
      },
      {
        label: 'Institution',
        value: safeText(scheme.institution),
      },
      {
        label: 'Trainer Name',
        value: safeText(scheme.trainer_name),
      },
      {
        label: 'Trainer Telephone',
        value: safeText(scheme.trainer_telephone),
      },
      {
        label: 'Trainer Email',
        value: safeText(scheme.trainer_email),
      },
      {
        label: 'Course Name and Level',
        value: safeText(scheme.course_name_level),
      },
      {
        label: 'Competency Area',
        value: safeText(scheme.competency_area),
      },
      {
        label: 'Intake',
        value: safeText(scheme.intake),
      },
      {
        label: 'Module',
        value: safeText(scheme.module),
      },
      {
        label: 'Date of Preparation',
        value: formatDate(scheme.date_of_preparation),
      },
    ];

    const drawMetadata = () => {
      drawSectionHeading('SCHEME INFORMATION');

      const gap = 12;
      const columnWidth = (contentWidth - gap) / 2;

      const cardPadding = 7;
      const labelHeight = 10;
      const valueFontSize = 8;

      const rows: [
        MetadataItem,
        MetadataItem,
      ][] = [];

      for (
        let i = 0;
        i < metadataItems.length;
        i += 2
      ) {
        rows.push([
          metadataItems[i],
          metadataItems[i + 1] || {
            label: '',
            value: '',
          },
        ]);
      }

      for (const row of rows) {
        const heights = row.map((item) => {
          if (!item.label) return 0;

          doc
            .font('Helvetica')
            .fontSize(valueFontSize);

          const valueHeight = doc.heightOfString(
            item.value,
            {
              width: columnWidth - cardPadding * 2,
              lineGap: 1,
            },
          );

          return (
            cardPadding +
            labelHeight +
            3 +
            valueHeight +
            cardPadding
          );
        });

        const cardHeight = Math.max(
          32,
          ...heights,
        );

        if (y + cardHeight > bottomLimit - 10) {
          newPage();
        }

        row.forEach((item, index) => {
          if (!item.label) return;

          const x =
            left +
            index * (columnWidth + gap);

          doc
            .roundedRect(
              x,
              y,
              columnWidth,
              cardHeight,
              3,
            )
            .lineWidth(0.6)
            .strokeColor(BORDER)
            .stroke();

          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor(GREY)
            .text(
              item.label.toUpperCase(),
              x + cardPadding,
              y + cardPadding,
              {
                width: columnWidth - cardPadding * 2,
                lineBreak: false,
              },
            );

          doc
            .font('Helvetica')
            .fontSize(valueFontSize)
            .fillColor(TEXT)
            .text(
              item.value,
              x + cardPadding,
              y + cardPadding + labelHeight + 3,
              {
                width: columnWidth - cardPadding * 2,
                lineGap: 1,
              },
            );
        });

        y += cardHeight + 7;
      }
    };

    /* ---------------------------------------------------------------------- */
    /* TABLE COLUMNS                                                           */
    /* ---------------------------------------------------------------------- */

    // All column widths are proportional to the available page width.
    // Their total is exactly the printable page width.

    const columnDefinitions = [
      {
        key: 'week',
        label: 'WEEK',
        weight: 0.055,
      },
      {
        key: 'lessonTitle',
        label: 'LESSON TITLE',
        weight: 0.14,
      },
      {
        key: 'objectives',
        label: 'OBJECTIVES',
        weight: 0.15,
      },
      {
        key: 'keyPoints',
        label: 'KEY POINTS',
        weight: 0.15,
      },
      {
        key: 'activities',
        label: 'APPLICATION / ACTIVITIES',
        weight: 0.17,
      },
      {
        key: 'references',
        label: 'REF. & AIDS',
        weight: 0.14,
      },
      {
        key: 'remarks',
        label: 'REMARKS / DATE TAUGHT',
        weight: 0.195,
      },
    ] as const;

    const totalWeight = columnDefinitions.reduce(
      (total, column) => total + column.weight,
      0,
    );

    const columns: TableColumn[] =
      columnDefinitions.map((column) => ({
        key: column.key,
        label: column.label,
        width:
          contentWidth *
          (column.weight / totalWeight),
      }));

    // Remove any floating-point width discrepancy.
    const calculatedWidth = columns.reduce(
      (total, column) => total + column.width,
      0,
    );

    columns[columns.length - 1].width +=
      contentWidth - calculatedWidth;

    /* ---------------------------------------------------------------------- */
    /* TABLE HEADER                                                            */
    /* ---------------------------------------------------------------------- */

    const drawTableHeader = () => {
      doc
        .rect(
          left,
          y,
          contentWidth,
          TABLE_HEADER_HEIGHT,
        )
        .fill(GREEN);

      let x = left;

      columns.forEach((column, index) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(7)
          .fillColor(WHITE)
          .text(
            column.label,
            x + CELL_PADDING_X,
            y + 8,
            {
              width:
                column.width -
                CELL_PADDING_X * 2,
              height: TABLE_HEADER_HEIGHT - 12,
              align: 'center',
              lineGap: 1,
            },
          );

        if (index > 0) {
          doc
            .moveTo(x, y)
            .lineTo(
              x,
              y + TABLE_HEADER_HEIGHT,
            )
            .lineWidth(0.5)
            .strokeColor('#FFFFFF')
            .stroke();
        }

        x += column.width;
      });

      y += TABLE_HEADER_HEIGHT;
    };

    /* ---------------------------------------------------------------------- */
    /* TABLE ROW HEIGHT                                                        */
    /* ---------------------------------------------------------------------- */

    const measureRowHeight = (
      values: string[],
    ): number => {
      const heights = values.map(
        (value, index) => {
          const column = columns[index];

          doc
            .font('Helvetica')
            .fontSize(BODY_FONT_SIZE);

          return doc.heightOfString(
            value,
            {
              width:
                column.width -
                CELL_PADDING_X * 2,
              lineGap: BODY_LINE_GAP,
            },
          );
        },
      );

      return Math.max(
        MIN_ROW_HEIGHT,
        ...heights.map(
          (height) =>
            height + CELL_PADDING_Y * 2,
        ),
      );
    };

    /* ---------------------------------------------------------------------- */
    /* DRAW TABLE ROW                                                          */
    /* ---------------------------------------------------------------------- */

    const drawTableRow = (
      values: string[],
      index: number,
    ) => {
      const rowHeight = measureRowHeight(values);

      // Move a complete row to the next page when necessary.
      if (y + rowHeight > bottomLimit) {
        newPage(true);
      }

      const rowTop = y;

      // Alternate row background for readability.
      doc
        .rect(
          left,
          rowTop,
          contentWidth,
          rowHeight,
        )
        .fill(index % 2 === 0 ? WHITE : '#F8FAFC');

      let x = left;

      values.forEach((value, columnIndex) => {
        const column = columns[columnIndex];

        doc
          .font('Helvetica')
          .fontSize(BODY_FONT_SIZE)
          .fillColor(TEXT)
          .text(
            value,
            x + CELL_PADDING_X,
            rowTop + CELL_PADDING_Y,
            {
              width:
                column.width -
                CELL_PADDING_X * 2,
              height:
                rowHeight -
                CELL_PADDING_Y * 2,
              lineGap: BODY_LINE_GAP,
              ellipsis: false,
            },
          );

        // Vertical column divider.
        if (columnIndex > 0) {
          doc
            .moveTo(x, rowTop)
            .lineTo(
              x,
              rowTop + rowHeight,
            )
            .lineWidth(0.5)
            .strokeColor(BORDER)
            .stroke();
        }

        x += column.width;
      });

      // Row border.
      doc
        .rect(
          left,
          rowTop,
          contentWidth,
          rowHeight,
        )
        .lineWidth(0.5)
        .strokeColor(BORDER)
        .stroke();

      y += rowHeight;
    };

    /* ---------------------------------------------------------------------- */
    /* WEEKLY TEACHING SCHEDULE                                                */
    /* ---------------------------------------------------------------------- */

    const drawWeeklySchedule = () => {
      if (y + 80 > bottomLimit) {
        newPage();
      }

      drawSectionHeading(
        'WEEKLY TEACHING SCHEDULE',
      );

      drawTableHeader();

      if (entries.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(GREY)
          .text(
            'No weekly entries have been added to this scheme.',
            left + 5,
            y + 12,
            {
              width: contentWidth - 10,
            },
          );

        y += 35;
        return;
      }

      entries.forEach((entry, index) => {
        const normalized = normalizeEntry(entry);

        const values = [
          normalized.week,
          normalized.lessonTitle,
          normalized.objectives,
          normalized.keyPoints,
          normalized.activities,
          normalized.references,
          [
            normalized.remarks,
            `Date taught: ${normalized.dateTaught}`,
          ].join('\n\n'),
        ];

        drawTableRow(values, index);
      });
    };

    /* ---------------------------------------------------------------------- */
    /* SUPERVISOR VERIFICATION                                                 */
    /* ---------------------------------------------------------------------- */

    const drawSupervisorSection = () => {
      const sectionHeight = 120;

      if (y + sectionHeight > bottomLimit) {
        newPage();
      }

      y += 16;

      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(0.8)
        .strokeColor(GOLD)
        .stroke();

      y += 12;

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(DARK_GREEN)
        .text(
          'SUPERVISOR VERIFICATION',
          left,
          y,
          {
            width: contentWidth,
            lineBreak: false,
          },
        );

      y += 24;

      const gap = 25;
      const columnWidth = (contentWidth - gap) / 2;

      // Supervisor name.
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(TEXT)
        .text(
          'Supervisor Name:',
          left,
          y,
          {
            width: 105,
            lineBreak: false,
          },
        );

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(TEXT)
        .text(
          safeText(scheme.supervisor_name),
          left + 105,
          y,
          {
            width: columnWidth - 105,
          },
        );

      // Supervisor signature.
      const rightColumnX = left + columnWidth + gap;

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(TEXT)
        .text(
          'Supervisor Signature:',
          rightColumnX,
          y,
          {
            width: 110,
            lineBreak: false,
          },
        );

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(TEXT)
        .text(
          safeText(scheme.supervisor_signature),
          rightColumnX + 110,
          y,
          {
            width: columnWidth - 110,
          },
        );

      y += 26;

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(TEXT)
        .text(
          'Date:',
          left,
          y,
          {
            lineBreak: false,
          },
        );

      doc
        .moveTo(left + 35, y + 10)
        .lineTo(left + 180, y + 10)
        .lineWidth(0.6)
        .strokeColor(BORDER)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(TEXT)
        .text(
          'Official Stamp:',
          rightColumnX,
          y,
          {
            lineBreak: false,
          },
        );

      doc
        .rect(
          rightColumnX + 80,
          y - 3,
          125,
          38,
        )
        .lineWidth(0.7)
        .strokeColor(BORDER)
        .stroke();
    };

    /* ---------------------------------------------------------------------- */
    /* GENERATE DOCUMENT                                                       */
    /* ---------------------------------------------------------------------- */

    try {
      drawHeader();

      drawMetadata();

      drawWeeklySchedule();

      drawSupervisorSection();

      // Footer is added to every page after the complete page count is known.
      drawFooter();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* GET: DOWNLOAD SCHEME PDF                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          error:
            'You must be logged in to download this scheme.',
        },
        { status: 401 },
      );
    }

    const { id } = await params;

    const schemeId = Number(id);

    if (
      !Number.isInteger(schemeId) ||
      schemeId <= 0
    ) {
      return NextResponse.json(
        {
          error: 'Invalid scheme ID.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FETCH SCHEME AND VERIFY OWNERSHIP                                       */
    /* ---------------------------------------------------------------------- */

    const schemeResult = await pool.query(
      `
        SELECT
          id,
          lecturer_id,

          reference_number,
          academic_year,
          term,
          title,
          status,

          trainer_name,
          trainer_telephone,
          trainer_email,

          course_name_level,
          competency_area,
          date_of_preparation,

          institution,
          intake,
          module,

          supervisor_name,
          supervisor_signature,

          created_at,
          updated_at

        FROM lms_schemes_of_work

        WHERE id = $1
          AND lecturer_id = $2

        LIMIT 1
      `,
      [
        schemeId,
        lecturer.id,
      ],
    );

    if (schemeResult.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            'Scheme not found or you do not have permission to access it.',
        },
        { status: 404 },
      );
    }

    const scheme = schemeResult.rows[0] as SchemeRow;

    /* ---------------------------------------------------------------------- */
    /* FETCH WEEKLY ENTRIES                                                    */
    /* ---------------------------------------------------------------------- */

    const entriesResult = await pool.query(
      `
        SELECT
          id,
          week_number,

          lesson_title,
          objectives,
          key_points,
          application_activities,
          references_aids,
          date_taught,

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

        ORDER BY
          week_number ASC,
          id ASC
      `,
      [schemeId],
    );

    const entries = entriesResult.rows as EntryRow[];

    /* ---------------------------------------------------------------------- */
    /* GENERATE PDF                                                           */
    /* ---------------------------------------------------------------------- */

    const pdfBuffer = await generatePdf(
      scheme,
      entries,
    );

    const filename =
      `SMTC-Scheme-of-Work-${scheme.reference_number || scheme.id}.pdf`;

    return new Response(
      new Uint8Array(pdfBuffer),
      {
        status: 200,

        headers: {
          'Content-Type': 'application/pdf',

          'Content-Disposition':
            `attachment; filename="${filename}"`,

          'Content-Length': String(pdfBuffer.length),

          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error: unknown) {
    console.error(
      'Generate scheme of work PDF ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while generating the scheme PDF.',
      },
      { status: 500 },
    );
  }
}
