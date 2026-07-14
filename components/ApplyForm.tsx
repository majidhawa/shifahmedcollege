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
          <textarea value={fields.message} onChange={e => setFields(f => ({ ...f, message: e.target.value }))} rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-brand-green transition focus:ring-2" />
        </label>
      </div>
{/* =======================================================
    APPLICATION FEE & PAYMENT INSTRUCTIONS
======================================================= */}

<div className="mt-8 rounded-2xl border border-brand-gold/20 bg-brand-cream/30 p-6">

  <h3 className="text-xl font-bold text-brand-dark">
    Application Fee & Payment Instructions
  </h3>

  <p className="mt-3 text-sm leading-7 text-slate-700">
    Before submitting your application, you are required to pay a
    <span className="font-semibold">
      {" "}non-refundable application fee of KSh 1,500.
    </span>
  </p>

  <div className="mt-6 space-y-6">

    {/* MPESA */}
    <div className="rounded-xl border bg-white p-5 shadow-sm">

      <div className="flex items-center gap-4">

        <img
          src="/images/mpesa-logo.png"
          alt="M-PESA"
          className="h-12 w-auto object-contain"
        />

        <div>
          <h4 className="font-bold text-brand-dark">
            M-PESA
          </h4>

          <p className="text-sm text-slate-600">
            <span className="font-semibold">Paybill Number:</span> 247247
          </p>

          <p className="text-sm text-slate-600">
            <span className="font-semibold">Account Number:</span>
            {" "}0330287421280
          </p>
        </div>

      </div>

    </div>

    {/* Equity */}
    <div className="rounded-xl border bg-white p-5 shadow-sm">

      <div className="flex items-center gap-4">

        <img
          src="/images/equity-bank-logo.png"
          alt="Equity Bank"
          className="h-12 w-auto object-contain"
        />

        <div>

          <h4 className="font-bold text-brand-dark">
            Equity Bank
          </h4>

          <p className="text-sm text-slate-600">
            <span className="font-semibold">Bank:</span>
            {" "}Equity Bank
          </p>

          <p className="text-sm text-slate-600">
            <span className="font-semibold">Account Number:</span>
            {" "}0330287421280
          </p>

        </div>

      </div>

    </div>

  </div>

  {/* Payment Confirmation */}

  <div className="mt-8 rounded-xl bg-brand-green/5 p-5">

    <h4 className="font-bold text-brand-dark">
      Payment Confirmation
    </h4>

    <p className="mt-2 text-sm leading-7 text-slate-700">
      After making your payment, kindly send proof of payment for verification
      using either of the following:
    </p>

    <div className="mt-4 space-y-2 text-sm">

      <p>
        📧 <span className="font-semibold">Email:</span>{" "}
        <a
          href="mailto:admissionssmtc@gmail.com"
          className="text-brand-green hover:underline"
        >
          admin@shifahmedicalcollege.co.ke
        </a>
      </p>

      <p>
        💬 <span className="font-semibold">WhatsApp:</span>{" "}
        <a
          href="https://wa.me/254142068933"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-green hover:underline"
        >
          0142068933
        </a>
      </p>

    </div>

    <p className="mt-4 text-sm leading-7 text-slate-700">
      <span className="font-semibold">For M-PESA payments:</span> Please
      forward the M-PESA confirmation message.
    </p>

    <p className="text-sm leading-7 text-slate-700">
      <span className="font-semibold">For Equity Bank payments:</span> Kindly
      send a clear copy of the bank deposit slip.
    </p>

  </div>

  {/* Admission Letter */}

  <div className="mt-6 rounded-xl border-l-4 border-brand-green bg-white p-5">

    <h4 className="font-bold text-brand-dark">
      Admission Letter
    </h4>

    <p className="mt-2 text-sm leading-7 text-slate-700">
      Once your payment has been verified, your application will be processed,
      and your <span className="font-semibold">Admission Letter</span> will be
      sent to you using the contact details provided in your application.
    </p>

  </div>

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
