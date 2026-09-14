import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock3,
  ShieldCheck,
  ArrowLeft,
  HelpCircle,
  ExternalLink,
  Headphones,
  CheckCircle2,
  Building2,
  Send,
} from 'lucide-react';

/* =========================================================
   CONTACT INFORMATION
========================================================= */

const CONTACT = {
  phoneDisplay: '0142 068 933',
  phoneHref: 'tel:+254142068933',

  email: 'admissions@shifahmedicalcollege.ac.ke',
  emailHref: 'mailto:admissions@shifahmedicalcollege.ac.ke',

  whatsappHref: 'https://wa.me/254142068933',

  contactPage: '/contact',
};

/* =========================================================
   CONTACT ADMISSIONS PAGE
========================================================= */

export default async function StudentContactAdmissionsPage() {
  /* =======================================================
     CHECK SESSION
  ======================================================= */

  const session = await getStudentSession();

  if (!session) {
    redirect('/student/login');
  }

  /* =======================================================
     GET AUTHENTICATED STUDENT
  ======================================================= */

  const result = await pool.query(
    `
      SELECT
        id,
        application_number,
        first_name,
        middle_name,
        surname,
        mobile,
        email,
        course,
        intake,
        application_status,
        payment_status
      FROM applications
      WHERE id = $1
        AND application_number = $2
      LIMIT 1
    `,
    [
      session.applicationId,
      session.applicationNumber,
    ]
  );

  if (result.rows.length === 0) {
    redirect('/student/login');
  }

  const student = result.rows[0];

  /* =======================================================
     STUDENT DETAILS
  ======================================================= */

  const fullName = [
    student.first_name,
    student.middle_name,
    student.surname,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-[#0c1f1a]">

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* =================================================
            BACK TO DASHBOARD
        ================================================= */}

        <Link
          href="/student/dashboard"
          className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-gray-500 transition hover:text-[#0f4f3f]"
        >
          <ArrowLeft size={17} />

          Back to Dashboard
        </Link>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative mb-8 overflow-hidden rounded-3xl bg-[#0c1f1a] shadow-xl">

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d7a93b]/10 blur-2xl" />

          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#0f4f3f]/30 blur-3xl" />

          <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10">

            <div className="max-w-3xl">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7a93b]/20 bg-[#d7a93b]/10 px-3 py-1.5 text-xs font-semibold text-[#e8c86b]">

                <Headphones size={14} />

                Student Support

              </div>

              <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                We&apos;re here to help you.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                Have a question about your application,
                payment, admission, documents, course or
                intake? Our admissions team is ready to assist
                you.
              </p>

            </div>

            {/* QUICK INFORMATION */}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d7a93b]/15 text-[#e8c86b]">
                    <ShieldCheck size={19} />
                  </div>

                  <div className="min-w-0">

                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                      Application Reference
                    </p>

                    <p className="mt-0.5 truncate font-mono text-sm font-bold text-white">
                      {student.application_number}
                    </p>

                  </div>

                </div>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f] text-[#7ed7c0]">
                    <Headphones size={19} />
                  </div>

                  <div className="min-w-0">

                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                      Applicant
                    </p>

                    <p className="mt-0.5 truncate text-sm font-bold text-white">
                      {fullName || 'Student'}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            CONTACT OPTIONS
        ================================================= */}

        <section>

          <div className="mb-5">

            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f4f3f]">
              Get in touch
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#0c1f1a] sm:text-2xl">
              Choose how you&apos;d like to contact us
            </h2>

          </div>

          <div className="grid gap-5 md:grid-cols-2">

            <ContactCard
              icon={<Phone size={23} />}
              title="Call Admissions"
              description="Speak directly with the admissions office for assistance with your application."
              detail={CONTACT.phoneDisplay}
              href={CONTACT.phoneHref}
              actionLabel="Call now"
              actionIcon={<Phone size={16} />}
            />

            <ContactCard
              icon={<Mail size={23} />}
              title="Email Admissions"
              description="Send a detailed enquiry if you need assistance or need to provide supporting information."
              detail={CONTACT.email}
              href={CONTACT.emailHref}
              actionLabel="Send email"
              actionIcon={<Send size={16} />}
            />

            <ContactCard
              icon={<MessageCircle size={23} />}
              title="WhatsApp Admissions"
              description="Use WhatsApp for convenient enquiries and quick assistance from the admissions team."
              detail={CONTACT.phoneDisplay}
              href={CONTACT.whatsappHref}
              actionLabel="Open WhatsApp"
              actionIcon={<MessageCircle size={16} />}
              external
            />

            <ContactCard
              icon={<MapPin size={23} />}
              title="Visit the College"
              description="Visit the admissions office in person when you need direct assistance or clarification."
              detail="Kitale, Trans-Nzoia County"
              href={CONTACT.contactPage}
              actionLabel="View contact details"
              actionIcon={<ExternalLink size={16} />}
            />

          </div>

        </section>

        {/* =================================================
            OFFICE HOURS + URGENT HELP
        ================================================= */}

        <div className="mt-5 grid gap-5 lg:grid-cols-3">

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-7 lg:col-span-2">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d7a93b]/15 text-[#a67d13]">
                <Clock3 size={21} />
              </div>

              <div>

                <p className="text-xs font-bold uppercase tracking-wider text-[#a67d13]">
                  Admissions availability
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#0c1f1a]">
                  Office Hours
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  For the fastest response, contact the
                  admissions office during working hours.
                </p>

              </div>

            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <OfficeHour
                day="Monday – Friday"
                hours="8:00 AM – 5:00 PM"
                open
              />

              <OfficeHour
                day="Saturday"
                hours="Closed"
              />

              <OfficeHour
                day="Sunday"
                hours="Closed"
              />

            </div>

          </section>

          <section className="rounded-2xl bg-[#0f4f3f] p-6 text-white shadow-sm sm:p-7">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <Headphones size={21} />
            </div>

            <h2 className="mt-5 text-lg font-bold">
              Need urgent help?
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/60">
              Have your application number ready when
              contacting admissions so we can locate your
              record quickly.
            </p>

            <a
              href={CONTACT.phoneHref}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#d7a93b] px-4 py-3 text-sm font-bold text-[#0c1f1a] transition hover:bg-[#e3bb55]"
            >
              <Phone size={16} />

              {CONTACT.phoneDisplay}
            </a>

          </section>

        </div>

        {/* =================================================
            SUPPORT TOPICS
        ================================================= */}

        <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-7">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
              <HelpCircle size={21} />
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wider text-[#0f4f3f]">
                Support topics
              </p>

              <h2 className="mt-1 text-lg font-bold text-[#0c1f1a]">
                What can Admissions help you with?
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Our admissions team can assist with the
                following student-related matters.
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <HelpItem>
              Application status
            </HelpItem>

            <HelpItem>
              Application corrections
            </HelpItem>

            <HelpItem>
              M-Pesa payment issues
            </HelpItem>

            <HelpItem>
              Payment receipt
            </HelpItem>

            <HelpItem>
              Admission letter
            </HelpItem>

            <HelpItem>
              Required documents
            </HelpItem>

            <HelpItem>
              Course information
            </HelpItem>

            <HelpItem>
              Intake information
            </HelpItem>

            <HelpItem>
              Registration
            </HelpItem>

            <HelpItem>
              Reporting information
            </HelpItem>

            <HelpItem>
              Student portal issues
            </HelpItem>

            <HelpItem>
              Other admissions enquiries
            </HelpItem>

          </div>

        </section>

        {/* =================================================
            SECURITY NOTICE
        ================================================= */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-[#d7a93b]/25 bg-[#fffdf5]">

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d7a93b]/15 text-[#a67d13]">
              <ShieldCheck size={21} />
            </div>

            <div className="min-w-0">

              <h2 className="text-sm font-bold text-[#0c1f1a]">
                Keep your account information secure
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                You may provide your application number to
                authorised admissions staff when requesting
                assistance. Never share your student portal
                password, OTP, or other login credentials.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            COLLEGE CONTACT CTA
        ================================================= */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <div className="grid lg:grid-cols-[1fr_auto] lg:items-center">

            <div className="p-6 sm:p-7">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f]">
                  <Building2 size={21} />
                </div>

                <div>

                  <h2 className="text-lg font-bold text-[#0c1f1a]">
                    Need more information?
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                    Visit the main college contact page for
                    additional information about Shifah Medical
                    Training College, its location and available
                    communication channels.
                  </p>

                </div>

              </div>

            </div>

            <div className="border-t border-gray-100 p-6 lg:border-l lg:border-t-0">

              <Link
                href={CONTACT.contactPage}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1f1a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f4f3f] sm:w-auto"
              >
                College Contact Page

                <ExternalLink size={16} />
              </Link>

            </div>

          </div>

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="py-10 text-center">

          <div className="mb-4 flex justify-center">

            <div className="relative h-12 w-36">

              <Image
                src="/images/logo.jpg"
                alt="Shifah Medical Training College"
                fill
                sizes="144px"
                className="object-contain"
              />

            </div>

          </div>

          <p className="text-xs font-medium text-gray-400">
            © {new Date().getFullYear()} Shifah Medical Training College.
            All rights reserved.
          </p>

          <p className="mt-1 text-[11px] text-gray-400">
            Student Portal • Secure Applicant Access
          </p>

        </footer>

      </div>

    </main>
  );
}

