import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    id: string;
  };
};

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const lecturer = await requireLecturer();

  if (!lecturer) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  const classId = parsePositiveInteger(context.params.id);

  if (!classId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid live class ID.',
      },
      { status: 400 }
    );
  }

  const lecturerId = Number(lecturer.id);

  if (!Number.isInteger(lecturerId) || lecturerId <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid lecturer account.',
      },
      { status: 401 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    /*
     * Lock the exact class row so that two start requests
     * cannot start the same classroom simultaneously.
     */
    const classResult = await client.query(
      `
        SELECT
          llc.id,
          llc.program_id,
          llc.unit_id,
          llc.lecturer_id,
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
          lp.name AS program_name,
          lu.name AS unit_name,
          lu.code AS unit_code,
          usr.name AS lecturer_name
        FROM lms_live_classes llc
        INNER JOIN lms_programs lp
          ON lp.id = llc.program_id
        INNER JOIN lms_units lu
          ON lu.id = llc.unit_id
        INNER JOIN users usr
          ON usr.id = llc.lecturer_id
        WHERE llc.id = $1
        FOR UPDATE
      `,
      [classId]
    );

    if (classResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error: 'Live class not found.',
        },
        { status: 404 }
      );
    }

    const liveClass = classResult.rows[0];

    /*
     * Only the lecturer who owns the class can start it.
     */
    if (Number(liveClass.lecturer_id) !== lecturerId) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error: 'You are not authorized to start this live class.',
        },
        { status: 403 }
      );
    }

    /*
     * If the class is already live, return the existing
     * classroom instead of creating another start event.
     */
    if (liveClass.status === 'live') {
      await client.query('ROLLBACK');

      return NextResponse.json({
        success: true,
        alreadyLive: true,
        message: 'Live class is already running.',
        class: {
          id: Number(liveClass.id),
          programId: Number(liveClass.program_id),
          unitId: Number(liveClass.unit_id),
          lecturerId: Number(liveClass.lecturer_id),
          title: liveClass.title,
          description: liveClass.description,
          roomCode: liveClass.room_code,
          scheduledStart: liveClass.scheduled_start,
          scheduledEnd: liveClass.scheduled_end,
          actualStart: liveClass.actual_start,
          actualEnd: liveClass.actual_end,
          status: liveClass.status,
          recordingEnabled: liveClass.recording_enabled,
          chatEnabled: liveClass.chat_enabled,
          studentMicrophoneEnabled:
            liveClass.student_microphone_enabled,
          studentCameraEnabled:
            liveClass.student_camera_enabled,
          studentScreenShareEnabled:
            liveClass.student_screen_share_enabled,
          studentsCanJoinBeforeLecturer:
            liveClass.students_can_join_before_lecturer,
          isLocked: liveClass.is_locked,
          recordingStatus: liveClass.recording_status,
          programName: liveClass.program_name,
          unitName: liveClass.unit_name,
          unitCode: liveClass.unit_code,
          lecturerName: liveClass.lecturer_name,
        },
      });
    }

    /*
     * Only scheduled classes can be started.
     */
    if (liveClass.status === 'ended') {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error: 'This live class has already ended and cannot be started again.',
        },
        { status: 409 }
      );
    }

    if (liveClass.status === 'cancelled') {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error: 'This live class has been cancelled and cannot be started.',
        },
        { status: 409 }
      );
    }

    if (liveClass.status !== 'scheduled') {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error:
            'This live class cannot be started because its current status is ' +
            String(liveClass.status) +
            '.',
        },
        { status: 409 }
      );
    }

    /*
     * Start the classroom.
     *
     * We deliberately do not change recording_status here.
     * The actual recording endpoint will change it to
     * "recording" when recording is genuinely started.
     */
    const updateResult = await client.query(
      `
        UPDATE lms_live_classes
        SET
          status = 'live',
          actual_start = NOW(),
          actual_end = NULL,
          is_locked = false,
          updated_at = NOW()
        WHERE id = $1
          AND lecturer_id = $2
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
      [classId, lecturerId]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error: 'The live class could not be started.',
        },
        { status: 409 }
      );
    }

    const startedClass = updateResult.rows[0];

    /*
     * Record the start event for auditing/history.
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
          'class_started',
          $3::jsonb
        )
      `,
      [
        classId,
        lecturerId,
        JSON.stringify({
          startedAt: new Date().toISOString(),
          previousStatus: 'scheduled',
          newStatus: 'live',
        }),
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      alreadyLive: false,
      message: 'Live class started successfully.',
      class: {
        id: Number(startedClass.id),
        programId: Number(startedClass.program_id),
        unitId: Number(startedClass.unit_id),
        lecturerId: Number(startedClass.lecturer_id),
        title: startedClass.title,
        description: startedClass.description,
        roomCode: startedClass.room_code,
        scheduledStart: startedClass.scheduled_start,
        scheduledEnd: startedClass.scheduled_end,
        actualStart: startedClass.actual_start,
        actualEnd: startedClass.actual_end,
        status: startedClass.status,
        recordingEnabled: startedClass.recording_enabled,
        chatEnabled: startedClass.chat_enabled,
        studentMicrophoneEnabled:
          startedClass.student_microphone_enabled,
        studentCameraEnabled:
          startedClass.student_camera_enabled,
        studentScreenShareEnabled:
          startedClass.student_screen_share_enabled,
        studentsCanJoinBeforeLecturer:
          startedClass.students_can_join_before_lecturer,
        isLocked: startedClass.is_locked,
        recordingStatus: startedClass.recording_status,
        createdAt: startedClass.created_at,
        updatedAt: startedClass.updated_at,
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors.
    }

    console.error('POST /api/lecturer/live-classes/[id]/start error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start the live class.',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}