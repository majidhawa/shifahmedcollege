"use client";

import {
useCallback,
useEffect,
useMemo,
useState,
} from "react";

import {
AlertCircle,
Bell,
CalendarDays,
CheckCircle2,
Clock,
Info,
Loader2,
Megaphone,
Pin,
RefreshCw,
Search,
X,
Zap,
} from "lucide-react";

/* =========================================================
TYPES
========================================================= */

type Priority =
| "low"
| "normal"
| "high"
| "urgent";

type Announcement = {
id: number;
title: string;
message: string;
audience: string;
priority: string;
status: string;

publish_at: string | null;
expires_at: string | null;

is_pinned: boolean;

created_at: string | null;
updated_at: string | null;

created_by: number | null;
created_by_name: string | null;

program_id: number | null;
program_name: string | null;

unit_id: number | null;
unit_name: string | null;
};

type AnnouncementResponse = {
success?: boolean;
announcements?: Announcement[];
totalCount?: number;
statistics?: {
total?: number;
pinned?: number;
urgent?: number;
};
message?: string;
};

/* =========================================================
FILTERS
========================================================= */

const PRIORITY_FILTERS = [
{
value: "all",
label: "All",
},
{
value: "urgent",
label: "Urgent",
},
{
value: "high",
label: "High",
},
{
value: "normal",
label: "Normal",
},
{
value: "low",
label: "Low",
},
] as const;

type PriorityFilter =
(typeof PRIORITY_FILTERS)[number]["value"];

/* =========================================================
HELPERS
========================================================= */

function getPriorityIcon(
priority: string
) {
switch (priority) {
case "urgent":
return Zap;

case "high":
  return AlertCircle;

case "normal":
  return Info;

case "low":
  return CheckCircle2;

default:
  return Info;

}
}

function getPriorityStyle(
priority: string
) {
switch (priority) {
case "urgent":
return {
badge:
"bg-red-100 text-red-700",
icon:
"bg-red-100 text-red-700",
border:
"border-red-200",
};

case "high":
  return {
    badge:
      "bg-orange-100 text-orange-700",
    icon:
      "bg-orange-100 text-orange-700",
    border:
      "border-orange-200",
  };

case "normal":
  return {
    badge:
      "bg-blue-100 text-blue-700",
    icon:
      "bg-blue-100 text-blue-700",
    border:
      "border-slate-200",
  };

case "low":
  return {
    badge:
      "bg-green-100 text-green-700",
    icon:
      "bg-green-100 text-green-700",
    border:
      "border-green-200",
  };

default:
  return {
    badge:
      "bg-slate-100 text-slate-600",
    icon:
      "bg-slate-100 text-slate-600",
    border:
      "border-slate-200",
  };


}
}

function formatPriority(
priority: string
) {
if (!priority) {
return "Normal";
}

return (
priority.charAt(0).toUpperCase() +
priority.slice(1).toLowerCase()
);
}

function formatDate(
value: string | null
) {
if (!value) {
return "";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "";
}

return date.toLocaleString(
undefined,
{
day: "numeric",
month: "short",
year: "numeric",
hour: "numeric",
minute: "2-digit",
}
);
}

function formatRelativeTime(
value: string | null
) {
if (!value) {
return "";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "";
}

const now = new Date();

const difference =
now.getTime() -
date.getTime();

if (difference < 0) {
return formatDate(value);
}

const seconds = Math.floor(
difference / 1000
);

if (seconds < 60) {
return "Just now";
}

const minutes = Math.floor(
seconds / 60
);

if (minutes < 60) {
return `${minutes}m ago`;
}

const hours = Math.floor(
minutes / 60
);

if (hours < 24) {
return `${hours}h ago`;
}

const days = Math.floor(
hours / 24
);

if (days < 7) {
return `${days}d ago`;
}

return date.toLocaleDateString(
undefined,
{
day: "numeric",
month: "short",
year:
date.getFullYear() ===
now.getFullYear()
? undefined
: "numeric",
}
);
}

/* =========================================================
PAGE
========================================================= */

