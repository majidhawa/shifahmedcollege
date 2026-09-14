import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
params: {
id: string;
};
};

type StudentSession = {
applicationId?: number | string | null;
applicationNumber?: string | null;
};

type MessageBody = {
message?: unknown;
messageType?: unknown;
};

type MessageRow = {
id: number | string;
live_class_id: number | string;
application_id: number | string | null;
user_id: number | string | null;
message: string | null;
message_type: string | null;
created_at: unknown;
deleted_at: unknown;
deleted_by: number | string | null;
sender_name: string | null;
sender_role: string | null;
};

type StudentClassRow = {
id: number | string;
program_id: number | string;
unit_id: number | string;
title: string;
room_code: string | null;
status: string;
is_locked: boolean;
chat_enabled: boolean;
students_can_join_before_lecturer: boolean;
program_name: string;
unit_name: string;
unit_code: string | null;
};

type StudentParticipantRow = {
id: number | string;
live_class_id: number | string;
application_id: number | string;
role: string;
invited: boolean;
joined_at: unknown;
left_at: unknown;
removed_at: unknown;
};

type StudentInfo = {
applicationId: number;
applicationNumber: string | null;
name: string;
phone: string | null;
};

/* =========================================================
HELPERS
========================================================= */

function parsePositiveInteger(value: unknown): number | null {
const parsed = Number(value);

if (!Number.isInteger(parsed) || parsed <= 0) {
return null;
}

return parsed;
}

function cleanMessage(value: unknown): string {
if (typeof value !== 'string') {
return '';
}

return value.trim();
}

function normalizeMessageType(
value: unknown,
): 'text' | 'announcement' {
if (typeof value !== 'string') {
return 'text';
}

const normalized = value.trim().toLowerCase();

if (normalized === 'announcement') {
return 'announcement';
}

return 'text';
}

function serializeMessage(row: MessageRow) {
return {
id: Number(row.id),

liveClassId: Number(row.live_class_id),

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
  typeof row.sender_name === 'string' &&
  row.sender_name.trim().length > 0
    ? row.sender_name.trim()
    : 'Participant',

senderRole:
  row.sender_role === 'lecturer'
    ? 'lecturer'
    : 'student',

message:
  typeof row.message === 'string'
    ? row.message
    : '',

messageType:
  typeof row.message_type === 'string'
    ? row.message_type
    : 'text',

createdAt: row.created_at,

deletedAt: row.deleted_at,

deletedBy:
  row.deleted_by === null ||
  row.deleted_by === undefined
    ? null
    : Number(row.deleted_by),

};
}

/* =========================================================
GET STUDENT FROM APPLICATION
========================================================= */

async function getStudent(
applicationId: number,
applicationNumber: string | null,
): Promise<StudentInfo | null> {
const result = await pool.query(
`       SELECT
        id,
        application_number,
        first_name,
        middle_name,
        surname,
        mobile
      FROM applications
      WHERE id = $1
        AND (
          $2::text IS NULL
          OR application_number = $2
        )
      LIMIT 1
    `,
[
applicationId,
applicationNumber,
],
);

if (result.rows.length === 0) {
return null;
}

const row = result.rows[0];

const fullName = [
row.first_name,
row.middle_name,
row.surname,
]
.filter(
(value: unknown) =>
typeof value === 'string' &&
value.trim().length > 0,
)
.join(' ')
.trim();

return {
applicationId: Number(row.id),

applicationNumber:
  typeof row.application_number === 'string'
    ? row.application_number
    : null,

name:
  fullName.length > 0
    ? fullName
    : 'Student',

phone:
  typeof row.mobile === 'string'
    ? row.mobile
    : null,

};
}

/* =========================================================
VERIFY STUDENT ACCESS TO LIVE CLASS

Access hierarchy:

Application
↓
LMS Enrollment
↓
Unit Enrollment
↓
Live Class
========================================================= */

