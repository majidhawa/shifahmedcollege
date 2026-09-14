import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
params: {
id: string;
};
};

type MessageBody = {
message?: string;
messageType?: string;
};

type DeleteBody = {
messageId?: number;
};

/* =========================================================
HELPERS
========================================================= */

function parseClassId(value: string): number | null {
const id = Number(value);

if (!Number.isInteger(id) || id <= 0) {
return null;
}

return id;
}

function cleanMessage(value: unknown): string {
if (typeof value !== 'string') {
return '';
}

return value.trim();
}

function normalizeMessageType(
value: unknown,
): string {
if (typeof value !== 'string') {
return 'text';
}

const normalized = value.trim().toLowerCase();

if (
normalized === 'announcement' ||
normalized === 'system'
) {
return normalized;
}

return 'text';
}

function serializeMessage(row: Record<string, unknown>) {
return {
id: Number(row.id),

liveClassId: Number(
  row.live_class_id,
),

applicationId:
  row.application_id === null ||
  row.application_id === undefined
    ? null
    : Number(row.application_id),

userId:
  row.user_id === null ||
  row.user_id === undefined
    ? null
    : Number(row.user_id),

senderName:
  typeof row.sender_name === 'string'
    ? row.sender_name
    : 'Participant',

senderRole:
  typeof row.sender_role === 'string'
    ? row.sender_role
    : 'student',

message:
  typeof row.message === 'string'
    ? row.message
    : '',

messageType:
  typeof row.message_type === 'string'
    ? row.message_type
    : 'text',

createdAt:
  row.created_at,

deletedAt:
  row.deleted_at,

deletedBy:
  row.deleted_by === null ||
  row.deleted_by === undefined
    ? null
    : Number(row.deleted_by),

};
}

/* =========================================================
VERIFY LECTURER OWNS CLASS
========================================================= */

async function getLecturerClass(
classId: number,
lecturerId: number,
) {
const result = await pool.query(
`       SELECT
        id,
        title,
        status,
        is_locked,
        chat_enabled
      FROM lms_live_classes
      WHERE id = $1
        AND lecturer_id = $2
      LIMIT 1
    `,
[
classId,
lecturerId,
],
);

if (result.rows.length === 0) {
return null;
}

return result.rows[0];
}

/* =========================================================
LOG EVENT
========================================================= */

async function logEvent(
classId: number,
lecturerId: number,
eventType: string,
eventData: Record<string, unknown>,
) {
await pool.query(
`       INSERT INTO lms_live_class_events (
        live_class_id,
        actor_user_id,
        event_type,
        event_data
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::jsonb
      )
    `,
[
classId,
lecturerId,
eventType,
JSON.stringify(eventData),
],
);
}

/* =========================================================
GET
GET /api/lecturer/live-classes/[id]/messages
========================================================= */

export async function GET(
request: NextRequest,
context: RouteContext,
) {
try {
const lecturer = await requireLecturer();

if (!lecturer) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Lecturer authentication required.',
    },
    { status: 401 },
  );
}

const classId = parseClassId(
  context.params.id,
);

if (!classId) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid live class ID.',
    },
    { status: 400 },
  );
}

const lecturerId = Number(
  lecturer.id,
);

if (
  !Number.isInteger(lecturerId) ||
  lecturerId <= 0
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid lecturer session.',
    },
    { status: 401 },
  );
}

const liveClass =
  await getLecturerClass(
    classId,
    lecturerId,
  );

if (!liveClass) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Live class not found or you are not authorized to access it.',
    },
    { status: 404 },
  );
}

const searchParams =
  request.nextUrl.searchParams;

const limitValue =
  Number(
    searchParams.get('limit') || '100',
  );

const limit =
  Number.isInteger(limitValue) &&
  limitValue > 0
    ? Math.min(limitValue, 200)
    : 100;

const beforeIdValue =
  searchParams.get('beforeId');

const beforeId =
  beforeIdValue
    ? Number(beforeIdValue)
    : null;

let result;

