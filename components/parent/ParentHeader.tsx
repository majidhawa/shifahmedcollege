'use client';

import Link from 'next/link';
import {
  Bell,
  Menu,
  UserRound,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

type ParentHeaderProps = {
  parentName: string;
  parentInitial: string;
  onOpenMenu: () => void;
};

type NotificationResponse = {
  notifications?: Array<{
    id: number;
    is_read: boolean;
  }>;
  unreadCount?: number;
  totalCount?: number;
};

export default function ParentHeader({
  parentName,
  parentInitial,
  onOpenMenu,
}: ParentHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotificationCount = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/parent/notifications?limit=100',
        {
          method: 'GET',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        return;
      }

      const data =
        (await response.json()) as NotificationResponse;

      if (typeof data.unreadCount === 'number') {
        setUnreadCount(Math.max(0, data.unreadCount));
        return;
      }

      if (Array.isArray(data.notifications)) {
        const count = data.notifications.filter(
          (notification) => !notification.is_read
        ).length;

        setUnreadCount(count);
      }
    } catch {
      // Keep the existing count if the request fails.
    }
  }, []);

  useEffect(() => {
    void loadNotificationCount();

    const interval = window.setInterval(() => {
      void loadNotificationCount();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadNotificationCount]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">

        <div className="flex min-w-0 items-center gap-3">

          {/* =================================================
              MOBILE MENU
          ================================================== */}

          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-brand-dark transition hover:bg-slate-50 lg:hidden"
            aria-label="Open parent menu"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0">

            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-green">
              Parent Portal
            </p>

            <h1 className="mt-1 truncate text-xl font-bold text-brand-dark sm:text-2xl">
              Welcome Back
              {parentName
                ? `, ${parentName}`
                : ''}
            </h1>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              Monitor your child&apos;s progress
              and college information.
            </p>

          </div>

        </div>

        {/* =================================================
            NOTIFICATIONS + PROFILE
        ================================================== */}

        <div className="flex shrink-0 items-center gap-3">

          {/* =================================================
              NOTIFICATION BELL
          ================================================== */}

          <Link
            href="/parent/dashboard/notifications"
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : 'Notifications'
            }
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-brand-dark transition hover:bg-slate-50"
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -right-1
                  -top-1
                  flex
                  min-h-[20px]
                  min-w-[20px]
                  items-center
                  justify-center
                  rounded-full
                  bg-red-500
                  px-1
                  text-[10px]
                  font-bold
                  leading-none
                  text-white
                  ring-2
                  ring-white
                "
              >
                {unreadCount > 99
                  ? '99+'
                  : unreadCount}
              </span>
            )}
          </Link>

          {/* =================================================
              PROFILE
          ================================================== */}

          <div className="hidden text-right sm:block">

            <p className="text-sm font-bold text-brand-dark">
              {parentName}
            </p>

            <p className="text-xs text-slate-400">
              Parent Account
            </p>

          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
            {parentInitial}
          </div>

        </div>

      </div>
    </header>
  );
}