async function getStudentClass(
classId: number,
applicationId: number,
): Promise<StudentClassRow | null> {
const result = await pool.query(
`
SELECT
llc.id,
llc.program_id,
llc.unit_id,
llc.title,
llc.room_code,
llc.status,
llc.is_locked,
llc.chat_enabled,
llc.students_can_join_before_lecturer,
    lp.name AS program_name,

    lu.name AS unit_name,
    lu.code AS unit_code

  FROM lms_live_classes llc

  INNER JOIN lms_programs lp
    ON lp.id = llc.program_id

  INNER JOIN lms_units lu
    ON lu.id = llc.unit_id

  WHERE llc.id = $1

    AND EXISTS (
      SELECT 1
      FROM lms_enrollments le
      WHERE le.application_id = $2
        AND le.program_id = llc.program_id
        AND COALESCE(
          LOWER(TRIM(le.enrollment_status)),
          'active'
        ) NOT IN (
          'cancelled',
          'dropped',
          'inactive'
        )
    )

    AND EXISTS (
      SELECT 1
      FROM lms_unit_enrollments lue

      INNER JOIN lms_enrollments le
        ON le.id = lue.enrollment_id

      WHERE le.application_id = $2
        AND le.program_id = llc.program_id
        AND lue.unit_id = llc.unit_id

        AND COALESCE(
          LOWER(TRIM(le.enrollment_status)),
          'active'
        ) NOT IN (
          'cancelled',
          'dropped',
          'inactive'
        )

        AND COALESCE(
          LOWER(TRIM(lue.status)),
          'active'
        ) NOT IN (
          'cancelled',
          'dropped',
          'inactive'
        )
    )

  LIMIT 1
`,
[
  classId,
  applicationId,
],

);

if (result.rows.length === 0) {
return null;
}

return result.rows[0] as StudentClassRow;
}

/* =========================================================
VERIFY PARTICIPANT

Student must already have joined the classroom before
accessing classroom chat.
========================================================= */

async function verifyParticipant(
classId: number,
applicationId: number,
): Promise<StudentParticipantRow | null> {
const result = await pool.query(
`
SELECT
id,
live_class_id,
application_id,
role,
invited,
joined_at,
left_at,
removed_at

  FROM lms_live_class_participants

  WHERE live_class_id = $1
    AND application_id = $2
    AND removed_at IS NULL

  LIMIT 1
`,
[
  classId,
  applicationId,
],

);

if (result.rows.length === 0) {
return null;
}

return result.rows[0] as StudentParticipantRow;
}

/* =========================================================
GET CHAT MESSAGES
========================================================= */

async function getMessages(
classId: number,
limit: number,
beforeId: number | null,
) {
if (beforeId !== null) {
return pool.query(
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
        NULLIF(TRIM(usr.name), ''),

        NULLIF(
          CONCAT_WS(
            ' ',
            app.first_name,
            app.middle_name,
            app.surname
          ),
          ''
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

}

return pool.query(
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
      NULLIF(TRIM(usr.name), ''),

      NULLIF(
        CONCAT_WS(
          ' ',
          app.first_name,
          app.middle_name,
          app.surname
        ),
        ''
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

/* =========================================================
GET

GET /api/student/live-classes/[id]/messages
========================================================= */

export async function GET(
request: NextRequest,
context: RouteContext,
) {
try {
/* =====================================================
STUDENT AUTHENTICATION
===================================================== */
const session =
  (await getStudentSession()) as
    | StudentSession
    | null;

if (!session) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Student authentication required.',
    },
    {
      status: 401,
    },
  );
}

/* =====================================================
   CLASS ID
===================================================== */

const classId = parsePositiveInteger(
  context.params.id,
);

if (!classId) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid live class ID.',
    },
    {
      status: 400,
    },
  );
}

/* =====================================================
   APPLICATION ID
===================================================== */

const applicationId =
  parsePositiveInteger(
    session.applicationId,
  );

if (!applicationId) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Your student application could not be identified.',
    },
    {
      status: 401,
    },
  );
}

