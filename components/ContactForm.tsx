'use client';

import { FormEvent, useState } from 'react';
import emailjs from '@emailjs/browser';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_CONTACT_TEMPLATE!;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [fields, setFields] = useState({ name: '', email: '', subject: '', message: '' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
        ...fields,
        time: new Date().toLocaleString(),
      }, PUBLIC_KEY);
      setStatus('success');
      setFields({ name: '', email: '', subject: '', message: '' });
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
          <input value={fields.name} onChange={e => setFields(f => ({ ...f, name: e.target.value }))} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email Address
          <input type="email" value={fields.email} onChange={e => setFields(f => ({ ...f, email: e.target.value }))} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Subject
          <input value={fields.subject} onChange={e => setFields(f => ({ ...f, subject: e.target.value }))} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Message
          <textarea value={fields.message} onChange={e => setFields(f => ({ ...f, message: e.target.value }))} rows={5} required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3 text-sm font-semibold text-white shadow-md shadow-brand-green/20 transition-all hover:bg-brand-dark hover:-translate-y-0.5 disabled:opacity-60">
          {loading ? 'Sending...' : 'Send Message →'}
        </button>
      </div>

      {status === 'success' && (
        <p className="mt-4 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ✓ Message sent successfully! We'll get back to you soon.
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