if (
  beforeId !== null &&
  Number.isInteger(beforeId) &&
  beforeId > 0
) {
  result = await pool.query(
    `
      SELECT
        llcm.id,
        llcm.live_class_id,
        llcm.application_id,
        llcm.user_id,
        llcm.message,
        llcm.message_type,
        llcm.created_at,
        llcm.deleted_at,
        llcm.deleted_by,

        COALESCE(
          usr.name,
          CONCAT(
            app.first_name,
            ' ',
            app.surname
          ),
          'Participant'
        ) AS sender_name,

        CASE
          WHEN llcm.user_id IS NOT NULL
            THEN 'lecturer'
          ELSE 'student'
        END AS sender_role

      FROM lms_live_class_messages llcm

      LEFT JOIN users usr
        ON usr.id = llcm.user_id

      LEFT JOIN applications app
        ON app.id = llcm.application_id

      WHERE llcm.live_class_id = $1
        AND llcm.id < $2

      ORDER BY llcm.id DESC

      LIMIT $3
    `,
    [
      classId,
      beforeId,
      limit,
    ],
  );
} else {
  result = await pool.query(
    `
      SELECT
        llcm.id,
        llcm.live_class_id,
        llcm.application_id,
        llcm.user_id,
        llcm.message,
        llcm.message_type,
        llcm.created_at,
        llcm.deleted_at,
        llcm.deleted_by,

        COALESCE(
          usr.name,
          CONCAT(
            app.first_name,
            ' ',
            app.surname
          ),
          'Participant'
        ) AS sender_name,

        CASE
          WHEN llcm.user_id IS NOT NULL
            THEN 'lecturer'
          ELSE 'student'
        END AS sender_role

      FROM lms_live_class_messages llcm

      LEFT JOIN users usr
        ON usr.id = llcm.user_id

      LEFT JOIN applications app
        ON app.id = llcm.application_id

      WHERE llcm.live_class_id = $1

      ORDER BY llcm.id DESC

      LIMIT $2
    `,
    [
      classId,
      limit,
    ],
  );
}

const messages =
  result.rows
    .map(
      (
        row: Record<string, unknown>,
      ) => serializeMessage(row),
    )
    .reverse();

return NextResponse.json(
  {
    success: true,
    chatEnabled:
      Boolean(
        liveClass.chat_enabled,
      ),
    class: {
      id: Number(
        liveClass.id,
      ),
      title:
        liveClass.title,
      status:
        liveClass.status,
      isLocked:
        Boolean(
          liveClass.is_locked,
        ),
    },
    messages,
    count: messages.length,
  },
  { status: 200 },
);

} catch (error) {
console.error(
'LECTURER LIVE CLASS MESSAGES GET ERROR:',
error,
);

return NextResponse.json(
  {
    success: false,
    message:
      'Unable to load classroom chat.',
  },
  { status: 500 },
);

}
}

/* =========================================================
POST
SEND LECTURER MESSAGE

POST /api/lecturer/live-classes/[id]/messages
========================================================= */

export async function POST(
request: NextRequest,
context: RouteContext,
) {
try {
const lecturer = await requireLecturer();

if (!lecturer) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Lecturer authentication required.',
    },
    { status: 401 },
  );
}

const classId = parseClassId(
  context.params.id,
);

if (!classId) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid live class ID.',
    },
    { status: 400 },
  );
}

const lecturerId = Number(
  lecturer.id,
);

if (
  !Number.isInteger(lecturerId) ||
  lecturerId <= 0
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid lecturer session.',
    },
    { status: 401 },
  );
}

const liveClass =
  await getLecturerClass(
    classId,
    lecturerId,
  );

if (!liveClass) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Live class not found or you are not authorized to access it.',
    },
    { status: 404 },
  );
}

if (
  liveClass.status ===
    'cancelled' ||
  liveClass.status ===
    'ended'
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Chat is unavailable because this class has ended or been cancelled.',
    },
    { status: 409 },
  );
}

if (
  liveClass.chat_enabled !== true
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Chat is currently disabled for this classroom.',
    },
    { status: 403 },
  );
}

let body: MessageBody;

try {
  body =
    (await request.json()) as MessageBody;
} catch {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid request body.',
    },
    { status: 400 },
  );
}

const message =
  cleanMessage(
    body.message,
  );

if (!message) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Message cannot be empty.',
    },
    { status: 400 },
  );
}

