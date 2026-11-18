
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Loader2,
  Trash2,
  ClipboardList,
} from 'lucide-react';

type LessonPlan = {
  id: number;
  topic: string;
  lessonDate: string;
  durationMinutes: number | null;
  status: string;
  programName: string;
  unitCode: string | null;
  unitName: string;
  schemeTitle: string | null;
  weekNumber: number | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  lecturerName?: string;
  lessonPlans?: LessonPlan[];
};

export default function LecturerLessonPlansPage() {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadLessonPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/lecturer/lesson-plans', {
        credentials: 'include',
        cache: 'no-store',
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to load lesson plans.',
        );
      }

      setLessonPlans(
        Array.isArray(result.lessonPlans)
          ? result.lessonPlans
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load lesson plans.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLessonPlans();
  }, [loadLessonPlans]);

  async function deleteLessonPlan(id: number) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this lesson plan?',
    );

    if (!confirmed) return;

    try {
      setError('');
      setMessage('');

      const response = await fetch(
        `/api/lecturer/lesson-plans/${id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to delete lesson plan.',
        );
      }

      setMessage(
        result.message || 'Lesson plan deleted successfully.',
      );

      await loadLessonPlans();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete lesson plan.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/lecturer/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green transition hover:text-brand-dark"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-5 rounded-3xl bg-brand-green p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
              Academic Documentation
            </p>

            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Trainer&apos;s Lesson Plans
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Create, view and manage your teaching lesson plans
              in the Shifah Medical Training College portal.
            </p>
          </div>

          <Link
            href="/lecturer/dashboard/lesson-plans/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-green transition hover:bg-brand-gold hover:text-brand-dark"
          >
            <FilePlus2 className="h-4 w-4" />
            Create Lesson Plan
          </Link>
        </div>

        {message && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <section className="mt-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-brand-green/10 p-3 text-brand-green">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-brand-dark">
                My Lesson Plans
              </h2>

              <p className="text-sm text-slate-500">
                Lesson plans created under your lecturer account.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Loading lesson plans...
              </div>
            </div>
          ) : lessonPlans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-soft">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 text-lg font-bold text-brand-dark">
                No lesson plans created yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Start by creating a lesson plan for one of your
                assigned programmes.
              </p>

              <Link
                href="/lecturer/dashboard/lesson-plans/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
              >
                <FilePlus2 className="h-4 w-4" />
                Create your first lesson plan
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Lesson Title</th>
                      <th className="px-5 py-4">Programme / Unit</th>
                      <th className="px-5 py-4">Lesson Date</th>
                      <th className="px-5 py-4">Duration</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {lessonPlans.map((plan) => (
                      <tr
                        key={plan.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-brand-dark">
                            {plan.topic || 'Untitled lesson'}
                          </p>

                          {plan.schemeTitle && (
                            <p className="mt-1 text-xs text-slate-500">
                              {plan.schemeTitle}
                              {plan.weekNumber
                                ? ` · Week ${plan.weekNumber}`
                                : ''}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {plan.programName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {plan.unitCode
                              ? `${plan.unitCode} — `
                              : ''}
                            {plan.unitName}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {plan.lessonDate || 'No date'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {plan.durationMinutes ? (
                            <span className="inline-flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              {plan.durationMinutes} min
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                              plan.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {plan.status || 'draft'}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              href={`/lecturer/dashboard/lesson-plans/${plan.id}`}
                              title="View or edit lesson plan"
                              className="inline-flex items-center gap-1 font-semibold text-brand-green transition hover:text-brand-dark"
                            >
                              <Eye className="h-4 w-4" />
                              View / Edit
                            </Link>

                            <a
                              href={`/api/lecturer/lesson-plans/${plan.id}/pdf`}
                              title="Download lesson plan PDF"
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 transition hover:text-blue-800"
                            >
                              <Download className="h-4 w-4" />
                              Download PDF
                            </a>

                            <button
                              type="button"
                              title="Delete lesson plan"
                              onClick={() =>
                                void deleteLessonPlan(plan.id)
                              }
                              className="inline-flex items-center gap-1 font-semibold text-red-600 transition hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
