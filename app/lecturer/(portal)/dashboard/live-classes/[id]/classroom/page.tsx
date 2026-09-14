"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";

import {
  LocalTrackPublication,
  Participant,
  RoomEvent,
  Track,
  TrackPublication,
} from "livekit-client";

import "@livekit/components-styles";

import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Loader2,
  Lock,
  LockOpen,
  LogOut,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  RefreshCw,
  Radio,
  Settings2,
  ShieldCheck,
  Square,
  Users,
  Video,
  VideoOff,
  Wifi,
  X,
} from "lucide-react";

import LiveClassChat from "@/components/lecturer/LiveClassChat";

/* =========================================================
   TYPES
========================================================= */

type LiveClassStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

type RecordingStatus =
  | "pending"
  | "recording"
  | "processing"
  | "ready"
  | "failed";

type LiveClass = {
  id: number;
  programId: number;
  unitId: number;
  lecturerId: number;

  programName: string;
  unitName: string;
  unitCode?: string | null;

  title: string;
  description?: string | null;

  roomCode: string;

  scheduledStart: string;
  scheduledEnd?: string | null;

  actualStart?: string | null;
  actualEnd?: string | null;

  status: LiveClassStatus;

  recordingEnabled: boolean;
  chatEnabled: boolean;

  studentMicrophoneEnabled: boolean;
  studentCameraEnabled: boolean;
  studentScreenShareEnabled: boolean;

  studentsCanJoinBeforeLecturer: boolean;

  isLocked: boolean;

  recordingStatus: RecordingStatus;

  participantCount: number;
  recordingCount: number;
};

type ClassResponse = {
  success?: boolean;
  message?: string;
  class?: LiveClass;
};

type TokenResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  serverUrl?: string;
  roomName?: string;
};

type ParticipantTrack = {
  sid?: string;
  source?: string | number;
  muted?: boolean;
  type?: string;
};

type ParticipantPermission = {
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  canPublishSources?: Array<string | number>;
};

type ServerParticipant = {
  sid?: string;
  identity: string;
  name?: string | null;
  state?: string;
  joinedAt?: number;
  tracks?: ParticipantTrack[];
  permission?: ParticipantPermission;
};

type ParticipantsResponse = {
  success?: boolean;
  message?: string;
  participants?: ServerParticipant[];
  count?: number;
};

type ParticipantAction =
  | "mute"
  | "unmute"
  | "remove"
  | "mute_all"
  | "unmute_all"
  | "disable_microphone"
  | "enable_microphone"
  | "disable_camera"
  | "enable_camera"
  | "disable_screen_share"
  | "enable_screen_share";

type RightPanel = "participants" | "chat";

type SettingKey =
  | "isLocked"
  | "chatEnabled"
  | "studentMicrophoneEnabled"
  | "studentCameraEnabled"
  | "studentScreenShareEnabled"
  | "studentsCanJoinBeforeLecturer";

/* =========================================================
   HELPERS
========================================================= */

function getClassId(
  params: Record<string, string | string[]>,
): string {
  const value = params.id;

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function formatDate(value: string): string {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTrack(
  participant: ServerParticipant,
  type: "microphone" | "camera" | "screen",
): ParticipantTrack | null {
  const tracks = participant.tracks || [];

  for (const track of tracks) {
    const source = String(
      track.source || "",
    ).toLowerCase();

    if (
      type === "microphone" &&
      (source.includes("microphone") ||
        source === "2")
    ) {
      return track;
    }

    if (
      type === "camera" &&
      (source.includes("camera") ||
        source === "1")
    ) {
      return track;
    }

    if (
      type === "screen" &&
      (source.includes("screen") ||
        source === "3" ||
        source === "4")
    ) {
      return track;
    }
  }

  return null;
}

function getParticipantInitials(
  name: string,
): string {
  const cleanName = name.trim();

  if (!cleanName) {
    return "ST";
  }

  const parts = cleanName.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

/* =========================================================
   SCREEN SHARE
========================================================= */

type ScreenShareState =
  | "idle"
  | "requesting"
  | "sharing"
  | "stopped"
  | "error";

function getScreenShareErrorMessage(
  error: unknown,
): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return "Screen sharing was cancelled or browser permission was denied.";

      case "NotFoundError":
        return "No screen, window, or tab was available to share.";

      case "AbortError":
        return "Screen sharing was cancelled before capture started.";

      case "NotReadableError":
        return "The selected screen could not be captured. Another application or browser permission may be blocking it.";

      case "InvalidStateError":
        return "The browser could not start screen capture from the current page state. Try clicking Share Screen again.";

      case "SecurityError":
        return "The browser blocked screen capture for security reasons. Make sure the classroom is open over HTTPS.";

      default:
        break;
    }
  }

  if (error instanceof Error) {
    return (
      error.message ||
      "Unable to start screen sharing."
    );
  }

  return "Unable to start screen sharing.";
}

function isScreenPublication(
  publication: {
    source?: unknown;
  } | null | undefined,
): boolean {
  const source = String(
    publication?.source || "",
  ).toLowerCase();

  return (
    source.includes("screen") ||
    source === "3" ||
    source === "4"
  );
}

