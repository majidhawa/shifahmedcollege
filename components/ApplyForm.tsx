'use client';

import { FormEvent, useState } from 'react';
import { courses } from '@/data/site';

export function ApplyForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch('/api/apply', {
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
          Phone Number
          <input name="phone" required className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email Address
          <input type="email" name="email" required className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Course Interested In
          <select name="course" required className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2">
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.slug} value={course.title}>{course.title}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          County / Town
          <input name="location" className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Additional Message
          <textarea name="message" rows={5} className="rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
      </div>
      <div className="mt-6 flex justify-end">
        <button disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3 text-sm font-semibold text-white shadow-md shadow-brand-green/20 transition-all hover:bg-brand-dark hover:-translate-y-0.5 disabled:opacity-60">
          {loading ? 'Submitting...' : 'Submit Application →'}
        </button>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-brand-cream px-4 py-3 text-sm text-brand-dark">{message}</p> : null}
    </form>
  );
}
