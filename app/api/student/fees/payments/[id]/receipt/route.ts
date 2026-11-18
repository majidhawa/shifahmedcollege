
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatKES(value: number | string | null | undefined) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: unknown) {
  if (!value) return '—';

  const date = new Date(value as string | Date);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-KE', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    /* =====================================================
       AUTHENTICATE STUDENT
    ===================================================== */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Please log in to download your receipt.' },
        { status: 401 }
      );
    }

    /* =====================================================
       VALIDATE PAYMENT ID
    ===================================================== */

    const { id } = await context.params;

    const paymentId = Number(id);

    if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment reference.' },
        { status: 400 }
      );
    }

    /* =====================================================
       FETCH PAYMENT

       Ownership is verified using the authenticated
       student's application ID.
    ===================================================== */

    const result = await pool.query(
      `
        SELECT
          fp.id,
          fp.receipt_number,
          fp.mpesa_code,
          fp.phone_number,
          fp.amount_paid,
          fp.payment_method,
          fp.payment_date,
          fp.recorded_at,

          app.id AS application_id,
          app.application_number,

          app.first_name,
          app.middle_name,
          app.surname,

          app.course,
          app.intake,

          admission.admission_number,
          admission.student_name,
          admission.course AS admission_course

        FROM student_fee_payments fp

        INNER JOIN applications app
          ON app.id = fp.application_id

        LEFT JOIN LATERAL (
          SELECT
            a.admission_number,
            a.student_name,
            a.course

          FROM admissions a

          WHERE a.application_id = app.id

          ORDER BY a.id DESC

          LIMIT 1
        ) admission ON TRUE

        WHERE fp.id = $1
          AND fp.application_id = $2
          AND app.application_number = $3

        LIMIT 1
      `,
      [
        paymentId,
        session.applicationId,
        session.applicationNumber,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Payment receipt not found.',
        },
        { status: 404 }
      );
    }

    const payment = result.rows[0];

    /* =====================================================
       STUDENT INFORMATION
    ===================================================== */

    const studentName =
      payment.student_name ||
      [
        payment.first_name,
        payment.middle_name,
        payment.surname,
      ]
        .filter(Boolean)
        .join(' ') ||
      'Student';

    const course =
      payment.admission_course ||
      payment.course ||
      '—';

    const amount = Number(payment.amount_paid || 0);

    const receiptNumber =
      payment.receipt_number ||
      `SMTC-FEE-${String(payment.id).padStart(6, '0')}`;

    const paymentDate = formatDate(
      payment.payment_date || payment.recorded_at
    );

    /* =====================================================
       GENERATE PDF
    ===================================================== */

    const pdfBuffer = await new Promise<Buffer>(
      (resolve, reject) => {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 45,
          info: {
            Title: `SMTC Fee Receipt ${receiptNumber}`,
            Author: 'Shifah Medical Training College',
            Subject: 'Student Fee Payment Receipt',
          },
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.from(chunk));
        });

        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const left = 45;
        const right = pageWidth - 45;
        const contentWidth = right - left;

        const green = '#0f4f3f';
        const darkGreen = '#0c1f1a';
        const gold = '#d7a93b';
        const grey = '#64748b';

        /* HEADER */

        doc.rect(0, 0, pageWidth, 125).fill(green);

        const logoPath = path.join(
          process.cwd(),
          'public',
          'images',
          'logo.png'
        );

        if (fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, left, 22, {
              fit: [65, 65],
              align: 'center',
              valign: 'center',
            });
          } catch {
            // Continue generating the receipt without the logo.
          }
        }

        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(18)
          .text(
            'SHIFAH MEDICAL TRAINING COLLEGE',
            125,
            28,
            {
              width: contentWidth - 80,
            }
          );

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#e8f1ed')
          .text(
            'Health through Innovation and Research',
            125,
            55
          );

        doc
          .fontSize(9)
          .text('OFFICIAL STUDENT FEE PAYMENT RECEIPT', 125, 75);

        /* RECEIPT TITLE */

        doc
          .fillColor(darkGreen)
          .font('Helvetica-Bold')
          .fontSize(22)
          .text('PAYMENT RECEIPT', left, 155);

        doc
          .fillColor(grey)
          .font('Helvetica')
          .fontSize(10)
          .text('Receipt Number', left, 192);

        doc
          .fillColor(green)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text(receiptNumber, left, 208);

        doc
          .fillColor(grey)
          .font('Helvetica')
          .fontSize(10)
          .text('Payment Date', right - 180, 192, {
            width: 180,
            align: 'right',
          });

        doc
          .fillColor(darkGreen)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(paymentDate, right - 180, 208, {
            width: 180,
            align: 'right',
          });

        /* DIVIDER */

        doc
          .moveTo(left, 238)
          .lineTo(right, 238)
          .lineWidth(1)
          .strokeColor('#e2e8f0')
          .stroke();

        /* STUDENT DETAILS */

        doc
          .fillColor(green)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('STUDENT INFORMATION', left, 260);

        const details = [
          ['Student Name', studentName],
          ['Admission Number', payment.admission_number || 'Not assigned'],
          ['Application Number', payment.application_number],
          ['Course', course],
          ['Intake', payment.intake || '—'],
          ['Phone Number', payment.phone_number || '—'],
        ];

        let y = 290;

        for (let i = 0; i < details.length; i += 2) {
          const first = details[i];
          const second = details[i + 1];

          doc
            .fillColor(grey)
            .font('Helvetica')
            .fontSize(9)
            .text(first[0], left, y);

          doc
            .fillColor(darkGreen)
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(String(first[1]), left, y + 15, {
              width: 220,
            });

          if (second) {
            doc
              .fillColor(grey)
              .font('Helvetica')
              .fontSize(9)
              .text(second[0], right - 220, y);

            doc
              .fillColor(darkGreen)
              .font('Helvetica-Bold')
              .fontSize(10)
              .text(String(second[1]), right - 220, y + 15, {
                width: 220,
              });
          }

          y += 52;
        }

        /* PAYMENT DETAILS */

        y += 8;

        doc
          .fillColor(green)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('PAYMENT DETAILS', left, y);

        y += 27;

        doc
          .roundedRect(left, y, contentWidth, 95, 8)
          .fill('#f8faf9');

        doc
          .fillColor(grey)
          .font('Helvetica')
          .fontSize(9)
          .text('PAYMENT METHOD', left + 15, y + 15);

        doc
          .fillColor(darkGreen)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(
            payment.payment_method || 'M-Pesa',
            left + 15,
            y + 31
          );

        doc
          .fillColor(grey)
          .font('Helvetica')
          .fontSize(9)
          .text('M-PESA TRANSACTION CODE', left + 15, y + 55);

        doc
          .fillColor(darkGreen)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(
            payment.mpesa_code || 'Not provided',
            left + 15,
            y + 70
          );

        doc
          .fillColor(grey)
          .font('Helvetica')
          .fontSize(9)
          .text('AMOUNT RECEIVED', right - 180, y + 15, {
            width: 165,
            align: 'right',
          });

        doc
          .fillColor(green)
          .font('Helvetica-Bold')
          .fontSize(19)
          .text(formatKES(amount), right - 180, y + 39, {
            width: 165,
            align: 'right',
          });

        /* AMOUNT IN WORDS / CONFIRMATION */

        y += 125;

        doc
          .fillColor(darkGreen)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('PAYMENT CONFIRMATION', left, y);

        doc
          .fillColor(grey)
          .font('Helvetica')
          .fontSize(9)
          .text(
            'This receipt confirms that the amount indicated above was recorded against the student fee account.',
            left,
            y + 18,
            {
              width: contentWidth,
              lineGap: 4,
            }
          );

        /* FOOTER */

        const footerY = doc.page.height - 95;

        doc
          .moveTo(left, footerY)
          .lineTo(right, footerY)
          .lineWidth(1)
          .strokeColor(gold)
          .stroke();

        doc
          .fillColor(green)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(
            'SHIFAH MEDICAL TRAINING COLLEGE',
            left,
            footerY + 15,
            {
              align: 'center',
              width: contentWidth,
            }
          );

        doc
          .fillColor(grey)
          .font('Helvetica')
          .fontSize(8)
          .text(
            'Thank you for your payment.',
            left,
            footerY + 32,
            {
              align: 'center',
              width: contentWidth,
            }
          );

        doc
          .fontSize(7)
          .text(
            'This is a computer-generated receipt.',
            left,
            footerY + 48,
            {
              align: 'center',
              width: contentWidth,
            }
          );

        doc.end();
      }
    );

    /* =====================================================
       DOWNLOAD RESPONSE
    ===================================================== */

    const download = request.nextUrl.searchParams.get('download') === '1';

    const filename =
      `SMTC-Fee-Receipt-${receiptNumber.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',

        'Content-Disposition': `${
          download ? 'attachment' : 'inline'
        }; filename="${filename}"`,

        'Content-Length': String(pdfBuffer.length),

        'Cache-Control': 'private, no-store, max-age=0',
      },
    });

  } catch (error) {
    console.error('STUDENT FEE RECEIPT ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to generate your payment receipt.',
      },
      { status: 500 }
    );
  }
}
