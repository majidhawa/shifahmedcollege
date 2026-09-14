import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  Layers3,
  Sparkles,
  PlayCircle,
} from 'lucide-react';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

interface Lesson {
  id: number;
  title: string;
  description: string | null;
  content: string | null;
  orderNumber: number;
  status: string;
}

interface Topic {
  id: number;
  title: string;
  description: string | null;
  orderNumber: number;
  status: string;
  lessonCount: number;
  lessons: Lesson[];
}

interface Unit {
  id: number;
  programId: number;
  name: string;
  description: string | null;
  enrollmentId: number | null;
  enrollmentStatus: string;
  assigned: boolean;
  topicCount: number;
  lessonCount: number;
  topics: Topic[];
}

interface Program {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  duration: string | null;
  level: string | null;
  enrollmentId: number;
  studentNumber: string | null;
  yearOfStudy: number | null;
  enrollmentStatus: string;
  lecturerName: string | null;
}

/* =========================================================
   STUDENT UNITS PAGE
   /student/dashboard/units
========================================================= */

export default async function StudentUnitsPage({
  searchParams,
}: {
  searchParams: {
    program_id?: string;
  };
}) {
  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  const session = await getStudentSession();

  if (!session) {
    redirect('/student/login');
  }

  const applicationId = Number(session.applicationId);

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    redirect('/student/login');
  }

  /* =======================================================
     PROGRAM FILTER
  ======================================================= */

  let requestedProgramId: number | null = null;

  if (searchParams.program_id) {
    const parsedProgramId = Number(
      searchParams.program_id
    );

    if (
      Number.isInteger(parsedProgramId) &&
      parsedProgramId > 0
    ) {
      requestedProgramId = parsedProgramId;
    }
  }

  /* =======================================================
     STUDENT INFORMATION
  ======================================================= */

  let studentName = 'Student';

  let applicationNumber =
    session.applicationNumber || null;

  let admissionNumber: string | null = null;

  try {
    const studentResult = await pool.query(
      `
        SELECT
          a.id AS application_id,
          a.application_number,

          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          ) AS student_name,

          COALESCE(
            ad.admission_number,
            a.admission_number
          ) AS admission_number

        FROM applications a

        LEFT JOIN admissions ad
          ON ad.application_id = a.id

        WHERE a.id = $1

        LIMIT 1
      `,
      [applicationId]
    );

    if (studentResult.rows.length > 0) {
      const row = studentResult.rows[0];

      studentName =
        row.student_name?.trim() ||
        'Student';

      applicationNumber =
        row.application_number ||
        applicationNumber ||
        null;

      admissionNumber =
        row.admission_number ||
        null;
    }
  } catch (error) {
    console.error(
      'STUDENT UNITS - STUDENT INFORMATION ERROR:',
      error
    );
  }

  /* =======================================================
     PROGRAM + UNITS
  ======================================================= */

  let program: Program | null = null;
  let units: Unit[] = [];

  /* =======================================================
     GET STUDENT ENROLLMENT
  ======================================================= */

  const enrollmentResult = await pool.query(
    `
      SELECT
        e.id AS enrollment_id,
        e.program_id,
        e.student_number,
        e.year_of_study,
        e.enrollment_status,
        e.enrolled_at,

        p.name AS program_name,
        p.code AS program_code,
        p.description AS program_description,
        p.duration,
        p.level,
        p.status AS program_status,

        lecturer.name AS lecturer_name

      FROM lms_enrollments e

      INNER JOIN lms_programs p
        ON p.id = e.program_id

      LEFT JOIN LATERAL (
        SELECT
          u.name
        FROM lms_lecturer_programs lp

        INNER JOIN users u
          ON u.id = lp.lecturer_id

        WHERE lp.program_id = p.id

        ORDER BY
          u.name ASC,
          u.id ASC

        LIMIT 1
      ) lecturer
        ON TRUE

      WHERE e.application_id = $1

        AND (
          e.enrollment_status IS NULL
          OR LOWER(
            e.enrollment_status::text
          ) NOT IN (
            'cancelled',
            'dropped'
          )
        )

        AND (
          $2::integer IS NULL
          OR e.program_id = $2
        )

        AND (
          p.status IS NULL
          OR LOWER(
            p.status::text
          ) NOT IN (
            'inactive',
            'deleted',
            'archived'
          )
        )

      ORDER BY
        e.enrolled_at DESC NULLS LAST,
        e.id DESC

      LIMIT 1
    `,
    [
      applicationId,
      requestedProgramId,
    ]
  );

  /* =======================================================
     NO ENROLLMENT
  ======================================================= */

  if (enrollmentResult.rows.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">

        <PageHeader
          studentName={studentName}
          applicationNumber={applicationNumber}
          admissionNumber={admissionNumber}
        />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <EmptyState />
        </main>

      </div>
    );
  }

  /* =======================================================
     BUILD PROGRAM
  ======================================================= */

  const enrollment =
    enrollmentResult.rows[0];

  const enrollmentId =
    Number(enrollment.enrollment_id);

  const programId =
    Number(enrollment.program_id);

  program = {
    id: programId,

    name:
      enrollment.program_name ||
      'Unnamed Course',

    code:
      enrollment.program_code ||
      null,

    description:
      enrollment.program_description ||
      null,

    duration:
      enrollment.duration ||
      null,

    level:
      enrollment.level ||
      null,

    enrollmentId,

    studentNumber:
      enrollment.student_number ||
      null,

    yearOfStudy:
      enrollment.year_of_study !== null
        ? Number(enrollment.year_of_study)
        : null,

    enrollmentStatus:
      enrollment.enrollment_status ||
      'active',

    lecturerName:
      enrollment.lecturer_name?.trim() ||
      null,
  };

  console.log(
    'STUDENT UNITS - SELECTED PROGRAM:',
    {
      applicationId,
      requestedProgramId,
      enrollmentId,
      programId,
      programName: program.name,
      lecturerName: program.lecturerName,
    }
  );

  /* =======================================================
     GET UNITS
     
     We intentionally return every unit belonging
     to the selected program.

     lms_unit_enrollments is used only to determine
     whether the unit has specifically been assigned
     to the student.
  ======================================================= */

  const unitsResult = await pool.query(
    `
      SELECT
        u.id AS unit_id,
        u.program_id,

        u.name AS unit_name,
        u.description AS unit_description,

        ue.id AS unit_enrollment_id,
        ue.status AS unit_enrollment_status

      FROM lms_units u

      LEFT JOIN LATERAL (
        SELECT
          ue.id,
          ue.status

        FROM lms_unit_enrollments ue

        WHERE ue.unit_id = u.id
          AND ue.enrollment_id = $1

        ORDER BY
          ue.id DESC

        LIMIT 1
      ) ue
        ON TRUE

      WHERE u.program_id = $2

      ORDER BY
        u.id ASC
    `,
    [
      enrollmentId,
      programId,
    ]
  );

  console.log(
    'STUDENT UNITS - UNITS FOUND:',
    unitsResult.rows
  );

  /* =======================================================
     GET ACTIVE TOPICS
  ======================================================= */

  const topicsResult = await pool.query(
    `
      SELECT
        t.id AS topic_id,
        t.unit_id,

        t.title AS topic_title,
        t.description AS topic_description,

        t.order_number,
        t.status

      FROM lms_topics t

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      WHERE u.program_id = $1

        AND (
          t.status IS NULL
          OR LOWER(
            t.status::text
          ) = 'active'
        )

      ORDER BY
        t.unit_id ASC,
        t.order_number ASC NULLS LAST,
        t.id ASC
    `,
    [programId]
  );

  /* =======================================================
     GET ACTIVE LESSONS
     
     NOTE:
     Documents and videos are intentionally NOT loaded
     here anymore because they now belong under the
     separate Class Resources section.
  ======================================================= */

  const lessonsResult = await pool.query(
    `
      SELECT
        l.id AS lesson_id,
        l.topic_id,

        l.title AS lesson_title,
        l.description AS lesson_description,
        l.content AS lesson_content,

        l.order_number,
        l.status

      FROM lms_lessons l

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      WHERE u.program_id = $1

        AND (
          l.status IS NULL
          OR LOWER(
            l.status::text
          ) = 'active'
        )

      ORDER BY
        u.id ASC,
        t.order_number ASC NULLS LAST,
        t.id ASC,
        l.order_number ASC NULLS LAST,
        l.id ASC
    `,
    [programId]
  );

  /* =======================================================
     GROUP LESSONS BY TOPIC
  ======================================================= */

  const lessonsByTopic =
    new Map<number, Lesson[]>();

  for (const row of lessonsResult.rows) {
    const topicId =
      Number(row.topic_id);

    const lessonId =
      Number(row.lesson_id);

    if (!lessonsByTopic.has(topicId)) {
      lessonsByTopic.set(
        topicId,
        []
      );
    }

    lessonsByTopic
      .get(topicId)!
      .push({
        id: lessonId,

        title:
          row.lesson_title ||
          'Untitled Lesson',

        description:
          row.lesson_description ||
          null,

        content:
          row.lesson_content ||
          null,

        orderNumber:
          row.order_number !== null
            ? Number(row.order_number)
            : 0,

        status:
          row.status ||
          'active',
      });
  }

  /* =======================================================
     GROUP TOPICS BY UNIT
  ======================================================= */

  const topicsByUnit =
    new Map<number, Topic[]>();

  for (const row of topicsResult.rows) {
    const unitId =
      Number(row.unit_id);

    const topicId =
      Number(row.topic_id);

    const lessons =
      lessonsByTopic.get(topicId) || [];

    if (!topicsByUnit.has(unitId)) {
      topicsByUnit.set(
        unitId,
        []
      );
    }

    topicsByUnit
      .get(unitId)!
      .push({
        id: topicId,

        title:
          row.topic_title ||
          'Untitled Topic',

        description:
          row.topic_description ||
          null,

        orderNumber:
          row.order_number !== null
            ? Number(row.order_number)
            : 0,

        status:
          row.status ||
          'active',

        lessonCount:
          lessons.length,

        lessons,
      });
  }

  /* =======================================================
     BUILD UNIT TREE
  ======================================================= */

  units =
    unitsResult.rows.map((row) => {
      const unitId =
        Number(row.unit_id);

      const unitEnrollmentId =
        row.unit_enrollment_id !== null
          ? Number(
              row.unit_enrollment_id
            )
          : null;

      const unitEnrollmentStatus =
        row.unit_enrollment_status ||
        null;

      const normalizedStatus =
        unitEnrollmentStatus
          ? String(
              unitEnrollmentStatus
            ).toLowerCase()
          : null;

      const assigned =
        unitEnrollmentId !== null &&
        normalizedStatus !== 'cancelled' &&
        normalizedStatus !== 'dropped';

      const topics =
        topicsByUnit.get(unitId) || [];

      const lessonCount =
        topics.reduce(
          (total, topic) =>
            total +
            topic.lessons.length,
          0
        );

      return {
        id: unitId,

        programId:
          Number(row.program_id),

        name:
          row.unit_name ||
          'Untitled Unit',

        description:
          row.unit_description ||
          null,

        enrollmentId:
          unitEnrollmentId,

        enrollmentStatus:
          unitEnrollmentStatus ||
          'not_assigned',

        assigned,

        topicCount:
          topics.length,

        lessonCount,

        topics,
      };
    });

  /* =======================================================
     STATISTICS
  ======================================================= */

  const totalUnits =
    units.length;

  const assignedUnits =
    units.filter(
      (unit) => unit.assigned
    ).length;

  const totalTopics =
    units.reduce(
      (total, unit) =>
        total +
        unit.topicCount,
      0
    );

  const totalLessons =
    units.reduce(
      (total, unit) =>
        total +
        unit.lessonCount,
      0
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">

      <PageHeader
        studentName={studentName}
        applicationNumber={applicationNumber}
        admissionNumber={admissionNumber}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* =================================================
            BACK
        ================================================= */}

        <div className="mb-6">

          <Link
            href="/student/dashboard/courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to My Courses
          </Link>

        </div>

        {/* =================================================
            PROGRAM HEADER
        ================================================= */}

        {program && (
          <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 shadow-lg">

            <div className="relative p-6 sm:p-8">

              <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/5" />

              <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-yellow-400/5" />

              <div className="relative">

                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                  <div>

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">

                      <GraduationCap className="h-4 w-4 text-yellow-300" />

                      Student Learning Portal

                    </div>

                    {program.code && (
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">
                        {program.code}
                      </p>
                    )}

                    <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                      {program.name}
                    </h1>

                    {program.lecturerName && (
                      <div className="mt-3 flex items-center gap-2">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-yellow-300">

                          <GraduationCap className="h-4 w-4" />

                        </div>

                        <div>

                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/70">
                            Course Lecturer
                          </p>

                          <p className="text-sm font-semibold text-white">
                            {program.lecturerName}
                          </p>

                        </div>

                      </div>
                    )}

                    {program.description && (
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/80 sm:text-base">
                        {program.description}
                      </p>
                    )}

                  </div>

                  <div className="flex flex-wrap gap-3">

                    <InfoBadge
                      icon={
                        <Layers3 className="h-4 w-4" />
                      }
                      value={totalUnits}
                      label="Units"
                    />

                    <InfoBadge
                      icon={
                        <BookOpen className="h-4 w-4" />
                      }
                      value={totalTopics}
                      label="Topics"
                    />

                    <InfoBadge
                      icon={
                        <PlayCircle className="h-4 w-4" />
                      }
                      value={totalLessons}
                      label="Lessons"
                    />

                  </div>

                </div>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <StatCard
            icon={
              <Layers3 className="h-5 w-5" />
            }
            label="Course Units"
            value={totalUnits}
            description="Units available in your course"
          />

          <StatCard
            icon={
              <BookOpen className="h-5 w-5" />
            }
            label="Topics"
            value={totalTopics}
            description="Topics across your course units"
          />

          <StatCard
            icon={
              <PlayCircle className="h-5 w-5" />
            }
            label="Lessons"
            value={totalLessons}
            description="Lessons available to study"
          />

        </section>

        {/* =================================================
            CURRICULUM NOTICE
        ================================================= */}

        {totalUnits > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">

                <Sparkles className="h-4 w-4" />

              </div>

              <div>

                <p className="text-sm font-semibold text-emerald-900">
                  Course curriculum
                </p>

                <p className="text-xs text-emerald-700">
                  {assignedUnits} of {totalUnits} units
                  specifically assigned to your enrollment.
                </p>

              </div>

            </div>

          </div>
        )}

        {/* =================================================
            UNITS
        ================================================= */}

        <section>

          <div className="mb-5">

            <h2 className="text-xl font-bold text-slate-900">
              Course Learning Units
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Open a unit to read its introduction,
              explore topics and study individual lessons.
            </p>

          </div>

          {units.length === 0 ? (
            <EmptyUnits />
          ) : (
            <div className="space-y-4">

              {units.map(
                (unit, index) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    number={index + 1}
                  />
                )
              )}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   PAGE HEADER
========================================================= */

function PageHeader({
  studentName,
  applicationNumber,
  admissionNumber,
}: {
  studentName: string;
  applicationNumber: string | null;
  admissionNumber: string | null;
}) {
  return (
    <div className="border-b border-slate-200 bg-white">

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">

              <GraduationCap className="h-4 w-4" />

              <span>Student LMS</span>

            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Units & Lessons
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Welcome back, {studentName}. Continue learning
              through your course units.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

              <BookOpen className="h-5 w-5" />

            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Admission Number
              </p>

              <p className="text-sm font-bold text-slate-900">
                {admissionNumber ||
                  'Not available'}
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   INFO BADGE
========================================================= */

function InfoBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3">

      <div className="text-yellow-300">
        {icon}
      </div>

      <div>

        <p className="text-lg font-bold text-white">
          {value}
        </p>

        <p className="text-[11px] text-emerald-100/70">
          {label}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

          {icon}

        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>

      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   UNIT CARD
========================================================= */

function UnitCard({
  unit,
  number,
}: {
  unit: Unit;
  number: number;
}) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <summary className="cursor-pointer list-none p-5 sm:p-6">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

            <Layers3 className="h-6 w-6" />

          </div>

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-2">

              <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Unit {number}
              </span>

              {unit.assigned ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Assigned
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  Course Unit
                </span>
              )}

            </div>

            <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
              {unit.name}
            </h3>

            {unit.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                {unit.description}
              </p>
            )}

          </div>

          <div className="hidden shrink-0 items-center gap-4 sm:flex">

            <div className="text-center">

              <p className="text-lg font-bold text-slate-900">
                {unit.topicCount}
              </p>

              <p className="text-[11px] text-slate-500">
                Topics
              </p>

            </div>

            <div className="text-center">

              <p className="text-lg font-bold text-slate-900">
                {unit.lessonCount}
              </p>

              <p className="text-[11px] text-slate-500">
                Lessons
              </p>

            </div>

          </div>

          <div className="shrink-0 text-slate-400">

            <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />

          </div>

        </div>

        <div className="mt-4 flex flex-wrap gap-4 sm:hidden">

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">

            <BookOpen className="h-4 w-4 text-emerald-700" />

            {unit.topicCount} Topics

          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">

            <PlayCircle className="h-4 w-4 text-emerald-700" />

            {unit.lessonCount} Lessons

          </span>

        </div>

      </summary>

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-5 sm:px-6">

        {unit.description && (
          <div className="mb-5 rounded-xl border border-emerald-100 bg-white p-5">

            <div className="mb-3 flex items-center gap-2">

              <FileText className="h-5 w-5 text-emerald-700" />

              <h4 className="font-bold text-slate-900">
                About This Unit
              </h4>

            </div>

            <div className="prose prose-sm max-w-none leading-7 text-slate-600">

              <p className="whitespace-pre-line">
                {unit.description}
              </p>

            </div>

          </div>
        )}

        {unit.topics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">

            <BookOpen className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No topics available yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Learning content for this unit will appear here
              once it has been added.
            </p>

          </div>
        ) : (
          <div className="space-y-3">

            {unit.topics.map(
              (topic, index) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  number={index + 1}
                />
              )
            )}

          </div>
        )}

      </div>

    </details>
  );
}

