'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Info,
  Layers3,
  Loader2,
  MessageCircle,
  Mic,
  MonitorUp,
  Radio,
  Save,
  ShieldCheck,
  Video,
  VideoIcon,
  Users,
  XCircle,
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

  status: 'scheduled' | 'live' | 'ended' | 'cancelled';

  recordingEnabled: boolean;
  chatEnabled: boolean;

  studentMicrophoneEnabled: boolean;
  studentCameraEnabled: boolean;
  studentScreenShareEnabled: boolean;
  studentsCanJoinBeforeLecturer: boolean;

  isLocked: boolean;

  recordingStatus:
    | 'not_started'
    | 'recording'
    | 'processing'
    | 'ready'
    | 'failed'
    | 'deleted';

  participantCount?: number;
  recordingCount?: number;

  classroomUrl?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  classes?: LiveClass[];
  programs?: Program[];
  units?: Unit[];
  class?: LiveClass;
};

type FormState = {
  programId: string;
  unitId: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;

  recordingEnabled: boolean;
  chatEnabled: boolean;

  studentMicrophoneEnabled: boolean;
  studentCameraEnabled: boolean;
  studentScreenShareEnabled: boolean;

  studentsCanJoinBeforeLecturer: boolean;
};

/* =========================================================
   INITIAL FORM
========================================================= */

const initialForm: FormState = {
  programId: '',
  unitId: '',
  title: '',
  description: '',
  scheduledStart: '',
  scheduledEnd: '',

  recordingEnabled: true,
  chatEnabled: true,

  studentMicrophoneEnabled: false,
  studentCameraEnabled: false,
  studentScreenShareEnabled: false,

  studentsCanJoinBeforeLecturer: false,
};

/* =========================================================
   HELPERS
========================================================= */

function getMinimumDateTime() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return (
    year +
    '-' +
    month +
    '-' +
    day +
    'T' +
    hours +
    ':' +
    minutes
  );
}