if (message.length > 2000) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Message cannot exceed 2000 characters.',
    },
    { status: 400 },
  );
}

const messageType =
  normalizeMessageType(
    body.messageType,
  );

const insertResult =
  await pool.query(
    `
      INSERT INTO lms_live_class_messages (
        live_class_id,
        user_id,
        message,
        message_type
      )
      VALUES (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING
        id,
        live_class_id,
        application_id,
        user_id,
        message,
        message_type,
        created_at,
        deleted_at,
        deleted_by
    `,
    [
      classId,
      lecturerId,
      message,
      messageType,
    ],
  );

const inserted =
  insertResult.rows[0];

const senderName =
  lecturer.name ||
  'Lecturer';

const serialized = {
  id: Number(
    inserted.id,
  ),

  liveClassId: Number(
    inserted.live_class_id,
  ),

  applicationId: null,

  userId: lecturerId,

  senderName,

  senderRole: 'lecturer',

  message:
    inserted.message,

  messageType:
    inserted.message_type,

  createdAt:
    inserted.created_at,

  deletedAt: null,

  deletedBy: null,
};

await logEvent(
  classId,
  lecturerId,
  'chat_message_sent',
  {
    messageId: Number(
      inserted.id,
    ),
    messageType,
  },
);

return NextResponse.json(
  {
    success: true,
    message: serialized,
  },
  { status: 201 },
);

} catch (error) {
console.error(
'LECTURER LIVE CLASS MESSAGE POST ERROR:',
error,
);
return NextResponse.json(
  {
    success: false,
    message:
      'Unable to send classroom message.',
  },
  { status: 500 },
);
}
}

/* =========================================================
DELETE
DELETE /api/lecturer/live-classes/[id]/messages

Deletes/soft-deletes a chat message.
========================================================= */

export async function DELETE(
request: NextRequest,
context: RouteContext,
) {
try {
const lecturer = await requireLecturer();

if (!lecturer) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Lecturer authentication required.',
    },
    { status: 401 },
  );
}

const classId = parseClassId(
  context.params.id,
);

if (!classId) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid live class ID.',
    },
    { status: 400 },
  );
}

const lecturerId = Number(
  lecturer.id,
);

if (
  !Number.isInteger(lecturerId) ||
  lecturerId <= 0
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid lecturer session.',
    },
    { status: 401 },
  );
}

const liveClass =
  await getLecturerClass(
    classId,
    lecturerId,
  );

if (!liveClass) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Live class not found or you are not authorized to access it.',
    },
    { status: 404 },
  );
}

let body: DeleteBody;

try {
  body =
    (await request.json()) as DeleteBody;
} catch {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid request body.',
    },
    { status: 400 },
  );
}

const messageId =
  Number(
    body.messageId,
  );

if (
  !Number.isInteger(messageId) ||
  messageId <= 0
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid message ID.',
    },
    { status: 400 },
  );
}

const messageResult =
  await pool.query(
    `
      SELECT
        id,
        live_class_id,
        deleted_at
      FROM lms_live_class_messages
      WHERE id = $1
        AND live_class_id = $2
      LIMIT 1
    `,
    [
      messageId,
      classId,
    ],
  );

if (
  messageResult.rows.length === 0
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Message not found.',
    },
    { status: 404 },
  );
}

if (
  messageResult.rows[0]
    .deleted_at
) {
  return NextResponse.json(
    {
      success: true,
      message:
        'Message was already deleted.',
    },
    { status: 200 },
  );
}

await pool.query(
  `
    UPDATE lms_live_class_messages
    SET
      deleted_at = NOW(),
      deleted_by = $1
    WHERE id = $2
      AND live_class_id = $3
  `,
  [
    lecturerId,
    messageId,
    classId,
  ],
);

await logEvent(
  classId,
  lecturerId,
  'chat_message_deleted',
  {
    messageId,
  },
);

return NextResponse.json(
  {
    success: true,
    messageId,
  },
  { status: 200 },
);

} catch (error) {
console.error(
'LECTURER LIVE CLASS MESSAGE DELETE ERROR:',
error,
);

return NextResponse.json(
  {
    success: false,
    message:
      'Unable to delete classroom message.',
  },
  { status: 500 },
);

}
}

