
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  FilePlus2,
  FileText,
  PencilLine,
} from 'lucide-react';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Scheme = {
  id: string | number;
  title: string | null;
  academic_year: string | null;
  term: string | null;
  status: string | null;
  updated_at: string | Date;
  program_id: string | number | null;
  unit_id: string | number | null;
};

export default async function SchemesOfWorkPage() {
  const lecturer = await requireLecturer();

  if (!lecturer) {
    redirect('/lecturer/login');
  }

  let schemes: Scheme[] = [];

  try {
    const result = await pool.query(
      `SELECT
          id,
          title,
          academic_year,
          term,
          status,
          updated_at,
          program_id,
          unit_id
       FROM lms_schemes_of_work
       WHERE lecturer_id = $1
       ORDER BY updated_at DESC`,
      [lecturer.id]
    );

    schemes = result.rows;
  } catch (error) {
    console.error('Load schemes of work page:', error);
  }

  const getStatusStyles = (status: string | null) => {
    switch ((status || 'draft').toLowerCase()) {
      case 'published':
        return 'bg-green-100 text-green-700';

      case 'approved':
        return 'bg-green-100 text-green-700';

      case 'submitted':
        return 'bg-blue-100 text-blue-700';

      case 'rejected':
        return 'bg-red-100 text-red-700';

      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Back to Dashboard */}
        <Link
          href="/lecturer/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green transition hover:text-brand-dark"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="mt-6 flex flex-col gap-5 rounded-3xl bg-brand-green p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
              Academic Documentation
            </p>

            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Schemes of Work
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Prepare, manage and maintain your official Schemes of Work
              according to the Shifah Medical Training College format.
              Download your schemes whenever you need them.
            </p>
          </div>

          <Link
            href="/lecturer/dashboard/schemes/create"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-green transition hover:bg-brand-gold hover:text-brand-dark"
          >
            <FilePlus2 className="h-4 w-4" />
            Create Scheme
          </Link>
        </div>

        {/* Schemes Section */}
        <section className="mt-8">

          {/* Section Heading */}
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-brand-green/10 p-3 text-brand-green">
              <ClipboardList className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-brand-dark">
                My Schemes of Work
              </h2>

              <p className="text-sm text-slate-500">
                Only schemes created under your lecturer account are displayed.
              </p>
            </div>
          </div>

          {/* Empty State */}
          {schemes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-soft">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 text-lg font-bold text-brand-dark">
                No schemes created yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                You have not created any Schemes of Work. Start by preparing
                one for your assigned programme or competency area.
              </p>

              <Link
                href="/lecturer/dashboard/schemes/create"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
              >
                <FilePlus2 className="h-4 w-4" />
                Create your first scheme
              </Link>
            </div>
          ) : (

            /* Schemes Table */
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Scheme Title</th>
                      <th className="px-5 py-4">Academic Year</th>
                      <th className="px-5 py-4">Term</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Last Updated</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {schemes.map((scheme) => (
                      <tr
                        key={scheme.id}
                        className="transition hover:bg-slate-50/70"
                      >

                        <td className="px-5 py-4">
                          <p className="font-bold text-brand-dark">
                            {scheme.title || 'Untitled Scheme of Work'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Scheme ID: {scheme.id}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {scheme.academic_year || '—'}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {scheme.term || '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(
                              scheme.status
                            )}`}
                          >
                            {(scheme.status || 'DRAFT').toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {new Date(scheme.updated_at).toLocaleDateString(
                            'en-GB',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">

                            {/* Edit Scheme */}
                            <Link
                              title="Edit scheme"
                              href={`/lecturer/dashboard/schemes/${scheme.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-brand-green transition hover:text-brand-dark"
                            >
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Link>

                            {/* Download Scheme PDF */}
                            <a
                              title="Download scheme as PDF"
                              href={`/api/lecturer/schemes/${scheme.id}/pdf`}
                              className="inline-flex items-center gap-1 font-semibold text-slate-600 transition hover:text-brand-green"
                            >
                              <Download className="h-4 w-4" />
                              PDF
                            </a>

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
