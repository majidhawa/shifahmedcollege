import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type QuestionResult = {
  questionId: number;
  questionText: string;
  questionType: string;
  marks: number;
  marksAwarded: number;
  isCorrect: boolean | null;
  answerText: string | null;
  selectedOptionText: string | null;
  correctOptionText: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeAssessmentType(
  value: unknown
): 'quiz' | 'exam' {
  return String(value ?? 'quiz')
    .trim()
    .toLowerCase() === 'exam'
    ? 'exam'
    : 'quiz';
}

function isWrittenQuestion(
  questionType: string
): boolean {
  const type =
    questionType
      .trim()
      .toLowerCase();

  return (
    type === 'short_answer' ||
    type === 'shortanswer' ||
    type === 'essay'
  );
}

/* =========================================================
   GET RESULT
========================================================= */

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const session =
      await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       PARAMETERS
    ===================================================== */

    const { id } =
      await context.params;

    const quizId =
      Number(id);

    const url =
      new URL(request.url);

    const attemptId =
      Number(
        url.searchParams.get(
          'attemptId'
        )
      );

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0 ||
      !Number.isInteger(attemptId) ||
      attemptId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid quiz or attempt',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       LOAD ATTEMPT + QUIZ
    ===================================================== */

    const result =
      await pool.query(
        `
        SELECT
          a.id AS attempt_id,
          a.attempt_number,
          a.started_at,
          a.submitted_at,
          a.score,
          a.total_marks,
          a.percentage,
          a.status,

          q.id AS quiz_id,
          q.title,
          q.description,
          q.passing_score,
          q.show_results,
          q.show_correct_answers,
          q.assessment_type,
          q.time_limit_minutes

        FROM lms_quiz_attempts a

        INNER JOIN lms_quizzes q
          ON q.id = a.quiz_id

        WHERE a.id = $1
          AND a.quiz_id = $2
          AND a.student_id = $3

        LIMIT 1
        `,
        [
          attemptId,
          quizId,
          session.applicationId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Quiz result not found',
        },
        { status: 404 }
      );
    }

    const row =
      result.rows[0];

    /* =====================================================
       RESULTS HIDDEN
    ===================================================== */

    if (!row.show_results) {
      return NextResponse.json({
        success: true,
        resultsHidden: true,
      });
    }

    /* =====================================================
       ASSESSMENT TYPE
    ===================================================== */

    const assessmentType =
      normalizeAssessmentType(
        row.assessment_type
      );

    /* =====================================================
       LOAD QUESTIONS + STUDENT ANSWERS
    ===================================================== */

    const questionsResult =
      await pool.query(
        `
        SELECT
          qq.id AS question_id,
          qq.question_text,
          qq.question_type,
          qq.marks,

          qa.id AS answer_id,
          qa.selected_option_id,
          qa.answer_text,
          qa.marks_awarded,
          qa.is_correct,

          selected_option.option_text
            AS selected_option_text,

          correct_option.option_text
            AS correct_option_text

        FROM lms_quiz_questions qq

        LEFT JOIN lms_quiz_answers qa
          ON qa.question_id = qq.id
          AND qa.attempt_id = $1

        LEFT JOIN lms_quiz_options selected_option
          ON selected_option.id =
             qa.selected_option_id

        LEFT JOIN LATERAL (
          SELECT
            qo.option_text

          FROM lms_quiz_options qo

          WHERE qo.question_id =
            qq.id

            AND qo.is_correct = true

          ORDER BY
            qo.option_order ASC,
            qo.id ASC

          LIMIT 1
        ) correct_option
          ON true

        WHERE qq.quiz_id = $2

        ORDER BY
          qq.question_order ASC,
          qq.id ASC
        `,
        [
          attemptId,
          quizId,
        ]
      );

    /* =====================================================
       BUILD QUESTION RESULTS
    ===================================================== */

    const questions: QuestionResult[] =
      questionsResult.rows.map(
        (question) => {
          const questionType =
            String(
              question.question_type ||
                ''
            )
              .trim()
              .toLowerCase();

          const written =
            isWrittenQuestion(
              questionType
            );

          /*
           * Written questions remain manually
           * gradable, therefore isCorrect may
           * legitimately be null.
           */
          const isCorrect =
            question.is_correct ===
            null
              ? null
              : Boolean(
                  question.is_correct
                );

          return {
            questionId:
              Number(
                question.question_id
              ),

            questionText:
              question.question_text,

            questionType,

            marks:
              Number(
                question.marks || 0
              ),

            marksAwarded:
              Number(
                question.marks_awarded ||
                  0
              ),

            isCorrect,

            answerText:
              question.answer_text ===
              null
                ? null
                : String(
                    question.answer_text
                  ),

            selectedOptionText:
              question.selected_option_text ===
              null
                ? null
                : String(
                    question.selected_option_text
                  ),

            /*
             * Do not expose correct answers
             * unless the assessment allows it.
             *
             * The frontend also checks
             * showCorrectAnswers.
             */
            correctOptionText:
              row.show_correct_answers &&
              !written &&
              question.correct_option_text
                ? String(
                    question.correct_option_text
                  )
                : null,
          };
        }
      );

    /* =====================================================
       MANUAL GRADING CHECK
    ===================================================== */

    const manualGradingRequired =
      questions.some(
        (question) =>
          isWrittenQuestion(
            question.questionType
          ) &&
          question.isCorrect ===
            null
      );

    /* =====================================================
       SCORE
    ===================================================== */

    const score =
      Number(
        row.score || 0
      );

    const totalMarks =
      Number(
        row.total_marks || 0
      );

    const percentage =
      Number(
        row.percentage || 0
      );

    const passingScore =
      Number(
        row.passing_score || 0
      );

    /*
     * Do not report a final pass/fail while
     * written questions still require grading.
     */
    const passed =
      !manualGradingRequired &&
      percentage >=
        passingScore;

    /* =====================================================
       TIMEOUT
    ===================================================== */

    let timedOut = false;

    if (
      row.submitted_at &&
      row.started_at &&
      Number(
        row.time_limit_minutes || 0
      ) > 0
    ) {
      const startedAt =
        new Date(
          row.started_at
        ).getTime();

      const submittedAt =
        new Date(
          row.submitted_at
        ).getTime();

      const elapsedSeconds =
        (
          submittedAt -
          startedAt
        ) / 1000;

      const allowedSeconds =
        Number(
          row.time_limit_minutes
        ) * 60;

      timedOut =
        elapsedSeconds >=
        allowedSeconds;
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      resultsHidden: false,

      quiz: {
        id: Number(
          row.quiz_id
        ),

        title:
          row.title,

        description:
          row.description,

        assessmentType,

        showCorrectAnswers:
          Boolean(
            row.show_correct_answers
          ),
      },

      result: {
        attemptId:
          Number(
            row.attempt_id
          ),

        attemptNumber:
          Number(
            row.attempt_number || 1
          ),

        startedAt:
          row.started_at,

        submittedAt:
          row.submitted_at,

        score,

        totalMarks,

        percentage,

        passingScore,

        passed,

        status:
          row.status,

        manualGradingRequired,

        timedOut,
      },

      questions,
    });
  } catch (error) {
    console.error(
      'STUDENT QUIZ RESULT ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to load quiz result',
      },
      { status: 500 }
    );
  }
}