/* =========================================================
   TOPIC CARD
========================================================= */

function TopicCard({
  topic,
  number,
}: {
  topic: Topic;
  number: number;
}) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">

      <summary className="cursor-pointer list-none p-4">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">

            <BookOpen className="h-4 w-4" />

          </div>

          <div className="min-w-0 flex-1">

            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              Topic {number}
            </p>

            <h4 className="mt-0.5 text-sm font-bold text-slate-800 sm:text-base">
              {topic.title}
            </h4>

          </div>

          <div className="hidden items-center gap-3 sm:flex">

            <span className="text-xs text-slate-500">
              {topic.lessonCount}{' '}
              {topic.lessonCount === 1
                ? 'Lesson'
                : 'Lessons'}
            </span>

          </div>

          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />

        </div>

        {topic.description && (
          <p className="mt-3 pl-12 text-xs leading-5 text-slate-500">
            {topic.description}
          </p>
        )}

      </summary>

      <div className="border-t border-slate-100 px-4 py-4">

        {topic.lessons.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-4 text-center">

            <Clock3 className="mx-auto h-5 w-5 text-slate-300" />

            <p className="mt-2 text-xs text-slate-500">
              No lessons available yet.
            </p>

          </div>
        ) : (
          <div className="space-y-3">

            {topic.lessons.map(
              (lesson, index) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  number={index + 1}
                />
              )
            )}

          </div>
        )}

      </div>

    </details>
  );
}

