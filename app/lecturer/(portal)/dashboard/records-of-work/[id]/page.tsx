import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import RecordOfWorkForm from '../record-of-work-form';
import { requireLecturer } from '@/lib/lecturer-auth';
import { redirect, notFound } from 'next/navigation';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function EditRecordOfWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const lecturer = await requireLecturer();
  if (!lecturer) redirect('/lecturer/login');
  const { id } = await params;
  const result = await pool.query(`SELECT * FROM lms_records_of_work WHERE id=$1 AND lecturer_id=$2 LIMIT 1`, [Number(id), lecturer.id]);
  if (!result.rowCount) notFound();
  const record = result.rows[0];
  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/lecturer/dashboard/records-of-work" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-dark"><ArrowLeft className="h-4 w-4" /> Back to Records</Link>
        <div className="mb-6 mt-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">{record.reference_number}</p><h1 className="mt-1 text-2xl font-bold text-brand-dark sm:text-3xl">Edit Record of Work</h1><p className="mt-2 text-sm text-slate-500">Update your teaching entries and download the official PDF.</p></div>
        <RecordOfWorkForm lecturer={{ name: lecturer.name || '', email: lecturer.email || '', phone: lecturer.phone || '' }} initialRecord={JSON.parse(JSON.stringify(record))} />
      </div>
    </main>
  );
}
