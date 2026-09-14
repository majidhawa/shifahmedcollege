import Link from "next/link";
import { redirect } from "next/navigation";
import { getParentSession } from "@/lib/parent-auth";
import { getParentDashboardData } from "@/lib/parent-dashboard";
import pool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ResultType = "assignment" | "quiz" | "exam";

type ResultRow = {
  id: string;
  sourceId: number;
  type: ResultType;
  title: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  status: string;
  submittedAt: string | null;
  gradedAt: string | null;
  attemptNumber: number | null;
  program: {
    id: number;
    name: string;
    code: string | null;
  };
  unit: {
    id: number;
    name: string;
  } | null;
  topic: {
    id: number;
    title: string;
  } | null;
  lesson: {
    id: number;
    title: string;
  } | null;
  feedback: string | null;
};

type ProgramSummary = {
  id: number;
  name: string;
  code: string | null;
  assessmentCount: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
};

type AcademicSummary = {
  totalAssessments: number;
  assignments: number;
  quizzes: number;
  exams: number;
  passed: number;
  failed: number;
  totalMarksObtained: number;
  totalPossibleMarks: number;
  overallPercentage: number;
  overallGrade: string;
};

type AcademicData = {
  results: ResultRow[];
  programs: ProgramSummary[];
  summary: AcademicSummary;
};

function calculatePercentage(obtained: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number(((obtained / total) * 100).toFixed(2));
}

function getGrade(percentage: number): string {
  if (percentage >= 80) {
    return "A";
  }

  if (percentage >= 70) {
    return "B";
  }

  if (percentage >= 60) {
    return "C";
  }

  if (percentage >= 50) {
    return "D";
  }

  return "E";
}

function hasPassed(percentage: number): boolean {
  return percentage >= 50;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number(value.toFixed(2)).toString();
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTypeLabel(type: ResultType): string {
  switch (type) {
    case "assignment":
      return "Assignment";
    case "quiz":
      return "Quiz";
    case "exam":
      return "Exam";
    default:
      return "Assessment";
  }
}

function getTypeIcon(type: ResultType): string {
  switch (type) {
    case "assignment":
      return "📝";
    case "quiz":
      return "❓";
    case "exam":
      return "🎓";
    default:
      return "📚";
  }
}

function getTypeClasses(type: ResultType): string {
  switch (type) {
    case "assignment":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "quiz":
      return "bg-purple-50 text-purple-700 border-purple-100";
    case "exam":
      return "bg-amber-50 text-amber-700 border-amber-100";
    default:
      return "bg-gray-50 text-gray-700 border-gray-100";
  }
}

function getGradeClasses(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "B":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "C":
      return "bg-yellow-50 text-yellow-700 border-yellow-100";
    case "D":
      return "bg-orange-50 text-orange-700 border-orange-100";
    default:
      return "bg-red-50 text-red-700 border-red-100";
  }
}

function getStatusClasses(passed: boolean): string {
  return passed
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-red-50 text-red-700 border-red-100";
}

function getStatusLabel(passed: boolean): string {
  return passed ? "Passed" : "Needs Improvement";
}

function getChildName(student: {
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
}): string {
  return (
    [student.first_name, student.middle_name, student.surname]
      .filter(
        (value): value is string =>
          Boolean(value && value.trim())
      )
      .join(" ") || "Student"
  );
}

