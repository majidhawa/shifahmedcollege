import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/db";
import { getStudentSession } from "@/lib/student-auth";
import {
  AccessToken,
  TrackSource,
} from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: {
    id: string;
  };
};

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

  scheduled_start: string | null;
  scheduled_end: string | null;

  actual_start: string | null;
  actual_end: string | null;

  status: string;

  recording_enabled: boolean;
  chat_enabled: boolean;

  student_microphone_enabled: boolean;
  student_camera_enabled: boolean;
  student_screen_share_enabled: boolean;

  students_can_join_before_lecturer: boolean;

  is_locked: boolean;
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

function getRequiredEnvironmentVariable(
  name: string
): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value.trim();
}

/* =========================================================
   GET STUDENT LIVE CLASS
========================================================= */

async function getStudentLiveClass(
  classId: number,
  applicationId: number
): Promise<LiveClassRow | null> {
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

        lc.scheduled_start,
        lc.scheduled_end,

        lc.actual_start,
        lc.actual_end,

        lc.status,

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

      INNER JOIN lms_enrollments e
        ON e.program_id = lc.program_id
       AND e.application_id = $2

      WHERE lc.id = $1

        AND e.enrollment_status NOT IN (
          'cancelled',
          'dropped'
        )

        AND COALESCE(p.status, '') NOT IN (
          'inactive',
          'deleted',
          'archived'
        )

      LIMIT 1
    `,
    [classId, applicationId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/* =========================================================
   POST
   /api/student/live-classes/[id]/token
========================================================= */

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    /* =====================================================
       STUDENT AUTHENTICATION
    ===================================================== */

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

    const applicationId = Number(
      session.applicationId
    );

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid student session.",
        },
        { status: 401 }
      );
    }

    /* =====================================================
       CLASS ID
    ===================================================== */

    const classId = parseClassId(
      context.params.id
    );

    if (!classId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid live class ID.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       GET CLASS + VERIFY ENROLLMENT
    ===================================================== */

    const liveClass =
      await getStudentLiveClass(
        classId,
        applicationId
      );

    if (!liveClass) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Live class not found or you are not enrolled in the associated program.",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       CLASS STATUS
    ===================================================== */

    if (liveClass.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This live class has been cancelled.",
        },
        { status: 403 }
      );
    }

    if (liveClass.status === "ended") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This live class has already ended.",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       LOCK CHECK
    ===================================================== */

    if (liveClass.is_locked) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This live class is currently locked by the lecturer.",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       LECTURER JOIN RULE
    ===================================================== */

    if (
      liveClass.status !== "live" &&
      !liveClass.students_can_join_before_lecturer
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The lecturer has not started this class yet.",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       LIVEKIT CONFIGURATION
    ===================================================== */

    const apiKey =
      getRequiredEnvironmentVariable(
        "LIVEKIT_API_KEY"
      );

    const apiSecret =
      getRequiredEnvironmentVariable(
        "LIVEKIT_API_SECRET"
      );

    const serverUrl =
      getRequiredEnvironmentVariable(
        "LIVEKIT_URL"
      );

    /* =====================================================
       EXACT DATABASE ROOM
    ===================================================== */

    const roomName =
      liveClass.room_code;

    if (!roomName || !roomName.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This live class does not have a valid LiveKit room.",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       STUDENT IDENTITY
    ===================================================== */

    const participantIdentity =
      `student-${applicationId}-${classId}`;

    const participantName = "Student";

    /* =====================================================
       BUILD ALLOWED PUBLISH SOURCES
    ===================================================== */

    const publishSources: TrackSource[] = [];

    if (
      liveClass.student_microphone_enabled
    ) {
      publishSources.push(
        TrackSource.MICROPHONE
      );
    }

    if (
      liveClass.student_camera_enabled
    ) {
      publishSources.push(
        TrackSource.CAMERA
      );
    }

    if (
      liveClass.student_screen_share_enabled
    ) {
      publishSources.push(
        TrackSource.SCREEN_SHARE,
        TrackSource.SCREEN_SHARE_AUDIO
      );
    }

    /* =====================================================
       CREATE LIVEKIT TOKEN
    ===================================================== */

    const token =
      new AccessToken(
        apiKey,
        apiSecret,
        {
          identity:
            participantIdentity,

          name:
            participantName,

          ttl: "2h",

          attributes: {
            role: "student",
            applicationId:
              String(applicationId),
            liveClassId:
              String(classId),
          },
        }
      );

    token.addGrant({
      roomJoin: true,

      room: roomName,

      canSubscribe: true,

      canPublish:
        publishSources.length > 0,

      canPublishData:
        liveClass.chat_enabled,

      canPublishSources:
        publishSources,
    });

    const jwt =
      await token.toJwt();

    /* =====================================================
       LOG AUTHORIZATION
    ===================================================== */

    console.log(
      "SMTC STUDENT LIVEKIT TOKEN AUTHORIZED:",
      {
        applicationId,
        classId,
        roomCode: roomName,
        participantIdentity,
        status: liveClass.status,
        chatEnabled:
          liveClass.chat_enabled,
        microphoneEnabled:
          liveClass.student_microphone_enabled,
        cameraEnabled:
          liveClass.student_camera_enabled,
        screenShareEnabled:
          liveClass.student_screen_share_enabled,
        canPublish:
          publishSources.length > 0,
        publishSources,
      }
    );

    /* =====================================================
       RESPONSE
       
       IMPORTANT:
       The student classroom page expects
       `data.liveClass`.
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        token: jwt,

        serverUrl,

        roomName,

        liveClass: {
          id: Number(liveClass.id),

          programId:
            Number(liveClass.program_id),

          unitId:
            Number(liveClass.unit_id),

          lecturerId:
            Number(liveClass.lecturer_id),

          programName:
            liveClass.program_name,

          unitName:
            liveClass.unit_name,

          unitCode:
            liveClass.unit_code,

          title:
            liveClass.title,

          description:
            liveClass.description,

          roomCode:
            liveClass.room_code,

          scheduledStart:
            liveClass.scheduled_start,

          scheduledEnd:
            liveClass.scheduled_end,

          actualStart:
            liveClass.actual_start,

          actualEnd:
            liveClass.actual_end,

          status:
            liveClass.status,

          recordingEnabled:
            liveClass.recording_enabled,

          chatEnabled:
            liveClass.chat_enabled,

          studentMicrophoneEnabled:
            liveClass.student_microphone_enabled,

          studentCameraEnabled:
            liveClass.student_camera_enabled,

          studentScreenShareEnabled:
            liveClass.student_screen_share_enabled,

          studentsCanJoinBeforeLecturer:
            liveClass.students_can_join_before_lecturer,

          isLocked:
            liveClass.is_locked,

          canJoin: true,
        },

        permissions: {
          microphone:
            liveClass.student_microphone_enabled,

          camera:
            liveClass.student_camera_enabled,

          screenShare:
            liveClass.student_screen_share_enabled,

          chat:
            liveClass.chat_enabled,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "SMTC STUDENT LIVEKIT TOKEN ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create the student classroom connection.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
