import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

import pool from '@/lib/db';
import { getParentSession } from '@/lib/parent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ApplicationRecord = {
id: number;
application_number: string | null;

surname: string | null;
middle_name: string | null;
first_name: string | null;

course: string | null;
intake: string | null;

application_fee: string | number | null;
payment_status: string | null;

/* Automatic M-Pesa payment */
mpesa_receipt_number: string | null;
mpesa_transaction_date: string | null;
mpesa_phone_number: string | null;

/* Manual M-Pesa payment */
manual_mpesa_code: string | null;
manual_mpesa_phone: string | null;
manual_payment_submitted_at: string | null;
};

function safeFileName(value: string): string {
return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function formatAmount(
value: string | number | null
): string {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return '0';
}

return amount.toLocaleString('en-KE');
}

/* =========================================================
FORMAT PAYMENT DATE

Supports:

* M-Pesa timestamp: YYYYMMDDHHMMSS
* YYYYMMDD
* PostgreSQL date/timestamp
  ========================================================= */

function formatTransactionDate(
transactionDate: unknown
): string {
if (!transactionDate) {
return 'N/A';
}

const value = String(transactionDate).trim();

if (!value) {
return 'N/A';
}

/* M-Pesa: YYYYMMDDHHMMSS */

if (/^\d{14}$/.test(value)) {
const year = value.substring(0, 4);
const month = value.substring(4, 6);
const day = value.substring(6, 8);

return `${day}/${month}/${year}`;

}

/* YYYYMMDD */

if (/^\d{8}$/.test(value)) {
const year = value.substring(0, 4);
const month = value.substring(4, 6);
const day = value.substring(6, 8);

return `${day}/${month}/${year}`;

}

/* PostgreSQL date/timestamp */

const date = new Date(value);

if (!Number.isNaN(date.getTime())) {
const day = String(
date.getDate()
).padStart(2, '0');

const month = String(
  date.getMonth() + 1
).padStart(2, '0');

const year = date.getFullYear();

return `${day}/${month}/${year}`;

}

return value;
}

export async function GET(
request: Request
) {
try {
/* =====================================================
PARENT AUTHENTICATION
===================================================== */

const session =
  await getParentSession();

if (!session) {
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
   RESOLVE CHILD THROUGH PARENT LINK

   IMPORTANT:
   The application is resolved ONLY through
   parent_students so a parent cannot request another
   student's receipt.
===================================================== */

const result =
  await pool.query<ApplicationRecord>(
    `
      SELECT
        a.id,
        a.application_number,

        a.surname,
        a.middle_name,
        a.first_name,

        a.course,
        a.intake,

        a.application_fee,
        a.payment_status,

        /* =============================================
           AUTOMATIC M-PESA PAYMENT
        ============================================= */

        a.mpesa_receipt_number,
        a.mpesa_transaction_date,
        a.mpesa_phone_number,

        /* =============================================
           MANUAL M-PESA PAYMENT
        ============================================= */

        a.manual_mpesa_code,
        a.manual_mpesa_phone,
        a.manual_payment_submitted_at

      FROM parent_students ps

      INNER JOIN users u
        ON u.id = ps.parent_id
       AND u.role = 'parent'
       AND u.active = TRUE

      INNER JOIN applications a
        ON a.id = ps.application_id

      WHERE ps.parent_id = $1

      ORDER BY
        ps.is_primary DESC,
        a.created_at DESC

      LIMIT 1
    `,
    [session.parentId]
  );

if (result.rows.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message:
        'No child application was found.',
    },
    {
      status: 404,
    }
  );
}

const application =
  result.rows[0];

/* =====================================================
   PAYMENT MUST BE VERIFIED
===================================================== */

const paymentStatus =
  String(
    application.payment_status || ''
  )
    .trim()
    .toLowerCase();

if (paymentStatus !== 'paid') {
  return NextResponse.json(
    {
      success: false,
      message:
        'Receipt unavailable. The application fee has not been verified as paid.',
    },
    {
      status: 403,
    }
  );
}

/* =====================================================
   RESOLVE PAYMENT DETAILS

   PRIORITY:

   1. MANUAL PAYMENT
   2. AUTOMATIC M-PESA CALLBACK

   This matches the working student receipt logic.
===================================================== */

const paymentCode =
  String(
    application.manual_mpesa_code ||
      application.mpesa_receipt_number ||
      ''
  ).trim();

const paymentPhone =
  String(
    application.manual_mpesa_phone ||
      application.mpesa_phone_number ||
      ''
  ).trim();

const paymentDate =
  application.manual_payment_submitted_at ||
  application.mpesa_transaction_date ||
  null;

/* =====================================================
   PAYMENT REFERENCE MUST EXIST
===================================================== */

if (!paymentCode) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Payment is marked as paid, but no M-Pesa transaction code or receipt number was found.',
    },
    {
      status: 409,
    }
  );
}

