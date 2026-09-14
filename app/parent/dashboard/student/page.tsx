import Link from 'next/link';
import type { ReactNode } from 'react';
import {
ArrowRight,
BookOpen,
CalendarCheck,
CalendarDays,
CheckCircle2,
CreditCard,
FileText,
GraduationCap,
Mail,
Phone,
ShieldCheck,
UserRound,
Users,
} from 'lucide-react';

import { getParentSession } from '@/lib/parent-auth';
import { getParentDashboardData } from '@/lib/parent-dashboard';

function getStudentName(student: {
first_name: string | null;
middle_name: string | null;
surname: string | null;
}): string {
return [
student.first_name,
student.middle_name,
student.surname,
]
.filter(
(value): value is string =>
typeof value === 'string' && value.trim().length > 0,
)
.join(' ') || 'Student';
}

function formatValue(value: string | number | null | undefined): string {
if (value === null || value === undefined) {
return 'Not provided';
}

const text = String(value).trim();

return text || 'Not provided';
}

function formatDate(value: string | null): string {
if (!value) {
return 'Not available';
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return value;
}

return new Intl.DateTimeFormat('en-KE', {
day: '2-digit',
month: 'long',
year: 'numeric',
}).format(date);
}

function normalizeStatus(value: string | null): string {
return value?.trim().toLowerCase() || '';
}

function isPositiveStatus(value: string | null): boolean {
return [
'approved',
'accepted',
'admitted',
'active',
'paid',
'completed',
'complete',
].includes(normalizeStatus(value));
}

