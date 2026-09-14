import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type AnswerInput = {
  questionId?: number | string;
  answerText?: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function isPositiveInteger(value: unknown): boolean {
  const number = Number(value);

  return Number.isInteger(number) && number > 0;
}

/* =========================================================
   GET CURRENT SUBMISSION
========================================================= */

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Student authentication required.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       ASSIGNMENT ID
    ===================================================== */

    const { id } = await context.params;

    const assignmentId = Number(id);

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid assignment ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY ASSIGNMENT + STUDENT ENROLLMENT
    ===================================================== */

    const assignmentResult = await pool.query(
      `
        SELECT
          a.id,
          a.title,
          a.total_marks,
          a.due_date,
          a.status,
          p.id AS program_id,
          p.name AS program_name

        FROM lms_assignments a

        INNER JOIN lms_lessons l
          ON l.id = a.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_programs p
          ON p.id = u.program_id

        INNER JOIN lms_enrollments e
          ON e.program_id = p.id
         AND e.application_id = $2

        WHERE a.id = $1

          AND (
            e.enrollment_status IS NULL
            OR LOWER(
              e.enrollment_status::text
            ) NOT IN (
              'cancelled',
              'dropped'
            )
          )

        ORDER BY e.id DESC

        LIMIT 1
      `,
      [
        assignmentId,
        session.applicationId,
      ]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You are not enrolled in the program for this assignment.',
        },
        { status: 403 }
      );
    }

    const assignment = assignmentResult.rows[0];

    /* =====================================================
       GET CURRENT SUBMISSION
    ===================================================== */

    const submissionResult = await pool.query(
      `
        SELECT
          id,
          assignment_id,
          application_id,
          submission_text,
          file_name,
          file_url,
          file_size,
          mime_type,
          status,
          submitted_at,
          total_marks,
          marks_awarded,
          lecturer_feedback,
          graded_at,
          graded_by

        FROM lms_assignment_submissions

        WHERE assignment_id = $1
          AND application_id = $2

        ORDER BY id DESC

        LIMIT 1
      `,
      [
        assignmentId,
        session.applicationId,
      ]
    );

    const submission = submissionResult.rows[0] || null;

    /* =====================================================
       GET ANSWERS
    ===================================================== */

    let answers: Array<{
      id: number;
      submissionId: number;
      questionId: number;
      answerText: string | null;
      fileName: string | null;
      fileUrl: string | null;
      fileSize: number | null;
      mimeType: string | null;
      marksAwarded: number | null;
      lecturerFeedback: string | null;
      gradedAt: string | null;
    }> = [];

    if (submission) {
      const answersResult = await pool.query(
        `
          SELECT
            id,
            submission_id,
            question_id,
            answer_text,
            file_name,
            file_url,
            file_size,
            mime_type,
            marks_awarded,
            lecturer_feedback,
            graded_at

          FROM lms_assignment_answers

          WHERE submission_id = $1

          ORDER BY question_id ASC, id ASC
        `,
        [submission.id]
      );

      answers = answersResult.rows.map((answer) => ({
        id: Number(answer.id),

        submissionId: Number(
          answer.submission_id
        ),

        questionId: Number(
          answer.question_id
        ),

        answerText:
          answer.answer_text ?? null,

        fileName:
          answer.file_name ?? null,

        fileUrl:
          answer.file_url ?? null,

        fileSize:
          answer.file_size !== null &&
          answer.file_size !== undefined
            ? Number(answer.file_size)
            : null,

        mimeType:
          answer.mime_type ?? null,

        marksAwarded:
          answer.marks_awarded !== null &&
          answer.marks_awarded !== undefined
            ? Number(answer.marks_awarded)
            : null,

        lecturerFeedback:
          answer.lecturer_feedback ?? null,

        gradedAt:
          answer.graded_at ?? null,
      }));
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      assignment: {
        id: Number(assignment.id),

        title: String(
          assignment.title ?? ''
        ),

        totalMarks: Number(
          assignment.total_marks ?? 0
        ),

        dueDate:
          assignment.due_date ?? null,

        status: String(
          assignment.status ?? 'active'
        ),

        programId: Number(
          assignment.program_id
        ),

        programName: String(
          assignment.program_name ?? ''
        ),
      },

      submission: submission
        ? {
            id: Number(submission.id),

            assignmentId: Number(
              submission.assignment_id
            ),

            applicationId: Number(
              submission.application_id
            ),

            submissionText:
              submission.submission_text ??
              null,

            fileName:
              submission.file_name ??
              null,

            fileUrl:
              submission.file_url ??
              null,

            fileSize:
              submission.file_size !== null &&
              submission.file_size !== undefined
                ? Number(
                    submission.file_size
                  )
                : null,

            mimeType:
              submission.mime_type ??
              null,

            status: String(
              submission.status ?? 'draft'
            ),

            submittedAt:
              submission.submitted_at ??
              null,

            totalMarks:
              submission.total_marks !== null &&
              submission.total_marks !== undefined
                ? Number(
                    submission.total_marks
                  )
                : null,

            marksAwarded:
              submission.marks_awarded !== null &&
              submission.marks_awarded !== undefined
                ? Number(
                    submission.marks_awarded
                  )
                : null,

            lecturerFeedback:
              submission.lecturer_feedback ??
              null,

            gradedAt:
              submission.graded_at ?? null,

            gradedBy:
              submission.graded_by !== null &&
              submission.graded_by !== undefined
                ? Number(
                    submission.graded_by
                  )
                : null,
          }
        : null,

      answers,
    });
  } catch (error) {
    console.error(
      'STUDENT ASSIGNMENT SUBMISSION GET ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load your submission.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST SAVE / SUBMIT
========================================================= */

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Student authentication required.',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       ASSIGNMENT ID
    ===================================================== */

    const { id } = await context.params;

    const assignmentId = Number(id);

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid assignment ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    const body = (await request.json()) as {
      action?: 'draft' | 'submit';
      answers?: AnswerInput[];
    };

    const action =
      body.action === 'submit'
        ? 'submit'
        : 'draft';

    const incomingAnswers =
      Array.isArray(body.answers)
        ? body.answers
        : [];

    /* =====================================================
       VERIFY ASSIGNMENT + ENROLLMENT
    ===================================================== */

    const assignmentResult = await client.query(
      `
        SELECT
          a.id,
          a.title,
          a.total_marks,
          a.due_date,
          a.status,
          p.id AS program_id

        FROM lms_assignments a

        INNER JOIN lms_lessons l
          ON l.id = a.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        INNER JOIN lms_programs p
          ON p.id = u.program_id

        INNER JOIN lms_enrollments e
          ON e.program_id = p.id
         AND e.application_id = $2

        WHERE a.id = $1

          AND (
            e.enrollment_status IS NULL
            OR LOWER(
              e.enrollment_status::text
            ) NOT IN (
              'cancelled',
              'dropped'
            )
          )

        ORDER BY e.id DESC

        LIMIT 1
      `,
      [
        assignmentId,
        session.applicationId,
      ]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'You are not enrolled in the program for this assignment.',
        },
        { status: 403 }
      );
    }

    const assignment = assignmentResult.rows[0];

    /* =====================================================
       VERIFY ASSIGNMENT STATUS
    ===================================================== */

    const assignmentStatus = String(
      assignment.status ?? 'active'
    )
      .trim()
      .toLowerCase();

    if (
      !['active', 'published'].includes(
        assignmentStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This assignment is not currently available for submission.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       EXISTING SUBMISSION
    ===================================================== */

    const existingSubmissionResult =
      await client.query(
        `
          SELECT
            id,
            status,
            submitted_at,
            marks_awarded

          FROM lms_assignment_submissions

          WHERE assignment_id = $1
            AND application_id = $2

          ORDER BY id DESC

          LIMIT 1
        `,
        [
          assignmentId,
          session.applicationId,
        ]
      );

    const existingSubmission =
      existingSubmissionResult.rows[0] ||
      null;

    /* =====================================================
       PREVENT EDITING AFTER SUBMISSION
    ===================================================== */

    if (existingSubmission) {
      const existingStatus = String(
        existingSubmission.status ?? ''
      )
        .trim()
        .toLowerCase();

      if (
        ['submitted', 'graded'].includes(
          existingStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'This assignment has already been submitted and can no longer be edited.',
          },
          { status: 409 }
        );
      }
    }

    /* =====================================================
       GET ASSIGNMENT QUESTIONS
    ===================================================== */

    const questionsResult =
      await client.query(
        `
          SELECT
            id,
            question_number,
            marks

          FROM lms_assignment_questions

          WHERE assignment_id = $1

          ORDER BY question_number ASC, id ASC
        `,
        [assignmentId]
      );

    const validQuestionIds =
      new Set<number>();

    for (
      const question of
        questionsResult.rows
    ) {
      validQuestionIds.add(
        Number(question.id)
      );
    }

    /* =====================================================
       CLEAN ANSWERS
    ===================================================== */

    const cleanedAnswers =
      incomingAnswers
        .map((answer) => {
          const questionId =
            Number(answer.questionId);

          if (
            !isPositiveInteger(questionId)
          ) {
            return null;
          }

          if (
            !validQuestionIds.has(
              questionId
            )
          ) {
            return null;
          }

          const answerText =
            answer.answerText === null ||
            answer.answerText === undefined
              ? ''
              : String(
                  answer.answerText
                );

          return {
            questionId,
            answerText,
          };
        })
        .filter(
          (
            answer
          ): answer is {
            questionId: number;
            answerText: string;
          } => answer !== null
        );

    /* =====================================================
       SUBMISSION VALIDATION
    ===================================================== */

    if (action === 'submit') {
      /* ---------------------------------------------------
         QUESTIONS EXIST
      --------------------------------------------------- */

      if (questionsResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'This assignment does not contain any questions.',
          },
          { status: 400 }
        );
      }

      /* ---------------------------------------------------
         ALL QUESTIONS ANSWERED
      --------------------------------------------------- */

      const unanswered =
        questionsResult.rows.filter(
          (question) => {
            const answer =
              cleanedAnswers.find(
                (item) =>
                  item.questionId ===
                  Number(question.id)
              );

            return (
              !answer ||
              !answer.answerText.trim()
            );
          }
        );

      if (unanswered.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Please answer all assignment questions before submitting.',
            unansweredQuestionNumbers:
              unanswered.map(
                (question) =>
                  Number(
                    question.question_number
                  )
              ),
          },
          { status: 400 }
        );
      }

      /* ---------------------------------------------------
         DEADLINE
      --------------------------------------------------- */

      if (assignment.due_date) {
        const deadline =
          new Date(
            assignment.due_date
          );

        if (
          !Number.isNaN(
            deadline.getTime()
          ) &&
          new Date() > deadline
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                'The deadline for this assignment has passed.',
            },
            { status: 400 }
          );
        }
      }
    }

    /* =====================================================
       START TRANSACTION
    ===================================================== */

    await client.query('BEGIN');

    transactionStarted = true;

    /* =====================================================
       SUBMISSION STATUS
    ===================================================== */

    const submissionStatus =
      action === 'submit'
        ? 'submitted'
        : 'draft';

    const totalMarks = Number(
      assignment.total_marks ?? 0
    );

    /* =====================================================
       CREATE / UPDATE SUBMISSION
    ===================================================== */

    let submissionId: number;

    if (existingSubmission) {
      submissionId = Number(
        existingSubmission.id
      );

      /*
       * IMPORTANT:
       * Explicitly cast status to VARCHAR.
       *
       * This prevents PostgreSQL 42P08:
       * text versus character varying.
       */

      await client.query(
        `
          UPDATE lms_assignment_submissions

          SET
            status = $1::varchar,
            total_marks = $2,
            updated_at = CURRENT_TIMESTAMP,

            submitted_at =
              CASE
                WHEN $1::varchar = 'submitted'::varchar
                  THEN CURRENT_TIMESTAMP

                ELSE submitted_at
              END

          WHERE id = $3
        `,
        [
          submissionStatus,
          totalMarks,
          submissionId,
        ]
      );
    } else {
      /*
       * IMPORTANT:
       * Explicitly cast $3 to VARCHAR.
       *
       * This removes PostgreSQL's ambiguity between
       * text and character varying.
       */

      const submissionInsert =
        await client.query(
          `
            INSERT INTO lms_assignment_submissions (
              assignment_id,
              application_id,
              status,
              total_marks,
              created_at,
              updated_at,
              submitted_at
            )

            VALUES (
              $1,
              $2,
              $3::varchar,
              $4,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP,

              CASE
                WHEN $3::varchar = 'submitted'::varchar
                  THEN CURRENT_TIMESTAMP

                ELSE NULL
              END
            )

            RETURNING id
          `,
          [
            assignmentId,
            session.applicationId,
            submissionStatus,
            totalMarks,
          ]
        );

      submissionId = Number(
        submissionInsert.rows[0].id
      );
    }

    /* =====================================================
       SAVE ANSWERS
    ===================================================== */

    for (
      const answer of cleanedAnswers
    ) {
      /* ---------------------------------------------------
         CHECK WHETHER ANSWER ALREADY EXISTS
      --------------------------------------------------- */

      const existingAnswer =
        await client.query(
          `
            SELECT
              id

            FROM lms_assignment_answers

            WHERE submission_id = $1
              AND question_id = $2

            ORDER BY id ASC

            LIMIT 1
          `,
          [
            submissionId,
            answer.questionId,
          ]
        );

      /* ---------------------------------------------------
         UPDATE EXISTING ANSWER
      --------------------------------------------------- */

      if (
        existingAnswer.rows.length > 0
      ) {
        await client.query(
          `
            UPDATE lms_assignment_answers

            SET
              answer_text = $1::text,
              updated_at = CURRENT_TIMESTAMP

            WHERE id = $2
          `,
          [
            answer.answerText,
            Number(
              existingAnswer
                .rows[0].id
            ),
          ]
        );
      }

      /* ---------------------------------------------------
         INSERT NEW ANSWER
      --------------------------------------------------- */

      else {
        await client.query(
          `
            INSERT INTO lms_assignment_answers (
              submission_id,
              question_id,
              answer_text,
              created_at,
              updated_at
            )

            VALUES (
              $1,
              $2,
              $3::text,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
          `,
          [
            submissionId,
            answer.questionId,
            answer.answerText,
          ]
        );
      }
    }

    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query('COMMIT');

    transactionStarted = false;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      message:
        action === 'submit'
          ? 'Assignment submitted successfully.'
          : 'Assignment draft saved successfully.',

      submission: {
        id: submissionId,

        status: submissionStatus,

        submittedAt:
          action === 'submit'
            ? new Date().toISOString()
            : null,

        totalMarks,
      },
    });
  } catch (error) {
    /* =====================================================
       ROLLBACK ONLY IF TRANSACTION STARTED
    ===================================================== */

    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'STUDENT ASSIGNMENT ROLLBACK ERROR:',
          rollbackError
        );
      }
    }

    console.error(
      'STUDENT ASSIGNMENT SUBMISSION POST ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to save your assignment.',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}