/* =========================================================
   CONTACT CARD
========================================================= */

function ContactCard({
  icon,
  title,
  description,
  detail,
  href,
  actionLabel,
  actionIcon,
  external = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  detail: string;
  href: string;
  actionLabel: string;
  actionIcon: ReactNode;
  external?: boolean;
}) {
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#0f4f3f]/15 hover:shadow-lg sm:p-7">

      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f4f3f] via-[#d7a93b] to-[#0f4f3f] opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0f4f3f]/10 text-[#0f4f3f] transition group-hover:bg-[#0f4f3f] group-hover:text-white">
          {icon}
        </div>

        <div className="min-w-0 flex-1">

          <h3 className="font-bold text-[#0c1f1a]">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>

        </div>

      </div>

      <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3">

        <p className="truncate text-sm font-semibold text-[#0c1f1a]">
          {detail}
        </p>

      </div>

      <div className="mt-4">

        <a
          href={href}
          {...(external
            ? {
                target: '_blank',
                rel: 'noopener noreferrer',
              }
            : {})}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f4f3f] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0c1f1a]"
        >

          {actionIcon}

          {actionLabel}

          {external && (
            <ExternalLink size={14} />
          )}

        </a>

      </div>

    </section>
  );
}

/* =========================================================
   OFFICE HOURS
========================================================= */

function OfficeHour({
  day,
  hours,
  open = false,
}: {
  day: string;
  hours: string;
  open?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">

      <div className="flex items-center justify-between gap-3">

        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {day}
        </p>

        {open && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#0f4f3f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0f4f3f]" />

            Open
          </span>
        )}

      </div>

      <p className="mt-2 text-sm font-bold text-[#0c1f1a]">
        {hours}
      </p>

    </div>
  );
}

/* =========================================================
   HELP ITEM
========================================================= */

function HelpItem({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 transition hover:border-[#0f4f3f]/15 hover:bg-[#0f4f3f]/5">

      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0f4f3f]/10 text-[#0f4f3f]">

        <CheckCircle2 size={14} />

      </span>

      <span className="text-sm font-medium leading-5 text-gray-700">
        {children}
      </span>

    </div>
  );
}