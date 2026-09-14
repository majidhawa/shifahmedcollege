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
     * Lock the exact class row.
     *
     * This prevents two simultaneous end requests from
     * modifying the same classroom at the same time.
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
     * Only the lecturer who owns the class can end it.
     */
    if (Number(liveClass.lecturer_id) !== lecturerId) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error: 'You are not authorized to end this live class.',
        },
        { status: 403 }
      );
    }

    /*
     * If the class has already ended, return the existing
     * class information without creating another event.
     */
    if (liveClass.status === 'ended') {
      await client.query('ROLLBACK');

      return NextResponse.json({
        success: true,
        alreadyEnded: true,
        message: 'Live class has already ended.',
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
     * A cancelled class cannot be ended.
     */
    if (liveClass.status === 'cancelled') {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error: 'This live class was cancelled and cannot be ended.',
        },
        { status: 409 }
      );
    }

    /*
     * Only a live classroom can be ended.
     */
    if (liveClass.status !== 'live') {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error:
            'This live class is not currently live. Its current status is ' +
            String(liveClass.status) +
            '.',
        },
        { status: 409 }
      );
    }

    /*
     * Do not mark the recording as ready here.
     *
     * The recording may still need to be processed by the
     * recording provider. The recording API will manage:
     *
     * recording -> processing -> ready
     *
     * or:
     *
     * recording -> processing -> failed
     */
    const updateResult = await client.query(
      `
        UPDATE lms_live_classes
        SET
          status = 'ended',
          actual_end = NOW(),
          is_locked = true,
          updated_at = NOW()
        WHERE id = $1
          AND lecturer_id = $2
          AND status = 'live'
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
          error: 'The live class could not be ended.',
        },
        { status: 409 }
      );
    }

    const endedClass = updateResult.rows[0];

    /*
     * Calculate the actual class duration when possible.
     */
    let durationSeconds: number | null = null;

    if (endedClass.actual_start && endedClass.actual_end) {
      const startTime = new Date(
        endedClass.actual_start
      ).getTime();

      const endTime = new Date(
        endedClass.actual_end
      ).getTime();

      if (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        endTime >= startTime
      ) {
        durationSeconds = Math.floor(
          (endTime - startTime) / 1000
        );
      }
    }

    /*
     * Record the class-ended event.
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
          'class_ended',
          $3::jsonb
        )
      `,
      [
        classId,
        lecturerId,
        JSON.stringify({
          endedAt: new Date().toISOString(),
          previousStatus: 'live',
          newStatus: 'ended',
          durationSeconds,
        }),
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      alreadyEnded: false,
      message: 'Live class ended successfully.',
      class: {
        id: Number(endedClass.id),
        programId: Number(endedClass.program_id),
        unitId: Number(endedClass.unit_id),
        lecturerId: Number(endedClass.lecturer_id),
        title: endedClass.title,
        description: endedClass.description,
        roomCode: endedClass.room_code,
        scheduledStart: endedClass.scheduled_start,
        scheduledEnd: endedClass.scheduled_end,
        actualStart: endedClass.actual_start,
        actualEnd: endedClass.actual_end,
        status: endedClass.status,
        recordingEnabled: endedClass.recording_enabled,
        chatEnabled: endedClass.chat_enabled,
        studentMicrophoneEnabled:
          endedClass.student_microphone_enabled,
        studentCameraEnabled:
          endedClass.student_camera_enabled,
        studentScreenShareEnabled:
          endedClass.student_screen_share_enabled,
        studentsCanJoinBeforeLecturer:
          endedClass.students_can_join_before_lecturer,
        isLocked: endedClass.is_locked,
        recordingStatus: endedClass.recording_status,
        durationSeconds,
        createdAt: endedClass.created_at,
        updatedAt: endedClass.updated_at,
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors.
    }

    console.error(
      'POST /api/lecturer/live-classes/[id]/end error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to end the live class.',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}