export default function StudentAnnouncementsPage() {
const [announcements, setAnnouncements] =
useState<Announcement[]>([]);

const [totalCount, setTotalCount] =
useState(0);

const [pinnedCount, setPinnedCount] =
useState(0);

const [urgentCount, setUrgentCount] =
useState(0);

const [loading, setLoading] =
useState(true);

const [refreshing, setRefreshing] =
useState(false);

const [error, setError] =
useState<string | null>(null);

const [search, setSearch] =
useState("");

const [priority, setPriority] =
useState<PriorityFilter>("all");

const [pinnedOnly, setPinnedOnly] =
useState(false);

/* =======================================================
LOAD ANNOUNCEMENTS
======================================================= */

const loadAnnouncements =
useCallback(
async (
showRefreshState = false
) => {
try {
if (showRefreshState) {
setRefreshing(true);
} else {
setLoading(true);
}

      setError(null);

      const params =
        new URLSearchParams();

      params.set("limit", "100");

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (priority !== "all") {
        params.set(
          "priority",
          priority
        );
      }

      if (pinnedOnly) {
        params.set(
          "pinned",
          "true"
        );
      }

      const response =
        await fetch(
          `/api/student/announcements?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
              "Cache-Control":
                "no-cache",
            },
          }
        );

      const data =
        (await response.json()) as AnnouncementResponse;

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Unable to load announcements."
        );
      }

      setAnnouncements(
        Array.isArray(
          data.announcements
        )
          ? data.announcements
          : []
      );

      setTotalCount(
        Number(
          data.totalCount ?? 0
        )
      );

      setPinnedCount(
        Number(
          data.statistics
            ?.pinned ?? 0
        )
      );

      setUrgentCount(
        Number(
          data.statistics
            ?.urgent ?? 0
        )
      );
    } catch (loadError) {
      console.error(
        "Student announcements load error:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load announcements."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [
    search,
    priority,
    pinnedOnly,
  ]
);

/* =======================================================
INITIAL LOAD / FILTER CHANGES
======================================================= */

useEffect(() => {
const timer =
window.setTimeout(() => {
void loadAnnouncements(
false
);
}, 250);

return () => {
  window.clearTimeout(
    timer
  );
};


}, [loadAnnouncements]);

/* =======================================================
POLLING
======================================================= */

useEffect(() => {
const interval =
window.setInterval(() => {
if (!document.hidden) {
void loadAnnouncements(
true
);
}
}, 30000);

return () => {
  window.clearInterval(
    interval
  );
};

}, [loadAnnouncements]);

/* =======================================================
LOCAL COUNTS
======================================================= */

const visiblePinnedCount =
useMemo(
() =>
announcements.filter(
(announcement) =>
announcement.is_pinned
).length,
[announcements]
);

/* =======================================================
RENDER
======================================================= */

return ( <main className="min-h-screen bg-[#f6f8f7]"> <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

    {/* =================================================
        HEADER
    ================================================= */}

    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f4f3f] text-white shadow-sm">
            <Megaphone className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Announcements
            </h1>

            <p className="text-sm text-slate-500">
              Stay informed about important
              college and academic updates.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          void loadAnnouncements(
            true
          )
        }
        disabled={refreshing}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          className={`h-4 w-4 ${
            refreshing
              ? "animate-spin"
              : ""
          }`}
        />

        Refresh
      </button>
    </div>

    {/* =================================================
        SUMMARY
    ================================================= */}

    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Announcements
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Megaphone className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pinned
            </p>

            <p className="mt-1 text-2xl font-bold text-[#0f4f3f]">
              {pinnedCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Pin className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Urgent
            </p>

            <p className="mt-1 text-2xl font-bold text-red-600">
              {urgentCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <Zap className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>

    {/* =================================================
        SEARCH / FILTERS
    ================================================= */}

    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search announcements..."
          className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
        />

        {search && (
          <button
            type="button"
            onClick={() =>
              setSearch("")
            }
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRIORITY_FILTERS.map(
            (item) => {
              const active =
                priority ===
                item.value;

              return (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    setPriority(
                      item.value
                    )
                  }
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-[#0f4f3f] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            }
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setPinnedOnly(
              (current) =>
                !current
            )
          }
          className={`inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            pinnedOnly
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Pin className="h-3.5 w-3.5" />

          Pinned only
        </button>
      </div>
    </div>

    {/* =================================================
        ERROR
    ================================================= */}

    {error && (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

        <div className="flex-1">
          <p className="font-semibold">
            Unable to load announcements
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setError(null)
          }
          className="rounded-md p-1 hover:bg-red-100"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )}

    {/* =================================================
        LOADING
    ================================================= */}

    {loading ? (
      <div className="rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f4f3f]" />

          <p className="mt-3 text-sm font-medium text-slate-600">
            Loading announcements...
          </p>
        </div>
      </div>
    ) : announcements.length === 0 ? (
      /* =================================================
         EMPTY
      ================================================= */

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Megaphone className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-lg font-bold text-slate-900">
          No announcements
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {search ||
          priority !== "all" ||
          pinnedOnly
            ? "No announcements match your current filters."
            : "There are no published announcements for you at the moment."}
        </p>

        {(search ||
          priority !== "all" ||
          pinnedOnly) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPriority(
                "all"
              );
              setPinnedOnly(
                false
              );
            }}
            className="mt-5 rounded-lg bg-[#0f4f3f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c4033]"
          >
            Clear filters
          </button>
        )}
      </div>
    ) : (
      /* =================================================
         ANNOUNCEMENT LIST
      ================================================= */

      <div className="space-y-4">
        {announcements.map(
          (announcement) => {
            const priorityStyle =
              getPriorityStyle(
                announcement.priority
              );

            const PriorityIcon =
              getPriorityIcon(
                announcement.priority
              );

            return (
              <article
                key={
                  announcement.id
                }
                className={`rounded-xl border bg-white shadow-sm transition hover:shadow-md ${priorityStyle.border}`}
              >
                <div className="p-5 sm:p-6">

                  {/* TOP ROW */}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${priorityStyle.icon}`}
                      >
                        <PriorityIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {announcement.is_pinned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                              <Pin className="h-3 w-3" />
                              Pinned
                            </span>
                          )}

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${priorityStyle.badge}`}
                          >
                            {formatPriority(
                              announcement.priority
                            )}
                          </span>
                        </div>

                        <h2 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
                          {
                            announcement.title
                          }
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />

                            {formatRelativeTime(
                              announcement.publish_at
                            )}
                          </span>

                          {announcement.publish_at && (
                            <>
                              <span>
                                •
                              </span>

                              <span
                                title={formatDate(
                                  announcement.publish_at
                                )}
                              >
                                {formatDate(
                                  announcement.publish_at
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TARGET */}

                  {(announcement.program_name ||
                    announcement.unit_name) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {announcement.program_name && (
                        <span className="inline-flex items-center rounded-full bg-[#eef5f2] px-3 py-1 text-xs font-semibold text-[#0f4f3f]">
                          {announcement.program_name}
                        </span>
                      )}

                      {announcement.unit_name && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {announcement.unit_name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* MESSAGE */}

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {
                        announcement.message
                      }
                    </p>
                  </div>

                  {/* FOOTER */}

                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />

                        Published{" "}
                        {formatDate(
                          announcement.publish_at
                        )}
                      </span>

                      {announcement.expires_at && (
                        <span>
                          Expires{" "}
                          {formatDate(
                            announcement.expires_at
                          )}
                        </span>
                      )}
                    </div>

                    {announcement.created_by_name && (
                      <span className="text-xs text-slate-400">
                        Posted by{" "}
                        <span className="font-semibold text-slate-600">
                          {
                            announcement.created_by_name
                          }
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          }
        )}
      </div>
    )}

    {/* =================================================
        FOOTER
    ================================================= */}

    {!loading &&
      announcements.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing{" "}
            {
              announcements.length
            }{" "}
            announcement
            {announcements.length ===
            1
              ? ""
              : "s"}
            .
          </span>

          <span>
            {visiblePinnedCount >
            0
              ? `${visiblePinnedCount} pinned in this view`
              : "No pinned announcements in this view."}
          </span>
        </div>
      )}
  </div>
</main>


);
}
