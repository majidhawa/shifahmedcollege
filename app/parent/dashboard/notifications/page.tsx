'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Notification = {
  id: number;
  parent_id: number;
  application_id: number | null;
  announcement_id: number | null;
  application_number: string | null;
  child_name: string | null;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_by: number | null;
  created_by_name?: string | null;
  created_by_email?: string | null;
  created_at: string;
  read_at: string | null;

  announcement_status?: string | null;
  announcement_priority?: string | null;
  announcement_audience?: string | null;
  announcement_publish_at?: string | null;
  announcement_expires_at?: string | null;
  announcement_is_pinned?: boolean | null;
};

type NotificationsResponse = {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  message?: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const NOTIFICATION_TYPES = [
  {
    value: 'all',
    label: 'All notifications',
  },
  {
    value: 'general',
    label: 'General',
  },
  {
    value: 'announcement',
    label: 'Announcements',
  },
  {
    value: 'application',
    label: 'Application',
  },
  {
    value: 'payment',
    label: 'Payments',
  },
  {
    value: 'admission',
    label: 'Admission',
  },
  {
    value: 'document',
    label: 'Documents',
  },
  {
    value: 'academic',
    label: 'Academic',
  },
  {
    value: 'event',
    label: 'Events',
  },
  {
    value: 'system',
    label: 'System',
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getNotificationIcon(type: string) {
  switch (type) {
    case 'announcement':
      return Megaphone;

    case 'payment':
      return WalletCards;

    case 'admission':
      return GraduationCap;

    case 'document':
      return FileText;

    case 'academic':
      return GraduationCap;

    case 'event':
      return CalendarDays;

    case 'system':
      return BellRing;

    default:
      return Info;
  }
}

function getNotificationTypeLabel(type: string) {
  const found = NOTIFICATION_TYPES.find(
    (item) => item.value === type
  );

  return found?.label ?? 'Notification';
}

function getNotificationTypeClasses(type: string) {
  switch (type) {
    case 'announcement':
      return 'border-purple-200 bg-purple-50 text-purple-700';

    case 'payment':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'admission':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'document':
      return 'border-orange-200 bg-orange-50 text-orange-700';

    case 'academic':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';

    case 'event':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';

    case 'system':
      return 'border-slate-200 bg-slate-100 text-slate-700';

    default:
      return 'border-green-200 bg-green-50 text-green-700';
  }
}

function getPriorityClasses(
  priority: string | null | undefined
) {
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

function getPriorityLabel(
  priority: string | null | undefined
) {
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const difference =
    Date.now() - date.getTime();

  const seconds = Math.floor(
    difference / 1000
  );

  if (seconds < 60) {
    return 'Just now';
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

  return formatDate(value);
}

/* =========================================================
   PAGE
========================================================= */

export default function ParentNotificationsPage() {
  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    totalCount,
    setTotalCount,
  ] = useState(0);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState('all');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    processingId,
    setProcessingId,
  ] = useState<number | null>(null);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [
    selectedNotification,
    setSelectedNotification,
  ] = useState<Notification | null>(
    null
  );

  /* =======================================================
     LOAD NOTIFICATIONS
  ======================================================= */

  const loadNotifications =
    useCallback(
      async (
        showRefresh = false
      ) => {
        try {
          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError('');

          const params =
            new URLSearchParams();

          params.set(
            'limit',
            '100'
          );

          if (
            typeFilter !== 'all'
          ) {
            params.set(
              'type',
              typeFilter
            );
          }

          if (search.trim()) {
            params.set(
              'search',
              search.trim()
            );
          }

          const response =
            await fetch(
              `/api/parent/notifications?${params.toString()}`,
              {
                method: 'GET',
                cache: 'no-store',
              }
            );

          const data =
            (await response.json()) as NotificationsResponse;

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ??
                'Unable to load notifications.'
            );
          }

          setNotifications(
            data.notifications ?? []
          );

          setUnreadCount(
            data.unreadCount ?? 0
          );

          setTotalCount(
            data.totalCount ?? 0
          );
        } catch (err) {
          console.error(
            'Load parent notifications error:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load notifications.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        search,
        typeFilter,
      ]
    );

  /* =======================================================
     INITIAL LOAD + FILTERS
  ======================================================= */

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          void loadNotifications();
        },
        250
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [loadNotifications]);

  /* =======================================================
     AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          void loadNotifications(
            true
          );
        },
        60000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadNotifications]);

  /* =======================================================
     MARK READ / UNREAD
  ======================================================= */

  const updateNotification =
    async (
      notification: Notification,
      isRead: boolean
    ) => {
      try {
        setProcessingId(
          notification.id
        );

        setError('');

        const response =
          await fetch(
            '/api/parent/notifications',
            {
              method: 'PATCH',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                id: notification.id,
                is_read: isRead,
              }),
            }
          );

        const data =
          (await response.json()) as {
            success: boolean;
            message?: string;
            notification?: Notification;
          };

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ??
              'Unable to update notification.'
          );
        }

        const updatedNotification =
          data.notification ??
          {
            ...notification,
            is_read: isRead,
            read_at: isRead
              ? new Date().toISOString()
              : null,
          };

        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      ...updatedNotification,
                      is_read:
                        isRead,
                      read_at:
                        isRead
                          ? updatedNotification.read_at ??
                            new Date().toISOString()
                          : null,
                    }
                  : item
            )
        );

        setUnreadCount(
          (current) => {
            if (
              isRead &&
              !notification.is_read
            ) {
              return Math.max(
                0,
                current - 1
              );
            }

            if (
              !isRead &&
              notification.is_read
            ) {
              return current + 1;
            }

            return current;
          }
        );

        setSelectedNotification(
          (current) =>
            current?.id ===
            notification.id
              ? {
                  ...current,
                  ...updatedNotification,
                  is_read:
                    isRead,
                  read_at:
                    isRead
                      ? updatedNotification.read_at ??
                        new Date().toISOString()
                      : null,
                }
              : current
        );

        return {
          ...updatedNotification,
          is_read: isRead,
          read_at: isRead
            ? updatedNotification.read_at ??
              new Date().toISOString()
            : null,
        } as Notification;
      } catch (err) {
        console.error(
          'Update parent notification error:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to update notification.'
        );

        return null;
      } finally {
        setProcessingId(null);
      }
    };

  /* =======================================================
     MARK ALL READ
  ======================================================= */

  const markAllAsRead =
    async () => {
      if (
        unreadCount === 0
      ) {
        return;
      }

      try {
        setMarkingAll(true);
        setError('');

        const response =
          await fetch(
            '/api/parent/notifications',
            {
              method: 'PATCH',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                markAllRead: true,
              }),
            }
          );

        const data =
          (await response.json()) as {
            success: boolean;
            message?: string;
          };

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ??
              'Unable to mark notifications as read.'
          );
        }

        const now =
          new Date().toISOString();

        setNotifications(
          (current) =>
            current.map(
              (notification) => ({
                ...notification,
                is_read: true,
                read_at:
                  notification.read_at ??
                  now,
              })
            )
        );

        setUnreadCount(0);

        setSelectedNotification(
          (current) =>
            current
              ? {
                  ...current,
                  is_read: true,
                  read_at:
                    current.read_at ??
                    now,
                }
              : current
        );
      } catch (err) {
        console.error(
          'Mark all parent notifications read error:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to mark notifications as read.'
        );
      } finally {
        setMarkingAll(false);
      }
    };

  /* =======================================================
     OPEN NOTIFICATION
  ======================================================= */

  const openNotification =
    async (
      notification: Notification
    ) => {
      let notificationToOpen =
        notification;

      if (
        !notification.is_read
      ) {
        const updated =
          await updateNotification(
            notification,
            true
          );

        if (updated) {
          notificationToOpen =
            updated;
        } else {
          return;
        }
      }

      if (
        notificationToOpen.link
      ) {
        window.location.href =
          notificationToOpen.link;

        return;
      }

      setSelectedNotification(
        notificationToOpen
      );
    };

  /* =======================================================
     DISPLAYED NOTIFICATIONS
  ======================================================= */

  const displayedNotifications =
    useMemo(
      () => notifications,
      [notifications]
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                <Bell className="h-7 w-7" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Notifications
                  </h1>

                  {unreadCount >
                    0 && (
                    <span className="rounded-full bg-[#0f4f3f] px-3 py-1 text-xs font-bold text-white">
                      {unreadCount}{' '}
                      unread
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Stay updated with important information about your child, payments, admission and the college.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void loadNotifications(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

              <button
                type="button"
                onClick={() =>
                  void markAllAsRead()
                }
                disabled={
                  markingAll ||
                  unreadCount === 0
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c1f1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Mark all as read
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Unable to load notifications
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError('')
              }
              className="text-red-500 hover:text-red-700"
              aria-label="Dismiss error"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* =================================================
            FILTERS
        ================================================= */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#0f4f3f] focus:bg-white focus:ring-2 focus:ring-[#0f4f3f]/10"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-[#0f4f3f] focus:ring-2 focus:ring-[#0f4f3f]/10"
            >
              {NOTIFICATION_TYPES.map(
                (item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              {totalCount}{' '}
              notification
              {totalCount === 1
                ? ''
                : 's'}{' '}
              in total
            </span>

            {unreadCount >
              0 && (
              <>
                <span>•</span>
                <span className="font-semibold text-[#0f4f3f]">
                  {unreadCount}{' '}
                  unread
                </span>
              </>
            )}
          </div>
        </section>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#0f4f3f]" />
                Loading notifications...
              </div>
            </div>
          ) : displayedNotifications.length ===
            0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-900">
                No notifications
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                You do not have any notifications matching the selected filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedNotifications.map(
                (
                  notification
                ) => {
                  const Icon =
                    getNotificationIcon(
                      notification.type
                    );

                  return (
                    <button
                      key={
                        notification.id
                      }
                      type="button"
                      onClick={() =>
                        void openNotification(
                          notification
                        )
                      }
                      className={`group block w-full text-left transition hover:bg-slate-50 ${
                        notification.is_read
                          ? 'bg-white'
                          : 'bg-[#0f4f3f]/[0.025]'
                      }`}
                    >
                      <div className="flex gap-4 p-5 sm:p-6">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getNotificationTypeClasses(
                            notification.type
                          )}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {!notification.is_read && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-[#0f4f3f]" />
                                )}

                                <h3
                                  className={`truncate text-sm ${
                                    notification.is_read
                                      ? 'font-semibold text-slate-800'
                                      : 'font-bold text-slate-950'
                                  }`}
                                >
                                  {
                                    notification.title
                                  }
                                </h3>

                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getNotificationTypeClasses(
                                    notification.type
                                  )}`}
                                >
                                  {getNotificationTypeLabel(
                                    notification.type
                                  )}
                                </span>

                                {notification.announcement_id && (
                                  <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                                    Announcement
                                  </span>
                                )}

                                {notification.announcement_id &&
                                  notification.announcement_priority &&
                                  notification.announcement_priority !==
                                    'normal' && (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPriorityClasses(
                                        notification.announcement_priority
                                      )}`}
                                    >
                                      {getPriorityLabel(
                                        notification.announcement_priority
                                      )}
                                    </span>
                                  )}

                                {notification.announcement_id &&
                                  notification.announcement_is_pinned && (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Pinned
                                    </span>
                                  )}
                              </div>

                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                {
                                  notification.message
                                }
                              </p>

                              {notification.child_name && (
                                <p className="mt-2 text-xs font-medium text-slate-500">
                                  My Child:{' '}
                                  {
                                    notification.child_name
                                  }
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                              <span>
                                {formatRelativeTime(
                                  notification.created_at
                                )}
                              </span>

                              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>

      {/* ===================================================
          DETAIL MODAL
      =================================================== */}

      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getNotificationTypeClasses(
                    selectedNotification.type
                  )}`}
                >
                  {(() => {
                    const Icon =
                      getNotificationIcon(
                        selectedNotification.type
                      );

                    return (
                      <Icon className="h-5 w-5" />
                    );
                  })()}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getNotificationTypeClasses(
                        selectedNotification.type
                      )}`}
                    >
                      {getNotificationTypeLabel(
                        selectedNotification.type
                      )}
                    </span>

                    {selectedNotification.announcement_id && (
                      <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700">
                        Announcement
                      </span>
                    )}

                    {selectedNotification.announcement_id &&
                      selectedNotification.announcement_priority &&
                      selectedNotification.announcement_priority !==
                        'normal' && (
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${getPriorityClasses(
                            selectedNotification.announcement_priority
                          )}`}
                        >
                          {getPriorityLabel(
                            selectedNotification.announcement_priority
                          )}
                        </span>
                      )}
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {
                      selectedNotification.title
                    }
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedNotification(
                    null
                  )
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close notification"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5 sm:p-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {
                  selectedNotification.message
                }
              </p>

              <div className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4">
                {selectedNotification.child_name && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      My Child
                    </span>

                    <span className="text-right font-semibold text-slate-800">
                      {
                        selectedNotification.child_name
                      }
                    </span>
                  </div>
                )}

                {selectedNotification.application_number && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      Application
                    </span>

                    <span className="text-right font-semibold text-slate-800">
                      {
                        selectedNotification.application_number
                      }
                    </span>
                  </div>
                )}

                {selectedNotification.announcement_priority && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      Priority
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getPriorityClasses(
                        selectedNotification.announcement_priority
                      )}`}
                    >
                      {getPriorityLabel(
                        selectedNotification.announcement_priority
                      )}
                    </span>
                  </div>
                )}

                {selectedNotification.announcement_publish_at && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      Published
                    </span>

                    <span className="text-right font-semibold text-slate-800">
                      {formatDate(
                        selectedNotification.announcement_publish_at
                      )}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-500">
                    Date
                  </span>

                  <span className="text-right font-semibold text-slate-800">
                    {formatDate(
                      selectedNotification.created_at
                    )}
                  </span>
                </div>
              </div>

              {selectedNotification.link && (
                <a
                  href={
                    selectedNotification.link
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c1f1a]"
                >
                  Open related page
                  <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-500">
                {selectedNotification.is_read
                  ? 'Read'
                  : 'Unread'}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    processingId ===
                    selectedNotification.id
                  }
                  onClick={() =>
                    void updateNotification(
                      selectedNotification,
                      !selectedNotification.is_read
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {processingId ===
                  selectedNotification.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}

                  {selectedNotification.is_read
                    ? 'Mark unread'
                    : 'Mark as read'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedNotification(
                      null
                    )
                  }
                  className="rounded-xl bg-[#0f4f3f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c1f1a]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}