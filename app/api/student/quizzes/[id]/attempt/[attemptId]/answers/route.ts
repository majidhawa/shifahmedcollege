import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      attemptId: string;
    }>;
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

    const { id, attemptId } =
      await context.params;

    const quizId = Number(id);
    const attempt = Number(attemptId);

    if (
      !Number.isInteger(quizId) ||
      !Number.isInteger(attempt)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid quiz or attempt ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const questionId =
      Number(body.questionId);

    const selectedOptionId =
      body.selectedOptionId === null ||
      body.selectedOptionId === undefined
        ? null
        : Number(body.selectedOptionId);

    const answerText =
      body.answerText === null ||
      body.answerText === undefined
        ? null
        : String(body.answerText);

    if (
      !Number.isInteger(questionId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid question ID',
        },
        { status: 400 }
      );
    }

    /*
     * Verify the attempt belongs to this
     * student and quiz.
     */
    const attemptResult =
      await client.query(
        `
        SELECT
          id,
          quiz_id,
          student_id,
          status
        FROM lms_quiz_attempts
        WHERE id = $1
          AND quiz_id = $2
          AND student_id = $3
        LIMIT 1
        `,
        [
          attempt,
          quizId,
          session.applicationId,
        ]
      );

    if (
      attemptResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Attempt not found',
        },
        { status: 404 }
      );
    }

    if (
      attemptResult.rows[0].status !==
      'in_progress'
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This quiz attempt is no longer active.',
        },
        { status: 400 }
      );
    }

    /*
     * Verify question belongs to quiz.
     */
    const questionResult =
      await client.query(
        `
        SELECT
          id,
          question_type
        FROM lms_quiz_questions
        WHERE id = $1
          AND quiz_id = $2
        LIMIT 1
        `,
        [questionId, quizId]
      );

    if (
      questionResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Question does not belong to this quiz',
        },
        { status: 400 }
      );
    }

    /*
     * If an option was selected, make sure
     * it belongs to the question.
     */
    if (selectedOptionId !== null) {
      const optionResult =
        await client.query(
          `
          SELECT id
          FROM lms_quiz_options
          WHERE id = $1
            AND question_id = $2
          LIMIT 1
          `,
          [
            selectedOptionId,
            questionId,
          ]
        );

      if (
        optionResult.rows.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Selected option does not belong to this question',
          },
          { status: 400 }
        );
      }
    }

    await client.query('BEGIN');

    const existing =
      await client.query(
        `
        SELECT id
        FROM lms_quiz_answers
        WHERE attempt_id = $1
          AND question_id = $2
        LIMIT 1
        `,
        [
          attempt,
          questionId,
        ]
      );

    let answer;

    if (existing.rows.length > 0) {
      const updateResult =
        await client.query(
          `
          UPDATE lms_quiz_answers
          SET
            selected_option_id = $1,
            answer_text = $2
          WHERE id = $3
          RETURNING *
          `,
          [
            selectedOptionId,
            answerText,
            existing.rows[0].id,
          ]
        );

      answer = updateResult.rows[0];
    } else {
      const insertResult =
        await client.query(
          `
          INSERT INTO lms_quiz_answers (
            attempt_id,
            question_id,
            selected_option_id,
            answer_text,
            marks_awarded,
            is_correct
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            0,
            NULL
          )
          RETURNING *
          `,
          [
            attempt,
            questionId,
            selectedOptionId,
            answerText,
          ]
        );

      answer = insertResult.rows[0];
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'SAVE QUIZ ANSWER ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to save answer',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}