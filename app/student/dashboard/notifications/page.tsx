"use client";

import {
useCallback,
useEffect,
useMemo,
useState,
} from "react";
import {
AlertCircle,
ArrowRight,
Bell,
BellRing,
BookOpen,
CalendarDays,
Check,
CheckCheck,
ClipboardList,
FileQuestion,
FileText,
GraduationCap,
Info,
Loader2,
Megaphone,
RefreshCw,
Search,
Settings,
WalletCards,
X,
} from "lucide-react";

/* =========================================================
TYPES
========================================================= */

type NotificationType =
| "general"
| "announcement"
| "admission"
| "payment"
| "document"
| "lesson"
| "assignment"
| "quiz"
| "result"
| "timetable"
| "system";

type Notification = {
id: number;
application_id: number;
announcement_id: number | null;
title: string;
message: string;
type: NotificationType | string;
link: string | null;
is_read: boolean;
created_by: number | null;
created_at: string;
read_at: string | null;
created_by_name?: string | null;
created_by_email?: string | null;
};

type NotificationResponse = {
success?: boolean;
notifications?: Notification[];
unreadCount?: number;
totalCount?: number;
message?: string;
};

/* =========================================================
CONSTANTS
========================================================= */

const FILTERS = [
{ value: "all", label: "All" },
{ value: "unread", label: "Unread" },
{ value: "announcement", label: "Announcements" },
{ value: "admission", label: "Admission" },
{ value: "payment", label: "Payments" },
{ value: "assignment", label: "Assignments" },
{ value: "quiz", label: "Quizzes" },
{ value: "result", label: "Results" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

/* =========================================================
HELPERS
========================================================= */

function getNotificationIcon(type: string) {
switch (type) {
case "announcement":
return Megaphone;

case "admission":
  return GraduationCap;

case "payment":
  return WalletCards;

case "document":
  return FileText;

case "assignment":
  return ClipboardList;

case "quiz":
  return FileQuestion;

case "lesson":
  return BookOpen;

case "result":
  return GraduationCap;

case "timetable":
  return CalendarDays;

case "system":
  return Settings;

case "general":
  return Bell;

default:
  return Info;

}
}

function getNotificationStyle(type: string) {
switch (type) {
case "announcement":
return "bg-amber-100 text-amber-700";

case "admission":
  return "bg-indigo-100 text-indigo-700";

case "payment":
  return "bg-emerald-100 text-emerald-700";

case "document":
  return "bg-blue-100 text-blue-700";

case "assignment":
  return "bg-blue-100 text-blue-700";

case "quiz":
  return "bg-purple-100 text-purple-700";

case "lesson":
  return "bg-green-100 text-green-700";

case "result":
  return "bg-green-100 text-green-700";

case "timetable":
  return "bg-cyan-100 text-cyan-700";

case "system":
  return "bg-red-100 text-red-700";

default:
  return "bg-slate-100 text-slate-600";

}
}

function formatNotificationType(type: string) {
return type
.replace(/_/g, " ")
.replace(/\b\w/g, (character) =>
character.toUpperCase()
);
}

function getRelativeTime(dateString: string) {
const date = new Date(dateString);

if (Number.isNaN(date.getTime())) {
return "";
}

const now = new Date();
const difference = now.getTime() - date.getTime();

if (difference < 0) {
return date.toLocaleDateString(undefined, {
day: "numeric",
month: "short",
year: "numeric",
});
}

const seconds = Math.floor(difference / 1000);

if (seconds < 30) {
return "Just now";
}

if (seconds < 60) {
return `${seconds}s ago`;
}

const minutes = Math.floor(seconds / 60);

if (minutes < 60) {
return `${minutes}m ago`;
}

const hours = Math.floor(minutes / 60);

if (hours < 24) {
return `${hours}h ago`;
}

const days = Math.floor(hours / 24);

if (days < 7) {
return `${days}d ago`;
}

return date.toLocaleDateString(undefined, {
day: "numeric",
month: "short",
year:
date.getFullYear() === now.getFullYear()
? undefined
: "numeric",
});
}

function formatFullDate(dateString: string) {
const date = new Date(dateString);

if (Number.isNaN(date.getTime())) {
return "";
}

return date.toLocaleString(undefined, {
day: "numeric",
month: "short",
year: "numeric",
hour: "numeric",
minute: "2-digit",
});
}

function truncateMessage(
message: string,
length = 180
) {
if (message.length <= length) {
return message;
}

return `${message.slice(0, length).trim()}...`;
}

/* =========================================================
PAGE
========================================================= */

export default function StudentNotificationsPage() {
const [notifications, setNotifications] = useState<
Notification[]

> ([]);

const [unreadCount, setUnreadCount] = useState(0);
const [totalCount, setTotalCount] = useState(0);

const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const [error, setError] = useState<string | null>(
null
);

const [filter, setFilter] =
useState<FilterValue>("all");

const [search, setSearch] = useState("");

const [markingAll, setMarkingAll] = useState(false);

const [processingId, setProcessingId] = useState<
number | null

> (null);

/* =======================================================
LOAD NOTIFICATIONS
======================================================= */

const loadNotifications = useCallback(
async (showRefreshState = false) => {
try {
if (showRefreshState) {
setRefreshing(true);
} else {
setLoading(true);
}
    setError(null);

    const params = new URLSearchParams();

    params.set("limit", "100");

    if (
      filter !== "all" &&
      filter !== "unread"
    ) {
      params.set("type", filter);
    }

    if (filter === "unread") {
      params.set("unread", "true");
    }

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    const response = await fetch(
      `/api/student/notifications?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );

    const data =
      (await response.json()) as NotificationResponse;

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message ||
          "Unable to load notifications."
      );
    }

    setNotifications(
      Array.isArray(data.notifications)
        ? data.notifications
        : []
    );

    setUnreadCount(
      Number(data.unreadCount ?? 0)
    );

    setTotalCount(
      Number(data.totalCount ?? 0)
    );
  } catch (loadError) {
    console.error(
      "Student notifications load error:",
      loadError
    );

    setError(
      loadError instanceof Error
        ? loadError.message
        : "Unable to load notifications."
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
},
[filter, search]

);

/* =======================================================
INITIAL LOAD / FILTER CHANGES
======================================================= */

useEffect(() => {
const timer = window.setTimeout(() => {
void loadNotifications(false);
}, 250);


return () => {
  window.clearTimeout(timer);
};


}, [loadNotifications]);

/* =======================================================
POLLING
======================================================= */

useEffect(() => {
const interval = window.setInterval(() => {
if (!document.hidden) {
void loadNotifications(true);
}
}, 15000);

return () => {
  window.clearInterval(interval);
};

}, [loadNotifications]);

/* =======================================================
MARK SINGLE NOTIFICATION
======================================================= */

const markNotification = useCallback(
async (
notification: Notification,
isRead: boolean
) => {
if (processingId === notification.id) {
return;
}
  try {
    setProcessingId(notification.id);

    const response = await fetch(
      "/api/student/notifications",
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: notification.id,
          is_read: isRead,
        }),
      }
    );

    const data =
      (await response.json()) as NotificationResponse;

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message ||
          "Unable to update notification."
      );
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              is_read: isRead,
              read_at: isRead
                ? new Date().toISOString()
                : null,
            }
          : item
      )
    );

    setUnreadCount((current) => {
      if (isRead && !notification.is_read) {
        return Math.max(0, current - 1);
      }

      if (!isRead && notification.is_read) {
        return current + 1;
      }

      return current;
    });
  } catch (updateError) {
    console.error(
      "Notification update error:",
      updateError
    );

    setError(
      updateError instanceof Error
        ? updateError.message
        : "Unable to update notification."
    );
  } finally {
    setProcessingId(null);
  }
},
[processingId]

);

/* =======================================================
MARK ALL AS READ
======================================================= */

const markAllAsRead = useCallback(async () => {
if (markingAll || unreadCount === 0) {
return;
}

try {
  setMarkingAll(true);
  setError(null);

  const response = await fetch(
    "/api/student/notifications",
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        markAllRead: true,
      }),
    }
  );

  const data =
    (await response.json()) as NotificationResponse;

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
        "Unable to mark notifications as read."
    );
  }

  setNotifications((current) =>
    current.map((notification) => ({
      ...notification,
      is_read: true,
      read_at:
        notification.read_at ??
        new Date().toISOString(),
    }))
  );

  setUnreadCount(0);
} catch (updateError) {
  console.error(
    "Mark all notifications error:",
    updateError
  );

  setError(
    updateError instanceof Error
      ? updateError.message
      : "Unable to mark notifications as read."
  );
} finally {
  setMarkingAll(false);
}

}, [markingAll, unreadCount]);

/* =======================================================
DELETE NOTIFICATION
======================================================= */

const deleteNotification = useCallback(
async (notification: Notification) => {
if (processingId === notification.id) {
return;
}

  try {
    setProcessingId(notification.id);

    const response = await fetch(
      `/api/student/notifications?id=${notification.id}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data =
      (await response.json()) as NotificationResponse;

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message ||
          "Unable to delete notification."
      );
    }

    setNotifications((current) =>
      current.filter(
        (item) => item.id !== notification.id
      )
    );

    setTotalCount((current) =>
      Math.max(0, current - 1)
    );

    if (!notification.is_read) {
      setUnreadCount((current) =>
        Math.max(0, current - 1)
      );
    }
  } catch (deleteError) {
    console.error(
      "Notification delete error:",
      deleteError
    );

    setError(
      deleteError instanceof Error
        ? deleteError.message
        : "Unable to delete notification."
    );
  } finally {
    setProcessingId(null);
  }
},
[processingId]

);

/* =======================================================
OPEN NOTIFICATION
======================================================= */

const openNotification = useCallback(
async (notification: Notification) => {
if (!notification.is_read) {
await markNotification(notification, true);
}
  if (notification.link) {
    window.location.href = notification.link;
    return;
  }

  /*
   * Announcement notifications created from
   * lms_announcements use the announcement link
   * supplied by the API. If an older announcement
   * notification has no link, keep the user on this page.
   */
  if (
    notification.type === "announcement" &&
    notification.announcement_id
  ) {
    window.location.href =
      "/student/dashboard/announcements";
  }
},
[markNotification]

);

/* =======================================================
LOCAL COUNTS
======================================================= */

const visibleUnreadCount = useMemo(
() =>
notifications.filter(
(notification) => !notification.is_read
).length,
[notifications]
);

/* =======================================================
RENDER
======================================================= */

return ( <main className="min-h-screen bg-[#f6f8f7]"> <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

    {/* PAGE HEADER */}

    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4f3f] text-white shadow-sm">
            <Bell className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notifications
            </h1>

            <p className="text-sm text-slate-500">
              Stay updated with your student portal.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            void loadNotifications(true)
          }
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>

        <button
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={
            markingAll || unreadCount === 0
          }
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f4f3f] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0c4033] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {markingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="h-4 w-4" />
          )}
          Mark all read
        </button>
      </div>
    </div>

    {/* SUMMARY CARDS */}

    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Bell className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unread
            </p>

            <p className="mt-1 text-2xl font-bold text-[#0f4f3f]">
              {unreadCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
            <BellRing className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Showing
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {notifications.length}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Info className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>

    {/* FILTER / SEARCH */}

    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search notifications..."
          className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => {
          const active = filter === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setFilter(item.value)
              }
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-[#0f4f3f] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}

              {item.value === "unread" &&
                unreadCount > 0 && (
                  <span
                    className={`ml-1.5 ${
                      active
                        ? "text-white"
                        : "text-[#0f4f3f]"
                    }`}
                  >
                    ({unreadCount})
                  </span>
                )}
            </button>
          );
        })}
      </div>
    </div>

    {/* ERROR */}

    {error && (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

        <div className="flex-1">
          <p className="font-semibold">
            Unable to load notifications
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setError(null)}
          className="rounded-md p-1 hover:bg-red-100"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )}

    {/* LOADING */}

    {loading ? (
      <div className="rounded-xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f4f3f]" />

          <p className="mt-3 text-sm font-medium text-slate-600">
            Loading notifications...
          </p>
        </div>
      </div>
    ) : notifications.length === 0 ? (
      /* EMPTY STATE */

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Bell className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-lg font-bold text-slate-900">
          No notifications
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          {search
            ? "No notifications match your search."
            : filter === "unread"
              ? "You have no unread notifications."
              : "You are all caught up. New notifications will appear here when they are available."}
        </p>

        {(search || filter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0f4f3f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c4033]"
          >
            View all notifications
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    ) : (
      /* NOTIFICATION LIST */

      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(
            notification.type
          );

          const iconStyle =
            getNotificationStyle(
              notification.type
            );

          const isProcessing =
            processingId === notification.id;

          return (
            <article
              key={notification.id}
              className={`group rounded-xl border bg-white shadow-sm transition ${
                notification.is_read
                  ? "border-slate-200"
                  : "border-[#cfe2da] bg-[#fbfdfc]"
              }`}
            >
              <div className="flex gap-4 p-4 sm:p-5">

                {/* ICON */}

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* CONTENT */}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-[#d7a93b]" />
                        )}

                        <h2
                          className={`text-sm sm:text-base ${
                            notification.is_read
                              ? "font-semibold text-slate-800"
                              : "font-bold text-slate-900"
                          }`}
                        >
                          {notification.title}
                        </h2>

                        {notification.announcement_id && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Megaphone className="h-3 w-3" />
                            Announcement
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>
                          {formatNotificationType(
                            notification.type
                          )}
                        </span>

                        <span>•</span>

                        <span
                          title={formatFullDate(
                            notification.created_at
                          )}
                        >
                          {getRelativeTime(
                            notification.created_at
                          )}
                        </span>
                      </div>
                    </div>

                    {!notification.is_read && (
                      <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Unread
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {truncateMessage(
                      notification.message
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {notification.link && (
                      <button
                        type="button"
                        onClick={() =>
                          void openNotification(
                            notification
                          )
                        }
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f4f3f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0c4033] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5" />
                        )}

                        Open
                      </button>
                    )}

                    {!notification.is_read ? (
                      <button
                        type="button"
                        onClick={() =>
                          void markNotification(
                            notification,
                            true
                          )
                        }
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}

                        Mark as read
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void markNotification(
                            notification,
                            false
                          )
                        }
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark unread
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        void deleteNotification(
                          notification
                        )
                      }
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}

                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    )}

    {/* FOOTER INFORMATION */}

    {!loading &&
      notifications.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {notifications.length} notification
            {notifications.length === 1 ? "" : "s"}.
          </span>

          <span>
            {visibleUnreadCount > 0
              ? `${visibleUnreadCount} unread in this view`
              : "Everything in this view is read."}
          </span>
        </div>
      )}
  </div>
</main>

);
}