/* =========================================================
   LESSON CARD
========================================================= */

function LessonCard({
  lesson,
  number,
}: {
  lesson: Lesson;
  number: number;
}) {
  return (
    <details className="group/lesson overflow-hidden rounded-xl border border-slate-200 bg-white">

      <summary className="cursor-pointer list-none p-4">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">

            <PlayCircle className="h-4 w-4" />

          </div>

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-2">

              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Lesson {number}
              </span>

            </div>

            <h5 className="mt-1 text-sm font-bold text-slate-900 sm:text-base">
              {lesson.title}
            </h5>

            {lesson.description && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {lesson.description}
              </p>
            )}

          </div>

          <div className="shrink-0 text-slate-400">

            <ChevronRight className="h-4 w-4 transition-transform group-open/lesson:rotate-90" />

          </div>

        </div>

      </summary>

      <div className="border-t border-slate-100 bg-slate-50 p-4 sm:p-6">

        {/* =================================================
            LESSON CONTENT
        ================================================= */}

        <div className="rounded-xl border border-slate-200 bg-white">

          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">

              <FileText className="h-4 w-4" />

            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Lesson {number}
              </p>

              <h6 className="text-sm font-bold text-slate-900">
                {lesson.title}
              </h6>

            </div>

          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-7">

            {lesson.description && (
              <div className="mb-6 rounded-lg bg-slate-50 p-4">

                <p className="text-sm leading-6 text-slate-600">
                  {lesson.description}
                </p>

              </div>
            )}

            {lesson.content ? (
              <article
                className="
                  prose
                  prose-slate
                  max-w-none
                  prose-headings:font-bold
                  prose-headings:text-slate-900
                  prose-p:leading-7
                  prose-p:text-slate-700
                  prose-li:text-slate-700
                  prose-strong:text-slate-900
                  prose-a:text-emerald-700
                  prose-a:font-semibold
                "
                dangerouslySetInnerHTML={{
                  __html: lesson.content,
                }}
              />
            ) : (
              <div className="py-8 text-center">

                <FileText className="mx-auto h-8 w-8 text-slate-300" />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  Lesson content is not available yet.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  The lesson has been created, but the
                  learning content has not been added.
                </p>

              </div>
            )}

          </div>

        </div>

      </div>

    </details>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">

        <GraduationCap className="h-8 w-8" />

      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-900">
        No LMS enrollment found
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Your student account is authenticated,
        but no active LMS course enrollment was
        found. Once your enrollment is created,
        your units will appear here.
      </p>

      <Link
        href="/student/dashboard/courses"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
      >
        <ArrowLeft className="h-4 w-4" />

        Back to My Courses
      </Link>

    </div>
  );
}

/* =========================================================
   EMPTY UNITS
========================================================= */

function EmptyUnits() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">

        <Layers3 className="h-8 w-8" />

      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        No units available yet
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Your course enrollment is active,
        but no learning units have been created
        for this course yet. Once units are added
        to the course, they will automatically
        appear here.
      </p>

      <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">

        <Sparkles className="h-4 w-4" />

        Course curriculum is being prepared

      </div>

    </div>
  );
}