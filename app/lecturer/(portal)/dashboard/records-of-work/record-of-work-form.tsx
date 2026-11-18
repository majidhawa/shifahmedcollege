'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2, Download, Loader2 } from 'lucide-react';

type Entry = { date: string; topic: string; subTopic: string; remarks: string };
type Option = { id: number; name: string; level?: string };
type RecordData = {
  id: number; reference_number: string; program_id: number; unit_id: number | null;
  program_name: string; course_level: string; unit_name: string; trainer_name: string;
  trainer_phone: string; trainer_email: string; competency_area: string; intake: string;
  student_count: number | null; record_date: string | null; record_time: string;
  supervisor_name: string; supervisor_signature: string; entries: Entry[]; status: string;
};

export default function RecordOfWorkForm({ lecturer, initialRecord }: {
  lecturer: { name: string; email: string; phone: string };
  initialRecord?: RecordData;
}) {
  const router = useRouter();
  const [programs, setPrograms] = useState<Option[]>([]);
  const [units, setUnits] = useState<Option[]>([]);
  const [programId, setProgramId] = useState(initialRecord?.program_id ? String(initialRecord.program_id) : '');
  const [unitId, setUnitId] = useState(initialRecord?.unit_id ? String(initialRecord.unit_id) : '');
  const [programName, setProgramName] = useState(initialRecord?.program_name || '');
  const [unitName, setUnitName] = useState(initialRecord?.unit_name || '');
  const [courseLevel, setCourseLevel] = useState(initialRecord?.course_level || '');
  const [trainerName, setTrainerName] = useState(initialRecord?.trainer_name || lecturer.name);
  const [trainerPhone, setTrainerPhone] = useState(initialRecord?.trainer_phone || lecturer.phone);
  const [trainerEmail, setTrainerEmail] = useState(initialRecord?.trainer_email || lecturer.email);
  const [competencyArea, setCompetencyArea] = useState(initialRecord?.competency_area || '');
  const [intake, setIntake] = useState(initialRecord?.intake || '');
  const [studentCount, setStudentCount] = useState(initialRecord?.student_count == null ? '' : String(initialRecord.student_count));
  const [recordDate, setRecordDate] = useState(initialRecord?.record_date ? String(initialRecord.record_date).slice(0, 10) : '');
  const [recordTime, setRecordTime] = useState(initialRecord?.record_time || '');
  const [supervisorName, setSupervisorName] = useState(initialRecord?.supervisor_name || '');
  const [supervisorSignature, setSupervisorSignature] = useState(initialRecord?.supervisor_signature || '');
  const [entries, setEntries] = useState<Entry[]>(initialRecord?.entries?.length ? initialRecord.entries : [{ date: '', topic: '', subTopic: '', remarks: '' }]);
  const [status, setStatus] = useState(initialRecord?.status || 'DRAFT');
  const [loading, setLoading] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/lecturer/records-of-work', { cache: 'no-store' })
      .then(async (r) => { const data = await r.json(); if (!r.ok || !data.success) throw new Error(data.message || 'Unable to load programmes.'); setPrograms(data.programs || []); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!programId) { setUnits([]); return; }
    setLoadingUnits(true);
    fetch(`/api/lecturer/records-of-work?programId=${encodeURIComponent(programId)}`, { cache: 'no-store' })
      .then(async (r) => { const data = await r.json(); if (!r.ok || !data.success) throw new Error(data.message || 'Unable to load units.'); setUnits(data.units || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingUnits(false));
  }, [programId]);

  function updateEntry(index: number, key: keyof Entry, value: string) {
    setEntries((current) => current.map((entry, i) => i === index ? { ...entry, [key]: value } : entry));
  }
  function addEntry() { setEntries((current) => [...current, { date: '', topic: '', subTopic: '', remarks: '' }]); }
  function removeEntry(index: number) { setEntries((current) => current.length === 1 ? current : current.filter((_, i) => i !== index)); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    const selectedProgram = programs.find((p) => String(p.id) === programId);
    const selectedUnit = units.find((u) => String(u.id) === unitId);
    const payload = {
      programId: Number(programId), unitId: unitId ? Number(unitId) : null,
      programName: selectedProgram?.name || programName,
      unitName: selectedUnit?.name || (unitId ? unitName : ''), courseLevel: courseLevel || selectedProgram?.level || '',
      trainerName, trainerPhone, trainerEmail, competencyArea, intake,
      studentCount: studentCount ? Number(studentCount) : null,
      recordDate: recordDate || null, recordTime, supervisorName, supervisorSignature,
      entries: entries.filter((entry) => entry.date || entry.topic || entry.subTopic || entry.remarks), status,
    };
    try {
      const response = await fetch(initialRecord ? `/api/lecturer/records-of-work/${initialRecord.id}` : '/api/lecturer/records-of-work', {
        method: initialRecord ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save record.');
      router.push(`/lecturer/dashboard/records-of-work/${data.record.id || initialRecord?.id}`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save record.'); }
    finally { setLoading(false); }
  }

  const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10';
  const label = 'block text-xs font-bold uppercase tracking-wide text-slate-600';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-brand-dark">Trainer and Course Information</h2><p className="mt-1 text-sm text-slate-500">Official details displayed on the PDF.</p></div>{initialRecord && <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">{initialRecord.reference_number}</span>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Trainer's Name *<input required value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className={field} /></label>
          <label className={label}>Trainer's Telephone<input value={trainerPhone} onChange={(e) => setTrainerPhone(e.target.value)} className={field} /></label>
          <label className={label}>Trainer's Email<input type="email" value={trainerEmail} onChange={(e) => setTrainerEmail(e.target.value)} className={field} /></label>
          <label className={label}>Programme *<select required value={programId} onChange={(e) => { const p = programs.find((x) => String(x.id) === e.target.value); setProgramId(e.target.value); setProgramName(p?.name || ''); setCourseLevel(p?.level || ''); setUnitId(''); setUnitName(''); }} className={field}><option value="">Select assigned programme</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className={label}>Course Level<input value={courseLevel} onChange={(e) => setCourseLevel(e.target.value)} placeholder="e.g. Level 6" className={field} /></label>
          <label className={label}>Unit<select value={unitId} disabled={!programId || loadingUnits} onChange={(e) => { const u = units.find((x) => String(x.id) === e.target.value); setUnitId(e.target.value); setUnitName(u?.name || ''); }} className={field}><option value="">Select unit (optional)</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>{loadingUnits && <span className="mt-1 block text-xs text-slate-400">Loading units…</span>}</label>
          <label className={label}>Competency Area<input value={competencyArea} onChange={(e) => setCompetencyArea(e.target.value)} className={field} /></label>
          <label className={label}>Intake<input value={intake} onChange={(e) => setIntake(e.target.value)} placeholder="e.g. January 2027" className={field} /></label>
          <label className={label}>Number of Students<input type="number" min="0" value={studentCount} onChange={(e) => setStudentCount(e.target.value)} className={field} /></label>
          <label className={label}>Date<input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className={field} /></label>
          <label className={label}>Time<input value={recordTime} onChange={(e) => setRecordTime(e.target.value)} placeholder="e.g. 8:00 AM – 10:00 AM" className={field} /></label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-brand-dark">Record of Work Covered</h2><p className="mt-1 text-sm text-slate-500">Add one row for each teaching session or topic covered.</p></div><button type="button" onClick={addEntry} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"><Plus className="h-4 w-4" /> Add Row</button></div>
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-brand-green">Teaching entry {index + 1}</p><button type="button" onClick={() => removeEntry(index)} disabled={entries.length === 1} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Date<input type="date" value={entry.date} onChange={(e) => updateEntry(index, 'date', e.target.value)} className={field} /></label><label className={label}>Topic<input value={entry.topic} onChange={(e) => updateEntry(index, 'topic', e.target.value)} className={field} /></label><label className={label}>Sub-topic<input value={entry.subTopic} onChange={(e) => updateEntry(index, 'subTopic', e.target.value)} className={field} /></label><label className={label}>Remarks<input value={entry.remarks} onChange={(e) => updateEntry(index, 'remarks', e.target.value)} className={field} /></label></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
        <h2 className="text-lg font-bold text-brand-dark">Supervisor Details</h2>
        <p className="mt-1 text-sm text-slate-500">The supervisor can sign the printed document after reviewing the record.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={label}>Supervisor's Name<input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} className={field} /></label><label className={label}>Supervisor's Signature / Approval Reference<input value={supervisorSignature} onChange={(e) => setSupervisorSignature(e.target.value)} placeholder="Leave blank for handwritten signature" className={field} /></label></div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => router.push('/lecturer/dashboard/records-of-work')} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:border-slate-300">Cancel</button><div className="flex flex-col gap-3 sm:flex-row"><select aria-label="Record status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700"><option value="DRAFT">Save as Draft</option><option value="SUBMITTED">Mark as Submitted</option></select><button disabled={loading || !programId} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{loading ? 'Saving…' : 'Save Record'}</button>{initialRecord && <a href={`/api/lecturer/records-of-work/${initialRecord.id}/pdf`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green px-5 py-3 text-sm font-bold text-brand-green hover:bg-brand-green/5"><Download className="h-4 w-4" /> Download PDF</a>}</div></div>
    </form>
  );
}