/* =====================================================
   VERIFY STUDENT APPLICATION
===================================================== */

const student = await getStudent(
  applicationId,
  session.applicationNumber || null,
);

if (!student) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Student application could not be found.',
    },
    {
      status: 401,
    },
  );
}

/* =====================================================
   VERIFY CLASS ACCESS
===================================================== */

const liveClass =
  await getStudentClass(
    classId,
    applicationId,
  );

if (!liveClass) {
  return NextResponse.json(
    {
      success: false,
      message:
        'You are not authorized to access this live class.',
    },
    {
      status: 403,
    },
  );
}

/* =====================================================
   VERIFY PARTICIPANT
===================================================== */

const participant =
  await verifyParticipant(
    classId,
    applicationId,
  );

if (!participant) {
  return NextResponse.json(
    {
      success: false,
      message:
        'You must join the live class before accessing its chat.',
    },
    {
      status: 403,
    },
  );
}

/* =====================================================
   PAGINATION
===================================================== */

const searchParams =
  request.nextUrl.searchParams;

const requestedLimit = Number(
  searchParams.get('limit') || '100',
);

const limit =
  Number.isInteger(requestedLimit) &&
  requestedLimit > 0
    ? Math.min(
        requestedLimit,
        200,
      )
    : 100;

const beforeParameter =
  searchParams.get('beforeId');

const beforeId =
  beforeParameter
    ? parsePositiveInteger(
        beforeParameter,
      )
    : null;

/* =====================================================
   LOAD MESSAGES
===================================================== */

const result =
  await getMessages(
    classId,
    limit,
    beforeId,
  );

const messages = (
  result.rows as MessageRow[]
)
  .map(
    (row: MessageRow) =>
      serializeMessage(row),
  )
  .reverse();

/* =====================================================
   RESPONSE
===================================================== */

return NextResponse.json(
  {
    success: true,

    chatEnabled:
      Boolean(
        liveClass.chat_enabled,
      ),

    student: {
      applicationId:
        student.applicationId,

      name:
        student.name,
    },

    class: {
      id: Number(
        liveClass.id,
      ),

      title:
        liveClass.title,

      programId:
        Number(
          liveClass.program_id,
        ),

      unitId:
        Number(
          liveClass.unit_id,
        ),

      programName:
        liveClass.program_name,

      unitName:
        liveClass.unit_name,

      unitCode:
        liveClass.unit_code,

      roomCode:
        liveClass.room_code,

      status:
        liveClass.status,

      isLocked:
        Boolean(
          liveClass.is_locked,
        ),

      studentsCanJoinBeforeLecturer:
        Boolean(
          liveClass.students_can_join_before_lecturer,
        ),
    },

    messages,

    count:
      messages.length,
  },
  {
    status: 200,
  },
);

} catch (error) {
console.error(
'STUDENT LIVE CLASS MESSAGES GET ERROR:',
error,
);
return NextResponse.json(
  {
    success: false,
    message:
      'Unable to load classroom chat.',
  },
  {
    status: 500,
  },
);

}
}

/* =========================================================
POST

POST /api/student/live-classes/[id]/messages
========================================================= */

export async function POST(
request: NextRequest,
context: RouteContext,
) {
try {
/* =====================================================
STUDENT AUTHENTICATION
===================================================== */
const session =
  (await getStudentSession()) as
    | StudentSession
    | null;

if (!session) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Student authentication required.',
    },
    {
      status: 401,
    },
  );
}

/* =====================================================
   CLASS ID
===================================================== */

const classId = parsePositiveInteger(
  context.params.id,
);

if (!classId) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Invalid live class ID.',
    },
    {
      status: 400,
    },
  );
}

/* =====================================================
   APPLICATION ID
===================================================== */

const applicationId =
  parsePositiveInteger(
    session.applicationId,
  );

