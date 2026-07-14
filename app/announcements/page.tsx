"use client";

import { announcements } from "@/data/announcements";
import {
  CalendarDays,
  Pin,
  Newspaper,
  ArrowRight,
  Bell,
} from "lucide-react";
import Link from "next/link";

export default function AnnouncementsPage() {
  const pinned = announcements.find((item) => item.pinned);
  const news = announcements.filter((item) => !item.pinned);

  return (
    <main className="min-h-screen bg-brand-cream">

      {/* Hero */}

      <section className="bg-gradient-to-r from-brand-green to-green-900 text-white">

        <div className="mx-auto max-w-7xl px-6 py-20">

          <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm">

            <Bell className="mr-2 h-4 w-4" />

            Announcements

          </div>

          <h1 className="mt-6 text-5xl font-bold">
            News & Updates
          </h1>

          <p className="mt-6 max-w-3xl text-lg text-green-100">
            Intakes, events and college updates —
            refreshed regularly.
          </p>

        </div>

      </section>

      {/* Pinned */}

      {pinned && (

        <section className="mx-auto max-w-7xl px-6 py-16">

          <div className="overflow-hidden rounded-3xl bg-white shadow-soft">

            <div className="bg-brand-gold px-8 py-4 text-white">

              <div className="flex items-center gap-2">

                <Pin size={18} />

                <span className="font-semibold uppercase tracking-wider">
                  Pinned Announcement
                </span>

              </div>

            </div>

            <div className="p-10">

              <div className="mb-4 flex items-center gap-2 text-brand-green">

                <CalendarDays size={18} />

                {pinned.date}

              </div>

              <span className="rounded-full bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green">

                {pinned.category}

              </span>

              <h2 className="mt-6 text-4xl font-bold text-brand-dark">

                {pinned.title}

              </h2>

              <p className="mt-6 text-lg leading-8 text-gray-600">

                {pinned.content}

              </p>

            </div>

          </div>

        </section>

      )}

      {/* Timeline */}

      <section className="mx-auto max-w-7xl px-6 pb-20">

        <div className="mb-10 flex items-center gap-3">

          <Newspaper className="text-brand-green" />

          <h2 className="text-3xl font-bold text-brand-dark">

            Recent Updates

          </h2>

        </div>

        <div className="space-y-8">

          {news.map((item) => (

            <div
              key={item.id}
              className="rounded-3xl bg-white p-8 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            >

              <div className="flex flex-col gap-6 md:flex-row md:justify-between">

                <div>

                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">

                    <CalendarDays size={16} />

                    {item.date}

                  </div>

                  <span className="rounded-full bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green">

                    {item.category}

                  </span>

                  <h3 className="mt-6 text-2xl font-bold text-brand-dark">

                    {item.title}

                  </h3>

                  <p className="mt-4 leading-8 text-gray-600">

                    {item.content}

                  </p>

                </div>

                <div className="flex items-center">

                  <button className="flex items-center gap-2 rounded-xl bg-brand-green px-6 py-3 font-semibold text-white transition hover:bg-brand-gold">

                    Read More

                    <ArrowRight size={18} />

                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      </section>

      {/* CTA */}

      <section className="border-t bg-white">

        <div className="mx-auto max-w-7xl px-6 py-20">

          <div className="rounded-3xl bg-gradient-to-r from-brand-green to-green-900 p-10 text-center text-white">

            <h2 className="text-4xl font-bold">

              Never Miss an Update

            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-green-100">

              Stay informed about upcoming intakes,
              campus events, graduation ceremonies,
              partnerships and important college notices.

            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">

              <Link
                href="/apply"
                className="rounded-xl bg-brand-gold px-8 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Apply Now
              </Link>

              <Link
                href="/contact"
                className="rounded-xl border border-white px-8 py-3 font-semibold text-white transition hover:bg-white hover:text-brand-green"
              >
                Contact Admissions
              </Link>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}