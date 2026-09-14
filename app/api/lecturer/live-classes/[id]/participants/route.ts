import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

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

type ParticipantAction =
  | 'mute'
  | 'unmute'
  | 'remove'
  | 'mute_all'
  | 'unmute_all'
  | 'disable_microphone'
  | 'enable_microphone'
  | 'disable_camera'
  | 'enable_camera'
  | 'disable_screen_share'
  | 'enable_screen_share';

type ParticipantTrack = {
  sid: string;
  source: string;
  muted: boolean;
  name: string;
  mimeType: string;
};

type ParticipantPermission = {
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
};

type ParticipantData = {
  sid: string;
  identity: string;
  name: string;
  state: string;
  joinedAt: number;
  duration: number;
  tracks: ParticipantTrack[];
  permission: ParticipantPermission | null;
  isLecturer: boolean;
};

type ParticipantActionBody = {
  action?: ParticipantAction;
  identity?: string;
};

type LiveClassRow = {
  id: number | bigint | string;
  program_id: number | string;
  unit_id: number | string;
  lecturer_id: number | string;
  title: string;
  room_code: string | null;
  status: string;
  is_locked: boolean;
  student_microphone_enabled: boolean;
  student_camera_enabled: boolean;
  student_screen_share_enabled: boolean;
};

/* =========================================================
CONSTANTS
========================================================= */

const allowedActions: ParticipantAction[] = [
  'mute',
  'unmute',
  'remove',
  'mute_all',
  'unmute_all',
  'disable_microphone',
  'enable_microphone',
  'disable_camera',
  'enable_camera',
  'disable_screen_share',
  'enable_screen_share',
];

/* =========================================================
BASIC HELPERS
========================================================= */

function parseId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'bigint') {
    const converted = Number(value);

    return Number.isFinite(converted) ? converted : null;
  }

  if (typeof value === 'string') {
    const converted = Number(value);

    return Number.isFinite(converted) ? converted : null;
  }

  return null;
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function toBoolean(value: unknown): boolean {
  return Boolean(value);
}

/* =========================================================
SAFE OBJECT HELPERS
========================================================= */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getValue(
  object: unknown,
  key: string
): unknown {
  if (!isRecord(object)) {
    return undefined;
  }

  return object[key];
}

/* =========================================================
LIVEKIT CONFIGURATION
========================================================= */

function getLiveKitConfig(): {
  url: string;
  httpUrl: string;
  apiKey: string;
  apiSecret: string;
} | null {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    return null;
  }

  let httpUrl = url;

  if (httpUrl.startsWith('wss://')) {
    httpUrl = 'https://' + httpUrl.slice(6);
  } else if (httpUrl.startsWith('ws://')) {
    httpUrl = 'http://' + httpUrl.slice(5);
  }

  return {
    url,
    httpUrl,
    apiKey,
    apiSecret,
  };
}

/* =========================================================
PARTICIPANT SERIALIZATION
========================================================= */

function serializeParticipant(
  participant: unknown
): ParticipantData {
  const sid = toStringValue(
    getValue(participant, 'sid')
  );

  const identity = toStringValue(
    getValue(participant, 'identity')
  );

  const nameValue = toStringValue(
    getValue(participant, 'name')
  );

  const state = toStringValue(
    getValue(participant, 'state')
  );

  const joinedAt =
    toNumber(
      getValue(participant, 'joinedAt')
    ) ?? 0;

  const duration =
    toNumber(
      getValue(participant, 'duration')
    ) ?? 0;

  const rawTracks =
    getValue(participant, 'tracks');

  const tracks: ParticipantTrack[] =
    Array.isArray(rawTracks)
      ? rawTracks.map(
          (track: unknown): ParticipantTrack => ({
            sid: toStringValue(
              getValue(track, 'sid')
            ),
            source: toStringValue(
              getValue(track, 'source')
            ),
            muted: toBoolean(
              getValue(track, 'muted')
            ),
            name: toStringValue(
              getValue(track, 'name')
            ),
            mimeType: toStringValue(
              getValue(track, 'mimeType')
            ),
          })
        )
      : [];

  const rawPermission =
    getValue(participant, 'permission');

  let permission: ParticipantPermission | null = null;

  if (isRecord(rawPermission)) {
    permission = {
      canPublish: toBoolean(
        rawPermission.canPublish
      ),
      canSubscribe: toBoolean(
        rawPermission.canSubscribe
      ),
      canPublishData: toBoolean(
        rawPermission.canPublishData
      ),
    };
  }

  return {
    sid,
    identity,
    name: nameValue || identity,
    state,
    joinedAt,
    duration,
    tracks,
    permission,
    isLecturer: identity.startsWith('lecturer-'),
  };
}