if (!applicationId) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Your student application could not be identified.',
    },
    {
      status: 401,
    },
  );
}

/* =====================================================
   VERIFY STUDENT
===================================================== */

const student = await getStudent(
  applicationId,
  session.applicationNumber || null,
);

if (!student) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Student application could not be found.',
    },
    {
      status: 401,
    },
  );
}

/* =====================================================
   VERIFY CLASS ACCESS
===================================================== */

const liveClass =
  await getStudentClass(
    classId,
    applicationId,
  );

if (!liveClass) {
  return NextResponse.json(
    {
      success: false,
      message:
        'You are not authorized to access this live class.',
    },
    {
      status: 403,
    },
  );
}

/* =====================================================
   VERIFY PARTICIPANT
===================================================== */

const participant =
  await verifyParticipant(
    classId,
    applicationId,
  );

if (!participant) {
  return NextResponse.json(
    {
      success: false,
      message:
        'You must join the live class before sending messages.',
    },
    {
      status: 403,
    },
  );
}

/* =====================================================
   CLASS STATUS
===================================================== */

if (
  liveClass.status === 'ended' ||
  liveClass.status === 'cancelled'
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Chat is unavailable because this class has ended or been cancelled.',
    },
    {
      status: 409,
    },
  );
}

/* =====================================================
   CHAT SETTING
===================================================== */

if (
  liveClass.chat_enabled !== true
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Chat is currently disabled by the lecturer.',
    },
    {
      status: 403,
    },
  );
}

/* =====================================================
   REQUEST BODY
===================================================== */

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
    {
      status: 400,
    },
  );
}

/* =====================================================
   MESSAGE
===================================================== */

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
    {
      status: 400,
    },
  );
}

if (
  message.length > 2000
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Message cannot exceed 2000 characters.',
    },
    {
      status: 400,
    },
  );
}

/* =====================================================
   MESSAGE TYPE

   Students may only send text messages.
===================================================== */

const messageType =
  normalizeMessageType(
    body.messageType,
  );

if (
  messageType !== 'text'
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'Students can only send text messages.',
    },
    {
      status: 403,
    },
  );
}

/* =====================================================
   INSERT MESSAGE
===================================================== */

const insertResult =
  await pool.query(
    `
      INSERT INTO lms_live_class_messages (
        live_class_id,
        application_id,
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
      applicationId,
      message,
      'text',
    ],
  );

if (
  insertResult.rows.length === 0
) {
  return NextResponse.json(
    {
      success: false,
      message:
        'The message could not be saved.',
    },
    {
      status: 500,
    },
  );
}

/* =====================================================
   SERIALIZE CREATED MESSAGE
===================================================== */

const inserted =
  insertResult.rows[0];

const serializedMessage = {
  id: Number(
    inserted.id,
  ),

  liveClassId:
    Number(
      inserted.live_class_id,
    ),

  applicationId:
    applicationId,

  userId:
    null,

  senderName:
    student.name,

  senderRole:
    'student',

  message:
    typeof inserted.message === 'string'
      ? inserted.message
      : message,

  messageType:
    typeof inserted.message_type === 'string'
      ? inserted.message_type
      : 'text',

  createdAt:
    inserted.created_at,

  deletedAt:
    inserted.deleted_at || null,

  deletedBy:
    inserted.deleted_by === null ||
    inserted.deleted_by === undefined
      ? null
      : Number(
          inserted.deleted_by,
        ),
};

/* =====================================================
   RESPONSE
===================================================== */

return NextResponse.json(
  {
    success: true,

    message:
      serializedMessage,
  },
  {
    status: 201,
  },
);

} catch (error) {
console.error(
'STUDENT LIVE CLASS MESSAGE POST ERROR:',
error,
);

return NextResponse.json(
  {
    success: false,
    message:
      'Unable to send classroom message.',
  },
  {
    status: 500,
  },
);

}
}