/* =====================================================
   APPLICANT NAME
===================================================== */

const applicantName = [
  application.surname,
  application.middle_name,
  application.first_name,
]
  .filter(
    (
      value
    ): value is string =>
      typeof value === 'string' &&
      value.trim().length > 0
  )
  .join(' ')
  .trim();

/* =====================================================
   FILE PATHS
===================================================== */

const root =
  process.cwd();

const regularFontPath =
  path.join(
    root,
    'public',
    'fonts',
    'DejaVuSans.ttf'
  );

const boldFontPath =
  path.join(
    root,
    'public',
    'fonts',
    'DejaVuSans-Bold.ttf'
  );

const logoPath =
  path.join(
    root,
    'public',
    'images',
    'logo.jpg'
  );

/* =====================================================
   VERIFY FONT FILES
===================================================== */

if (
  !fs.existsSync(
    regularFontPath
  )
) {
  throw new Error(
    `Regular font not found: ${regularFontPath}`
  );
}

if (
  !fs.existsSync(
    boldFontPath
  )
) {
  throw new Error(
    `Bold font not found: ${boldFontPath}`
  );
}

/* =====================================================
   RECEIPT NUMBER
===================================================== */

const receiptNumber =
  `SMTC-RCPT-${String(
    application.id
  ).padStart(6, '0')}`;

/* =====================================================
   FORMAT TRANSACTION DATE
===================================================== */

const formattedTransactionDate =
  formatTransactionDate(
    paymentDate
  );

/* =====================================================
   CREATE PDF
===================================================== */

const doc =
  new PDFDocument({
    size: 'A4',
    margin: 45,
    bufferPages: true,
    font: regularFontPath,
    info: {
      Title:
        `SMTC Receipt - ${
          application.application_number || ''
        }`,
      Author:
        'Shifah Medical Training College',
      Subject:
        'Official Application Fee Receipt',
    },
  });

/* =====================================================
   REGISTER CUSTOM FONTS
===================================================== */

doc.registerFont(
  'SMTC-Regular',
  regularFontPath
);

doc.registerFont(
  'SMTC-Bold',
  boldFontPath
);

doc.font(
  'SMTC-Regular'
);

/* =====================================================
   PDF BUFFER
===================================================== */

const chunks: Buffer[] = [];

doc.on(
  'data',
  (chunk: Buffer) => {
    chunks.push(chunk);
  }
);

const pdfPromise =
  new Promise<Buffer>(
    (
      resolve,
      reject
    ) => {
      doc.on(
        'end',
        () => {
          resolve(
            Buffer.concat(
              chunks
            )
          );
        }
      );

      doc.on(
        'error',
        reject
      );
    }
  );

/* =====================================================
   PAGE DIMENSIONS
===================================================== */

const pageWidth =
  595.28;

const pageHeight =
  841.89;

const left =
  45;

const right =
  pageWidth - 45;

const contentWidth =
  right - left;

/* =====================================================
   COLORS
===================================================== */

const green =
  '#006B3F';

const gold =
  '#D4AF37';

const lightGreen =
  '#EAF5EF';

const white =
  '#FFFFFF';

const black =
  '#222222';

const gray =
  '#666666';

/* =====================================================
   BACKGROUND
===================================================== */

doc
  .rect(
    0,
    0,
    pageWidth,
    pageHeight
  )
  .fill(white);

/* =====================================================
   TOP GREEN HEADER
===================================================== */

doc
  .rect(
    0,
    0,
    pageWidth,
    9
  )
  .fill(green);

doc
  .rect(
    0,
    9,
    pageWidth,
    4
  )
  .fill(gold);

/* =====================================================
   LOGO
===================================================== */

if (
  fs.existsSync(
    logoPath
  )
) {
  try {
    doc.image(
      logoPath,
      left,
      32,
      {
        fit: [
          85,
          85,
        ],
      }
    );
  } catch (
    logoError
  ) {
    console.error(
      'Unable to load SMTC logo:',
      logoError
    );
  }
}

/* =====================================================
   HEADER
===================================================== */

doc
  .fillColor(green)
  .font('SMTC-Bold')
  .fontSize(19)
  .text(
    'SHIFAH MEDICAL TRAINING COLLEGE',
    145,
    40,
    {
      width: 405,
      align: 'center',
    }
  );

