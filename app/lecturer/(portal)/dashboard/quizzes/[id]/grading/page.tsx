import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileQuestion,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

import { requireLecturer } from '@/lib/lecturer-auth';

import GradingPanel from './GradingPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageParams = {
  id: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function ManualGradingPage({
  params,
}: PageProps) {
  const lecturer =
    await requireLecturer();

  if (!lecturer) {
    redirect('/lecturer/login');
  }

  const { id } =
    await params;

  const quizId =
    Number(id);

  if (
    !Number.isInteger(quizId) ||
    quizId <= 0
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ==================================================
            BACK
        ================================================== */}

        <div className="mb-5">
          <Link
            href={`/lecturer/dashboard/quizzes/${quizId}/questions`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Questions
          </Link>
        </div>

        {/* ==================================================
            HEADER
        ================================================== */}

        <section className="overflow-hidden rounded-3xl bg-brand-green shadow-soft">
          <div className="relative p-6 sm:p-8">

            <div className="relative z-10">

              <div className="flex flex-wrap items-center gap-2">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Manual Grading
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3 py-1.5 text-xs font-bold text-brand-dark">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Lecturer
                </span>

              </div>

              <h1 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
                Manual Grading
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
                Review and award marks for student
                short-answer and essay responses.
                Objective questions are graded
                automatically by the assessment
                system.
              </p>

            </div>

            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border-[45px] border-brand-gold/10" />

            <div className="pointer-events-none absolute -bottom-32 right-20 h-60 w-60 rounded-full border-[35px] border-white/5" />

          </div>
        </section>

        {/* ==================================================
            GRADING PANEL
        ================================================== */}

        <GradingPanel quizId={quizId} />

      </div>
    </main>
  );
}