'use client';

import { FormEvent, useState } from 'react';

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = (await response.json()) as { message: string };
    setMessage(result.message);
    setLoading(false);
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Full Name
          <input name="name" required className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email Address
          <input type="email" name="email" required className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Subject
          <input name="subject" required className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Message
          <textarea name="message" rows={5} required className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
      </div>
      <div className="mt-6 flex justify-end">
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3 text-sm font-semibold text-white shadow-md shadow-brand-green/20 transition-all hover:bg-brand-dark hover:-translate-y-0.5 disabled:opacity-60">
          {loading ? 'Sending...' : 'Send Message →'}
        </button>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-brand-cream px-4 py-3 text-sm text-brand-dark">{message}</p> : null}
    </form>
  );
}
