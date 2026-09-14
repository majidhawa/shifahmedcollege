import { NextRequest, NextResponse } from 'next/server';
import {
  AccessToken,
  TrackSource,
} from 'livekit-server-sdk';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    id: string;
  };
};

/* =========================================================
   GENERATE LECTURER LIVEKIT TOKEN
========================================================= */

async function generateLecturerToken(
  context: RouteContext,
) {
  try {
    /* =====================================================
       LECTURER AUTHENTICATION
    ===================================================== */

    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lecturer authentication required.',
        },
        { status: 401 },
      );
    }

    /* =====================================================
       VALIDATE CLASS ID
    ===================================================== */

    const classId = Number(context.params.id);

    if (!Number.isInteger(classId) || classId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid live class ID.',
        },
        { status: 400 },
      );
    }

    /* =====================================================
       VALIDATE LECTURER ID
    ===================================================== */

    const lecturerId = Number(lecturer.id);

    if (!Number.isInteger(lecturerId) || lecturerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid lecturer session.',
        },
        { status: 401 },
      );
    }

    /* =====================================================
       LIVEKIT CONFIGURATION
    ===================================================== */

    const liveKitUrl = process.env.LIVEKIT_URL;
    const liveKitApiKey = process.env.LIVEKIT_API_KEY;
    const liveKitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (
      !liveKitUrl ||
      !liveKitApiKey ||
      !liveKitApiSecret
    ) {
      console.error(
        'LIVEKIT CONFIGURATION ERROR: Missing LIVEKIT_URL, LIVEKIT_API_KEY or LIVEKIT_API_SECRET.',
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Virtual classroom service is not configured on the server.',
        },
        { status: 500 },
      );
    }

    /* =====================================================
       LOAD LIVE CLASS

       IMPORTANT:
       room_code is the SINGLE SOURCE OF TRUTH for the
       LiveKit room name.

       The lecturer must own the class.
    ===================================================== */

    const result = await pool.query(
      `
        SELECT
          llc.id,
          llc.program_id,
          llc.unit_id,
          llc.lecturer_id,
          llc.title,
          llc.room_code,
          llc.status,
          llc.recording_enabled,
          llc.chat_enabled,
          llc.student_microphone_enabled,
          llc.student_camera_enabled,
          llc.student_screen_share_enabled,
          llc.students_can_join_before_lecturer,
          llc.is_locked,

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
          AND llc.lecturer_id = $2

        LIMIT 1
      `,
      [
        classId,
        lecturerId,
      ],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Live class not found or you are not authorized to access it.',
        },
        { status: 404 },
      );
    }

    const liveClass = result.rows[0];

    /* =====================================================
       VERIFY ROOM CODE
    ===================================================== */

    const roomName =
      typeof liveClass.room_code === 'string'
        ? liveClass.room_code.trim()
        : '';

    if (!roomName) {
      console.error(
        'LIVEKIT ROOM CONFIGURATION ERROR:',
        {
          classId,
          lecturerId,
          roomCode: liveClass.room_code,
        },
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'This live class does not have a valid LiveKit room code.',
        },
        { status: 500 },
      );
    }

    /* =====================================================
       CLASS STATUS VALIDATION
    ===================================================== */

    if (liveClass.status === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          message: 'This live class has been cancelled.',
        },
        { status: 409 },
      );
    }

    if (liveClass.status === 'ended') {
      return NextResponse.json(
        {
          success: false,
          message: 'This live class has already ended.',
        },
        { status: 409 },
      );
    }

    /*
     * IMPORTANT:
     *
     * Do NOT reject the lecturer because the classroom
     * is locked.
     *
     * is_locked controls classroom/student access.
     * The lecturer must still be able to reconnect and
     * manage the classroom.
     */

    /* =====================================================
       PARTICIPANT IDENTITY
    ===================================================== */

    const participantIdentity =
      'lecturer-' +
      String(lecturerId) +
      '-' +
      String(liveClass.id);

    const participantName =
      liveClass.lecturer_name ||
      lecturer.name ||
      'Lecturer';

    /* =====================================================
       LOG AUTHORIZED ROOM

       This makes it easy to verify that the exact same
       room is being passed to LiveKit.
    ===================================================== */

    console.log(
      'SMTC LIVEKIT TOKEN AUTHORIZED:',
      {
        lecturerId,
        classId,
        roomCode: roomName,
        participantIdentity,
      },
    );

    /* =====================================================
       CREATE LIVEKIT ACCESS TOKEN
    ===================================================== */

    const accessToken = new AccessToken(
      liveKitApiKey,
      liveKitApiSecret,
      {
        identity: participantIdentity,
        name: participantName,
        ttl: '4h',
      },
    );

    /* =====================================================
       LECTURER PUBLISHING PERMISSIONS
    ===================================================== */

    accessToken.addGrant({
      roomJoin: true,

      /*
       * CRITICAL:
       *
       * Use the database room_code directly.
       *
       * Do NOT use:
       *
       * smtc-live-class-${liveClass.id}
       *
       * because the recording system and database use
       * lms_live_classes.room_code.
       */
      room: roomName,

      /*
       * Lecturer can publish.
       */
      canPublish: true,

      /*
       * Lecturer publishing sources:
       *
       * - microphone
       * - camera
       * - screen share
       * - screen share audio
       */
      canPublishSources: [
        TrackSource.MICROPHONE,
        TrackSource.CAMERA,
        TrackSource.SCREEN_SHARE,
        TrackSource.SCREEN_SHARE_AUDIO,
      ],

      /*
       * Lecturer can receive student tracks.
       */
      canSubscribe: true,

      /*
       * Lecturer can use LiveKit data messages.
       */
      canPublishData: true,

      /*
       * Lecturer has administrative room permissions.
       */
      roomAdmin: true,

      /*
       * Recording permission follows the class setting.
       */
      roomRecord:
        liveClass.recording_enabled === true,
    });

    /* =====================================================
       GENERATE JWT
    ===================================================== */

    const token = await accessToken.toJwt();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        token,

        serverUrl: liveKitUrl,

        /*
         * This MUST be the database room_code.
         */
        roomName,

        participant: {
          identity: participantIdentity,
          name: participantName,
          role: 'lecturer',
        },

        class: {
          id: Number(liveClass.id),

          title: liveClass.title,

          programId: Number(
            liveClass.program_id,
          ),

          unitId: Number(
            liveClass.unit_id,
          ),

          programName:
            liveClass.program_name,

          unitName:
            liveClass.unit_name,

          unitCode:
            liveClass.unit_code,

          /*
           * Database room code.
           */
          roomCode:
            roomName,

          status:
            liveClass.status,

          recordingEnabled:
            Boolean(
              liveClass.recording_enabled,
            ),

          chatEnabled:
            Boolean(
              liveClass.chat_enabled,
            ),

          studentMicrophoneEnabled:
            Boolean(
              liveClass.student_microphone_enabled,
            ),

          studentCameraEnabled:
            Boolean(
              liveClass.student_camera_enabled,
            ),

          studentScreenShareEnabled:
            Boolean(
              liveClass.student_screen_share_enabled,
            ),

          studentsCanJoinBeforeLecturer:
            Boolean(
              liveClass.students_can_join_before_lecturer,
            ),

          isLocked:
            Boolean(
              liveClass.is_locked,
            ),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      'LECTURER LIVEKIT TOKEN ERROR:',
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to create the virtual classroom access token.',
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   GET

   GET /api/lecturer/live-classes/[id]/token
========================================================= */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  return generateLecturerToken(context);
}

/* =========================================================
   POST

   POST /api/lecturer/live-classes/[id]/token
========================================================= */

export async function POST(
  _request: NextRequest,
  context: RouteContext,
) {
  return generateLecturerToken(context);
}