function getStatusLabel(
value: string | null,
fallback: string,
): string {
const normalized = normalizeStatus(value);

if (!normalized) {
return fallback;
}

return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function StatusBadge({
status,
fallback,
}: {
status: string | null;
fallback: string;
}) {
const positive = isPositiveStatus(status);

return (
<span
className={[
'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
positive
? 'bg-emerald-50 text-emerald-700'
: 'bg-amber-50 text-amber-700',
].join(' ')}
>
{positive ? ( <CheckCircle2 size={13} />
) : ( <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
)}
  {getStatusLabel(status, fallback)}
</span>

);
}

function InfoItem({
label,
value,
icon,
}: {
label: string;
value: string;
icon?: ReactNode;
}) {
return ( <div className="rounded-2xl border border-brand-green/10 bg-white p-4"> <div className="flex items-start gap-3">
{icon ? ( <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/5 text-brand-green">
{icon} </div>
) : null}
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-brand-dark">
        {value}
      </p>
    </div>
  </div>
</div>

);
}

function SectionHeader({
icon,
title,
description,
}: {
icon: ReactNode;
title: string;
description: string;
}) {
return ( <div className="mb-5 flex items-start gap-3"> <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
{icon} </div>

  <div>
    <h2 className="text-lg font-bold text-brand-dark">{title}</h2>

    <p className="mt-0.5 text-sm text-gray-500">
      {description}
    </p>
  </div>
</div>

);
}

function QuickAction({
href,
icon,
title,
description,
}: {
href: string;
icon: ReactNode;
title: string;
description: string;
}) {
return ( <Link
   href={href}
   className="group flex items-center gap-4 rounded-2xl border border-brand-green/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-gold/50 hover:shadow-md"
 > <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green/5 text-brand-green transition group-hover:bg-brand-green group-hover:text-white">
{icon} </div>

  <div className="min-w-0 flex-1">
    <p className="text-sm font-bold text-brand-dark">
      {title}
    </p>

    <p className="mt-0.5 text-xs text-gray-500">
      {description}
    </p>
  </div>

  <ArrowRight
    size={18}
    className="shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-brand-green"
  />
</Link>

);
}

function NoLinkedStudent() {
return ( <div className="p-4 sm:p-6 lg:p-8"> <div className="mx-auto max-w-2xl rounded-3xl border border-brand-green/10 bg-white p-8 text-center shadow-sm sm:p-12"> <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/5 text-brand-green"> <UserRound size={28} /> </div>

    <h1 className="mt-5 text-xl font-bold text-brand-dark">
      No Linked Student
    </h1>

    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
      There is currently no student linked to this parent account.
      Please contact Shifah Medical Training College if you believe
      this is an error.
    </p>

    <Link
      href="/contact"
      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
    >
      Contact College
      <ArrowRight size={17} />
    </Link>
  </div>
</div>

);
}

export default async function MyStudentPage() {
const session = await getParentSession();

if (!session) {
return null;
}

const dashboardData = await getParentDashboardData(
session.parentId,
);

if (!dashboardData || !dashboardData.student) {
return <NoLinkedStudent />;
}

const student = dashboardData.student;
const studentName = getStudentName(student);
const initial = studentName.charAt(0).toUpperCase() || 'S';

return ( <div className="p-4 sm:p-6 lg:p-8"> <div className="mx-auto max-w-6xl space-y-6">

    {/* Page heading */}
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">
        Parent Portal
      </p>

      <h1 className="mt-1 text-2xl font-bold text-brand-dark sm:text-3xl">
        My Child
      </h1>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
        View your child&apos;s student, academic and admission
        information maintained by Shifah Medical Training College.
      </p>
    </div>

    {/* Student hero */}
    <section className="overflow-hidden rounded-3xl bg-brand-dark text-white shadow-sm">
      <div className="relative p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-gold/10 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-brand-green/40 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold text-brand-green shadow-lg sm:h-20 sm:w-20 sm:text-2xl">
              {initial}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-gold">
                Linked Student
              </p>

              <h2 className="mt-1 break-words text-xl font-bold sm:text-2xl">
                {studentName}
              </h2>

              <p className="mt-1 text-sm text-white/60">
                {formatValue(student.course)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:min-w-[260px] sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Application No.
              </p>

              <p className="mt-1 text-sm font-bold">
                {formatValue(student.application_number)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Admission No.
              </p>

              <p className="mt-1 text-sm font-bold">
                {formatValue(student.admission_number)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid border-t border-white/10 sm:grid-cols-3">
        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Application
          </p>

          <div className="mt-2">
            <StatusBadge
              status={student.application_status}
              fallback="Pending"
            />
          </div>
        </div>

        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Payment
          </p>

          <div className="mt-2">
            <StatusBadge
              status={student.payment_status}
              fallback="Pending"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Admission
          </p>

          <div className="mt-2">
            <StatusBadge
              status={student.admission_status}
              fallback="Not yet active"
            />
          </div>
        </div>
      </div>
    </section>

    {/* Academic information */}
    <section className="rounded-3xl border border-brand-green/10 bg-brand-cream/40 p-5 sm:p-6">
      <SectionHeader
        icon={<GraduationCap size={20} />}
        title="Academic Information"
        description="The student's current programme and intake information."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoItem
          label="Programme / Course"
          value={formatValue(student.course)}
          icon={<BookOpen size={18} />}
        />

        <InfoItem
          label="Intake"
          value={formatValue(student.intake)}
          icon={<CalendarDays size={18} />}
        />

        <InfoItem
          label="Admission Number"
          value={formatValue(student.admission_number)}
          icon={<GraduationCap size={18} />}
        />

        <InfoItem
          label="Admission Date"
          value={formatDate(student.admission_date)}
          icon={<CalendarDays size={18} />}
        />

        <InfoItem
          label="Application Number"
          value={formatValue(student.application_number)}
          icon={<FileText size={18} />}
        />

        <InfoItem
          label="Application Date"
          value={formatDate(student.created_at)}
          icon={<CalendarDays size={18} />}
        />
      </div>
    </section>

    {/* Student contact information */}
    <section className="rounded-3xl border border-brand-green/10 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        icon={<UserRound size={20} />}
        title="Student Contact Information"
        description="Contact details recorded for the student."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoItem
          label="Full Name"
          value={studentName}
          icon={<UserRound size={18} />}
        />

        <InfoItem
          label="Mobile Number"
          value={formatValue(student.mobile)}
          icon={<Phone size={18} />}
        />

        <InfoItem
          label="Email Address"
          value={formatValue(student.email)}
          icon={<Mail size={18} />}
        />

        <InfoItem
          label="Parent Relationship"
          value={formatValue(student.relationship)}
          icon={<Users size={18} />}
        />
      </div>
    </section>

    {/* Parent / guardian */}
    <section className="rounded-3xl border border-brand-green/10 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        icon={<Users size={20} />}
        title="Parent / Guardian"
        description="The parent or guardian information linked to this student."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem
          label="Name"
          value={formatValue(student.guardian_name)}
          icon={<UserRound size={18} />}
        />

        <InfoItem
          label="Relationship"
          value={formatValue(student.guardian_relationship)}
          icon={<Users size={18} />}
        />

        <InfoItem
          label="Mobile"
          value={formatValue(student.guardian_mobile)}
          icon={<Phone size={18} />}
        />

        <InfoItem
          label="Email"
          value={formatValue(student.guardian_email)}
          icon={<Mail size={18} />}
        />
      </div>
    </section>

    {/* Sponsor */}
    <section className="rounded-3xl border border-brand-green/10 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeader
        icon={<ShieldCheck size={20} />}
        title="Sponsor Information"
        description="Sponsorship information recorded for the student's application."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem
          label="Sponsor Type"
          value={formatValue(student.sponsor_type)}
          icon={<ShieldCheck size={18} />}
        />

        <InfoItem
          label="Sponsor Name"
          value={formatValue(student.sponsor_name)}
          icon={<UserRound size={18} />}
        />

        <InfoItem
          label="Relationship"
          value={formatValue(student.sponsor_relationship)}
          icon={<Users size={18} />}
        />

        <InfoItem
          label="Mobile"
          value={formatValue(student.sponsor_mobile)}
          icon={<Phone size={18} />}
        />

        <InfoItem
          label="Email"
          value={formatValue(student.sponsor_email)}
          icon={<Mail size={18} />}
        />
      </div>
    </section>

    {/* Quick actions */}
    <section>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
          Parent Access
        </p>

        <h2 className="mt-1 text-lg font-bold text-brand-dark">
          Student Services
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href="/parent/dashboard/academic"
          icon={<BookOpen size={20} />}
          title="Academic"
          description="View academic progress and results"
        />

        <QuickAction
          href="/parent/dashboard/attendance"
          icon={<CalendarCheck size={20} />}
          title="Attendance"
          description="Monitor attendance records"
        />

        <QuickAction
          href="/parent/dashboard/payment"
          icon={<CreditCard size={20} />}
          title="Fees & Payments"
          description="View fees and payment information"
        />

        <QuickAction
          href="/parent/dashboard/documents"
          icon={<FileText size={20} />}
          title="Documents"
          description="Access available student documents"
        />
      </div>
    </section>

    {/* Information notice */}
    <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck
          size={20}
          className="mt-0.5 shrink-0 text-brand-green"
        />

        <div>
          <p className="text-sm font-bold text-brand-dark">
            Student information notice
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-600">
            This information is provided to the linked parent or guardian
            for student monitoring and support. Changes to official student
            records should be requested through the college administration.
          </p>
        </div>
      </div>
    </div>

  </div>
</div>

);
}