async function getAcademicResults(
  applicationId: number
): Promise<AcademicData> {
  const assignmentResult = await pool.query<{
    id: number;
    assignment_id: number;
    assignment_title: string;
    status: string | null;
    submitted_at: string | null;
    total_marks: number | string | null;
    marks_awarded: number | string | null;
    lecturer_feedback: string | null;
    graded_at: string | null;
    program_id: number;
    program_name: string;
    program_code: string | null;
    unit_id: number | null;
    unit_name: string | null;
    topic_id: number | null;
    topic_title: string | null;
    lesson_id: number | null;
    lesson_title: string | null;
  }>(
    `
      WITH student_enrollments AS (
        SELECT DISTINCT ON (e.program_id)
          e.id AS enrollment_id,
          e.program_id
        FROM lms_enrollments e
        WHERE e.application_id = $1
          AND (
            e.enrollment_status IS NULL
            OR LOWER(e.enrollment_status::text)
              NOT IN ('cancelled', 'dropped')
          )
        ORDER BY
          e.program_id,
          e.enrolled_at DESC NULLS LAST,
          e.id DESC
      ),
      latest_submissions AS (
        SELECT DISTINCT ON (s.assignment_id)
          s.id,
          s.assignment_id,
          s.application_id,
          s.status,
          s.submitted_at,
          s.total_marks,
          s.marks_awarded,
          s.lecturer_feedback,
          s.graded_at
        FROM lms_assignment_submissions s
        WHERE s.application_id = $1
        ORDER BY
          s.assignment_id,
          s.id DESC
      )
      SELECT
        ls.id,
        ls.assignment_id,
        a.title AS assignment_title,
        ls.status,
        ls.submitted_at,
        ls.total_marks,
        ls.marks_awarded,
        ls.lecturer_feedback,
        ls.graded_at,

        p.id AS program_id,
        p.name AS program_name,
        p.code AS program_code,

        u.id AS unit_id,
        u.name AS unit_name,

        t.id AS topic_id,
        t.title AS topic_title,

        l.id AS lesson_id,
        l.title AS lesson_title

      FROM latest_submissions ls

      INNER JOIN lms_assignments a
        ON a.id = ls.assignment_id

      INNER JOIN lms_lessons l
        ON l.id = a.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      INNER JOIN lms_programs p
        ON p.id = u.program_id

      INNER JOIN student_enrollments se
        ON se.program_id = p.id
    `,
    [applicationId]
  );

  const quizResult = await pool.query<{
    id: number;
    quiz_id: number;
    attempt_number: number | null;
    started_at: string | null;
    submitted_at: string | null;
    score: number | string | null;
    total_marks: number | string | null;
    status: string | null;
    quiz_title: string;
    program_id: number;
    program_name: string;
    program_code: string | null;
    unit_id: number | null;
    unit_name: string | null;
    topic_id: number | null;
    topic_title: string | null;
    lesson_id: number | null;
    lesson_title: string | null;
  }>(
    `
      WITH student_enrollments AS (
        SELECT DISTINCT ON (e.program_id)
          e.id AS enrollment_id,
          e.program_id
        FROM lms_enrollments e
        WHERE e.application_id = $1
          AND (
            e.enrollment_status IS NULL
            OR LOWER(e.enrollment_status::text)
              NOT IN ('cancelled', 'dropped')
          )
        ORDER BY
          e.program_id,
          e.enrolled_at DESC NULLS LAST,
          e.id DESC
      ),
      latest_attempts AS (
        SELECT DISTINCT ON (qa.quiz_id)
          qa.id,
          qa.quiz_id,
          qa.student_id,
          qa.attempt_number,
          qa.started_at,
          qa.submitted_at,
          qa.score,
          qa.total_marks,
          qa.percentage,
          qa.status
        FROM lms_quiz_attempts qa
        WHERE qa.student_id = $1
          AND qa.status = 'graded'
        ORDER BY
          qa.quiz_id,
          qa.submitted_at DESC NULLS LAST,
          qa.id DESC
      )
      SELECT
        la.id,
        la.quiz_id,
        la.attempt_number,
        la.started_at,
        la.submitted_at,
        la.score,
        la.total_marks,
        la.status,

        q.title AS quiz_title,

        p.id AS program_id,
        p.name AS program_name,
        p.code AS program_code,

        u.id AS unit_id,
        u.name AS unit_name,

        t.id AS topic_id,
        t.title AS topic_title,

        l.id AS lesson_id,
        l.title AS lesson_title

      FROM latest_attempts la

      INNER JOIN lms_quizzes q
        ON q.id = la.quiz_id

      INNER JOIN lms_lessons l
        ON l.id = q.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      INNER JOIN lms_programs p
        ON p.id = u.program_id

      INNER JOIN student_enrollments se
        ON se.program_id = p.id
    `,
    [applicationId]
  );

  const results: ResultRow[] = [];

  for (const row of assignmentResult.rows) {
    const marksObtained = Number(row.marks_awarded ?? 0);
    const totalMarks = Number(row.total_marks ?? 0);

    if (
      !Number.isFinite(marksObtained) ||
      !Number.isFinite(totalMarks) ||
      totalMarks <= 0
    ) {
      continue;
    }

    const status = String(row.status ?? "").toLowerCase();

    if (status !== "submitted" && status !== "graded") {
      continue;
    }

    const percentage = calculatePercentage(
      marksObtained,
      totalMarks
    );

    results.push({
      id: `assignment-${row.assignment_id}`,
      sourceId: row.assignment_id,
      type: "assignment",
      title: row.assignment_title,
      marksObtained,
      totalMarks,
      percentage,
      grade: getGrade(percentage),
      passed: hasPassed(percentage),
      status,
      submittedAt: row.submitted_at,
      gradedAt: row.graded_at,
      attemptNumber: null,
      program: {
        id: row.program_id,
        name: row.program_name,
        code: row.program_code,
      },
      unit: row.unit_id
        ? {
            id: row.unit_id,
            name: row.unit_name ?? "Unit",
          }
        : null,
      topic: row.topic_id
        ? {
            id: row.topic_id,
            title: row.topic_title ?? "Topic",
          }
        : null,
      lesson: row.lesson_id
        ? {
            id: row.lesson_id,
            title: row.lesson_title ?? "Lesson",
          }
        : null,
      feedback: row.lecturer_feedback,
    });
  }

  for (const row of quizResult.rows) {
    const marksObtained = Number(row.score ?? 0);
    const totalMarks = Number(row.total_marks ?? 0);

    if (
      !Number.isFinite(marksObtained) ||
      !Number.isFinite(totalMarks) ||
      totalMarks <= 0
    ) {
      continue;
    }

    const percentage = calculatePercentage(
      marksObtained,
      totalMarks
    );

    const titleLower = String(
      row.quiz_title ?? ""
    ).toLowerCase();

    const type: ResultType =
      titleLower.includes("exam") ||
      titleLower.includes("examination") ||
      titleLower.includes("end term") ||
      titleLower.includes("final")
        ? "exam"
        : "quiz";

    results.push({
      id: `quiz-${row.id}`,
      sourceId: row.id,
      type,
      title: row.quiz_title,
      marksObtained,
      totalMarks,
      percentage,
      grade: getGrade(percentage),
      passed: hasPassed(percentage),
      status: String(row.status ?? "").toLowerCase(),
      submittedAt: row.submitted_at,
      gradedAt: row.submitted_at,
      attemptNumber:
        row.attempt_number === null
          ? null
          : Number(row.attempt_number),
      program: {
        id: row.program_id,
        name: row.program_name,
        code: row.program_code,
      },
      unit: row.unit_id
        ? {
            id: row.unit_id,
            name: row.unit_name ?? "Unit",
          }
        : null,
      topic: row.topic_id
        ? {
            id: row.topic_id,
            title: row.topic_title ?? "Topic",
          }
        : null,
      lesson: row.lesson_id
        ? {
            id: row.lesson_id,
            title: row.lesson_title ?? "Lesson",
          }
        : null,
      feedback: null,
    });
  }

  results.sort((a, b) => {
    const dateA = a.submittedAt
      ? new Date(a.submittedAt).getTime()
      : 0;

    const dateB = b.submittedAt
      ? new Date(b.submittedAt).getTime()
      : 0;

    return dateB - dateA;
  });

  const totalMarksObtained = results.reduce(
    (sum, result) => sum + result.marksObtained,
    0
  );

  const totalPossibleMarks = results.reduce(
    (sum, result) => sum + result.totalMarks,
    0
  );

  const overallPercentage = calculatePercentage(
    totalMarksObtained,
    totalPossibleMarks
  );

  const programMap = new Map<number, ProgramSummary>();

  for (const result of results) {
    const existing = programMap.get(result.program.id);

    if (existing) {
      existing.assessmentCount += 1;
      existing.marksObtained += result.marksObtained;
      existing.totalMarks += result.totalMarks;
    } else {
      programMap.set(result.program.id, {
        id: result.program.id,
        name: result.program.name,
        code: result.program.code,
        assessmentCount: 1,
        marksObtained: result.marksObtained,
        totalMarks: result.totalMarks,
        percentage: 0,
        grade: "E",
        passed: false,
      });
    }
  }

  const programs = Array.from(programMap.values()).map(
    (program) => {
      const percentage = calculatePercentage(
        program.marksObtained,
        program.totalMarks
      );

      return {
        ...program,
        percentage,
        grade: getGrade(percentage),
        passed: hasPassed(percentage),
      };
    }
  );

  programs.sort(
    (a, b) => b.percentage - a.percentage
  );

  return {
    results,
    programs,
    summary: {
      totalAssessments: results.length,
      assignments: results.filter(
        (result) => result.type === "assignment"
      ).length,
      quizzes: results.filter(
        (result) => result.type === "quiz"
      ).length,
      exams: results.filter(
        (result) => result.type === "exam"
      ).length,
      passed: results.filter(
        (result) => result.passed
      ).length,
      failed: results.filter(
        (result) => !result.passed
      ).length,
      totalMarksObtained,
      totalPossibleMarks,
      overallPercentage,
      overallGrade:
        results.length > 0
          ? getGrade(overallPercentage)
          : "—",
    },
  };
}

