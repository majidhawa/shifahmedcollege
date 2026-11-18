import Link from 'next/link';
import { ArrowLeft, ClipboardList, Download, FilePlus2, FileText, PencilLine } from 'lucide-react';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function RecordsOfWorkPage() {
  const lecturer = await requireLecturer();
  if (!lecturer) redirect('/lecturer/login');

  let records: Array<Record<string, any>> = [];
  try {
    const result = await pool.query(
      `SELECT id, reference_number, program_name, unit_name, competency_area, intake, status, updated_at
       FROM lms_records_of_work WHERE lecturer_id = $1 ORDER BY updated_at DESC`,
      [lecturer.id]
    );
    records = result.rows;
  } catch (error) {
    console.error('Load records of work page:', error);
  }

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/lecturer/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-dark">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-5 rounded-3xl bg-brand-green p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Academic Documentation</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Records of Work Covered</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Create and maintain your official teaching records. Download each record in the Shifah Medical Training College format.</p>
          </div>
          <Link href="/lecturer/dashboard/records-of-work/create" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-green transition hover:bg-brand-gold hover:text-brand-dark">
            <FilePlus2 className="h-4 w-4" /> Create Record
          </Link>
        </div>

        <section className="mt-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-brand-green/10 p-3 text-brand-green"><ClipboardList className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-brand-dark">My Records</h2><p className="text-sm text-slate-500">Only records created under your lecturer account are displayed.</p></div>
          </div>

          {records.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-soft">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-4 text-lg font-bold text-brand-dark">No records created yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Start by creating a Record of Work Covered for one of your assigned programmes.</p>
              <Link href="/lecturer/dashboard/records-of-work/create" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white hover:bg-brand-dark"><FilePlus2 className="h-4 w-4" /> Create your first record</Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Programme / Unit</th><th className="px-5 py-4">Competency Area</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Last Updated</th><th className="px-5 py-4">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-bold text-brand-dark">{record.reference_number}</td>
                        <td className="px-5 py-4"><p className="font-semibold text-slate-800">{record.program_name}</p><p className="mt-1 text-xs text-slate-500">{record.unit_name || 'No unit specified'}{record.intake ? ` · ${record.intake}` : ''}</p></td>
                        <td className="px-5 py-4 text-slate-600">{record.competency_area || '—'}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${record.status === 'APPROVED' ? 'bg-green-100 text-green-700' : record.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{record.status}</span></td>
                        <td className="px-5 py-4 text-slate-500">{new Date(record.updated_at).toLocaleDateString('en-GB')}</td>
                        <td className="px-5 py-4"><div className="flex items-center gap-3"><Link title="Edit record" href={`/lecturer/dashboard/records-of-work/${record.id}`} className="inline-flex items-center gap-1 font-semibold text-brand-green hover:text-brand-dark"><PencilLine className="h-4 w-4" /> Edit</Link><a title="Download PDF" href={`/api/lecturer/records-of-work/${record.id}/pdf`} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-brand-green"><Download className="h-4 w-4" /> PDF</a></div></td>
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
