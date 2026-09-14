import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/db";
import { requireLecturer } from "@/lib/lecturer-auth";

import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  RoomServiceClient,
  S3Upload,
} from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

type RecordingAction = "start" | "stop";

type RecordingStatus =
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

type RecordingBody = {
  action?: RecordingAction;
};

type LiveClassRow = {
  id: number;
  title: string;
  status: string;
  room_code: string;
  recording_enabled: boolean;
  lecturer_id: number;
};

type RecordingRow = {
  id: number;
  live_class_id: number;
  provider: string | null;
  recording_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | string | bigint | null;
  mime_type: string | null;
  status: RecordingStatus;
  started_at: string | Date | null;
  ended_at: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

type EgressInfo = Record<string, unknown>;

type EgressFileResult = Record<string, unknown>;

type EgressMatch = {
  info: EgressInfo;
  startedAtMs: number | null;
  endedAtMs: number | null;
};

/*
 * LiveKit EgressStatus enum values.
 *
 * These are the values used by the current LiveKit
 * server SDK / protocol.
 */
const EGRESS_STATUS_NAMES: Record<number, string> = {
  0: "EGRESS_STARTING",
  1: "EGRESS_ACTIVE",
  2: "EGRESS_ENDING",
  3: "EGRESS_COMPLETE",
  4: "EGRESS_FAILED",
  5: "EGRESS_ABORTED",
  6: "EGRESS_LIMIT_REACHED",
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

/* =========================================================
   BASIC HELPERS
========================================================= */

function parseClassId(
  value: string,
): number | null {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function toIso(
  value: unknown,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString();
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Converts seconds, milliseconds or nanoseconds
 * into Unix milliseconds.
 */
function toUnixMilliseconds(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  /*
   * Nanoseconds.
   *
   * LiveKit int64 timestamps are normally Unix
   * timestamps expressed in nanoseconds.
   */
  if (numberValue > 1_000_000_000_000_000) {
    return Math.floor(numberValue / 1_000_000);
  }

  /*
   * Milliseconds.
   */
  if (numberValue > 1_000_000_000_000) {
    return Math.floor(numberValue);
  }

  /*
   * Seconds.
   */
  if (numberValue > 1_000_000_000) {
    return Math.floor(numberValue * 1000);
  }

  return Math.floor(numberValue);
}

function safeSlug(
  value: string,
): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "live-class";
}

function getRequiredEnv(
  name: string,
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured on the server.`,
    );
  }

  return value;
}

function getLiveKitHost(): string {
  const raw = getRequiredEnv("LIVEKIT_URL");

  return raw
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://")
    .replace(/\/$/, "");
}

function getPublicBaseUrl(): string | null {
  const value =
    process.env.RECORDING_PUBLIC_BASE_URL?.trim();

  if (!value) {
    return null;
  }

  return value.replace(/\/$/, "");
}

/**
 * Converts an Egress S3 location into the path
 * expected by the public Supabase Storage URL.
 *
 * Examples:
 *
 * s3://smtc-recordings/folder/file.mp4
 * ->
 * folder/file.mp4
 *
 * https://example.com/file.mp4
 * ->
 * https://example.com/file.mp4
 *
 * folder/file.mp4
 * ->
 * folder/file.mp4
 */
function normalizeStoragePath(
  filePath: string,
): string {
  const trimmed = filePath.trim();

  if (
    /^s3:\/\//i.test(trimmed)
  ) {
    const withoutScheme =
      trimmed.replace(
        /^s3:\/\//i,
        "",
      );

    const slashIndex =
      withoutScheme.indexOf("/");

    if (slashIndex >= 0) {
      return withoutScheme.slice(
        slashIndex + 1,
      );
    }

    return withoutScheme;
  }

  return trimmed.replace(/^\/+/, "");
}

function buildPlaybackUrl(
  filePath: string | null,
): string | null {
  if (!filePath) {
    return null;
  }

  /*
   * If LiveKit already returned a complete HTTP URL,
   * use it directly.
   */
  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const baseUrl =
    getPublicBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const normalizedPath =
    normalizeStoragePath(filePath);

  const encodedPath =
    normalizedPath
      .split("/")
      .map((part) =>
        encodeURIComponent(part),
      )
      .join("/");

  return `${baseUrl}/${encodedPath}`;
}

/* =========================================================
   STORAGE CONFIGURATION
========================================================= */

function getStorageConfig() {
  const bucket =
    getRequiredEnv(
      "RECORDING_S3_BUCKET",
    );

  const accessKey =
    getRequiredEnv(
      "RECORDING_S3_ACCESS_KEY_ID",
    );

  const secret =
    getRequiredEnv(
      "RECORDING_S3_SECRET_ACCESS_KEY",
    );

  const region =
    getRequiredEnv(
      "RECORDING_S3_REGION",
    );

  const endpoint =
    process.env.RECORDING_S3_ENDPOINT?.trim() ||
    undefined;

  const forcePathStyle =
    process.env.RECORDING_S3_FORCE_PATH_STYLE ===
    "true";

  return {
    bucket,
    accessKey,
    secret,
    region,
    endpoint,
    forcePathStyle,
  };
}

/* =========================================================
   EGRESS HELPERS
========================================================= */

function getEgressError(
  info: EgressInfo,
): string | null {
  if (
    typeof info.error === "string" &&
    info.error.trim()
  ) {
    return info.error.trim();
  }

  return null;
}

/**
 * Normalizes LiveKit EgressStatus.
 *
 * Current LiveKit JS SDK exposes EgressStatus as
 * an enum, which is numeric at runtime.
 *
 * We also support string values so this remains
 * compatible with older SDK/API representations.
 */
function getEgressStatus(
  info: EgressInfo,
): string {
  const rawStatus = info.status;

  if (
    typeof rawStatus === "number" &&
    Number.isFinite(rawStatus)
  ) {
    return (
      EGRESS_STATUS_NAMES[
        rawStatus
      ] ??
      String(rawStatus)
    );
  }

  if (
    typeof rawStatus === "bigint"
  ) {
    const numericStatus =
      Number(rawStatus);

    return (
      EGRESS_STATUS_NAMES[
        numericStatus
      ] ??
      String(numericStatus)
    );
  }

  const stringStatus =
    String(
      rawStatus ?? "",
    ).trim();

  if (!stringStatus) {
    return "";
  }

  const numericStatus =
    Number(stringStatus);

  if (
    Number.isInteger(
      numericStatus,
    ) &&
    EGRESS_STATUS_NAMES[
      numericStatus
    ]
  ) {
    return EGRESS_STATUS_NAMES[
      numericStatus
    ];
  }

  return stringStatus.toUpperCase();
}

function isEgressFinished(
  info: EgressInfo,
): boolean {
  const status =
    getEgressStatus(info);

  return (
    status ===
      "EGRESS_COMPLETE" ||
    status ===
      "EGRESS_FAILED" ||
    status ===
      "EGRESS_ABORTED" ||
    status ===
      "EGRESS_LIMIT_REACHED"
  );
}

function isEgressFailed(
  info: EgressInfo,
): boolean {
  const status =
    getEgressStatus(info);

  return (
    Boolean(
      getEgressError(info),
    ) ||
    status ===
      "EGRESS_FAILED" ||
    status ===
      "EGRESS_ABORTED" ||
    status ===
      "EGRESS_LIMIT_REACHED"
  );
}

function getEgressFileResult(
  info: EgressInfo,
): EgressFileResult | null {
  if (
    Array.isArray(
      info.fileResults,
    )
  ) {
    const first =
      info.fileResults[0];

    if (
      first &&
      typeof first ===
        "object"
    ) {
      return first as EgressFileResult;
    }
  }

  /*
   * Older LiveKit representations may expose
   * the file result as `file`.
   */
  if (
    info.file &&
    typeof info.file ===
      "object"
  ) {
    return info.file as EgressFileResult;
  }

  /*
   * Some responses can expose the oneof result.
   */
  if (
    info.result &&
    typeof info.result ===
      "object"
  ) {
    const result =
      info.result as Record<
        string,
        unknown
      >;

    if (
      result.case === "file" &&
      result.value &&
      typeof result.value ===
        "object"
    ) {
      return result.value as EgressFileResult;
    }
  }

  return null;
}

function getEgressFilePath(
  info: EgressInfo,
): string | null {
  const file =
    getEgressFileResult(info);

  if (!file) {
    return null;
  }

  const values = [
    file.location,
    file.filename,
    file.filepath,
  ];

  for (const value of values) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

function getEgressFileSize(
  info: EgressInfo,
): number | null {
  const file =
    getEgressFileResult(info);

  if (!file) {
    return null;
  }

  const values = [
    file.size,
    file.sizeBytes,
    file.fileSize,
  ];

  for (const value of values) {
    const numberValue =
      Number(value);

    if (
      Number.isFinite(
        numberValue,
      ) &&
      numberValue >= 0
    ) {
      return Math.floor(
        numberValue,
      );
    }
  }

  return null;
}

function getEgressFileMimeType(
  info: EgressInfo,
): string {
  const file =
    getEgressFileResult(info);

  if (
    file &&
    typeof file.type ===
      "string" &&
    file.type.trim()
  ) {
    return file.type.trim();
  }

  return "video/mp4";
}

function getEgressDurationSeconds(
  info: EgressInfo,
  recording: RecordingRow,
): number | null {
  const file =
    getEgressFileResult(info);

  /*
   * LiveKit FileInfo.duration is expressed
   * in nanoseconds.
   */
  if (file) {
    const fileDuration =
      Number(
        file.duration,
      );

    if (
      Number.isFinite(
        fileDuration,
      ) &&
      fileDuration > 0
    ) {
      return Math.floor(
        fileDuration /
          1_000_000_000,
      );
    }
  }

  const startedAtMs =
    toUnixMilliseconds(
      info.startedAt,
    );

  const endedAtMs =
    toUnixMilliseconds(
      info.endedAt,
    );

  if (
    startedAtMs !== null &&
    endedAtMs !== null
  ) {
    return Math.floor(
      Math.max(
        0,
        endedAtMs -
          startedAtMs,
      ) / 1000,
    );
  }

  if (
    recording.duration_seconds !==
      null
  ) {
    return Number(
      recording.duration_seconds,
    );
  }

  return null;
}

/* =========================================================
   RECORDING SERIALIZATION
========================================================= */

function serializeRecording(
  row: RecordingRow | null,
): Record<string, unknown> | null {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),

    liveClassId:
      Number(
        row.live_class_id,
      ),

    provider:
      row.provider,

    status:
      row.status,

    recordingUrl:
      row.recording_url,

    thumbnailUrl:
      row.thumbnail_url,

    durationSeconds:
      row.duration_seconds ===
      null
        ? null
        : Number(
            row.duration_seconds,
          ),

    fileSizeBytes:
      row.file_size_bytes ===
      null
        ? null
        : Number(
            row.file_size_bytes,
          ),

    mimeType:
      row.mime_type,

    startedAt:
      toIso(
        row.started_at,
      ),

    endedAt:
      toIso(
        row.ended_at,
      ),

    createdAt:
      toIso(
        row.created_at,
      ),

    updatedAt:
      toIso(
        row.updated_at,
      ),
  };
}

/* =========================================================
   LECTURER AUTHENTICATION + AUTHORIZATION
========================================================= */

async function getAuthorizedLecturerClass(
  classId: number,
) {
  const lecturer =
    await requireLecturer();

  if (!lecturer) {
    return {
      error: jsonResponse(
        {
          success: false,
          message:
            "Lecturer authentication required.",
        },
        401,
      ),
    };
  }

  const lecturerId =
    Number(
      lecturer.id,
    );

  if (
    !Number.isInteger(
      lecturerId,
    ) ||
    lecturerId <= 0
  ) {
    return {
      error: jsonResponse(
        {
          success: false,
          message:
            "Invalid lecturer session.",
        },
        401,
      ),
    };
  }

  const result =
    await pool.query(
      `
        SELECT
          id,
          title,
          status,
          room_code,
          recording_enabled,
          lecturer_id
        FROM lms_live_classes
        WHERE id = $1
          AND lecturer_id = $2
        LIMIT 1
      `,
      [
        classId,
        lecturerId,
      ],
    );

  if (
    result.rows.length ===
    0
  ) {
    return {
      error: jsonResponse(
        {
          success: false,
          message:
            "Live class not found or you are not authorized to control recordings for this class.",
        },
        403,
      ),
    };
  }

  const liveClass =
    result.rows[0] as LiveClassRow;

  if (
    Number(
      liveClass.lecturer_id,
    ) !== lecturerId
  ) {
    return {
      error: jsonResponse(
        {
          success: false,
          message:
            "You are not authorized to record this live class.",
        },
        403,
      ),
    };
  }

  return {
    lecturerId,
    liveClass,
  };
}

/* =========================================================
   DATABASE - RECORDINGS
========================================================= */

async function getLatestRecording(
  classId: number,
): Promise<RecordingRow | null> {
  const result =
    await pool.query(
      `
        SELECT
          id,
          live_class_id,
          provider,
          recording_url,
          thumbnail_url,
          duration_seconds,
          file_size_bytes,
          mime_type,
          status,
          started_at,
          ended_at,
          created_at,
          updated_at
        FROM lms_live_class_recordings
        WHERE live_class_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [classId],
    );

  if (
    result.rows.length ===
    0
  ) {
    return null;
  }

  return result.rows[0] as RecordingRow;
}

async function createRecordingRow(
  classId: number,
  startedAtMs: number | null,
): Promise<RecordingRow> {
  const result =
    await pool.query(
      `
        INSERT INTO lms_live_class_recordings (
          live_class_id,
          provider,
          recording_url,
          thumbnail_url,
          duration_seconds,
          file_size_bytes,
          mime_type,
          status,
          started_at
        )
        VALUES (
          $1,
          'livekit',
          NULL,
          NULL,
          NULL,
          NULL,
          'video/mp4',
          'processing',
          COALESCE(
            $2::timestamptz,
            NOW()
          )
        )
        RETURNING
          id,
          live_class_id,
          provider,
          recording_url,
          thumbnail_url,
          duration_seconds,
          file_size_bytes,
          mime_type,
          status,
          started_at,
          ended_at,
          created_at,
          updated_at
      `,
      [
        classId,
        startedAtMs === null
          ? null
          : new Date(
              startedAtMs,
            ).toISOString(),
      ],
    );

  return result.rows[0] as RecordingRow;
}

async function updateRecording(
  recordingId: number,
  values: {
    status?: RecordingStatus;
    recordingUrl?: string | null;
    durationSeconds?: number | null;
    fileSizeBytes?: number | null;
    mimeType?: string | null;
    startedAtMs?: number | null;
    endedAtMs?: number | null;
  },
): Promise<RecordingRow> {
  const result =
    await pool.query(
      `
        UPDATE lms_live_class_recordings
        SET
          status =
            COALESCE(
              $1,
              status
            ),

          recording_url =
            COALESCE(
              $2,
              recording_url
            ),

          duration_seconds =
            COALESCE(
              $3,
              duration_seconds
            ),

          file_size_bytes =
            COALESCE(
              $4,
              file_size_bytes
            ),

          mime_type =
            COALESCE(
              $5,
              mime_type
            ),

          started_at =
            COALESCE(
              $6::timestamptz,
              started_at
            ),

          ended_at =
            COALESCE(
              $7::timestamptz,
              ended_at
            ),

          updated_at = NOW()

        WHERE id = $8

        RETURNING
          id,
          live_class_id,
          provider,
          recording_url,
          thumbnail_url,
          duration_seconds,
          file_size_bytes,
          mime_type,
          status,
          started_at,
          ended_at,
          created_at,
          updated_at
      `,
      [
        values.status ?? null,

        values.recordingUrl ===
        undefined
          ? null
          : values.recordingUrl,

        values.durationSeconds ===
        undefined
          ? null
          : values.durationSeconds,

        values.fileSizeBytes ===
        undefined
          ? null
          : values.fileSizeBytes,

        values.mimeType ===
        undefined
          ? null
          : values.mimeType,

        values.startedAtMs ===
            undefined ||
        values.startedAtMs ===
            null
          ? null
          : new Date(
              values.startedAtMs,
            ).toISOString(),

        values.endedAtMs ===
            undefined ||
        values.endedAtMs ===
            null
          ? null
          : new Date(
              values.endedAtMs,
            ).toISOString(),

        recordingId,
      ],
    );

  if (
    result.rows.length ===
    0
  ) {
    throw new Error(
      "Recording database row could not be updated.",
    );
  }

  return result.rows[0] as RecordingRow;
}

/* =========================================================
   LIVEKIT CLIENT
========================================================= */

function createEgressClient(): EgressClient {
  return new EgressClient(
    getLiveKitHost(),
    getRequiredEnv(
      "LIVEKIT_API_KEY",
    ),
    getRequiredEnv(
      "LIVEKIT_API_SECRET",
    ),
  );
}

function createRoomServiceClient(): RoomServiceClient {
  return new RoomServiceClient(
    getLiveKitHost(),
    getRequiredEnv(
      "LIVEKIT_API_KEY",
    ),
    getRequiredEnv(
      "LIVEKIT_API_SECRET",
    ),
  );
}

/* =========================================================
   STOP EGRESS SAFELY
========================================================= */

async function stopEgressSafely(
  egressId: string,
): Promise<void> {
  if (!egressId) {
    return;
  }

  try {
    const client =
      createEgressClient();

    await client.stopEgress(
      egressId,
    );

    console.log(
      "SMTC ORPHAN EGRESS STOPPED:",
      {
        egressId,
      },
    );
  } catch (error) {
    console.error(
      "SMTC ORPHAN EGRESS CLEANUP FAILED:",
      {
        egressId,
        error,
      },
    );
  }
}

/* =========================================================
   LIVEKIT ROOM EXISTENCE
========================================================= */

async function verifyLiveKitRoom(
  roomName: string,
): Promise<{
  exists: boolean;
  participantCount: number;
}> {
  const client =
    createRoomServiceClient();

  const rooms =
    await client.listRooms([
      roomName,
    ]);

  if (
    !rooms ||
    rooms.length ===
      0
  ) {
    return {
      exists: false,
      participantCount: 0,
    };
  }

  const room =
    rooms[0] as unknown as Record<
      string,
      unknown
    >;

  const participantCount =
    Number(
      room.numParticipants ??
        room.num_participants ??
        0,
    );

  return {
    exists: true,
    participantCount:
      Number.isFinite(
        participantCount,
      )
        ? participantCount
        : 0,
  };
}

/* =========================================================
   FIND EGRESS
========================================================= */

async function findEgressForRecording(
  roomName: string,
  recording: RecordingRow,
): Promise<EgressMatch | null> {
  const client =
    createEgressClient();

  /*
   * LiveKit's ListEgress API returns active and
   * recently completed Egress instances.
   */
  const egresses =
    await client.listEgress({
      roomName,
    });

  if (
    !egresses ||
    egresses.length ===
      0
  ) {
    return null;
  }

  const recordingStartedMs =
    toUnixMilliseconds(
      recording.started_at,
    );

  const candidates: EgressMatch[] =
    egresses
      .map(
        (
          egress,
        ) => {
          const info =
            egress as unknown as EgressInfo;

          return {
            info,

            startedAtMs:
              toUnixMilliseconds(
                info.startedAt,
              ),

            endedAtMs:
              toUnixMilliseconds(
                info.endedAt,
              ),
          };
        },
      )
      .filter(
        (
          candidate,
        ) => {
          if (
            recordingStartedMs ===
              null ||
            candidate.startedAtMs ===
              null
          ) {
            return true;
          }

          return (
            candidate.startedAtMs >=
            recordingStartedMs -
              60_000
          );
        },
      );

  if (
    candidates.length ===
    0
  ) {
    return null;
  }

  candidates.sort(
    (
      a,
      b,
    ) =>
      (b.startedAtMs ??
        0) -
      (a.startedAtMs ??
        0),
  );

  return candidates[0];
}

/* =========================================================
   REFRESH RECORDING FROM EGRESS
========================================================= */

async function refreshRecordingFromEgress(
  roomName: string,
  recording: RecordingRow,
): Promise<RecordingRow> {
  const match =
    await findEgressForRecording(
      roomName,
      recording,
    );

  /*
   * IMPORTANT:
   *
   * If LiveKit temporarily has no matching Egress,
   * do not invent a failed state.
   *
   * Keep processing and allow the next poll to
   * check again.
   */
  if (!match) {
    console.log(
      "SMTC RECORDING EGRESS NOT FOUND DURING POLL:",
      {
        roomName,
        recordingId:
          recording.id,
        recordingStatus:
          recording.status,
      },
    );

    return recording;
  }

  const info =
    match.info;

  const status =
    getEgressStatus(info);

  const failed =
    isEgressFailed(info);

  const finished =
    isEgressFinished(info);

  const filePath =
    getEgressFilePath(info);

  const fileSizeBytes =
    getEgressFileSize(info);

  const mimeType =
    getEgressFileMimeType(info);

  const durationSeconds =
    getEgressDurationSeconds(
      info,
      recording,
    );

  console.log(
    "SMTC RECORDING EGRESS STATUS:",
    {
      recordingId:
        recording.id,
      egressId:
        String(
          info.egressId ??
            "",
        ),
      roomName,
      status,
      filePath,
      fileSizeBytes,
      durationSeconds,
    },
  );

  /*
   * =====================================================
   * FAILED
   * =====================================================
   */

  if (failed) {
    return updateRecording(
      recording.id,
      {
        status:
          "failed",

        durationSeconds,

        mimeType,

        startedAtMs:
          match.startedAtMs,

        endedAtMs:
          match.endedAtMs,

        fileSizeBytes,
      },
    );
  }

  /*
   * =====================================================
   * SUCCESSFULLY COMPLETE
   * =====================================================
   *
   * We require COMPLETE plus a file path before
   * marking the database row ready.
   */

  if (
    status ===
      "EGRESS_COMPLETE" &&
    filePath
  ) {
    const playbackUrl =
      buildPlaybackUrl(
        filePath,
      );

    console.log(
      "SMTC RECORDING FINALIZED:",
      {
        recordingId:
          recording.id,
        filePath,
        playbackUrl,
        durationSeconds,
        fileSizeBytes,
      },
    );

    return updateRecording(
      recording.id,
      {
        status:
          "ready",

        recordingUrl:
          playbackUrl,

        durationSeconds,

        fileSizeBytes,

        mimeType,

        startedAtMs:
          match.startedAtMs,

        endedAtMs:
          match.endedAtMs,
      },
    );
  }

  /*
   * =====================================================
   * COMPLETE BUT FILE RESULT NOT YET AVAILABLE
   * =====================================================
   *
   * Keep processing. The next poll can retrieve
   * the completed Egress/file information.
   */

  if (
    status ===
      "EGRESS_COMPLETE"
  ) {
    return updateRecording(
      recording.id,
      {
        status:
          "processing",

        durationSeconds,

        fileSizeBytes,

        mimeType,

        startedAtMs:
          match.startedAtMs,

        endedAtMs:
          match.endedAtMs,
      },
    );
  }

  /*
   * =====================================================
   * STARTING / ACTIVE / ENDING
   * =====================================================
   */

  return updateRecording(
    recording.id,
    {
      status:
        "processing",

      durationSeconds,

      fileSizeBytes,

      mimeType,

      startedAtMs:
        match.startedAtMs,
    },
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const classId =
      parseClassId(
        context.params.id,
      );

    if (!classId) {
      return jsonResponse(
        {
          success: false,
          message:
            "Invalid live class ID.",
        },
        400,
      );
    }

    const auth =
      await getAuthorizedLecturerClass(
        classId,
      );

    if ("error" in auth) {
      return auth.error;
    }

    let recording =
      await getLatestRecording(
        classId,
      );

    if (
      recording &&
      recording.status !==
        "ready" &&
      recording.status !==
        "failed" &&
      recording.status !==
        "deleted"
    ) {
      try {
        recording =
          await refreshRecordingFromEgress(
            auth.liveClass.room_code,
            recording,
          );
      } catch (error) {
        console.warn(
          "SMTC RECORDING STATUS REFRESH WARNING:",
          error,
        );
      }
    }

    return jsonResponse({
      success: true,

      recording:
        serializeRecording(
          recording,
        ),
    });
  } catch (error) {
    console.error(
      "LECTURER LIVE CLASS RECORDING GET ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load recording status.",
      },
      500,
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const classId =
      parseClassId(
        context.params.id,
      );

    if (!classId) {
      return jsonResponse(
        {
          success: false,
          message:
            "Invalid live class ID.",
        },
        400,
      );
    }

    /*
     * =====================================================
     * STEP 1 — AUTHENTICATE LECTURER
     * =====================================================
     */

    const auth =
      await getAuthorizedLecturerClass(
        classId,
      );

    if ("error" in auth) {
      return auth.error;
    }

    const {
      liveClass,
      lecturerId,
    } = auth;

    console.log(
      "SMTC RECORDING AUTHORIZED:",
      {
        lecturerId,
        classId,
        roomCode:
          liveClass.room_code,
      },
    );

    /*
     * =====================================================
     * STEP 2 — READ ACTION
     * =====================================================
     */

    let body: RecordingBody =
      {};

    try {
      body =
        (await request.json()) as RecordingBody;
    } catch {
      body = {};
    }

    const action =
      body.action;

    if (
      action !== "start" &&
      action !== "stop"
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "Recording action must be start or stop.",
        },
        400,
      );
    }

    /*
     * =====================================================
     * STEP 3 — LOAD CURRENT RECORDING
     * =====================================================
     */

    let recording =
      await getLatestRecording(
        classId,
      );

    if (
      recording &&
      recording.status !==
        "ready" &&
      recording.status !==
        "failed" &&
      recording.status !==
        "deleted"
    ) {
      try {
        recording =
          await refreshRecordingFromEgress(
            liveClass.room_code,
            recording,
          );
      } catch (error) {
        console.warn(
          "SMTC RECORDING PRE-CHECK WARNING:",
          error,
        );
      }
    }

    /*
     * =====================================================
     * STOP
     * =====================================================
     */

    if (
      action === "stop"
    ) {
      if (!recording) {
        return jsonResponse({
          success: true,

          message:
            "No active recording was running.",

          recording: null,
        });
      }

      if (
        recording.status ===
          "ready" ||
        recording.status ===
          "failed" ||
        recording.status ===
          "deleted"
      ) {
        return jsonResponse({
          success: true,

          message:
            "The recording has already finished.",

          recording:
            serializeRecording(
              recording,
            ),
        });
      }

      const match =
        await findEgressForRecording(
          liveClass.room_code,
          recording,
        );

      if (!match) {
        recording =
          await updateRecording(
            recording.id,
            {
              status:
                "processing",
            },
          );

        return jsonResponse({
          success: true,

          message:
            "The LiveKit recording session is no longer active. The recording is being finalized.",

          recording:
            serializeRecording(
              recording,
            ),
        });
      }

      const egressId =
        String(
          match.info.egressId ??
            match.info.egress_id ??
            "",
        );

      if (!egressId) {
        return jsonResponse(
          {
            success: false,
            message:
              "LiveKit did not return the recording session ID.",
          },
          500,
        );
      }

      /*
       * If it is already finished, do not call stopEgress
       * again. Just let the refresh logic finalize it.
       */
      if (
        isEgressFinished(
          match.info,
        )
      ) {
        recording =
          await refreshRecordingFromEgress(
            liveClass.room_code,
            recording,
          );

        return jsonResponse({
          success: true,

          message:
            "The recording has finished and is being finalized.",

          recording:
            serializeRecording(
              recording,
            ),
        });
      }

      const client =
        createEgressClient();

      let stopped: unknown;

      try {
        stopped =
          await client.stopEgress(
            egressId,
          );
      } catch (error) {
        console.error(
          "SMTC LIVEKIT EGRESS STOP ERROR:",
          {
            classId,
            lecturerId,
            roomCode:
              liveClass.room_code,
            egressId,
            error,
          },
        );

        return jsonResponse(
          {
            success: false,

            message:
              error instanceof Error
                ? error.message
                : "Unable to stop the LiveKit recording.",
          },
          502,
        );
      }

      const stoppedInfo =
        stopped as EgressInfo;

      const endedAtMs =
        toUnixMilliseconds(
          stoppedInfo.endedAt,
        );

      const startedAtMs =
        toUnixMilliseconds(
          stoppedInfo.startedAt,
        ) ??
        toUnixMilliseconds(
          recording.started_at,
        );

      const durationSeconds =
        getEgressDurationSeconds(
          stoppedInfo,
          recording,
        );

      recording =
        await updateRecording(
          recording.id,
          {
            status:
              "processing",

            endedAtMs,

            startedAtMs,

            durationSeconds,
          },
        );

      console.log(
        "SMTC RECORDING STOPPED:",
        {
          classId,
          lecturerId,
          roomCode:
            liveClass.room_code,
          egressId,
          recordingId:
            recording.id,
          status:
            getEgressStatus(
              stoppedInfo,
            ),
        },
      );

      return jsonResponse({
        success: true,

        message:
          "Recording stopped and is being processed.",

        recording:
          serializeRecording(
            recording,
          ),
      });
    }

    /*
     * =====================================================
     * START VALIDATION
     * =====================================================
     */

    if (
      !liveClass.recording_enabled
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "Recording is disabled for this live class.",
        },
        403,
      );
    }

    if (
      liveClass.status !==
      "live"
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "The live class must be active before recording can start.",
        },
        409,
      );
    }

    /*
     * =====================================================
     * EXISTING RECORDING CHECK
     * =====================================================
     */

    if (
      recording &&
      recording.status ===
        "processing"
    ) {
      const activeEgress =
        await findEgressForRecording(
          liveClass.room_code,
          recording,
        );

      if (activeEgress) {
        const egressStatus =
          getEgressStatus(
            activeEgress.info,
          );

        console.log(
          "SMTC EXISTING RECORDING CHECK:",
          {
            recordingId:
              recording.id,
            egressId:
              String(
                activeEgress.info.egressId ??
                  "",
              ),
            egressStatus,
          },
        );

        if (
          !isEgressFinished(
            activeEgress.info,
          )
        ) {
          return jsonResponse({
            success: true,

            message:
              "Recording is already active.",

            recording:
              serializeRecording(
                recording,
              ),
          });
        }

        /*
         * Egress has finished. Finalize it before
         * deciding whether another recording can start.
         */
        recording =
          await refreshRecordingFromEgress(
            liveClass.room_code,
            recording,
          );
      }

      /*
       * If no Egress was found, perform one final
       * refresh.
       */
      if (
        recording.status ===
        "processing"
      ) {
        try {
          recording =
            await refreshRecordingFromEgress(
              liveClass.room_code,
              recording,
            );
        } catch (error) {
          console.warn(
            "SMTC FINAL RECORDING REFRESH WARNING:",
            {
              error,
            },
          );
        }
      }

      /*
       * Only block a new recording if we can actually
       * see that a LiveKit Egress is still active.
       *
       * A stale processing row with no Egress should
       * not permanently lock the lecturer out.
       */
      if (
        recording.status ===
        "processing"
      ) {
        const latestEgress =
          await findEgressForRecording(
            liveClass.room_code,
            recording,
          );

        if (
          latestEgress &&
          !isEgressFinished(
            latestEgress.info,
          )
        ) {
          return jsonResponse(
            {
              success: false,

              message:
                "The previous recording is still active. Please wait for it to finish before starting another recording.",
            },
            409,
          );
        }

        /*
         * If there is no active Egress anymore,
         * mark the stale database row as failed.
         *
         * This prevents an old processing row from
         * permanently blocking future recordings.
         */
        recording =
          await updateRecording(
            recording.id,
            {
              status:
                "failed",

              endedAtMs:
                recording.ended_at
                  ? new Date(
                      recording.ended_at,
                    ).getTime()
                  : Date.now(),
            },
          );

        console.warn(
          "SMTC STALE RECORDING MARKED FAILED:",
          {
            recordingId:
              recording.id,
            classId,
            roomCode:
              liveClass.room_code,
          },
        );
      }
    }

    /*
     * =====================================================
     * SUPABASE STORAGE CONFIGURATION
     * =====================================================
     */

    const storage =
      getStorageConfig();

    /*
     * =====================================================
     * FILE PATH
     * =====================================================
     */

    const safeTitle =
      safeSlug(
        liveClass.title,
      );

    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-",
        );

    const filePath =
      `smtc-live-recordings/${classId}/${timestamp}-${safeTitle}.mp4`;

    /*
     * =====================================================
     * VERIFY LIVEKIT ROOM
     * =====================================================
     */

    const roomCheck =
      await verifyLiveKitRoom(
        liveClass.room_code,
      );

    if (!roomCheck.exists) {
      console.error(
        "SMTC LIVEKIT ROOM NOT FOUND:",
        {
          classId,
          lecturerId,
          databaseRoomCode:
            liveClass.room_code,
        },
      );

      return jsonResponse(
        {
          success: false,

          code:
            "LIVEKIT_ROOM_NOT_FOUND",

          message:
            `The live class is authenticated, but LiveKit does not currently have room "${liveClass.room_code}". The lecturer may be connected to a different LiveKit room.`,

          roomCode:
            liveClass.room_code,
        },
        409,
      );
    }

    console.log(
      "SMTC LIVEKIT ROOM VERIFIED:",
      {
        classId,
        roomCode:
          liveClass.room_code,
        participantCount:
          roomCheck.participantCount,
      },
    );

    /*
     * =====================================================
     * EGRESS OUTPUT
     * =====================================================
     */

    const output =
      new EncodedFileOutput({
        fileType:
          EncodedFileType.MP4,

        filepath:
          filePath,

        output: {
          case: "s3",

          value:
            new S3Upload({
              accessKey:
                storage.accessKey,

              secret:
                storage.secret,

              bucket:
                storage.bucket,

              region:
                storage.region,

              endpoint:
                storage.endpoint,

              forcePathStyle:
                storage.forcePathStyle,

              contentDisposition:
                "inline",
            }),
        },
      });

    /*
     * =====================================================
     * START EGRESS
     * =====================================================
     */

    const client =
      createEgressClient();

    let info: unknown;

    try {
      info =
        await client.startRoomCompositeEgress(
          liveClass.room_code,
          {
            file: output,
          },
          {
            layout:
              "speaker",

            encodingOptions:
              EncodingOptionsPreset.H264_720P_30,

            audioOnly:
              false,

            videoOnly:
              false,
          },
        );
    } catch (error) {
      console.error(
        "SMTC LIVEKIT EGRESS START ERROR:",
        {
          classId,
          lecturerId,
          roomCode:
            liveClass.room_code,
          error,
        },
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        /requested room does not exist/i.test(
          errorMessage,
        )
      ) {
        return jsonResponse(
          {
            success: false,

            code:
              "LIVEKIT_ROOM_NOT_FOUND",

            message:
              `LiveKit could not find room "${liveClass.room_code}". The lecturer authentication succeeded, but the LiveKit room name being used by the classroom does not match the database room code.`,

            roomCode:
              liveClass.room_code,
          },
          409,
        );
      }

      return jsonResponse(
        {
          success: false,

          message:
            `Unable to start LiveKit recording: ${errorMessage}`,
        },
        502,
      );
    }

    const infoRecord =
      info as EgressInfo;

    const egressId =
      String(
        infoRecord.egressId ??
          infoRecord.egress_id ??
          "",
      );

    if (!egressId) {
      console.error(
        "SMTC LIVEKIT EGRESS ID MISSING:",
        infoRecord,
      );

      return jsonResponse(
        {
          success: false,

          message:
            "LiveKit started the recording but did not return an Egress ID.",
        },
        502,
      );
    }

    const startedAtMs =
      toUnixMilliseconds(
        infoRecord.startedAt,
      );

    /*
     * =====================================================
     * SAVE DATABASE RECORD
     * =====================================================
     */

    try {
      recording =
        await createRecordingRow(
          classId,
          startedAtMs,
        );
    } catch (databaseError) {
      console.error(
        "SMTC RECORDING DATABASE INSERT FAILED AFTER EGRESS START:",
        {
          classId,
          lecturerId,
          roomCode:
            liveClass.room_code,
          egressId,
          databaseError,
        },
      );

      await stopEgressSafely(
        egressId,
      );

      return jsonResponse(
        {
          success: false,

          message:
            "The recording service started, but the recording database record could not be created. The LiveKit recording session was stopped automatically. Please try again.",

          egressStarted:
            false,

          cleanedUp:
            true,
        },
        500,
      );
    }

    /*
     * =====================================================
     * INITIAL RECORDING STATE
     * =====================================================
     */

    recording =
      await updateRecording(
        recording.id,
        {
          status:
            "processing",

          mimeType:
            "video/mp4",

          startedAtMs,
        },
      );

    console.log(
      "SMTC RECORDING STARTED:",
      {
        classId,
        lecturerId,
        roomCode:
          liveClass.room_code,
        recordingId:
          recording.id,
        egressId,
        filePath,

        egressStatus:
          getEgressStatus(
            infoRecord,
          ),
      },
    );

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return jsonResponse(
      {
        success: true,

        message:
          "Classroom recording started.",

        recording:
          serializeRecording(
            recording,
          ),

        egressStarted:
          true,

        egressId,
      },
      201,
    );
  } catch (error) {
    console.error(
      "LECTURER LIVE CLASS RECORDING POST ERROR:",
      error,
    );

    return jsonResponse(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to control classroom recording.",
      },
      500,
    );
  }
}

