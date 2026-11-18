
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type LessonPlanRow = {
  id: number;
  program_name: string;
  program_level: string | null;
  unit_code: string | null;
  unit_name: string | null;
  lecturer_id: number;
  trainer_name: string | null;
  trainer_phone: string | null;
  lesson_date: string | Date | null;
  lesson_time: string | null;
  duration_minutes: number | null;
  week_number: number | null;
  intake: string | null;
  student_count: number | null;
  competency_area: string | null;
  topic: string;
  subtopic: string | null;
  specific_objectives: string | null;
  resources: string | null;
  lesson_references: string | null;
  presentation: unknown;
  supervisor_signature: string | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function formatDate(value: string | Date | null): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return cleanText(value);
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
}

function formatTime(value: string | null): string {
  if (!value) return '';

  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = match[2];

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${period}`;
}

function formatPresentation(value: unknown): string {
  if (!value) return '';

  let presentation = value;

  if (typeof presentation === 'string') {
    try {
      presentation = JSON.parse(presentation);
    } catch {
      return cleanText(presentation);
    }
  }

  if (Array.isArray(presentation)) {
    return presentation
      .map((item) => {
        if (typeof item === 'string') {
          return cleanText(item);
        }

        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;

          return [
            cleanText(record.title),
            cleanText(record.content),
            cleanText(record.activity),
            cleanText(record.description),
          ]
            .filter(Boolean)
            .join('\n');
        }

        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  if (typeof presentation === 'object') {
    const record = presentation as Record<string, unknown>;

    return [
      cleanText(record.title),
      cleanText(record.content),
      cleanText(record.activity),
      cleanText(record.description),
    ]
      .filter(Boolean)
      .join('\n');
  }

  return cleanText(presentation);
}

function safeFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

/* -------------------------------------------------------------------------- */
/* PDF GENERATOR                                                              */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    /* ---------------------------------------------------------------------- */
    /* AUTHENTICATION                                                         */
    /* ---------------------------------------------------------------------- */

    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized.',
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const lessonPlanId = Number(id);

    if (!Number.isInteger(lessonPlanId) || lessonPlanId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lesson plan ID.',
        },
        { status: 400 },
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FETCH LESSON PLAN                                                      */
    /* ---------------------------------------------------------------------- */

    const result = await pool.query<LessonPlanRow>(
      `
        SELECT
          lp.id,
          lp.lecturer_id,

          lp.trainer_name,
          lp.trainer_phone,

          lp.lesson_date,
          lp.lesson_time,
          lp.duration_minutes,

          lp.intake,
          lp.student_count,
          lp.competency_area,

          lp.topic,
          lp.subtopic,
          lp.specific_objectives,
          lp.resources,
          lp.lesson_references,
          lp.presentation,
          lp.supervisor_signature,

          p.name AS program_name,
          p.level AS program_level,

          u.code AS unit_code,
          u.name AS unit_name,

          se.week_number

        FROM lms_lesson_plans lp

        INNER JOIN lms_programs p
          ON p.id = lp.program_id

        INNER JOIN lms_units u
          ON u.id = lp.unit_id

        LEFT JOIN lms_scheme_of_work_entries se
          ON se.id = lp.scheme_entry_id

        LEFT JOIN lms_schemes_of_work s
          ON s.id = se.scheme_id

        WHERE lp.id = $1
          AND lp.lecturer_id = $2
          AND (
            lp.scheme_entry_id IS NULL
            OR s.lecturer_id = lp.lecturer_id
          )

        LIMIT 1
      `,
      [lessonPlanId, lecturer.id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lesson plan not found or you do not have permission to download it.',
        },
        { status: 404 },
      );
    }

    const plan = result.rows[0];

    /* ---------------------------------------------------------------------- */
    /* ASSETS                                                                 */
    /* ---------------------------------------------------------------------- */

    const logoPath = path.join(
      process.cwd(),
      'public',
      'images',
      'logo.png',
    );

    const regularFontPath = path.join(
      process.cwd(),
      'public',
      'fonts',
      'DejaVuSans.ttf',
    );

    const boldFontPath = path.join(
      process.cwd(),
      'public',
      'fonts',
      'DejaVuSans-Bold.ttf',
    );

    if (
      !fs.existsSync(logoPath) ||
      !fs.existsSync(regularFontPath) ||
      !fs.existsSync(boldFontPath)
    ) {
      throw new Error(
        'Required PDF assets are missing. Check public/images/logo.png and public/fonts/.',
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DOCUMENT CONFIGURATION                                                 */
    /* ---------------------------------------------------------------------- */

    const doc = new PDFDocument({
      size: 'A4',

      margins: {
        top: 175,
        bottom: 48,
        left: 38,
        right: 38,
      },

      autoFirstPage: true,
      bufferPages: true,

      info: {
        Title: 'SMTC Trainer Lesson Plan',
        Author: 'Shifah Medical Training College',
        Subject: 'Trainer Lesson Plan',
      },
    });

    doc.registerFont('SMTC-Regular', regularFontPath);
    doc.registerFont('SMTC-Bold', boldFontPath);

    const chunks: Buffer[] = [];

    /* ---------------------------------------------------------------------- */
    /* PDF STREAM                                                             */
    /* ---------------------------------------------------------------------- */

    const pdfBuffer = await new Promise<Buffer>(
      (resolve, reject) => {
        doc.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.from(chunk));
        });

        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        doc.on('error', reject);

        /* ------------------------------------------------------------------ */
        /* DESIGN SETTINGS                                                    */
        /* ------------------------------------------------------------------ */

        const PAGE_WIDTH = doc.page.width;
        const PAGE_HEIGHT = doc.page.height;

        const LEFT = 38;
        const RIGHT = PAGE_WIDTH - 38;
        const WIDTH = RIGHT - LEFT;

        const GREEN = '#174B32';
        const GOLD = '#C7A34A';
        const LIGHT_GREEN = '#EDF4EF';
        const LIGHT_GOLD = '#F8F3E6';
        const BLACK = '#202020';
        const GREY = '#666666';
        const BORDER = '#B8C4BC';

        const TOP_LIMIT = 175;
        const BOTTOM_LIMIT = PAGE_HEIGHT - 48;

        const PADDING = 7;
        const CONTENT_WIDTH = WIDTH - PADDING * 2;

        const YEAR = plan.lesson_date
          ? new Date(plan.lesson_date).getFullYear()
          : new Date().getFullYear();

        const REFERENCE =
          `SMTC/LP/${YEAR}/${String(plan.id).padStart(3, '0')}`;

        /* ------------------------------------------------------------------ */
        /* FONT HELPERS                                                       */
        /* ------------------------------------------------------------------ */

        const regular = (size = 8) => {
          doc
            .font('SMTC-Regular')
            .fontSize(size)
            .fillColor(BLACK);
        };

        const bold = (size = 8) => {
          doc
            .font('SMTC-Bold')
            .fontSize(size)
            .fillColor(BLACK);
        };

        /* ------------------------------------------------------------------ */
        /* TEXT MEASUREMENT                                                   */
        /* ------------------------------------------------------------------ */

        function measureText(
          value: string,
          width: number,
          size = 8,
          isBold = false,
        ): number {
          if (!value) return 0;

          if (isBold) {
            bold(size);
          } else {
            regular(size);
          }

          return doc.heightOfString(value, {
            width,
            lineGap: 2,
            paragraphGap: 3,
          });
        }

        /* ------------------------------------------------------------------ */
        /* PAGE HEADER                                                        */
        /* ------------------------------------------------------------------ */

        function drawPageHeader() {
          const logoSize = 55;

          doc.image(
            logoPath,
            PAGE_WIDTH / 2 - logoSize / 2,
            12,
            {
              fit: [logoSize, logoSize],
              align: 'center',
              valign: 'center',
            },
          );

          bold(13);

          doc.text(
            'SHIFAH MEDICAL TRAINING COLLEGE',
            LEFT,
            69,
            {
              width: WIDTH,
              align: 'center',
              lineBreak: false,
            },
          );

          bold(7.5);

          doc.text(
            'P.O. BOX 37-4308, AMBWERE PLAZA, KITALE, KENYA',
            LEFT,
            85,
            {
              width: WIDTH,
              align: 'center',
            },
          );

          doc.text(
            'TEL: 0142-068-933',
            LEFT,
            97,
            {
              width: WIDTH,
              align: 'center',
            },
          );

          doc
            .moveTo(LEFT + 35, 113)
            .lineTo(RIGHT - 35, 113)
            .lineWidth(2)
            .strokeColor(GREEN)
            .stroke();

          bold(9);

          doc.text(
            'OFFICE OF THE REGISTRAR',
            LEFT,
            118,
            {
              width: WIDTH,
              align: 'center',
            },
          );

          regular(7.5);

          doc
            .fillColor('#B00020')
            .text(
              'EMAIL: admissionssmtc@gmail.com',
              LEFT,
              131,
              {
                width: WIDTH,
                align: 'center',
              },
            );

          doc
            .fillColor(GREY)
            .text(
              'Health through Innovation & Research',
              LEFT,
              143,
              {
                width: WIDTH,
                align: 'center',
              },
            );

          doc
            .moveTo(LEFT, 158)
            .lineTo(RIGHT, 158)
            .lineWidth(0.7)
            .strokeColor(GOLD)
            .stroke();
        }

        /* ------------------------------------------------------------------ */
        /* AUTOMATIC PAGE HEADER                                              */
        /* ------------------------------------------------------------------ */

        /*
         * PDFKit creates pages automatically when text
         * reaches the bottom margin.
         *
         * This event draws the header on those pages.
         * It does not create any additional pages.
         */

        doc.on('pageAdded', () => {
          const previousX = doc.x;
          const previousY = doc.y;

          doc.save();

          drawPageHeader();

          doc.restore();

          // Preserve PDFKit's automatic text position.
          doc.x = previousX;
          doc.y = previousY;
        });

        // Draw the header on the already-created first page.
        drawPageHeader();

        /* ------------------------------------------------------------------ */
        /* PAGE FOOTER                                                        */
        /* ------------------------------------------------------------------ */

        function drawPageFooter(
          pageNumber: number,
          totalPages: number,
        ) {
          const y = PAGE_HEIGHT - 32;

          doc
            .moveTo(LEFT, y)
            .lineTo(RIGHT, y)
            .lineWidth(1)
            .strokeColor(GOLD)
            .stroke();

          regular(7);

          doc
            .fillColor(GREEN)
            .text(
              'SHIFAH MEDICAL TRAINING COLLEGE',
              LEFT,
              y + 5,
              {
                width: WIDTH / 2,
              },
            );

          doc
            .fillColor(GREY)
            .text(
              `Page ${pageNumber} of ${totalPages}`,
              LEFT + WIDTH / 2,
              y + 5,
              {
                width: WIDTH / 2,
                align: 'right',
              },
            );
        }

        /* ------------------------------------------------------------------ */
        /* PAGE POSITION                                                      */
        /* ------------------------------------------------------------------ */

        /*
         * doc.y is the authoritative vertical position.
         * PDFKit updates it whenever text flows onto
         * another page.
         */

        function setCursor(y: number) {
          doc.x = LEFT;
          doc.y = y;
        }

        function getCurrentY(): number {
          return doc.y;
        }

        /*
         * Used only for indivisible rows such as the
         * lesson information table.
         *
         * It adds a page only if that actual row cannot
         * fit in the remaining printable area.
         */

        function keepRowTogether(height: number) {
          const remaining = BOTTOM_LIMIT - doc.y;

          if (height <= BOTTOM_LIMIT - TOP_LIMIT && height > remaining) {
            doc.addPage();
          }
        }

        /* ------------------------------------------------------------------ */
        /* CELL DRAWING                                                       */
        /* ------------------------------------------------------------------ */

        function drawCell(
          x: number,
          y: number,
          w: number,
          h: number,
          fill?: string,
        ) {
          if (fill) {
            doc
              .rect(x, y, w, h)
              .fill(fill);
          }

          doc
            .lineWidth(0.55)
            .strokeColor(BORDER)
            .rect(x, y, w, h)
            .stroke();
        }

        /* ------------------------------------------------------------------ */
        /* DYNAMIC FIELD                                                      */
        /* ------------------------------------------------------------------ */

        function drawField(
          x: number,
          y: number,
          w: number,
          h: number,
          label: string,
          value: string,
          options?: {
            labelSize?: number;
            valueSize?: number;
            center?: boolean;
          },
        ) {
          const innerWidth = w - PADDING * 2;

          const labelSize = options?.labelSize ?? 7;
          const valueSize = options?.valueSize ?? 8;

          drawCell(x, y, w, h);

          const labelHeight = measureText(
            label.toUpperCase(),
            innerWidth,
            labelSize,
            true,
          );

          bold(labelSize);

          doc.text(
            label.toUpperCase(),
            x + PADDING,
            y + PADDING,
            {
              width: innerWidth,
            },
          );

          regular(valueSize);

          if (value) {
            doc.text(
              value,
              x + PADDING,
              y + PADDING + labelHeight + 5,
              {
                width: innerWidth,
                align: options?.center ? 'center' : 'left',
                lineGap: 2,
                paragraphGap: 2,
              },
            );
          }
        }

        /* ------------------------------------------------------------------ */
        /* DYNAMIC CONTENT SECTION                                            */
        /* ------------------------------------------------------------------ */

        function drawSection(
          label: string,
          value: string,
          options?: {
            fontSize?: number;
          },
        ) {
          const text = cleanText(value);
          const fontSize = options?.fontSize ?? 8;

          const headingHeight =
            measureText(
              label,
              CONTENT_WIDTH,
              8.5,
              true,
            ) + 12;

          /*
           * Keep the section heading with at least
           * the beginning of its content.
           *
           * This only creates a page if the remaining
           * space is genuinely insufficient.
           */

          if (
            doc.y + headingHeight + 22 > BOTTOM_LIMIT
          ) {
            doc.addPage();
          }

          const headingY = doc.y;

          // Heading background.
          doc
            .rect(
              LEFT,
              headingY,
              WIDTH,
              headingHeight,
            )
            .fill(LIGHT_GREEN);

          doc
            .rect(
              LEFT,
              headingY,
              WIDTH,
              headingHeight,
            )
            .lineWidth(0.55)
            .strokeColor(BORDER)
            .stroke();

          bold(8.5);

          doc.text(
            label,
            LEFT + PADDING,
            headingY + 5,
            {
              width: CONTENT_WIDTH,
            },
          );

          setCursor(headingY + headingHeight + 5);

          if (text) {
            regular(fontSize);

            /*
             * IMPORTANT:
             *
             * Do not set a fixed height here.
             * Do not calculate a maximum height.
             * Do not manually add pages while writing.
             *
             * PDFKit automatically wraps the text
             * and creates pages only when required.
             */

            doc.text(
              text,
              LEFT + PADDING,
              doc.y,
              {
                width: CONTENT_WIDTH,
                lineGap: 2,
                paragraphGap: 4,
                lineBreak: true,
                continued: false,
              },
            );

            // Continue from PDFKit's actual final position.
            doc.x = LEFT;
            doc.y = doc.y + 7;
          } else {
            doc.y += 7;
          }

          // Bottom separator for a neat section layout.
          doc
            .moveTo(LEFT, doc.y)
            .lineTo(RIGHT, doc.y)
            .lineWidth(0.45)
            .strokeColor(BORDER)
            .stroke();

          doc.y += 7;
          doc.x = LEFT;
        }

        /* ------------------------------------------------------------------ */
        /* DOCUMENT TITLE                                                     */
        /* ------------------------------------------------------------------ */

        doc.y += 5;

        bold(12);

        doc.text(
          "TRAINER'S LESSON PLAN",
          LEFT,
          doc.y,
          {
            width: WIDTH,
            align: 'center',
          },
        );

        doc.y += 5;

        regular(8);

        doc
          .fillColor(GREY)
          .text(
            `REFERENCE: ${REFERENCE}`,
            LEFT,
            doc.y,
            {
              width: WIDTH,
              align: 'center',
            },
          );

        doc.y += 13;

        /* ------------------------------------------------------------------ */
        /* FIRST INFORMATION ROW                                              */
        /* ------------------------------------------------------------------ */

        const colWidths = [
          155,
          120,
          100,
          WIDTH - 375,
        ];

        const fieldValues = [
          {
            label: "TRAINER'S NAME",
            value: cleanText(plan.trainer_name),
            width: colWidths[0],
          },
          {
            label: 'COURSE / UNIT',
            value: cleanText(
              plan.unit_name || plan.program_name,
            ),
            width: colWidths[1],
          },
          {
            label: 'COURSE LEVEL',
            value: cleanText(plan.program_level),
            width: colWidths[2],
          },
          {
            label: 'DATE & TIME',
            value: [
              formatDate(plan.lesson_date),
              formatTime(plan.lesson_time),
            ]
              .filter(Boolean)
              .join('\n'),
            width: colWidths[3],
          },
        ];

        const firstRowHeight = Math.max(
          43,
          ...fieldValues.map((field) => {
            const innerWidth = field.width - PADDING * 2;

            return (
              PADDING * 2 +
              measureText(
                field.label,
                innerWidth,
                7,
                true,
              ) +
              5 +
              measureText(
                field.value,
                innerWidth,
                8,
              )
            );
          }),
        );

        keepRowTogether(firstRowHeight);

        let currentX = LEFT;
        let currentY = doc.y;

        fieldValues.forEach((field) => {
          drawField(
            currentX,
            currentY,
            field.width,
            firstRowHeight,
            field.label,
            field.value,
          );

          currentX += field.width;
        });

        setCursor(currentY + firstRowHeight);

        /* ------------------------------------------------------------------ */
        /* SECOND INFORMATION ROW                                             */
        /* ------------------------------------------------------------------ */

        const secondFields = [
          {
            label: 'TELEPHONE',
            value: cleanText(plan.trainer_phone),
            width: 145,
          },
          {
            label: 'WEEK',
            value: plan.week_number
              ? `Week ${plan.week_number}`
              : '',
            width: 78,
          },
          {
            label: 'INTAKE',
            value: cleanText(plan.intake),
            width: 105,
          },
          {
            label: 'STUDENTS',
            value:
              plan.student_count !== null
                ? String(plan.student_count)
                : '',
            width: 72,
          },
          {
            label: 'COMPETENCY AREA',
            value: cleanText(plan.competency_area),
            width: WIDTH - 400,
          },
        ];

        const secondRowHeight = Math.max(
          45,
          ...secondFields.map((field) => {
            const innerWidth = field.width - PADDING * 2;

            return (
              PADDING * 2 +
              measureText(
                field.label,
                innerWidth,
                7,
                true,
              ) +
              5 +
              measureText(
                field.value,
                innerWidth,
                7.5,
              )
            );
          }),
        );

        keepRowTogether(secondRowHeight);

        currentX = LEFT;
        currentY = doc.y;

        secondFields.forEach((field) => {
          drawField(
            currentX,
            currentY,
            field.width,
            secondRowHeight,
            field.label,
            field.value,
            {
              valueSize: 7.5,
            },
          );

          currentX += field.width;
        });

        setCursor(currentY + secondRowHeight);

        /* ------------------------------------------------------------------ */
        /* LESSON TITLE AND SUPERVISOR SIGNATURE                              */
        /* ------------------------------------------------------------------ */

        const lessonTitle = [
          cleanText(plan.topic),
          cleanText(plan.subtopic),
        ]
          .filter(Boolean)
          .join(' - ');

        const titleWidth = WIDTH - 130;
        const signatureWidth = WIDTH - titleWidth;

        const titleLabelHeight = measureText(
          'LESSON TITLE',
          titleWidth - 14,
          8,
          true,
        );

        const titleTextHeight = measureText(
          lessonTitle,
          titleWidth - 14,
          8,
        );

        const signatureText = cleanText(
          plan.supervisor_signature,
        );

        const signatureHeight = measureText(
          signatureText,
          signatureWidth - 14,
          7,
        );

        const titleHeight = Math.max(
          53,
          22 + titleLabelHeight + titleTextHeight,
          38 + signatureHeight,
        );

        keepRowTogether(titleHeight);

        currentY = doc.y;

        drawCell(
          LEFT,
          currentY,
          titleWidth,
          titleHeight,
          LIGHT_GOLD,
        );

        bold(8);

        doc.text(
          'LESSON TITLE',
          LEFT + PADDING,
          currentY + 6,
          {
            width: titleWidth - 14,
          },
        );

        regular(8);

        doc.text(
          lessonTitle || ' ',
          LEFT + PADDING,
          currentY + 22,
          {
            width: titleWidth - 14,
            lineGap: 2,
          },
        );

        drawCell(
          LEFT + titleWidth,
          currentY,
          signatureWidth,
          titleHeight,
        );

        bold(7);

        doc.text(
          "SUPERVISOR'S SIGNATURE",
          LEFT + titleWidth + 5,
          currentY + 7,
          {
            width: signatureWidth - 10,
            align: 'center',
          },
        );

        if (signatureText) {
          regular(7);

          doc.text(
            signatureText,
            LEFT + titleWidth + 5,
            currentY + 28,
            {
              width: signatureWidth - 10,
              align: 'center',
            },
          );
        }

        setCursor(currentY + titleHeight + 8);

        /* ------------------------------------------------------------------ */
        /* SPECIFIC OBJECTIVES                                                */
        /* ------------------------------------------------------------------ */

        drawSection(
          'SPECIFIC OBJECTIVES',
          [
            'By the end of the lesson, the learner should be able to:',
            cleanText(plan.specific_objectives),
          ]
            .filter(Boolean)
            .join('\n\n'),
          {
            fontSize: 8,
          },
        );

        /* ------------------------------------------------------------------ */
        /* TEACHING AIDS                                                      */
        /* ------------------------------------------------------------------ */

        drawSection(
          'TEACHING AIDS / LEARNING RESOURCES',
          cleanText(plan.resources),
          {
            fontSize: 8,
          },
        );

        /* ------------------------------------------------------------------ */
        /* REFERENCES                                                         */
        /* ------------------------------------------------------------------ */

        drawSection(
          'REFERENCES',
          cleanText(plan.lesson_references),
          {
            fontSize: 8,
          },
        );

        /* ------------------------------------------------------------------ */
        /* TIME ESTIMATE                                                      */
        /* ------------------------------------------------------------------ */

        drawSection(
          'LESSON DURATION / TIME ESTIMATE',
          plan.duration_minutes !== null
            ? `${plan.duration_minutes} minutes`
            : '',
          {
            fontSize: 8,
          },
        );

        /* ------------------------------------------------------------------ */
        /* PRESENTATION                                                       */
        /* ------------------------------------------------------------------ */

        drawSection(
          'PRESENTATION',
          formatPresentation(plan.presentation),
          {
            fontSize: 8,
          },
        );

        /* ------------------------------------------------------------------ */
        /* DOCUMENT CLOSING                                                   */
        /* ------------------------------------------------------------------ */

        doc.y += 5;

        regular(7);

        doc
          .fillColor(GREY)
          .text(
            'Prepared by the Office of the Registrar, Shifah Medical Training College.',
            LEFT,
            doc.y,
            {
              width: WIDTH,
              align: 'center',
            },
          );

        /* ------------------------------------------------------------------ */
        /* PAGE FOOTERS AND NUMBERING                                         */
        /* ------------------------------------------------------------------ */

        /*
         * At this stage all content has been generated.
         * PDFKit has created only the pages required
         * by the actual content.
         */

        const pageRange = doc.bufferedPageRange();

        for (
          let pageIndex = 0;
          pageIndex < pageRange.count;
          pageIndex++
        ) {
          doc.switchToPage(
            pageRange.start + pageIndex,
          );

          drawPageFooter(
            pageIndex + 1,
            pageRange.count,
          );
        }

        /* ------------------------------------------------------------------ */
        /* FINISH                                                              */
        /* ------------------------------------------------------------------ */

        doc.end();
      },
    );

    /* ---------------------------------------------------------------------- */
    /* PDF RESPONSE                                                           */
    /* ---------------------------------------------------------------------- */

    const filename = safeFilename(
      `SMTC-Lesson-Plan-${plan.id}-${plan.topic}`,
    );

    return new NextResponse(
      new Uint8Array(pdfBuffer),
      {
        status: 200,

        headers: {
          'Content-Type': 'application/pdf',

          'Content-Disposition':
            `attachment; filename="${filename}.pdf"`,

          'Content-Length': String(pdfBuffer.length),

          'Cache-Control':
            'private, no-cache, no-store, must-revalidate',

          Pragma: 'no-cache',
        },
      },
    );
  } catch (error) {
    console.error('LESSON PLAN PDF ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to generate the lesson plan PDF.',
      },
      { status: 500 },
    );
  }
}
