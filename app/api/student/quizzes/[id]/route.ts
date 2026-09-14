import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
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

    /* =======================================================
       LOAD ASSESSMENT
    ======================================================= */

    const quizResult = await pool.query(
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
        q.assessment_type,
        q.shuffle_questions,
        q.shuffle_options,
        q.show_results,
        q.show_correct_answers,
        q.available_from,
        q.available_until,

        l.title AS lesson_title,
        t.id AS topic_id,
        t.title AS topic_title,
        u.id AS unit_id,
        u.name AS unit_name,
        p.id AS program_id,
        p.name AS program_name

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

    /* =======================================================
       NORMALIZE ASSESSMENT TYPE
    ======================================================= */

    const assessmentType =
      String(
        quiz.assessment_type ?? 'quiz'
      )
        .trim()
        .toLowerCase() === 'exam'
        ? 'exam'
        : 'quiz';

    /* =======================================================
       LOAD QUESTIONS
    ======================================================= */

    const questionsResult = await pool.query(
      `
      SELECT
        qq.id,
        qq.question_text,
        qq.question_type,
        qq.marks,
        qq.question_order,
        qq.explanation

      FROM lms_quiz_questions qq

      WHERE qq.quiz_id = $1

      ORDER BY qq.question_order ASC, qq.id ASC
      `,
      [quizId]
    );

    const questions = [];

    for (const question of questionsResult.rows) {
      const optionsResult = await pool.query(
        `
        SELECT
          id,
          option_text,
          option_order
        FROM lms_quiz_options
        WHERE question_id = $1
        ORDER BY option_order ASC, id ASC
        `,
        [question.id]
      );

      questions.push({
        id: Number(question.id),

        questionText:
          question.question_text,

        questionType:
          question.question_type,

        marks:
          Number(question.marks || 0),

        questionOrder:
          Number(
            question.question_order || 0
          ),

        explanation:
          quiz.show_correct_answers
            ? question.explanation
            : null,

        options:
          optionsResult.rows.map(
            (option) => ({
              id: Number(option.id),

              text:
                option.option_text,

              order:
                Number(
                  option.option_order || 0
                ),
            })
          ),
      });
    }

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json({
      success: true,

      quiz: {
        id: Number(quiz.id),

        lessonId:
          Number(quiz.lesson_id),

        title:
          quiz.title,

        description:
          quiz.description,

        instructions:
          quiz.instructions,

        /*
         * IMPORTANT:
         *
         * This tells the student frontend whether
         * this assessment is a Quiz/CAT or Examination.
         */
        assessmentType,

        totalMarks:
          Number(
            quiz.total_marks || 0
          ),

        timeLimitMinutes:
          Number(
            quiz.time_limit_minutes || 0
          ),

        attemptsAllowed:
          Number(
            quiz.attempts_allowed || 1
          ),

        passingScore:
          Number(
            quiz.passing_score || 0
          ),

        shuffleQuestions:
          quiz.shuffle_questions ??
          false,

        shuffleOptions:
          quiz.shuffle_options ??
          false,

        showResults:
          quiz.show_results ??
          true,

        showCorrectAnswers:
          quiz.show_correct_answers ??
          false,

        availableFrom:
          quiz.available_from,

        availableUntil:
          quiz.available_until,

        lesson: {
          id:
            Number(
              quiz.lesson_id
            ),

          title:
            quiz.lesson_title,
        },

        topic: {
          id:
            Number(
              quiz.topic_id
            ),

          title:
            quiz.topic_title,
        },

        unit: {
          id:
            Number(
              quiz.unit_id
            ),

          name:
            quiz.unit_name,
        },

        program: {
          id:
            Number(
              quiz.program_id
            ),

          name:
            quiz.program_name,
        },

        questionCount:
          questions.length,
      },

      questions,
    });
  } catch (error) {
    console.error(
      'STUDENT QUIZ DETAIL ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load quiz',
      },
      { status: 500 }
    );
  }
}