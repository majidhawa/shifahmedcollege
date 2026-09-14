'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Video,
  CalendarDays,
  Clock3,
  Users,
  Play,
  Square,
  Settings2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Radio,
  Copy,
  ExternalLink,
  BookOpen,
  Layers3,
  Lock,
  MessageSquare,
  Mic,
  Camera,
  MonitorUp,
  CircleDot,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Program = {
  id: number;
  name: string;
  code?: string | null;
};

type Unit = {
  id: number;
  programId: number;
  name: string;
  code?: string | null;
};

type LiveClassStatus =
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'cancelled';

type RecordingStatus =
  | 'pending'
  | 'recording'
  | 'processing'
  | 'ready'
  | 'failed';

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

  participantCount?: number;
  recordingCount?: number;

  classroomUrl?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  class?: LiveClass;
  programs?: Program[];
  units?: Unit[];
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return 'Not scheduled';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTime(
  value: string | null | undefined
) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatDateTime(
  value: string | null | undefined
) {
  if (!value) {
    return '--';
  }

  return (
    formatDate(value) +
    ' at ' +
    formatTime(value)
  );
}

function getDuration(
  start: string | null | undefined,
  end: string | null | undefined
) {
  if (!start || !end) {
    return '--';
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return '--';
  }

  const minutes = Math.max(
    0,
    Math.round(
      (endDate.getTime() -
        startDate.getTime()) /
        60000
    )
  );

  if (minutes < 60) {
    return minutes + ' minutes';
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (remaining === 0) {
    return hours + ' hour' + (hours === 1 ? '' : 's');
  }

  return (
    hours +
    ' hour' +
    (hours === 1 ? '' : 's') +
    ' ' +
    remaining +
    ' minutes'
  );
}

function statusLabel(
  status: LiveClassStatus
) {
  if (status === 'live') {
    return 'Live Now';
  }

  if (status === 'ended') {
    return 'Ended';
  }

  if (status === 'cancelled') {
    return 'Cancelled';
  }

  return 'Scheduled';
}

function statusClasses(
  status: LiveClassStatus
) {
  if (status === 'live') {
    return 'bg-red-50 text-red-700 ring-red-200';
  }

  if (status === 'ended') {
    return 'bg-slate-100 text-slate-600 ring-slate-200';
  }

  if (status === 'cancelled') {
    return 'bg-red-50 text-red-600 ring-red-200';
  }

  return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
}

function recordingStatusLabel(
  status: RecordingStatus
) {
  if (status === 'recording') {
    return 'Recording';
  }

  if (status === 'processing') {
    return 'Processing';
  }

  if (status === 'ready') {
    return 'Ready';
  }

  if (status === 'failed') {
    return 'Failed';
  }

  return 'Pending';
}

function recordingStatusClasses(
  status: RecordingStatus
) {
  if (status === 'recording') {
    return 'bg-red-50 text-red-700 ring-red-200';
  }

  if (status === 'processing') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  if (status === 'ready') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (status === 'failed') {
    return 'bg-red-50 text-red-700 ring-red-200';
  }

  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function classroomPath(
  liveClass: LiveClass
) {
  return (
    liveClass.classroomUrl ||
    '/lecturer/dashboard/live-classes/' +
      liveClass.id
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function LiveClassManagementPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const classId = Number(params.id);

  const [liveClass, setLiveClass] =
    useState<LiveClass | null>(null);

  const [programs, setPrograms] = useState<
    Program[]
  >([]);

  const [units, setUnits] = useState<
    Unit[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<
      'start' | 'end' | 'cancel' | null
    >(null);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [copied, setCopied] =
    useState(false);

  const [showSettings, setShowSettings] =
    useState(false);

  /* =========================================================
     VALIDATE ID
  ========================================================= */

  const validId =
    Number.isInteger(classId) &&
    classId > 0;

  /* =========================================================
     LOAD CLASS
  ========================================================= */

  const loadClass = async (
    showLoader = true
  ) => {
    if (!validId) {
      setError(
        'Invalid live class ID.'
      );
      setLoading(false);
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      const response = await fetch(
        '/api/lecturer/live-classes/' +
          classId,
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to load this live class.'
        );
      }

      setLiveClass(
        data.class || null
      );

      if (Array.isArray(data.programs)) {
        setPrograms(data.programs);
      }

      if (Array.isArray(data.units)) {
        setUnits(data.units);
      }
    } catch (err) {
      console.error(
        'LIVE CLASS DETAILS ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load this live class.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadClass(true);
  }, [classId]);

  /* =========================================================
     PROGRAM / UNIT
  ========================================================= */

  const program = useMemo(() => {
    if (!liveClass) {
      return null;
    }

    return (
      programs.find(
        (item) =>
          item.id ===
          liveClass.programId
      ) || null
    );
  }, [programs, liveClass]);

  const unit = useMemo(() => {
    if (!liveClass) {
      return null;
    }

    return (
      units.find(
        (item) =>
          item.id === liveClass.unitId
      ) || null
    );
  }, [units, liveClass]);

  /* =========================================================
     COPY CLASS LINK
  ========================================================= */

  const copyClassLink = async () => {
    if (!liveClass) {
      return;
    }

    const path =
      classroomPath(liveClass);

    const fullUrl =
      window.location.origin +
      path;

    try {
      await navigator.clipboard.writeText(
        fullUrl
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (err) {
      console.error(
        'COPY LINK ERROR:',
        err
      );

      alert(
        'Unable to copy the classroom link.'
      );
    }
  };

  /* =========================================================
     START CLASS
  ========================================================= */

  const startClass = async () => {
    if (!liveClass) {
      return;
    }

    const confirmed = window.confirm(
      'Start "' +
        liveClass.title +
        '" now?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading('start');
      setError('');
      setSuccess('');

      const response = await fetch(
        '/api/lecturer/live-classes/' +
          liveClass.id +
          '/start',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to start the class.'
        );
      }

      if (data.class) {
        setLiveClass(data.class);
      } else {
        await loadClass(false);
      }

      setSuccess(
        'The live class has started successfully.'
      );
    } catch (err) {
      console.error(
        'START CLASS ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to start the class.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =========================================================
     END CLASS
  ========================================================= */

  const endClass = async () => {
    if (!liveClass) {
      return;
    }

    const confirmed = window.confirm(
      'End "' +
        liveClass.title +
        '" for all participants?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading('end');
      setError('');
      setSuccess('');

      const response = await fetch(
        '/api/lecturer/live-classes/' +
          liveClass.id +
          '/end',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to end the class.'
        );
      }

      if (data.class) {
        setLiveClass(data.class);
      } else {
        await loadClass(false);
      }

      setSuccess(
        'The live class has ended.'
      );
    } catch (err) {
      console.error(
        'END CLASS ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to end the class.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =========================================================
     CANCEL CLASS
  ========================================================= */

  const cancelClass = async () => {
    if (!liveClass) {
      return;
    }

    const confirmed = window.confirm(
      'Cancel "' +
        liveClass.title +
        '"? Students will no longer be able to join this scheduled class.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading('cancel');
      setError('');
      setSuccess('');

      const response = await fetch(
        '/api/lecturer/live-classes/' +
          liveClass.id,
        {
          method: 'DELETE',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to cancel the class.'
        );
      }

      if (data.class) {
        setLiveClass(data.class);
      } else {
        await loadClass(false);
      }

      setSuccess(
        'The live class has been cancelled.'
      );
    } catch (err) {
      console.error(
        'CANCEL CLASS ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to cancel the class.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9f8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[500px] max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
            </div>

            <h2 className="mt-5 text-lg font-black text-slate-900">
              Loading Class
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Preparing your virtual classroom...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     INVALID / NOT FOUND
  ========================================================= */

  if (!liveClass) {
    return (
      <div className="min-h-screen bg-[#f7f9f8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/lecturer/dashboard/live-classes"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand-green hover:text-brand-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live Classes
          </Link>

          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              Live Class Not Found
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              {error ||
                'The requested live class could not be found or you are not authorized to access it.'}
            </p>

            <Link
              href="/lecturer/dashboard/live-classes"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Live Classes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#f7f9f8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            BREADCRUMB
        ================================================== */}

        <div className="mb-5">
          <Link
            href="/lecturer/dashboard/live-classes"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Live Classes
          </Link>
        </div>

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="mb-7 overflow-hidden rounded-3xl bg-[#0c1f1a] text-white shadow-xl">
          <div className="relative p-6 sm:p-8">

            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-gold/10 blur-3xl" />

            <div className="relative">

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                <div className="min-w-0 flex-1">

                  <div className="mb-3 flex flex-wrap items-center gap-2">

                    <span
                      className={
                        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ' +
                        statusClasses(
                          liveClass.status
                        )
                      }
                    >
                      {liveClass.status ===
                        'live' && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      )}

                      {statusLabel(
                        liveClass.status
                      )}
                    </span>

                    {liveClass.recordingEnabled && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10">
                        <CircleDot className="h-3.5 w-3.5" />
                        Recording enabled
                      </span>
                    )}

                    {liveClass.isLocked && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-brand-gold ring-1 ring-brand-gold/20">
                        <Lock className="h-3.5 w-3.5" />
                        Classroom locked
                      </span>
                    )}

                  </div>

                  <h1 className="max-w-4xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                    {liveClass.title}
                  </h1>

                  {liveClass.description && (
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
                      {liveClass.description}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">

                    <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/80">
                      <BookOpen className="h-4 w-4 text-brand-gold" />
                      {program?.name ||
                        liveClass.programName}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/80">
                      <Layers3 className="h-4 w-4 text-brand-gold" />
                      {unit?.code
                        ? unit.code +
                          ' — '
                        : liveClass.unitCode
                        ? liveClass.unitCode +
                          ' — '
                        : ''}
                      {unit?.name ||
                        liveClass.unitName}
                    </span>

                  </div>
                </div>

                {/* HEADER ACTIONS */}

                <div className="flex flex-wrap gap-3 lg:justify-end">

                  {liveClass.status ===
                    'scheduled' && (
                    <button
                      type="button"
                      onClick={startClass}
                      disabled={
                        actionLoading !== null
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:bg-brand-gold hover:text-[#0c1f1a] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionLoading ===
                      'start' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Start Class
                    </button>
                  )}

                  {liveClass.status ===
                    'live' && (
                    <>
                      <Link
                        href={
                          '/lecturer/dashboard/live-classes/' +
                          liveClass.id
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-red-700"
                      >
                        <Video className="h-4 w-4" />
                        Enter Classroom
                      </Link>

                      <button
                        type="button"
                        onClick={endClass}
                        disabled={
                          actionLoading !== null
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading ===
                        'end' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        End Class
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      loadClass(false)
                    }
                    disabled={refreshing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={
                        refreshing
                          ? 'h-4 w-4 animate-spin'
                          : 'h-4 w-4'
                      }
                    />
                    Refresh
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                Something went wrong
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                Success
              </p>

              <p className="mt-1 text-sm">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            QUICK INFORMATION
        ================================================== */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                <CalendarDays className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Scheduled Date
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {formatDate(
                    liveClass.scheduledStart
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Class Time
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {formatTime(
                    liveClass.scheduledStart
                  )}

                  {liveClass.scheduledEnd
                    ? ' – ' +
                      formatTime(
                        liveClass.scheduledEnd
                      )
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Participants
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {liveClass.participantCount ??
                    0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <MonitorUp className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Duration
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {getDuration(
                    liveClass.scheduledStart,
                    liveClass.scheduledEnd
                  )}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* =================================================
            MAIN GRID
        ================================================== */}

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ===============================================
              LEFT / MAIN
          ================================================ */}

          <div className="space-y-6 lg:col-span-2">

            {/* CLASSROOM ENTRY */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                    <Video className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Virtual Classroom
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Your online classroom entry point.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">

                <div className="rounded-2xl bg-[#0c1f1a] p-5 text-white">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                        Classroom Code
                      </p>

                      <p className="mt-2 font-mono text-xl font-black tracking-widest">
                        {liveClass.roomCode}
                      </p>

                      <p className="mt-2 text-xs text-white/50">
                        This identifies the virtual classroom.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copyClassLink}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-brand-green transition hover:bg-brand-gold hover:text-[#0c1f1a]"
                    >
                      <Copy className="h-4 w-4" />

                      {copied
                        ? 'Copied'
                        : 'Copy Class Link'}
                    </button>

                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  <Link
                    href={
                      '/lecturer/dashboard/live-classes/' +
                      liveClass.id
                    }
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-green/30 hover:bg-brand-green/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                        <Video className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-800">
                          Open Classroom
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Enter the virtual classroom
                        </p>
                      </div>
                    </div>

                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </Link>

                  <button
                    type="button"
                    onClick={copyClassLink}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-green/30 hover:bg-brand-green/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Copy className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-800">
                          Share Link
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Copy the classroom URL
                        </p>
                      </div>
                    </div>

                    <Copy className="h-4 w-4 text-slate-400" />
                  </button>

                </div>

              </div>
            </div>

            {/* SCHEDULE */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Class Schedule
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Scheduled and actual class times.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Scheduled Start
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {formatDateTime(
                      liveClass.scheduledStart
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Scheduled End
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {liveClass.scheduledEnd
                      ? formatDateTime(
                          liveClass.scheduledEnd
                        )
                      : 'No end time set'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Actual Start
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {liveClass.actualStart
                      ? formatDateTime(
                          liveClass.actualStart
                        )
                      : 'Not started'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Actual End
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {liveClass.actualEnd
                      ? formatDateTime(
                          liveClass.actualEnd
                        )
                      : 'Not ended'}
                  </p>
                </div>

              </div>

            </div>

            {/* RECORDING */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <MonitorUp className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-slate-900">
                        Class Recording
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Recording status for this class.
                      </p>
                    </div>
                  </div>

                  <span
                    className={
                      'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ' +
                      recordingStatusClasses(
                        liveClass.recordingStatus
                      )
                    }
                  >
                    {recordingStatusLabel(
                      liveClass.recordingStatus
                    )}
                  </span>

                </div>
              </div>

              <div className="p-5 sm:p-6">

                {liveClass.recordingEnabled ? (
                  <div className="rounded-2xl bg-slate-50 p-5">

                    <div className="flex items-start gap-4">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-green shadow-sm">
                        <CircleDot className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="font-black text-slate-800">
                          Recording is enabled
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Once the actual recording
                          infrastructure is connected,
                          recordings will be processed
                          and made available here after
                          the class.
                        </p>
                      </div>

                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                      <span className="text-sm font-semibold text-slate-500">
                        Available recordings
                      </span>

                      <span className="text-sm font-black text-slate-800">
                        {liveClass.recordingCount ??
                          0}
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-5">

                    <div className="flex items-start gap-4">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                        <MonitorUp className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="font-black text-slate-800">
                          Recording disabled
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          This class was created without
                          recording enabled.
                        </p>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            </div>

          </div>

          {/* ===============================================
              RIGHT SIDEBAR
          ================================================ */}

          <div className="space-y-6">

            {/* CLASS SETTINGS */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <button
                type="button"
                onClick={() =>
                  setShowSettings(
                    !showSettings
                  )
                }
                className="flex w-full items-center justify-between p-5 text-left sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                    <Settings2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Class Settings
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Participant permissions
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-brand-green">
                  {showSettings
                    ? 'Hide'
                    : 'View'}
                </span>
              </button>

              {showSettings && (
                <div className="border-t border-slate-100 p-5 sm:p-6">

                  <div className="space-y-3">

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-blue-600" />

                        <span className="text-sm font-semibold text-slate-700">
                          Chat
                        </span>
                      </div>

                      <span
                        className={
                          liveClass.chatEnabled
                            ? 'text-xs font-bold text-emerald-600'
                            : 'text-xs font-bold text-slate-400'
                        }
                      >
                        {liveClass.chatEnabled
                          ? 'Enabled'
                          : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-3">
                        <Mic className="h-4 w-4 text-purple-600" />

                        <span className="text-sm font-semibold text-slate-700">
                          Student Microphones
                        </span>
                      </div>

                      <span
                        className={
                          liveClass.studentMicrophoneEnabled
                            ? 'text-xs font-bold text-emerald-600'
                            : 'text-xs font-bold text-slate-400'
                        }
                      >
                        {liveClass.studentMicrophoneEnabled
                          ? 'Allowed'
                          : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-3">
                        <Camera className="h-4 w-4 text-purple-600" />

                        <span className="text-sm font-semibold text-slate-700">
                          Student Cameras
                        </span>
                      </div>

                      <span
                        className={
                          liveClass.studentCameraEnabled
                            ? 'text-xs font-bold text-emerald-600'
                            : 'text-xs font-bold text-slate-400'
                        }
                      >
                        {liveClass.studentCameraEnabled
                          ? 'Allowed'
                          : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-3">
                        <MonitorUp className="h-4 w-4 text-indigo-600" />

                        <span className="text-sm font-semibold text-slate-700">
                          Screen Sharing
                        </span>
                      </div>

                      <span
                        className={
                          liveClass.studentScreenShareEnabled
                            ? 'text-xs font-bold text-emerald-600'
                            : 'text-xs font-bold text-slate-400'
                        }
                      >
                        {liveClass.studentScreenShareEnabled
                          ? 'Allowed'
                          : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-3">
                        <Clock3 className="h-4 w-4 text-brand-gold" />

                        <span className="text-sm font-semibold text-slate-700">
                          Early Joining
                        </span>
                      </div>

                      <span
                        className={
                          liveClass.studentsCanJoinBeforeLecturer
                            ? 'text-xs font-bold text-emerald-600'
                            : 'text-xs font-bold text-slate-400'
                        }
                      >
                        {liveClass.studentsCanJoinBeforeLecturer
                          ? 'Allowed'
                          : 'Disabled'}
                      </span>
                    </div>

                  </div>

                  <div className="mt-5 rounded-xl border border-brand-green/10 bg-brand-green/5 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />

                      <p className="text-xs leading-5 text-slate-600">
                        Student access is controlled
                        by authentication and their
                        authorized Program and Unit.
                        The classroom code alone does
                        not grant access.
                      </p>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* PROGRAM / UNIT */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Learning Structure
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Class placement
                  </p>
                </div>
              </div>

              <div className="space-y-4">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Program
                  </p>

                  <div className="mt-2 rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-black text-slate-800">
                      {program?.name ||
                        liveClass.programName}
                    </p>

                    {program?.code && (
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {program.code}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Unit
                  </p>

                  <div className="mt-2 rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-black text-slate-800">
                      {unit?.name ||
                        liveClass.unitName}
                    </p>

                    {(unit?.code ||
                      liveClass.unitCode) && (
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {unit?.code ||
                          liveClass.unitCode}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* PARTICIPANTS */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Participants
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Students in this class
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center">
                <p className="text-4xl font-black text-slate-900">
                  {liveClass.participantCount ??
                    0}
                </p>

                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Participants
                </p>
              </div>

              <Link
                href={
                  '/lecturer/dashboard/live-classes/' +
                  liveClass.id +
                  '?tab=participants'
                }
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-green/30 hover:text-brand-green"
              >
                <Users className="h-4 w-4" />
                Manage Participants
              </Link>

            </div>

            {/* DANGER ZONE */}

            {liveClass.status ===
              'scheduled' && (
              <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:p-6">

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <XCircle className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-black text-slate-900">
                      Cancel Class
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Cancel this scheduled class if
                      it will no longer take place.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cancelClass}
                  disabled={
                    actionLoading !== null
                  }
                  className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ===
                  'cancel' ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    'Cancel Scheduled Class'
                  )}
                </button>

              </div>
            )}

          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================== */}

        <div className="mt-8 rounded-2xl border border-brand-green/10 bg-brand-green/5 p-5">
          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
              <Video className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-black text-slate-900">
                SMTC Virtual Classroom
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                This class belongs to the selected
                Program and Unit. Topics and lessons
                are not required for virtual classroom
                scheduling. The actual video classroom,
                participant controls, chat, screen
                sharing, attendance and recording
                infrastructure will be connected to
                this management page in the next
                stages.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}