function formatSelectedDate(value: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function Toggle({
  enabled,
  onChange,
  disabled,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={
        'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ' +
        (enabled
          ? 'border-brand-green/30 bg-brand-green/5'
          : 'border-slate-200 bg-white hover:border-slate-300') +
        (disabled
          ? ' cursor-not-allowed opacity-60'
          : ' cursor-pointer')
      }
    >
      <span
        className={
          'relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ' +
          (enabled ? 'bg-brand-green' : 'bg-slate-300')
        }
        aria-hidden="true"
      >
        <span
          className={
            'h-4 w-4 rounded-full bg-white shadow-sm transition ' +
            (enabled ? 'translate-x-5' : 'translate-x-0')
          }
        />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-800">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function CreateLiveClassPage() {
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<FormState>(initialForm);

  /* =======================================================
     LOAD PROGRAMS + UNITS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          '/api/lecturer/live-classes',
          {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          }
        );

        const data = (await response.json()) as ApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              'Unable to load programs and units.'
          );
        }

        if (!mounted) {
          return;
        }

        setPrograms(
          Array.isArray(data.programs)
            ? data.programs
            : []
        );

        setUnits(
          Array.isArray(data.units)
            ? data.units
            : []
        );
      } catch (err) {
        console.error(
          'CREATE LIVE CLASS OPTIONS ERROR:',
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load programs and units.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     AVAILABLE UNITS
  ======================================================= */

  const availableUnits = useMemo(() => {
    if (!form.programId) {
      return [];
    }

    const programId = Number(form.programId);

    return units.filter(
      (unit) => unit.programId === programId
    );
  }, [units, form.programId]);

  /* =======================================================
     SELECTED PROGRAM / UNIT
  ======================================================= */

  const selectedProgram = useMemo(() => {
    if (!form.programId) {
      return null;
    }

    return (
      programs.find(
        (program) =>
          program.id === Number(form.programId)
      ) || null
    );
  }, [programs, form.programId]);

  const selectedUnit = useMemo(() => {
    if (!form.unitId) {
      return null;
    }

    return (
      units.find(
        (unit) => unit.id === Number(form.unitId)
      ) || null
    );
  }, [units, form.unitId]);

  /* =======================================================
     FORM UPDATE
  ======================================================= */

  const updateForm = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* =======================================================
     PROGRAM CHANGE
  ======================================================= */

  const handleProgramChange = (
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      programId: value,
      unitId: '',
    }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError('');
    setSuccess('');

    const title = form.title.trim();
    const description = form.description.trim();

    if (!form.programId) {
      setError('Please select a program.');
      return;
    }

    if (!form.unitId) {
      setError('Please select a unit.');
      return;
    }

    if (!title) {
      setError('Please enter a class title.');
      return;
    }

    if (title.length < 3) {
      setError(
        'The class title must contain at least 3 characters.'
      );
      return;
    }

    if (title.length > 200) {
      setError(
        'The class title cannot exceed 200 characters.'
      );
      return;
    }

    if (!form.scheduledStart) {
      setError(
        'Please select when the class should start.'
      );
      return;
    }

    const startDate = new Date(
      form.scheduledStart
    );

    if (Number.isNaN(startDate.getTime())) {
      setError(
        'Please enter a valid class start date and time.'
      );
      return;
    }

    if (
      startDate.getTime() <=
      Date.now()
    ) {
      setError(
        'The class start time must be in the future.'
      );
      return;
    }

    let endDate: Date | null = null;

    if (form.scheduledEnd) {
      endDate = new Date(
        form.scheduledEnd
      );

      if (
        Number.isNaN(
          endDate.getTime()
        )
      ) {
        setError(
          'Please enter a valid class end date and time.'
        );
        return;
      }

      if (
        endDate.getTime() <=
        startDate.getTime()
      ) {
        setError(
          'The class end time must be after the start time.'
        );
        return;
      }
    }

    const selectedUnitBelongsToProgram =
      availableUnits.some(
        (unit) =>
          unit.id ===
          Number(form.unitId)
      );

    if (
      !selectedUnitBelongsToProgram
    ) {
      setError(
        'The selected unit does not belong to the selected program.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        '/api/lecturer/live-classes',
        {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            programId:
              Number(form.programId),

            unitId:
              Number(form.unitId),

            title,

            description:
              description || null,

            scheduledStart:
              startDate.toISOString(),

            scheduledEnd:
              endDate
                ? endDate.toISOString()
                : null,

            recordingEnabled:
              form.recordingEnabled,

            chatEnabled:
              form.chatEnabled,

            studentMicrophoneEnabled:
              form.studentMicrophoneEnabled,

            studentCameraEnabled:
              form.studentCameraEnabled,

            studentScreenShareEnabled:
              form.studentScreenShareEnabled,

            studentsCanJoinBeforeLecturer:
              form.studentsCanJoinBeforeLecturer,
          }),
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Unable to create the live class.'
        );
      }

      setSuccess(
        'Live class created successfully.'
      );

      window.setTimeout(() => {
        router.push(
          '/lecturer/dashboard/live-classes'
        );
      }, 900);
    } catch (err) {
      console.error(
        'CREATE LIVE CLASS ERROR:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create the live class.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9f8] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[500px] max-w-5xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10">
              <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
            </div>

            <h2 className="mt-5 text-lg font-black text-slate-900">
              Preparing Class Creation
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Loading your assigned programs and units...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#f7f9f8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">

        {/* =================================================
            BACK LINK
        ================================================== */}

        <div className="mb-6">
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

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-green">
            <Video className="h-4 w-4" />
            Virtual Classroom
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Create Live Class
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Schedule an online learning session for students
            enrolled in your assigned program and unit.
          </p>
        </div>

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                Unable to create class
              </p>

              <p className="mt-1 text-sm leading-5">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================== */}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                Class created successfully
              </p>

              <p className="mt-1 text-sm">
                Redirecting you to your Live Classes...
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
              CLASS INFORMATION
          ================================================== */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-brand-green" />

            <div className="p-5 sm:p-7">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                  <VideoIcon className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Class Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose the learning structure and give your
                    virtual class a clear title.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                {/* PROGRAM */}

                <div>
                  <label
                    htmlFor="programId"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Program
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <BookOpenIcon />

                    <select
                      id="programId"
                      value={form.programId}
                      onChange={(event) =>
                        handleProgramChange(
                          event.target.value
                        )
                      }
                      disabled={submitting}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      <option value="">
                        Select Program
                      </option>

                      {programs.map(
                        (program) => (
                          <option
                            key={program.id}
                            value={program.id}
                          >
                            {program.code
                              ? program.code +
                                ' — '
                              : ''}
                            {program.name}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  {programs.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No programs are currently assigned to you.
                    </p>
                  )}
                </div>

                {/* UNIT */}

                <div>
                  <label
                    htmlFor="unitId"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Unit
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <Layers3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      id="unitId"
                      value={form.unitId}
                      onChange={(event) =>
                        updateForm(
                          'unitId',
                          event.target.value
                        )
                      }
                      disabled={
                        submitting ||
                        !form.programId
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      <option value="">
                        {!form.programId
                          ? 'Select a program first'
                          : availableUnits.length === 0
                          ? 'No units available'
                          : 'Select Unit'}
                      </option>

                      {availableUnits.map(
                        (unit) => (
                          <option
                            key={unit.id}
                            value={unit.id}
                          >
                            {unit.code
                              ? unit.code +
                                ' — '
                              : ''}
                            {unit.name}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  {!form.programId && (
                    <p className="mt-2 text-xs text-slate-400">
                      Units are filtered according to the selected
                      program.
                    </p>
                  )}
                </div>

                {/* TITLE */}

                <div className="md:col-span-2">
                  <label
                    htmlFor="title"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Class Title
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    id="title"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateForm(
                        'title',
                        event.target.value
                      )
                    }
                    maxLength={200}
                    disabled={submitting}
                    placeholder="e.g. Introduction to German"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                  />

                  <div className="mt-1 flex justify-end">
                    <span className="text-[11px] text-slate-400">
                      {form.title.length}/200
                    </span>
                  </div>
                </div>

                {/* DESCRIPTION */}

                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Description
                    <span className="ml-2 text-xs font-medium text-slate-400">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        'description',
                        event.target.value
                      )
                    }
                    rows={4}
                    maxLength={2000}
                    disabled={submitting}
                    placeholder="Tell students what this live class will cover..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                  />

                  <div className="mt-1 flex justify-end">
                    <span className="text-[11px] text-slate-400">
                      {form.description.length}/2000
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* =================================================
              SCHEDULE
          ================================================== */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-brand-gold" />

            <div className="p-5 sm:p-7">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Schedule
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose when students should attend the live
                    class.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                {/* START */}

                <div>
                  <label
                    htmlFor="scheduledStart"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Start Date & Time
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="scheduledStart"
                      type="datetime-local"
                      value={form.scheduledStart}
                      min={getMinimumDateTime()}
                      onChange={(event) =>
                        updateForm(
                          'scheduledStart',
                          event.target.value
                        )
                      }
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                    />
                  </div>

                  {form.scheduledStart && (
                    <p className="mt-2 text-xs font-medium text-brand-green">
                      {formatSelectedDate(
                        form.scheduledStart
                      )}
                    </p>
                  )}
                </div>

                {/* END */}

                <div>
                  <label
                    htmlFor="scheduledEnd"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    End Date & Time
                    <span className="ml-2 text-xs font-medium text-slate-400">
                      Optional
                    </span>
                  </label>

                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="scheduledEnd"
                      type="datetime-local"
                      value={form.scheduledEnd}
                      min={
                        form.scheduledStart ||
                        getMinimumDateTime()
                      }
                      onChange={(event) =>
                        updateForm(
                          'scheduledEnd',
                          event.target.value
                        )
                      }
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                    />
                  </div>

                  {form.scheduledEnd && (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {formatSelectedDate(
                        form.scheduledEnd
                      )}
                    </p>
                  )}
                </div>

              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                <p className="text-xs leading-5 text-slate-500">
                  The start time must be in the future. The end
                  time is optional, allowing you to run an open-ended
                  session when necessary.
                </p>
              </div>
            </div>
          </section>

          {/* =================================================
              CLASSROOM SETTINGS
          ================================================== */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1 bg-brand-green" />

            <div className="p-5 sm:p-7">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                  <SettingsIcon />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Classroom Settings
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Control how students interact during the
                    virtual class.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <Toggle
                  enabled={
                    form.recordingEnabled
                  }
                  onChange={(value) =>
                    updateForm(
                      'recordingEnabled',
                      value
                    )
                  }
                  disabled={submitting}
                  label="Record this class"
                  description="Enable recording so the session can be processed and made available later."
                />

                <Toggle
                  enabled={
                    form.chatEnabled
                  }
                  onChange={(value) =>
                    updateForm(
                      'chatEnabled',
                      value
                    )
                  }
                  disabled={submitting}
                  label="Enable class chat"
                  description="Allow participants to communicate through the classroom chat."
                />

                <Toggle
                  enabled={
                    form.studentMicrophoneEnabled
                  }
                  onChange={(value) =>
                    updateForm(
                      'studentMicrophoneEnabled',
                      value
                    )
                  }
                  disabled={submitting}
                  label="Allow student microphones"
                  description="Students can turn their microphones on when permitted by the lecturer."
                />

                <Toggle
                  enabled={
                    form.studentCameraEnabled
                  }
                  onChange={(value) =>
                    updateForm(
                      'studentCameraEnabled',
                      value
                    )
                  }
                  disabled={submitting}
                  label="Allow student cameras"
                  description="Students can use their cameras during the live class."
                />

                <Toggle
                  enabled={
                    form.studentScreenShareEnabled
                  }
                  onChange={(value) =>
                    updateForm(
                      'studentScreenShareEnabled',
                      value
                    )
                  }
                  disabled={submitting}
                  label="Allow student screen sharing"
                  description="Students can share their screens when the lecturer allows it."
                />

                <Toggle
                  enabled={
                    form.studentsCanJoinBeforeLecturer
                  }
                  onChange={(value) =>
                    updateForm(
                      'studentsCanJoinBeforeLecturer',
                      value
                    )
                  }
                  disabled={submitting}
                  label="Allow early student entry"
                  description="Students may enter the classroom before the lecturer starts the session."
                />

              </div>
            </div>
          </section>

          {/* =================================================
              CLASS PREVIEW
          ================================================== */}

          <section className="overflow-hidden rounded-3xl border border-brand-green/10 bg-brand-green/5">
            <div className="p-5 sm:p-7">

              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Class Summary
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Review the main details before creating the
                    classroom.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Program
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm font-black text-slate-800">
                    {selectedProgram
                      ? selectedProgram.name
                      : 'Not selected'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Unit
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm font-black text-slate-800">
                    {selectedUnit
                      ? selectedUnit.name
                      : 'Not selected'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Schedule
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm font-black text-slate-800">
                    {form.scheduledStart
                      ? formatSelectedDate(
                          form.scheduledStart
                        )
                      : 'Not scheduled'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Recording
                  </p>

                  <p className="mt-2 text-sm font-black text-slate-800">
                    {form.recordingEnabled
                      ? 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>

              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {form.chatEnabled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat
                  </span>
                )}

                {form.studentMicrophoneEnabled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                    <Mic className="h-3.5 w-3.5" />
                    Student Mic
                  </span>
                )}

                {form.studentCameraEnabled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                    <Video className="h-3.5 w-3.5" />
                    Student Camera
                  </span>
                )}

                {form.studentScreenShareEnabled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                    <MonitorUp className="h-3.5 w-3.5" />
                    Screen Sharing
                  </span>
                )}

                {form.studentsCanJoinBeforeLecturer && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                    <Users className="h-3.5 w-3.5" />
                    Early Entry
                  </span>
                )}

                {form.recordingEnabled && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-green shadow-sm">
                    <Radio className="h-3.5 w-3.5" />
                    Recording
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              ACTIONS
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/lecturer/dashboard/live-classes"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-black text-white shadow-lg shadow-brand-green/20 transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Class...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Live Class
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL ICON COMPONENTS
========================================================= */

function BookOpenIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20H11.5v-.1a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 7.13 15a1.7 1.7 0 0 0-1.56-1.03H5v-2.54h.57A1.7 1.7 0 0 0 7.13 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.8-1.8.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V5h2.54v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.8 1.8-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03H21v2.54h-.04A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}