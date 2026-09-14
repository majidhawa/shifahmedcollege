import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: {
    id: string;
  };
};

type UpdateLiveClassBody = {
  programId?: number;
  unitId?: number;

  title?: string;
  description?: string | null;

  scheduledStart?: string;
  scheduledEnd?: string | null;
  durationMinutes?: number;

  recordingEnabled?: boolean;
  chatEnabled?: boolean;

  studentMicrophoneEnabled?: boolean;
  studentCameraEnabled?: boolean;
  studentScreenShareEnabled?: boolean;

  studentsCanJoinBeforeLecturer?: boolean;

  isLocked?: boolean;
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

function getClassId(
  params: RouteContext['params']
): number | null {
  const id = Number(params.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function isPositiveInteger(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isBoolean(
  value: unknown
): value is boolean {
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

/*
 * HTML datetime-local values are interpreted as
 * Africa/Nairobi time when they do not contain
 * an explicit timezone.
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
    normalized =
      normalized + ':00+03:00';
  }

  const date =
    new Date(normalized);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function serializeLiveClass(
  row: LiveClassRow
) {
  return {
    id: Number(row.id),

    programId:
      Number(row.program_id),

    unitId:
      Number(row.unit_id),

    lecturerId:
      Number(row.lecturer_id),

    programName:
      row.program_name,

    unitName:
      row.unit_name,

    unitCode:
      row.unit_code,

    lecturerName:
      row.lecturer_name,

    title:
      row.title,

    description:
      row.description,

    roomCode:
      row.room_code,

    scheduledStart:
      row.scheduled_start,

    scheduledEnd:
      row.scheduled_end,

    actualStart:
      row.actual_start,

    actualEnd:
      row.actual_end,

    status:
      row.status,

    recordingEnabled:
      row.recording_enabled,

    chatEnabled:
      row.chat_enabled,

    studentMicrophoneEnabled:
      row.student_microphone_enabled,

    studentCameraEnabled:
      row.student_camera_enabled,

    studentScreenShareEnabled:
      row.student_screen_share_enabled,

    studentsCanJoinBeforeLecturer:
      row.students_can_join_before_lecturer,

    isLocked:
      row.is_locked,

    recordingStatus:
      row.recording_status,

    participantCount:
      Number(
        row.participant_count || 0
      ),

    recordingCount:
      Number(
        row.recording_count || 0
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

/* =========================================================
   GET
   Get One Live Class
========================================================= */

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lecturer authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    const lecturerId =
      Number(lecturer.id);

    if (
      !Number.isInteger(
        lecturerId
      ) ||
      lecturerId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid lecturer session.',
        },
        {
          status: 401,
        }
      );
    }

    const classId =
      getClassId(
        context.params
      );

    if (classId === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid live class ID.',
        },
        {
          status: 400,
        }
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

        WHERE llc.id = $1
          AND llc.lecturer_id = $2

        LIMIT 1
        `,
        [
          classId,
          lecturerId,
        ]
      );

    if (
      result.rowCount === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Live class not found or you are not authorized to access it.',
        },
        {
          status: 404,
        }
      );
    }

    const liveClass =
      serializeLiveClass(
        result.rows[0]
      );

    /*
     * Get programs the lecturer can use.
     */
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

    /*
     * Get units the lecturer can use.
     */
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

    return NextResponse.json(
      {
        success: true,

        class: liveClass,

        programs:
          programsResult.rows.map(
            (
              program: {
                id: number;
                name: string;
              }
            ) => ({
              id: Number(
                program.id
              ),
              name:
                program.name,
            })
          ),

        units:
          unitsResult.rows.map(
            (
              unit: {
                id: number;
                program_id: number;
                name: string;
                code: string | null;
              }
            ) => ({
              id: Number(
                unit.id
              ),
              programId:
                Number(
                  unit.program_id
                ),
              name:
                unit.name,
              code:
                unit.code,
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
      'GET /api/lecturer/live-classes/[id] error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to load the live class.',
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   Update Live Class
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const client =
    await pool.connect();

  try {
    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lecturer authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    const lecturerId =
      Number(lecturer.id);

    if (
      !Number.isInteger(
        lecturerId
      ) ||
      lecturerId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid lecturer session.',
        },
        {
          status: 401,
        }
      );
    }

    const classId =
      getClassId(
        context.params
      );

    if (classId === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid live class ID.',
        },
        {
          status: 400,
        }
      );
    }

    let body: UpdateLiveClassBody;

    try {
      body =
        (await request.json()) as UpdateLiveClassBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid JSON request body.',
        },
        {
          status: 400,
        }
      );
    }

    await client.query(
      'BEGIN'
    );

    /*
     * Lock the exact class being edited.
     */
    const existingResult =
      await client.query(
        `
        SELECT
          id,
          program_id,
          unit_id,
          lecturer_id,
          title,
          description,
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
        FROM lms_live_classes
        WHERE id = $1
          AND lecturer_id = $2
        FOR UPDATE
        `,
        [
          classId,
          lecturerId,
        ]
      );

    if (
      existingResult.rowCount === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Live class not found or you are not authorized to edit it.',
        },
        {
          status: 404,
        }
      );
    }

    const existing =
      existingResult.rows[0];

    /*
     * Once a class has ended or been cancelled,
     * its schedule should not be edited.
     */
    if (
      existing.status === 'ended' ||
      existing.status === 'cancelled'
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'An ended or cancelled class cannot be edited.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Determine final Program and Unit.
     */
    const programId =
      body.programId !== undefined
        ? Number(body.programId)
        : Number(
            existing.program_id
          );

    const unitId =
      body.unitId !== undefined
        ? Number(body.unitId)
        : Number(
            existing.unit_id
          );

    if (
      !isPositiveInteger(
        programId
      )
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid program.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isPositiveInteger(
        unitId
      )
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid unit.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Verify lecturer authorization for the
     * selected Program.
     */
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
            'You are not authorized to use this program.',
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Verify Unit belongs to Program.
     */
    const unitResult =
      await client.query(
        `
        SELECT
          id,
          program_id,
          name,
          code
        FROM lms_units
        WHERE id = $1
          AND program_id = $2
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

    /*
     * Title.
     */
    let title =
      existing.title;

    if (
      body.title !== undefined
    ) {
      const suppliedTitle =
        cleanString(
          body.title,
          200
        );

      if (!suppliedTitle) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'Live class title cannot be empty.',
          },
          {
            status: 400,
          }
        );
      }

      title =
        suppliedTitle;
    }

    /*
     * Description.
     */
    let description =
      existing.description;

    if (
      body.description !== undefined
    ) {
      if (
        body.description === null
      ) {
        description = null;
      } else {
        description =
          cleanString(
            body.description,
            5000
          );
      }
    }

    /*
     * Scheduled start.
     */
    let scheduledStart =
      new Date(
        existing.scheduled_start
      );

    if (
      body.scheduledStart !== undefined
    ) {
      const parsedStart =
        parseScheduledDate(
          body.scheduledStart
        );

      if (!parsedStart) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid scheduled start time.',
          },
          {
            status: 400,
          }
        );
      }

      scheduledStart =
        parsedStart;
    }

    /*
     * Scheduled end.
     */
    let scheduledEnd:
      Date | null =
      existing.scheduled_end
        ? new Date(
            existing.scheduled_end
          )
        : null;

    if (
      body.scheduledEnd !== undefined
    ) {
      if (
        body.scheduledEnd === null ||
        body.scheduledEnd === ''
      ) {
        scheduledEnd = null;
      } else {
        const parsedEnd =
          parseScheduledDate(
            body.scheduledEnd
          );

        if (!parsedEnd) {
          await client.query(
            'ROLLBACK'
          );

          return NextResponse.json(
            {
              success: false,
              message:
                'Invalid scheduled end time.',
            },
            {
              status: 400,
            }
          );
        }

        scheduledEnd =
          parsedEnd;
      }
    }

    /*
     * Optional duration support.
     */
    if (
      body.durationMinutes !== undefined &&
      body.scheduledEnd === undefined
    ) {
      const durationMinutes =
        Number(
          body.durationMinutes
        );

      if (
        !Number.isInteger(
          durationMinutes
        ) ||
        durationMinutes <= 0
      ) {
        await client.query(
          'ROLLBACK'
        );

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
            durationMinutes *
              60 *
              1000
        );
    }

    if (
      scheduledEnd &&
      scheduledEnd.getTime() <=
        scheduledStart.getTime()
    ) {
      await client.query(
        'ROLLBACK'
      );

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

    /*
     * Scheduled classes must remain in the future
     * when their schedule is being changed.
     *
     * A currently live class can keep its existing
     * schedule.
     */
    if (
      existing.status === 'scheduled' &&
      scheduledStart.getTime() <=
        Date.now()
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'A scheduled class must have a future start time.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Boolean settings.
     */
    let recordingEnabled =
      Boolean(
        existing.recording_enabled
      );

    let chatEnabled =
      Boolean(
        existing.chat_enabled
      );

    let studentMicrophoneEnabled =
      Boolean(
        existing.student_microphone_enabled
      );

    let studentCameraEnabled =
      Boolean(
        existing.student_camera_enabled
      );

    let studentScreenShareEnabled =
      Boolean(
        existing.student_screen_share_enabled
      );

    let studentsCanJoinBeforeLecturer =
      Boolean(
        existing.students_can_join_before_lecturer
      );

    let isLocked =
      Boolean(
        existing.is_locked
      );

    if (
      body.recordingEnabled !== undefined
    ) {
      if (
        !isBoolean(
          body.recordingEnabled
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'recordingEnabled must be a boolean.',
          },
          {
            status: 400,
          }
        );
      }

      recordingEnabled =
        body.recordingEnabled;
    }

    if (
      body.chatEnabled !== undefined
    ) {
      if (
        !isBoolean(
          body.chatEnabled
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'chatEnabled must be a boolean.',
          },
          {
            status: 400,
          }
        );
      }

      chatEnabled =
        body.chatEnabled;
    }

    if (
      body.studentMicrophoneEnabled !==
      undefined
    ) {
      if (
        !isBoolean(
          body.studentMicrophoneEnabled
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'studentMicrophoneEnabled must be a boolean.',
          },
          {
            status: 400,
          }
        );
      }

      studentMicrophoneEnabled =
        body.studentMicrophoneEnabled;
    }

    if (
      body.studentCameraEnabled !==
      undefined
    ) {
      if (
        !isBoolean(
          body.studentCameraEnabled
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'studentCameraEnabled must be a boolean.',
          },
          {
            status: 400,
          }
        );
      }

      studentCameraEnabled =
        body.studentCameraEnabled;
    }

    if (
      body.studentScreenShareEnabled !==
      undefined
    ) {
      if (
        !isBoolean(
          body.studentScreenShareEnabled
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'studentScreenShareEnabled must be a boolean.',
          },
          {
            status: 400,
          }
        );
      }

      studentScreenShareEnabled =
        body.studentScreenShareEnabled;
    }

    if (
      body.studentsCanJoinBeforeLecturer !==
      undefined
    ) {
      if (
        !isBoolean(
          body.studentsCanJoinBeforeLecturer
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'studentsCanJoinBeforeLecturer must be a boolean.',
          },
          {
            status: 400,
          }
        );
      }

      studentsCanJoinBeforeLecturer =
        body.studentsCanJoinBeforeLecturer;
    }

    if (
      body.isLocked !== undefined
    ) {
      if (
        !isBoolean(
          body.isLocked
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'isLocked must be a boolean.',
          },
          {
            status: 400,
          }
        );
      }

      isLocked =
        body.isLocked;
    }

    /*
     * Update the exact class.
     *
     * recording_status is deliberately NOT changed
     * here. The existing value must be controlled by
     * the recording lifecycle.
     */
    const updateResult =
      await client.query<LiveClassRow>(
        `
        UPDATE lms_live_classes
        SET
          program_id = $1,
          unit_id = $2,
          title = $3,
          description = $4,
          scheduled_start = $5,
          scheduled_end = $6,

          recording_enabled = $7,
          chat_enabled = $8,

          student_microphone_enabled = $9,
          student_camera_enabled = $10,
          student_screen_share_enabled = $11,

          students_can_join_before_lecturer = $12,

          is_locked = $13,

          updated_at = NOW()

        WHERE id = $14
          AND lecturer_id = $15

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
          title,
          description,
          scheduledStart,
          scheduledEnd,

          recordingEnabled,
          chatEnabled,

          studentMicrophoneEnabled,
          studentCameraEnabled,
          studentScreenShareEnabled,

          studentsCanJoinBeforeLecturer,

          isLocked,

          classId,
          lecturerId,
        ]
      );

    if (
      updateResult.rowCount === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'The live class could not be updated.',
        },
        {
          status: 404,
        }
      );
    }

    const updatedClass =
      updateResult.rows[0];

    /*
     * Log update event.
     */
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
        classId,
        lecturerId,
        'class_updated',
        JSON.stringify({
          programId,
          unitId,
          title,
          description,
          scheduledStart:
            scheduledStart.toISOString(),
          scheduledEnd:
            scheduledEnd
              ? scheduledEnd.toISOString()
              : null,
          recordingEnabled,
          chatEnabled,
          studentMicrophoneEnabled,
          studentCameraEnabled,
          studentScreenShareEnabled,
          studentsCanJoinBeforeLecturer,
          isLocked,
        }),
      ]
    );

    await client.query(
      'COMMIT'
    );

    /*
     * Fetch complete updated class including
     * Program, Unit and counts.
     */
    const finalResult =
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

        WHERE llc.id = $1
          AND llc.lecturer_id = $2

        LIMIT 1
        `,
        [
          classId,
          lecturerId,
        ]
      );

    return NextResponse.json(
      {
        success: true,
        message:
          'Live class updated successfully.',
        class:
          serializeLiveClass(
            finalResult.rows[0]
          ),
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Live class rollback error:',
        rollbackError
      );
    }

    console.error(
      'PATCH /api/lecturer/live-classes/[id] error:',
      error
    );

    const databaseError =
      error as {
        code?: string;
        constraint?: string;
        detail?: string;
        message?: string;
      };

    if (
      databaseError.code ===
      '23503'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The selected program or unit is not valid.',
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
            'One of the supplied values violates a database rule.',
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
          'Failed to update the live class.',
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE
   Cancel Live Class
========================================================= */

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const client =
    await pool.connect();

  try {
    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Lecturer authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    const lecturerId =
      Number(lecturer.id);

    if (
      !Number.isInteger(
        lecturerId
      ) ||
      lecturerId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid lecturer session.',
        },
        {
          status: 401,
        }
      );
    }

    const classId =
      getClassId(
        context.params
      );

    if (classId === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid live class ID.',
        },
        {
          status: 400,
        }
      );
    }

    await client.query(
      'BEGIN'
    );

    const existingResult =
      await client.query(
        `
        SELECT
          id,
          status,
          title
        FROM lms_live_classes
        WHERE id = $1
          AND lecturer_id = $2
        FOR UPDATE
        `,
        [
          classId,
          lecturerId,
        ]
      );

    if (
      existingResult.rowCount === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Live class not found or you are not authorized to cancel it.',
        },
        {
          status: 404,
        }
      );
    }

    const existing =
      existingResult.rows[0];

    if (
      existing.status === 'ended'
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'An ended class cannot be cancelled.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      existing.status === 'cancelled'
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: true,
          message:
            'The live class is already cancelled.',
        },
        {
          status: 200,
        }
      );
    }

    if (
      existing.status === 'live'
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'A live class cannot be cancelled while it is in progress. End the class first.',
        },
        {
          status: 400,
        }
      );
    }

    const updateResult =
      await client.query(
        `
        UPDATE lms_live_classes
        SET
          status = 'cancelled',
          is_locked = true,
          updated_at = NOW()
        WHERE id = $1
          AND lecturer_id = $2
        RETURNING
          id,
          status,
          title
        `,
        [
          classId,
          lecturerId,
        ]
      );

    /*
     * Log cancellation.
     */
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
        classId,
        lecturerId,
        'class_cancelled',
        JSON.stringify({
          title:
            existing.title,
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
          'Live class cancelled successfully.',
        class: {
          id: Number(
            updateResult.rows[0].id
          ),
          title:
            updateResult.rows[0].title,
          status:
            updateResult.rows[0].status,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (rollbackError) {
      console.error(
        'Live class cancellation rollback error:',
        rollbackError
      );
    }

    console.error(
      'DELETE /api/lecturer/live-classes/[id] error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to cancel the live class.',
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}