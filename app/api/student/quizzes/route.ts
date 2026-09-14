import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getStudentSession();

    if (!session || !session.applicationId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const studentId = session.applicationId;

    /*
     * IMPORTANT:
     *
     * We intentionally DO NOT filter by:
     *
     *   available_from <= NOW()
     *   available_until >= NOW()
     *
     * here.
     *
     * The student dashboard needs to display:
     *
     * 1. Upcoming quizzes
     * 2. Currently available quizzes
     * 3. In-progress quizzes
     * 4. Completed quizzes
     * 5. Past quizzes
     *
     * Therefore, all active/published quizzes assigned to the
     * student's enrolled programs are returned.
     *
     * The actual START ATTEMPT API must still enforce the
     * availability window server-side.
     */

    const result = await pool.query(
      `
      SELECT
        q.id,
        q.lesson_id,
        q.title,
        q.description,
        q.instructions,
        q.total_marks,
        q.time_limit_minutes,
        q.attempts_allowed,
        q.passing_score,
        q.status,
        q.shuffle_questions,
        q.shuffle_options,
        q.show_results,
        q.show_correct_answers,
        q.available_from,
        q.available_until,
        q.created_at,

        l.title AS lesson_title,

        t.id AS topic_id,
        t.title AS topic_title,

        u.id AS unit_id,
        u.name AS unit_name,

        p.id AS program_id,
        p.name AS program_name,

        COUNT(DISTINCT qq.id)::int AS question_count,

        /*
         * Completed attempts
         */
        COUNT(DISTINCT qa.id)
          FILTER (
            WHERE qa.status = 'submitted'
               OR qa.status = 'graded'
          )::int AS completed_attempts,

        /*
         * Active/in-progress attempts
         */
        COUNT(DISTINCT qa.id)
          FILTER (
            WHERE qa.status = 'in_progress'
          )::int AS active_attempts,

        /*
         * Current active attempt
         */
        MAX(qa.id)
          FILTER (
            WHERE qa.status = 'in_progress'
          ) AS active_attempt_id,

        /*
         * Latest attempt number
         */
        MAX(qa.attempt_number) AS latest_attempt_number,

        /*
         * Latest completed score
         */
        MAX(qa.score)
          FILTER (
            WHERE qa.status = 'submitted'
               OR qa.status = 'graded'
          ) AS latest_score,

        /*
         * Latest completed percentage
         */
        MAX(qa.percentage)
          FILTER (
            WHERE qa.status = 'submitted'
               OR qa.status = 'graded'
          ) AS latest_percentage,

        /*
         * Latest completed submission date
         */
        MAX(qa.submitted_at)
          FILTER (
            WHERE qa.status = 'submitted'
               OR qa.status = 'graded'
          ) AS latest_submitted_at

      FROM lms_quizzes q

      INNER JOIN lms_lessons l
        ON l.id = q.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      INNER JOIN lms_programs p
        ON p.id = u.program_id

      /*
       * Only return quizzes belonging to programs
       * in which this student is enrolled.
       */
      INNER JOIN lms_enrollments e
        ON e.program_id = p.id
        AND e.application_id = $1

      LEFT JOIN lms_quiz_questions qq
        ON qq.quiz_id = q.id

      LEFT JOIN lms_quiz_attempts qa
        ON qa.quiz_id = q.id
        AND qa.student_id = $1

      WHERE
        /*
         * Only student-visible quizzes.
         */
        LOWER(q.status::text) IN ('active', 'published')

        /*
         * Do not show cancelled/dropped enrollments.
         */
        AND (
          e.enrollment_status IS NULL
          OR LOWER(e.enrollment_status::text)
             NOT IN ('cancelled', 'dropped')
        )

      GROUP BY
        q.id,
        l.id,
        t.id,
        u.id,
        p.id

      /*
       * Upcoming quizzes are sorted by opening date.
       * Quizzes without an opening date use their creation date.
       */
      ORDER BY
        CASE
          WHEN q.available_from IS NOT NULL
               AND q.available_from > NOW()
          THEN 0
          ELSE 1
        END ASC,

        CASE
          WHEN q.available_from IS NOT NULL
               AND q.available_from > NOW()
          THEN q.available_from
          ELSE NULL
        END ASC,

        q.created_at DESC
      `,
      [studentId]
    );

    const quizzes = result.rows.map((row) => {
      const attemptsAllowed = Number(
        row.attempts_allowed || 1
      );

      const completedAttempts = Number(
        row.completed_attempts || 0
      );

      /*
       * Normalize availability dates to ISO strings.
       *
       * This makes the API response predictable for the
       * client-side dashboard.
       */
      const availableFrom = row.available_from
        ? new Date(row.available_from).toISOString()
        : null;

      const availableUntil = row.available_until
        ? new Date(row.available_until).toISOString()
        : null;

      return {
        id: Number(row.id),

        lessonId: Number(row.lesson_id),

        title: row.title,
        description: row.description,
        instructions: row.instructions,

        totalMarks: Number(
          row.total_marks || 0
        ),

        timeLimitMinutes: Number(
          row.time_limit_minutes || 0
        ),

        attemptsAllowed,

        attemptsUsed: completedAttempts,

        attemptsRemaining: Math.max(
          0,
          attemptsAllowed - completedAttempts
        ),

        passingScore: Number(
          row.passing_score || 0
        ),

        status: row.status,

        shuffleQuestions:
          row.shuffle_questions ?? false,

        shuffleOptions:
          row.shuffle_options ?? false,

        showResults:
          row.show_results ?? true,

        showCorrectAnswers:
          row.show_correct_answers ?? false,

        /*
         * Quiz availability
         *
         * null = no restriction
         */
        availableFrom,
        availableUntil,

        lesson: {
          id: Number(row.lesson_id),
          title: row.lesson_title,
        },

        topic: {
          id: Number(row.topic_id),
          title: row.topic_title,
        },

        unit: {
          id: Number(row.unit_id),
          name: row.unit_name,
        },

        program: {
          id: Number(row.program_id),
          name: row.program_name,
        },

        questionCount: Number(
          row.question_count || 0
        ),

        completedAttempts,

        activeAttempt:
          row.active_attempt_id
            ? {
                id: Number(
                  row.active_attempt_id
                ),
              }
            : null,

        latestResult:
          row.latest_submitted_at
            ? {
                score: Number(
                  row.latest_score || 0
                ),

                percentage: Number(
                  row.latest_percentage || 0
                ),

                submittedAt:
                  new Date(
                    row.latest_submitted_at
                  ).toISOString(),
              }
            : null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        quizzes,
        total: quizzes.length,
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error(
      'STUDENT QUIZZES GET ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load quizzes',
      },
      { status: 500 }
    );
  }
}