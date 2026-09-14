import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type CreateLiveClassBody = {
  programId?: number;
  unitId?: number;
  title?: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  durationMinutes?: number;

  recordingEnabled?: boolean;
  chatEnabled?: boolean;
  studentMicrophoneEnabled?: boolean;
  studentCameraEnabled?: boolean;
  studentScreenShareEnabled?: boolean;
  studentsCanJoinBeforeLecturer?: boolean;
};

type LiveClassRow = {
  id: number;
  program_id: number;
  unit_id: number;
  lecturer_id: number;

  program_name: string;
  unit_name: string;
  unit_code: string | null;
  lecturer_name: string | null;

  title: string;
  description: string | null;
  room_code: string;

  scheduled_start: Date;
  scheduled_end: Date | null;
  actual_start: Date | null;
  actual_end: Date | null;

  status: string;

  recording_enabled: boolean;
  chat_enabled: boolean;

  student_microphone_enabled: boolean;
  student_camera_enabled: boolean;
  student_screen_share_enabled: boolean;
  students_can_join_before_lecturer: boolean;

  is_locked: boolean;

  recording_status: string | null;

  created_at: Date;
  updated_at: Date;

  participant_count: number;
  recording_count: number;
};

/* =========================================================
   HELPERS
========================================================= */

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function cleanString(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function getBoolean(
  value: unknown,
  defaultValue: boolean
): boolean {
  if (isBoolean(value)) {
    return value;
  }

  return defaultValue;
}

/*
 * HTML datetime-local values normally look like:
 *
 * 2026-09-11T12:00
 *
 * Because SMTC operates in Kenya, interpret datetime-local
 * values as Africa/Nairobi time (+03:00).
 *
 * If the client already sends a timezone offset or Z,
 * preserve the supplied timezone.
 */
function parseScheduledDate(
  value: unknown
): Date | null {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  let normalized = cleaned;

  const hasTimezone =
    /Z$/i.test(normalized) ||
    /[+-]\d{2}:\d{2}$/.test(normalized);

  if (!hasTimezone) {
    normalized = normalized + ':00+03:00';
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function generateRoomCode(): string {
  const randomPart = crypto
    .randomBytes(6)
    .toString('hex')
    .toUpperCase();

  return 'SMTC-' + randomPart;
}

function serializeLiveClass(
  row: LiveClassRow
) {
  return {
    id: Number(row.id),

    programId: Number(row.program_id),
    unitId: Number(row.unit_id),
    lecturerId: Number(row.lecturer_id),

    programName: row.program_name,
    unitName: row.unit_name,
    unitCode: row.unit_code,
    lecturerName: row.lecturer_name,

    title: row.title,
    description: row.description,

    roomCode: row.room_code,

    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,

    actualStart: row.actual_start,
    actualEnd: row.actual_end,

    status: row.status,

    recordingEnabled: row.recording_enabled,
    chatEnabled: row.chat_enabled,

    studentMicrophoneEnabled:
      row.student_microphone_enabled,

    studentCameraEnabled:
      row.student_camera_enabled,

    studentScreenShareEnabled:
      row.student_screen_share_enabled,

    studentsCanJoinBeforeLecturer:
      row.students_can_join_before_lecturer,

    isLocked: row.is_locked,

    recordingStatus: row.recording_status,

    participantCount: Number(row.participant_count || 0),
    recordingCount: Number(row.recording_count || 0),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* =========================================================
   GET
   Lecturer Live Classes
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lecturer authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    const lecturerId = Number(lecturer.id);

    if (!Number.isInteger(lecturerId) || lecturerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lecturer session.',
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } = new URL(
      request.url
    );

    const statusParam =
      searchParams.get('status');

    const programIdParam =
      searchParams.get('programId');

    const unitIdParam =
      searchParams.get('unitId');

    let programId: number | null = null;
    let unitId: number | null = null;

    if (programIdParam) {
      const parsed = Number(programIdParam);

      if (!isPositiveInteger(parsed)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid program ID.',
          },
          {
            status: 400,
          }
        );
      }

      programId = parsed;
    }

    if (unitIdParam) {
      const parsed = Number(unitIdParam);

      if (!isPositiveInteger(parsed)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid unit ID.',
          },
          {
            status: 400,
          }
        );
      }

      unitId = parsed;
    }

    const allowedStatuses = [
      'scheduled',
      'live',
      'ended',
      'cancelled',
    ];

    if (
      statusParam &&
      !allowedStatuses.includes(statusParam)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid live class status.',
        },
        {
          status: 400,
        }
      );
    }

    const values: unknown[] = [
      lecturerId,
    ];

    const conditions: string[] = [
      'llc.lecturer_id = $1',
    ];

    if (statusParam) {
      values.push(statusParam);
      conditions.push(
        'llc.status = $' + values.length
      );
    }

    if (programId !== null) {
      values.push(programId);
      conditions.push(
        'llc.program_id = $' + values.length
      );
    }

    if (unitId !== null) {
      values.push(unitId);
      conditions.push(
        'llc.unit_id = $' + values.length
      );
    }

    const result =
      await pool.query<LiveClassRow>(
        `
        SELECT
          llc.id,
          llc.program_id,
          llc.unit_id,
          llc.lecturer_id,

          lp.name AS program_name,
          lu.name AS unit_name,
          lu.code AS unit_code,

          usr.name AS lecturer_name,

          llc.title,
          llc.description,
          llc.room_code,

          llc.scheduled_start,
          llc.scheduled_end,
          llc.actual_start,
          llc.actual_end,

          llc.status,

          llc.recording_enabled,
          llc.chat_enabled,

          llc.student_microphone_enabled,
          llc.student_camera_enabled,
          llc.student_screen_share_enabled,
          llc.students_can_join_before_lecturer,

          llc.is_locked,

          llc.recording_status,

          llc.created_at,
          llc.updated_at,

          (
            SELECT COUNT(*)::integer
            FROM lms_live_class_participants llcp
            WHERE llcp.live_class_id = llc.id
              AND llcp.role = 'student'
              AND llcp.removed_at IS NULL
          ) AS participant_count,

          (
            SELECT COUNT(*)::integer
            FROM lms_live_class_recordings llcr
            WHERE llcr.live_class_id = llc.id
          ) AS recording_count

        FROM lms_live_classes llc

        INNER JOIN lms_programs lp
          ON lp.id = llc.program_id

        INNER JOIN lms_units lu
          ON lu.id = llc.unit_id

        INNER JOIN users usr
          ON usr.id = llc.lecturer_id

        WHERE ${conditions.join(' AND ')}

        ORDER BY
          CASE
            WHEN llc.status = 'live' THEN 0
            WHEN llc.status = 'scheduled' THEN 1
            WHEN llc.status = 'ended' THEN 2
            ELSE 3
          END,
          llc.scheduled_start ASC
        `,
        values
      );

    const programsResult =
      await pool.query(
        `
        SELECT DISTINCT
          lp.id,
          lp.name
        FROM lms_programs lp
        INNER JOIN lms_lecturer_programs llp
          ON llp.program_id = lp.id
        WHERE llp.lecturer_id = $1
        ORDER BY lp.name ASC
        `,
        [lecturerId]
      );

    const unitsResult =
      await pool.query(
        `
        SELECT
          lu.id,
          lu.program_id,
          lu.name,
          lu.code
        FROM lms_units lu
        INNER JOIN lms_lecturer_programs llp
          ON llp.program_id = lu.program_id
        WHERE llp.lecturer_id = $1
        ORDER BY
          lu.program_id ASC,
          lu.name ASC
        `,
        [lecturerId]
      );

    const classes =
      result.rows.map(serializeLiveClass);

    return NextResponse.json(
      {
        success: true,
        classes,

        programs: programsResult.rows.map(
          (program) => ({
            id: Number(program.id),
            name: program.name,
          })
        ),

        units: unitsResult.rows.map(
          (unit) => ({
            id: Number(unit.id),
            programId: Number(unit.program_id),
            name: unit.name,
            code: unit.code,
          })
        ),
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      'GET /api/lecturer/live-classes error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to load live classes.',
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   Create Live Class
========================================================= */

export async function POST(
  request: NextRequest
) {
  const client = await pool.connect();

  try {
    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lecturer authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    const lecturerId = Number(lecturer.id);

    if (
      !Number.isInteger(lecturerId) ||
      lecturerId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lecturer session.',
        },
        {
          status: 401,
        }
      );
    }

    let body: CreateLiveClassBody;

    try {
      body =
        (await request.json()) as CreateLiveClassBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON request body.',
        },
        {
          status: 400,
        }
      );
    }

    const programId = Number(
      body.programId
    );

    const unitId = Number(
      body.unitId
    );

    if (!isPositiveInteger(programId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please select a valid program.',
        },
        {
          status: 400,
        }
      );
    }

    if (!isPositiveInteger(unitId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please select a valid unit.',
        },
        {
          status: 400,
        }
      );
    }

    const title = cleanString(
      body.title,
      200
    );

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: 'Live class title is required.',
        },
        {
          status: 400,
        }
      );
    }

    const description =
      cleanString(
        body.description,
        5000
      );

    const scheduledStart =
      parseScheduledDate(
        body.scheduledStart
      );

    if (!scheduledStart) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Please provide a valid class start date and time.',
        },
        {
          status: 400,
        }
      );
    }

    const now = new Date();

    if (
      scheduledStart.getTime() <=
      now.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The class start time must be in the future.',
        },
        {
          status: 400,
        }
      );
    }

    let scheduledEnd: Date | null =
      null;

    if (body.scheduledEnd) {
      scheduledEnd =
        parseScheduledDate(
          body.scheduledEnd
        );

      if (!scheduledEnd) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Please provide a valid class end date and time.',
          },
          {
            status: 400,
          }
        );
      }

      if (
        scheduledEnd.getTime() <=
        scheduledStart.getTime()
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The class end time must be after the start time.',
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Optional duration support.
     *
     * If scheduledEnd was not supplied but the
     * create page sends durationMinutes, calculate
     * the end time automatically.
     */
    if (
      !scheduledEnd &&
      body.durationMinutes !== undefined
    ) {
      const durationMinutes =
        Number(body.durationMinutes);

      if (
        !Number.isInteger(
          durationMinutes
        ) ||
        durationMinutes <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Duration must be a positive number of minutes.',
          },
          {
            status: 400,
          }
        );
      }

      scheduledEnd =
        new Date(
          scheduledStart.getTime() +
            durationMinutes * 60 * 1000
        );
    }

    const recordingEnabled =
      getBoolean(
        body.recordingEnabled,
        true
      );

    const chatEnabled =
      getBoolean(
        body.chatEnabled,
        true
      );

    const studentMicrophoneEnabled =
      getBoolean(
        body.studentMicrophoneEnabled,
        false
      );

    const studentCameraEnabled =
      getBoolean(
        body.studentCameraEnabled,
        false
      );

    const studentScreenShareEnabled =
      getBoolean(
        body.studentScreenShareEnabled,
        false
      );

    const studentsCanJoinBeforeLecturer =
      getBoolean(
        body.studentsCanJoinBeforeLecturer,
        false
      );

    await client.query(
      'BEGIN'
    );

    /* =====================================================
       VERIFY LECTURER PROGRAM AUTHORIZATION
    ===================================================== */

    const authorizationResult =
      await client.query(
        `
        SELECT 1
        FROM lms_lecturer_programs
        WHERE lecturer_id = $1
          AND program_id = $2
        LIMIT 1
        `,
        [
          lecturerId,
          programId,
        ]
      );

    if (
      authorizationResult.rowCount === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'You are not authorized to create a live class for this program.',
        },
        {
          status: 403,
        }
      );
    }

    /* =====================================================
       VERIFY UNIT BELONGS TO PROGRAM
    ===================================================== */

    const unitResult =
      await client.query(
        `
        SELECT
          lu.id,
          lu.program_id,
          lu.name,
          lu.code
        FROM lms_units lu
        WHERE lu.id = $1
          AND lu.program_id = $2
        LIMIT 1
        `,
        [
          unitId,
          programId,
        ]
      );

    if (
      unitResult.rowCount === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'The selected unit does not belong to the selected program.',
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       GET PROGRAM INFORMATION
    ===================================================== */

    const programResult =
      await client.query(
        `
        SELECT
          id,
          name
        FROM lms_programs
        WHERE id = $1
        LIMIT 1
        `,
        [programId]
      );

    if (
      programResult.rowCount === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'The selected program does not exist.',
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       GENERATE UNIQUE ROOM CODE
    ===================================================== */

    let roomCode = '';
    let roomCodeCreated = false;

    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const candidate =
        generateRoomCode();

      const existing =
        await client.query(
          `
          SELECT 1
          FROM lms_live_classes
          WHERE room_code = $1
          LIMIT 1
          `,
          [candidate]
        );

      if (
        existing.rowCount === 0
      ) {
        roomCode = candidate;
        roomCodeCreated = true;
        break;
      }
    }

    if (!roomCodeCreated) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Unable to generate a unique classroom code. Please try again.',
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       CREATE LIVE CLASS
       
       IMPORTANT:
       recording_status MUST be one of:
       pending
       recording
       processing
       ready
       failed

       We use pending for a newly scheduled class.
    ===================================================== */

    const insertResult =
      await client.query<LiveClassRow>(
        `
        INSERT INTO lms_live_classes (
          program_id,
          unit_id,
          lecturer_id,
          title,
          description,
          room_code,
          scheduled_start,
          scheduled_end,
          status,
          recording_enabled,
          chat_enabled,
          student_microphone_enabled,
          student_camera_enabled,
          student_screen_share_enabled,
          students_can_join_before_lecturer,
          is_locked,
          recording_status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          'scheduled',
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          false,
          $15
        )
        RETURNING
          id,
          program_id,
          unit_id,
          lecturer_id,
          title,
          description,
          room_code,
          scheduled_start,
          scheduled_end,
          actual_start,
          actual_end,
          status,
          recording_enabled,
          chat_enabled,
          student_microphone_enabled,
          student_camera_enabled,
          student_screen_share_enabled,
          students_can_join_before_lecturer,
          is_locked,
          recording_status,
          created_at,
          updated_at
        `,
        [
          programId,
          unitId,
          lecturerId,
          title,
          description,
          roomCode,
          scheduledStart,
          scheduledEnd,

          recordingEnabled,
          chatEnabled,
          studentMicrophoneEnabled,
          studentCameraEnabled,
          studentScreenShareEnabled,
          studentsCanJoinBeforeLecturer,

          'pending',
        ]
      );

    const createdClass =
      insertResult.rows[0];

    /* =====================================================
       CREATE CLASS CREATED EVENT
    ===================================================== */

    await client.query(
      `
      INSERT INTO lms_live_class_events (
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
        createdClass.id,
        lecturerId,
        'class_created',
        JSON.stringify({
          programId,
          unitId,
          title,
          scheduledStart:
            scheduledStart.toISOString(),
          scheduledEnd:
            scheduledEnd
              ? scheduledEnd.toISOString()
              : null,
          recordingEnabled,
          chatEnabled,
        }),
      ]
    );

    await client.query(
      'COMMIT'
    );

    return NextResponse.json(
      {
        success: true,
        message:
          'Live class created successfully.',

        class: {
          id: Number(
            createdClass.id
          ),

          programId: Number(
            createdClass.program_id
          ),

          unitId: Number(
            createdClass.unit_id
          ),

          lecturerId: Number(
            createdClass.lecturer_id
          ),

          programName:
            programResult.rows[0].name,

          unitName:
            unitResult.rows[0].name,

          unitCode:
            unitResult.rows[0].code,

          title:
            createdClass.title,

          description:
            createdClass.description,

          roomCode:
            createdClass.room_code,

          scheduledStart:
            createdClass.scheduled_start,

          scheduledEnd:
            createdClass.scheduled_end,

          actualStart:
            createdClass.actual_start,

          actualEnd:
            createdClass.actual_end,

          status:
            createdClass.status,

          recordingEnabled:
            createdClass.recording_enabled,

          chatEnabled:
            createdClass.chat_enabled,

          studentMicrophoneEnabled:
            createdClass.student_microphone_enabled,

          studentCameraEnabled:
            createdClass.student_camera_enabled,

          studentScreenShareEnabled:
            createdClass.student_screen_share_enabled,

          studentsCanJoinBeforeLecturer:
            createdClass.students_can_join_before_lecturer,

          isLocked:
            createdClass.is_locked,

          recordingStatus:
            createdClass.recording_status,

          participantCount: 0,
          recordingCount: 0,

          createdAt:
            createdClass.created_at,

          updatedAt:
            createdClass.updated_at,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Live class transaction rollback error:',
        rollbackError
      );
    }

    const databaseError =
      error as {
        code?: string;
        constraint?: string;
        detail?: string;
        message?: string;
      };

    console.error(
      'POST /api/lecturer/live-classes error:',
      error
    );

    if (
      databaseError.code ===
      '23505'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'A live class with the generated room code already exists. Please try again.',
        },
        {
          status: 409,
        }
      );
    }

    if (
      databaseError.code ===
      '23503'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected program or unit is no longer available.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      databaseError.code ===
      '23514'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'One of the live class values does not match the database rules.',
          detail:
            databaseError.constraint ||
            databaseError.detail ||
            null,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          databaseError.message ||
          'Failed to create live class.',
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}