function LecturerScreenShareControl({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const room = useRoomContext();

  const [state, setState] =
    useState<ScreenShareState>("idle");

  const [supported, setSupported] =
    useState(true);

  const [secureContext, setSecureContext] =
    useState(true);

  const [changing, setChanging] =
    useState(false);

  const [diagnosticMessage, setDiagnosticMessage] =
    useState("");

  const [lastEvent, setLastEvent] =
    useState("Not yet recorded");

  const [trackSid, setTrackSid] =
    useState("");

  const [diagnosticsOpen, setDiagnosticsOpen] =
    useState(false);

  const stoppingRef = useRef(false);

  const getScreenPublication =
    useCallback(() => {
      return room.localParticipant.getTrackPublication(
        Track.Source.ScreenShare,
      );
    }, [room]);

  const syncState = useCallback((): void => {
    const publication =
      getScreenPublication();

    const enabled =
      Boolean(publication?.track);

    const sid =
      publication?.trackSid || "";

    setTrackSid(sid);

    if (enabled) {
      setState("sharing");

      setDiagnosticMessage(
        sid
          ? "Screen-share track is published to LiveKit."
          : "Screen sharing is active.",
      );
    } else {
      setState("stopped");
    }
  }, [getScreenPublication]);

  const stopScreenShare =
    useCallback(
      async (
        fromBrowserEnded = false,
      ): Promise<void> => {
        if (stoppingRef.current) {
          return;
        }

        stoppingRef.current = true;

        try {
          const publications = [
            room.localParticipant.getTrackPublication(
              Track.Source.ScreenShare,
            ),
            room.localParticipant.getTrackPublication(
              Track.Source.ScreenShareAudio,
            ),
          ];

          for (const publication of publications) {
            if (publication?.track) {
              await room.localParticipant.unpublishTrack(
                publication.track,
                true,
              );
            }
          }

          setTrackSid("");
          setState("stopped");

          setDiagnosticMessage(
            fromBrowserEnded
              ? "The browser ended screen capture. Screen sharing has stopped."
              : "Screen sharing has been stopped.",
          );

          setLastEvent(
            `${new Date().toLocaleTimeString(
              "en-KE",
            )} — Screen sharing stopped.`,
          );
        } catch (error) {
          const message =
            getScreenShareErrorMessage(
              error,
            );

          setState("error");
          setDiagnosticMessage(message);

          onError(
            "Unable to stop screen sharing: " +
              message,
          );
        } finally {
          stoppingRef.current = false;
        }
      },
      [onError, room],
    );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasDisplayMedia =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices !==
        "undefined" &&
      typeof navigator.mediaDevices
        .getDisplayMedia === "function";

    const isSecure =
      window.isSecureContext ||
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1" ||
      window.location.hostname ===
        "::1";

    setSupported(hasDisplayMedia);
    setSecureContext(isSecure);

    if (!hasDisplayMedia) {
      setState("error");

      setDiagnosticMessage(
        "This browser does not support screen capture. Please use a current version of Chrome or Edge.",
      );
    } else if (!isSecure) {
      setState("error");

      setDiagnosticMessage(
        "Screen sharing requires HTTPS or localhost.",
      );
    }
  }, []);

  useEffect(() => {
    const handlePublished = (
      publication: LocalTrackPublication,
    ): void => {
      if (!isScreenPublication(publication)) {
        return;
      }

      setLastEvent(
        `${new Date().toLocaleTimeString(
          "en-KE",
        )} — Local screen-share track published.`,
      );

      syncState();
    };

    const handleUnpublished = (
      publication: LocalTrackPublication,
    ): void => {
      if (!isScreenPublication(publication)) {
        return;
      }

      setTrackSid("");
      setState("stopped");
      setDiagnosticMessage(
        "Screen sharing has stopped.",
      );
    };

    room.on(
      RoomEvent.LocalTrackPublished,
      handlePublished,
    );

    room.on(
      RoomEvent.LocalTrackUnpublished,
      handleUnpublished,
    );

    syncState();

    return () => {
      room.off(
        RoomEvent.LocalTrackPublished,
        handlePublished,
      );

      room.off(
        RoomEvent.LocalTrackUnpublished,
        handleUnpublished,
      );
    };
  }, [room, syncState]);

  useEffect(() => {
    const publication =
      getScreenPublication();

    const mediaStreamTrack =
      publication?.track?.mediaStreamTrack;

    if (!mediaStreamTrack) {
      return;
    }

    const handleEnded = (): void => {
      void stopScreenShare(true);
    };

    mediaStreamTrack.addEventListener(
      "ended",
      handleEnded,
    );

    return () => {
      mediaStreamTrack.removeEventListener(
        "ended",
        handleEnded,
      );
    };
  }, [
    getScreenPublication,
    stopScreenShare,
    trackSid,
  ]);

  const toggleScreenShare =
    async (): Promise<void> => {
      if (changing) {
        return;
      }

      if (!supported) {
        onError(
          "Screen sharing is not supported by this browser. Please use a current version of Chrome or Edge.",
        );

        return;
      }

      if (!secureContext) {
        onError(
          "Screen sharing requires a secure HTTPS connection.",
        );

        return;
      }

      const currentlySharing =
        Boolean(
          getScreenPublication()?.track,
        );

      if (currentlySharing) {
        setChanging(true);

        try {
          await stopScreenShare(false);
        } finally {
          setChanging(false);
        }

        return;
      }

      try {
        setChanging(true);
        setState("requesting");

        setDiagnosticMessage(
          "Waiting for the browser screen/window/tab picker...",
        );

        setLastEvent(
          `${new Date().toLocaleTimeString(
            "en-KE",
          )} — Browser screen picker opened.`,
        );

        console.log(
          "SMTC SCREEN SHARE: requesting native browser capture picker.",
        );

        const tracks =
          await room.localParticipant.createScreenTracks(
            {
              audio: true,
              contentHint: "detail",
              preferCurrentTab: false,
              selfBrowserSurface: "exclude",
              surfaceSwitching: "include",
              systemAudio: "include",
              video: {
                displaySurface: "monitor",
              },
            },
          );

        if (tracks.length === 0) {
          throw new Error(
            "The browser returned no screen-share tracks.",
          );
        }

        try {
          for (const track of tracks) {
            await room.localParticipant.publishTrack(
              track,
            );
          }
        } catch (publishError) {
          for (const track of tracks) {
            try {
              track.stop();
            } catch {
              // Ignore cleanup errors.
            }
          }

          throw publishError;
        }

        const publication =
          getScreenPublication();

        setTrackSid(
          publication?.trackSid || "",
        );

        setState("sharing");

        setDiagnosticMessage(
          "Screen sharing is live. The selected screen/window/tab is now published to the classroom.",
        );

        setLastEvent(
          `${new Date().toLocaleTimeString(
            "en-KE",
          )} — Screen-share track published.`,
        );

        console.log(
          "SMTC SCREEN SHARE: successfully published screen capture.",
          {
            trackSid:
              publication?.trackSid ||
              null,
            connectionState:
              room.state,
          },
        );
      } catch (error) {
        console.error(
          "SMTC SCREEN SHARE ERROR:",
          error,
        );

        const message =
          getScreenShareErrorMessage(
            error,
          );

        const name =
          error instanceof DOMException
            ? error.name
            : "";

        const userCancelled =
          name === "AbortError" ||
          name === "NotAllowedError" ||
          message
            .toLowerCase()
            .includes("cancel");

        setTrackSid("");

        setState(
          userCancelled
            ? "stopped"
            : "error",
        );

        setDiagnosticMessage(
          message,
        );

        setLastEvent(
          `${new Date().toLocaleTimeString(
            "en-KE",
          )} — Screen-share request finished.`,
        );

        if (!userCancelled) {
          onError(
            "Screen sharing failed: " +
              message,
          );
        }
      } finally {
        setChanging(false);
      }
    };

  const statusLabel =
    state === "requesting"
      ? "Selecting..."
      : state === "sharing"
        ? "Stop Sharing"
        : "Share Screen";

  const statusClass =
    state === "sharing"
      ? "border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
      : state === "error"
        ? "border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
        : "border-[#d7a93b]/30 bg-[#d7a93b]/10 text-[#e5c36b] hover:bg-[#d7a93b]/20";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          void toggleScreenShare()
        }
        disabled={
          changing ||
          !supported ||
          !secureContext
        }
        className={
          "flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 " +
          statusClass
        }
        title={
          !supported
            ? "Screen sharing is not supported"
            : !secureContext
              ? "Screen sharing requires HTTPS"
              : state === "sharing"
                ? "Stop sharing your screen"
                : "Share your screen"
        }
      >
        {changing ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <MonitorUp className="h-4 w-4 shrink-0" />
        )}

        <span className="hidden sm:inline">
          {statusLabel}
        </span>
      </button>

      <button
        type="button"
        onClick={() =>
          setDiagnosticsOpen(
            (current) => !current,
          )
        }
        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-[#0c1714] text-[9px] font-black text-white/60 hover:text-white"
        title="Screen-share diagnostics"
        aria-label="Screen-share diagnostics"
      >
        i
      </button>

      {diagnosticsOpen ? (
        <div className="absolute right-0 top-11 z-50 w-[320px] rounded-xl border border-white/10 bg-[#0c1714] p-3 text-white shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">
                Screen-share diagnostics
              </p>

              <p className="mt-0.5 text-[10px] text-white/40">
                Native browser capture +
                LiveKit publication
              </p>
            </div>

            <span
              className={
                "rounded-full px-2 py-1 text-[10px] font-bold " +
                (state === "sharing"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : state === "error"
                    ? "bg-red-500/10 text-red-300"
                    : "bg-white/5 text-white/50")
              }
            >
              {state}
            </span>
          </div>

          <div className="mt-3 space-y-2 text-[10px] leading-5">
            <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
              <span className="text-white/35">
                Browser capture
              </span>

              <span className="ml-2 font-semibold text-white/75">
                {supported
                  ? "Supported"
                  : "Unavailable"}
              </span>
            </div>

            <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
              <span className="text-white/35">
                Secure context
              </span>

              <span className="ml-2 font-semibold text-white/75">
                {secureContext
                  ? "Yes"
                  : "No"}
              </span>
            </div>

            <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
              <span className="text-white/35">
                LiveKit state
              </span>

              <span className="ml-2 font-semibold text-white/75">
                {String(room.state)}
              </span>
            </div>

            <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
              <span className="text-white/35">
                Track SID
              </span>

              <span className="ml-2 break-all font-mono text-white/75">
                {trackSid ||
                  "Not published"}
              </span>
            </div>

            <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
              <span className="text-white/35">
                Message
              </span>

              <p className="mt-1 break-words text-white/70">
                {diagnosticMessage ||
                  "No diagnostic message."}
              </p>
            </div>

            <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
              <span className="text-white/35">
                Last event
              </span>

              <p className="mt-1 break-words text-white/70">
                {lastEvent}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
/* =========================================================
   PARTICIPANTS PANEL
========================================================= */

function ParticipantsPanel({
  classId,
}: {
  classId: string;
}) {
  const liveParticipants = useParticipants();

  const [participants, setParticipants] =
    useState<ServerParticipant[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [busyIdentity, setBusyIdentity] =
    useState<string | null>(null);

  const fetchParticipants =
    useCallback(async (): Promise<void> => {
      try {
        const response = await fetch(
          `/api/lecturer/live-classes/${classId}/participants`,
          {
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as ParticipantsResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load participants.",
          );
        }

        setParticipants(
          data.participants || [],
        );

        setError("");
      } catch (err) {
        console.error(
          "Failed to load participants:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load participants.",
        );
      } finally {
        setLoading(false);
      }
    }, [classId]);

  useEffect(() => {
    void fetchParticipants();

    const interval =
      window.setInterval(() => {
        void fetchParticipants();
      }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchParticipants]);

  const studentParticipants =
    useMemo(() => {
      return participants.filter(
        (participant) =>
          !participant.identity
            .toLowerCase()
            .startsWith("lecturer-"),
      );
    }, [participants]);

  const liveIdentitySet =
    useMemo(() => {
      return new Set(
        liveParticipants.map(
          (participant) =>
            participant.identity,
        ),
      );
    }, [liveParticipants]);

  const sendAction = async (
    action: ParticipantAction,
    identity?: string,
  ): Promise<void> => {
    if (
      busyIdentity !== null &&
      identity !== busyIdentity
    ) {
      return;
    }

    setBusyIdentity(identity || "__all__");

    try {
      const response = await fetch(
        `/api/lecturer/live-classes/${classId}/participants`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action,
            identity,
          }),
        },
      );

      const data =
        (await response.json()) as ParticipantsResponse;

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Participant action failed.",
        );
      }

      await fetchParticipants();
    } catch (err) {
      console.error(
        "Participant action failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Participant action failed.",
      );
    } finally {
      setBusyIdentity(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Participants
            </h3>

            <p className="mt-0.5 text-[11px] text-white/40">
              {studentParticipants.length} student
              {studentParticipants.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                void sendAction(
                  "mute_all",
                )
              }
              disabled={
                busyIdentity !== null
              }
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
            >
              Mute all
            </button>

            <button
              type="button"
              onClick={() =>
                void fetchParticipants()
              }
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-white/50 transition hover:bg-white/[0.07] hover:text-white"
              title="Refresh participants"
            >
              <RefreshCw
                className={
                  "h-3.5 w-3.5 " +
                  (loading
                    ? "animate-spin"
                    : "")
                }
              />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="m-3 rounded-lg border border-red-400/20 bg-red-500/10 p-2.5 text-[11px] text-red-300">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading &&
        studentParticipants.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          </div>
        ) : studentParticipants.length ===
          0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <Users className="h-8 w-8 text-white/15" />

            <p className="mt-3 text-xs font-semibold text-white/50">
              No students yet
            </p>

            <p className="mt-1 max-w-[220px] text-[10px] leading-4 text-white/25">
              Students who join the LiveKit
              classroom will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {studentParticipants.map(
              (participant) => {
                const isConnected =
                  liveIdentitySet.has(
                    participant.identity,
                  );

                const microphone =
                  getTrack(
                    participant,
                    "microphone",
                  );

                const camera =
                  getTrack(
                    participant,
                    "camera",
                  );

                const screen =
                  getTrack(
                    participant,
                    "screen",
                  );

                const displayName =
                  participant.name?.trim() ||
                  participant.identity;

                const busy =
                  busyIdentity ===
                  participant.identity;

                return (
                  <div
                    key={
                      participant.identity
                    }
                    className="rounded-xl border border-white/10 bg-white/[0.025] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7a93b]/15 text-[11px] font-black text-[#e5c36b]">
                        {getParticipantInitials(
                          displayName,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-white">
                            {displayName}
                          </p>

                          <span
                            className={
                              "h-1.5 w-1.5 shrink-0 rounded-full " +
                              (isConnected
                                ? "bg-emerald-400"
                                : "bg-white/20")
                            }
                          />
                        </div>

                        <p className="mt-0.5 truncate text-[9px] text-white/30">
                          {participant.identity}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <span
                            title={
                              microphone
                                ? microphone.muted
                                  ? "Microphone muted"
                                  : "Microphone active"
                                : "No microphone"
                            }
                            className={
                              "rounded-md p-1 " +
                              (microphone &&
                              !microphone.muted
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-white/5 text-white/25")
                            }
                          >
                            {microphone &&
                            !microphone.muted ? (
                              <Mic className="h-3 w-3" />
                            ) : (
                              <MicOff className="h-3 w-3" />
                            )}
                          </span>

                          <span
                            title={
                              camera
                                ? "Camera active"
                                : "Camera off"
                            }
                            className={
                              "rounded-md p-1 " +
                              (camera
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-white/5 text-white/25")
                            }
                          >
                            {camera ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <VideoOff className="h-3 w-3" />
                            )}
                          </span>

                          <span
                            title={
                              screen
                                ? "Screen sharing"
                                : "No screen sharing"
                            }
                            className={
                              "rounded-md p-1 " +
                              (screen
                                ? "bg-[#d7a93b]/10 text-[#e5c36b]"
                                : "bg-white/5 text-white/25")
                            }
                          >
                            <MonitorUp className="h-3 w-3" />
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void sendAction(
                              microphone &&
                                !microphone.muted
                                ? "mute"
                                : "unmute",
                              participant.identity,
                            )
                          }
                          className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-white/50 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
                          title={
                            microphone &&
                            !microphone.muted
                              ? "Mute student"
                              : "Unmute student"
                          }
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : microphone &&
                            !microphone.muted ? (
                            <MicOff className="h-3.5 w-3.5" />
                          ) : (
                            <Mic className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void sendAction(
                            "remove",
                            participant.identity,
                          )
                        }
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold text-red-300/70 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                      >
                        <LogOut className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   LECTURER CLASSROOM CONTROLS
========================================================= */

function LecturerControls({
  classId,
  liveClass,
  onUpdated,
}: {
  classId: string;
  liveClass: LiveClass;
  onUpdated: (
    updates: Partial<LiveClass>,
  ) => void;
}) {
  const [saving, setSaving] =
    useState<SettingKey | null>(null);

  const updateSetting = async (
    key: SettingKey,
    value: boolean,
  ): Promise<void> => {
    setSaving(key);

    try {
      const response = await fetch(
        `/api/lecturer/live-classes/${classId}/settings`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            [key]: value,
          }),
        },
      );

      const data =
        (await response.json()) as ClassResponse;

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update classroom settings.",
        );
      }

      onUpdated({
        [key]: value,
      } as Partial<LiveClass>);
    } catch (error) {
      console.error(
        "Failed to update classroom setting:",
        error,
      );
    } finally {
      setSaving(null);
    }
  };

  const settings: Array<{
    key: SettingKey;
    title: string;
    description: string;
    value: boolean;
    icon: React.ReactNode;
  }> = [
    {
      key: "studentMicrophoneEnabled",
      title: "Student microphones",
      description:
        "Allow students to publish microphone audio.",
      value:
        liveClass.studentMicrophoneEnabled,
      icon: <Mic className="h-4 w-4" />,
    },
    {
      key: "studentCameraEnabled",
      title: "Student cameras",
      description:
        "Allow students to publish camera video.",
      value:
        liveClass.studentCameraEnabled,
      icon: <Camera className="h-4 w-4" />,
    },
    {
      key: "studentScreenShareEnabled",
      title: "Student screen sharing",
      description:
        "Allow students to share their screen.",
      value:
        liveClass.studentScreenShareEnabled,
      icon: (
        <MonitorUp className="h-4 w-4" />
      ),
    },
    {
      key: "chatEnabled",
      title: "Classroom chat",
      description:
        "Allow students to use classroom chat.",
      value: liveClass.chatEnabled,
      icon: (
        <MessageCircle className="h-4 w-4" />
      ),
    },
    {
      key: "studentsCanJoinBeforeLecturer",
      title: "Early joining",
      description:
        "Allow students to enter before the lecturer.",
      value:
        liveClass.studentsCanJoinBeforeLecturer,
      icon: <DoorOpen className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2 px-1">
        <Settings2 className="h-4 w-4 text-[#d7a93b]" />

        <div>
          <p className="text-xs font-bold text-white">
            Classroom controls
          </p>

          <p className="text-[9px] text-white/30">
            Control what students can do
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {settings.map((setting) => {
          const isSaving =
            saving === setting.key;

          return (
            <button
              type="button"
              key={setting.key}
              onClick={() =>
                void updateSetting(
                  setting.key,
                  !setting.value,
                )
              }
              disabled={
                saving !== null &&
                !isSaving
              }
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.05] disabled:opacity-60"
            >
              <span
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
                  (setting.value
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-white/5 text-white/30")
                }
              >
                {setting.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-white">
                  {setting.title}
                </span>

                <span className="mt-0.5 block text-[9px] leading-4 text-white/30">
                  {setting.description}
                </span>
              </span>

              <span className="shrink-0">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                ) : (
                  <span
                    className={
                      "relative flex h-5 w-9 items-center rounded-full p-0.5 transition " +
                      (setting.value
                        ? "bg-emerald-500"
                        : "bg-white/10")
                    }
                  >
                    <span
                      className={
                        "h-4 w-4 rounded-full bg-white shadow transition-transform " +
                        (setting.value
                          ? "translate-x-4"
                          : "translate-x-0")
                      }
                    />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() =>
            void updateSetting(
              "isLocked",
              !liveClass.isLocked,
            )
          }
          disabled={saving !== null}
          className={
            "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50 " +
            (liveClass.isLocked
              ? "border-red-400/20 bg-red-500/10"
              : "border-emerald-400/20 bg-emerald-500/10")
          }
        >
          <span
            className={
              "flex h-8 w-8 items-center justify-center rounded-lg " +
              (liveClass.isLocked
                ? "bg-red-500/10 text-red-300"
                : "bg-emerald-500/10 text-emerald-300")
            }
          >
            {liveClass.isLocked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <LockOpen className="h-4 w-4" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold text-white">
              {liveClass.isLocked
                ? "Classroom locked"
                : "Classroom unlocked"}
            </span>

            <span className="mt-0.5 block text-[9px] text-white/35">
              {liveClass.isLocked
                ? "Students cannot newly join."
                : "Students can join normally."}
            </span>
          </span>

          {saving === "isLocked" ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          ) : liveClass.isLocked ? (
            <Lock className="h-4 w-4 text-red-300" />
          ) : (
            <LockOpen className="h-4 w-4 text-emerald-300" />
          )}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   RECORDING CONTROL
========================================================= */

type RecordingControlStatus =
  | "idle"
  | "starting"
  | "recording"
  | "processing"
  | "ready"
  | "failed";

type RecordingResponse = {
  success?: boolean;
  message?: string;
  recording?: {
    status?: RecordingControlStatus;
    playbackUrl?: string | null;
  };
};

function LecturerRecordingControl({
  classId,
}: {
  classId: string;
}) {
  const [status, setStatus] =
    useState<RecordingControlStatus>(
      "idle",
    );

  const [playbackUrl, setPlaybackUrl] =
    useState<string | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const fetchRecordingStatus =
    useCallback(async (): Promise<void> => {
      try {
        const response = await fetch(
          `/api/lecturer/live-classes/${classId}/recording`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as RecordingResponse;

        const nextStatus =
          data.recording?.status ||
          "idle";

        setStatus(nextStatus);

        setPlaybackUrl(
          data.recording?.playbackUrl ||
            null,
        );
      } catch (err) {
        console.error(
          "Recording status error:",
          err,
        );
      }
    }, [classId]);

  useEffect(() => {
    void fetchRecordingStatus();

    const interval =
      window.setInterval(() => {
        void fetchRecordingStatus();
      }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchRecordingStatus]);

  const changeRecording =
    async (
      action: "start" | "stop",
    ): Promise<void> => {
      setBusy(true);
      setError("");

      if (action === "start") {
        setStatus("starting");
      }

      try {
        const response = await fetch(
          `/api/lecturer/live-classes/${classId}/recording`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action,
            }),
          },
        );

        const data =
          (await response.json()) as RecordingResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to update recording.",
          );
        }

        setStatus(
          data.recording?.status ||
            (action === "start"
              ? "recording"
              : "processing"),
        );

        setPlaybackUrl(
          data.recording?.playbackUrl ||
            null,
        );

        await fetchRecordingStatus();
      } catch (err) {
        console.error(
          "Recording action failed:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Recording action failed.",
        );

        setStatus("failed");
      } finally {
        setBusy(false);
      }
    };

  const isRecording =
    status === "recording";

  const isProcessing =
    status === "processing" ||
    status === "starting";

  return (
    <div className="flex items-center gap-2">
      {status === "ready" &&
      playbackUrl ? (
        <a
          href={playbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/20 sm:flex"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Recording ready
        </a>
      ) : null}

      {isRecording ? (
        <button
          type="button"
          onClick={() =>
            void changeRecording("stop")
          }
          disabled={busy}
          className="flex h-9 items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          title="Stop recording"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-3.5 w-3.5 fill-current" />
          )}

          <span className="hidden sm:inline">
            Stop
          </span>

          <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-400" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            void changeRecording("start")
          }
          disabled={
            busy ||
            isProcessing
          }
          className="flex h-9 items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/5 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
          title="Start recording"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radio className="h-4 w-4" />
          )}

          <span className="hidden sm:inline">
            {isProcessing
              ? "Processing"
              : "Record"}
          </span>
        </button>
      )}

      {error ? (
        <span
          title={error}
          className="text-red-300"
        >
          <AlertCircle className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}

/* =========================================================
   SCREEN SHARE STATUS
========================================================= */

function LecturerScreenShareStatus() {
  const room = useRoomContext();

  const [sharing, setSharing] =
    useState(false);

  const sync = useCallback(() => {
    const publication =
      room.localParticipant.getTrackPublication(
        Track.Source.ScreenShare,
      );

    setSharing(
      Boolean(publication?.track),
    );
  }, [room]);

  useEffect(() => {
    const handlePublished =
      (
        publication: LocalTrackPublication,
      ): void => {
        if (
          publication.source !==
          Track.Source.ScreenShare
        ) {
          return;
        }

        setSharing(true);
      };

    const handleUnpublished =
      (
        publication: LocalTrackPublication,
      ): void => {
        if (
          publication.source !==
          Track.Source.ScreenShare
        ) {
          return;
        }

        setSharing(false);
      };

    room.on(
      RoomEvent.LocalTrackPublished,
      handlePublished,
    );

    room.on(
      RoomEvent.LocalTrackUnpublished,
      handleUnpublished,
    );

    sync();

    return () => {
      room.off(
        RoomEvent.LocalTrackPublished,
        handlePublished,
      );

      room.off(
        RoomEvent.LocalTrackUnpublished,
        handleUnpublished,
      );
    };
  }, [room, sync]);

  if (!sharing) {
    return null;
  }

  return (
    <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-[#0c1714]/90 px-3 py-2 text-[10px] font-bold text-emerald-300 shadow-lg backdrop-blur">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

      <MonitorUp className="h-3.5 w-3.5" />

      You are sharing your screen
    </div>
  );
}

/* =========================================================
   MICROPHONE CONTROL
========================================================= */

type MicrophoneState =
  | "on"
  | "muted"
  | "working"
  | "error";

function LecturerMicrophoneControl({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const room = useRoomContext();

  const [state, setState] =
    useState<MicrophoneState>("muted");

  const [changing, setChanging] =
    useState(false);

  const [diagnosticMessage, setDiagnosticMessage] =
    useState("");

  const audioIntervalRef =
    useRef<number | null>(null);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const audioSourceRef =
    useRef<MediaStreamAudioSourceNode | null>(
      null,
    );

  const audioAnalyserRef =
    useRef<AnalyserNode | null>(null);

  const monitoredTrackRef =
    useRef<MediaStreamTrack | null>(null);

  const cleanupAudioMonitor =
    useCallback((): void => {
      if (
        audioIntervalRef.current !==
        null
      ) {
        window.clearInterval(
          audioIntervalRef.current,
        );

        audioIntervalRef.current = null;
      }

      try {
        audioSourceRef.current?.disconnect();
      } catch {
        // Ignore cleanup errors.
      }

      try {
        audioAnalyserRef.current?.disconnect();
      } catch {
        // Ignore cleanup errors.
      }

      audioSourceRef.current = null;
      audioAnalyserRef.current = null;
      monitoredTrackRef.current = null;

      const context =
        audioContextRef.current;

      audioContextRef.current = null;

      if (context) {
        void context.close().catch(
          () => undefined,
        );
      }
    }, []);

  const updateMicrophoneState =
    useCallback((): void => {
      const publication =
        room.localParticipant.getTrackPublication(
          Track.Source.Microphone,
        );

      if (!publication) {
        setState("muted");
        return;
      }

      if (
        publication.isMuted ||
        !publication.track
      ) {
        setState("muted");
        return;
      }

      setState("on");
    }, [room]);

  const startAudioMonitor =
    useCallback((): void => {
      const publication =
        room.localParticipant.getTrackPublication(
          Track.Source.Microphone,
        );

      const mediaTrack =
        publication?.track
          ?.mediaStreamTrack;

      if (
        !publication ||
        publication.isMuted ||
        !mediaTrack ||
        !mediaTrack.enabled
      ) {
        cleanupAudioMonitor();
        updateMicrophoneState();
        return;
      }

      if (
        monitoredTrackRef.current ===
        mediaTrack
      ) {
        return;
      }

      cleanupAudioMonitor();

      const AudioContextConstructor =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextConstructor) {
        setState("on");
        setDiagnosticMessage(
          "Microphone is enabled. Audio-level monitoring is not supported by this browser.",
        );
        return;
      }

      try {
        const context =
          new AudioContextConstructor();

        const analyser =
          context.createAnalyser();

        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant =
          0.8;

        const stream =
          new MediaStream([
            mediaTrack,
          ]);

        const source =
          context.createMediaStreamSource(
            stream,
          );

        source.connect(analyser);

        audioContextRef.current =
          context;

        audioSourceRef.current =
          source;

        audioAnalyserRef.current =
          analyser;

        monitoredTrackRef.current =
          mediaTrack;

        if (
          context.state === "suspended"
        ) {
          void context.resume().catch(
            () => undefined,
          );
        }

        const data =
          new Uint8Array(
            analyser.fftSize,
          );

        audioIntervalRef.current =
          window.setInterval(() => {
            if (
              !audioAnalyserRef.current
            ) {
              return;
            }

            analyser.getByteTimeDomainData(
              data,
            );

            let sum = 0;

            for (
              let index = 0;
              index < data.length;
              index += 1
            ) {
              const normalized =
                (data[index] - 128) /
                128;

              sum +=
                normalized *
                normalized;
            }

            const rms = Math.sqrt(
              sum / data.length,
            );

            if (rms > 0.025) {
              setState("working");
            } else {
              setState("on");
            }
          }, 250);

        setDiagnosticMessage(
          "Microphone is enabled and audio-level monitoring is active.",
        );
      } catch (error) {
        console.error(
          "Microphone audio monitoring failed:",
          error,
        );

        cleanupAudioMonitor();
        setState("on");

        setDiagnosticMessage(
          "Microphone is enabled, but audio-level monitoring could not be started.",
        );
      }
    }, [
      cleanupAudioMonitor,
      room,
      updateMicrophoneState,
    ]);

  useEffect(() => {
    const handlePublished = (
      publication: LocalTrackPublication,
    ): void => {
      if (
        publication.source !==
        Track.Source.Microphone
      ) {
        return;
      }

      updateMicrophoneState();

      window.setTimeout(() => {
        startAudioMonitor();
      }, 100);
    };

    const handleUnpublished = (
      publication: LocalTrackPublication,
    ): void => {
      if (
        publication.source !==
        Track.Source.Microphone
      ) {
        return;
      }

      cleanupAudioMonitor();
      setState("muted");
      setDiagnosticMessage(
        "Microphone is disabled.",
      );
    };

    const handleMuted = (
      publication: TrackPublication,
    ): void => {
      if (
        publication.source !==
        Track.Source.Microphone
      ) {
        return;
      }

      cleanupAudioMonitor();
      setState("muted");
      setDiagnosticMessage(
        "Microphone is muted.",
      );
    };

    const handleUnmuted = (
      publication: TrackPublication,
    ): void => {
      if (
        publication.source !==
        Track.Source.Microphone
      ) {
        return;
      }

      updateMicrophoneState();

      window.setTimeout(() => {
        startAudioMonitor();
      }, 100);
    };

    room.on(
      RoomEvent.LocalTrackPublished,
      handlePublished,
    );

    room.on(
      RoomEvent.LocalTrackUnpublished,
      handleUnpublished,
    );

    room.on(
      RoomEvent.TrackMuted,
      handleMuted,
    );

    room.on(
      RoomEvent.TrackUnmuted,
      handleUnmuted,
    );

    updateMicrophoneState();
    startAudioMonitor();

    const initialCheck =
      window.setInterval(() => {
        const publication =
          room.localParticipant.getTrackPublication(
            Track.Source.Microphone,
          );

        if (
          publication?.track &&
          !publication.isMuted
        ) {
          startAudioMonitor();
        } else {
          updateMicrophoneState();
        }
      }, 1000);

    return () => {
      window.clearInterval(
        initialCheck,
      );

      room.off(
        RoomEvent.LocalTrackPublished,
        handlePublished,
      );

      room.off(
        RoomEvent.LocalTrackUnpublished,
        handleUnpublished,
      );

      room.off(
        RoomEvent.TrackMuted,
        handleMuted,
      );

      room.off(
        RoomEvent.TrackUnmuted,
        handleUnmuted,
      );

      cleanupAudioMonitor();
    };
  }, [
    cleanupAudioMonitor,
    room,
    startAudioMonitor,
    updateMicrophoneState,
  ]);

  const toggleMicrophone =
    async (): Promise<void> => {
      if (changing) {
        return;
      }

      setChanging(true);

      try {
        const publication =
          room.localParticipant.getTrackPublication(
            Track.Source.Microphone,
          );

        const enabled =
          Boolean(
            publication?.track &&
              !publication.isMuted,
          );

        await room.localParticipant.setMicrophoneEnabled(
          !enabled,
        );

        if (enabled) {
          cleanupAudioMonitor();

          setState("muted");

          setDiagnosticMessage(
            "Microphone is muted.",
          );
        } else {
          setState("on");

          setDiagnosticMessage(
            "Microphone is enabled. Checking for actual audio...",
          );

          window.setTimeout(() => {
            startAudioMonitor();
          }, 150);
        }
      } catch (error) {
        console.error(
          "Microphone toggle failed:",
          error,
        );

        cleanupAudioMonitor();

        const message =
          error instanceof Error
            ? error.message
            : "The microphone could not be enabled.";

        setState("error");
        setDiagnosticMessage(
          message,
        );

        onError(
          `Microphone error: ${message}`,
        );
      } finally {
        setChanging(false);
      }
    };

  const enabled =
    state !== "muted" &&
    state !== "error";

  const buttonClass =
    state === "error"
      ? "border-red-400/30 bg-red-500/10 text-red-300"
      : state === "working"
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
        : state === "on"
          ? "border-[#d7a93b]/30 bg-[#d7a93b]/10 text-[#e5c36b]"
          : "border-white/10 bg-white/[0.03] text-white/60";

  const label =
    state === "working"
      ? "Mic working"
      : state === "on"
        ? "Mic ON"
        : state === "error"
          ? "Mic error"
          : "Muted";

  return (
    <button
      type="button"
      onClick={() =>
        void toggleMicrophone()
      }
      disabled={changing}
      title={
        diagnosticMessage ||
        "Toggle lecturer microphone"
      }
      aria-label={label}
      className={
        "flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 " +
        buttonClass
      }
    >
      {changing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === "muted" ? (
        <MicOff className="h-4 w-4" />
      ) : state === "error" ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}

      <span className="hidden lg:inline">
        {label}
      </span>

      {state === "working" ? (
        <span className="flex items-end gap-[2px]">
          <span className="h-2 w-[2px] animate-pulse rounded-full bg-current" />
          <span className="h-3 w-[2px] animate-pulse rounded-full bg-current [animation-delay:100ms]" />
          <span className="h-4 w-[2px] animate-pulse rounded-full bg-current [animation-delay:200ms]" />
          <span className="h-2 w-[2px] animate-pulse rounded-full bg-current [animation-delay:300ms]" />
        </span>
      ) : null}
    </button>
  );
}

/* =========================================================
   LIVEKIT EVENT TRACKER
========================================================= */

function LiveKitEventTracker({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    const logEvent = (
      eventName: string,
      details?: unknown,
    ): void => {
      console.log(
        `[SMTC LIVEKIT] ${eventName}`,
        details ?? "",
      );
    };

    const handleConnected =
      (): void => {
        logEvent("Connected");
      };

    const handleDisconnected =
      (reason?: unknown): void => {
        logEvent(
          "Disconnected",
          reason,
        );
      };

    const handleReconnecting =
      (): void => {
        logEvent("Reconnecting");
      };

    const handleReconnected =
      (): void => {
        logEvent("Reconnected");
      };

    const handleConnectionStateChanged =
      (state: unknown): void => {
        logEvent(
          "ConnectionStateChanged",
          state,
        );
      };

    const handleParticipantConnected =
      (participant: Participant): void => {
        logEvent(
          "ParticipantConnected",
          participant.identity,
        );
      };

    const handleParticipantDisconnected =
      (participant: Participant): void => {
        logEvent(
          "ParticipantDisconnected",
          participant.identity,
        );
      };

    const handleTrackSubscribed =
      (
        track: unknown,
        publication: unknown,
        participant: Participant,
      ): void => {
        logEvent(
          "TrackSubscribed",
          {
            track,
            publication,
            participant:
              participant.identity,
          },
        );
      };

    const handleTrackUnsubscribed =
      (
        track: unknown,
        publication: unknown,
        participant: Participant,
      ): void => {
        logEvent(
          "TrackUnsubscribed",
          {
            track,
            publication,
            participant:
              participant.identity,
          },
        );
      };

    const handleLocalTrackPublished =
      (
        publication: TrackPublication,
        _participant: Participant,
      ): void => {
        logEvent(
          "LocalTrackPublished",
          {
            source:
              publication.source,
            trackSid:
              publication.trackSid,
          },
        );
      };

    const handleLocalTrackUnpublished =
      (
        publication: TrackPublication,
        _participant: Participant,
      ): void => {
        logEvent(
          "LocalTrackUnpublished",
          {
            source:
              publication.source,
            trackSid:
              publication.trackSid,
          },
        );
      };

    const handleLocalTrackMuted =
      (
        publication: TrackPublication,
        _participant: Participant,
      ): void => {
        logEvent(
          "LocalTrackMuted",
          {
            source:
              publication.source,
            trackSid:
              publication.trackSid,
          },
        );
      };

    const handleLocalTrackUnmuted =
      (
        publication: TrackPublication,
        _participant: Participant,
      ): void => {
        logEvent(
          "LocalTrackUnmuted",
          {
            source:
              publication.source,
            trackSid:
              publication.trackSid,
          },
        );
      };

    const handleMediaDevicesError =
      (error: unknown): void => {
        console.error(
          "[SMTC LIVEKIT] Media device error:",
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : "A browser media-device error occurred.";

        onError(
          `Microphone/camera device error: ${message}`,
        );
      };

    room.on(
      RoomEvent.Connected,
      handleConnected,
    );

    room.on(
      RoomEvent.Disconnected,
      handleDisconnected,
    );

    room.on(
      RoomEvent.Reconnecting,
      handleReconnecting,
    );

    room.on(
      RoomEvent.Reconnected,
      handleReconnected,
    );

    room.on(
      RoomEvent.ConnectionStateChanged,
      handleConnectionStateChanged,
    );

    room.on(
      RoomEvent.ParticipantConnected,
      handleParticipantConnected,
    );

    room.on(
      RoomEvent.ParticipantDisconnected,
      handleParticipantDisconnected,
    );

    room.on(
      RoomEvent.TrackSubscribed,
      handleTrackSubscribed,
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      handleTrackUnsubscribed,
    );

    room.on(
      RoomEvent.LocalTrackPublished,
      handleLocalTrackPublished,
    );

    room.on(
      RoomEvent.LocalTrackUnpublished,
      handleLocalTrackUnpublished,
    );

    room.on(
      RoomEvent.TrackMuted,
      handleLocalTrackMuted,
    );

    room.on(
      RoomEvent.TrackUnmuted,
      handleLocalTrackUnmuted,
    );

    /*
     * MediaDevicesError is not present in every
     * livekit-client version. Access it safely so
     * TypeScript does not fail when the installed
     * SDK does not expose the enum member.
     */
    const optionalRoomEvents =
      RoomEvent as unknown as {
        MediaDevicesError?: RoomEvent;
      };

    const mediaDevicesErrorEvent =
      optionalRoomEvents.MediaDevicesError;

    if (mediaDevicesErrorEvent) {
      room.on(
        mediaDevicesErrorEvent,
        handleMediaDevicesError,
      );
    }

    return () => {
      room.off(
        RoomEvent.Connected,
        handleConnected,
      );

      room.off(
        RoomEvent.Disconnected,
        handleDisconnected,
      );

      room.off(
        RoomEvent.Reconnecting,
        handleReconnecting,
      );

      room.off(
        RoomEvent.Reconnected,
        handleReconnected,
      );

      room.off(
        RoomEvent.ConnectionStateChanged,
        handleConnectionStateChanged,
      );

      room.off(
        RoomEvent.ParticipantConnected,
        handleParticipantConnected,
      );

      room.off(
        RoomEvent.ParticipantDisconnected,
        handleParticipantDisconnected,
      );

      room.off(
        RoomEvent.TrackSubscribed,
        handleTrackSubscribed,
      );

      room.off(
        RoomEvent.TrackUnsubscribed,
        handleTrackUnsubscribed,
      );

      room.off(
        RoomEvent.LocalTrackPublished,
        handleLocalTrackPublished,
      );

      room.off(
        RoomEvent.LocalTrackUnpublished,
        handleLocalTrackUnpublished,
      );

      room.off(
        RoomEvent.TrackMuted,
        handleLocalTrackMuted,
      );

      room.off(
        RoomEvent.TrackUnmuted,
        handleLocalTrackUnmuted,
      );

      if (mediaDevicesErrorEvent) {
        room.off(
          mediaDevicesErrorEvent,
          handleMediaDevicesError,
        );
      }
    };
  }, [onError, room]);

  return null;
}

/* =========================================================
   CLASSROOM SIDEBAR
========================================================= */

function ClassroomSidebar({
  classId,
  liveClass,
  onUpdated,
}: {
  classId: string;
  liveClass: LiveClass;
  onUpdated: (
    updates: Partial<LiveClass>,
  ) => void;
}) {
  const [panel, setPanel] =
    useState<RightPanel>(
      "participants",
    );

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-white/10 bg-[#0c1714] lg:w-[360px]">
      <div className="grid grid-cols-2 border-b border-white/10">
        <button
          type="button"
          onClick={() =>
            setPanel("participants")
          }
          className={
            "flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold transition " +
            (panel === "participants"
              ? "border-b-2 border-[#d7a93b] bg-white/[0.025] text-white"
              : "text-white/35 hover:text-white")
          }
        >
          <Users className="h-4 w-4" />

          Participants
        </button>

        <button
          type="button"
          onClick={() =>
            setPanel("chat")
          }
          className={
            "flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold transition " +
            (panel === "chat"
              ? "border-b-2 border-[#d7a93b] bg-white/[0.025] text-white"
              : "text-white/35 hover:text-white")
          }
        >
          <MessageCircle className="h-4 w-4" />

          Chat
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {panel === "participants" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <ParticipantsPanel
                classId={classId}
              />
            </div>

            <div className="max-h-[42%] overflow-y-auto border-t border-white/10">
              <LecturerControls
                classId={classId}
                liveClass={liveClass}
                onUpdated={onUpdated}
              />
            </div>
          </div>
        ) : (
          <div className="h-full min-h-0">
            {liveClass.chatEnabled ? (
              <LiveClassChat
                classId={classId}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="h-8 w-8 text-white/10" />

                <p className="mt-3 text-xs font-semibold text-white/45">
                  Chat disabled
                </p>

                <p className="mt-1 text-[10px] leading-4 text-white/25">
                  Enable classroom chat from
                  the classroom controls.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

/* =========================================================
   CLASSROOM EXPERIENCE
========================================================= */

function ClassroomExperience({
  classId,
  liveClass,
  onUpdated,
  onEndClass,
  onError,
}: {
  classId: string;
  liveClass: LiveClass;
  onUpdated: (
    updates: Partial<LiveClass>,
  ) => void;
  onEndClass: () => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  return (
    <div className="flex h-screen min-h-screen w-full flex-col overflow-hidden bg-[#07100e] text-white">
      {/* HEADER */}
      <header className="z-30 flex h-14 shrink-0 items-center border-b border-white/10 bg-[#0c1714] px-3 shadow-lg sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/lecturer/dashboard/live-classes",
              )
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition hover:bg-white/[0.07] hover:text-white"
            title="Back to live classes"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="hidden h-7 w-px bg-white/10 sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />

              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-red-300">
                Live classroom
              </span>
            </div>

            <h1 className="mt-0.5 truncate text-xs font-bold text-white sm:text-sm">
              {liveClass.title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-2 text-[9px] text-white/40 xl:flex">
            <Wifi className="h-3.5 w-3.5 text-emerald-300" />
            Connected
          </div>

          <LecturerMicrophoneControl
            onError={onError}
          />

          <LecturerRecordingControl
            classId={classId}
          />

          <LecturerScreenShareControl
            onError={onError}
          />

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(
                (current) => !current,
              )
            }
            className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-white/60 transition hover:bg-white/[0.07] hover:text-white lg:hidden"
            title="Toggle classroom sidebar"
          >
            <Users className="h-4 w-4" />

            <span className="hidden sm:inline">
              Panel
            </span>
          </button>

          <button
            type="button"
            onClick={onEndClass}
            className="flex h-9 items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 text-red-300 transition hover:bg-red-500/20"
            title="End class"
          >
            <DoorOpen className="h-4 w-4" />

            <span className="hidden sm:inline">
              End
            </span>
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 bg-black">
          <VideoConference
            className="h-full w-full"
          />

          <LecturerScreenShareStatus />

          <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-[9px] text-white/40 backdrop-blur sm:block">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />

              Live classroom is secured
            </div>
          </div>
        </main>

        <div
          className={
            "fixed inset-y-14 right-0 z-40 w-[min(360px,92vw)] transform transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 " +
            (sidebarOpen
              ? "translate-x-0"
              : "translate-x-full lg:hidden")
          }
        >
          <ClassroomSidebar
            classId={classId}
            liveClass={liveClass}
            onUpdated={onUpdated}
          />
        </div>

        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close classroom panel"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="fixed inset-0 top-14 z-30 bg-black/50 lg:hidden"
          />
        ) : null}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function LecturerLiveClassroomPage() {
  const params =
    useParams<Record<
      string,
      string | string[]
    >>();

  const router = useRouter();

  const classId = getClassId(params);

  const [liveClass, setLiveClass] =
    useState<LiveClass | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [serverUrl, setServerUrl] =
    useState<string | null>(null);

  const [roomName, setRoomName] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [connecting, setConnecting] =
    useState(false);

  const [starting, setStarting] =
    useState(false);

  const [ending, setEnding] =
    useState(false);

  const [error, setError] =
    useState("");

  const [connectionError, setConnectionError] =
    useState("");

  const fetchClass =
    useCallback(async (): Promise<LiveClass> => {
      if (!classId) {
        throw new Error(
          "Live class ID is missing.",
        );
      }

      const response = await fetch(
        `/api/lecturer/live-classes/${classId}`,
        {
          cache: "no-store",
        },
      );

      const data =
        (await response.json()) as ClassResponse;

      if (!response.ok || !data.class) {
        throw new Error(
          data.message ||
            "Unable to load this live class.",
        );
      }

      return data.class;
    }, [classId]);

  const startClass =
    useCallback(async (): Promise<void> => {
      if (!classId) {
        throw new Error(
          "Live class ID is missing.",
        );
      }

      setStarting(true);
      setError("");

      try {
        const response = await fetch(
          `/api/lecturer/live-classes/${classId}/start`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );

        const data =
          (await response.json()) as ClassResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to start the live class.",
          );
        }

        if (data.class) {
          setLiveClass(data.class);
        }
      } finally {
        setStarting(false);
      }
    }, [classId]);

  const fetchToken =
    useCallback(async (): Promise<void> => {
      if (!classId) {
        throw new Error(
          "Live class ID is missing.",
        );
      }

      const response = await fetch(
        `/api/lecturer/live-classes/${classId}/token`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
        },
      );

      const data =
        (await response.json()) as TokenResponse;

      if (!response.ok || !data.token) {
        throw new Error(
          data.message ||
            "Unable to obtain the LiveKit access token.",
        );
      }

      setToken(data.token);
      setServerUrl(
        data.serverUrl || null,
      );
      setRoomName(
        data.roomName || null,
      );
    }, [classId]);

  const initialize =
    useCallback(async (): Promise<void> => {
      setLoading(true);
      setError("");

      try {
        let currentClass =
          await fetchClass();

        if (
          currentClass.status ===
          "cancelled"
        ) {
          throw new Error(
            "This live class has been cancelled.",
          );
        }

        if (
          currentClass.status ===
          "ended"
        ) {
          throw new Error(
            "This live class has already ended.",
          );
        }

        if (
          currentClass.status !==
          "live"
        ) {
          await startClass();

          currentClass =
            await fetchClass();
        }

        setLiveClass(currentClass);

        await fetchToken();
      } catch (err) {
        console.error(
          "Failed to initialize live classroom:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to initialize the live classroom.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      fetchClass,
      fetchToken,
      startClass,
    ]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const updateClass =
    useCallback(
      (
        updates: Partial<LiveClass>,
      ): void => {
        setLiveClass(
          (current) =>
            current
              ? {
                  ...current,
                  ...updates,
                }
              : current,
        );
      },
      [],
    );

  const endClass =
    useCallback(async (): Promise<void> => {
      if (ending || !classId) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to end this live class? Students will be disconnected.",
        );

      if (!confirmed) {
        return;
      }

      setEnding(true);
      setError("");

      try {
        /*
         * Stop any active recording first.
         * The endpoint may safely ignore this if
         * no recording is currently running.
         */
        try {
          await fetch(
            `/api/lecturer/live-classes/${classId}/recording`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                action: "stop",
              }),
            },
          );
        } catch (recordingError) {
          console.warn(
            "Recording stop request failed while ending class:",
            recordingError,
          );
        }

        const response = await fetch(
          `/api/lecturer/live-classes/${classId}/end`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );

        const data =
          (await response.json()) as ClassResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to end the live class.",
          );
        }

        setToken(null);

        router.replace(
          "/lecturer/dashboard/live-classes",
        );
      } catch (err) {
        console.error(
          "Failed to end class:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to end the live class.",
        );

        setEnding(false);
      }
    }, [
      classId,
      ending,
      router,
    ]);

  const handleRoomError =
    useCallback(
      (roomError: Error): void => {
        console.error(
          "LiveKit room error:",
          roomError,
        );

        setConnectionError(
          roomError.message ||
            "LiveKit encountered a connection error.",
        );
      },
      [],
    );

  const handleRoomDisconnected =
    useCallback((): void => {
      setConnecting(false);
    }, []);

  const handleRoomConnected =
    useCallback((): void => {
      setConnecting(false);
      setConnectionError("");
    }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07100e] text-white">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d7a93b]/20 bg-[#d7a93b]/10">
            <Loader2 className="h-6 w-6 animate-spin text-[#d7a93b]" />
          </div>

          <p className="mt-5 text-sm font-bold">
            Preparing classroom
          </p>

          <p className="mt-1 max-w-xs text-xs text-white/35">
            Connecting your lecturer session
            and preparing the LiveKit room.
          </p>
        </div>
      </div>
    );
  }

  if (error || !liveClass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07100e] px-5 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-400/20 bg-[#0c1714] p-6 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
            <AlertCircle className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-lg font-bold">
            Unable to open classroom
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/45">
            {error ||
              "The live classroom could not be loaded."}
          </p>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() =>
                void initialize()
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#d7a93b] px-4 py-3 text-xs font-black text-[#101510] transition hover:brightness-105"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>

            <Link
              href="/lecturer/dashboard/live-classes"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (
    !token ||
    !serverUrl
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07100e] px-5 text-white">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d7a93b]/20 bg-[#d7a93b]/10">
            <Loader2 className="h-6 w-6 animate-spin text-[#d7a93b]" />
          </div>

          <p className="mt-5 text-sm font-bold">
            Connecting to classroom
          </p>

          <p className="mt-1 text-xs text-white/35">
            Obtaining your secure LiveKit
            connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      onConnected={
        handleRoomConnected
      }
      onDisconnected={
        handleRoomDisconnected
      }
      onError={handleRoomError}
      className="h-screen w-full"
    >
      <LiveKitEventTracker
        onError={(message) => {
          setConnectionError(message);
        }}
      />

      <RoomAudioRenderer />

      {connectionError ? (
        <div className="pointer-events-none fixed left-1/2 top-20 z-[100] w-[min(500px,calc(100vw-32px))] -translate-x-1/2">
          <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-red-400/20 bg-[#170d0d]/95 p-3 shadow-2xl backdrop-blur">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-red-200">
                Classroom device/connection
                warning
              </p>

              <p className="mt-1 break-words text-[10px] leading-4 text-red-200/60">
                {connectionError}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setConnectionError("")
              }
              className="rounded-md p-1 text-red-200/40 hover:bg-white/5 hover:text-red-200"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {connecting ? (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0c1714]/95 px-4 py-2 text-[10px] font-semibold text-white/60 shadow-xl backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />

            Connecting...
          </div>
        </div>
      ) : null}

      <ClassroomExperience
        classId={classId}
        liveClass={liveClass}
        onUpdated={updateClass}
        onEndClass={() =>
          void endClass()
        }
        onError={(message) => {
          setConnectionError(message);
        }}
      />

      {starting || ending ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-[#0c1714] p-6 text-center shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d7a93b]/10">
              <Loader2 className="h-5 w-5 animate-spin text-[#d7a93b]" />
            </div>

            <p className="mt-4 text-sm font-bold text-white">
              {ending
                ? "Ending classroom"
                : "Starting classroom"}
            </p>

            <p className="mt-1 text-[11px] leading-5 text-white/35">
              {ending
                ? "Disconnecting the classroom and saving the session."
                : "Preparing your LiveKit classroom."}
            </p>
          </div>
        </div>
      ) : null}
    </LiveKitRoom>
  );
}