import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GradeItem = {
  questionId?: number;
  marksAwarded?: number;
};

type GradeRequestBody = {
  attemptId?: number;
  grades?: GradeItem[];
};

type WrittenQuestionType =
  | 'short_answer'
  | 'essay'
  | 'long_answer';

/* =========================================================
   HELPERS
========================================================= */

function normalizeQuestionType(
  value: unknown
): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

function isWrittenQuestion(
  value: unknown
): value is WrittenQuestionType {
  const type =
    normalizeQuestionType(value);

  return (
    type === 'short_answer' ||
    type === 'essay' ||
    type === 'long_answer'
  );
}

function isPositiveInteger(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isFiniteNumber(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

/* =========================================================
   GET
   GET /api/lecturer/quizzes/[id]/grading
========================================================= */

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    /* =====================================================
       AUTHENTICATE LECTURER
    ===================================================== */

    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       QUIZ ID
    ===================================================== */

    const { id } =
      await context.params;

    const quizId =
      Number(id);

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid assessment ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY LECTURER ACCESS
    ===================================================== */

    const quizResult =
      await pool.query(
        `
          SELECT
            q.id,
            q.title,
            q.assessment_type,
            q.total_marks,
            q.passing_score,

            p.id AS program_id,
            p.name AS program_name,

            u.id AS unit_id,
            u.code AS unit_code,
            u.name AS unit_name

          FROM lms_quizzes q

          INNER JOIN lms_lessons l
            ON l.id = q.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_programs p
            ON p.id = u.program_id

          INNER JOIN lms_lecturer_programs lp
            ON lp.program_id = p.id
            AND lp.lecturer_id = $2

          WHERE
            q.id = $1

          LIMIT 1
        `,
        [
          quizId,
          lecturer.id,
        ]
      );

    if (
      quizResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Assessment not found or you do not have access to it.',
        },
        { status: 404 }
      );
    }

    const quiz =
      quizResult.rows[0];

    /* =====================================================
       GET SUBMITTED / GRADED ATTEMPTS

       IMPORTANT:

       applications uses `mobile`.

       IMPORTANT:

       Answers are tied to BOTH:

         qa.attempt_id
         qa.question_id

       We use a LATERAL query so that if an old database
       contains duplicate answer rows, the grading page
       only receives one answer for each exact:

         attempt + question
    ===================================================== */

    const result =
      await pool.query(
        `
          SELECT
            a.id AS attempt_id,
            a.attempt_number,
            a.student_id,
            a.started_at,
            a.submitted_at,
            a.status,
            a.score,
            a.total_marks,
            a.percentage,

            app.application_number,
            app.first_name,
            app.middle_name,
            app.surname,
            app.mobile,

            qq.id AS question_id,
            qq.question_text,
            qq.question_type,
            qq.marks AS question_marks,
            qq.question_order,
            qq.correct_answer,
            qq.explanation,

            qa.id AS answer_id,
            qa.answer_text,
            qa.marks_awarded,
            qa.is_correct

          FROM lms_quiz_attempts a

          INNER JOIN applications app
            ON app.id = a.student_id

          INNER JOIN lms_quiz_questions qq
            ON qq.quiz_id = a.quiz_id

          LEFT JOIN LATERAL (
            SELECT
              qa_inner.id,
              qa_inner.answer_text,
              qa_inner.marks_awarded,
              qa_inner.is_correct

            FROM lms_quiz_answers qa_inner

            WHERE
              qa_inner.attempt_id = a.id
              AND qa_inner.question_id = qq.id

            ORDER BY
              qa_inner.id ASC

            LIMIT 1
          ) qa
            ON true

          WHERE
            a.quiz_id = $1

            AND a.status IN (
              'submitted',
              'graded'
            )

            AND LOWER(
              REPLACE(
                COALESCE(
                  qq.question_type,
                  ''
                ),
                '-',
                '_'
              )
            ) IN (
              'short_answer',
              'essay',
              'long_answer'
            )

          ORDER BY
            a.submitted_at DESC NULLS LAST,
            a.id DESC,
            qq.question_order ASC,
            qq.id ASC
        `,
        [quizId]
      );

    /* =====================================================
       RESPONSE TYPES
    ===================================================== */

    type GradingQuestion = {
      id: number;
      questionText: string;
      questionType: string;
      marks: number;
      questionOrder: number;
      correctAnswer: string | null;
      explanation: string | null;

      answerId: number | null;
      answerText: string | null;

      marksAwarded: number;
      isCorrect: boolean | null;

      graded: boolean;
    };

    type GradingAttempt = {
      id: number;
      attemptNumber: number;
      studentId: number;

      student: {
        applicationNumber: string;
        name: string;
        phone: string | null;
      };

      startedAt: string | null;
      submittedAt: string | null;

      status: string;

      score: number;
      totalMarks: number;
      percentage: number;

      questions: GradingQuestion[];
    };

    /* =====================================================
       GROUP ATTEMPTS
    ===================================================== */

    const attemptMap =
      new Map<number, GradingAttempt>();

    for (
      const row of result.rows
    ) {
      const attemptId =
        Number(row.attempt_id);

      if (
        !attemptMap.has(
          attemptId
        )
      ) {
        const fullName = [
          row.first_name,
          row.middle_name,
          row.surname,
        ]
          .filter(
            (value) =>
              value !== null &&
              String(value).trim() !== ''
          )
          .map(
            (value) =>
              String(value).trim()
          )
          .join(' ');

        attemptMap.set(
          attemptId,
          {
            id: attemptId,

            attemptNumber:
              Number(
                row.attempt_number || 1
              ),

            studentId:
              Number(row.student_id),

            student: {
              applicationNumber:
                String(
                  row.application_number ||
                    ''
                ),

              name:
                fullName ||
                'Student',

              phone:
                row.mobile === null
                  ? null
                  : String(row.mobile),
            },

            startedAt:
              row.started_at === null
                ? null
                : String(
                    row.started_at
                  ),

            submittedAt:
              row.submitted_at === null
                ? null
                : String(
                    row.submitted_at
                  ),

            status:
              String(
                row.status ||
                  'submitted'
              ),

            score:
              Number(
                row.score || 0
              ),

            totalMarks:
              Number(
                row.total_marks ||
                  quiz.total_marks ||
                  0
              ),

            percentage:
              Number(
                row.percentage || 0
              ),

            questions: [],
          }
        );
      }

      const attempt =
        attemptMap.get(
          attemptId
        );

      if (!attempt) {
        continue;
      }

      /* ===================================================
         DETERMINE GRADING STATE
      =================================================== */

      const hasAnswer =
        row.answer_id !== null;

      const hasGradingState =
        row.is_correct !== null;

      const graded =
        hasAnswer &&
        hasGradingState;

      /* ===================================================
         QUESTION ID
      =================================================== */

      const questionId =
        Number(
          row.question_id
        );

      /*
       * Protect the response from duplicate question
       * objects caused by legacy duplicate answer rows.
       */
      const existingQuestion =
        attempt.questions.find(
          (question) =>
            question.id ===
            questionId
        );

      if (
        existingQuestion
      ) {
        /*
         * Prefer the answer that actually contains
         * a grading state.
         */
        if (
          !existingQuestion.graded &&
          graded
        ) {
          existingQuestion.answerId =
            row.answer_id === null
              ? null
              : Number(
                  row.answer_id
                );

          existingQuestion.answerText =
            row.answer_text === null
              ? null
              : String(
                  row.answer_text
                );

          existingQuestion.marksAwarded =
            Number(
              row.marks_awarded || 0
            );

          existingQuestion.isCorrect =
            row.is_correct === null
              ? null
              : Boolean(
                  row.is_correct
                );

          existingQuestion.graded =
            true;
        }

        continue;
      }

      attempt.questions.push({
        id:
          questionId,

        questionText:
          String(
            row.question_text || ''
          ),

        questionType:
          normalizeQuestionType(
            row.question_type
          ),

        marks:
          Number(
            row.question_marks || 0
          ),

        questionOrder:
          Number(
            row.question_order || 0
          ),

        correctAnswer:
          row.correct_answer === null
            ? null
            : String(
                row.correct_answer
              ),

        explanation:
          row.explanation === null
            ? null
            : String(
                row.explanation
              ),

        answerId:
          row.answer_id === null
            ? null
            : Number(
                row.answer_id
              ),

        answerText:
          row.answer_text === null
            ? null
            : String(
                row.answer_text
              ),

        marksAwarded:
          Number(
            row.marks_awarded || 0
          ),

        isCorrect:
          row.is_correct === null
            ? null
            : Boolean(
                row.is_correct
              ),

        graded,
      });
    }

    /* =====================================================
       SORT QUESTIONS
    ===================================================== */

    const attempts =
      Array.from(
        attemptMap.values()
      );

    for (
      const attempt of attempts
    ) {
      attempt.questions.sort(
        (
          first,
          second
        ) => {
          if (
            first.questionOrder !==
            second.questionOrder
          ) {
            return (
              first.questionOrder -
              second.questionOrder
            );
          }

          return (
            first.id -
            second.id
          );
        }
      );
    }

    /* =====================================================
       STATISTICS
    ===================================================== */

    const pendingAttempts =
      attempts.filter(
        (attempt) =>
          attempt.questions.some(
            (question) =>
              !question.graded
          )
      ).length;

    const pendingQuestions =
      attempts.reduce(
        (
          total,
          attempt
        ) =>
          total +
          attempt.questions.filter(
            (question) =>
              !question.graded
          ).length,
        0
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      quiz: {
        id:
          Number(quiz.id),

        title:
          String(
            quiz.title
          ),

        assessmentType:
          String(
            quiz.assessment_type ||
              'quiz'
          )
            .trim()
            .toLowerCase() ===
          'exam'
            ? 'exam'
            : 'quiz',

        totalMarks:
          Number(
            quiz.total_marks || 0
          ),

        passingScore:
          Number(
            quiz.passing_score || 0
          ),

        program: {
          id:
            Number(
              quiz.program_id
            ),

          name:
            String(
              quiz.program_name
            ),
        },

        unit: {
          id:
            Number(
              quiz.unit_id
            ),

          code:
            String(
              quiz.unit_code
            ),

          name:
            String(
              quiz.unit_name
            ),
        },
      },

      statistics: {
        attempts:
          attempts.length,

        pendingAttempts,

        pendingQuestions,
      },

      attempts,
    });
  } catch (error) {
    console.error(
      'GET LECTURER GRADING ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to load manual grading data.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH
   PATCH /api/lecturer/quizzes/[id]/grading

   BATCH BODY:

   {
     attemptId: 17,
     grades: [
       {
         questionId: 12,
         marksAwarded: 3
       },
       {
         questionId: 15,
         marksAwarded: 5
       },
       {
         questionId: 18,
         marksAwarded: 2
       }
     ]
   }

   IMPORTANT:

   All grades belong to ONE exact student attempt.

   The complete batch is saved inside ONE PostgreSQL
   transaction.

   The score is recalculated only ONCE after all grades
   have been saved.
========================================================= */

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const client =
    await pool.connect();

  try {
    /* =====================================================
       AUTHENTICATE LECTURER
    ===================================================== */

    const lecturer =
      await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       QUIZ ID
    ===================================================== */

    const { id } =
      await context.params;

    const quizId =
      Number(id);

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid assessment ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       PARSE REQUEST BODY
    ===================================================== */

    let body:
      | GradeRequestBody
      | null = null;

    try {
      body =
        (await request.json()) as
          | GradeRequestBody
          | null;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid request body.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE ATTEMPT
    ===================================================== */

    const attemptId =
      body?.attemptId;

    if (
      !isPositiveInteger(
        attemptId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'A valid attempt ID is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VALIDATE GRADES ARRAY
    ===================================================== */

    if (
      !Array.isArray(
        body?.grades
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'grades must be an array.',
        },
        { status: 400 }
      );
    }

    if (
      body.grades.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'At least one question grade is required.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       NORMALIZE GRADES
    ===================================================== */

    const grades: Array<{
      questionId: number;
      marksAwarded: number;
    }> = [];

    for (
      let index = 0;
      index < body.grades.length;
      index++
    ) {
      const grade =
        body.grades[index];

      if (
        !isPositiveInteger(
          grade.questionId
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Invalid question ID at grade ${index + 1}.`,
          },
          { status: 400 }
        );
      }

      if (
        !isFiniteNumber(
          grade.marksAwarded
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Invalid marks for question ${grade.questionId}.`,
          },
          { status: 400 }
        );
      }

      if (
        grade.marksAwarded < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Marks cannot be negative for question ${grade.questionId}.`,
          },
          { status: 400 }
        );
      }

      grades.push({
        questionId:
          grade.questionId,

        marksAwarded:
          grade.marksAwarded,
      });
    }

    /* =====================================================
       PREVENT DUPLICATE QUESTION IDs
    ===================================================== */

    const questionIdSet =
      new Set(
        grades.map(
          (grade) =>
            grade.questionId
        )
      );

    if (
      questionIdSet.size !==
      grades.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The same question cannot be included more than once in one save.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       START TRANSACTION
    ===================================================== */

    await client.query(
      'BEGIN'
    );

    /* =====================================================
       VERIFY LECTURER ACCESS + LOCK ATTEMPT
    ===================================================== */

    const accessResult =
      await client.query(
        `
          SELECT
            q.id AS quiz_id,
            q.total_marks,
            q.passing_score,

            a.id AS attempt_id,
            a.status AS attempt_status,
            a.student_id

          FROM lms_quizzes q

          INNER JOIN lms_lessons l
            ON l.id = q.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_programs p
            ON p.id = u.program_id

          INNER JOIN lms_lecturer_programs lp
            ON lp.program_id = p.id
            AND lp.lecturer_id = $3

          INNER JOIN lms_quiz_attempts a
            ON a.quiz_id = q.id

          WHERE
            q.id = $1
            AND a.id = $2

          LIMIT 1

          FOR UPDATE OF a
        `,
        [
          quizId,
          attemptId,
          lecturer.id,
        ]
      );

    if (
      accessResult.rows.length ===
      0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Student attempt not found or you do not have permission to grade it.',
        },
        { status: 404 }
      );
    }

    const access =
      accessResult.rows[0];

    /* =====================================================
       VERIFY ATTEMPT STATUS
    ===================================================== */

    const attemptStatus =
      String(
        access.attempt_status ||
          ''
      )
        .trim()
        .toLowerCase();

    if (
      attemptStatus !==
        'submitted' &&
      attemptStatus !==
        'graded'
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Only submitted or already graded attempts can be manually graded.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       LOAD ALL REQUESTED QUESTIONS
    ===================================================== */

    const questionIds =
      grades.map(
        (grade) =>
          grade.questionId
      );

    const questionsResult =
      await client.query(
        `
          SELECT
            id,
            question_type,
            marks,
            question_order

          FROM lms_quiz_questions

          WHERE
            quiz_id = $1
            AND id = ANY($2::int[])

          ORDER BY
            question_order ASC,
            id ASC
        `,
        [
          quizId,
          questionIds,
        ]
      );

    /* =====================================================
       EVERY QUESTION MUST BELONG TO THIS QUIZ
    ===================================================== */

    if (
      questionsResult.rows.length !==
      questionIds.length
    ) {
      await client.query(
        'ROLLBACK'
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'One or more questions do not belong to this assessment.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       QUESTION MAP
    ===================================================== */

    const questionMap =
      new Map<
        number,
        {
          id: number;
          questionType: string;
          marks: number;
          questionOrder: number;
        }
      >();

    for (
      const row of
        questionsResult.rows
    ) {
      questionMap.set(
        Number(row.id),
        {
          id:
            Number(row.id),

          questionType:
            normalizeQuestionType(
              row.question_type
            ),

          marks:
            Number(
              row.marks || 0
            ),

          questionOrder:
            Number(
              row.question_order || 0
            ),
        }
      );
    }

    /* =====================================================
       VALIDATE EVERY GRADE BEFORE WRITING ANYTHING
    ===================================================== */

    for (
      const grade of grades
    ) {
      const question =
        questionMap.get(
          grade.questionId
        );

      if (!question) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              `Question ${grade.questionId} was not found.`,
          },
          { status: 400 }
        );
      }

      /* ================================================
         ONLY WRITTEN QUESTIONS ARE MANUALLY GRADED
      ================================================= */

      if (
        !isWrittenQuestion(
          question.questionType
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              `Question ${grade.questionId} is not a written question and does not require manual grading.`,
          },
          { status: 400 }
        );
      }

      /* ================================================
         MAXIMUM MARK VALIDATION
      ================================================= */

      if (
        grade.marksAwarded >
        question.marks
      ) {
        await client.query(
          'ROLLBACK'
        );

        return NextResponse.json(
          {
            success: false,
            message:
              `Question ${grade.questionId} has a maximum of ${question.marks} marks.`,
          },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       SAVE ALL GRADES

       IMPORTANT:

       Every grade uses:

         attemptId
         questionId

       to identify the exact answer.

       We do NOT use:

         question order
         question type
         answer text
         array position

       This prevents one question's marks from being
       assigned to another question.
    ===================================================== */

    const savedGrades: Array<{
      questionId: number;
      answerId: number;
      marksAwarded: number;
      isCorrect: boolean;
    }> = [];

    for (
      const grade of grades
    ) {
      /* ===================================================
         FIND EXACT EXISTING ANSWER
      =================================================== */

      const answerResult =
        await client.query(
          `
            SELECT
              id,
              answer_text,
              marks_awarded,
              is_correct

            FROM lms_quiz_answers

            WHERE
              attempt_id = $1
              AND question_id = $2

            ORDER BY
              id ASC

            LIMIT 1

            FOR UPDATE
          `,
          [
            attemptId,
            grade.questionId,
          ]
        );

      /*
       * `is_correct` is currently being used as the
       * grading-completion marker for written questions.
       *
       * false = graded zero
       * true  = graded with positive marks
       */
      const gradingFlag =
        grade.marksAwarded > 0;

      let answerId: number;

      /* ===================================================
         UPDATE EXISTING ANSWER
      =================================================== */

      if (
        answerResult.rows.length >
        0
      ) {
        answerId =
          Number(
            answerResult.rows[0].id
          );

        await client.query(
          `
            UPDATE lms_quiz_answers

            SET
              marks_awarded =
                $1::numeric,

              is_correct =
                $2::boolean

            WHERE
              id = $3
              AND attempt_id = $4
              AND question_id = $5
          `,
          [
            grade.marksAwarded,
            gradingFlag,
            answerId,
            attemptId,
            grade.questionId,
          ]
        );
      } else {
        /* ===============================================
           CREATE ANSWER IF IT DOES NOT EXIST
        =============================================== */

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
                NULL,
                NULL,
                $3::numeric,
                $4::boolean
              )

              RETURNING id
            `,
            [
              attemptId,
              grade.questionId,
              grade.marksAwarded,
              gradingFlag,
            ]
          );

        answerId =
          Number(
            insertResult.rows[0].id
          );
      }

      /* ===================================================
         VERIFY EXACT ANSWER
      =================================================== */

      const verifyResult =
        await client.query(
          `
            SELECT
              id,
              marks_awarded,
              is_correct

            FROM lms_quiz_answers

            WHERE
              id = $1
              AND attempt_id = $2
              AND question_id = $3

            LIMIT 1
          `,
          [
            answerId,
            attemptId,
            grade.questionId,
          ]
        );

      if (
        verifyResult.rows.length ===
        0
      ) {
        throw new Error(
          `Failed to verify grade for question ${grade.questionId}.`
        );
      }

      savedGrades.push({
        questionId:
          grade.questionId,

        answerId,

        marksAwarded:
          Number(
            verifyResult.rows[0]
              .marks_awarded || 0
          ),

        isCorrect:
          Boolean(
            verifyResult.rows[0]
              .is_correct
          ),
      });
    }

    /* =====================================================
       RECALCULATE SCORE ONCE
    ===================================================== */

    const scoreResult =
      await client.query(
        `
          SELECT
            COALESCE(
              SUM(
                COALESCE(
                  marks_awarded,
                  0
                )
              ),
              0
            ) AS score

          FROM lms_quiz_answers

          WHERE
            attempt_id = $1
        `,
        [attemptId]
      );

    const score =
      Number(
        scoreResult.rows[0]
          ?.score || 0
      );

    /* =====================================================
       TOTAL MARKS / PASSING SCORE
    ===================================================== */

    const totalMarks =
      Number(
        access.total_marks || 0
      );

    const passingScore =
      Number(
        access.passing_score || 0
      );

    /* =====================================================
       PERCENTAGE
    ===================================================== */

    const percentage =
      totalMarks > 0
        ? Number(
            (
              (score /
                totalMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    /* =====================================================
       CHECK WRITTEN QUESTION GRADING STATE
    ===================================================== */

    const gradingStateResult =
      await client.query(
        `
          SELECT
            qq.id AS question_id,
            qq.question_type,

            qa.id AS answer_id,
            qa.is_correct

          FROM lms_quiz_questions qq

          LEFT JOIN LATERAL (
            SELECT
              qa_inner.id,
              qa_inner.is_correct

            FROM lms_quiz_answers qa_inner

            WHERE
              qa_inner.attempt_id = $1
              AND qa_inner.question_id = qq.id

            ORDER BY
              qa_inner.id ASC

            LIMIT 1
          ) qa
            ON true

          WHERE
            qq.quiz_id = $2

          ORDER BY
            qq.question_order ASC,
            qq.id ASC
        `,
        [
          attemptId,
          quizId,
        ]
      );

    let writtenQuestionCount =
      0;

    let gradedWrittenQuestionCount =
      0;

    for (
      const row of
        gradingStateResult.rows
    ) {
      if (
        isWrittenQuestion(
          row.question_type
        )
      ) {
        writtenQuestionCount++;

        const graded =
          row.answer_id !== null &&
          row.is_correct !== null;

        if (graded) {
          gradedWrittenQuestionCount++;
        }
      }
    }

    const allWrittenQuestionsGraded =
      writtenQuestionCount === 0 ||
      gradedWrittenQuestionCount ===
        writtenQuestionCount;

    /* =====================================================
       FINAL ATTEMPT STATUS
    ===================================================== */

    const finalStatus =
      allWrittenQuestionsGraded
        ? 'graded'
        : 'submitted';

    /* =====================================================
       UPDATE ATTEMPT ONCE
    ===================================================== */

    await client.query(
      `
        UPDATE lms_quiz_attempts

        SET
          score =
            $1::numeric,

          total_marks =
            $2::numeric,

          percentage =
            $3::numeric,

          status =
            $4

        WHERE
          id = $5
          AND quiz_id = $6
      `,
      [
        score,
        totalMarks,
        percentage,
        finalStatus,
        attemptId,
        quizId,
      ]
    );

    /* =====================================================
       COMMIT EVERYTHING AT ONCE
    ===================================================== */

    await client.query(
      'COMMIT'
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      message:
        'All marks were saved successfully.',

      attempt: {
        id:
          attemptId,

        score,

        totalMarks,

        percentage,

        passingScore,

        passed:
          finalStatus ===
            'graded' &&
          percentage >=
            passingScore,

        status:
          finalStatus,
      },

      grades:
        savedGrades,
    });
  } catch (error) {
    /* =====================================================
       ROLLBACK EVERYTHING
    ===================================================== */

    try {
      await client.query(
        'ROLLBACK'
      );
    } catch (
      rollbackError
    ) {
      console.error(
        'GRADING ROLLBACK ERROR:',
        rollbackError
      );
    }

    console.error(
      'LECTURER MANUAL GRADING ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save manual grades.',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

