'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
Video,
Plus,
CalendarDays,
Clock3,
Users,
Play,
Square,
Settings2,
MoreVertical,
Search,
RefreshCw,
Loader2,
AlertCircle,
CheckCircle2,
Radio,
Copy,
ExternalLink,
BookOpen,
Layers3,
ChevronDown,
MonitorPlay,
Lock,
LogIn,
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
classes?: LiveClass[];
programs?: Program[];
units?: Unit[];
class?: LiveClass;
};

/* =========================================================
ROUTES
========================================================= */

function getManagementUrl(item: LiveClass) {
return '/lecturer/dashboard/live-classes/' + item.id;
}

function getClassroomUrl(item: LiveClass) {
return (
item.classroomUrl ||
'/lecturer/dashboard/live-classes/' +
item.id +
'/classroom'
);
}

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
weekday: 'short',
day: '2-digit',
month: 'short',
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

function getDuration(
start: string,
end?: string | null
) {
if (!end) {
return 'Open ended';
}

const startDate = new Date(start);
const endDate = new Date(end);

if (
Number.isNaN(startDate.getTime()) ||
Number.isNaN(endDate.getTime())
) {
return 'Unknown duration';
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
return minutes + ' min';
}

const hours = Math.floor(minutes / 60);
const remaining = minutes % 60;

if (remaining === 0) {
return hours + ' hr';
}

return (
hours +
' hr ' +
remaining +
' min'
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

function isUpcoming(item: LiveClass) {
if (item.status !== 'scheduled') {
return false;
}

const start = new Date(
item.scheduledStart
).getTime();

return (
!Number.isNaN(start) &&
start > Date.now()
);
}

/* =========================================================
PAGE
========================================================= */

export default function LecturerLiveClassesPage() {
const [classes, setClasses] = useState<
LiveClass[]

> ([]);

const [programs, setPrograms] = useState<
Program[]

> ([]);

const [units, setUnits] = useState<
Unit[]

> ([]);

const [loading, setLoading] =
useState(true);

const [refreshing, setRefreshing] =
useState(false);

const [error, setError] =
useState('');

const [search, setSearch] =
useState('');

const [statusFilter, setStatusFilter] =
useState('all');

const [programFilter, setProgramFilter] =
useState('all');

const [unitFilter, setUnitFilter] =
useState('all');

const [actionId, setActionId] =
useState<number | null>(null);

const [copiedId, setCopiedId] =
useState<number | null>(null);

const [openMenuId, setOpenMenuId] =
useState<number | null>(null);

/* =========================================================
LOAD LIVE CLASSES
========================================================= */

const loadClasses = async (
showLoader = true
) => {
try {
if (showLoader) {
setLoading(true);
} else {
setRefreshing(true);
}

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

  const data =
    (await response.json()) as ApiResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        'Unable to load live classes.'
    );
  }

  setClasses(
    Array.isArray(data.classes)
      ? data.classes
      : []
  );

  if (Array.isArray(data.programs)) {
    setPrograms(data.programs);
  }

  if (Array.isArray(data.units)) {
    setUnits(data.units);
  }
} catch (err) {
  console.error(
    'LIVE CLASSES LOAD ERROR:',
    err
  );

  setError(
    err instanceof Error
      ? err.message
      : 'Unable to load live classes.'
  );
} finally {
  setLoading(false);
  setRefreshing(false);
}

};

useEffect(() => {
void loadClasses(true);
}, []);

/* =========================================================
FILTERED UNITS
========================================================= */

const availableUnits = useMemo(() => {
if (programFilter === 'all') {
return units;
}

const programId =
  Number(programFilter);

return units.filter(
  (unit) =>
    unit.programId === programId
);

}, [units, programFilter]);

/* =========================================================
FILTER CLASSES
========================================================= */

const filteredClasses = useMemo(() => {
const normalizedSearch =
search.trim().toLowerCase();

return classes.filter((item) => {
  const matchesSearch =
    normalizedSearch.length === 0 ||
    item.title
      .toLowerCase()
      .includes(normalizedSearch) ||
    item.programName
      .toLowerCase()
      .includes(normalizedSearch) ||
    item.unitName
      .toLowerCase()
      .includes(normalizedSearch) ||
    item.roomCode
      .toLowerCase()
      .includes(normalizedSearch);

  const matchesStatus =
    statusFilter === 'all' ||
    item.status === statusFilter;

  const matchesProgram =
    programFilter === 'all' ||
    item.programId ===
      Number(programFilter);

  const matchesUnit =
    unitFilter === 'all' ||
    item.unitId ===
      Number(unitFilter);

  return (
    matchesSearch &&
    matchesStatus &&
    matchesProgram &&
    matchesUnit
  );
});

}, [
classes,
search,
statusFilter,
programFilter,
unitFilter,
]);

/* =========================================================
STATISTICS
========================================================= */

const statistics = useMemo(() => {
const upcoming = classes.filter(
(item) =>
item.status === 'scheduled' &&
isUpcoming(item)
).length;

const live = classes.filter(
  (item) =>
    item.status === 'live'
).length;

const ended = classes.filter(
  (item) =>
    item.status === 'ended'
).length;

const recordings = classes.filter(
  (item) =>
    item.recordingStatus === 'ready'
).length;

return {
  total: classes.length,
  upcoming,
  live,
  ended,
  recordings,
};

}, [classes]);

/* =========================================================
LIVE CLASS
========================================================= */

const liveClass = useMemo(() => {
return classes.find(
(item) =>
item.status === 'live'
);
}, [classes]);

/* =========================================================
COPY CLASSROOM LINK
========================================================= */

const copyClassroomLink = async (
item: LiveClass
) => {
const url =
getClassroomUrl(item);

const fullUrl =
  window.location.origin + url;

try {
  await navigator.clipboard.writeText(
    fullUrl
  );

  setCopiedId(item.id);

  window.setTimeout(() => {
    setCopiedId(null);
  }, 2000);
} catch (err) {
  console.error(
    'COPY CLASSROOM LINK ERROR:',
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

const startClass = async (
item: LiveClass
) => {
if (actionId !== null) {
return;
}

const confirmed = window.confirm(
  'Start "' +
    item.title +
    '" now? Students will be able to enter according to the classroom settings.'
);

if (!confirmed) {
  return;
}

try {
  setActionId(item.id);
  setOpenMenuId(null);

  const response = await fetch(
    '/api/lecturer/live-classes/' +
      item.id +
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

  /*
   * Once the class has successfully started,
   * take the lecturer directly into the
   * actual virtual classroom.
   */
  window.location.href =
    getClassroomUrl(item);
} catch (err) {
  console.error(
    'START LIVE CLASS ERROR:',
    err
  );

  alert(
    err instanceof Error
      ? err.message
      : 'Unable to start the class.'
  );

  setActionId(null);
}

};

/* =========================================================
END CLASS
========================================================= */

const endClass = async (
item: LiveClass
) => {
if (actionId !== null) {
return;
}

const confirmed = window.confirm(
  'End "' +
    item.title +
    '" for all participants?'
);

if (!confirmed) {
  return;
}

try {
  setActionId(item.id);
  setOpenMenuId(null);

  const response = await fetch(
    '/api/lecturer/live-classes/' +
      item.id +
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

  await loadClasses(false);
} catch (err) {
  console.error(
    'END LIVE CLASS ERROR:',
    err
  );

  alert(
    err instanceof Error
      ? err.message
      : 'Unable to end the class.'
  );
} finally {
  setActionId(null);
}

};

/* =========================================================
RESET FILTERS
========================================================= */

const resetFilters = () => {
setSearch('');
setStatusFilter('all');
setProgramFilter('all');
setUnitFilter('all');
};

/* =========================================================
LOADING STATE
========================================================= */

if (loading) {
return ( <div className="px-4 py-8 sm:px-6 lg:px-8"> <div className="mx-auto max-w-7xl"> <div className="flex min-h-[500px] items-center justify-center"> <div className="text-center"> <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10"> <Loader2 className="h-8 w-8 animate-spin text-brand-green" /> </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Loading Live Classes
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Preparing your virtual classroom dashboard...
          </p>
        </div>
      </div>
    </div>
  </div>
);

}

/* =========================================================
PAGE
========================================================= */

return ( <div className="min-h-screen bg-[#f7f9f8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"> <div className="mx-auto max-w-7xl">


    {/* ===================================================
        HEADER
    ==================================================== */}

    <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-green">
          <Video className="h-4 w-4" />
          Virtual Classroom
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Live Classes
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Create, schedule and manage your online
          classes for students enrolled in your
          assigned programs and units.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            void loadClasses(false)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-green/30 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-60"
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

        <Link
          href="/lecturer/dashboard/live-classes/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-green/20 transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Create Live Class
        </Link>
      </div>
    </div>

    {/* ===================================================
        ERROR
    ==================================================== */}

    {error && (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

        <div className="flex-1">
          <p className="font-bold">
            Unable to load live classes
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadClasses(true)
          }
          className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm ring-1 ring-red-200"
        >
          Try Again
        </button>
      </div>
    )}

    {/* ===================================================
        QUICK STATS
    ==================================================== */}

    <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-green" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Classes
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {statistics.total}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <Video className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-gold" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Upcoming
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {statistics.upcoming}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Now
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {statistics.live}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Radio className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-slate-500" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {statistics.ended}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-green" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recordings
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {statistics.recordings}
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <MonitorPlay className="h-5 w-5" />
          </div>
        </div>
      </div>

    </div>

    {/* ===================================================
        LIVE NOW BANNER
    ==================================================== */}

    {liveClass && (
      <div className="mb-7 overflow-hidden rounded-2xl bg-[#0c1f1a] p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
                Classroom in progress
              </p>

              <h2 className="mt-1 text-lg font-black">
                {liveClass.title}
              </h2>

              <p className="mt-1 text-sm text-white/60">
                {liveClass.programName}
                {' • '}
                {liveClass.unitCode
                  ? liveClass.unitCode +
                    ' — '
                  : ''}
                {liveClass.unitName}
              </p>

              <p className="mt-1 text-sm text-white/60">
                {liveClass.participantCount ??
                  0}{' '}
                participant
                {(liveClass.participantCount ??
                  0) === 1
                  ? ''
                  : 's'}{' '}
                currently connected.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={getClassroomUrl(
                liveClass
              )}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-green transition hover:bg-brand-gold hover:text-[#0c1f1a]"
            >
              <Play className="h-4 w-4" />
              Enter Live Classroom
            </Link>

            <Link
              href={getManagementUrl(
                liveClass
              )}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4" />
              Manage
            </Link>
          </div>
        </div>
      </div>
    )}

    {/* ===================================================
        FILTERS
    ==================================================== */}

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search classes, programs, units or room codes..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/10"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex">

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 xl:w-40"
            >
              <option value="all">
                All Statuses
              </option>

              <option value="scheduled">
                Scheduled
              </option>

              <option value="live">
                Live Now
              </option>

              <option value="ended">
                Ended
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={programFilter}
              onChange={(event) => {
                setProgramFilter(
                  event.target.value
                );

                setUnitFilter('all');
              }}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 xl:w-48"
            >
              <option value="all">
                All Programs
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

          <div className="relative">
            <select
              value={unitFilter}
              onChange={(event) =>
                setUnitFilter(
                  event.target.value
                )
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 xl:w-48"
            >
              <option value="all">
                All Units
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

          {(search ||
            statusFilter !== 'all' ||
            programFilter !== 'all' ||
            unitFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>

    {/* ===================================================
        RESULTS HEADER
    ==================================================== */}

    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-black text-slate-900">
          Your Classes
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Showing {filteredClasses.length}{' '}
          of {classes.length} classes
        </p>
      </div>
    </div>

    {/* ===================================================
        EMPTY STATE
    ==================================================== */}

    {filteredClasses.length === 0 ? (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
          <Video className="h-8 w-8" />
        </div>

        <h3 className="mt-5 text-xl font-black text-slate-900">
          {classes.length === 0
            ? 'No live classes yet'
            : 'No classes match your filters'}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {classes.length === 0
            ? 'Create your first virtual classroom and schedule an online learning session for your students.'
            : 'Try changing your search or filters to find another class.'}
        </p>

        {classes.length === 0 ? (
          <Link
            href="/lecturer/dashboard/live-classes/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-green/20 transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Create Your First Class
          </Link>
        ) : (
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
          >
            Clear Filters
          </button>
        )}
      </div>
    ) : (

      /* =================================================
         CLASS LIST
      ================================================== */

      <div className="space-y-4">
        {filteredClasses.map(
          (item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-green/20 hover:shadow-md"
            >
              <div className="flex flex-col lg:flex-row">

                {/* STATUS STRIP */}

                <div
                  className={
                    item.status === 'live'
                      ? 'h-1 bg-red-500 lg:h-auto lg:w-1'
                      : item.status ===
                        'ended'
                      ? 'h-1 bg-slate-300 lg:h-auto lg:w-1'
                      : item.status ===
                        'cancelled'
                      ? 'h-1 bg-red-300 lg:h-auto lg:w-1'
                      : 'h-1 bg-brand-green lg:h-auto lg:w-1'
                  }
                />

                <div className="min-w-0 flex-1 p-5 sm:p-6">

                  {/* TOP ROW */}

                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                    <div className="min-w-0 flex-1">

                      <div className="mb-2 flex flex-wrap items-center gap-2">

                        <span
                          className={
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ' +
                            statusClasses(
                              item.status
                            )
                          }
                        >
                          {item.status ===
                            'live' && (
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                          )}

                          {statusLabel(
                            item.status
                          )}
                        </span>

                        {item.recordingEnabled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            <MonitorPlay className="h-3 w-3" />
                            Recording
                          </span>
                        )}

                        {item.recordingEnabled && (
                          <span
                            className={
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ' +
                              recordingStatusClasses(
                                item.recordingStatus
                              )
                            }
                          >
                            {recordingStatusLabel(
                              item.recordingStatus
                            )}
                          </span>
                        )}

                        {item.isLocked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            <Lock className="h-3 w-3" />
                            Locked
                          </span>
                        )}

                      </div>

                      <h3 className="truncate text-lg font-black text-slate-900 sm:text-xl">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                          {item.description}
                        </p>
                      )}

                      {/* PROGRAM + UNIT */}

                      <div className="mt-4 flex flex-wrap gap-2">

                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green/5 px-3 py-1.5 text-xs font-bold text-brand-green">
                          <BookOpen className="h-3.5 w-3.5" />

                          {item.programName}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                          <Layers3 className="h-3.5 w-3.5" />

                          {item.unitCode
                            ? item.unitCode +
                              ' — '
                            : ''}

                          {item.unitName}
                        </span>
                      </div>
                    </div>

                    {/* ACTION MENU */}

                    <div className="relative shrink-0">

                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId ===
                              item.id
                              ? null
                              : item.id
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-green/30 hover:bg-brand-green/5 hover:text-brand-green"
                        aria-label="Class actions"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {openMenuId ===
                        item.id && (
                        <div className="absolute right-0 top-12 z-20 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                          <Link
                            href={getManagementUrl(
                              item
                            )}
                            onClick={() =>
                              setOpenMenuId(
                                null
                              )
                            }
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Settings2 className="h-4 w-4" />
                            Manage Class
                          </Link>

                          {item.status ===
                            'scheduled' && (
                            <Link
                              href={getClassroomUrl(
                                item
                              )}
                              onClick={() =>
                                setOpenMenuId(
                                  null
                                )
                              }
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-green transition hover:bg-brand-green/5"
                            >
                              <LogIn className="h-4 w-4" />
                              Open Classroom
                            </Link>
                          )}

                          {item.status ===
                            'live' && (
                            <Link
                              href={getClassroomUrl(
                                item
                              )}
                              onClick={() =>
                                setOpenMenuId(
                                  null
                                )
                              }
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                            >
                              <Video className="h-4 w-4" />
                              Enter Classroom
                            </Link>
                          )}

                          {item.status ===
                            'scheduled' && (
                            <button
                              type="button"
                              onClick={() =>
                                void startClass(
                                  item
                                )
                              }
                              disabled={
                                actionId ===
                                item.id
                              }
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-brand-green transition hover:bg-brand-green/5 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionId ===
                              item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}

                              Start Class & Enter
                            </button>
                          )}

                          {item.status ===
                            'live' && (
                            <button
                              type="button"
                              onClick={() =>
                                void endClass(
                                  item
                                )
                              }
                              disabled={
                                actionId ===
                                item.id
                              }
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Square className="h-4 w-4" />
                              End Class
                            </button>
                          )}

                        </div>
                      )}
                    </div>
                  </div>

                  {/* CLASS DETAILS */}

                  <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">

                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Date
                        </p>

                        <p className="mt-0.5 text-sm font-bold text-slate-700">
                          {formatDate(
                            item.scheduledStart
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Clock3 className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Time
                        </p>

                        <p className="mt-0.5 text-sm font-bold text-slate-700">
                          {formatTime(
                            item.scheduledStart
                          )}

                          {item.scheduledEnd
                            ? ' – ' +
                              formatTime(
                                item.scheduledEnd
                              )
                            : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Clock3 className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Duration
                        </p>

                        <p className="mt-0.5 text-sm font-bold text-slate-700">
                          {getDuration(
                            item.scheduledStart,
                            item.scheduledEnd
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Users className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Participants
                        </p>

                        <p className="mt-0.5 text-sm font-bold text-slate-700">
                          {item.participantCount ??
                            0}
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* ROOM CODE */}

                  <div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Classroom Code
                      </p>

                      <p className="mt-1 truncate font-mono text-sm font-bold tracking-wider text-slate-700">
                        {item.roomCode}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void copyClassroomLink(
                          item
                        )
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-brand-green/30 hover:text-brand-green"
                    >
                      <Copy className="h-3.5 w-3.5" />

                      {copiedId ===
                      item.id
                        ? 'Copied'
                        : 'Copy Classroom Link'}
                    </button>
                  </div>

                  {/* CLASSROOM SETTINGS SUMMARY */}

                  <div className="mt-4 flex flex-wrap gap-2">

                    {item.chatEnabled && (
                      <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
                        Chat enabled
                      </span>
                    )}

                    {item.studentMicrophoneEnabled && (
                      <span className="rounded-lg bg-purple-50 px-3 py-1.5 text-[11px] font-semibold text-purple-700">
                        Student microphones
                      </span>
                    )}

                    {item.studentCameraEnabled && (
                      <span className="rounded-lg bg-purple-50 px-3 py-1.5 text-[11px] font-semibold text-purple-700">
                        Student cameras
                      </span>
                    )}

                    {item.studentScreenShareEnabled && (
                      <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700">
                        Screen sharing
                      </span>
                    )}

                    {item.studentsCanJoinBeforeLecturer && (
                      <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                        Early joining
                      </span>
                    )}

                  </div>

                  {/* ACTIONS */}

                  <div className="mt-5 flex flex-wrap items-center gap-3">

                    {item.status ===
                      'scheduled' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void startClass(
                              item
                            )
                          }
                          disabled={
                            actionId ===
                            item.id
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-green/15 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionId ===
                          item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}

                          Start Class & Enter
                        </button>

                        <Link
                          href={getClassroomUrl(
                            item
                          )}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green/20 bg-brand-green/5 px-4 py-2.5 text-sm font-bold text-brand-green transition hover:bg-brand-green/10"
                        >
                          <LogIn className="h-4 w-4" />
                          Open Classroom
                        </Link>

                        <Link
                          href={getManagementUrl(
                            item
                          )}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-green/30 hover:text-brand-green"
                        >
                          <Settings2 className="h-4 w-4" />
                          Manage Class
                        </Link>
                      </>
                    )}

                    {item.status ===
                      'live' && (
                      <>
                        <Link
                          href={getClassroomUrl(
                            item
                          )}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-600/15 transition hover:bg-red-700"
                        >
                          <Video className="h-4 w-4" />
                          Enter Classroom
                        </Link>

                        <Link
                          href={getManagementUrl(
                            item
                          )}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-green/30 hover:text-brand-green"
                        >
                          <Settings2 className="h-4 w-4" />
                          Manage Class
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            void endClass(
                              item
                            )
                          }
                          disabled={
                            actionId ===
                            item.id
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionId ===
                          item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}

                          End Class
                        </button>
                      </>
                    )}

                    {item.status ===
                      'ended' && (
                      <>
                        <Link
                          href={getManagementUrl(
                            item
                          )}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-green/30 hover:text-brand-green"
                        >
                          <Settings2 className="h-4 w-4" />
                          Manage Class
                        </Link>

                        {item.recordingStatus ===
                          'ready' && (
                          <Link
                            href={
                              getManagementUrl(
                                item
                              ) +
                              '?tab=recordings'
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green/20 bg-brand-green/5 px-4 py-2.5 text-sm font-bold text-brand-green transition hover:bg-brand-green/10"
                          >
                            <MonitorPlay className="h-4 w-4" />
                            View Recording
                          </Link>
                        )}
                      </>
                    )}

                    {item.status ===
                      'cancelled' && (
                      <Link
                        href={getManagementUrl(
                          item
                        )}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
                      >
                        <Settings2 className="h-4 w-4" />
                        View Details
                      </Link>
                    )}

                    <Link
                      href={getManagementUrl(
                        item
                      )}
                      className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-brand-green transition hover:text-brand-dark"
                    >
                      Manage
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    )}

    {/* ===================================================
        FOOTER INFORMATION
    ==================================================== */}

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
            Live classes are organized by
            Program and Unit. Students only
            receive access when they are
            authorized and enrolled in the
            relevant learning structure.
            Lecturers can enter the classroom,
            manage the session and conduct
            live online learning through the
            SMTC Virtual Classroom.
          </p>
        </div>

      </div>
    </div>

  </div>
</div>

);
}