doc
  .fillColor(gold)
  .font('SMTC-Bold')
  .fontSize(9)
  .text(
    'HEALTH THROUGH INNOVATION AND RESEARCH',
    145,
    66,
    {
      width: 405,
      align: 'center',
      characterSpacing: 0.5,
    }
  );

doc
  .fillColor(gray)
  .font('SMTC-Regular')
  .fontSize(8.5)
  .text(
    'OFFICIAL APPLICATION FEE RECEIPT',
    145,
    83,
    {
      width: 405,
      align: 'center',
    }
  );

/* =====================================================
   GOLD DIVIDER
===================================================== */

doc
  .moveTo(
    left,
    125
  )
  .lineTo(
    right,
    125
  )
  .lineWidth(2)
  .strokeColor(gold)
  .stroke();

/* =====================================================
   TITLE
===================================================== */

doc
  .fillColor(green)
  .font('SMTC-Bold')
  .fontSize(17)
  .text(
    'APPLICATION FEE RECEIPT',
    left,
    148,
    {
      width:
        contentWidth,
      align: 'center',
    }
  );

doc
  .fillColor(gray)
  .font('SMTC-Regular')
  .fontSize(8)
  .text(
    'Official confirmation of application fee payment',
    left,
    171,
    {
      width:
        contentWidth,
      align: 'center',
    }
  );

/* =====================================================
   SECTION TITLE HELPER
===================================================== */

const drawSectionTitle =
  (
    title: string,
    y: number
  ) => {
    doc
      .roundedRect(
        left,
        y,
        contentWidth,
        26,
        4
      )
      .fill(green);

    doc
      .fillColor(white)
      .font('SMTC-Bold')
      .fontSize(10)
      .text(
        title,
        left + 12,
        y + 8
      );
  };

/* =====================================================
   RECEIPT DETAILS
===================================================== */

drawSectionTitle(
  'RECEIPT DETAILS',
  195
);

let y =
  235;

const receiptRows =
  [
    [
      'Receipt Number',
      receiptNumber,
    ],
    [
      'Application Number',
      application.application_number ||
        'N/A',
    ],
    [
      'Payment Status',
      'PAID / VERIFIED',
    ],
  ];

receiptRows.forEach(
  (
    [label, value]
  ) => {
    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(9.5)
      .text(
        label,
        left + 12,
        y
      );

    doc
      .fillColor(
        label ===
          'Payment Status'
          ? green
          : black
      )
      .font('SMTC-Bold')
      .text(
        value,
        190,
        y
      );

    y += 22;
  }
);

/* =====================================================
   APPLICANT INFORMATION
===================================================== */

y += 16;

drawSectionTitle(
  'APPLICANT INFORMATION',
  y
);

y += 40;

const applicantRows =
  [
    [
      'Applicant Name',
      applicantName ||
        'N/A',
    ],
    [
      'Course',
      application.course ||
        'N/A',
    ],
    [
      'Intake',
      application.intake ||
        'N/A',
    ],
  ];

applicantRows.forEach(
  (
    [label, value]
  ) => {
    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(9.5)
      .text(
        label,
        left + 12,
        y
      );

    doc
      .fillColor(black)
      .font('SMTC-Bold')
      .text(
        String(value),
        190,
        y,
        {
          width: 350,
        }
      );

    y += 23;
  }
);

/* =====================================================
   PAYMENT INFORMATION
===================================================== */

y += 15;

drawSectionTitle(
  'PAYMENT INFORMATION',
  y
);

y += 40;

const paymentRows =
  [
    [
      'Amount Paid',
      `KSh ${formatAmount(
        application.application_fee
      )}`,
    ],
    [
      'M-Pesa Transaction Code',
      paymentCode,
    ],
    [
      'M-Pesa Phone Number',
      paymentPhone ||
        'N/A',
    ],
    [
      'Transaction Date',
      formattedTransactionDate,
    ],
  ];

paymentRows.forEach(
  (
    [label, value]
  ) => {
    doc
      .fillColor(gray)
      .font('SMTC-Regular')
      .fontSize(9.5)
      .text(
        label,
        left + 12,
        y
      );

    doc
      .fillColor(black)
      .font('SMTC-Bold')
      .text(
        String(value),
        190,
        y,
        {
          width: 350,
        }
      );

    y += 23;
  }
);

/* =====================================================
   TOTAL PAID BOX
===================================================== */

y += 12;

doc
  .roundedRect(
    left,
    y,
    contentWidth,
    67,
    6
  )
  .fill(lightGreen);

