import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type QuestionRecord = {
  id: number;
  questionType: string;
  marks: number;
  correctAnswer: string | null;
  correctOptionIds: Set<number>;
};

type StudentAnswer = {
  id: number;
  questionId: number;
  selectedOptionId: number | null;
  answerText: string | null;
  marksAwarded: number;
  isCorrect: boolean | null;
};

/* =========================================================
   POST — SUBMIT ASSESSMENT
========================================================= */

export async function POST(
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
    /* =======================================================
       AUTHENTICATION
    ======================================================= */

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

    /* =======================================================
       PARAMETERS
    ======================================================= */

    const { id, attemptId } = await context.params;

    const quizId = Number(id);
    const attemptIdNumber = Number(attemptId);

    if (
      !Number.isInteger(quizId) ||
      !Number.isInteger(attemptIdNumber)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid quiz or attempt ID',
        },
        { status: 400 }
      );
    }

    /* =======================================================
       BEGIN TRANSACTION
    ======================================================= */

    await client.query('BEGIN');

    /* =======================================================
       LOAD AND LOCK ATTEMPT
    ======================================================= */

    const attemptResult = await client.query(
      `
      SELECT
        a.id,
        a.quiz_id,
        a.student_id,
        a.started_at,
        a.status,

        q.total_marks,
        q.time_limit_minutes,
        q.passing_score,
        q.assessment_type

      FROM lms_quiz_attempts a

      INNER JOIN lms_quizzes q
        ON q.id = a.quiz_id

      WHERE a.id = $1::integer
        AND a.quiz_id = $2::integer
        AND a.student_id = $3::integer

      FOR UPDATE
      `,
      [
        attemptIdNumber,
        quizId,
        Number(session.applicationId),
      ]
    );

    if (attemptResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message: 'Attempt not found',
        },
        { status: 404 }
      );
    }

    const attempt = attemptResult.rows[0];

    /* =======================================================
       PREVENT DOUBLE SUBMISSION
    ======================================================= */

    if (attempt.status !== 'in_progress') {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message:
            'This assessment has already been submitted.',
        },
        { status: 400 }
      );
    }

    /* =======================================================
       CHECK TIME LIMIT
    ======================================================= */

    let timedOut = false;

    const timeLimitMinutes = Number(
      attempt.time_limit_minutes || 0
    );

    if (timeLimitMinutes > 0) {
      const startedAt = new Date(
        attempt.started_at
      ).getTime();

      const elapsedSeconds =
        (Date.now() - startedAt) / 1000;

      const allowedSeconds =
        timeLimitMinutes * 60;

      timedOut =
        elapsedSeconds >= allowedSeconds;
    }

    /* =======================================================
       LOAD QUESTIONS
    ======================================================= */

    const questionsResult = await client.query(
      `
      SELECT
        qq.id,
        qq.question_type,
        qq.marks,
        qq.correct_answer,

        qo.id AS option_id,
        qo.is_correct

      FROM lms_quiz_questions qq

      LEFT JOIN lms_quiz_options qo
        ON qo.question_id = qq.id

      WHERE qq.quiz_id = $1::integer

      ORDER BY
        qq.question_order ASC,
        qo.option_order ASC NULLS LAST,
        qo.id ASC NULLS LAST
      `,
      [quizId]
    );

    /* =======================================================
       LOAD STUDENT ANSWERS
    ======================================================= */

    const answersResult = await client.query(
      `
      SELECT
        id,
        question_id,
        selected_option_id,
        answer_text,
        marks_awarded,
        is_correct

      FROM lms_quiz_answers

      WHERE attempt_id = $1::integer
      `,
      [attemptIdNumber]
    );

    const answerMap = new Map<
      number,
      StudentAnswer
    >();

    for (const answer of answersResult.rows) {
      const questionId = Number(
        answer.question_id
      );

      answerMap.set(questionId, {
        id: Number(answer.id),

        questionId,

        selectedOptionId:
          answer.selected_option_id === null
            ? null
            : Number(
                answer.selected_option_id
              ),

        answerText:
          answer.answer_text === null
            ? null
            : String(answer.answer_text),

        marksAwarded: Number(
          answer.marks_awarded || 0
        ),

        isCorrect:
          answer.is_correct === null
            ? null
            : Boolean(answer.is_correct),
      });
    }

    /* =======================================================
       GROUP QUESTIONS
    ======================================================= */

    const questionMap = new Map<
      number,
      QuestionRecord
    >();

    for (const row of questionsResult.rows) {
      const questionId = Number(row.id);

      if (!questionMap.has(questionId)) {
        questionMap.set(questionId, {
          id: questionId,

          questionType: String(
            row.question_type || ''
          )
            .trim()
            .toLowerCase(),

          marks: Number(row.marks || 0),

          correctAnswer:
            row.correct_answer === null
              ? null
              : String(row.correct_answer)
                  .trim()
                  .toLowerCase(),

          correctOptionIds:
            new Set<number>(),
        });
      }

      if (
        row.option_id !== null &&
        row.option_id !== undefined &&
        row.is_correct === true
      ) {
        questionMap
          .get(questionId)!
          .correctOptionIds.add(
            Number(row.option_id)
          );
      }
    }

    /* =======================================================
       CHECK WHETHER MANUAL GRADING IS REQUIRED
    ======================================================= */

    let manualGradingRequired = false;

    for (const question of questionMap.values()) {
      const type = question.questionType;

      if (
        type === 'short_answer' ||
        type === 'short-answer' ||
        type === 'essay'
      ) {
        manualGradingRequired = true;
        break;
      }
    }

    /* =======================================================
       GRADE QUESTIONS
    ======================================================= */

    let totalScore = 0;
    let calculatedTotalMarks = 0;

    for (const question of questionMap.values()) {
      const marks = Number(question.marks || 0);

      calculatedTotalMarks += marks;

      const answer = answerMap.get(
        question.id
      );

      /*
       * If the student did not answer the
       * question, it receives zero.
       */
      if (!answer) {
        continue;
      }

      const type = question.questionType;

      let isCorrect: boolean | null = null;
      let marksAwarded = 0;

      /* =====================================================
         MULTIPLE CHOICE
      ===================================================== */

      if (
        type === 'multiple_choice' ||
        type === 'mcq'
      ) {
        if (
          answer.selectedOptionId !== null &&
          question.correctOptionIds.has(
            answer.selectedOptionId
          )
        ) {
          isCorrect = true;
          marksAwarded = marks;
        } else {
          isCorrect = false;
          marksAwarded = 0;
        }
      }

      /* =====================================================
         TRUE / FALSE
      ===================================================== */

      else if (
        type === 'true_false' ||
        type === 'true-false' ||
        type === 'boolean'
      ) {
        /*
         * The authoritative answer is stored
         * in lms_quiz_questions.correct_answer.
         *
         * The student answer should preferably
         * be stored in answer_text as:
         *
         * "true"
         * or
         * "false"
         */

        let studentAnswer: string | null = null;

        if (
          answer.answerText !== null &&
          answer.answerText.trim().length > 0
        ) {
          studentAnswer =
            answer.answerText
              .trim()
              .toLowerCase();
        }

        /*
         * Backward compatibility:
         *
         * If an older answer was saved using
         * selected_option_id, retrieve its text.
         */
        if (
          !studentAnswer &&
          answer.selectedOptionId !== null
        ) {
          const selectedOptionResult =
            await client.query(
              `
              SELECT option_text
              FROM lms_quiz_options
              WHERE id = $1::integer
                AND question_id = $2::integer
              LIMIT 1
              `,
              [
                answer.selectedOptionId,
                question.id,
              ]
            );

          if (
            selectedOptionResult.rows
              .length > 0
          ) {
            studentAnswer = String(
              selectedOptionResult.rows[0]
                .option_text || ''
            )
              .trim()
              .toLowerCase();
          }
        }

        /*
         * Normalize common variations.
         */
        if (
          studentAnswer === 't' ||
          studentAnswer === 'yes'
        ) {
          studentAnswer = 'true';
        }

        if (
          studentAnswer === 'f' ||
          studentAnswer === 'no'
        ) {
          studentAnswer = 'false';
        }

        const correctAnswer =
          question.correctAnswer
            ?.trim()
            .toLowerCase() || null;

        if (
          (studentAnswer === 'true' ||
            studentAnswer === 'false') &&
          (correctAnswer === 'true' ||
            correctAnswer === 'false')
        ) {
          isCorrect =
            studentAnswer === correctAnswer;

          marksAwarded = isCorrect
            ? marks
            : 0;
        } else {
          isCorrect = false;
          marksAwarded = 0;
        }
      }

      /* =====================================================
         SHORT ANSWER
      ===================================================== */

      else if (
        type === 'short_answer' ||
        type === 'short-answer'
      ) {
        /*
         * Short answers are manually graded
         * by the lecturer.
         */
        isCorrect = null;
        marksAwarded = 0;
      }

      /* =====================================================
         ESSAY
      ===================================================== */

      else if (type === 'essay') {
        /*
         * Essays are manually graded by
         * the lecturer.
         */
        isCorrect = null;
        marksAwarded = 0;
      }

      /* =====================================================
         UNKNOWN QUESTION TYPE
      ===================================================== */

      else {
        /*
         * Treat unknown types safely as
         * manually graded rather than
         * accidentally awarding marks.
         */
        isCorrect = null;
        marksAwarded = 0;

        manualGradingRequired = true;
      }

      totalScore += marksAwarded;

      /* =====================================================
         UPDATE ANSWER
      ===================================================== */

      await client.query(
        `
        UPDATE lms_quiz_answers
        SET
          marks_awarded = $1::numeric,
          is_correct = $2::boolean,

          graded_at =
            CASE
              WHEN $2::boolean IS NOT NULL
              THEN NOW()
              ELSE graded_at
            END

        WHERE id = $3::integer
        `,
        [
          marksAwarded,
          isCorrect,
          answer.id,
        ]
      );
    }

    /* =======================================================
       TOTAL MARKS
    ======================================================= */

    const storedQuizTotalMarks =
      Number(attempt.total_marks || 0);

    const quizTotalMarks =
      storedQuizTotalMarks > 0
        ? storedQuizTotalMarks
        : calculatedTotalMarks;

    /* =======================================================
       PERCENTAGE
    ======================================================= */

    const percentage =
      quizTotalMarks > 0
        ? Number(
            (
              (totalScore /
                quizTotalMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    /* =======================================================
       PASSING SCORE
    ======================================================= */

    const passingScore = Number(
      attempt.passing_score || 0
    );

    /*
     * Do not mark the student as finally passed
     * until written questions have been graded.
     */
    const passed =
      !manualGradingRequired &&
      percentage >= passingScore;

    /* =======================================================
       FINAL STATUS
    ======================================================= */

    const finalStatus =
      manualGradingRequired
        ? 'submitted'
        : 'graded';

    /* =======================================================
       UPDATE ATTEMPT
    ======================================================= */

    await client.query(
      `
      UPDATE lms_quiz_attempts
      SET
        submitted_at = NOW(),
        score = $1::numeric,
        total_marks = $2::numeric,
        percentage = $3::numeric,
        status = $4::text

      WHERE id = $5::integer
      `,
      [
        totalScore,
        quizTotalMarks,
        percentage,
        finalStatus,
        attemptIdNumber,
      ]
    );

    /* =======================================================
       COMMIT
    ======================================================= */

    await client.query('COMMIT');

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json({
      success: true,

      timedOut,

      result: {
        attemptId: attemptIdNumber,

        assessmentType:
          String(
            attempt.assessment_type ||
              'quiz'
          )
            .trim()
            .toLowerCase() === 'exam'
            ? 'exam'
            : 'quiz',

        score: totalScore,

        totalMarks: quizTotalMarks,

        percentage,

        passingScore,

        passed,

        status: finalStatus,

        manualGradingRequired,

        submittedAt:
          new Date().toISOString(),
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }

    console.error(
      'SUBMIT QUIZ ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to submit assessment',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}