/* =========================================================
DATABASE CLASS LOOKUP
========================================================= */

async function getClassForLecturer(
  classId: number,
  lecturerId: number
): Promise<{
  id: number;
  programId: number;
  unitId: number;
  lecturerId: number;
  title: string;
  roomCode: string | null;
  status: string;
  isLocked: boolean;
  studentMicrophoneEnabled: boolean;
  studentCameraEnabled: boolean;
  studentScreenShareEnabled: boolean;
} | null> {
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
        llc.is_locked,
        llc.student_microphone_enabled,
        llc.student_camera_enabled,
        llc.student_screen_share_enabled
      FROM lms_live_classes llc
      WHERE llc.id = $1
        AND llc.lecturer_id = $2
      LIMIT 1
    `,
    [classId, lecturerId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as LiveClassRow;

  return {
    id: Number(row.id),
    programId: Number(row.program_id),
    unitId: Number(row.unit_id),
    lecturerId: Number(row.lecturer_id),
    title: row.title,
    roomCode: row.room_code,
    status: row.status,
    isLocked: Boolean(row.is_locked),
    studentMicrophoneEnabled: Boolean(
      row.student_microphone_enabled
    ),
    studentCameraEnabled: Boolean(
      row.student_camera_enabled
    ),
    studentScreenShareEnabled: Boolean(
      row.student_screen_share_enabled
    ),
  };
}

/* =========================================================
ROOM NAME
========================================================= */

/*
 * IMPORTANT:
 *
 * The LiveKit room MUST always come from the database.
 *
 * Do NOT generate:
 *
 *   smtc-live-class-${classId}
 *
 * The database room_code is also used by:
 *
 *   - lecturer token route
 *   - student token route
 *   - classroom
 *   - recording/Egress
 *   - participants API
 *
 * Keeping one source of truth prevents room mismatch errors.
 */
function getRoomName(
  liveClass: {
    roomCode: string | null;
  }
): string | null {
  const roomCode =
    liveClass.roomCode?.trim();

  if (!roomCode) {
    return null;
  }

  return roomCode;
}

/* =========================================================
IDENTITY HELPERS
========================================================= */

function isLecturerIdentity(
  identity: string
): boolean {
  return identity.startsWith('lecturer-');
}

/* =========================================================
TRACK SOURCE HELPERS
========================================================= */

function isMicrophoneSource(
  source: string
): boolean {
  const normalized = source
    .toLowerCase()
    .replace(/[\s-]/g, '_');

  return (
    normalized.includes('microphone') ||
    normalized === 'mic' ||
    normalized === '2'
  );
}

function isCameraSource(
  source: string
): boolean {
  const normalized = source
    .toLowerCase()
    .replace(/[\s-]/g, '_');

  return (
    normalized.includes('camera') ||
    normalized === '1'
  );
}

function isScreenShareSource(
  source: string
): boolean {
  const normalized = source
    .toLowerCase()
    .replace(/[\s-]/g, '_');

  return (
    normalized.includes('screen_share') ||
    normalized.includes('screenshare') ||
    normalized.includes('screen') ||
    normalized === '3' ||
    normalized === '4'
  );
}

/* =========================================================
LIVEKIT ROOM NOT FOUND DETECTION
========================================================= */

function isRoomNotFoundError(
  error: unknown
): boolean {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const normalized =
    message.toLowerCase();

  return (
    normalized.includes('requested room does not exist') ||
    normalized.includes('room does not exist') ||
    normalized.includes('not found')
  );
}

/* =========================================================
EVENT LOGGING
========================================================= */

async function logEvent(
  classId: number,
  lecturerId: number,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  await pool.query(
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
      eventType,
      JSON.stringify(eventData),
    ]
  );
}

/* =========================================================
GET PARTICIPANTS
========================================================= */

export async function GET(
  _request: NextRequest,
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
        { status: 401 }
      );
    }

    const classId =
      parseId(context.params.id);

    const lecturerId =
      Number(lecturer.id);

    if (!classId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid live class ID.',
        },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(lecturerId) ||
      lecturerId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid lecturer session.',
        },
        { status: 401 }
      );
    }

    const liveClass =
      await getClassForLecturer(
        classId,
        lecturerId
      );

    if (!liveClass) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Live class not found or access denied.',
        },
        { status: 404 }
      );
    }

    const config =
      getLiveKitConfig();

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message:
            'LiveKit server configuration is missing.',
        },
        { status: 500 }
      );
    }

    const roomName =
      getRoomName(liveClass);

    /*
     * A live class must have a database room_code.
     */
    if (!roomName) {
      console.error(
        'LIVE CLASS PARTICIPANTS ROOM CODE MISSING:',
        {
          classId,
          lecturerId,
          roomCode: liveClass.roomCode,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'LiveKit room is not configured for this class.',
          participants: [],
          participantCount: 0,
        },
        { status: 409 }
      );
    }

    const roomService =
      new RoomServiceClient(
        config.httpUrl,
        config.apiKey,
        config.apiSecret
      );

    let participants:
      ParticipantData[] = [];

    try {
      console.log(
        'SMTC PARTICIPANTS ROOM QUERY:',
        {
          classId,
          lecturerId,
          roomCode: roomName,
        }
      );

      const liveKitParticipants =
        await roomService.listParticipants(
          roomName
        );

      participants =
        liveKitParticipants.map(
          (participant: unknown) =>
            serializeParticipant(
              participant
            )
        );
    } catch (error) {
      if (
        isRoomNotFoundError(error)
      ) {
        /*
         * This is normal when nobody has joined
         * the LiveKit room yet or when the room
         * has already been automatically closed.
         *
         * Do not turn this into a server error.
         */
        console.log(
          'SMTC PARTICIPANTS ROOM NOT ACTIVE:',
          {
            classId,
            roomCode: roomName,
          }
        );

        participants = [];
      } else {
        console.error(
          'LIVE CLASS PARTICIPANTS LIST ERROR:',
          error
        );

        /*
         * Keep the lecturer dashboard usable even
         * if LiveKit temporarily cannot return the
         * participant list.
         */
        participants = [];
      }
    }

    return NextResponse.json({
      success: true,
      liveClass,
      roomName,
      participants,
      participantCount:
        participants.length,
    });
  } catch (error) {
    console.error(
      'GET /api/lecturer/live-classes/[id]/participants error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to load classroom participants.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
POST PARTICIPANT CONTROL
========================================================= */

export async function POST(
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
        { status: 401 }
      );
    }

    const classId =
      parseId(context.params.id);

    const lecturerId =
      Number(lecturer.id);

    if (!classId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid live class ID.',
        },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(
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
        { status: 401 }
      );
    }

    let body:
      ParticipantActionBody;

    try {
      const parsed: unknown =
        await request.json();

      if (!isRecord(parsed)) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid request body.',
          },
          { status: 400 }
        );
      }

      const rawAction =
        parsed.action;

      const rawIdentity =
        parsed.identity;

      body = {
        action:
          typeof rawAction === 'string'
            ? (rawAction as ParticipantAction)
            : undefined,

        identity:
          typeof rawIdentity === 'string'
            ? rawIdentity
            : undefined,
      };
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid JSON request body.',
        },
        { status: 400 }
      );
    }

    const action =
      body.action;

    const identity =
      typeof body.identity === 'string'
        ? body.identity.trim()
        : '';

    if (
      !action ||
      !allowedActions.includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid participant action.',
        },
        { status: 400 }
      );
    }

    const liveClass =
      await getClassForLecturer(
        classId,
        lecturerId
      );

    if (!liveClass) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Live class not found or access denied.',
        },
        { status: 404 }
      );
    }

    /*
     * Participant controls only make sense
     * while the class is live.
     */
    if (
      liveClass.status !== 'live'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Participant controls are only available while the class is live.',
        },
        { status: 409 }
      );
    }

    /*
     * Individual actions require an identity.
     * *_all actions do not.
     */
    if (
      !action.endsWith('_all') &&
      !identity
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Participant identity is required.',
        },
        { status: 400 }
      );
    }

    /*
     * Never allow the lecturer to control
     * themselves through this endpoint.
     */
    if (
      identity &&
      isLecturerIdentity(identity)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The lecturer cannot be controlled using participant controls.',
        },
        { status: 403 }
      );
    }

    const config =
      getLiveKitConfig();

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message:
            'LiveKit server configuration is missing.',
        },
        { status: 500 }
      );
    }

    /*
     * IMPORTANT:
     *
     * Use the exact room_code from the database.
     * Never generate the room name from classId.
     */
    const roomName =
      getRoomName(liveClass);

    if (!roomName) {
      return NextResponse.json(
        {
          success: false,
          message:
            'LiveKit room is not configured for this class.',
        },
        { status: 409 }
      );
    }

    const roomService =
      new RoomServiceClient(
        config.httpUrl,
        config.apiKey,
        config.apiSecret
      );

    let liveKitParticipants:
      Awaited<
        ReturnType<
          RoomServiceClient['listParticipants']
        >
      >;

    try {
      console.log(
        'SMTC PARTICIPANT CONTROL ROOM QUERY:',
        {
          classId,
          lecturerId,
          roomCode: roomName,
          action,
          identity:
            identity || null,
        }
      );

      liveKitParticipants =
        await roomService.listParticipants(
          roomName
        );
    } catch (error) {
      if (
        isRoomNotFoundError(error)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'The LiveKit classroom is not currently available.',
            affectedParticipants: [],
          },
          { status: 409 }
        );
      }

      console.error(
        'LIVE CLASS PARTICIPANTS CONTROL LIST ERROR:',
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Failed to retrieve classroom participants from LiveKit.',
        },
        { status: 500 }
      );
    }

    /*
     * For *_all actions, target every student.
     * The lecturer is always excluded.
     */
    let targets =
      liveKitParticipants.filter(
        (participant: unknown) => {
          const participantIdentity =
            toStringValue(
              getValue(
                participant,
                'identity'
              )
            );

          return (
            participantIdentity !== '' &&
            !isLecturerIdentity(
              participantIdentity
            )
          );
        }
      );

    /*
     * For individual actions, target only
     * the requested participant.
     */
    if (!action.endsWith('_all')) {
      targets =
        liveKitParticipants.filter(
          (participant: unknown) => {
            const participantIdentity =
              toStringValue(
                getValue(
                  participant,
                  'identity'
                )
              );

            return (
              participantIdentity ===
              identity
            );
          }
        );

      if (targets.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Participant is no longer connected.',
          },
          { status: 404 }
        );
      }
    }

    const affectedParticipants:
      string[] = [];

    /*
     * Apply requested control.
     */
    for (
      const participant of targets
    ) {
      const participantIdentity =
        toStringValue(
          getValue(
            participant,
            'identity'
          )
        );

      if (!participantIdentity) {
        continue;
      }

      /*
       * REMOVE
       */
      if (action === 'remove') {
        await roomService.removeParticipant(
          roomName,
          participantIdentity
        );

        affectedParticipants.push(
          participantIdentity
        );

        continue;
      }

      const rawTracks =
        getValue(
          participant,
          'tracks'
        );

      const tracks: unknown[] =
        Array.isArray(rawTracks)
          ? rawTracks
          : [];

      /*
       * MICROPHONE
       */
      if (
        action === 'mute' ||
        action === 'unmute' ||
        action === 'mute_all' ||
        action === 'unmute_all' ||
        action === 'disable_microphone' ||
        action === 'enable_microphone'
      ) {
        for (
          const track of tracks
        ) {
          const source =
            toStringValue(
              getValue(
                track,
                'source'
              )
            );

          if (
            !isMicrophoneSource(
              source
            )
          ) {
            continue;
          }

          const trackSid =
            toStringValue(
              getValue(
                track,
                'sid'
              )
            );

          if (!trackSid) {
            continue;
          }

          const shouldMute =
            action === 'mute' ||
            action === 'mute_all' ||
            action ===
              'disable_microphone';

          await roomService.mutePublishedTrack(
            roomName,
            participantIdentity,
            trackSid,
            shouldMute
          );
        }

        affectedParticipants.push(
          participantIdentity
        );

        continue;
      }

      /*
       * CAMERA
       */
      if (
        action ===
          'disable_camera' ||
        action ===
          'enable_camera'
      ) {
        for (
          const track of tracks
        ) {
          const source =
            toStringValue(
              getValue(
                track,
                'source'
              )
            );

          if (
            !isCameraSource(
              source
            )
          ) {
            continue;
          }

          const trackSid =
            toStringValue(
              getValue(
                track,
                'sid'
              )
            );

          if (!trackSid) {
            continue;
          }

          const shouldMute =
            action ===
            'disable_camera';

          await roomService.mutePublishedTrack(
            roomName,
            participantIdentity,
            trackSid,
            shouldMute
          );
        }

        affectedParticipants.push(
          participantIdentity
        );

        continue;
      }

      /*
       * SCREEN SHARE
       */
      if (
        action ===
          'disable_screen_share' ||
        action ===
          'enable_screen_share'
      ) {
        for (
          const track of tracks
        ) {
          const source =
            toStringValue(
              getValue(
                track,
                'source'
              )
            );

          if (
            !isScreenShareSource(
              source
            )
          ) {
            continue;
          }

          const trackSid =
            toStringValue(
              getValue(
                track,
                'sid'
              )
            );

          if (!trackSid) {
            continue;
          }

          const shouldMute =
            action ===
            'disable_screen_share';

          await roomService.mutePublishedTrack(
            roomName,
            participantIdentity,
            trackSid,
            shouldMute
          );
        }

        affectedParticipants.push(
          participantIdentity
        );
      }
    }

    /*
     * Record the lecturer's action.
     */
    await logEvent(
      classId,
      lecturerId,
      'participant_control',
      {
        action,
        identity:
          identity || null,
        affectedParticipants,
        roomCode: roomName,
      }
    );

    /*
     * Return only JSON-safe values.
     * Do not return raw LiveKit objects because
     * some SDK values can contain BigInt.
     */
    return NextResponse.json({
      success: true,
      message:
        'Participant control applied successfully.',
      action,
      affectedParticipants,
      participantCount:
        liveKitParticipants.length,
      roomName,
    });
  } catch (error) {
    console.error(
      'POST /api/lecturer/live-classes/[id]/participants error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to apply participant control.',
      },
      { status: 500 }
    );
  }
}

