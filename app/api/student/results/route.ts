import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type ResultType = 'assignment' | 'quiz' | 'exam';

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
    id: number | null;
    name: string | null;
  };

  topic: {
    id: number | null;
    title: string | null;
  };

  lesson: {
    id: number | null;
    title: string | null;
  };

  feedback: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function calculatePercentage(
  obtained: number,
  total: number
): number {
  if (total <= 0) return 0;

  return Number(
    ((obtained / total) * 100).toFixed(2)
  );
}

/* ---------------------------------------------------------
   Grade

   A = 80 - 100
   B = 70 - 79
   C = 60 - 69
   D = 50 - 59
   E = below 50
--------------------------------------------------------- */

function calculateGrade(
  percentage: number
): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';

  return 'E';
}

/* ---------------------------------------------------------
   Pass

   50% and above = Pass
--------------------------------------------------------- */

function calculatePassed(
  percentage: number
): boolean {
  return percentage >= 50;
}

/* =========================================================
   GET /api/student/results
========================================================= */

export async function GET() {
  try {
    /* =======================================================
       AUTHENTICATION
    ======================================================= */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Student session has expired.',
        },
        { status: 401 }
      );
    }

    const applicationId =
      Number(session.applicationId);

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid student session.',
        },
        { status: 401 }
      );
    }

    /* =======================================================
       STUDENT INFORMATION
    ======================================================= */

    let studentName = 'Student';

    let applicationNumber =
      session.applicationNumber || null;

    let admissionNumber: string | null =
      null;

    try {
      const studentResult =
        await pool.query(
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

      if (
        studentResult.rows.length > 0
      ) {
        const student =
          studentResult.rows[0];

        studentName =
          student.student_name?.trim() ||
          'Student';

        applicationNumber =
          student.application_number ||
          applicationNumber ||
          null;

        admissionNumber =
          student.admission_number ||
          null;
      }
    } catch (error) {
      console.error(
        'STUDENT RESULTS - STUDENT INFO ERROR:',
        error
      );
    }

    /* =======================================================
       ASSIGNMENT RESULTS
       
       IMPORTANT:
       Only the student's latest submission for each
       assignment is considered.

       Only submitted/graded submissions with actual
       marks_awarded are included as scored results.
    ======================================================= */

    const assignmentResult =
      await pool.query(
        `
          WITH student_enrollments AS (
            SELECT DISTINCT ON (e.program_id)
              e.id AS enrollment_id,
              e.program_id

            FROM lms_enrollments e

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

            ORDER BY
              e.program_id,
              e.enrolled_at DESC NULLS LAST,
              e.id DESC
          ),

          latest_submissions AS (
            SELECT DISTINCT ON (
              s.assignment_id
            )
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
            s.id AS submission_id,

            s.assignment_id,

            s.status AS submission_status,

            s.submitted_at,

            s.total_marks AS submission_total_marks,

            s.marks_awarded,

            s.lecturer_feedback,

            s.graded_at,

            a.title AS assignment_title,

            a.total_marks AS assignment_total_marks,

            l.id AS lesson_id,
            l.title AS lesson_title,

            t.id AS topic_id,
            t.title AS topic_title,

            u.id AS unit_id,
            u.name AS unit_name,

            p.id AS program_id,
            p.name AS program_name,
            p.code AS program_code

          FROM latest_submissions s

          INNER JOIN lms_assignments a
            ON a.id = s.assignment_id

          INNER JOIN lms_lessons l
            ON l.id = a.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_programs p
            ON p.id = u.program_id

          INNER JOIN student_enrollments e
            ON e.program_id = p.id

          WHERE LOWER(
            COALESCE(
              t.status::text,
              'active'
            )
          ) = 'active'

            AND LOWER(
              COALESCE(
                l.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                a.status::text,
                'active'
              )
            ) IN (
              'active',
              'published'
            )

          ORDER BY
            s.submitted_at DESC NULLS LAST,
            s.id DESC
        `,
        [applicationId]
      );

    /* =======================================================
       QUIZ / EXAM RESULTS
       
       Only completed attempts are returned.

       If a student has multiple attempts for the same
       assessment, the latest completed attempt is used.
       
       Attempts still in_progress are excluded.

       Attempts with status "submitted" are considered
       pending manual grading and are excluded from the
       final scored results.
    ======================================================= */

    const quizResult =
      await pool.query(
        `
          WITH student_enrollments AS (
            SELECT DISTINCT ON (e.program_id)
              e.id AS enrollment_id,
              e.program_id

            FROM lms_enrollments e

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

            ORDER BY
              e.program_id,
              e.enrolled_at DESC NULLS LAST,
              e.id DESC
          ),

          latest_attempts AS (
            SELECT DISTINCT ON (
              qa.quiz_id
            )
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
            qa.id AS attempt_id,

            qa.quiz_id,

            qa.attempt_number,

            qa.started_at,

            qa.submitted_at,

            qa.score,

            qa.total_marks,

            qa.percentage,

            qa.status,

            q.title AS quiz_title,

            q.description AS quiz_description,

            q.show_results,

            q.show_correct_answers,

            q.passing_score,

            l.id AS lesson_id,
            l.title AS lesson_title,

            t.id AS topic_id,
            t.title AS topic_title,

            u.id AS unit_id,
            u.name AS unit_name,

            p.id AS program_id,
            p.name AS program_name,
            p.code AS program_code

          FROM latest_attempts qa

          INNER JOIN lms_quizzes q
            ON q.id = qa.quiz_id

          INNER JOIN lms_lessons l
            ON l.id = q.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_programs p
            ON p.id = u.program_id

          INNER JOIN student_enrollments e
            ON e.program_id = p.id

          WHERE LOWER(
            COALESCE(
              t.status::text,
              'active'
            )
          ) = 'active'

            AND LOWER(
              COALESCE(
                l.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                q.status::text,
                'active'
              )
            ) IN (
              'active',
              'published'
            )

          ORDER BY
            qa.submitted_at DESC NULLS LAST,
            qa.id DESC
        `,
        [applicationId]
      );

    /* =======================================================
       BUILD UNIFIED RESULTS
    ======================================================= */

    const results: ResultRow[] = [];

    /* =======================================================
       ASSIGNMENTS
    ======================================================= */

    for (
      const row
      of assignmentResult.rows
    ) {
      const status =
        String(
          row.submission_status ||
            ''
        )
          .trim()
          .toLowerCase();

      const marksObtained =
        Number(
          row.marks_awarded ?? 0
        );

      const totalMarks =
        Number(
          row.submission_total_marks ??
            row.assignment_total_marks ??
            0
        );

      /*
       * A submission without marks is not
       * yet a final academic result.
       */
      const hasMarks =
        row.marks_awarded !== null &&
        row.marks_awarded !== undefined;

      if (
        !hasMarks ||
        !['submitted', 'graded'].includes(
          status
        )
      ) {
        continue;
      }

      const percentage =
        calculatePercentage(
          marksObtained,
          totalMarks
        );

      results.push({
        id: `assignment-${Number(
          row.assignment_id
        )}`,

        sourceId:
          Number(
            row.assignment_id
          ),

        type: 'assignment',

        title:
          row.assignment_title ||
          'Assignment',

        marksObtained,

        totalMarks,

        percentage,

        grade:
          calculateGrade(
            percentage
          ),

        passed:
          calculatePassed(
            percentage
          ),

        status,

        submittedAt:
          row.submitted_at
            ? new Date(
                row.submitted_at
              ).toISOString()
            : null,

        gradedAt:
          row.graded_at
            ? new Date(
                row.graded_at
              ).toISOString()
            : null,

        attemptNumber: null,

        program: {
          id:
            Number(
              row.program_id
            ),

          name:
            row.program_name ||
            'Program',

          code:
            row.program_code ||
            null,
        },

        unit: {
          id:
            row.unit_id !== null
              ? Number(
                  row.unit_id
                )
              : null,

          name:
            row.unit_name ||
            null,
        },

        topic: {
          id:
            row.topic_id !== null
              ? Number(
                  row.topic_id
                )
              : null,

          title:
            row.topic_title ||
            null,
        },

        lesson: {
          id:
            row.lesson_id !== null
              ? Number(
                  row.lesson_id
                )
              : null,

          title:
            row.lesson_title ||
            null,
        },

        feedback:
          row.lecturer_feedback ||
          null,
      });
    }

    /* =======================================================
       QUIZZES / EXAMS
    ======================================================= */

    for (
      const row
      of quizResult.rows
    ) {
      const score =
        Number(
          row.score ?? 0
        );

      const totalMarks =
        Number(
          row.total_marks ?? 0
        );

      /*
       * Recalculate percentage from the actual
       * marks rather than blindly trusting the
       * stored percentage.
       */
      const percentage =
        calculatePercentage(
          score,
          totalMarks
        );

      /*
       * Determine whether this is a quiz or
       * an examination from its title.
       *
       * Existing LMS does not have a separate
       * assessment_type column in lms_quizzes.
       */
      const title =
        String(
          row.quiz_title ||
            'Quiz'
        );

      const lowerTitle =
        title.toLowerCase();

      const isExam =
        lowerTitle.includes(
          'exam'
        ) ||
        lowerTitle.includes(
          'examination'
        ) ||
        lowerTitle.includes(
          'end term'
        ) ||
        lowerTitle.includes(
          'final'
        );

      results.push({
        id: `quiz-${Number(
          row.attempt_id
        )}`,

        sourceId:
          Number(
            row.attempt_id
          ),

        type: isExam
          ? 'exam'
          : 'quiz',

        title,

        marksObtained:
          score,

        totalMarks,

        percentage,

        grade:
          calculateGrade(
            percentage
          ),

        passed:
          calculatePassed(
            percentage
          ),

        status:
          String(
            row.status ||
              'graded'
          ),

        submittedAt:
          row.submitted_at
            ? new Date(
                row.submitted_at
              ).toISOString()
            : null,

        gradedAt:
          row.submitted_at
            ? new Date(
                row.submitted_at
              ).toISOString()
            : null,

        attemptNumber:
          row.attempt_number !==
          null
            ? Number(
                row.attempt_number
              )
            : null,

        program: {
          id:
            Number(
              row.program_id
            ),

          name:
            row.program_name ||
            'Program',

          code:
            row.program_code ||
            null,
        },

        unit: {
          id:
            row.unit_id !== null
              ? Number(
                  row.unit_id
                )
              : null,

          name:
            row.unit_name ||
            null,
        },

        topic: {
          id:
            row.topic_id !== null
              ? Number(
                  row.topic_id
                )
              : null,

          title:
            row.topic_title ||
            null,
        },

        lesson: {
          id:
            row.lesson_id !== null
              ? Number(
                  row.lesson_id
                )
              : null,

          title:
            row.lesson_title ||
            null,
        },

        feedback: null,
      });
    }

    /* =======================================================
       SORT RESULTS
       
       Newest results first.
    ======================================================= */

    results.sort((a, b) => {
      const aTime = a.submittedAt
        ? new Date(
            a.submittedAt
          ).getTime()
        : 0;

      const bTime = b.submittedAt
        ? new Date(
            b.submittedAt
          ).getTime()
        : 0;

      return bTime - aTime;
    });

    /* =======================================================
       OVERALL TOTALS
       
       IMPORTANT:
       
       We DO NOT average individual percentages.
       
       We combine actual marks:
       
       total obtained
       ---------------- × 100
       total possible
    ======================================================= */

    const totalMarksObtained =
      results.reduce(
        (total, result) =>
          total +
          result.marksObtained,
        0
      );

    const totalPossibleMarks =
      results.reduce(
        (total, result) =>
          total +
          result.totalMarks,
        0
      );

    const overallPercentage =
      calculatePercentage(
        totalMarksObtained,
        totalPossibleMarks
      );

    const overallGrade =
      results.length > 0
        ? calculateGrade(
            overallPercentage
          )
        : null;

    const totalAssessments =
      results.length;

    const assignmentResults =
      results.filter(
        (result) =>
          result.type ===
          'assignment'
      );

    const quizResults =
      results.filter(
        (result) =>
          result.type === 'quiz'
      );

    const examResults =
      results.filter(
        (result) =>
          result.type === 'exam'
      );

    const completedAssignments =
      assignmentResults.length;

    const completedQuizzes =
      quizResults.length;

    const completedExams =
      examResults.length;

    const passedAssessments =
      results.filter(
        (result) =>
          result.passed
      ).length;

    const failedAssessments =
      results.filter(
        (result) =>
          !result.passed
      ).length;

    /* =======================================================
       PROGRAM SUMMARY
    ======================================================= */

    const programMap =
      new Map<
        number,
        {
          id: number;
          name: string;
          code: string | null;

          marksObtained: number;
          totalMarks: number;

          assessmentCount: number;
        }
      >();

    for (
      const result
      of results
    ) {
      const programId =
        result.program.id;

      if (
        !programMap.has(
          programId
        )
      ) {
        programMap.set(
          programId,
          {
            id: programId,

            name:
              result.program.name,

            code:
              result.program.code,

            marksObtained: 0,

            totalMarks: 0,

            assessmentCount: 0,
          }
        );
      }

      const program =
        programMap.get(
          programId
        )!;

      program.marksObtained +=
        result.marksObtained;

      program.totalMarks +=
        result.totalMarks;

      program.assessmentCount +=
        1;
    }

    const programs =
      Array.from(
        programMap.values()
      ).map(
        (program) => {
          const percentage =
            calculatePercentage(
              program.marksObtained,
              program.totalMarks
            );

          return {
            ...program,

            percentage,

            grade:
              calculateGrade(
                percentage
              ),

            passed:
              calculatePassed(
                percentage
              ),
          };
        }
      );

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        student: {
          applicationId,

          name:
            studentName,

          applicationNumber,

          admissionNumber,
        },

        summary: {
          totalAssessments,

          assignments:
            completedAssignments,

          quizzes:
            completedQuizzes,

          exams:
            completedExams,

          passed:
            passedAssessments,

          failed:
            failedAssessments,

          totalMarksObtained,

          totalPossibleMarks,

          overallPercentage,

          overallGrade,
        },

        programs,

        results,
      },
      {
        status: 200,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',

          Pragma: 'no-cache',

          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error(
      'STUDENT RESULTS API ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load your results at the moment.',
      },
      { status: 500 }
    );
  }
}

