"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

import StudentLiveClassroom from "@/components/student/StudentLiveClassroom";

type LiveClassInfo = {
  id: number;

  programId: number;
  unitId: number;
  lecturerId: number;

  programName: string;
  unitName: string;
  unitCode: string | null;

  title: string;
  description: string | null;

  roomCode: string;

  status: string;

  scheduledStart: string | null;
  scheduledEnd: string | null;

  actualStart: string | null;
  actualEnd: string | null;

  recordingEnabled: boolean;
  chatEnabled: boolean;

  studentMicrophoneEnabled: boolean;
  studentCameraEnabled: boolean;
  studentScreenShareEnabled: boolean;

  studentsCanJoinBeforeLecturer: boolean;

  isLocked: boolean;
  canJoin: boolean;
};

type TokenResponse = {
  success: boolean;
  message?: string;

  token?: string;
  serverUrl?: string;
  roomName?: string;

  liveClass?: LiveClassInfo;

  permissions?: {
    microphone: boolean;
    camera: boolean;
    screenShare: boolean;
    chat: boolean;
  };
};

/* =========================================================
   CONNECTING SCREEN
========================================================= */

function ConnectingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/20 text-3xl">
          🎥
        </div>

        <h1 className="text-xl font-bold text-white">
          Connecting to class
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Please wait while we securely connect you to the Live Class.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   ERROR SCREEN
========================================================= */

function ErrorScreen({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-3xl">
          ⚠️
        </div>

        <h1 className="text-xl font-bold text-white">
          Unable to join class
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {message}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-700"
          >
            Back to Live Classes
          </button>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   ACCESS DENIED SCREEN
========================================================= */

function AccessDeniedScreen({
  liveClass,
  onBack,
}: {
  liveClass: LiveClassInfo;
  onBack: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10 text-3xl">
          🔒
        </div>

        <h1 className="text-xl font-bold text-white">
          Class is not available
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          This class cannot currently be joined.
        </p>

        {liveClass.isLocked && (
          <p className="mt-2 text-sm font-semibold text-yellow-400">
            The lecturer has locked this class.
          </p>
        )}

        {liveClass.status === "scheduled" &&
          !liveClass.studentsCanJoinBeforeLecturer && (
            <p className="mt-2 text-sm text-slate-500">
              You can join when the lecturer starts the class.
            </p>
          )}

        {liveClass.status === "ended" && (
          <p className="mt-2 text-sm text-slate-500">
            This Live Class has already ended.
          </p>
        )}

        {liveClass.status === "cancelled" && (
          <p className="mt-2 text-sm text-slate-500">
            This Live Class has been cancelled.
          </p>
        )}

        <button
          type="button"
          onClick={onBack}
          className="mt-7 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Back to Live Classes
        </button>
      </div>
    </main>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function StudentLiveClassPage() {
  const params = useParams();
  const router = useRouter();

  const classId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const [error, setError] = useState("");

  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");

  const [liveClass, setLiveClass] =
    useState<LiveClassInfo | null>(null);

  /* =======================================================
     LOAD LIVE CLASS + TOKEN
  ======================================================= */

  const loadClass = useCallback(
    async (isRetry = false) => {
      if (!classId) {
        setError("Invalid Live Class ID.");
        setLoading(false);
        return;
      }

      try {
        if (isRetry) {
          setRetrying(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `/api/student/live-classes/${encodeURIComponent(
            classId
          )}/token`,
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        let data: TokenResponse;

        try {
          data = await response.json();
        } catch (jsonError) {
          console.error(
            "SMTC STUDENT LIVE CLASS INVALID JSON RESPONSE:",
            jsonError
          );

          throw new Error(
            "The server returned an invalid response."
          );
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to join the Live Class."
          );
        }

        if (!data.token) {
          throw new Error(
            "The server did not return a LiveKit access token."
          );
        }

        if (!data.serverUrl) {
          throw new Error(
            "The server did not return the LiveKit server URL."
          );
        }

        if (!data.liveClass) {
          throw new Error(
            "The server did not return Live Class information."
          );
        }

        if (!data.roomName) {
          throw new Error(
            "The server did not return a LiveKit room name."
          );
        }

        /* =================================================
           VERIFY ROOM
        ================================================= */

        if (
          data.roomName !==
          data.liveClass.roomCode
        ) {
          console.error(
            "SMTC STUDENT LIVEKIT ROOM MISMATCH:",
            {
              returnedRoom: data.roomName,
              databaseRoom:
                data.liveClass.roomCode,
            }
          );

          throw new Error(
            "The Live Class room configuration is invalid."
          );
        }

        setToken(data.token);
        setServerUrl(data.serverUrl);
        setLiveClass(data.liveClass);
      } catch (err) {
        console.error(
          "SMTC STUDENT LIVE CLASS JOIN ERROR:",
          err
        );

        setToken("");
        setServerUrl("");
        setLiveClass(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to join the Live Class."
        );
      } finally {
        setLoading(false);
        setRetrying(false);
      }
    },
    [classId]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadClass();
  }, [loadClass]);

  /* =======================================================
     LEAVE CLASS
  ======================================================= */

  const handleLeave = useCallback(() => {
    router.push("/student/dashboard/live-classes");
  }, [router]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading || retrying) {
    return <ConnectingScreen />;
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <ErrorScreen
        message={error}
        onBack={handleLeave}
        onRetry={() => void loadClass(true)}
      />
    );
  }

  /* =======================================================
     INVALID INITIALIZATION
  ======================================================= */

  if (
    !liveClass ||
    !token ||
    !serverUrl
  ) {
    return (
      <ErrorScreen
        message="The Live Class could not be initialized."
        onBack={handleLeave}
        onRetry={() => void loadClass(true)}
      />
    );
  }

  /* =======================================================
     ACCESS CHECK
  ======================================================= */

  if (!liveClass.canJoin) {
    return (
      <AccessDeniedScreen
        liveClass={liveClass}
        onBack={handleLeave}
      />
    );
  }

  /* =======================================================
     STUDENT LIVE CLASSROOM

     StudentLiveClassroom already contains the
     LiveKitRoom component.

     DO NOT wrap it inside another LiveKitRoom here.
  ======================================================= */

  return (
    <StudentLiveClassroom
      token={token}
      serverUrl={serverUrl}
      liveClass={liveClass}
      onLeave={handleLeave}
    />
  );
}