export default async function ParentAcademicPage() {
  const session = await getParentSession();

  if (!session) {
    redirect("/parent/login");
  }

  const dashboardData = await getParentDashboardData(
    session.parentId
  );

  if (!dashboardData) {
    redirect("/parent/login");
  }

  const child = dashboardData.student;

  if (!child) {
    return (
      <main className="space-y-8 px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-8 xl:px-14 2xl:px-16">
        <section className="relative overflow-hidden rounded-[2rem] bg-brand-dark p-8 text-white shadow-xl sm:p-10 lg:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-gold/10 blur-2xl" />
          <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-brand-green/30 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/20 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
              Academic Performance
            </div>

            <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
              My Child’s Academic Performance
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
              View your child’s academic progress, assessment
              results and overall performance from the parent
              portal.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-200 bg-white p-9 text-center shadow-sm sm:p-12 lg:p-14">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-cream text-4xl shadow-inner">
            👨‍🎓
          </div>

          <h2 className="mt-7 text-xl font-black tracking-tight text-gray-900">
            No Child Linked
          </h2>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-500">
            There is currently no student application linked to
            your parent account. Please contact the college
            administration for assistance.
          </p>

          <Link
            href="/contact"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md"
          >
            Contact College
            <span>→</span>
          </Link>
        </section>
      </main>
    );
  }

  const academic = await getAcademicResults(child.id);

  const childName = getChildName(child);

  const applicationNumber =
    child.application_number || "Not available";

  const admissionNumber =
    child.admission_number || "Not yet assigned";

  const programme =
    child.course || "Programme not specified";

  const { results, programs, summary } = academic;

  return (
    <main className="space-y-8 px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-8 xl:px-14 2xl:px-16 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-brand-dark text-white shadow-xl">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-gold/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-brand-green/30 blur-3xl" />

        <div className="relative p-8 sm:p-10 lg:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/20 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
                Academic Performance
              </div>

              <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                My Child’s Academic Performance
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                Monitor your child’s academic progress,
                assessment results and overall performance
                throughout their studies.
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/10 text-2xl font-black text-brand-gold shadow-lg backdrop-blur-sm">
              {childName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="h-1.5 bg-brand-gold" />
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-7 shadow-sm sm:p-8 lg:p-9">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-cream text-xl font-black text-brand-green ring-1 ring-brand-green/10">
            {childName
              .split(" ")
              .slice(0, 2)
              .map((name) =>
                name.charAt(0).toUpperCase()
              )
              .join("")}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-green">
              Child Profile
            </p>

            <h2 className="mt-2 truncate text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
              {childName}
            </h2>

            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-500">
              <span>
                <strong className="font-bold text-gray-700">
                  Application:
                </strong>{" "}
                {applicationNumber}
              </span>

              <span>
                <strong className="font-bold text-gray-700">
                  Admission:
                </strong>{" "}
                {admissionNumber}
              </span>

              <span>
                <strong className="font-bold text-gray-700">
                  Programme:
                </strong>{" "}
                {programme}
              </span>
            </div>
          </div>

          <Link
            href="/parent/dashboard/child"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-brand-gold/40 hover:bg-brand-cream hover:text-brand-green"
          >
            View Profile
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] bg-brand-dark text-white shadow-xl">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-brand-gold/10 blur-3xl" />

        <div className="relative p-8 sm:p-10 lg:p-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
                Overall Performance
              </p>

              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-black tracking-tight sm:text-6xl">
                  {summary.overallPercentage.toFixed(1)}%
                </span>

                <span className="mb-2 text-sm font-medium text-white/50">
                  overall score
                </span>
              </div>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
                Based on {summary.totalAssessments} finalized
                assessment
                {summary.totalAssessments === 1 ? "" : "s"}{" "}
                with recorded marks.
              </p>
            </div>

            <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-full border-[10px] border-brand-gold/20 bg-white/5 shadow-inner">
              <span className="text-4xl font-black text-brand-gold">
                {summary.overallGrade}
              </span>

              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                Grade
              </span>
            </div>
          </div>

          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between gap-4 text-xs font-medium text-white/50">
              <span>Performance Progress</span>

              <span className="text-right">
                {formatNumber(
                  summary.totalMarksObtained
                )}{" "}
                /{" "}
                {formatNumber(
                  summary.totalPossibleMarks
                )}{" "}
                marks
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand-gold shadow-[0_0_16px_rgba(215,169,59,0.25)] transition-all"
                style={{
                  width: `${Math.min(
                    Math.max(
                      summary.overallPercentage,
                      0
                    ),
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <div className="group rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              📚
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total
            </span>
          </div>

          <p className="mt-6 text-2xl font-black text-gray-900">
            {summary.totalAssessments}
          </p>

          <p className="mt-1.5 text-sm font-medium text-gray-500">
            Assessments
          </p>
        </div>

        <div className="group rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700">
              ✓
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Good
            </span>
          </div>

          <p className="mt-6 text-2xl font-black text-emerald-700">
            {summary.passed}
          </p>

          <p className="mt-1.5 text-sm font-medium text-gray-500">
            Passed
          </p>
        </div>

        <div className="group rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
              !
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              Review
            </span>
          </div>

          <p className="mt-6 text-2xl font-black text-red-600">
            {summary.failed}
          </p>

          <p className="mt-1.5 text-sm font-medium text-gray-500">
            Needs Improvement
          </p>
        </div>

        <div className="group rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl">
              🎓
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Final
            </span>
          </div>

          <p className="mt-6 text-2xl font-black text-gray-900">
            {summary.exams}
          </p>

          <p className="mt-1.5 text-sm font-medium text-gray-500">
            Exams
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm sm:p-9 lg:p-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-green">
            Assessment Breakdown
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
            My Child’s Results
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            A summary of assignments, quizzes and examinations
            with recorded results.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 sm:p-7 transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                📝
              </div>

              <span className="text-2xl font-black text-blue-700">
                {summary.assignments}
              </span>
            </div>

            <p className="mt-5 text-sm font-bold text-gray-800">
              Assignments
            </p>

            <p className="mt-1.5 text-xs text-gray-500">
              Coursework assessments
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-6 sm:p-7 transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                ❓
              </div>

              <span className="text-2xl font-black text-purple-700">
                {summary.quizzes}
              </span>
            </div>

            <p className="mt-5 text-sm font-bold text-gray-800">
              Quizzes
            </p>

            <p className="mt-1.5 text-xs text-gray-500">
              Continuous assessments
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 sm:p-7 transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                🎓
              </div>

              <span className="text-2xl font-black text-amber-700">
                {summary.exams}
              </span>
            </div>

            <p className="mt-5 text-sm font-bold text-gray-800">
              Examinations
            </p>

            <p className="mt-1.5 text-xs text-gray-500">
              Formal examinations
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm sm:p-9 lg:p-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-green">
            Programme Performance
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
            Performance by Programme
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            See how your child is performing across enrolled
            programmes.
          </p>
        </div>

        {programs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              📊
            </div>

            <h3 className="mt-5 font-bold text-gray-900">
              No programme results yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Programme performance will appear here once
              assessments have been graded.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {programs.map((program) => (
              <div
                key={program.id}
                className="rounded-2xl border border-gray-200 p-7 transition hover:border-brand-gold/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900">
                      {program.name}
                    </h3>

                    {program.code && (
                      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                        {program.code}
                      </p>
                    )}
                  </div>

                  <span
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-black shadow-sm ${getGradeClasses(
                      program.grade
                    )}`}
                  >
                    {program.grade}
                  </span>
                </div>

                <div className="mt-7 flex items-end justify-between gap-5">
                  <div>
                    <p className="text-3xl font-black tracking-tight text-gray-900">
                      {program.percentage.toFixed(1)}%
                    </p>

                    <p className="mt-1.5 text-xs font-medium text-gray-500">
                      {program.assessmentCount} assessment
                      {program.assessmentCount === 1
                        ? ""
                        : "s"}{" "}
                      •{" "}
                      {formatNumber(
                        program.marksObtained
                      )}{" "}
                      /{" "}
                      {formatNumber(
                        program.totalMarks
                      )}{" "}
                      marks
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                      program.passed
                    )}`}
                  >
                    {getStatusLabel(program.passed)}
                  </span>
                </div>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-green transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          program.percentage,
                          0
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-8 sm:p-9 lg:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-green">
            Assessment Results
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
            Recent Academic Results
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            View the marks and grades recorded for your child’s
            assessments.
          </p>
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center sm:p-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-cream text-3xl">
              📚
            </div>

            <h3 className="mt-6 text-lg font-black text-gray-900">
              No academic results yet
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              Results will appear here after your child
              completes assessments and they have been graded.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50/80">
                  <tr>
                    <th className="px-8 py-6 lg:px-10 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                      Assessment
                    </th>

                    <th className="px-8 py-6 lg:px-10 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                      Programme
                    </th>

                    <th className="px-8 py-6 lg:px-10 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                      Date
                    </th>

                    <th className="px-8 py-6 lg:px-10 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                      Score
                    </th>

                    <th className="px-8 py-6 lg:px-10 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                      Grade
                    </th>

                    <th className="px-8 py-6 lg:px-10 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {results.map((result) => (
                    <tr
                      key={result.id}
                      className="transition hover:bg-brand-cream/30"
                    >
                      <td className="px-8 py-7 lg:px-10">
                        <div className="flex items-center gap-4">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getTypeClasses(
                              result.type
                            )}`}
                          >
                            {getTypeIcon(result.type)}
                          </span>

                          <div className="min-w-0">
                            <p className="max-w-xs truncate font-bold text-gray-900">
                              {result.title}
                            </p>

                            <p className="mt-1 text-xs font-medium text-gray-500">
                              {getTypeLabel(result.type)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-7 lg:px-10">
                        <p className="max-w-[180px] truncate text-sm font-bold text-gray-700">
                          {result.program.name}
                        </p>

                        {result.unit && (
                          <p className="mt-1 max-w-[180px] truncate text-xs text-gray-400">
                            {result.unit.name}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-8 py-7 lg:px-10 text-sm font-medium text-gray-500">
                        {formatDate(result.submittedAt)}
                      </td>

                      <td className="whitespace-nowrap px-8 py-7 lg:px-10">
                        <p className="font-black text-gray-900">
                          {formatNumber(
                            result.marksObtained
                          )}{" "}
                          /{" "}
                          {formatNumber(
                            result.totalMarks
                          )}
                        </p>

                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {result.percentage.toFixed(1)}%
                        </p>
                      </td>

                      <td className="px-8 py-7 lg:px-10">
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-black ${getGradeClasses(
                            result.grade
                          )}`}
                        >
                          {result.grade}
                        </span>
                      </td>

                      <td className="px-8 py-7 lg:px-10">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClasses(
                            result.passed
                          )}`}
                        >
                          {getStatusLabel(
                            result.passed
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-7 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getTypeClasses(
                        result.type
                      )}`}
                    >
                      {getTypeIcon(result.type)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate font-black text-gray-900">
                            {result.title}
                          </h3>

                          <p className="mt-1 text-xs font-medium text-gray-500">
                            {getTypeLabel(result.type)}
                          </p>
                        </div>

                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black ${getGradeClasses(
                            result.grade
                          )}`}
                        >
                          {result.grade}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            Score
                          </p>

                          <p className="mt-1.5 font-black text-gray-900">
                            {formatNumber(
                              result.marksObtained
                            )}{" "}
                            /{" "}
                            {formatNumber(
                              result.totalMarks
                            )}
                          </p>

                          <p className="mt-1 text-xs font-medium text-gray-500">
                            {result.percentage.toFixed(1)}%
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                            Date
                          </p>

                          <p className="mt-1.5 text-sm font-bold text-gray-800">
                            {formatDate(
                              result.submittedAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <p className="truncate text-xs font-medium text-gray-500">
                          {result.program.name}
                        </p>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                            result.passed
                          )}`}
                        >
                          {getStatusLabel(
                            result.passed
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-7 sm:p-8">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
            ℹ️
          </div>

          <div>
            <h3 className="font-bold text-gray-900">
              About academic results
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Results displayed here are assessments with
              recorded marks. Some assessments may take
              additional time to appear while lecturers complete
              grading, particularly assessments containing
              manually marked questions.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 pb-4 sm:grid-cols-2">
        <Link
          href="/parent/dashboard/child"
          className="group rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-gold/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-green">
                Child
              </p>

              <h3 className="mt-2 font-black text-gray-900">
                View Child Profile
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                View your child’s admission and personal
                information.
              </p>
            </div>

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-lg font-bold text-brand-green transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>

        <Link
          href="/parent/dashboard/attendance"
          className="group rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-gold/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-green">
                Attendance
              </p>

              <h3 className="mt-2 font-black text-gray-900">
                View Attendance
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Monitor your child’s attendance and
                participation.
              </p>
            </div>

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-lg font-bold text-brand-green transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>
      </section>
    </main>
  );
}

