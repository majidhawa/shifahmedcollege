import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getStudentSession } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type LiveClassRow = {
  id: number;
  program_id: number;
  unit_id: number;
  lecturer_id: number;

  program_name: string;
  unit_name: string;
  unit_code: string | null;

  title: string;
  description: string | null;
  room_code: string;

  status: string;

  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;

  recording_enabled: boolean;
  chat_enabled: boolean;

  student_microphone_enabled: boolean;
  student_camera_enabled: boolean;
  student_screen_share_enabled: boolean;

  students_can_join_before_lecturer: boolean;
  is_locked: boolean;
};

export async function GET() {
  try {
    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Student authentication required.",
        },
        { status: 401 }
      );
    }

    const applicationId = session.applicationId;

    const result = await pool.query<LiveClassRow>(
      `
        SELECT
          lc.id,
          lc.program_id,
          lc.unit_id,
          lc.lecturer_id,

          p.name AS program_name,
          u.name AS unit_name,
          u.code AS unit_code,

          lc.title,
          lc.description,
          lc.room_code,

          lc.status,

          lc.scheduled_start,
          lc.scheduled_end,
          lc.actual_start,
          lc.actual_end,

          lc.recording_enabled,
          lc.chat_enabled,

          lc.student_microphone_enabled,
          lc.student_camera_enabled,
          lc.student_screen_share_enabled,

          lc.students_can_join_before_lecturer,
          lc.is_locked

        FROM lms_live_classes lc

        INNER JOIN lms_programs p
          ON p.id = lc.program_id

        INNER JOIN lms_units u
          ON u.id = lc.unit_id

        WHERE EXISTS (
          SELECT 1
          FROM lms_enrollments e
          WHERE
            e.program_id = lc.program_id
            AND e.application_id = $1
            AND e.enrollment_status NOT IN (
              'cancelled',
              'dropped'
            )
        )

        AND COALESCE(p.status, '') NOT IN (
          'inactive',
          'deleted',
          'archived'
        )

        ORDER BY
          CASE
            WHEN lc.status = 'live' THEN 1
            WHEN lc.status = 'scheduled' THEN 2
            WHEN lc.status = 'ended' THEN 3
            ELSE 4
          END,

          CASE
            WHEN lc.status = 'live' THEN lc.actual_start
            ELSE lc.scheduled_start
          END DESC NULLS LAST,

          lc.id DESC
      `,
      [applicationId]
    );

    const classes = result.rows.map((liveClass) => {
      const isLive = liveClass.status === "live";
      const isScheduled = liveClass.status === "scheduled";
      const isEnded = liveClass.status === "ended";
      const isCancelled = liveClass.status === "cancelled";

      const canJoin =
        !liveClass.is_locked &&
        !isEnded &&
        !isCancelled &&
        (
          isLive ||
          (
            isScheduled &&
            liveClass.students_can_join_before_lecturer
          )
        );

      return {
        id: liveClass.id,

        programId: liveClass.program_id,
        unitId: liveClass.unit_id,
        lecturerId: liveClass.lecturer_id,

        programName: liveClass.program_name,
        unitName: liveClass.unit_name,
        unitCode: liveClass.unit_code,

        title: liveClass.title,
        description: liveClass.description,

        roomCode: liveClass.room_code,

        status: liveClass.status,

        scheduledStart: liveClass.scheduled_start,
        scheduledEnd: liveClass.scheduled_end,

        actualStart: liveClass.actual_start,
        actualEnd: liveClass.actual_end,

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

        canJoin,
      };
    });

    return NextResponse.json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("SMTC STUDENT LIVE CLASSES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load live classes.",
      },
      { status: 500 }
    );
  }
}

