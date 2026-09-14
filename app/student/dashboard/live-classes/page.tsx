"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";

type LiveClass = {
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

  lecturerName: string | null;

  canJoin: boolean;
};

type ApiResponse = {
  success: boolean;
  classes?: LiveClass[];
  message?: string;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(liveClass: LiveClass): string {
  if (liveClass.status === "live") {
    return "LIVE NOW";
  }

  if (liveClass.status === "scheduled") {
    return "SCHEDULED";
  }

  if (liveClass.status === "ended") {
    return "ENDED";
  }

  if (liveClass.status === "cancelled") {
    return "CANCELLED";
  }

  return liveClass.status.toUpperCase();
}

function getStatusClasses(liveClass: LiveClass): string {
  if (liveClass.status === "live") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (liveClass.status === "scheduled") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (liveClass.status === "ended") {
    return "bg-gray-100 text-gray-600 border-gray-200";
  }

  if (liveClass.status === "cancelled") {
    return "bg-gray-100 text-gray-500 border-gray-200";
  }

  return "bg-yellow-100 text-yellow-700 border-yellow-200";
}

function canDisplayJoinButton(liveClass: LiveClass): boolean {
  return (
    liveClass.canJoin &&
    liveClass.status !== "ended" &&
    liveClass.status !== "cancelled"
  );
}

export default function StudentLiveClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadClasses = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/student/live-classes", {
        method: "GET",
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load live classes."
        );
      }

      setClasses(data.classes || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("STUDENT LIVE CLASSES PAGE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load live classes."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();

    const interval = window.setInterval(() => {
      void loadClasses(true);
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadClasses]);

  const liveClasses = classes.filter(
    (liveClass) => liveClass.status === "live"
  );

  const scheduledClasses = classes.filter(
    (liveClass) => liveClass.status === "scheduled"
  );

  const otherClasses = classes.filter(
    (liveClass) =>
      liveClass.status !== "live" &&
      liveClass.status !== "scheduled"
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                  🎥
                </span>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Live Classes
                </h1>
              </div>

              <p className="text-sm text-slate-600">
                Join your scheduled online classes and learn live with
                your lecturer.
              </p>

              {lastUpdated && (
                <p className="mt-2 text-xs text-slate-400">
                  Last updated{" "}
                  {lastUpdated.toLocaleTimeString("en-KE", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadClasses(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <Link
                href="/student/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="mb-4 h-6 w-24 rounded bg-slate-200" />
                <div className="mb-3 h-6 w-3/4 rounded bg-slate-200" />
                <div className="mb-6 h-4 w-full rounded bg-slate-200" />
                <div className="h-11 w-full rounded-xl bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex gap-4">
              <div className="text-2xl">⚠️</div>

              <div>
                <h2 className="font-bold text-red-800">
                  Unable to load live classes
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => void loadClasses()}
                  className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Live now */}
            {liveClasses.length > 0 && (
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
                      </span>

                      <h2 className="text-lg font-bold text-slate-900">
                        Live Now
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Classes currently in progress.
                    </p>
                  </div>

                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    {liveClasses.length}{" "}
                    {liveClasses.length === 1 ? "class" : "classes"}
                  </span>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {liveClasses.map((liveClass) => (
                    <LiveClassCard
                      key={liveClass.id}
                      liveClass={liveClass}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Scheduled */}
            {scheduledClasses.length > 0 && (
              <section className="mb-8">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Upcoming Classes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your upcoming live lessons.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {scheduledClasses.map((liveClass) => (
                    <LiveClassCard
                      key={liveClass.id}
                      liveClass={liveClass}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other */}
            {otherClasses.length > 0 && (
              <section className="mb-8">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Other Classes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Previous or unavailable classes.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {otherClasses.map((liveClass) => (
                    <LiveClassCard
                      key={liveClass.id}
                      liveClass={liveClass}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty */}
            {classes.length === 0 && (
              <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                  🎥
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  No live classes yet
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  You currently have no live classes assigned to your
                  enrolled programs. When a lecturer schedules a class,
                  it will appear here automatically.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function LiveClassCard({
  liveClass,
}: {
  liveClass: LiveClass;
}) {
  const isLive = liveClass.status === "live";
  const isScheduled = liveClass.status === "scheduled";
  const joinable = canDisplayJoinButton(liveClass);

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition ${
        isLive
          ? "ring-red-200 shadow-red-100"
          : "ring-slate-200 hover:shadow-md"
      }`}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-1 bg-red-600" />
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Status */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(
              liveClass
            )}`}
          >
            {isLive && (
              <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}

            {getStatusLabel(liveClass)}
          </span>

          {liveClass.unitCode && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {liveClass.unitCode}
            </span>
          )}
        </div>

        {/* Course */}
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {liveClass.programName}
        </p>

        <h3 className="text-lg font-bold leading-snug text-slate-900">
          {liveClass.title}
        </h3>

        <p className="mt-1 text-sm font-medium text-slate-600">
          {liveClass.unitName}
        </p>

        {liveClass.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-500">
            {liveClass.description}
          </p>
        )}

        {/* Lecturer */}
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
            {liveClass.lecturerName
              ? liveClass.lecturerName
                  .trim()
                  .charAt(0)
                  .toUpperCase()
              : "L"}
          </div>

          <div className="min-w-0">
            <p className="text-xs text-slate-400">
              Lecturer
            </p>

            <p className="truncate text-sm font-semibold text-slate-700">
              {liveClass.lecturerName || "Lecturer"}
            </p>
          </div>
        </div>

        {/* Time */}
        <div className="mt-4 rounded-xl border border-slate-100 p-3">
          <div className="flex items-start gap-3">
            <span className="text-lg">🕐</span>

            <div>
              <p className="text-xs font-medium text-slate-400">
                {isLive ? "Started" : "Scheduled"}
              </p>

              <p className="mt-0.5 text-sm font-semibold text-slate-700">
                {formatDateTime(
                  isLive
                    ? liveClass.actualStart
                    : liveClass.scheduledStart
                )}
              </p>

              {(liveClass.scheduledStart ||
                liveClass.scheduledEnd) && (
                <p className="mt-1 text-xs text-slate-500">
                  {formatTime(liveClass.scheduledStart)}
                  {liveClass.scheduledStart &&
                    liveClass.scheduledEnd &&
                    " – "}
                  {formatTime(liveClass.scheduledEnd)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Permissions/features */}
        <div className="mt-4 flex flex-wrap gap-2">
          {liveClass.chatEnabled && (
            <FeatureBadge icon="💬" label="Chat" />
          )}

          {liveClass.recordingEnabled && (
            <FeatureBadge icon="⏺️" label="Recording" />
          )}

          {liveClass.studentMicrophoneEnabled && (
            <FeatureBadge icon="🎤" label="Mic" />
          )}

          {liveClass.studentCameraEnabled && (
            <FeatureBadge icon="📹" label="Camera" />
          )}

          {liveClass.studentScreenShareEnabled && (
            <FeatureBadge icon="🖥️" label="Screen" />
          )}
        </div>

        {/* Action */}
        <div className="mt-auto pt-5">
          {joinable ? (
            <Link
             href={`/student/dashboard/live-classes/${liveClass.id}`}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition ${
                isLive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {isLive ? (
                <>
                  <span>▶</span>
                  Join Live Class
                </>
              ) : (
                <>
                  <span>🎥</span>
                  Join Early
                </>
              )}
            </Link>
          ) : liveClass.isLocked ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
              🔒 Class Locked
            </div>
          ) : liveClass.status === "ended" ? (
            <div className="flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
              Class Ended
            </div>
          ) : liveClass.status === "cancelled" ? (
            <div className="flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
              Class Cancelled
            </div>
          ) : isScheduled ? (
            <div className="flex w-full items-center justify-center rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              Starts{" "}
              {formatTime(liveClass.scheduledStart)}
            </div>
          ) : (
            <div className="flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
              Not Available
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function FeatureBadge({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
      <span>{icon}</span>
      {label}
    </span>
  );
}