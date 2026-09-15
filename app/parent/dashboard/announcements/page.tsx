'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AlertCircle,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  Megaphone,
  Pin,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Announcement = {
  id: number;
  title: string;
  message: string;

  created_by: number | null;
  created_by_role: string | null;

  program_id: number | null;
  unit_id: number | null;

  audience: string;
  priority: string;
  status: string;

  publish_at: string | null;
  expires_at: string | null;

  is_pinned: boolean;

  created_at: string;
  updated_at: string;

  program_name: string | null;
  unit_name: string | null;

  creator_name: string | null;

  is_active: boolean;
};

type Statistics = {
  total: number;
  pinned: number;
  urgent: number;
  high: number;
};

type ChildInfo = {
  applicationId: number;
  course: string | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  announcements?: Announcement[];
  statistics?: Statistics;
  child?: ChildInfo | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_STATISTICS: Statistics = {
  total: 0,
  pinned: 0,
  urgent: 0,
  high: 0,
};

const priorityOptions = [
  {
    value: 'all',
    label: 'All priorities',
  },
  {
    value: 'urgent',
    label: 'Urgent',
  },
  {
    value: 'high',
    label: 'High priority',
  },
  {
    value: 'normal',
    label: 'Normal',
  },
  {
    value: 'low',
    label: 'Low priority',
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not specified';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not specified';
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getPriorityClasses(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'high':
      return 'border-orange-200 bg-orange-50 text-orange-700';

    case 'low':
      return 'border-slate-200 bg-slate-50 text-slate-600';

    default:
      return 'border-blue-200 bg-blue-50 text-blue-700';
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent';

    case 'high':
      return 'High priority';

    case 'low':
      return 'Low priority';

    default:
      return 'Normal';
  }
}

function getPriorityIcon(priority: string) {
  if (priority === 'urgent') {
    return <AlertCircle className="h-4 w-4" />;
  }

  return <Bell className="h-4 w-4" />;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/* =========================================================
   PAGE
========================================================= */

export default function ParentAnnouncementsPage() {
  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [statistics, setStatistics] =
    useState<Statistics>(EMPTY_STATISTICS);

  const [child, setChild] =
    useState<ChildInfo | null>(null);

  const [search, setSearch] =
    useState('');

  const [priority, setPriority] =
    useState('all');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const visibleAnnouncements = announcements;

  /* =======================================================
     LOAD ANNOUNCEMENTS
  ======================================================= */

  const loadAnnouncements = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const params = new URLSearchParams();

        if (search.trim()) {
          params.set(
            'search',
            search.trim()
          );
        }

        if (priority !== 'all') {
          params.set(
            'priority',
            priority
          );
        }

        const queryString =
          params.toString();

        const response = await fetch(
          queryString
            ? `/api/parent/announcements?${queryString}`
            : '/api/parent/announcements',
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        const data =
          (await response.json()) as ApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              'Unable to load announcements.'
          );
        }

        setAnnouncements(
          data.announcements ?? []
        );

        setStatistics(
          data.statistics ?? EMPTY_STATISTICS
        );

        setChild(
          data.child ?? null
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load announcements.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [priority, search]
  );

  /* =======================================================
     INITIAL LOAD / FILTER CHANGE
  ======================================================= */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnnouncements();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAnnouncements]);

  /* =======================================================
     AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        void loadAnnouncements(true);
      }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAnnouncements]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f] text-white shadow-sm">
              <Megaphone className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">
                Announcements
              </h1>

              <p className="text-sm text-slate-500">
                Important updates from Shifah Medical
                Training College.
              </p>
            </div>
          </div>

          {/* CHILD CONTEXT */}

          {child && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-[#0f4f3f]/10 px-3 py-1 font-medium text-[#0f4f3f]">
                Showing announcements for your child
              </span>

              {child.course && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {child.course}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            void loadAnnouncements(true)
          }
          disabled={refreshing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Announcements
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {statistics.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pinned
          </p>

          <p className="mt-2 text-2xl font-bold text-[#0f4f3f]">
            {statistics.pinned}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            High priority
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {statistics.high}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Urgent
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {statistics.urgent}
          </p>
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search announcements..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#0f4f3f] focus:bg-white focus:ring-2 focus:ring-[#0f4f3f]/10"
            />
          </div>

          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0f4f3f] focus:bg-white md:w-52"
          >
            {priorityOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-medium">
              Unable to load announcements
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(
            (item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="h-5 w-1/3 rounded bg-slate-200" />

                <div className="mt-3 h-4 w-full rounded bg-slate-100" />

                <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />

                <div className="mt-4 h-3 w-1/4 rounded bg-slate-100" />
              </div>
            )
          )}
        </div>
      )}

      {/* =====================================================
          EMPTY
      ===================================================== */}

      {!loading &&
        visibleAnnouncements.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Megaphone className="h-6 w-6 text-slate-400" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No announcements
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              There are no announcements matching
              your current search or filter.
            </p>
          </div>
        )}

      {/* =====================================================
          ANNOUNCEMENTS
      ===================================================== */}

      {!loading &&
        visibleAnnouncements.length > 0 && (
          <div className="space-y-3">
            {visibleAnnouncements.map(
              (announcement) => (
                <button
                  key={announcement.id}
                  type="button"
                  onClick={() =>
                    setSelectedAnnouncement(
                      announcement
                    )
                  }
                  className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#0f4f3f]/30 hover:shadow-md sm:p-6"
                >
                  <div className="flex gap-4">
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f] sm:flex">
                      {announcement.priority ===
                      'urgent' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <Megaphone className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {announcement.is_pinned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0f4f3f]/10 px-2.5 py-1 text-xs font-medium text-[#0f4f3f]">
                              <Pin className="h-3 w-3" />
                              Pinned
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                              announcement.priority
                            )}`}
                          >
                            {getPriorityIcon(
                              announcement.priority
                            )}

                            {getPriorityLabel(
                              announcement.priority
                            )}
                          </span>

                          {/* TARGET BADGE */}

                          {announcement.unit_name ? (
                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                              Unit
                            </span>
                          ) : announcement.program_name ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              Program
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              General
                            </span>
                          )}
                        </div>

                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-[#0f4f3f]" />
                      </div>

                      <h2 className="mt-3 text-base font-semibold text-slate-900">
                        {announcement.title}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {stripHtml(
                          announcement.message
                        )}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />

                          {formatDate(
                            announcement.publish_at
                          )}
                        </span>

                        {announcement.program_name && (
                          <span>
                            Program:{' '}
                            {announcement.program_name}
                          </span>
                        )}

                        {announcement.unit_name && (
                          <span>
                            Unit:{' '}
                            {announcement.unit_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        )}

      {/* =====================================================
          DETAIL MODAL
      ===================================================== */}

      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedAnnouncement(null)
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                  <Megaphone className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {selectedAnnouncement.is_pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0f4f3f]/10 px-2.5 py-1 text-xs font-medium text-[#0f4f3f]">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClasses(
                        selectedAnnouncement.priority
                      )}`}
                    >
                      {getPriorityIcon(
                        selectedAnnouncement.priority
                      )}

                      {getPriorityLabel(
                        selectedAnnouncement.priority
                      )}
                    </span>

                    {selectedAnnouncement.unit_name ? (
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                        Unit
                      </span>
                    ) : selectedAnnouncement.program_name ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Program
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        General
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    {selectedAnnouncement.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedAnnouncement(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close announcement"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />

                  {formatDate(
                    selectedAnnouncement.publish_at
                  )}
                </span>

                {selectedAnnouncement.program_name && (
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Program:{' '}
                    {selectedAnnouncement.program_name}
                  </span>
                )}

                {selectedAnnouncement.unit_name && (
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                    Unit:{' '}
                    {selectedAnnouncement.unit_name}
                  </span>
                )}
              </div>

              <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {stripHtml(
                  selectedAnnouncement.message
                )}
              </div>

              {selectedAnnouncement.expires_at && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                  This announcement is available until{' '}
                  <strong>
                    {formatDate(
                      selectedAnnouncement.expires_at
                    )}
                  </strong>
                  .
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
              <button
                type="button"
                onClick={() =>
                  setSelectedAnnouncement(null)
                }
                className="w-full rounded-xl bg-[#0f4f3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c3f32]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}