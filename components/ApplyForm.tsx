'use client';

import { FormEvent, useState } from 'react';
import emailjs from '@emailjs/browser';
import { courses } from '@/data/site';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_APPLY_TEMPLATE!;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

export function ApplyForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [fields, setFields] = useState({ full_name: '', phone: '', email: '', course: '', county: '', message: '' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, fields, PUBLIC_KEY);
      setStatus('success');
      setFields({ full_name: '', phone: '', email: '', course: '', county: '', message: '' });
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Full Name
          <input value={fields.full_name} onChange={e => setFields(f => ({ ...f, full_name: e.target.value }))} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Phone Number
          <input value={fields.phone} onChange={e => setFields(f => ({ ...f, phone: e.target.value }))} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email Address
          <input type="email" value={fields.email} onChange={e => setFields(f => ({ ...f, email: e.target.value }))} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Course Interested In
          <select value={fields.course} onChange={e => setFields(f => ({ ...f, course: e.target.value }))} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2">
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.slug} value={course.title}>{course.title}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          County / Town
          <input value={fields.county} onChange={e => setFields(f => ({ ...f, county: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Additional Message
          <textarea value={fields.message} onChange={e => setFields(f => ({ ...f, message: e.target.value }))} rows={5} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3 text-sm font-semibold text-white shadow-md shadow-brand-green/20 transition-all hover:bg-brand-dark hover:-translate-y-0.5 disabled:opacity-60">
          {loading ? 'Submitting...' : 'Submit Application →'}
        </button>
      </div>

      {status === 'success' && (
        <p className="mt-4 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ✓ Application submitted! We'll be in touch with you shortly.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Something went wrong. Please try again or contact us directly.
        </p>
      )}
    </form>
  );
}