doc
  .roundedRect(
    left,
    y,
    7,
    67,
    3
  )
  .fill(green);

doc
  .fillColor(gray)
  .font('SMTC-Bold')
  .fontSize(9)
  .text(
    'TOTAL APPLICATION FEE PAID',
    left + 22,
    y + 14
  );

doc
  .fillColor(green)
  .font('SMTC-Bold')
  .fontSize(20)
  .text(
    `KSh ${formatAmount(
      application.application_fee
    )}`,
    left + 22,
    y + 31
  );

/* =====================================================
   VERIFIED BADGE
===================================================== */

y += 85;

doc
  .roundedRect(
    left,
    y,
    contentWidth,
    54,
    7
  )
  .fill(green);

doc
  .fillColor(white)
  .font('SMTC-Bold')
  .fontSize(14)
  .text(
    '[OK]  PAYMENT VERIFIED - PAID',
    left,
    y + 13,
    {
      width:
        contentWidth,
      align: 'center',
    }
  );

doc
  .fillColor(white)
  .font('SMTC-Regular')
  .fontSize(7.5)
  .text(
    'M-Pesa payment successfully received and verified by the college system.',
    left,
    y + 33,
    {
      width:
        contentWidth,
      align: 'center',
    }
  );

/* =====================================================
   DECLARATION
===================================================== */

y += 75;

doc
  .fillColor(gray)
  .font('SMTC-Regular')
  .fontSize(8.5)
  .text(
    'This receipt confirms that the application fee stated above has been successfully received and verified through M-Pesa.',
    left + 15,
    y,
    {
      width:
        contentWidth - 30,
      align: 'center',
      lineGap: 3,
    }
  );

/* =====================================================
   FOOTER LINE
===================================================== */

doc
  .moveTo(
    left,
    pageHeight - 76
  )
  .lineTo(
    right,
    pageHeight - 76
  )
  .lineWidth(1)
  .strokeColor(gold)
  .stroke();

/* =====================================================
   FOOTER COLLEGE NAME
===================================================== */

doc
  .fillColor(green)
  .font('SMTC-Bold')
  .fontSize(8.5)
  .text(
    'SHIFAH MEDICAL TRAINING COLLEGE',
    left,
    pageHeight - 61,
    {
      width:
        contentWidth,
      align: 'center',
    }
  );

/* =====================================================
   FOOTER DESCRIPTION
===================================================== */

doc
  .fillColor(gray)
  .font('SMTC-Regular')
  .fontSize(7.5)
  .text(
    'This is a system-generated receipt and does not require a physical signature.',
    left,
    pageHeight - 46,
    {
      width:
        contentWidth,
      align: 'center',
    }
  );

/* =====================================================
   OFFICIAL DOCUMENT LABEL
===================================================== */

doc
  .fillColor(gold)
  .font('SMTC-Bold')
  .fontSize(7)
  .text(
    'OFFICIAL PAYMENT DOCUMENT',
    left,
    pageHeight - 30,
    {
      width:
        contentWidth,
      align: 'center',
      characterSpacing: 0.5,
    }
  );

/* =====================================================
   FINISH PDF
===================================================== */

doc.end();

const pdfBuffer =
  await pdfPromise;

/* =====================================================
   SAFE FILE NAME
===================================================== */

const safeApplicationNumber =
  safeFileName(
    application.application_number ||
      String(
        application.id
      )
  );

/* =====================================================
   DOWNLOAD / INLINE MODE
===================================================== */

const url =
  new URL(
    request.url
  );

const download =
  url.searchParams.get(
    'download'
  ) === '1';

const disposition =
  download
    ? 'attachment'
    : 'inline';

/* =====================================================
   RETURN PDF
===================================================== */

return new NextResponse(
  new Uint8Array(
    pdfBuffer
  ),
  {
    status: 200,
    headers: {
      'Content-Type':
        'application/pdf',

      'Content-Disposition':
        `${disposition}; filename="SMTC-Receipt-${safeApplicationNumber}.pdf"`,

      'Content-Length':
        String(
          pdfBuffer.length
        ),

      'Cache-Control':
        'no-store, no-cache, must-revalidate',

      Pragma:
        'no-cache',

      Expires:
        '0',
    },
  }
);


} catch (
error: unknown
) {
console.error(
'PARENT APPLICATION RECEIPT ERROR:',
error
);
return NextResponse.json(
  {
    success: false,
    message:
      'Unable to generate application fee receipt.',
    error:
      error instanceof Error
        ? error.message
        : 'Unknown error',
  },
  {
    status: 500,
  }
);

}
}
