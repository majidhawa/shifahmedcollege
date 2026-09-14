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

type SettingsBody = {
isLocked?: boolean;
chatEnabled?: boolean;
studentMicrophoneEnabled?: boolean;
studentCameraEnabled?: boolean;
studentScreenShareEnabled?: boolean;
studentsCanJoinBeforeLecturer?: boolean;
};

function parseId(value: string): number | null {
const id = Number(value);

if (!Number.isInteger(id) || id <= 0) {
return null;
}

return id;
}

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
      VALUES ($1, $2, $3, $4::jsonb)
    `,
[
classId,
lecturerId,
eventType,
JSON.stringify(eventData),
],
);
}

export async function GET(
_request: NextRequest,
context: RouteContext,
) {
try {
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

const classId = parseId(context.params.id);

if (!classId) {
  return NextResponse.json(
    {
      success: false,
      message: 'Invalid live class ID.',
    },
    { status: 400 },
  );
}

const lecturerId = Number(lecturer.id);

const result = await pool.query(
  `
    SELECT
      id,
      title,
      status,
      is_locked,
      chat_enabled,
      student_microphone_enabled,
      student_camera_enabled,
      student_screen_share_enabled,
      students_can_join_before_lecturer,
      recording_enabled
    FROM lms_live_classes
    WHERE id = $1
      AND lecturer_id = $2
    LIMIT 1
  `,
  [classId, lecturerId],
);

if (result.rows.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: 'Live class not found or access denied.',
    },
    { status: 404 },
  );
}

return NextResponse.json({
  success: true,
  settings: {
    id: Number(result.rows[0].id),
    title: result.rows[0].title,
    status: result.rows[0].status,
    isLocked: Boolean(result.rows[0].is_locked),
    chatEnabled: Boolean(result.rows[0].chat_enabled),
    studentMicrophoneEnabled: Boolean(
      result.rows[0].student_microphone_enabled,
    ),
    studentCameraEnabled: Boolean(
      result.rows[0].student_camera_enabled,
    ),
    studentScreenShareEnabled: Boolean(
      result.rows[0].student_screen_share_enabled,
    ),
    studentsCanJoinBeforeLecturer: Boolean(
      result.rows[0].students_can_join_before_lecturer,
    ),
    recordingEnabled: Boolean(
      result.rows[0].recording_enabled,
    ),
  },
});
} catch (error) {
console.error(
'GET /api/lecturer/live-classes/[id]/settings error:',
error,
);
return NextResponse.json(
  {
    success: false,
    message: 'Failed to load classroom settings.',
  },
  { status: 500 },
);

}
}

export async function PATCH(
request: NextRequest,
context: RouteContext,
) {
try {
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

const classId = parseId(context.params.id);

if (!classId) {
  return NextResponse.json(
    {
      success: false,
      message: 'Invalid live class ID.',
    },
    { status: 400 },
  );
}

const lecturerId = Number(lecturer.id);

const body = (await request.json()) as SettingsBody;

const client = await pool.connect();

try {
  await client.query('BEGIN');

  const classResult = await client.query(
    `
      SELECT
        id,
        status,
        is_locked,
        chat_enabled,
        student_microphone_enabled,
        student_camera_enabled,
        student_screen_share_enabled,
        students_can_join_before_lecturer
      FROM lms_live_classes
      WHERE id = $1
        AND lecturer_id = $2
      FOR UPDATE
    `,
    [classId, lecturerId],
  );

  if (classResult.rows.length === 0) {
    await client.query('ROLLBACK');

    return NextResponse.json(
      {
        success: false,
        message: 'Live class not found or access denied.',
      },
      { status: 404 },
    );
  }

  const current = classResult.rows[0];

  if (
    current.status === 'ended' ||
    current.status === 'cancelled'
  ) {
    await client.query('ROLLBACK');

    return NextResponse.json(
      {
        success: false,
        message: 'Settings cannot be changed after the class has ended or been cancelled.',
      },
      { status: 409 },
    );
  }

  const isLocked =
    typeof body.isLocked === 'boolean'
      ? body.isLocked
      : Boolean(current.is_locked);

  const chatEnabled =
    typeof body.chatEnabled === 'boolean'
      ? body.chatEnabled
      : Boolean(current.chat_enabled);

  const studentMicrophoneEnabled =
    typeof body.studentMicrophoneEnabled === 'boolean'
      ? body.studentMicrophoneEnabled
      : Boolean(current.student_microphone_enabled);

  const studentCameraEnabled =
    typeof body.studentCameraEnabled === 'boolean'
      ? body.studentCameraEnabled
      : Boolean(current.student_camera_enabled);

  const studentScreenShareEnabled =
    typeof body.studentScreenShareEnabled === 'boolean'
      ? body.studentScreenShareEnabled
      : Boolean(current.student_screen_share_enabled);

  const studentsCanJoinBeforeLecturer =
    typeof body.studentsCanJoinBeforeLecturer === 'boolean'
      ? body.studentsCanJoinBeforeLecturer
      : Boolean(current.students_can_join_before_lecturer);

  const updated = await client.query(
    `
      UPDATE lms_live_classes
      SET
        is_locked = $1,
        chat_enabled = $2,
        student_microphone_enabled = $3,
        student_camera_enabled = $4,
        student_screen_share_enabled = $5,
        students_can_join_before_lecturer = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING
        id,
        status,
        is_locked,
        chat_enabled,
        student_microphone_enabled,
        student_camera_enabled,
        student_screen_share_enabled,
        students_can_join_before_lecturer,
        recording_enabled
    `,
    [
      isLocked,
      chatEnabled,
      studentMicrophoneEnabled,
      studentCameraEnabled,
      studentScreenShareEnabled,
      studentsCanJoinBeforeLecturer,
      classId,
    ],
  );

  await client.query(
    `
      INSERT INTO lms_live_class_events (
        live_class_id,
        actor_user_id,
        event_type,
        event_data
      )
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [
      classId,
      lecturerId,
      'class_settings_updated',
      JSON.stringify({
        isLocked,
        chatEnabled,
        studentMicrophoneEnabled,
        studentCameraEnabled,
        studentScreenShareEnabled,
        studentsCanJoinBeforeLecturer,
      }),
    ],
  );

  await client.query('COMMIT');

  return NextResponse.json({
    success: true,
    message: 'Classroom settings updated successfully.',
    settings: {
      id: Number(updated.rows[0].id),
      status: updated.rows[0].status,
      isLocked: Boolean(updated.rows[0].is_locked),
      chatEnabled: Boolean(updated.rows[0].chat_enabled),
      studentMicrophoneEnabled: Boolean(
        updated.rows[0].student_microphone_enabled,
      ),
      studentCameraEnabled: Boolean(
        updated.rows[0].student_camera_enabled,
      ),
      studentScreenShareEnabled: Boolean(
        updated.rows[0].student_screen_share_enabled,
      ),
      studentsCanJoinBeforeLecturer: Boolean(
        updated.rows[0].students_can_join_before_lecturer,
      ),
      recordingEnabled: Boolean(
        updated.rows[0].recording_enabled,
      ),
    },
  });
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}

} catch (error) {
console.error(
'PATCH /api/lecturer/live-classes/[id]/settings error:',
error,
);

return NextResponse.json(
  {
    success: false,
    message: 'Failed to update classroom settings.',
  },
  { status: 500 },
);
}
}
