"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useParticipants,
  useConnectionState,
  useRoomContext,
} from "@livekit/components-react";
import {
  ConnectionState,
  RoomEvent,
} from "livekit-client";
import { useCallback, useEffect, useState } from "react";

import "@livekit/components-styles";

type StudentLiveClass = {
  id: number;
  programName: string;
  unitName: string;
  unitCode: string | null;
  title: string;
  recordingEnabled: boolean;
  chatEnabled: boolean;
  studentMicrophoneEnabled: boolean;
  studentCameraEnabled: boolean;
  studentScreenShareEnabled: boolean;
};

type StudentLiveClassroomProps = {
  token: string;
  serverUrl: string;
  liveClass: StudentLiveClass;
  onLeave: () => void;
};

function ClassroomStatus() {
  const connectionState = useConnectionState();

  if (connectionState === ConnectionState.Connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Connected
      </span>
    );
  }

  if (connectionState === ConnectionState.Reconnecting) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
        Reconnecting
      </span>
    );
  }

  if (connectionState === ConnectionState.Connecting) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        Connecting
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400">
      <span className="h-2 w-2 rounded-full bg-slate-500" />
      Disconnected
    </span>
  );
}

function ClassroomToolbar({
  liveClass,
  onLeave,
}: {
  liveClass: StudentLiveClass;
  onLeave: () => void;
}) {
  const participants = useParticipants();

  const participantCount = participants.length;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-slate-800 bg-slate-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300">
          👥 {participantCount}{" "}
          {participantCount === 1 ? "participant" : "participants"}
        </span>

        {liveClass.chatEnabled && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300">
            💬 Chat enabled
          </span>
        )}

        {liveClass.recordingEnabled && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Recording
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
      >
        <span>↪</span>
        Leave Class
      </button>
    </div>
  );
}

function ClassroomHeader({
  liveClass,
}: {
  liveClass: StudentLiveClass;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-4 py-3 text-white">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg">
          🎥
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold sm:text-base">
            {liveClass.title}
          </h1>

          <p className="truncate text-xs text-slate-400">
            {liveClass.programName}
            {" • "}
            {liveClass.unitName}
            {liveClass.unitCode
              ? ` • ${liveClass.unitCode}`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 sm:inline-flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          LIVE
        </span>

        <ClassroomStatus />
      </div>
    </header>
  );
}

function ClassroomEvents({
  onConnectionError,
}: {
  onConnectionError: (message: string) => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    const handleRoomMetadataChanged = () => {
      console.log(
        "SMTC STUDENT LIVEKIT ROOM METADATA CHANGED"
      );
    };

    const handleRoomDisconnected = () => {
      console.log(
        "SMTC STUDENT LIVEKIT ROOM DISCONNECTED"
      );
    };

    room.on(
      RoomEvent.RoomMetadataChanged,
      handleRoomMetadataChanged
    );

    room.on(
      RoomEvent.Disconnected,
      handleRoomDisconnected
    );

    return () => {
      room.off(
        RoomEvent.RoomMetadataChanged,
        handleRoomMetadataChanged
      );

      room.off(
        RoomEvent.Disconnected,
        handleRoomDisconnected
      );
    };
  }, [room, onConnectionError]);

  return null;
}

function ConnectedClassroom({
  liveClass,
  onLeave,
}: {
  liveClass: StudentLiveClass;
  onLeave: () => void;
}) {
  const [connectionError, setConnectionError] = useState("");

  const handleConnectionError = useCallback((message: string) => {
    setConnectionError(message);
  }, []);

  if (connectionError) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-slate-900 p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-3xl">
            ⚠️
          </div>

          <h2 className="text-xl font-bold text-white">
            Classroom error
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {connectionError}
          </p>

          <button
            type="button"
            onClick={onLeave}
            className="mt-7 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Return to Live Classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-950">
      <ClassroomHeader liveClass={liveClass} />

      <ClassroomEvents
        onConnectionError={handleConnectionError}
      />

      <div className="min-h-0 flex-1">
        <VideoConference />
      </div>

      <ClassroomToolbar
        liveClass={liveClass}
        onLeave={onLeave}
      />
    </div>
  );
}

export default function StudentLiveClassroom({
  token,
  serverUrl,
  liveClass,
  onLeave,
}: StudentLiveClassroomProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="min-h-0 flex-1">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={liveClass.studentMicrophoneEnabled}
          video={liveClass.studentCameraEnabled}
          options={{
            adaptiveStream: true,
            dynacast: true,
          }}
          onDisconnected={(reason) => {
            console.log(
              "SMTC STUDENT LIVE CLASS DISCONNECTED:",
              reason
            );
          }}
          onError={(error) => {
            console.error(
              "SMTC STUDENT LIVEKIT ERROR:",
              error
            );
          }}
          data-lk-theme="default"
          style={{
            height: "100vh",
          }}
        >
          <ConnectedClassroom
            liveClass={liveClass}
            onLeave={onLeave}
          />

          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}