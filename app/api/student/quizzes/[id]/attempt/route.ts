import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const client = await pool.connect();

  try {
    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const quizId = Number(id);

    if (!Number.isInteger(quizId) || quizId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid quiz ID',
        },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    /*
     * Make sure the quiz belongs to a program
     * the student is enrolled in.
     */
    const quizResult = await client.query(
      `
      SELECT
        q.id,
        q.total_marks,
        q.attempts_allowed,
        q.time_limit_minutes,
        q.status,
        q.available_from,
        q.available_until
      FROM lms_quizzes q

      INNER JOIN lms_lessons l
        ON l.id = q.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      INNER JOIN lms_programs p
        ON p.id = u.program_id

      INNER JOIN lms_enrollments e
        ON e.program_id = p.id
        AND e.application_id = $1

      WHERE q.id = $2

        AND LOWER(q.status::text)
            IN ('active', 'published')

        AND (
          e.enrollment_status IS NULL
          OR LOWER(e.enrollment_status::text)
             NOT IN ('cancelled', 'dropped')
        )

      LIMIT 1
      `,
      [session.applicationId, quizId]
    );

    if (quizResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message:
            'Quiz not found or you are not enrolled in this program',
        },
        { status: 404 }
      );
    }

    const quiz = quizResult.rows[0];

    const now = new Date();

    if (
      quiz.available_from &&
      new Date(quiz.available_from) > now
    ) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message: 'This quiz is not yet available.',
        },
        { status: 400 }
      );
    }

    if (
      quiz.available_until &&
      new Date(quiz.available_until) < now
    ) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message: 'This quiz is no longer available.',
        },
        { status: 400 }
      );
    }

    /*
     * If there is already an unfinished attempt,
     * return it instead of creating another one.
     */
    const existingAttempt =
      await client.query(
        `
        SELECT
          id,
          quiz_id,
          attempt_number,
          started_at,
          submitted_at,
          score,
          total_marks,
          percentage,
          status
        FROM lms_quiz_attempts
        WHERE quiz_id = $1
          AND student_id = $2
          AND status = 'in_progress'
        ORDER BY id DESC
        LIMIT 1
        `,
        [
          quizId,
          session.applicationId,
        ]
      );

    if (
      existingAttempt.rows.length > 0
    ) {
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        resumed: true,
        attempt: existingAttempt.rows[0],
      });
    }

    /*
     * Count completed attempts.
     */
    const attemptsResult =
      await client.query(
        `
        SELECT
          COUNT(*)::int AS attempts_used,
          COALESCE(
            MAX(attempt_number),
            0
          )::int AS last_attempt_number
        FROM lms_quiz_attempts
        WHERE quiz_id = $1
          AND student_id = $2
          AND status IN (
            'submitted',
            'graded'
          )
        `,
        [
          quizId,
          session.applicationId,
        ]
      );

    const attemptsUsed =
      Number(
        attemptsResult.rows[0]
          ?.attempts_used || 0
      );

    const lastAttemptNumber =
      Number(
        attemptsResult.rows[0]
          ?.last_attempt_number || 0
      );

    const attemptsAllowed =
      Number(
        quiz.attempts_allowed || 1
      );

    if (
      attemptsUsed >= attemptsAllowed
    ) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message:
            'You have used all your allowed attempts for this quiz.',
        },
        { status: 400 }
      );
    }

    const attemptNumber =
      lastAttemptNumber + 1;

    const insertResult =
      await client.query(
        `
        INSERT INTO lms_quiz_attempts (
          quiz_id,
          student_id,
          attempt_number,
          started_at,
          score,
          total_marks,
          percentage,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          NOW(),
          0,
          $4,
          0,
          'in_progress'
        )
        RETURNING
          id,
          quiz_id,
          student_id,
          attempt_number,
          started_at,
          submitted_at,
          score,
          total_marks,
          percentage,
          status
        `,
        [
          quizId,
          session.applicationId,
          attemptNumber,
          Number(
            quiz.total_marks || 0
          ),
        ]
      );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      resumed: false,
      attempt:
        insertResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'START QUIZ ATTEMPT ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to start quiz attempt',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}